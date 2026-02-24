'use client';

import { DollarSign, TrendingUp, TrendingDown } from '@/components/ui/icons';
import type { WorkOrder } from '@/types/rm';
import { OPEN_STATUSES } from '@/types/rm';

interface Props {
  workOrders: WorkOrder[];
}

export default function CostSummary({ workOrders }: Props) {
  const withCost = workOrders.filter(wo => wo.actual_cost !== null && wo.actual_cost > 0);
  const totalSpend = withCost.reduce((sum, wo) => sum + (wo.actual_cost || 0), 0);
  const avgCost = withCost.length > 0 ? totalSpend / withCost.length : 0;
  const totalEstimated = workOrders.reduce((sum, wo) => sum + (wo.estimated_cost || 0), 0);
  const openEstimated = workOrders
    .filter(wo => OPEN_STATUSES.includes(wo.status))
    .reduce((sum, wo) => sum + (wo.estimated_cost || 0), 0);

  // Spend by category
  const spendByType = withCost.reduce<Record<string, number>>((acc, wo) => {
    const key = wo.wo_type;
    acc[key] = (acc[key] || 0) + (wo.actual_cost || 0);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-theme-surface border border-theme rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-assetly-dark dark:text-assetly" />
          <p className="text-xs text-theme-tertiary">Total Spend</p>
        </div>
        <p className="text-2xl font-bold text-theme-primary">£{totalSpend.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
        <p className="text-xs text-theme-tertiary mt-1">{withCost.length} completed work orders</p>
      </div>

      <div className="bg-theme-surface border border-theme rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <p className="text-xs text-theme-tertiary">Avg Cost / WO</p>
        </div>
        <p className="text-2xl font-bold text-theme-primary">£{avgCost.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>

      <div className="bg-theme-surface border border-theme rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="w-4 h-4 text-amber-500" />
          <p className="text-xs text-theme-tertiary">Total Estimated</p>
        </div>
        <p className="text-2xl font-bold text-theme-primary">£{totalEstimated.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
      </div>

      <div className="bg-theme-surface border border-theme rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-orange-500" />
          <p className="text-xs text-theme-tertiary">Open Committed</p>
        </div>
        <p className="text-2xl font-bold text-theme-primary">£{openEstimated.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
        <p className="text-xs text-theme-tertiary mt-1">estimated on open WOs</p>
      </div>
    </div>
  );
}
