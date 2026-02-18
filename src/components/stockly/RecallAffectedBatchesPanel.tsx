// @salsa - SALSA Compliance: Manage affected batches for a recall
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import {
  Plus,
  Trash2,
  Loader2,
  Search,
  Shield,
  AlertTriangle,
} from '@/components/ui/icons';
import type { RecallAffectedBatch } from '@/lib/types/stockly';

interface RecallAffectedBatchesPanelProps {
  recallId: string;
  affectedBatches: RecallAffectedBatch[];
  onUpdated: () => void;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  quarantined: { label: 'Quarantined', color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30' },
  destroyed: { label: 'Destroyed', color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30' },
  returned: { label: 'Returned', color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' },
  released: { label: 'Released', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30' },
  pending: { label: 'Pending', color: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800' },
};

export default function RecallAffectedBatchesPanel({ recallId, affectedBatches, onUpdated }: RecallAffectedBatchesPanelProps) {
  const { companyId } = useAppContext();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // @salsa — Search for batches to add
  async function handleSearch(value: string) {
    setSearch(value);
    if (!value || value.length < 2 || !companyId) {
      setSuggestions([]);
      return;
    }

    const { data } = await supabase
      .from('stock_batches')
      .select('id, batch_code, status, quantity_remaining, unit, stock_item:stock_items(name)')
      .eq('company_id', companyId)
      .ilike('batch_code', `%${value}%`)
      .not('status', 'in', '(depleted)')
      .limit(10);

    setSuggestions(data || []);
  }

  // @salsa — Add batch to recall
  async function handleAddBatch(batchId: string) {
    setSubmitting(true);

    const res = await fetch(`/api/stockly/recalls/${recallId}/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, stock_batch_id: batchId }),
    });

    if (res.ok) {
      setSearch('');
      setSuggestions([]);
      setAdding(false);
      onUpdated();
    }
    setSubmitting(false);
  }

  // @salsa — Remove batch from recall
  async function handleRemoveBatch(affectedBatchId: string) {
    setRemovingId(affectedBatchId);

    const res = await fetch(`/api/stockly/recalls/${recallId}/batches?affected_batch_id=${affectedBatchId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      onUpdated();
    }
    setRemovingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-theme-primary flex items-center gap-2">
          <Shield className="w-4 h-4 text-stockly-dark dark:text-stockly" />
          Affected Batches ({affectedBatches.length})
        </h3>
        <Button variant="outline" size="sm" onClick={() => setAdding(!adding)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Batch
        </Button>
      </div>

      {/* Add batch form */}
      {adding && (
        <div className="bg-theme-surface-elevated rounded-lg p-3 space-y-2 border border-theme">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search batch code..."
              className="w-full pl-10 pr-4 py-2 rounded border border-theme bg-theme-surface text-theme-primary text-sm"
            />
          </div>
          {suggestions.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {suggestions.map((s: any) => {
                const alreadyAdded = affectedBatches.some(ab => ab.stock_batch_id === s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => !alreadyAdded && handleAddBatch(s.id)}
                    disabled={alreadyAdded || submitting}
                    className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between transition-colors ${
                      alreadyAdded
                        ? 'opacity-50 cursor-not-allowed bg-theme-surface-elevated'
                        : 'hover:bg-theme-surface-elevated'
                    }`}
                  >
                    <div>
                      <span className="font-mono font-medium text-theme-primary">{s.batch_code}</span>
                      <span className="text-theme-secondary ml-2">{s.stock_item?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-theme-tertiary">{s.quantity_remaining} {s.unit}</span>
                      {alreadyAdded && <span className="text-xs text-amber-600 dark:text-amber-400">Already added</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs text-theme-tertiary flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Adding a batch will auto-quarantine it and create a recall movement record
          </p>
        </div>
      )}

      {/* Affected batches list */}
      {affectedBatches.length === 0 ? (
        <p className="text-sm text-theme-tertiary py-4 text-center">No affected batches added yet</p>
      ) : (
        <div className="space-y-2">
          {affectedBatches.map((ab) => {
            const sb = ab.stock_batch as any;
            const action = ACTION_LABELS[ab.action_taken] || ACTION_LABELS.pending;

            return (
              <div key={ab.id} className="flex items-center justify-between p-3 bg-theme-surface-elevated rounded-lg border border-theme">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-sm text-theme-primary">{sb?.batch_code || 'Unknown'}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${action.color}`}>
                      {action.label}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-theme-surface text-theme-tertiary capitalize">
                      {ab.batch_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-theme-secondary mt-0.5">
                    {sb?.stock_item?.name || 'Unknown item'}
                    {ab.quantity_affected && ` — ${ab.quantity_affected} affected`}
                    {ab.quantity_recovered ? ` (${ab.quantity_recovered} recovered)` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveBatch(ab.id)}
                  disabled={removingId === ab.id}
                  className="p-1.5 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  {removingId === ab.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
