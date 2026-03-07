'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { applyMapping } from '@/lib/bulk-import/parser';
import { ASSETLY_IMPORT_FIELDS } from '@/lib/bulk-import/assetly-config';
import type { ColumnMapping, ParsedRow, BulkImportResult } from '@/lib/bulk-import/types';

import { AssetUploadStep } from './steps/AssetUploadStep';
import { AssetColumnMappingStep } from './steps/AssetColumnMappingStep';
import { AssetValidationStep } from './steps/AssetValidationStep';
import { AssetImportStep } from './steps/AssetImportStep';

type WizardStep = 'upload' | 'mapping' | 'validation' | 'importing';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'upload', label: 'Upload File' },
  { key: 'mapping', label: 'Map Columns' },
  { key: 'validation', label: 'Review Data' },
  { key: 'importing', label: 'Import' },
];

const SESSION_KEY = 'assetly-bulk-upload';

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

interface AssetBulkUploadWizardProps {
  onComplete?: () => void;
}

export function AssetBulkUploadWizard({ onComplete }: AssetBulkUploadWizardProps) {
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

  // Load sites for validation
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data: sitesData } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active');
      if (sitesData) setSites(sitesData);
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
    const mapped = applyMapping(rawRows, columnMappings, ASSETLY_IMPORT_FIELDS);
    setParsedRows(mapped);
    setStep('validation');
  }, [rawRows, columnMappings]);

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

      const res = await fetch('/api/assets/bulk-upload', {
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
        toast.success(`${data.created} asset${data.created !== 1 ? 's' : ''} imported successfully`);
        onComplete?.();
      }
    } catch (err: any) {
      setImportError(err?.message || 'Network error. Please try again.');
    } finally {
      setIsImporting(false);
    }
  }, [companyId, profile?.id, parsedRows, fileName, fileSize, columnMappings, onComplete]);

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
                    ? 'bg-assetly-dark dark:bg-assetly text-white dark:text-[#1C1916]'
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
                  i < currentStepIdx ? 'bg-assetly-dark dark:bg-assetly' : 'bg-theme-muted'
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
            <h2 className="text-lg font-semibold text-theme-primary mb-1">Upload Assets</h2>
            <p className="text-sm text-theme-secondary mb-6">
              Upload a CSV or Excel file with your asset data.
            </p>
            <AssetUploadStep onParsed={handleParsed} />
          </>
        )}

        {step === 'mapping' && (
          <>
            <h2 className="text-lg font-semibold text-theme-primary mb-1">Map Columns</h2>
            <p className="text-sm text-theme-secondary mb-4">
              Match your spreadsheet columns to Opsly fields. We&apos;ve auto-detected what we can.
            </p>
            <AssetColumnMappingStep
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
              Check the data below. Click any asset name to edit. Error rows are excluded automatically.
              {fileName && (
                <span className="ml-2 text-theme-tertiary">({fileName})</span>
              )}
            </p>
            <AssetValidationStep
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
          <AssetImportStep
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
