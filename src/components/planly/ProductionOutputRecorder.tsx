// @salsa - SALSA Compliance: Record finished product output for production batch
'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Package } from '@/components/ui/icons';

interface ProductionOutputRecorderProps {
  productionBatchId: string;
  companyId: string;
  onSaved: () => void;
  onCancel: () => void;
}

interface StockItem {
  id: string;
  name: string;
  stock_unit: string | null;
}

export default function ProductionOutputRecorder({
  productionBatchId,
  companyId,
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

  const handleStockItemChange = (id: string) => {
    setStockItemId(id);
    const item = stockItems.find(i => i.id === id);
    if (item?.stock_unit) setUnit(item.stock_unit);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockItemId || !quantity) return;
    setSaving(true);

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
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          <label className="block text-sm font-medium text-theme-secondary mb-1">Use By Date</label>
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

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || !stockItemId || !quantity}
          className="flex-1 px-4 py-2 bg-planly-dark dark:bg-planly text-white dark:text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50"
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
