// @salsa - SALSA Compliance: Manage input batches for production batch
'use client';

import { useState, useEffect } from 'react';
import { ProductionBatchInput } from '@/lib/types/stockly';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import BatchSelector from '@/components/stockly/BatchSelector';
import { Trash2, Plus, AlertTriangle } from '@/components/ui/icons';
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
  const [selectedStockItemId, setSelectedStockItemId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [stockItems, setStockItems] = useState<{ id: string; name: string; stock_unit: string | null }[]>([]);


  // Load stock items and recipe ingredients
  useEffect(() => {
    async function load() {
      // Load stock items for the selector
      const { data: items } = await supabase
        .from('stock_items')
        .select('id, name, stock_unit')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');
      setStockItems(items || []);

      // Load recipe ingredients if recipe is set
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

  const handleAddInput = async () => {
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
        setShowAddForm(false);
        setSelectedBatchId(null);
        setSelectedStockItemId(null);
        setQuantity('');
        onUpdated();
      }
    } finally {
      setSaving(false);
    }
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
          className="flex items-center gap-2 w-full px-3 py-2 border border-dashed border-theme-border rounded-lg text-sm text-theme-tertiary hover:text-theme-secondary hover:border-planly-dark/30 dark:hover:border-planly/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Input Batch
        </button>
      )}

      {showAddForm && (
        <div className="p-4 bg-theme-bg-secondary border border-theme-border rounded-lg space-y-3">
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
              disabled={saving || !selectedBatchId || !quantity}
              className="px-4 py-2 bg-planly-dark dark:bg-planly text-white dark:text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setSelectedStockItemId(null);
                setSelectedBatchId(null);
                setQuantity('');
              }}
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
