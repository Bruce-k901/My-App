// @salsa - SALSA Compliance: Batch list page
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Layers,
  Search,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle,
  X,
  ChevronDown,
} from '@/components/ui/icons';
import type { StockBatch, BatchStatus } from '@/lib/types/stockly';
import BatchDetailDrawer from '@/components/stockly/BatchDetailDrawer';

// @salsa
const STATUS_CONFIG: Record<BatchStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Active', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  depleted: { label: 'Depleted', color: 'text-gray-500 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800/50' },
  expired: { label: 'Expired', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  quarantined: { label: 'Quarantined', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  recalled: { label: 'Recalled', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-200 dark:bg-red-900/50' },
};

function getExpiryStatus(useBy: string | null, bestBefore: string | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check use_by first (safety-critical)
  if (useBy) {
    const useByDate = new Date(useBy);
    const daysUntil = Math.ceil((useByDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return { label: 'USE BY EXPIRED', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', days: daysUntil };
    if (daysUntil <= 1) return { label: `Use by: ${daysUntil}d`, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', days: daysUntil };
    if (daysUntil <= 3) return { label: `Use by: ${daysUntil}d`, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', days: daysUntil };
  }

  // Check best_before (quality)
  if (bestBefore) {
    const bbDate = new Date(bestBefore);
    const daysUntil = Math.ceil((bbDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return { label: 'Past best before', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', days: daysUntil };
    if (daysUntil <= 7) return { label: `BB: ${daysUntil}d`, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', days: daysUntil };
  }

  return null;
}

export default function BatchListPage() {
  const { companyId, siteId } = useAppContext();
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BatchStatus>('active');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // @salsa — Fetch batches
  const fetchBatches = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      let query = supabase
        .from('stock_batches')
        .select(`
          *,
          stock_item:stock_items(id, name, category_id, stock_unit)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (search) {
        query = query.or(`batch_code.ilike.%${search}%,supplier_batch_code.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(100);

      if (error) {
        if (error.code === '42P01' || error.code === '42501') {
          // Table doesn't exist or permissions not yet applied — graceful handling
          setBatches([]);
        } else {
          console.error('Error fetching batches:', error);
        }
      } else {
        setBatches(data || []);
      }
    } catch (err) {
      console.error('Exception fetching batches:', err);
    }

    setLoading(false);
  }, [companyId, siteId, statusFilter, search]);

  useEffect(() => {
    if (companyId) fetchBatches();
  }, [companyId, fetchBatches]);

  const activeBatches = batches.filter(b => b.status === 'active');
  const expiringCount = activeBatches.filter(b => {
    const expiry = getExpiryStatus(b.use_by_date, b.best_before_date);
    return expiry !== null;
  }).length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary flex items-center gap-2">
            <Layers className="w-6 h-6 text-stockly-dark dark:text-stockly" />
            Batches
          </h1>
          <p className="text-sm text-theme-secondary mt-1">
            Track batch codes, expiry dates, and stock rotation (FIFO)
          </p>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
            {activeBatches.length} active
          </span>
          {expiringCount > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              {expiringCount} expiring
            </span>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-tertiary" />
          <Input
            placeholder="Search batch codes..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-tertiary hover:text-theme-primary">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 bg-theme-surface-elevated rounded-lg p-1">
          {(['all', 'active', 'depleted', 'expired', 'quarantined', 'recalled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === s
                  ? 'bg-white dark:bg-theme-surface text-theme-primary shadow-sm'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Batch table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-stockly-dark dark:text-stockly" />
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-12 bg-theme-surface-elevated rounded-xl border border-theme">
          <Layers className="w-10 h-10 mx-auto mb-3 text-theme-tertiary" />
          <h3 className="font-medium text-theme-primary mb-1">No batches found</h3>
          <p className="text-sm text-theme-secondary">
            {search ? 'Try adjusting your search' : 'Batches are created automatically when deliveries are received'}
          </p>
        </div>
      ) : (
        <div className="bg-theme-surface-elevated rounded-xl border border-theme overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme text-left">
                  <th className="px-4 py-3 font-medium text-theme-secondary">Batch Code</th>
                  <th className="px-4 py-3 font-medium text-theme-secondary">Stock Item</th>
                  <th className="px-4 py-3 font-medium text-theme-secondary text-right">Remaining</th>
                  <th className="px-4 py-3 font-medium text-theme-secondary">Expiry</th>
                  <th className="px-4 py-3 font-medium text-theme-secondary">Status</th>
                  <th className="px-4 py-3 font-medium text-theme-secondary">Received</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => {
                  const expiry = getExpiryStatus(batch.use_by_date, batch.best_before_date);
                  const statusCfg = STATUS_CONFIG[batch.status];

                  return (
                    <tr
                      key={batch.id}
                      onClick={() => setSelectedBatchId(batch.id)}
                      className="border-b border-theme last:border-0 hover:bg-theme-surface/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-theme-primary">{batch.batch_code}</span>
                        {batch.supplier_batch_code && (
                          <span className="text-xs text-theme-tertiary ml-2">({batch.supplier_batch_code})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-theme-primary">
                        {(batch.stock_item as any)?.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-theme-primary">
                        {batch.quantity_remaining} <span className="text-theme-tertiary font-normal">{batch.unit}</span>
                      </td>
                      <td className="px-4 py-3">
                        {expiry ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${expiry.bgColor} ${expiry.color}`}>
                            <AlertTriangle className="w-3 h-3" />
                            {expiry.label}
                          </span>
                        ) : (
                          <span className="text-xs text-theme-tertiary">
                            {batch.use_by_date ? `UB: ${new Date(batch.use_by_date).toLocaleDateString('en-GB')}` : ''}
                            {batch.use_by_date && batch.best_before_date ? ' / ' : ''}
                            {batch.best_before_date ? `BB: ${new Date(batch.best_before_date).toLocaleDateString('en-GB')}` : ''}
                            {!batch.use_by_date && !batch.best_before_date ? '—' : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusCfg.bgColor} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-theme-tertiary">
                        {new Date(batch.created_at).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-[rgb(var(--border))]">
            {batches.map((batch) => {
              const expiry = getExpiryStatus(batch.use_by_date, batch.best_before_date);
              const statusCfg = STATUS_CONFIG[batch.status];

              return (
                <div
                  key={batch.id}
                  onClick={() => setSelectedBatchId(batch.id)}
                  className="p-4 hover:bg-theme-surface/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono font-medium text-theme-primary text-sm">{batch.batch_code}</span>
                      <p className="text-sm text-theme-secondary mt-0.5">{(batch.stock_item as any)?.name || 'Unknown'}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusCfg.bgColor} ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-theme-primary">
                      {batch.quantity_remaining} {batch.unit}
                    </span>
                    {expiry && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${expiry.bgColor} ${expiry.color}`}>
                        <AlertTriangle className="w-3 h-3" />
                        {expiry.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Batch detail drawer */}
      {selectedBatchId && (
        <BatchDetailDrawer
          batchId={selectedBatchId}
          onClose={() => setSelectedBatchId(null)}
          onUpdated={fetchBatches}
        />
      )}
    </div>
  );
}
