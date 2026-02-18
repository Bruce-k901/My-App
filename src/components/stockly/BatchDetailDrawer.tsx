// @salsa - SALSA Compliance: Batch detail drawer with movement history
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import {
  X,
  Loader2,
  AlertTriangle,
  Clock,
  Truck,
  Trash2,
  ChefHat,
  ArrowUp,
  ArrowDown,
  Package,
  Shield,
  Layers,
  ExternalLink,
  RefreshCw,
} from '@/components/ui/icons';
import type { BatchMovement, BatchStatus } from '@/lib/types/stockly';
// @salsa — Shared allergen utility for badge labels
import { allergenKeyToLabel } from '@/lib/stockly/allergens';
// @salsa — Phase 4: Dispatch record form
import DispatchRecordForm from '@/components/stockly/DispatchRecordForm';

interface BatchDetailDrawerProps {
  batchId: string;
  onClose: () => void;
  onUpdated?: () => void;
}

// @salsa
const MOVEMENT_ICONS: Record<string, React.ElementType> = {
  received: Truck,
  consumed_production: ChefHat,
  consumed_waste: Trash2,
  adjustment: ArrowUp,
  transfer: Package,
  recalled: Shield,
  rework: RefreshCw,
};

const MOVEMENT_LABELS: Record<string, string> = {
  received: 'Received',
  consumed_production: 'Used in production',
  consumed_waste: 'Wasted',
  adjustment: 'Adjusted',
  transfer: 'Transferred',
  recalled: 'Recalled',
  rework: 'Used as rework',
};

