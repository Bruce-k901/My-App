// @salsa - SALSA Compliance: Reusable batch selector for waste log and production
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { AlertTriangle, ChevronDown, Layers, Plus } from '@/components/ui/icons';
import type { StockBatch, FifoWarning } from '@/lib/types/stockly';

const STOCK_UNITS = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'litres', label: 'litres' },
  { value: 'ml', label: 'ml' },
  { value: 'units', label: 'units' },
  { value: 'each', label: 'each' },
  { value: 'portions', label: 'portions' },
  { value: 'dozen', label: 'dozen' },
  { value: 'slices', label: 'slices' },
];

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

  // Quick-add batch state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddQty, setQuickAddQty] = useState('');
  const [quickAddUnit, setQuickAddUnit] = useState('');
  const [quickAddUseBy, setQuickAddUseBy] = useState('');
  const [quickAddBatchCode, setQuickAddBatchCode] = useState('');
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  // @salsa — Fetch active batches for this stock item (ordered by use_by ASC for FIFO)
  useEffect(() => {
    fetchBatches();
  }, [companyId, siteId, stockItemId]);

  async function fetchBatches() {
    if (!companyId || !stockItemId) {
      setBatches([]);
      setLoading(false);
      return;
    }

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

  // Load stock item unit for quick-add default
  useEffect(() => {
    if (!stockItemId || !companyId) return;
    async function loadUnit() {
      const { data } = await supabase
        .from('stock_items')
        .select('stock_unit')
        .eq('id', stockItemId)
        .single();
      if (data?.stock_unit) setQuickAddUnit(data.stock_unit);
    }
    loadUnit();
  }, [stockItemId, companyId]);

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

  // Quick-add batch handler
  const handleQuickAddBatch = async () => {
    if (!companyId || !stockItemId || !quickAddQty) return;
    setQuickAddSaving(true);
    setQuickAddError(null);

    try {
      const res = await fetch('/api/stockly/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          site_id: siteId && siteId !== 'all' ? siteId : null,
          stock_item_id: stockItemId,
          quantity_received: parseFloat(quickAddQty),
          unit: quickAddUnit || 'units',
          batch_code: quickAddBatchCode || undefined, // auto-generate if empty
          use_by_date: quickAddUseBy || null,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        // Reset form
        setShowQuickAdd(false);
        setQuickAddQty('');
        setQuickAddBatchCode('');
        setQuickAddUseBy('');
        setQuickAddError(null);
        // Refresh batches and auto-select the new one
        await fetchBatches();
        if (result.data?.id) {
          onSelect(result.data.id, result.data);
        }
      } else {
        const result = await res.json();
        setQuickAddError(result.error || 'Failed to create batch');
      }
    } catch {
      setQuickAddError('Failed to create batch');
    } finally {
      setQuickAddSaving(false);
    }
  };

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

  // No batches available — show quick-add prompt
  if (!loading && batches.length === 0) {
    return (
      <div className={className}>
        {!showQuickAdd ? (
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">Batch</label>
            <button
              type="button"
              onClick={() => setShowQuickAdd(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              No batches recorded — record one now
            </button>
          </div>
        ) : (
          <QuickAddForm
            quickAddQty={quickAddQty}
            setQuickAddQty={setQuickAddQty}
            quickAddUnit={quickAddUnit}
            setQuickAddUnit={setQuickAddUnit}
            quickAddUseBy={quickAddUseBy}
            setQuickAddUseBy={setQuickAddUseBy}
            quickAddBatchCode={quickAddBatchCode}
            setQuickAddBatchCode={setQuickAddBatchCode}
            quickAddSaving={quickAddSaving}
            quickAddError={quickAddError}
            onSave={handleQuickAddBatch}
            onCancel={() => { setShowQuickAdd(false); setQuickAddError(null); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {!showQuickAdd ? (
        <>
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
                  {/* New batch option */}
                  <button
                    type="button"
                    onClick={() => { setIsOpen(false); setShowQuickAdd(true); }}
                    className="w-full text-left px-3 py-2 text-sm text-stockly-dark dark:text-stockly hover:bg-theme-surface-elevated transition-colors border-t border-theme flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Record new batch
                  </button>
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
        </>
      ) : (
        <QuickAddForm
          quickAddQty={quickAddQty}
          setQuickAddQty={setQuickAddQty}
          quickAddUnit={quickAddUnit}
          setQuickAddUnit={setQuickAddUnit}
          quickAddUseBy={quickAddUseBy}
          setQuickAddUseBy={setQuickAddUseBy}
          quickAddBatchCode={quickAddBatchCode}
          setQuickAddBatchCode={setQuickAddBatchCode}
          quickAddSaving={quickAddSaving}
          quickAddError={quickAddError}
          onSave={handleQuickAddBatch}
          onCancel={() => { setShowQuickAdd(false); setQuickAddError(null); }}
        />
      )}
    </div>
  );
}

// Inline quick-add batch form
function QuickAddForm({
  quickAddQty, setQuickAddQty,
  quickAddUnit, setQuickAddUnit,
  quickAddUseBy, setQuickAddUseBy,
  quickAddBatchCode, setQuickAddBatchCode,
  quickAddSaving, quickAddError,
  onSave, onCancel,
}: {
  quickAddQty: string; setQuickAddQty: (v: string) => void;
  quickAddUnit: string; setQuickAddUnit: (v: string) => void;
  quickAddUseBy: string; setQuickAddUseBy: (v: string) => void;
  quickAddBatchCode: string; setQuickAddBatchCode: (v: string) => void;
  quickAddSaving: boolean; quickAddError: string | null;
  onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="p-3 bg-theme-surface border border-theme rounded-lg space-y-2">
      <p className="text-xs font-medium text-theme-secondary">Record New Batch</p>

      {quickAddError && (
        <p className="text-xs text-red-600 dark:text-red-400">{quickAddError}</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-theme-tertiary mb-0.5">Qty Received *</label>
          <input
            type="number"
            step="0.001"
            value={quickAddQty}
            onChange={(e) => setQuickAddQty(e.target.value)}
            className="w-full px-2 py-1.5 bg-theme-surface-elevated border border-theme rounded text-sm text-theme-primary"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-[10px] text-theme-tertiary mb-0.5">Unit</label>
          <select
            value={quickAddUnit}
            onChange={(e) => setQuickAddUnit(e.target.value)}
            className="w-full px-2 py-1.5 bg-theme-surface-elevated border border-theme rounded text-sm text-theme-primary"
          >
            <option value="">Select...</option>
            {STOCK_UNITS.map(u => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-theme-tertiary mb-0.5">
            Batch Code <span className="text-theme-tertiary/60">(auto if empty)</span>
          </label>
          <input
            type="text"
            value={quickAddBatchCode}
            onChange={(e) => setQuickAddBatchCode(e.target.value)}
            className="w-full px-2 py-1.5 bg-theme-surface-elevated border border-theme rounded text-sm text-theme-primary"
            placeholder="Auto-generate"
          />
        </div>
        <div>
          <label className="block text-[10px] text-theme-tertiary mb-0.5">Use By Date</label>
          <input
            type="date"
            value={quickAddUseBy}
            onChange={(e) => setQuickAddUseBy(e.target.value)}
            className="w-full px-2 py-1.5 bg-theme-surface-elevated border border-theme rounded text-sm text-theme-primary"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={quickAddSaving || !quickAddQty}
          className="flex items-center gap-1 px-3 py-1.5 bg-stockly-dark dark:bg-stockly text-white dark:text-gray-900 rounded text-xs font-medium disabled:opacity-50"
        >
          {quickAddSaving ? 'Saving...' : 'Save Batch'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 border border-theme rounded text-xs text-theme-secondary hover:bg-theme-surface-elevated"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
