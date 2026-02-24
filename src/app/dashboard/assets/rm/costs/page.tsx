"use client";

import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useSiteFilter } from '@/hooks/useSiteFilter';
import { DollarSign, Download } from '@/components/ui/icons';
import { useWorkOrders } from '@/hooks/assetly/useWorkOrders';
import { PRIORITY_CONFIG, WO_TYPE_CONFIG, WO_STATUS_CONFIG } from '@/types/rm';
import type { WorkOrder } from '@/types/rm';
import CostSummary from '@/components/rm/CostSummary';

export default function RMCostsPage() {
  const { companyId } = useAppContext();
  const { isAllSites, selectedSiteId } = useSiteFilter();
  const siteId = isAllSites ? null : selectedSiteId;

  const { workOrders, loading, fetchWorkOrders } = useWorkOrders(companyId, siteId);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  // Filter by date range
  const filtered = workOrders.filter(wo => {
    if (dateFrom && wo.created_at < dateFrom) return false;
    if (dateTo && wo.created_at > dateTo + 'T23:59:59') return false;
    return true;
  });

  const woWithCost = filtered.filter(wo => wo.actual_cost !== null || wo.estimated_cost !== null);

  // Spend by WO type
  const spendByType = filtered.reduce<Record<string, { actual: number; estimated: number; count: number }>>((acc, wo) => {
    const key = wo.wo_type;
    if (!acc[key]) acc[key] = { actual: 0, estimated: 0, count: 0 };
    acc[key].actual += wo.actual_cost || 0;
    acc[key].estimated += wo.estimated_cost || 0;
    acc[key].count++;
    return acc;
  }, {});

  // Spend by contractor
  const spendByContractor = filtered.reduce<Record<string, { name: string; actual: number; count: number }>>((acc, wo) => {
    if (!wo.assigned_to_contractor_id) return acc;
    const key = wo.assigned_to_contractor_id;
    if (!acc[key]) acc[key] = { name: wo.contractor_name || 'Unknown', actual: 0, count: 0 };
    acc[key].actual += wo.actual_cost || 0;
    acc[key].count++;
    return acc;
  }, {});

  const exportCSV = () => {
    const headers = ['WO Number', 'Title', 'Type', 'Priority', 'Status', 'Asset', 'Contractor', 'Estimated Cost', 'Actual Cost', 'Created', 'Completed'];
    const rows = filtered.map(wo => [
      wo.wo_number,
      wo.title,
      WO_TYPE_CONFIG[wo.wo_type]?.label || wo.wo_type,
      wo.priority,
      WO_STATUS_CONFIG[wo.status]?.label || wo.status,
      wo.asset_name || wo.building_asset_name || '',
      wo.contractor_name || '',
      wo.estimated_cost?.toFixed(2) || '',
      wo.actual_cost?.toFixed(2) || '',
      wo.created_at ? new Date(wo.created_at).toLocaleDateString('en-GB') : '',
      wo.completed_at ? new Date(wo.completed_at).toLocaleDateString('en-GB') : '',
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rm-costs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-theme-primary flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-assetly-dark dark:text-assetly" />
            R&M Costs
          </h1>
          <p className="text-sm text-theme-tertiary mt-1">Track maintenance spend across work orders</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-theme text-theme-secondary hover:bg-theme-hover transition-colors self-start"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Date filters */}
      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-xs text-theme-tertiary mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-theme-tertiary mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="px-3 py-2 text-sm text-theme-tertiary hover:text-theme-secondary"
          >
            Clear
          </button>
        )}
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-assetly-dark dark:border-assetly" />
        </div>
      ) : (
        <>
          <CostSummary workOrders={filtered} />

          {/* Spend by type */}
          <div className="bg-theme-surface border border-theme rounded-xl p-4">
            <h3 className="text-sm font-semibold text-theme-primary mb-3">Spend by Work Order Type</h3>
            <div className="space-y-2">
              {Object.entries(spendByType).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-theme-secondary">{WO_TYPE_CONFIG[type as keyof typeof WO_TYPE_CONFIG]?.label || type}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-theme-tertiary">{data.count} WOs</span>
                    <span className="font-medium text-theme-primary">£{data.actual.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spend by contractor */}
          {Object.keys(spendByContractor).length > 0 && (
            <div className="bg-theme-surface border border-theme rounded-xl p-4">
              <h3 className="text-sm font-semibold text-theme-primary mb-3">Spend by Contractor</h3>
              <div className="space-y-2">
                {Object.entries(spendByContractor)
                  .sort((a, b) => b[1].actual - a[1].actual)
                  .map(([id, data]) => (
                    <div key={id} className="flex items-center justify-between text-sm">
                      <span className="text-theme-secondary">{data.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-theme-tertiary">{data.count} WOs</span>
                        <span className="font-medium text-theme-primary">£{data.actual.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* WO Table */}
          <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme bg-theme-muted">
                    <th className="text-left px-4 py-2 text-xs font-medium text-theme-tertiary">WO #</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-theme-tertiary">Title</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-theme-tertiary">Type</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-theme-tertiary">Contractor</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-theme-tertiary">Estimated</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-theme-tertiary">Actual</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-theme-tertiary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {woWithCost.map(wo => (
                    <tr key={wo.id} className="border-b border-theme last:border-0 hover:bg-theme-hover/50">
                      <td className="px-4 py-2 font-mono text-xs text-theme-tertiary">{wo.wo_number}</td>
                      <td className="px-4 py-2 text-theme-primary truncate max-w-[200px]">{wo.title}</td>
                      <td className="px-4 py-2 text-theme-tertiary">{WO_TYPE_CONFIG[wo.wo_type]?.label}</td>
                      <td className="px-4 py-2 text-theme-tertiary">{wo.contractor_name || '—'}</td>
                      <td className="px-4 py-2 text-right text-theme-tertiary">
                        {wo.estimated_cost ? `£${wo.estimated_cost.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-theme-primary">
                        {wo.actual_cost ? `£${wo.actual_cost.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${WO_STATUS_CONFIG[wo.status]?.bgColour} ${WO_STATUS_CONFIG[wo.status]?.colour}`}>
                          {WO_STATUS_CONFIG[wo.status]?.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {woWithCost.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-theme-tertiary">
                        No work orders with cost data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
