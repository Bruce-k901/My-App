'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { applyMapping, markDuplicates } from '@/lib/bulk-import/parser';
import { TEAMLY_IMPORT_FIELDS } from '@/lib/bulk-import/teamly-config';
import type { ColumnMapping, ParsedRow, BulkImportResult } from '@/lib/bulk-import/types';

import { UploadStep } from './steps/UploadStep';
import { ColumnMappingStep } from './steps/ColumnMappingStep';
import { ValidationStep } from './steps/ValidationStep';
import { ImportStep } from './steps/ImportStep';

type WizardStep = 'upload' | 'mapping' | 'validation' | 'importing';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'upload', label: 'Upload File' },
  { key: 'mapping', label: 'Map Columns' },
  { key: 'validation', label: 'Review Data' },
  { key: 'importing', label: 'Import' },
];

const SESSION_KEY = 'teamly-bulk-upload';

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveSession(data: Record<string, any>) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {}
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function BulkUploadWizard() {
  const { companyId, profile } = useAppContext();
  const saved = typeof window !== 'undefined' ? loadSession() : null;

  const [step, setStep] = useState<WizardStep>(saved?.step || 'upload');
  const [rawHeaders, setRawHeaders] = useState<string[]>(saved?.rawHeaders || []);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>(saved?.rawRows || []);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>(saved?.columnMappings || []);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>(saved?.parsedRows || []);
  const [fileName, setFileName] = useState(saved?.fileName || '');
  const [fileSize, setFileSize] = useState(saved?.fileSize || 0);

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set());

  const currentStepIdx = STEPS.findIndex((s) => s.key === step);

  // Persist wizard state to sessionStorage
  useEffect(() => {
    if (step === 'importing') return;
    if (step === 'upload' && rawHeaders.length === 0) {
      clearSession();
      return;
    }
    saveSession({ step, rawHeaders, rawRows, columnMappings, parsedRows, fileName, fileSize });
  }, [step, rawHeaders, rawRows, columnMappings, parsedRows, fileName, fileSize]);

  // Load sites and existing emails for validation
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data: sitesData } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active');
      if (sitesData) setSites(sitesData);

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('email')
        .eq('company_id', companyId)
        .not('email', 'is', null);
      if (profilesData) {
        setExistingEmails(
          new Set(profilesData.map((p: any) => (p.email || '').toLowerCase().trim()).filter(Boolean))
        );
      }
    })();
  }, [companyId]);

  // Handle file parsed from UploadStep
  const handleParsed = useCallback(
    (data: {
      headers: string[];
      rows: Record<string, string>[];
      mappings: ColumnMapping[];
      fileName: string;
      fileSize: number;
    }) => {
      setRawHeaders(data.headers);
      setRawRows(data.rows);
      setColumnMappings(data.mappings);
      setFileName(data.fileName);
      setFileSize(data.fileSize);
      setStep('mapping');
      toast.success(`File parsed: ${data.rows.length} rows, ${data.headers.length} columns`);
    },
    []
  );

  // Handle mapping complete → apply + validate → move to validation step
  const handleMappingNext = useCallback(() => {
    const mapped = applyMapping(rawRows, columnMappings, TEAMLY_IMPORT_FIELDS);
    const withDuplicates = markDuplicates(mapped, existingEmails);
    setParsedRows(withDuplicates);
    setStep('validation');
  }, [rawRows, columnMappings, existingEmails]);

  // Handle import
  const handleImport = useCallback(async () => {
    if (!companyId || !profile?.id) return;

    const rowsToImport = parsedRows.filter((r) => r._included);
    if (rowsToImport.length === 0) {
      toast.error('No rows selected for import');
      return;
    }

    setStep('importing');
    setIsImporting(true);
    setImportError(null);
    setImportResult(null);
    setImportProgress({ current: 0, total: rowsToImport.length });

    try {
      // Dynamically extract all non-metadata fields from ParsedRow
      // (metadata fields start with '_') so every mapped column is sent
      const payload = {
        company_id: companyId,
        file_name: fileName,
        file_size_bytes: fileSize,
        column_mapping: columnMappings,
        rows: rowsToImport.map((r) => {
          const row: Record<string, any> = {};
          for (const [key, value] of Object.entries(r)) {
            if (!key.startsWith('_')) {
              row[key] = value ?? null;
            }
          }
          return row;
        }),
      };

      const res = await fetch('/api/people/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setImportError(data.error || 'Import failed. Please try again.');
      } else {
        setImportResult(data);
        setImportProgress({ current: data.created + data.skipped + data.failed, total: rowsToImport.length });
        clearSession();
        toast.success(`${data.created} team member${data.created !== 1 ? 's' : ''} imported successfully`);
      }
    } catch (err: any) {
      setImportError(err?.message || 'Network error. Please try again.');
    } finally {
      setIsImporting(false);
    }
  }, [companyId, profile?.id, parsedRows, fileName, fileSize, columnMappings]);

  // Reset wizard to start
  const handleReset = useCallback(() => {
    setStep('upload');
    setRawHeaders([]);
    setRawRows([]);
    setColumnMappings([]);
    setParsedRows([]);
    setFileName('');
    setFileSize(0);
    setImportResult(null);
    setImportError(null);
    clearSession();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  i <= currentStepIdx
                    ? 'bg-teamly-dark dark:bg-teamly text-white dark:text-[#1C1916]'
                    : 'bg-theme-muted text-theme-tertiary'
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-xs hidden sm:inline ${
                  i === currentStepIdx ? 'text-theme-primary font-medium' : 'text-theme-tertiary'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-px mx-2 ${
                  i < currentStepIdx ? 'bg-teamly-dark dark:bg-teamly' : 'bg-theme-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-theme-surface-elevated border border-theme rounded-xl p-6">
        {step === 'upload' && (
          <>
            <h2 className="text-lg font-semibold text-theme-primary mb-1">Upload Team Members</h2>
            <p className="text-sm text-theme-secondary mb-6">
              Upload a CSV or Excel file with your team member data.
            </p>
            <UploadStep onParsed={handleParsed} />
          </>
        )}

        {step === 'mapping' && (
          <>
            <h2 className="text-lg font-semibold text-theme-primary mb-1">Map Columns</h2>
            <p className="text-sm text-theme-secondary mb-4">
              Match your spreadsheet columns to Opsly fields. We&apos;ve auto-detected what we can.
            </p>
            <ColumnMappingStep
              mappings={columnMappings}
              onMappingsChange={setColumnMappings}
              onNext={handleMappingNext}
              onBack={() => setStep('upload')}
              totalRows={rawRows.length}
            />
          </>
        )}

        {step === 'validation' && (
          <>
            <h2 className="text-lg font-semibold text-theme-primary mb-1">Review Data</h2>
            <p className="text-sm text-theme-secondary mb-4">
              Check the data below. Click any cell to edit. Error rows are excluded automatically.
              {fileName && (
                <span className="ml-2 text-theme-tertiary">({fileName})</span>
              )}
            </p>
            <ValidationStep
              rows={parsedRows}
              onRowsChange={setParsedRows}
              onNext={handleImport}
              onBack={() => setStep('mapping')}
              sites={sites}
              columnMappings={columnMappings}
            />
          </>
        )}

        {step === 'importing' && (
          <ImportStep
            isImporting={isImporting}
            progress={importProgress}
            result={importResult}
            error={importError}
            onBack={handleReset}
          />
        )}
      </div>
    </div>
  );
}
