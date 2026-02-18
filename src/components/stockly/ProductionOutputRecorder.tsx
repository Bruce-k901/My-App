// @salsa - SALSA Compliance: Record finished product output for production batch
'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Package, AlertTriangle } from '@/components/ui/icons';

interface ProductionOutputRecorderProps {
  productionBatchId: string;
  companyId: string;
  productionDate?: string;
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
  onSaved,
  onCancel,
}: ProductionOutputRecorderProps) {
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

  useEffect(() => {
    async function loadStockItems() {
      const { data } = await supabase
        .from('stock_items')
        .select('id, name, stock_unit')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');
      setStockItems(data || []);
    }
    loadStockItems();
  }, [companyId]);

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

      // Auto-calculate use-by date from shelf life
      if (activeSpec?.shelf_life_days && productionDate) {
        const calculated = calculateShelfLifeDate(productionDate, activeSpec.shelf_life_days);
        setCalculatedUseByDate(calculated);
        setUseByDate(calculated);
        setDateOverrideWarning(null);
      } else {
        setCalculatedUseByDate(null);
      }
    }
    loadSpec();
  }, [stockItemId, productionDate]);

  // Check for date override warning
  useEffect(() => {
    if (calculatedUseByDate && useByDate && useByDate !== calculatedUseByDate) {
      setDateOverrideWarning(
        `This date differs from the calculated shelf life (${spec?.shelf_life_days} ${spec?.shelf_life_unit || 'days'} from production). Ensure this is authorised.`
      );
    } else {
      setDateOverrideWarning(null);
    }
  }, [useByDate, calculatedUseByDate, spec]);

  const handleStockItemChange = (id: string) => {
    setStockItemId(id);
    const item = stockItems.find(i => i.id === id);
    if (item?.stock_unit) setUnit(item.stock_unit);
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
          batch_code: batchCode || undefined,
          use_by_date: useByDate || null,
          best_before_date: bestBeforeDate || null,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">Finished Product</label>
        <select
          value={stockItemId}
          onChange={(e) => handleStockItemChange(e.target.value)}
          className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border rounded-lg text-sm text-theme-primary"
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
            className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border rounded-lg text-sm text-theme-primary"
            placeholder="0.000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Unit</label>
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border rounded-lg text-sm text-theme-primary"
            placeholder="kg, units, etc."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">
          Batch Code <span className="text-theme-tertiary font-normal">(auto-generated if empty)</span>
        </label>
        <input
          type="text"
          value={batchCode}
          onChange={(e) => setBatchCode(e.target.value)}
          className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border rounded-lg text-sm text-theme-primary"
          placeholder="Leave empty to auto-generate"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">
            Use By Date
            {spec?.shelf_life_days && (
              <span className="text-theme-tertiary font-normal ml-1">
                ({spec.shelf_life_days} {spec.shelf_life_unit || 'days'} shelf life)
              </span>
            )}
          </label>
          <input
            type="date"
            value={useByDate}
            onChange={(e) => setUseByDate(e.target.value)}
            className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border rounded-lg text-sm text-theme-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Best Before Date</label>
          <input
            type="date"
            value={bestBeforeDate}
            onChange={(e) => setBestBeforeDate(e.target.value)}
            className="w-full px-3 py-2 bg-theme-bg-secondary border border-theme-border rounded-lg text-sm text-theme-primary"
          />
        </div>
      </div>

      {dateOverrideWarning && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">{dateOverrideWarning}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || !stockItemId || !quantity}
          className="flex-1 px-4 py-2 bg-stockly-dark dark:bg-stockly text-white dark:text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Recording...' : 'Record Output'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-theme-border rounded-lg text-sm text-theme-secondary hover:bg-theme-bg-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
