// @salsa - SALSA Compliance: Production batch detail page
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ProductionBatch, ProductionBatchStatus } from '@/lib/types/stockly';
import { allergenKeyToLabel } from '@/lib/stockly/allergens';
import ProductionInputManager from '@/components/stockly/ProductionInputManager';
import ProductionOutputRecorder from '@/components/stockly/ProductionOutputRecorder';
import CCPRecordForm from '@/components/stockly/CCPRecordForm';
import {
  ArrowLeft, Layers, ChefHat, Calendar, Clock, CheckCircle, XCircle,
  Play, Square, Thermometer, Package, AlertTriangle, Plus, Info,
} from '@/components/ui/icons';

const STATUS_CONFIG: Record<ProductionBatchStatus, { label: string; color: string; icon: React.ElementType }> = {
  planned: { label: 'Planned', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

const TABS = ['Overview', 'Inputs', 'Outputs', 'CCP Records'] as const;

export default function ProductionBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [batch, setBatch] = useState<ProductionBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Overview');
  const [showOutputForm, setShowOutputForm] = useState(false);
  const [showCCPForm, setShowCCPForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadBatch();
  }, [id]);

  async function loadBatch() {
    try {
      const res = await fetch(`/api/stockly/production-batches/${id}`);
      const result = await res.json();
      if (result.success) setBatch(result.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus: ProductionBatchStatus) {
    setActionLoading(true);
    try {
      const endpoint = newStatus === 'completed'
        ? `/api/stockly/production-batches/${id}/complete`
        : `/api/stockly/production-batches/${id}`;

      const method = newStatus === 'completed' ? 'POST' : 'PATCH';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStatus === 'completed' ? {} : { status: newStatus }),
      });

      if (res.ok) {
        await loadBatch();
      }
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-theme-surface-elevated rounded animate-pulse mb-6" />
        <div className="h-64 bg-theme-surface-elevated rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-12">
        <p className="text-theme-secondary">Production batch not found</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-stockly-dark dark:text-stockly">Go back</button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[batch.status];
  const StatusIcon = statusConfig.icon;
  const isEditable = batch.status !== 'completed' && batch.status !== 'cancelled';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/stockly/production-batches')}
        className="flex items-center gap-1 text-sm text-theme-tertiary hover:text-theme-secondary mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Production Batches
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-theme-primary flex items-center gap-2">
              <Layers className="w-6 h-6 text-stockly-dark dark:text-stockly" />
              {batch.batch_code}
            </h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusConfig.label}
            </span>
          </div>
          {batch.recipe && (
            <p className="text-sm text-theme-secondary flex items-center gap-1.5">
              <ChefHat className="w-4 h-4" />
              {batch.recipe.name}
            </p>
          )}
          <p className="text-xs text-theme-tertiary mt-1">
            {new Date(batch.production_date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Status actions */}
        <div className="flex gap-2">
          {batch.status === 'planned' && (
            <button
              onClick={() => handleStatusChange('in_progress')}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Start Production
            </button>
          )}
          {batch.status === 'in_progress' && (
            <button
              onClick={() => handleStatusChange('completed')}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              Complete Batch
            </button>
          )}
          {isEditable && (
            <button
              onClick={() => handleStatusChange('cancelled')}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/10 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-theme mb-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-stockly-dark dark:border-stockly text-stockly-dark dark:text-stockly'
                : 'border-transparent text-theme-tertiary hover:text-theme-secondary'
            }`}
          >
            {tab}
            {tab === 'Inputs' && batch.inputs && ` (${batch.inputs.length})`}
            {tab === 'Outputs' && batch.outputs && ` (${batch.outputs.length})`}
            {tab === 'CCP Records' && batch.ccp_records && ` (${batch.ccp_records.length})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">
          {/* Workflow guide */}
          {batch.status === 'planned' && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-700 dark:text-blue-400">Next step: Start Production</p>
                <p className="text-blue-600 dark:text-blue-300 mt-0.5">
                  Click &quot;Start Production&quot; to begin, then record your <strong>Inputs</strong> (ingredients used) and <strong>Outputs</strong> (finished products). Actual quantity and yield are calculated when the batch is completed.
                </p>
              </div>
            </div>
          )}
          {batch.status === 'in_progress' && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
              <Info className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">Production in progress</p>
                <p className="text-amber-600 dark:text-amber-300 mt-0.5">
                  Use the <strong>Inputs</strong> tab to record ingredients used, and the <strong>Outputs</strong> tab to record finished products. Record any <strong>CCP checks</strong> as needed. When done, click &quot;Complete Batch&quot; to finalise — this will calculate your actual quantity, yield, and aggregate allergens.
                </p>
              </div>
            </div>
          )}
          {batch.status === 'completed' && (
            <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-emerald-700 dark:text-emerald-400">Batch complete</p>
                <p className="text-emerald-600 dark:text-emerald-300 mt-0.5">
                  This batch has been finalised. Actual quantity, yield, and allergens have been calculated from the recorded inputs and outputs.
                </p>
              </div>
            </div>
          )}

          {/* Quantities */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-theme-surface-elevated border border-theme rounded-lg p-4">
              <p className="text-xs text-theme-tertiary mb-1">Planned Qty</p>
              <p className="text-lg font-semibold text-theme-primary">
                {batch.planned_quantity ?? '—'} {batch.unit || ''}
              </p>
            </div>
            <div className="bg-theme-surface-elevated border border-theme rounded-lg p-4">
              <p className="text-xs text-theme-tertiary mb-1">Actual Qty</p>
              <p className="text-lg font-semibold text-theme-primary">
                {batch.actual_quantity ?? '—'} {batch.unit || ''}
              </p>
              {!batch.actual_quantity && batch.status !== 'completed' && batch.status !== 'cancelled' && (
                <p className="text-[10px] text-theme-tertiary mt-1">Calculated on completion from outputs</p>
              )}
            </div>
            <div className="bg-theme-surface-elevated border border-theme rounded-lg p-4">
              <p className="text-xs text-theme-tertiary mb-1">Yield</p>
              <p className="text-lg font-semibold text-theme-primary">
                {batch.planned_quantity && batch.actual_quantity
                  ? `${((batch.actual_quantity / batch.planned_quantity) * 100).toFixed(1)}%`
                  : '—'}
              </p>
              {!batch.actual_quantity && batch.status !== 'completed' && batch.status !== 'cancelled' && (
                <p className="text-[10px] text-theme-tertiary mt-1">Calculated on completion</p>
              )}
            </div>
            <div className="bg-theme-surface-elevated border border-theme rounded-lg p-4">
              <p className="text-xs text-theme-tertiary mb-1">Inputs / Outputs</p>
              <p className="text-lg font-semibold text-theme-primary">
                {batch.inputs?.length || 0} / {batch.outputs?.length || 0}
              </p>
              {(batch.inputs?.length || 0) === 0 && (batch.outputs?.length || 0) === 0 && batch.status !== 'completed' && batch.status !== 'cancelled' && (
                <p className="text-[10px] text-theme-tertiary mt-1">Record via Inputs &amp; Outputs tabs</p>
              )}
            </div>
          </div>

          {/* Allergens */}
          {(batch.allergens && batch.allergens.length > 0) || (batch.may_contain_allergens && batch.may_contain_allergens.length > 0) ? (
            <div className="bg-theme-surface-elevated border border-theme rounded-lg p-4">
              <h3 className="text-sm font-medium text-theme-secondary mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Allergens
              </h3>
              {batch.allergens && batch.allergens.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-theme-tertiary mb-1">Contains:</p>
                  <div className="flex flex-wrap gap-1">
                    {batch.allergens.map(a => (
                      <span key={a} className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {allergenKeyToLabel(a)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {batch.may_contain_allergens && batch.may_contain_allergens.length > 0 && (
                <div>
                  <p className="text-xs text-theme-tertiary mb-1">May Contain:</p>
                  <div className="flex flex-wrap gap-1">
                    {batch.may_contain_allergens.map(a => (
                      <span key={a} className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {allergenKeyToLabel(a)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Timing */}
          <div className="bg-theme-surface-elevated border border-theme rounded-lg p-4">
            <h3 className="text-sm font-medium text-theme-secondary mb-2">Timing</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-theme-tertiary">Started</p>
                <p className="text-theme-primary">{batch.started_at ? new Date(batch.started_at).toLocaleString('en-GB') : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-theme-tertiary">Completed</p>
                <p className="text-theme-primary">{batch.completed_at ? new Date(batch.completed_at).toLocaleString('en-GB') : '—'}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {batch.notes && (
            <div className="bg-theme-surface-elevated border border-theme rounded-lg p-4">
              <h3 className="text-sm font-medium text-theme-secondary mb-1">Notes</h3>
              <p className="text-sm text-theme-primary whitespace-pre-wrap">{batch.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Inputs' && (
        <ProductionInputManager
          productionBatchId={batch.id}
          companyId={batch.company_id}
          siteId={batch.site_id}
          inputs={batch.inputs || []}
          recipeId={batch.recipe_id}
          isEditable={isEditable}
          onUpdated={loadBatch}
          plannedQuantity={batch.planned_quantity}
          recipeYieldQuantity={batch.recipe?.yield_quantity}
          recipeYieldUnit={batch.recipe?.yield_unit}
        />
      )}

      {activeTab === 'Outputs' && (
        <div className="space-y-4">
          {/* Existing outputs */}
          {batch.outputs && batch.outputs.length > 0 ? (
            <div className="space-y-2">
              {batch.outputs.map(output => (
                <div key={output.id} className="flex items-center justify-between p-3 bg-theme-surface-elevated border border-theme rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-stockly-dark dark:text-stockly" />
                      <span className="text-sm font-medium text-theme-primary">{output.stock_item?.name || 'Unknown'}</span>
                      <span className="text-xs font-mono text-theme-tertiary">{output.batch_code}</span>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-theme-tertiary">
                      <span>Qty: {output.quantity} {output.unit || ''}</span>
                      {output.use_by_date && <span>Use by: {new Date(output.use_by_date).toLocaleDateString('en-GB')}</span>}
                      {output.best_before_date && <span>BB: {new Date(output.best_before_date).toLocaleDateString('en-GB')}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-theme-tertiary text-center py-4">No outputs recorded yet.</p>
          )}

          {isEditable && !showOutputForm && (
            <button
              onClick={() => setShowOutputForm(true)}
              className="flex items-center gap-2 w-full px-3 py-2 border border-dashed border-theme rounded-lg text-sm text-theme-tertiary hover:text-theme-secondary hover:border-stockly-dark/30 dark:hover:border-stockly/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Record Output
            </button>
          )}

          {showOutputForm && (
            <div className="bg-theme-surface-elevated border border-theme rounded-lg p-4">
              <ProductionOutputRecorder
                productionBatchId={batch.id}
                companyId={batch.company_id}
                productionDate={batch.production_date}
                recipeOutputStockItem={batch.recipe?.output_stock_item}
                plannedQuantity={batch.planned_quantity}
                plannedUnit={batch.unit}
                recipeShelfLifeDays={batch.recipe?.shelf_life_days}
                onSaved={() => {
                  setShowOutputForm(false);
                  loadBatch();
                }}
                onCancel={() => setShowOutputForm(false)}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'CCP Records' && (
        <div className="space-y-4">
          {/* Existing CCP records */}
          {batch.ccp_records && batch.ccp_records.length > 0 ? (
            <div className="space-y-2">
              {batch.ccp_records.map(record => (
                <div key={record.id} className="p-3 bg-theme-surface-elevated border border-theme rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-theme-tertiary" />
                      <span className="text-sm font-medium text-theme-primary capitalize">
                        {record.ccp_type.replace(/_/g, ' ')}
                      </span>
                      {record.is_within_spec !== null && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          record.is_within_spec
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {record.is_within_spec ? 'Pass' : 'Fail'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-theme-tertiary">
                      {new Date(record.recorded_at).toLocaleString('en-GB')}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-theme-tertiary">
                    {record.target_value && <span>Target: {record.target_value}{record.unit || ''}</span>}
                    {record.actual_value && <span>Actual: {record.actual_value}{record.unit || ''}</span>}
                  </div>
                  {record.corrective_action && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-400">
                      <span className="font-medium">Corrective Action:</span> {record.corrective_action}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-theme-tertiary text-center py-4">No CCP records yet.</p>
          )}

          {isEditable && !showCCPForm && (
            <button
              onClick={() => setShowCCPForm(true)}
              className="flex items-center gap-2 w-full px-3 py-2 border border-dashed border-theme rounded-lg text-sm text-theme-tertiary hover:text-theme-secondary hover:border-stockly-dark/30 dark:hover:border-stockly/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Record CCP Measurement
            </button>
          )}

          {showCCPForm && (
            <div className="bg-theme-surface-elevated border border-theme rounded-lg p-4">
              <CCPRecordForm
                productionBatchId={batch.id}
                onSaved={() => {
                  setShowCCPForm(false);
                  loadBatch();
                }}
                onCancel={() => setShowCCPForm(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
