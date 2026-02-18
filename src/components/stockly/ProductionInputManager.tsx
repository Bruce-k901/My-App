// @salsa - SALSA Compliance: Manage input batches for production batch (with rework support)
'use client';

import { useState, useEffect } from 'react';
import { ProductionBatchInput } from '@/lib/types/stockly';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import BatchSelector from '@/components/stockly/BatchSelector';
import { Trash2, Plus, AlertTriangle, RefreshCw } from '@/components/ui/icons';
import { allergenKeyToLabel } from '@/lib/stockly/allergens';

interface ProductionInputManagerProps {
  productionBatchId: string;
  companyId: string;
  siteId: string | null;
  inputs: ProductionBatchInput[];
  recipeId: string | null;
  isEditable: boolean;
  onUpdated: () => void;
}

interface RecipeIngredient {
  stock_item_id: string;
  stock_item_name: string;
  quantity: number;
  unit: string;
}

interface ReworkBatch {
  id: string;
  batch_code: string;
  stock_item_id: string;
  stock_item_name: string;
  quantity_remaining: number;
  unit: string;
  production_batch_id: string;
  allergens: string[] | null;
}

export default function ProductionInputManager({
  productionBatchId,
  companyId,
  siteId,
  inputs,
  recipeId,
  isEditable,
  onUpdated,
}: ProductionInputManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [inputType, setInputType] = useState<'stock' | 'rework'>('stock');
  const [selectedStockItemId, setSelectedStockItemId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [stockItems, setStockItems] = useState<{ id: string; name: string; stock_unit: string | null }[]>([]);
  const [reworkBatches, setReworkBatches] = useState<ReworkBatch[]>([]);
  const [selectedReworkBatch, setSelectedReworkBatch] = useState<ReworkBatch | null>(null);

  // Load stock items and recipe ingredients
  useEffect(() => {
    async function load() {
      const { data: items } = await supabase
        .from('stock_items')
        .select('id, name, stock_unit')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');
      setStockItems(items || []);

      if (recipeId) {
        const { data: ingredients } = await supabase
          .from('recipe_ingredients')
          .select('stock_item_id, stock_items(name), quantity, unit')
          .eq('recipe_id', recipeId);

        if (ingredients) {
          setRecipeIngredients(
            ingredients.map((ing: any) => ({
              stock_item_id: ing.stock_item_id,
              stock_item_name: ing.stock_items?.name || 'Unknown',
              quantity: ing.quantity,
              unit: ing.unit,
            }))
          );
        }
      }
    }
    load();
  }, [companyId, recipeId]);

  // Load rework batches when rework tab is selected
  useEffect(() => {
    if (inputType !== 'rework') return;

    async function loadReworkBatches() {
      // Rework batches are stock_batches that came from production (production_batch_id IS NOT NULL)
      // and still have remaining quantity
      const { data } = await supabase
        .from('stock_batches')
        .select('id, batch_code, stock_item_id, quantity_remaining, unit, production_batch_id, allergens, stock_items(name)')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .not('production_batch_id', 'is', null)
        .gt('quantity_remaining', 0)
        .neq('production_batch_id', productionBatchId) // Don't allow self-reference
        .order('created_at', { ascending: false });

      setReworkBatches(
        (data || []).map((b: any) => ({
          id: b.id,
          batch_code: b.batch_code,
          stock_item_id: b.stock_item_id,
          stock_item_name: b.stock_items?.name || 'Unknown',
          quantity_remaining: b.quantity_remaining,
          unit: b.unit,
          production_batch_id: b.production_batch_id,
          allergens: b.allergens,
        }))
      );
    }
    loadReworkBatches();
  }, [inputType, companyId, productionBatchId]);

  const handleAddInput = async () => {
    if (inputType === 'rework') {
      if (!selectedReworkBatch || !quantity) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/stockly/production-batches/${productionBatchId}/inputs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stock_batch_id: selectedReworkBatch.id,
            stock_item_id: selectedReworkBatch.stock_item_id,
            actual_quantity: parseFloat(quantity),
            unit: selectedReworkBatch.unit || null,
            is_rework: true,
            rework_source_batch_id: selectedReworkBatch.production_batch_id,
          }),
        });
        if (res.ok) {
          resetForm();
          onUpdated();
        }
      } finally {
        setSaving(false);
      }
    } else {
      if (!selectedBatchId || !selectedStockItemId || !quantity) return;
      setSaving(true);
      try {
        const res = await fetch(`/api/stockly/production-batches/${productionBatchId}/inputs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stock_batch_id: selectedBatchId,
            stock_item_id: selectedStockItemId,
            actual_quantity: parseFloat(quantity),
            unit: stockItems.find(i => i.id === selectedStockItemId)?.stock_unit || null,
          }),
        });
        if (res.ok) {
          resetForm();
          onUpdated();
        }
      } finally {
        setSaving(false);
      }
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setSelectedBatchId(null);
    setSelectedStockItemId(null);
    setSelectedReworkBatch(null);
    setQuantity('');
    setInputType('stock');
  };

  const handleRemoveInput = async (inputId: string) => {
    setDeleting(inputId);
    try {
      const res = await fetch(
        `/api/stockly/production-batches/${productionBatchId}/inputs?inputId=${inputId}`,
        { method: 'DELETE' }
      );
      if (res.ok) onUpdated();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing inputs */}
      {inputs.length > 0 ? (
        <div className="space-y-2">
          {inputs.map(input => (
            <div
              key={input.id}
              className="flex items-center justify-between p-3 bg-theme-bg-secondary rounded-lg border border-theme-border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-theme-primary">
                    {input.stock_item?.name || 'Unknown Item'}
                  </span>
                  <span className="text-xs font-mono text-theme-tertiary">
                    {input.stock_batch?.batch_code || ''}
                  </span>
                  {input.is_rework && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                      <RefreshCw className="w-2.5 h-2.5" />
                      Rework
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-theme-tertiary">
                  <span>Qty: {input.actual_quantity || input.planned_quantity} {input.unit || ''}</span>
                  {input.stock_batch?.allergens && input.stock_batch.allergens.length > 0 && (
                    <div className="flex gap-1">
                      {input.stock_batch.allergens.map((a: string) => (
                        <span key={a} className="px-1 py-0.5 rounded text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          {allergenKeyToLabel(a)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {isEditable && (
                <button
                  onClick={() => handleRemoveInput(input.id)}
                  disabled={deleting === input.id}
                  className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-theme-tertiary text-center py-4">No input batches recorded yet.</p>
      )}

      {/* Suggested ingredients from recipe */}
      {recipeIngredients.length > 0 && inputs.length === 0 && isEditable && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">Recipe Ingredients (suggested)</p>
          <div className="space-y-1">
            {recipeIngredients.map(ing => (
              <div key={ing.stock_item_id} className="text-xs text-blue-600 dark:text-blue-300">
                {ing.stock_item_name}: {ing.quantity} {ing.unit}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add input form */}
      {isEditable && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 w-full px-3 py-2 border border-dashed border-theme-border rounded-lg text-sm text-theme-tertiary hover:text-theme-secondary hover:border-stockly-dark/30 dark:hover:border-stockly/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Input Batch
        </button>
      )}

      {showAddForm && (
        <div className="p-4 bg-theme-bg-secondary border border-theme-border rounded-lg space-y-3">
          {/* Input type toggle */}
          <div className="flex bg-theme-bg-primary rounded-lg p-1 border border-theme-border">
            <button
              onClick={() => { setInputType('stock'); setSelectedReworkBatch(null); setSelectedBatchId(null); }}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                inputType === 'stock'
                  ? 'bg-stockly-dark dark:bg-stockly text-white dark:text-gray-900'
                  : 'text-theme-tertiary hover:text-theme-secondary'
              }`}
            >
              From Stock
            </button>
            <button
              onClick={() => { setInputType('rework'); setSelectedStockItemId(null); setSelectedBatchId(null); }}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                inputType === 'rework'
                  ? 'bg-purple-600 dark:bg-purple-500 text-white'
                  : 'text-theme-tertiary hover:text-theme-secondary'
              }`}
            >
              <RefreshCw className="w-3 h-3" />
              From Rework
            </button>
          </div>

          {inputType === 'stock' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">Stock Item</label>
                <select
                  value={selectedStockItemId || ''}
                  onChange={(e) => {
                    setSelectedStockItemId(e.target.value || null);
                    setSelectedBatchId(null);
                  }}
                  className="w-full px-3 py-2 bg-theme-bg-primary border border-theme-border rounded-lg text-sm text-theme-primary"
                >
                  <option value="">Select item...</option>
                  {stockItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              {selectedStockItemId && (
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1">Batch (FIFO ordered)</label>
                  <BatchSelector
                    stockItemId={selectedStockItemId}
                    selectedBatchId={selectedBatchId}
                    onSelect={(batchId) => setSelectedBatchId(batchId)}
                  />
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                Rework Batch <span className="text-theme-tertiary font-normal">(production output with remaining stock)</span>
              </label>
              {reworkBatches.length === 0 ? (
                <p className="text-xs text-theme-tertiary py-2">No rework batches available.</p>
              ) : (
                <select
                  value={selectedReworkBatch?.id || ''}
                  onChange={(e) => {
                    const batch = reworkBatches.find(b => b.id === e.target.value);
                    setSelectedReworkBatch(batch || null);
                  }}
                  className="w-full px-3 py-2 bg-theme-bg-primary border border-theme-border rounded-lg text-sm text-theme-primary"
                >
                  <option value="">Select rework batch...</option>
                  {reworkBatches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batch_code} — {b.stock_item_name} ({b.quantity_remaining} {b.unit} remaining)
                    </option>
                  ))}
                </select>
              )}
              {selectedReworkBatch?.allergens && selectedReworkBatch.allergens.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-[10px] text-theme-tertiary">Allergens:</span>
                  {selectedReworkBatch.allergens.map(a => (
                    <span key={a} className="px-1 py-0.5 rounded text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {allergenKeyToLabel(a)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Quantity</label>
            <input
              type="number"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 bg-theme-bg-primary border border-theme-border rounded-lg text-sm text-theme-primary"
              placeholder="0.000"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddInput}
              disabled={saving || !quantity || (inputType === 'stock' ? !selectedBatchId : !selectedReworkBatch)}
              className="px-4 py-2 bg-stockly-dark dark:bg-stockly text-white dark:text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-theme-border rounded-lg text-sm text-theme-secondary hover:bg-theme-bg-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
