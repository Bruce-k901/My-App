'use client';

import { CheckCircle, XCircle } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import type { BulkImportResult } from '@/lib/bulk-import/types';

interface ImportStepProps {
  isImporting: boolean;
  progress: { current: number; total: number };
  result: BulkImportResult | null;
  error: string | null;
  onBack: () => void;
}

export function ImportStep({
  isImporting,
  progress,
  result,
  error,
  onBack,
}: ImportStepProps) {
  const router = useRouter();

  // Importing state
  if (isImporting) {
    const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-10 h-10 border-2 border-teamly-dark dark:border-teamly border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-theme-primary font-medium">Importing team members...</p>
        <div className="w-64 h-2 bg-theme-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-teamly-dark dark:bg-teamly rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-theme-tertiary">
          {progress.current} of {progress.total} rows processed
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <XCircle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-sm font-medium text-red-500">Import failed</p>
        <p className="text-xs text-theme-secondary text-center max-w-md">{error}</p>
        <Button variant="ghost" onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  // Result state
  if (!result) return null;

  const failedErrors = result.errors.filter(e => e.message !== 'Email already exists');

  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="flex flex-col items-center py-6 space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-emerald-500" />
        </div>
        <p className="text-lg font-semibold text-theme-primary">Import Complete</p>
        <p className="text-sm text-theme-secondary text-center max-w-md">
          {result.created > 0
            ? `${result.created} team member${result.created !== 1 ? 's have' : ' has'} been added to your team.`
            : 'No new team members were imported.'}
          {result.skipped > 0 && ` ${result.skipped} skipped (already exist).`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
          <p className="text-2xl font-bold text-emerald-500">{result.created}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Created</p>
        </div>
        {result.skipped > 0 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-2xl font-bold text-amber-500">{result.skipped}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Skipped</p>
          </div>
        )}
        {result.failed > 0 && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
            <p className="text-2xl font-bold text-red-500">{result.failed}</p>
            <p className="text-xs text-red-600 dark:text-red-400">Failed</p>
          </div>
        )}
      </div>

      {/* Failed row details */}
      {failedErrors.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-red-400 uppercase tracking-wider">Failed Rows</p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {failedErrors.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-red-400 px-2 py-1">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Row {e.rowIndex}: {e.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <Button variant="ghost" onClick={onBack}>
          Upload Another File
        </Button>
        <Button
          onClick={() => router.push('/dashboard/people/employees')}
          className="bg-teamly-dark dark:bg-teamly text-white dark:text-[#1C1916] hover:opacity-90"
        >
          View Team Members
        </Button>
      </div>
    </div>
  );
}
