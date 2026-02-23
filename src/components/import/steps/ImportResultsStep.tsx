'use client';

import { CheckCircle, AlertTriangle, XCircle, Link2 } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import type { TrailImportResult } from '@/lib/trail-import';

interface ImportResultsStepProps {
  isImporting: boolean;
  progress: { current: number; total: number };
  result: TrailImportResult | null;
  error: string | null;
  onBack: () => void;
}

export function ImportResultsStep({
  isImporting,
  progress,
  result,
  error,
  onBack,
}: ImportResultsStepProps) {
  const router = useRouter();

  // Importing state
  if (isImporting) {
    const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-10 h-10 border-2 border-checkly-dark dark:border-checkly border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-theme-primary font-medium">Importing templates...</p>
        <div className="w-64 h-2 bg-theme-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-checkly-dark dark:bg-checkly rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-theme-tertiary">
          {progress.current} of {progress.total} templates
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

  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="flex flex-col items-center py-6 space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-emerald-500" />
        </div>
        <p className="text-lg font-semibold text-theme-primary">Templates Imported</p>
        <p className="text-sm text-theme-secondary text-center max-w-md">
          Open each template to review settings and activate scheduling.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
          <p className="text-2xl font-bold text-emerald-500">{result.imported}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Templates Created</p>
        </div>
        {(result.linked ?? 0) > 0 && (
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
            <p className="text-2xl font-bold text-blue-500">{result.linked}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Linked</p>
          </div>
        )}
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

      {/* Details */}
      {result.details.imported.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-theme-tertiary uppercase tracking-wider">Created Templates</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {result.details.imported.map(t => (
              <div key={t.id} className="flex items-center gap-2 text-sm text-theme-secondary px-2 py-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.details.linked?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-theme-tertiary uppercase tracking-wider">Linked to Compliance Templates</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {result.details.linked.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-theme-secondary px-2 py-1">
                <Link2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span>{t.name}</span>
                <span className="text-xs text-theme-tertiary">&rarr; {t.templateName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.details.failed.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-red-400 uppercase tracking-wider">Failed</p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {result.details.failed.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-red-400 px-2 py-1">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{t.name}: {t.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center pt-2">
        <Button
          onClick={() => router.push('/dashboard/my_templates')}
          className="bg-checkly-dark dark:bg-checkly text-white dark:text-[#1C1916] hover:opacity-90"
        >
          Review &amp; Schedule Templates
        </Button>
      </div>
    </div>
  );
}
