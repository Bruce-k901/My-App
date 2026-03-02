'use client';

import { useMemo } from 'react';
import { Check, Minus, ChevronDown } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { ASSETLY_IMPORT_FIELDS } from '@/lib/bulk-import/assetly-config';
import type { ColumnMapping } from '@/lib/bulk-import/types';

interface AssetColumnMappingStepProps {
  mappings: ColumnMapping[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onNext: () => void;
  onBack: () => void;
  totalRows: number;
}

export function AssetColumnMappingStep({
  mappings,
  onMappingsChange,
  onNext,
  onBack,
  totalRows,
}: AssetColumnMappingStepProps) {
  const mappedCount = mappings.filter((m) => m.targetField !== null).length;
  const totalColumns = mappings.length;

  const usedTargets = useMemo(() => {
    const set = new Set<string>();
    for (const m of mappings) {
      if (m.targetField) set.add(m.targetField);
    }
    return set;
  }, [mappings]);

  const canProceed = usedTargets.has('name');

  const handleMappingChange = (index: number, targetField: string | null) => {
    const updated = mappings.map((m, i) => {
      if (i !== index) return m;
      return {
        ...m,
        targetField,
        confidence: targetField ? ('manual' as const) : ('unmapped' as const),
      };
    });
    onMappingsChange(updated);
  };

  const handleAutoDetect = () => {
    import('@/lib/bulk-import/parser').then(({ autoMapColumns }) => {
      const headers = mappings.map((m) => m.sourceColumn);
      const combinedSamples: Record<string, string>[] = [];
      for (let r = 0; r < 3; r++) {
        const row: Record<string, string> = {};
        for (const m of mappings) {
          row[m.sourceColumn] = m.sampleValues[r] || '';
        }
        combinedSamples.push(row);
      }
      const newMappings = autoMapColumns(headers, ASSETLY_IMPORT_FIELDS, combinedSamples);
      const withSamples = newMappings.map((nm, i) => ({
        ...nm,
        sampleValues: mappings[i]?.sampleValues || [],
      }));
      onMappingsChange(withSamples);
    });
  };

  const handleUnmapAll = () => {
    onMappingsChange(
      mappings.map((m) => ({ ...m, targetField: null, confidence: 'unmapped' as const }))
    );
  };

  const getConfidenceBadge = (confidence: ColumnMapping['confidence']) => {
    switch (confidence) {
      case 'exact':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Check className="w-2.5 h-2.5" /> Exact
          </span>
        );
      case 'alias':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Check className="w-2.5 h-2.5" /> Auto
          </span>
        );
      case 'manual':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
            Manual
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-theme-muted text-theme-tertiary">
            <Minus className="w-2.5 h-2.5" /> Skipped
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-theme-secondary">
            <span className="font-medium text-theme-primary">{mappedCount}</span> of{' '}
            {totalColumns} columns mapped
          </p>
          <span className="text-xs text-theme-tertiary">|</span>
          <p className="text-xs text-theme-tertiary">{totalRows} data rows detected</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoDetect}
            className="text-xs text-assetly-dark dark:text-assetly hover:underline"
          >
            Auto-detect
          </button>
          <button
            type="button"
            onClick={handleUnmapAll}
            className="text-xs text-theme-tertiary hover:text-theme-secondary"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Missing required fields warning */}
      {!canProceed && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Required column not yet mapped: <strong>Asset Name</strong>
          </p>
        </div>
      )}

      {/* Column mapping list */}
      <div className="max-h-[50vh] overflow-y-auto space-y-2">
        {mappings.map((mapping, index) => (
          <div
            key={mapping.sourceColumn}
            className="flex items-start gap-4 p-3 rounded-lg border border-theme bg-theme-surface hover:bg-theme-hover/50 transition-colors"
          >
            {/* Source column */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-theme-primary truncate">
                  {mapping.sourceColumn}
                </p>
                {getConfidenceBadge(mapping.confidence)}
              </div>
              {mapping.sampleValues.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {mapping.sampleValues.filter(Boolean).slice(0, 3).map((val, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-theme-muted text-theme-tertiary truncate max-w-[150px]"
                    >
                      {val}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Arrow */}
            <div className="pt-1.5 text-theme-tertiary">&rarr;</div>

            {/* Target field dropdown */}
            <div className="w-52 flex-shrink-0">
              <div className="relative">
                <select
                  value={mapping.targetField || ''}
                  onChange={(e) =>
                    handleMappingChange(index, e.target.value || null)
                  }
                  className="w-full appearance-none text-sm px-3 py-1.5 pr-8 rounded-lg border border-theme bg-theme-surface text-theme-primary focus:outline-none focus:ring-2 focus:ring-assetly-dark/50 dark:focus:ring-assetly/50"
                >
                  <option value="">Skip this column</option>
                  {ASSETLY_IMPORT_FIELDS.map((field) => (
                    <option
                      key={field.key}
                      value={field.key}
                      disabled={
                        usedTargets.has(field.key) &&
                        mapping.targetField !== field.key
                      }
                    >
                      {field.label}
                      {field.required ? ' *' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-tertiary pointer-events-none" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-theme">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="bg-assetly-dark dark:bg-assetly text-white dark:text-[#1C1916] hover:opacity-90 disabled:opacity-40"
        >
          Continue to Review
        </Button>
      </div>
    </div>
  );
}