export default function BatchDetailDrawer({ batchId, onClose, onUpdated }: BatchDetailDrawerProps) {
  const { userId } = useAppContext();
  const [batch, setBatch] = useState<any>(null);
  const [movements, setMovements] = useState<BatchMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false); // @salsa Phase 4

  // @salsa — Fetch batch detail
  useEffect(() => {
    async function fetchBatch() {
      setLoading(true);
      const { data, error } = await supabase
        .from('stock_batches')
        .select(`
          *,
          stock_item:stock_items(id, name, category_id, stock_unit),
          delivery_line:delivery_lines(
            id,
            delivery:deliveries(id, supplier_id, delivery_date, delivery_note_number, suppliers(name))
          )
        `)
        .eq('id', batchId)
        .single();

      if (!error && data) {
        setBatch(data);

        // Fetch movements
        const { data: movData } = await supabase
          .from('batch_movements')
          .select('*')
          .eq('batch_id', batchId)
          .order('created_at', { ascending: false });

        setMovements(movData || []);
      }
      setLoading(false);
    }

    fetchBatch();
  }, [batchId]);

  // @salsa — Handle status change
  async function handleStatusChange(newStatus: BatchStatus) {
    if (!batch) return;
    setUpdating(true);

    const response = await fetch(`/api/stockly/batches/${batchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        adjustment_reason: `Status changed to ${newStatus}`,
      }),
    });

    if (response.ok) {
      const { data } = await response.json();
      setBatch((prev: any) => ({ ...prev, ...data }));
      onUpdated?.();
    }
    setUpdating(false);
  }

  // @salsa — Handle quantity adjustment
  async function handleAdjust() {
    const qty = parseFloat(adjustQty);
    if (isNaN(qty) || qty === 0 || !adjustReason.trim()) return;

    setUpdating(true);
    const response = await fetch(`/api/stockly/batches/${batchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quantity_adjustment: qty,
        adjustment_reason: adjustReason,
      }),
    });

    if (response.ok) {
      const { data } = await response.json();
      setBatch((prev: any) => ({ ...prev, ...data }));
      setAdjusting(false);
      setAdjustQty('');
      setAdjustReason('');

      // Refresh movements
      const { data: movData } = await supabase
        .from('batch_movements')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });
      setMovements(movData || []);
      onUpdated?.();
    }
    setUpdating(false);
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="ml-auto w-full max-w-md bg-theme-bg-primary shadow-xl flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-stockly-dark dark:text-stockly" />
        </div>
      </div>
    );
  }

  if (!batch) return null;

  const stockItem = batch.stock_item as any;
  const deliveryLine = batch.delivery_line as any;
  const delivery = deliveryLine?.delivery as any;
  const supplier = delivery?.suppliers as any;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="ml-auto w-full max-w-md bg-theme-bg-primary shadow-xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border">
          <div>
            <h2 className="font-mono font-bold text-theme-primary">{batch.batch_code}</h2>
            <p className="text-sm text-theme-secondary">{stockItem?.name || 'Unknown item'}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-theme-bg-secondary transition-colors">
            <X className="w-5 h-5 text-theme-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status + Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-theme-bg-secondary rounded-lg p-3">
              <p className="text-xs text-theme-tertiary mb-1">Remaining</p>
              <p className="text-xl font-bold text-theme-primary">
                {batch.quantity_remaining} <span className="text-sm font-normal text-theme-tertiary">{batch.unit}</span>
              </p>
              <p className="text-xs text-theme-tertiary">of {batch.quantity_received} received</p>
            </div>
            <div className="bg-theme-bg-secondary rounded-lg p-3">
              <p className="text-xs text-theme-tertiary mb-1">Status</p>
              <p className={`text-lg font-bold capitalize ${
                batch.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' :
                batch.status === 'expired' || batch.status === 'recalled' ? 'text-red-600 dark:text-red-400' :
                'text-theme-primary'
              }`}>
                {batch.status}
              </p>
            </div>
          </div>

          {/* @salsa Phase 4 — Recall/quarantine badge */}
          {(batch.status === 'quarantined' || batch.status === 'recalled') && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${
              batch.status === 'recalled'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
            }`}>
              <Shield className={`w-4 h-4 ${
                batch.status === 'recalled' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
              }`} />
              <span className={`text-sm font-medium ${
                batch.status === 'recalled' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
              }`}>
                This batch has been {batch.status}
              </span>
            </div>
          )}

          {/* Expiry dates */}
          {(batch.use_by_date || batch.best_before_date) && (
            <div className="bg-theme-bg-secondary rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-theme-tertiary uppercase">Expiry Dates</p>
              {batch.use_by_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-theme-secondary">Use by</span>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    {new Date(batch.use_by_date).toLocaleDateString('en-GB')}
                  </span>
                </div>
              )}
              {batch.best_before_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-theme-secondary">Best before</span>
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    {new Date(batch.best_before_date).toLocaleDateString('en-GB')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* @salsa — Allergen badges */}
          {batch.allergens && batch.allergens.length > 0 && (
            <div className="bg-theme-bg-secondary rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-theme-tertiary uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                Allergens
              </p>
              <div className="flex flex-wrap gap-1.5">
                {batch.allergens.map((allergen: string) => (
                  <span
                    key={allergen}
                    className="px-2 py-1 bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded text-xs"
                  >
                    {allergenKeyToLabel(allergen)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* @salsa — Production batch link (Phase 3) */}
          {batch.production_batch_id && (
            <a
              href={`/dashboard/stockly/production-batches/${batch.production_batch_id}`}
              className="flex items-center justify-between p-3 bg-stockly-dark/5 dark:bg-stockly/5 border border-stockly-dark/20 dark:border-stockly/20 rounded-lg hover:bg-stockly-dark/10 dark:hover:bg-stockly/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-stockly-dark dark:text-stockly" />
                <span className="text-sm font-medium text-stockly-dark dark:text-stockly">Production Batch</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-stockly-dark dark:text-stockly" />
            </a>
          )}

          {/* Receipt info */}
          <div className="bg-theme-bg-secondary rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-theme-tertiary uppercase">Receipt Details</p>
            {supplier?.name && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-theme-secondary">Supplier</span>
                <span className="text-sm text-theme-primary">{supplier.name}</span>
              </div>
            )}
            {delivery?.delivery_date && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-theme-secondary">Delivery date</span>
                <span className="text-sm text-theme-primary">{new Date(delivery.delivery_date).toLocaleDateString('en-GB')}</span>
              </div>
            )}
            {batch.supplier_batch_code && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-theme-secondary">Supplier batch</span>
                <span className="text-sm font-mono text-theme-primary">{batch.supplier_batch_code}</span>
              </div>
            )}
            {batch.temperature_on_receipt !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-theme-secondary">Temp on receipt</span>
                <span className="text-sm text-theme-primary">{batch.temperature_on_receipt}°C</span>
              </div>
            )}
            {batch.condition_notes && (
              <div>
                <span className="text-sm text-theme-secondary">Condition notes</span>
                <p className="text-sm text-theme-primary mt-0.5">{batch.condition_notes}</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-theme-secondary">Received</span>
              <span className="text-sm text-theme-primary">{new Date(batch.created_at).toLocaleDateString('en-GB')}</span>
            </div>
          </div>

          {/* Quick actions */}
          {batch.status === 'active' && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-theme-tertiary uppercase">Actions</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAdjusting(!adjusting)}
                  className="flex-1"
                >
                  Adjust Qty
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('quarantined')}
                  disabled={updating}
                  className="flex-1 text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-900/20"
                >
                  Quarantine
                </Button>
              </div>

              {/* @salsa Phase 4 — Dispatch action */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDispatch(!showDispatch)}
                className="w-full"
              >
                <Truck className="w-3.5 h-3.5 mr-1" /> Record Dispatch
              </Button>

              {/* Dispatch form */}
              {showDispatch && (
                <DispatchRecordForm
                  stockBatchId={batchId}
                  stockBatchCode={batch.batch_code}
                  unit={batch.unit}
                  onClose={() => setShowDispatch(false)}
                  onSaved={onUpdated}
                />
              )}

              {/* Adjustment form */}
              {adjusting && (
                <div className="bg-theme-bg-secondary rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.001"
                      placeholder="Qty (+/-)"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm rounded border border-theme-border bg-theme-bg-primary text-theme-primary"
                    />
                    <span className="flex items-center text-sm text-theme-tertiary">{batch.unit}</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Reason for adjustment (required)"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded border border-theme-border bg-theme-bg-primary text-theme-primary"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAdjust} disabled={updating || !adjustQty || !adjustReason.trim()}>
                      {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setAdjusting(false); setAdjustQty(''); setAdjustReason(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Movement history */}
          <div>
            <p className="text-xs font-medium text-theme-tertiary uppercase mb-2">Movement History</p>
            {movements.length === 0 ? (
              <p className="text-sm text-theme-tertiary py-2">No movements recorded</p>
            ) : (
              <div className="space-y-2">
                {movements.map((mov) => {
                  const Icon = MOVEMENT_ICONS[mov.movement_type] || Clock;
                  const isPositive = mov.quantity > 0;

                  return (
                    <div key={mov.id} className="flex items-start gap-3 bg-theme-bg-secondary rounded-lg p-3">
                      <div className={`p-1.5 rounded ${isPositive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        <Icon className={`w-3.5 h-3.5 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-theme-primary">
                            {MOVEMENT_LABELS[mov.movement_type] || mov.movement_type}
                          </span>
                          <span className={`text-sm font-mono font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isPositive ? '+' : ''}{mov.quantity} {batch.unit}
                          </span>
                        </div>
                        {mov.notes && <p className="text-xs text-theme-tertiary mt-0.5">{mov.notes}</p>}
                        <p className="text-xs text-theme-tertiary mt-0.5">
                          {new Date(mov.created_at).toLocaleDateString('en-GB')}{' '}
                          {new Date(mov.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
