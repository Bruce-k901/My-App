// @salsa - SALSA Compliance: Production batch card for list view
'use client';

import { ProductionBatch, ProductionBatchStatus } from '@/lib/types/stockly';
import { Layers, Calendar, ChefHat, CheckCircle, Clock, XCircle } from '@/components/ui/icons';
import { allergenKeyToLabel } from '@/lib/stockly/allergens';

const STATUS_CONFIG: Record<ProductionBatchStatus, { label: string; color: string; icon: React.ElementType }> = {
  planned: { label: 'Planned', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

interface ProductionBatchCardProps {
  batch: ProductionBatch;
  onClick?: () => void;
}

export default function ProductionBatchCard({ batch, onClick }: ProductionBatchCardProps) {
  const statusConfig = STATUS_CONFIG[batch.status];
  const StatusIcon = statusConfig.icon;

  const yield_ = batch.planned_quantity && batch.actual_quantity
    ? ((batch.actual_quantity / batch.planned_quantity) * 100).toFixed(1)
    : null;

  return (
    <div
      onClick={onClick}
      className="bg-theme-bg-primary border border-theme-border rounded-lg p-4 hover:border-planly-dark/30 dark:hover:border-planly/30 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-planly-dark dark:text-planly" />
          <span className="font-mono text-sm font-medium text-theme-primary">{batch.batch_code}</span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
          <StatusIcon className="w-3 h-3" />
          {statusConfig.label}
        </span>
      </div>

      {batch.recipe && (
        <div className="flex items-center gap-2 mb-2">
          <ChefHat className="w-4 h-4 text-theme-tertiary" />
          <span className="text-sm text-theme-secondary">{batch.recipe.name}</span>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-theme-tertiary mb-2">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(batch.production_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        {batch.planned_quantity && (
          <span>
            Planned: {batch.planned_quantity} {batch.unit || ''}
          </span>
        )}
        {batch.actual_quantity && (
          <span>
            Actual: {batch.actual_quantity} {batch.unit || ''}
          </span>
        )}
        {yield_ && (
          <span className={`font-medium ${parseFloat(yield_) >= 95 ? 'text-emerald-600 dark:text-emerald-400' : parseFloat(yield_) >= 85 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
            Yield: {yield_}%
          </span>
        )}
      </div>

      {batch.allergens && batch.allergens.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {batch.allergens.map(a => (
            <span key={a} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {allergenKeyToLabel(a)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
