'use client';

import { useState, useCallback } from 'react';
import { Upload, AlertCircle, Download } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { parseFile, autoMapColumns, generateTemplate } from '@/lib/bulk-import';
import { TEAMLY_IMPORT_FIELDS } from '@/lib/bulk-import/teamly-config';
import type { ColumnMapping } from '@/lib/bulk-import/types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

interface UploadStepProps {
  onParsed: (data: {
    headers: string[];
    rows: Record<string, string>[];
    mappings: ColumnMapping[];
    fileName: string;
    fileSize: number;
  }) => void;
}

export function UploadStep({ onParsed }: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError('Please upload a .csv, .xlsx, or .xls file.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    setIsParsing(true);
    try {
      const { headers, rows } = await parseFile(file);

      if (rows.length === 0) {
        setError('No data rows found in the file. Check that it has a header row and at least one data row.');
        setIsParsing(false);
        return;
      }

      if (rows.length > 500) {
        setError(`Too many rows (${rows.length}). Maximum is 500 rows per upload.`);
        setIsParsing(false);
        return;
      }

      const mappings = autoMapColumns(headers, TEAMLY_IMPORT_FIELDS, rows);
      onParsed({ headers, rows, mappings, fileName: file.name, fileSize: file.size });
    } catch (err: any) {
      setError(err?.message || 'Failed to parse file.');
    } finally {
      setIsParsing(false);
    }
  }, [onParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDownloadTemplate = useCallback(() => {
    const csv = generateTemplate(TEAMLY_IMPORT_FIELDS);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'opsly-team-members-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="rounded-lg border border-teamly-dark/20 dark:border-teamly/20 bg-teamly-dark/5 dark:bg-teamly/5 p-4">
        <h3 className="text-sm font-medium text-teamly-dark dark:text-teamly mb-2">Preparing your file</h3>
        <ul className="text-sm text-theme-secondary space-y-1 list-disc list-inside">
          <li>Export your team members from Deputy, Planday, Trail, or any HR system as CSV or Excel</li>
          <li>Ensure there is a header row with column names</li>
          <li>Required columns: <strong>Full Name</strong> (or First + Last) and <strong>Email</strong></li>
          <li>Other fields (phone, role, site, etc.) are optional and will be auto-detected</li>
          <li>Maximum 500 rows per upload</li>
        </ul>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-teamly-dark dark:border-teamly bg-teamly-dark/10 dark:bg-teamly/10'
            : 'border-theme hover:border-teamly-dark/50 dark:hover:border-teamly/50',
          isParsing && 'pointer-events-none opacity-60'
        )}
        onClick={() => document.getElementById('bulk-upload-file')?.click()}
      >
        <input
          type="file"
          id="bulk-upload-file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileInput}
          disabled={isParsing}
        />

        {isParsing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-teamly-dark dark:border-teamly border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-theme-secondary">Parsing file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-teamly-dark/10 dark:bg-teamly/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-teamly-dark dark:text-teamly" />
            </div>
            <div>
              <p className="text-sm font-medium text-theme-primary">
                Drop your spreadsheet here, or click to browse
              </p>
              <p className="text-xs text-theme-tertiary mt-1">
                Supports .csv, .xlsx, and .xls files up to 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Download template */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-theme bg-theme-surface">
        <div>
          <p className="text-xs text-theme-secondary">Need a template?</p>
          <p className="text-xs text-theme-tertiary">Download a CSV with all supported columns and example data</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownloadTemplate}
          className="text-xs text-teamly-dark dark:text-teamly hover:bg-teamly-dark/10 dark:hover:bg-teamly/10"
        >
          <span className="flex items-center gap-1">
            <Download className="w-3.5 h-3.5" />
            Download Template
          </span>
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
}
