// @salsa - Read-only production batch summary for Planly production plan
'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { ProductionBatch, ProductionBatchStatus } from '@/lib/types/stockly';
import { Layers, Calendar, CheckCircle, Clock, XCircle, ExternalLink, Plus } from '@/components/ui/icons';
import Link from 'next/link';

const STATUS_BADGE: Record<ProductionBatchStatus, { label: string; color: string }> = {
  planned: { label: 'Planned', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

interface ProductionBatchTrackerProps {
  selectedDate: string;
  siteId: string | null;
}

export default function ProductionBatchTracker({ selectedDate, siteId }: ProductionBatchTrackerProps) {
  const { companyId } = useAppContext();
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ companyId: companyId!, date: selectedDate });
        if (siteId && siteId !== 'all') params.set('siteId', siteId);
        const res = await fetch(`/api/stockly/production-batches?${params}`);
        const result = await res.json();
        setBatches(result.data || []);
      } catch {
        setBatches([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, selectedDate, siteId]);

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2].map(i => (
          <div key={i} className="h-16 bg-theme-surface-elevated rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <Layers className="w-10 h-10 text-theme-tertiary mx-auto mb-2" />
        <p className="text-sm text-theme-secondary mb-1">No production batches for this date</p>
        <Link
          href={`/dashboard/stockly/production-batches/new?date=${selectedDate}`}
          className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-xs font-medium text-stockly-dark dark:text-stockly border border-stockly-dark/20 dark:border-stockly/20 rounded-lg hover:bg-stockly-dark/5 dark:hover:bg-stockly/5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Batch in Stockly
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-theme-tertiary">{batches.length} batch{batches.length !== 1 ? 'es' : ''} for this date</p>
        <Link
          href={`/dashboard/stockly/production-batches/new?date=${selectedDate}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-stockly-dark dark:text-stockly hover:opacity-80"
        >
          <Plus className="w-3.5 h-3.5" />
          New Batch
        </Link>
      </div>

      {batches.map(batch => {
        const status = STATUS_BADGE[batch.status];
        const yield_ = batch.planned_quantity && batch.actual_quantity
          ? ((batch.actual_quantity / batch.planned_quantity) * 100).toFixed(1)
          : null;

        return (
          <Link
            key={batch.id}
            href={`/dashboard/stockly/production-batches/${batch.id}`}
            className="flex items-center justify-between p-3 bg-theme-surface-elevated border border-theme rounded-lg hover:border-stockly-dark/20 dark:hover:border-stockly/20 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium text-theme-primary">{batch.batch_code}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-theme-tertiary">
                {batch.recipe && <span>{batch.recipe.name}</span>}
                {batch.planned_quantity && <span>Plan: {batch.planned_quantity}{batch.unit ? ` ${batch.unit}` : ''}</span>}
                {batch.actual_quantity && <span>Actual: {batch.actual_quantity}{batch.unit ? ` ${batch.unit}` : ''}</span>}
                {yield_ && (
                  <span className={`font-medium ${parseFloat(yield_) >= 95 ? 'text-emerald-600 dark:text-emerald-400' : parseFloat(yield_) >= 85 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                    {yield_}%
                  </span>
                )}
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-theme-tertiary opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}
