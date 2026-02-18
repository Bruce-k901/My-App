// @salsa - SALSA Compliance: Production batch list page
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import ProductionBatchCard from '@/components/stockly/ProductionBatchCard';
import { ProductionBatch, ProductionBatchStatus } from '@/lib/types/stockly';
import { Plus, Layers, Calendar, Filter } from '@/components/ui/icons';

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function ProductionBatchesPage() {
  const router = useRouter();
  const { companyId, siteId } = useAppContext();
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    if (!companyId) return;
    loadBatches();
  }, [companyId, siteId, statusFilter, dateFilter]);

  async function loadBatches() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ companyId: companyId! });
      if (siteId && siteId !== 'all') params.set('siteId', siteId);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (dateFilter) params.set('date', dateFilter);

      const res = await fetch(`/api/stockly/production-batches?${params}`);
      const result = await res.json();
      setBatches(result.data || []);
    } catch {
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary flex items-center gap-2">
            <Layers className="w-6 h-6 text-stockly-dark dark:text-stockly" />
            Production Batches
          </h1>
          <p className="text-sm text-theme-tertiary mt-1">Track production runs, inputs, outputs, and CCP records</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/stockly/production-batches/new')}
          className="flex items-center gap-2 px-4 py-2 bg-stockly-dark dark:bg-stockly text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Batch
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex bg-theme-bg-secondary rounded-lg p-1 border border-theme-border">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'bg-stockly-dark dark:bg-stockly text-white dark:text-gray-900'
                  : 'text-theme-tertiary hover:text-theme-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-theme-tertiary" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 bg-theme-bg-secondary border border-theme-border rounded-lg text-xs text-theme-primary"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-theme-tertiary hover:text-theme-secondary"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Batch list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-theme-bg-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-12">
          <Layers className="w-12 h-12 text-theme-tertiary mx-auto mb-3" />
          <p className="text-theme-secondary font-medium">No production batches found</p>
          <p className="text-sm text-theme-tertiary mt-1">
            {statusFilter !== 'all' || dateFilter
              ? 'Try adjusting your filters'
              : 'Create your first production batch to start tracking'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map(batch => (
            <ProductionBatchCard
              key={batch.id}
              batch={batch}
              onClick={() => router.push(`/dashboard/stockly/production-batches/${batch.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
