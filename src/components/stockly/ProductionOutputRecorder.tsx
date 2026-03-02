// @salsa - SALSA Compliance: Record finished product, byproduct, or waste output for production batch
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Package, AlertTriangle, Info } from '@/components/ui/icons';

type OutputType = 'finished_product' | 'byproduct' | 'waste';

const OUTPUT_TYPE_CONFIG: Record<OutputType, { label: string; description: string; itemLabel: string; submitLabel: string }> = {
  finished_product: {
    label: 'Finished Product',
    description: 'The main product from this batch',
    itemLabel: 'Finished Product',
    submitLabel: 'Record Output',
  },
  byproduct: {
    label: 'Byproduct',
    description: 'Leftover material reused as a new product (e.g. pre-ferment)',
    itemLabel: 'Byproduct Item',
    submitLabel: 'Record Byproduct',
  },
  waste: {
    label: 'Waste',
    description: 'Material discarded during production',
    itemLabel: 'Waste Item',
    submitLabel: 'Record Waste',
  },
};

interface RecipeOutputStockItem {
  id: string;
  name: string;
  stock_unit: string | null;
}

interface ProductionOutputRecorderProps {
  productionBatchId: string;
  companyId: string;
  productionDate?: string;
  recipeOutputStockItem?: RecipeOutputStockItem | null;
  plannedQuantity?: number | null;
  plannedUnit?: string | null;
  recipeShelfLifeDays?: number | null;
  onSaved: () => void;
  onCancel: () => void;
}

interface StockItem {
  id: string;
  name: string;
  stock_unit: string | null;
}

interface ShelfLifeSpec {
  shelf_life_days: number | null;
  shelf_life_unit: string;
}

function calculateShelfLifeDate(productionDate: string, shelfLifeDays: number): string {
  const date = new Date(productionDate);
  date.setDate(date.getDate() + shelfLifeDays);
  return date.toISOString().split('T')[0];
}

