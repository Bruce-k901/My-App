'use client';

import { useState, useCallback } from 'react';
import { Upload, AlertCircle, Trash2 } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { parseTrailCSV, type TrailParseResult } from '@/lib/trail-import';

interface UploadStepProps {
  onParsed: (result: TrailParseResult, file: File) => void;
  companyId: string | null;
}

export function UploadStep({ onParsed, companyId }: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setDeleteResult(null);

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file exported from Trail.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('File too large. Maximum size is 20MB.');
      return;
    }

    setIsParsing(true);
    try {
      const text = await file.text();
      const result = parseTrailCSV(text);

      if (result.templates.length === 0) {
        setError('No tasks found in this CSV. Make sure the file contains a "task_description" column.');
        setIsParsing(false);
        return;
      }

      onParsed(result, file);
    } catch (err: any) {
      setError(err?.message || 'Failed to parse CSV file.');
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

  const handleDeletePrevious = useCallback(async () => {
    if (!companyId || isDeleting) return;
    if (!confirm('This will delete ALL previously imported Trail tasks. Are you sure?')) return;

    setIsDeleting(true);
    setDeleteResult(null);
    try {
      const res = await fetch('/api/tasks/import/trail', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      });
      const data = await res.json();
      if (data.success) {
        setDeleteResult(`Deleted ${data.deleted} imported template(s) and their site assignments.`);
      } else {
        setError(data.error || 'Failed to delete.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete.');
    } finally {
      setIsDeleting(false);
    }
  }, [companyId, isDeleting]);

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="rounded-lg border border-checkly-dark/20 dark:border-checkly/20 bg-checkly-dark/5 dark:bg-checkly/5 p-4">
        <h3 className="text-sm font-medium text-checkly-dark dark:text-checkly mb-2">How to export from Trail</h3>
        <ol className="text-sm text-theme-secondary space-y-1 list-decimal list-inside">
          <li>Log into your Trail admin account</li>
          <li>Go to <strong>Task Reports</strong></li>
          <li>Set the date filter to at least the <strong>last 30 days</strong></li>
          <li>Click <strong>Show All Content</strong> to include checklist items</li>
          <li>Click <strong>Share &gt; Download CSV</strong></li>
          <li>Upload the downloaded file here</li>
        </ol>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-checkly-dark dark:border-checkly bg-checkly-dark/10 dark:bg-checkly/10'
            : 'border-theme hover:border-checkly-dark/50 dark:hover:border-checkly/50',
          isParsing && 'pointer-events-none opacity-60'
        )}
        onClick={() => document.getElementById('trail-csv-upload')?.click()}
      >
        <input
          type="file"
          id="trail-csv-upload"
          accept=".csv"
          className="hidden"
          onChange={handleFileInput}
          disabled={isParsing}
        />

        {isParsing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-checkly-dark dark:border-checkly border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-theme-secondary">Parsing CSV...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-checkly-dark/10 dark:bg-checkly/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-checkly-dark dark:text-checkly" />
            </div>
            <div>
              <p className="text-sm font-medium text-theme-primary">
                Drop your Trail CSV file here, or click to browse
              </p>
              <p className="text-xs text-theme-tertiary mt-1">
                Supports task_report_export CSV files from Trail
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delete previous import */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-theme bg-theme-surface">
        <div>
          <p className="text-xs text-theme-secondary">Previously imported Trail tasks?</p>
          <p className="text-xs text-theme-tertiary">Remove all templates tagged with trail_import</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeletePrevious}
          disabled={isDeleting || !companyId}
          className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
        >
          {isDeleting ? (
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin" />
              Deleting...
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" />
              Delete Previous Import
            </span>
          )}
        </Button>
      </div>

      {/* Success message */}
      {deleteResult && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-sm text-emerald-500">{deleteResult}</p>
        </div>
      )}

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
