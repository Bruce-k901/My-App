// @salsa - SALSA Compliance: Reusable batch selector for waste log and production
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { AlertTriangle, ChevronDown, Layers } from '@/components/ui/icons';
import type { StockBatch, FifoWarning } from '@/lib/types/stockly';

interface BatchSelectorProps {
  stockItemId: string;
  selectedBatchId: string | null;
  onSelect: (batchId: string | null, batch: StockBatch | null) => void;
  required?: boolean; // @salsa — required when active batches exist
  className?: string;
}

// @salsa
export default function BatchSelector({
  stockItemId,
  selectedBatchId,
  onSelect,
  required = true,
  className = '',
}: BatchSelectorProps) {
  const { companyId, siteId } = useAppContext();
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [fifoWarning, setFifoWarning] = useState<FifoWarning | null>(null);

  // @salsa — Fetch active batches for this stock item (ordered by use_by ASC for FIFO)
  useEffect(() => {
    async function fetchBatches() {
      if (!companyId || !stockItemId) {
        setBatches([]);
        setLoading(false);
        return;
      }

      setLoading(false);
      let query = supabase
        .from('stock_batches')
        .select('*')
        .eq('company_id', companyId)
        .eq('stock_item_id', stockItemId)
        .eq('status', 'active')
        .gt('quantity_remaining', 0)
        .order('use_by_date', { ascending: true, nullsFirst: false })
        .order('best_before_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true }); // oldest first as fallback

      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === '42P01') {
          setBatches([]);
        } else {
          console.error('Error fetching batches for selector:', error);
        }
      } else {
        setBatches(data || []);
      }
      setLoading(false);
    }

    fetchBatches();
  }, [companyId, siteId, stockItemId]);

  // @salsa — Check FIFO warning when a batch is selected
  useEffect(() => {
    if (!selectedBatchId || batches.length <= 1) {
      setFifoWarning(null);
      return;
    }

    const selectedIndex = batches.findIndex(b => b.id === selectedBatchId);
    if (selectedIndex <= 0) {
      setFifoWarning(null);
      return;
    }

    // There's an older batch that should be used first
    const olderBatch = batches[0];
    if (olderBatch.id !== selectedBatchId) {
      setFifoWarning({
        older_batch_code: olderBatch.batch_code,
        older_batch_remaining: olderBatch.quantity_remaining,
        older_batch_use_by: olderBatch.use_by_date,
        older_batch_best_before: olderBatch.best_before_date,
        unit: olderBatch.unit,
      });
    }
  }, [selectedBatchId, batches]);

  // No batches available
  if (!loading && batches.length === 0) {
    return null; // Don't render selector if no batches exist
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  function formatExpiry(batch: StockBatch) {
    if (batch.use_by_date) {
      return `UB: ${new Date(batch.use_by_date).toLocaleDateString('en-GB')}`;
    }
    if (batch.best_before_date) {
      return `BB: ${new Date(batch.best_before_date).toLocaleDateString('en-GB')}`;
    }
    return '';
  }

  return (
    <div className={className}>
      {/* Selector dropdown */}
      <div className="relative">
        <label className="block text-xs font-medium text-theme-secondary mb-1">
          Batch {required && batches.length > 0 && <span className="text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-colors ${
            !selectedBatchId && required && batches.length > 0
              ? 'border-red-300 dark:border-red-700'
              : 'border-theme'
          } bg-theme-surface text-theme-primary hover:border-stockly-dark/30 dark:hover:border-stockly/30`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-theme-tertiary" />
            {selectedBatch ? (
              <span>
                <span className="font-mono">{selectedBatch.batch_code}</span>
                <span className="text-theme-tertiary ml-2">
                  {selectedBatch.quantity_remaining} {selectedBatch.unit}
                </span>
                {formatExpiry(selectedBatch) && (
                  <span className="text-theme-tertiary ml-2">· {formatExpiry(selectedBatch)}</span>
                )}
              </span>
            ) : (
              <span className="text-theme-tertiary">Select batch...</span>
            )}
          </div>
          <ChevronDown className="w-4 h-4 text-theme-tertiary" />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute z-50 mt-1 w-full bg-theme-surface border border-theme rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {/* FIFO hint */}
              {batches.length > 1 && (
                <div className="px-3 py-1.5 text-xs text-theme-tertiary bg-theme-surface-elevated border-b border-theme">
                  Ordered by expiry date (FIFO — use oldest first)
                </div>
              )}
              {batches.map((batch, index) => (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => {
                    onSelect(batch.id, batch);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-theme-surface-elevated transition-colors ${
                    batch.id === selectedBatchId ? 'bg-stockly-dark/5 dark:bg-stockly/10' : ''
                  } ${index === 0 && batches.length > 1 ? 'border-l-2 border-l-emerald-500' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-theme-primary">{batch.batch_code}</span>
                    <span className="text-theme-tertiary">
                      {batch.quantity_remaining} {batch.unit}
                    </span>
                  </div>
                  {formatExpiry(batch) && (
                    <p className="text-xs text-theme-tertiary mt-0.5">
                      {formatExpiry(batch)}
                      {index === 0 && batches.length > 1 && ' (oldest)'}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* FIFO Warning — @salsa */}
      {fifoWarning && (
        <div className="mt-1.5 flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <strong>FIFO warning:</strong> Older batch <span className="font-mono">{fifoWarning.older_batch_code}</span> still has{' '}
            {fifoWarning.older_batch_remaining} {fifoWarning.unit} remaining.
            {fifoWarning.older_batch_use_by && (
              <> Use by: {new Date(fifoWarning.older_batch_use_by).toLocaleDateString('en-GB')}.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