export default function ProductionOutputRecorder({
  productionBatchId,
  companyId,
  productionDate,
  recipeOutputStockItem,
  plannedQuantity,
  plannedUnit,
  recipeShelfLifeDays,
  onSaved,
  onCancel,
}: ProductionOutputRecorderProps) {
  const [outputType, setOutputType] = useState<OutputType>('finished_product');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockItemId, setStockItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [useByDate, setUseByDate] = useState('');
  const [bestBeforeDate, setBestBeforeDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shelf-life validation state
  const [spec, setSpec] = useState<ShelfLifeSpec | null>(null);
  const [calculatedUseByDate, setCalculatedUseByDate] = useState<string | null>(null);
  const [dateOverrideWarning, setDateOverrideWarning] = useState<string | null>(null);

  // Track whether we've auto-populated from recipe (only do once)
  const autoPopulated = useRef(false);

  const isWaste = outputType === 'waste';
  const config = OUTPUT_TYPE_CONFIG[outputType];

  useEffect(() => {
    async function loadStockItems() {
      const { data } = await supabase
        .from('stock_items')
        .select('id, name, stock_unit')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');
      setStockItems(data || []);

      // Auto-populate from recipe output stock item (once, after items load)
      if (!autoPopulated.current && recipeOutputStockItem && data) {
        const exists = data.some((item: any) => item.id === recipeOutputStockItem.id);
        if (exists) {
          autoPopulated.current = true;
          setStockItemId(recipeOutputStockItem.id);
          // Batch unit takes priority for consistency
          if (plannedUnit) {
            setUnit(plannedUnit);
          } else if (recipeOutputStockItem.stock_unit) {
            setUnit(recipeOutputStockItem.stock_unit);
          }
          if (plannedQuantity) setQuantity(String(plannedQuantity));

          // If recipe has shelf_life_days and no product spec will override, pre-calculate
          if (recipeShelfLifeDays && productionDate) {
            const calculated = calculateShelfLifeDate(productionDate, recipeShelfLifeDays);
            setUseByDate(calculated);
            setCalculatedUseByDate(calculated);
          }
        }
      }
      // Even without recipe auto-populate, default unit to batch unit
      if (!autoPopulated.current && plannedUnit) {
        setUnit(plannedUnit);
      }
    }
    loadStockItems();
  }, [companyId, recipeOutputStockItem, plannedQuantity, plannedUnit, recipeShelfLifeDays, productionDate]);

  // Fetch product specification when stock item changes
  useEffect(() => {
    if (!stockItemId) {
      setSpec(null);
      setCalculatedUseByDate(null);
      setDateOverrideWarning(null);
      return;
    }

    async function loadSpec() {
      const { data } = await supabase
        .from('product_specifications')
        .select('shelf_life_days, shelf_life_unit')
        .eq('stock_item_id', stockItemId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1);

      const activeSpec = data?.[0] || null;
      setSpec(activeSpec);

      // Product spec shelf life takes priority over recipe shelf life
      if (activeSpec?.shelf_life_days && productionDate) {
        const calculated = calculateShelfLifeDate(productionDate, activeSpec.shelf_life_days);
        setCalculatedUseByDate(calculated);
        setUseByDate(calculated);
        setDateOverrideWarning(null);
      } else if (recipeShelfLifeDays && productionDate && !activeSpec) {
        // Fallback to recipe shelf life if no product spec
        const calculated = calculateShelfLifeDate(productionDate, recipeShelfLifeDays);
        setCalculatedUseByDate(calculated);
        setUseByDate(calculated);
        setDateOverrideWarning(null);
      } else {
        setCalculatedUseByDate(null);
      }
    }
    loadSpec();
  }, [stockItemId, productionDate, recipeShelfLifeDays]);

  // Check for date override warning
  useEffect(() => {
    if (calculatedUseByDate && useByDate && useByDate !== calculatedUseByDate) {
      const source = spec?.shelf_life_days ? `${spec.shelf_life_days} ${spec.shelf_life_unit || 'days'}` : `${recipeShelfLifeDays} days (recipe)`;
      setDateOverrideWarning(
        `This date differs from the calculated shelf life (${source} from production). Ensure this is authorised.`
      );
    } else {
      setDateOverrideWarning(null);
    }
  }, [useByDate, calculatedUseByDate, spec, recipeShelfLifeDays]);

  const handleStockItemChange = (id: string) => {
    setStockItemId(id);
    const item = stockItems.find(i => i.id === id);
    // Only set unit from stock item if no batch unit is enforced
    if (!plannedUnit && item?.stock_unit) setUnit(item.stock_unit);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockItemId || !quantity) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/stockly/production-batches/${productionBatchId}/outputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_item_id: stockItemId,
          quantity: parseFloat(quantity),
          unit: unit || null,
          batch_code: isWaste ? undefined : (batchCode || undefined),
          use_by_date: isWaste ? null : (useByDate || null),
          best_before_date: isWaste ? null : (bestBeforeDate || null),
          output_type: outputType,
        }),
      });

      if (res.ok) {
        onSaved();
      } else {
        const result = await res.json();
        setError(result.error || 'Failed to record output');
      }
    } catch {
      setError('Failed to record output');
    } finally {
      setSaving(false);
    }
  };

  const shelfLifeSource = spec?.shelf_life_days
    ? `${spec.shelf_life_days} ${spec.shelf_life_unit || 'days'}`
    : recipeShelfLifeDays
    ? `${recipeShelfLifeDays} days (from recipe)`
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Output type selector */}
      <div className="flex gap-1 p-1 bg-theme-muted rounded-lg">
        {(Object.keys(OUTPUT_TYPE_CONFIG) as OutputType[]).map(type => {
          const tc = OUTPUT_TYPE_CONFIG[type];
          const active = outputType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setOutputType(type);
                setError(null);
                // Clear recipe auto-fill when switching to byproduct/waste
                if (type !== 'finished_product' && autoPopulated.current && stockItemId === recipeOutputStockItem?.id) {
                  setStockItemId('');
                  setQuantity('');
                  setBatchCode('');
                  setUseByDate('');
                  setBestBeforeDate('');
                }
              }}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                active
                  ? type === 'waste'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : type === 'byproduct'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-theme-surface text-theme-primary shadow-sm'
                  : 'text-theme-tertiary hover:text-theme-secondary'
              }`}
            >
              {tc.label}
            </button>
          );
        })}
      </div>

      {/* Type description */}
      <p className="text-xs text-theme-tertiary">{config.description}</p>

      {/* Waste info note */}
      {isWaste && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Waste is recorded for yield tracking but won&apos;t create a stock batch.
          </p>
        </div>
      )}

      {/* Auto-populated info (finished product only) */}
      {outputType === 'finished_product' && recipeOutputStockItem && stockItemId === recipeOutputStockItem.id && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Pre-filled from recipe. Review and adjust if needed.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">{config.itemLabel}</label>
        <select
          value={stockItemId}
          onChange={(e) => handleStockItemChange(e.target.value)}
          className="w-full px-3 py-2 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary"
        >
          <option value="">Select stock item...</option>
          {stockItems.map(item => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Quantity</label>
          <input
            type="number"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary"
            placeholder="0.000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Unit</label>
          {plannedUnit ? (
            <div className="w-full px-3 py-2 bg-theme-muted border border-theme rounded-lg text-sm text-theme-primary cursor-not-allowed">
              {plannedUnit}
            </div>
          ) : (
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary"
              placeholder="kg, units, etc."
            />
          )}
        </div>
      </div>

      {/* Batch code, dates — hidden for waste */}
      {!isWaste && (
        <>
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">
              Batch Code <span className="text-theme-tertiary font-normal">(auto-generated if empty)</span>
            </label>
            <input
              type="text"
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value)}
              className="w-full px-3 py-2 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary"
              placeholder="Leave empty to auto-generate"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                Use By Date
                {shelfLifeSource && (
                  <span className="text-theme-tertiary font-normal ml-1">
                    ({shelfLifeSource} shelf life)
                  </span>
                )}
              </label>
              <input
                type="date"
                value={useByDate}
                onChange={(e) => setUseByDate(e.target.value)}
                className="w-full px-3 py-2 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Best Before Date</label>
              <input
                type="date"
                value={bestBeforeDate}
                onChange={(e) => setBestBeforeDate(e.target.value)}
                className="w-full px-3 py-2 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary"
              />
            </div>
          </div>

          {dateOverrideWarning && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">{dateOverrideWarning}</p>
            </div>
          )}
        </>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || !stockItemId || !quantity}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
            isWaste
              ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600'
              : 'bg-stockly-dark dark:bg-stockly text-white dark:text-gray-900'
          }`}
        >
          {saving ? 'Recording...' : config.submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-theme rounded-lg text-sm text-theme-secondary hover:bg-theme-surface-elevated"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
