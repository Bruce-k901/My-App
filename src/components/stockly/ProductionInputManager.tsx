// @salsa - SALSA Compliance: Manage input batches for production batch (with rework support)
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProductionBatchInput } from '@/lib/types/stockly';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import BatchSelector from '@/components/stockly/BatchSelector';
import { Trash2, Plus, AlertTriangle, RefreshCw, CheckCircle, ChefHat, Package } from '@/components/ui/icons';
import { allergenKeyToLabel } from '@/lib/stockly/allergens';

interface ProductionInputManagerProps {
  productionBatchId: string;
  companyId: string;
  siteId: string | null;
  inputs: ProductionBatchInput[];
  recipeId: string | null;
  isEditable: boolean;
  onUpdated: () => void;
  plannedQuantity?: number | null;
  recipeYieldQuantity?: number | null;
  recipeYieldUnit?: string | null;
}

interface ResolvedRecipeIngredient {
  ingredient_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  stock_item_id: string | null;
  stock_item_name: string | null;
  stock_unit: string | null;
  is_sub_recipe: boolean;
  sub_recipe_name: string | null;
  allergens: string[] | null;
}

interface RowState {
  selectedBatchId: string | null;
  quantity: string;
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
  plannedQuantity,
  recipeYieldQuantity,
  recipeYieldUnit,
}: ProductionInputManagerProps) {
  // Scale factor: if batch planned_quantity differs from recipe yield, scale ingredients
  const scaleFactor = (plannedQuantity && recipeYieldQuantity && recipeYieldQuantity > 0)
    ? plannedQuantity / recipeYieldQuantity
    : 1;
  // Manual add form state (for extras / non-recipe items)
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [inputType, setInputType] = useState<'stock' | 'rework'>('stock');
  const [selectedStockItemId, setSelectedStockItemId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [stockItems, setStockItems] = useState<{ id: string; name: string; stock_unit: string | null }[]>([]);
  const [reworkBatches, setReworkBatches] = useState<ReworkBatch[]>([]);
  const [selectedReworkBatch, setSelectedReworkBatch] = useState<ReworkBatch | null>(null);

  // Recipe-driven state
  const [resolvedIngredients, setResolvedIngredients] = useState<ResolvedRecipeIngredient[]>([]);
  const [rowStates, setRowStates] = useState<Map<string, RowState>>(new Map());
  const [addingIngredient, setAddingIngredient] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  // Check if a recipe ingredient is already added as an input
  const isAlreadyAdded = useCallback((ingredient: ResolvedRecipeIngredient): boolean => {
    if (!ingredient.stock_item_id) return false;
    return inputs.some(input => input.stock_item_id === ingredient.stock_item_id);
  }, [inputs]);

  // Get the existing input for an ingredient (if already added)
  const getExistingInput = useCallback((ingredient: ResolvedRecipeIngredient): ProductionBatchInput | undefined => {
    if (!ingredient.stock_item_id) return undefined;
    return inputs.find(input => input.stock_item_id === ingredient.stock_item_id);
  }, [inputs]);

  // Load stock items and resolve recipe ingredients
  useEffect(() => {
    async function load() {
      // Load all stock items (for manual add)
      const { data: items } = await supabase
        .from('stock_items')
        .select('id, name, stock_unit')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');
      setStockItems(items || []);

      // Load and resolve recipe ingredients
      if (recipeId) {
        setLoadingIngredients(true);
        try {
          const { data: ingredients } = await supabase
            .from('recipe_ingredients')
            .select('id, ingredient_id, ingredient_name, quantity, unit_abbreviation, sub_recipe_id, sub_recipe_name, allergens')
            .eq('recipe_id', recipeId)
            .order('sort_order');

          if (ingredients && ingredients.length > 0) {
            // Get ingredient IDs that are regular ingredients (not sub-recipes)
            const ingredientIds = ingredients
              .filter((i: any) => i.ingredient_id && !i.sub_recipe_id)
              .map((i: any) => i.ingredient_id);

            // Find matching stock items via library_item_id
            let stockItemMap = new Map<string, { id: string; name: string; stock_unit: string | null }>();
            if (ingredientIds.length > 0) {
              const { data: matchedItems } = await supabase
                .from('stock_items')
                .select('id, library_item_id, name, stock_unit')
                .eq('company_id', companyId)
                .eq('library_type', 'ingredients_library')
                .in('library_item_id', ingredientIds)
                .eq('is_active', true);

              if (matchedItems) {
                stockItemMap = new Map(
                  matchedItems.map((si: any) => [si.library_item_id, { id: si.id, name: si.name, stock_unit: si.stock_unit }])
                );
              }
            }

            // Build resolved ingredients
            const resolved: ResolvedRecipeIngredient[] = ingredients.map((ing: any) => {
              const stockItem = ing.ingredient_id ? stockItemMap.get(ing.ingredient_id) : null;
              return {
                ingredient_id: ing.ingredient_id || ing.sub_recipe_id,
                ingredient_name: ing.ingredient_name || ing.sub_recipe_name || 'Unknown',
                quantity: ing.quantity,
                unit: ing.unit_abbreviation || '',
                stock_item_id: stockItem?.id || null,
                stock_item_name: stockItem?.name || null,
                stock_unit: stockItem?.stock_unit || null,
                is_sub_recipe: !!ing.sub_recipe_id,
                sub_recipe_name: ing.sub_recipe_name || null,
                allergens: ing.allergens || null,
              };
            });

            setResolvedIngredients(resolved);

            // Initialise row states with scaled recipe quantities
            const initialRowStates = new Map<string, RowState>();
            resolved.forEach(ing => {
              if (!ing.is_sub_recipe && ing.stock_item_id) {
                const scaledQty = Math.round(ing.quantity * scaleFactor * 1000) / 1000;
                initialRowStates.set(ing.ingredient_id, {
                  selectedBatchId: null,
                  quantity: String(scaledQty),
                });
              }
            });
            setRowStates(initialRowStates);
          }
        } finally {
          setLoadingIngredients(false);
        }
      }
    }
    load();
  }, [companyId, recipeId, scaleFactor]);

  // Load rework batches when rework tab is selected
  useEffect(() => {
    if (inputType !== 'rework') return;

    async function loadReworkBatches() {
      const { data } = await supabase
        .from('stock_batches')
        .select('id, batch_code, stock_item_id, quantity_remaining, unit, production_batch_id, allergens, stock_items(name)')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .not('production_batch_id', 'is', null)
        .gt('quantity_remaining', 0)
        .neq('production_batch_id', productionBatchId)
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

  // Update a row's state
  const updateRowState = (ingredientId: string, updates: Partial<RowState>) => {
    setRowStates(prev => {
      const next = new Map(prev);
      const current = next.get(ingredientId) || { selectedBatchId: null, quantity: '' };
      next.set(ingredientId, { ...current, ...updates });
      return next;
    });
  };

  // Add a single recipe ingredient as input
  const handleAddRecipeIngredient = async (ingredient: ResolvedRecipeIngredient) => {
    const row = rowStates.get(ingredient.ingredient_id);
    if (!row?.selectedBatchId || !row?.quantity || !ingredient.stock_item_id) return;

    setAddingIngredient(ingredient.ingredient_id);
    try {
      const res = await fetch(`/api/stockly/production-batches/${productionBatchId}/inputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_batch_id: row.selectedBatchId,
          stock_item_id: ingredient.stock_item_id,
          actual_quantity: parseFloat(row.quantity),
          unit: ingredient.stock_unit || ingredient.unit || null,
        }),
      });
      if (res.ok) onUpdated();
    } finally {
      setAddingIngredient(null);
    }
  };

  // Bulk add all remaining recipe ingredients
  const handleAddAllRemaining = async () => {
    setAddingAll(true);
    try {
      for (const ingredient of resolvedIngredients) {
        if (isAlreadyAdded(ingredient)) continue;
        if (!ingredient.stock_item_id || ingredient.is_sub_recipe) continue;

        const row = rowStates.get(ingredient.ingredient_id);
        if (!row?.selectedBatchId || !row?.quantity) continue;

        const res = await fetch(`/api/stockly/production-batches/${productionBatchId}/inputs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stock_batch_id: row.selectedBatchId,
            stock_item_id: ingredient.stock_item_id,
            actual_quantity: parseFloat(row.quantity),
            unit: ingredient.stock_unit || ingredient.unit || null,
          }),
        });
        if (!res.ok) break; // Stop on first error
      }
      onUpdated();
    } finally {
      setAddingAll(false);
    }
  };

  // Manual add handlers (for extras / non-recipe items)
  const handleManualAddInput = async () => {
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
          resetManualForm();
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
          resetManualForm();
          onUpdated();
        }
      } finally {
        setSaving(false);
      }
    }
  };

  const resetManualForm = () => {
    setShowManualAdd(false);
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

  // Count pending ingredients (not yet added, have stock item, not sub-recipe)
  const pendingIngredients = resolvedIngredients.filter(
    ing => !ing.is_sub_recipe && ing.stock_item_id && !isAlreadyAdded(ing)
  );
  const addedCount = resolvedIngredients.filter(
    ing => !ing.is_sub_recipe && ing.stock_item_id && isAlreadyAdded(ing)
  ).length;
  const readyToAddCount = pendingIngredients.filter(ing => {
    const row = rowStates.get(ing.ingredient_id);
    return row?.selectedBatchId && row?.quantity;
  }).length;

  return (
    <div className="space-y-4">
      {/* Existing inputs list */}
      {inputs.length > 0 && (
        <div className="space-y-2">
          {inputs.map(input => (
            <div
              key={input.id}
              className="flex items-center justify-between p-3 bg-theme-surface-elevated rounded-lg border border-theme"
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
      )}

      {/* Recipe ingredients section */}
      {recipeId && resolvedIngredients.length > 0 && isEditable && (
        <div className="border border-theme rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-theme-surface-elevated border-b border-theme">
            <div className="flex items-center gap-2 flex-wrap">
              <ChefHat className="w-4 h-4 text-stockly-dark dark:text-stockly" />
              <span className="text-sm font-medium text-theme-primary">Recipe Ingredients</span>
              <span className="text-xs text-theme-tertiary">
                ({addedCount} of {addedCount + pendingIngredients.length} added)
              </span>
              {scaleFactor !== 1 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {scaleFactor > 1 ? `${scaleFactor.toFixed(2)}x` : `${scaleFactor.toFixed(2)}x`} recipe
                </span>
              )}
            </div>
            {pendingIngredients.length > 0 && readyToAddCount > 0 && (
              <button
                onClick={handleAddAllRemaining}
                disabled={addingAll || addingIngredient !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stockly-dark dark:bg-stockly text-white dark:text-gray-900 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
              >
                {addingAll ? (
                  'Adding...'
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Add Remaining ({readyToAddCount})
                  </>
                )}
              </button>
            )}
          </div>

          {/* Loading skeleton */}
          {loadingIngredients && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-theme-surface-elevated rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {/* Ingredient rows */}
          {!loadingIngredients && (
            <div className="divide-y divide-theme">
              {resolvedIngredients.map(ingredient => {
                const added = isAlreadyAdded(ingredient);
                const existingInput = getExistingInput(ingredient);
                const row = rowStates.get(ingredient.ingredient_id);

                // Sub-recipe row
                if (ingredient.is_sub_recipe) {
                  return (
                    <div key={ingredient.ingredient_id} className="px-4 py-3 bg-theme-surface">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-theme-secondary">{ingredient.sub_recipe_name || ingredient.ingredient_name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Sub-recipe
                        </span>
                        <span className="text-xs text-theme-tertiary ml-auto">{ingredient.quantity} {ingredient.unit}</span>
                      </div>
                      <p className="text-xs text-theme-tertiary mt-1">Track inputs separately when making this prep item</p>
                    </div>
                  );
                }

                // No stock item mapped
                if (!ingredient.stock_item_id) {
                  return (
                    <div key={ingredient.ingredient_id} className="px-4 py-3 bg-theme-surface">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="text-sm text-theme-secondary">{ingredient.ingredient_name}</span>
                        <span className="text-xs text-theme-tertiary ml-auto">{ingredient.quantity} {ingredient.unit}</span>
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Not set up as a stock item — add it in Stock Items to track batches
                      </p>
                    </div>
                  );
                }

                // Already added
                if (added && existingInput) {
                  return (
                    <div key={ingredient.ingredient_id} className="px-4 py-3 bg-emerald-50/50 dark:bg-emerald-900/5">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-theme-primary">{ingredient.ingredient_name}</span>
                        <span className="text-xs font-mono text-theme-tertiary">
                          {existingInput.stock_batch?.batch_code || ''}
                        </span>
                        <span className="text-xs text-theme-tertiary ml-auto">
                          {existingInput.actual_quantity || existingInput.planned_quantity} {existingInput.unit || ingredient.unit}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Pending — interactive row
                return (
                  <div key={ingredient.ingredient_id} className="px-4 py-3 bg-theme-surface space-y-2">
                    {/* Ingredient header */}
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-stockly-dark dark:text-stockly flex-shrink-0" />
                      <span className="text-sm font-medium text-theme-primary">{ingredient.ingredient_name}</span>
                      {ingredient.allergens && ingredient.allergens.length > 0 && (
                        <div className="flex gap-1">
                          {ingredient.allergens.map((a: string) => (
                            <span key={a} className="px-1 py-0.5 rounded text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              {allergenKeyToLabel(a)}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="text-xs text-theme-tertiary ml-auto">
                        Need: {Math.round(ingredient.quantity * scaleFactor * 1000) / 1000} {ingredient.unit}
                        {scaleFactor !== 1 && (
                          <span className="text-theme-tertiary/60 ml-1">(recipe: {ingredient.quantity})</span>
                        )}
                      </span>
                    </div>

                    {/* Batch selector + quantity + add button */}
                    <div className="flex items-end gap-2">
                      <div className="flex-1 min-w-0">
                        <BatchSelector
                          stockItemId={ingredient.stock_item_id}
                          selectedBatchId={row?.selectedBatchId || null}
                          onSelect={(batchId) => updateRowState(ingredient.ingredient_id, { selectedBatchId: batchId })}
                        />
                      </div>
                      <div className="w-24 flex-shrink-0">
                        <label className="block text-xs font-medium text-theme-secondary mb-1">Qty</label>
                        <input
                          type="number"
                          step="0.001"
                          value={row?.quantity || ''}
                          onChange={(e) => updateRowState(ingredient.ingredient_id, { quantity: e.target.value })}
                          className="w-full px-2 py-2 bg-theme-surface border border-theme rounded-lg text-sm text-theme-primary"
                          placeholder="0"
                        />
                      </div>
                      <button
                        onClick={() => handleAddRecipeIngredient(ingredient)}
                        disabled={addingIngredient === ingredient.ingredient_id || addingAll || !row?.selectedBatchId || !row?.quantity}
                        className="flex-shrink-0 px-3 py-2 bg-stockly-dark dark:bg-stockly text-white dark:text-gray-900 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                      >
                        {addingIngredient === ingredient.ingredient_id ? '...' : 'Add'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty state when no inputs and no recipe */}
      {inputs.length === 0 && (!recipeId || resolvedIngredients.length === 0) && !loadingIngredients && (
        <p className="text-sm text-theme-tertiary text-center py-4">No input batches recorded yet.</p>
      )}

      {/* Manual add button (for extras / non-recipe items) */}
      {isEditable && !showManualAdd && (
        <button
          onClick={() => setShowManualAdd(true)}
          className="flex items-center gap-2 w-full px-3 py-2 border border-dashed border-theme rounded-lg text-sm text-theme-tertiary hover:text-theme-secondary hover:border-stockly-dark/30 dark:hover:border-stockly/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {recipeId ? 'Add Extra Input' : 'Add Input Batch'}
        </button>
      )}

      {/* Manual add form */}
      {showManualAdd && (
        <div className="p-4 bg-theme-surface-elevated border border-theme rounded-lg space-y-3">
          {/* Input type toggle */}
          <div className="flex bg-theme-surface rounded-lg p-1 border border-theme">
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
                  className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-sm text-theme-primary"
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
                  className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-sm text-theme-primary"
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
              className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-sm text-theme-primary"
              placeholder="0.000"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleManualAddInput}
              disabled={saving || !quantity || (inputType === 'stock' ? !selectedBatchId : !selectedReworkBatch)}
              className="px-4 py-2 bg-stockly-dark dark:bg-stockly text-white dark:text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={resetManualForm}
              className="px-4 py-2 border border-theme rounded-lg text-sm text-theme-secondary hover:bg-theme-surface-elevated"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
