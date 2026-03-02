// @salsa - SALSA Compliance: Manage input batches for production batch (with rework support)
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProductionBatchInput } from '@/lib/types/stockly';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import BatchSelector from '@/components/stockly/BatchSelector';
import { Trash2, Plus, AlertTriangle, RefreshCw, CheckCircle, ChefHat, Package, Info } from '@/components/ui/icons';
import { allergenKeyToLabel } from '@/lib/stockly/allergens';
import { convertQuantity } from '@/lib/utils/unitConversions';

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
  batchUnit?: string | null;
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
  batchUnit,
}: ProductionInputManagerProps) {
  // Scale factor: if batch planned_quantity differs from recipe yield, scale ingredients
  const scaleFactor = (plannedQuantity && recipeYieldQuantity && recipeYieldQuantity > 0)
    ? plannedQuantity / recipeYieldQuantity
    : 1;

  // Convert a scaled ingredient quantity to the batch unit for display
  const displayQty = (qty: number, ingredientUnit: string): { value: number; unit: string } => {
    if (!batchUnit || !ingredientUnit) return { value: qty, unit: ingredientUnit };
    const converted = convertQuantity(qty, ingredientUnit, batchUnit);
    return { value: converted.quantity, unit: converted.unit };
  };

  // --- Multi-allocation helpers ---
  const getIngredientAllocations = useCallback((ingredient: ResolvedRecipeIngredient): ProductionBatchInput[] => {
    if (!ingredient.stock_item_id) return [];
    return inputs.filter(input => input.stock_item_id === ingredient.stock_item_id);
  }, [inputs]);

  const getAllocatedTotal = useCallback((ingredient: ResolvedRecipeIngredient): number => {
    return getIngredientAllocations(ingredient).reduce(
      (sum, input) => sum + (input.actual_quantity || input.planned_quantity || 0), 0
    );
  }, [getIngredientAllocations]);

  const getNeededQty = useCallback((ingredient: ResolvedRecipeIngredient): { value: number; unit: string } => {
    const rawScaled = Math.round(ingredient.quantity * scaleFactor * 1000) / 1000;
    return displayQty(rawScaled, ingredient.unit);
   
  }, [scaleFactor, batchUnit]);

  const isFullyFulfilled = useCallback((ingredient: ResolvedRecipeIngredient): boolean => {
    if (!ingredient.stock_item_id) return false;
    const needed = getNeededQty(ingredient);
    return getAllocatedTotal(ingredient) >= needed.value;
  }, [getAllocatedTotal, getNeededQty]);

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stock on hand for items without batches
  const [stockLevelsMap, setStockLevelsMap] = useState<Map<string, number>>(new Map());

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

            // Initialise row states with remaining quantities (accounting for existing inputs)
            const initialRowStates = new Map<string, RowState>();
            resolved.forEach(ing => {
              if (!ing.is_sub_recipe && ing.stock_item_id) {
                const rawScaled = Math.round(ing.quantity * scaleFactor * 1000) / 1000;
                const display = displayQty(rawScaled, ing.unit);
                const allocatedTotal = inputs
                  .filter(input => input.stock_item_id === ing.stock_item_id)
                  .reduce((sum, input) => sum + (input.actual_quantity || input.planned_quantity || 0), 0);
                const remaining = Math.max(0, Math.round((display.value - allocatedTotal) * 1000) / 1000);
                initialRowStates.set(ing.ingredient_id, {
                  selectedBatchId: null,
                  quantity: remaining > 0 ? String(remaining) : '',
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

  // Recalculate pending quantities when inputs change (after add/delete)
  useEffect(() => {
    if (!resolvedIngredients.length) return;

    setRowStates(prev => {
      const next = new Map(prev);
      let changed = false;

      resolvedIngredients.forEach(ing => {
        if (ing.is_sub_recipe || !ing.stock_item_id) return;
        const current = next.get(ing.ingredient_id);
        // Only recalculate if no batch is selected (user isn't mid-edit)
        if (!current?.selectedBatchId) {
          const rawScaled = Math.round(ing.quantity * scaleFactor * 1000) / 1000;
          const display = displayQty(rawScaled, ing.unit);
          const allocatedTotal = inputs
            .filter(input => input.stock_item_id === ing.stock_item_id)
            .reduce((sum, input) => sum + (input.actual_quantity || input.planned_quantity || 0), 0);
          const remaining = Math.max(0, Math.round((display.value - allocatedTotal) * 1000) / 1000);
          const newQty = remaining > 0 ? String(remaining) : '';

          if (!current || current.quantity !== newQty) {
            next.set(ing.ingredient_id, { selectedBatchId: null, quantity: newQty });
            changed = true;
          }
        }
      });

      return changed ? next : prev;
    });
   
  }, [inputs]);

  // Fetch stock levels for ingredients (for no-batch display)
  useEffect(() => {
    if (!resolvedIngredients.length || !companyId) return;

    const stockItemIds = resolvedIngredients
      .filter(ing => ing.stock_item_id && !ing.is_sub_recipe)
      .map(ing => ing.stock_item_id!);

    if (stockItemIds.length === 0) return;

    async function fetchStockLevels() {
      try {
        let query = supabase
          .from('stock_levels')
          .select('stock_item_id, quantity')
          .in('stock_item_id', stockItemIds);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;
        if (error?.code === '42P01') return; // Table doesn't exist
        if (data) {
          const map = new Map<string, number>();
          data.forEach((sl: any) => {
            map.set(sl.stock_item_id, sl.quantity || 0);
          });
          setStockLevelsMap(map);
        }
      } catch {
        // Silently ignore
      }
    }
    fetchStockLevels();
  }, [resolvedIngredients, companyId, siteId]);

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
    setErrorMessage(null);
    try {
      // Use the display unit (what the user sees in the Qty label), not the stock_unit
      const rawScaled = Math.round(ingredient.quantity * scaleFactor * 1000) / 1000;
      const display = displayQty(rawScaled, ingredient.unit);

      const res = await fetch(`/api/stockly/production-batches/${productionBatchId}/inputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_batch_id: row.selectedBatchId,
          stock_item_id: ingredient.stock_item_id,
          actual_quantity: parseFloat(row.quantity),
          unit: display.unit || ingredient.unit || null,
        }),
      });
      if (res.ok) {
        // Reset pending state — remaining recalculates via inputs effect
        updateRowState(ingredient.ingredient_id, { selectedBatchId: null, quantity: '' });
        onUpdated();
      } else {
        const errBody = await res.json().catch(() => null);
        const msg = errBody?.error || `Failed to add input (${res.status})`;
        setErrorMessage(msg);
        console.error('Add input failed:', res.status, errBody);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error adding input');
    } finally {
      setAddingIngredient(null);
    }
  };

  // Bulk add all remaining recipe ingredients
  const handleAddAllRemaining = async () => {
    setAddingAll(true);
    try {
      for (const ingredient of resolvedIngredients) {
        if (isFullyFulfilled(ingredient)) continue;
        if (!ingredient.stock_item_id || ingredient.is_sub_recipe) continue;

        const row = rowStates.get(ingredient.ingredient_id);
        if (!row?.selectedBatchId || !row?.quantity) continue;

        const rawScaled = Math.round(ingredient.quantity * scaleFactor * 1000) / 1000;
        const display = displayQty(rawScaled, ingredient.unit);

        const res = await fetch(`/api/stockly/production-batches/${productionBatchId}/inputs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stock_batch_id: row.selectedBatchId,
            stock_item_id: ingredient.stock_item_id,
            actual_quantity: parseFloat(row.quantity),
            unit: display.unit || ingredient.unit || null,
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

  // --- Counts ---
  const trackableIngredients = resolvedIngredients.filter(
    ing => !ing.is_sub_recipe && ing.stock_item_id
  );
  const fulfilledCount = trackableIngredients.filter(ing => isFullyFulfilled(ing)).length;
  const unfufilledIngredients = trackableIngredients.filter(ing => !isFullyFulfilled(ing));
  const readyToAddCount = unfufilledIngredients.filter(ing => {
    const row = rowStates.get(ing.ingredient_id);
    return row?.selectedBatchId && row?.quantity;
  }).length;

  // Filter inputs: recipe ingredient allocations are shown inline, only show extras at the top
  const recipeStockItemIds = new Set(
    resolvedIngredients.filter(i => i.stock_item_id).map(i => i.stock_item_id!)
  );
  const nonRecipeInputs = recipeId && resolvedIngredients.length > 0
    ? inputs.filter(input => !recipeStockItemIds.has(input.stock_item_id))
    : inputs;

  return (
    <div className="space-y-4">
      {/* Non-recipe inputs list (extras, rework) */}
      {nonRecipeInputs.length > 0 && (
        <div className="space-y-2">
          {nonRecipeInputs.map(input => (
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
                ({fulfilledCount} of {trackableIngredients.length} fulfilled)
              </span>
              {scaleFactor !== 1 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {scaleFactor.toFixed(2)}x recipe
                </span>
              )}
            </div>
            {unfufilledIngredients.length > 0 && readyToAddCount > 0 && (
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
                    Add Selected ({readyToAddCount})
                  </>
                )}
              </button>
            )}
          </div>

          {/* Error banner */}
          {errorMessage && (
            <div className="mx-4 mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
                <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600 text-xs ml-2">dismiss</button>
              </div>
            </div>
          )}

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
                const allocations = getIngredientAllocations(ingredient);
                const allocatedTotal = getAllocatedTotal(ingredient);
                const row = rowStates.get(ingredient.ingredient_id);
                const rawScaled = Math.round(ingredient.quantity * scaleFactor * 1000) / 1000;
                const display = displayQty(rawScaled, ingredient.unit);
                const needed = display.value;
                const fulfilled = allocatedTotal >= needed;
                const remaining = Math.max(0, Math.round((needed - allocatedTotal) * 1000) / 1000);
                const stockOnHand = ingredient.stock_item_id ? stockLevelsMap.get(ingredient.stock_item_id) : undefined;

                // Sub-recipe row
                if (ingredient.is_sub_recipe) {
                  return (
                    <div key={ingredient.ingredient_id} className="px-4 py-3 bg-theme-surface">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-theme-secondary">{ingredient.sub_recipe_name || ingredient.ingredient_name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Sub-recipe
                        </span>
                        <span className="text-xs text-theme-tertiary ml-auto">{display.value} {display.unit}</span>
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
                        <span className="text-xs text-theme-tertiary ml-auto">{display.value} {display.unit}</span>
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Not set up as a stock item — add it in Stock Items to track batches
                      </p>
                    </div>
                  );
                }

                // --- Fully fulfilled ---
                if (fulfilled && allocations.length > 0) {
                  return (
                    <div key={ingredient.ingredient_id} className="px-4 py-3 bg-emerald-50/50 dark:bg-emerald-900/5">
                      {/* Header */}
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
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
                          Total: {allocatedTotal} {display.unit}
                        </span>
                      </div>
                      {/* Allocation sub-rows */}
                      <div className="mt-2 ml-6 space-y-1">
                        {allocations.map(alloc => (
                          <div key={alloc.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-mono text-theme-tertiary">{alloc.stock_batch?.batch_code || '—'}</span>
                              <span className="text-theme-secondary">
                                {alloc.actual_quantity || alloc.planned_quantity} {alloc.unit || display.unit}
                              </span>
                              {alloc.stock_batch?.allergens && alloc.stock_batch.allergens.length > 0 && (
                                <div className="flex gap-0.5">
                                  {alloc.stock_batch.allergens.map((a: string) => (
                                    <span key={a} className="px-1 py-0.5 rounded text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                      {allergenKeyToLabel(a)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {isEditable && (
                              <button
                                onClick={() => handleRemoveInput(alloc.id)}
                                disabled={deleting === alloc.id}
                                className="p-1 text-red-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        {allocations.length > 1 && (
                          <p className="text-[10px] text-theme-tertiary">{allocations.length} batches</p>
                        )}
                      </div>
                    </div>
                  );
                }

                // --- Partially fulfilled or not started ---
                return (
                  <div key={ingredient.ingredient_id} className="px-4 py-3 bg-theme-surface space-y-2">
                    {/* Ingredient header */}
                    <div className="flex items-center gap-2">
                      {allocations.length > 0 ? (
                        <div className="w-4 h-4 rounded-full border-2 border-amber-400 flex-shrink-0" />
                      ) : (
                        <Package className="w-4 h-4 text-stockly-dark dark:text-stockly flex-shrink-0" />
                      )}
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
                        Need: {needed} {display.unit}
                        {scaleFactor !== 1 && (
                          <span className="text-theme-tertiary/60 ml-1">(recipe: {ingredient.quantity} {ingredient.unit})</span>
                        )}
                      </span>
                    </div>

                    {/* Existing allocations (partially fulfilled) */}
                    {allocations.length > 0 && (
                      <div className="ml-6 space-y-1">
                        {allocations.map(alloc => (
                          <div key={alloc.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs">
                              <CheckCircle className="w-3 h-3 text-emerald-500" />
                              <span className="font-mono text-theme-tertiary">{alloc.stock_batch?.batch_code || '—'}</span>
                              <span className="text-theme-secondary">
                                {alloc.actual_quantity || alloc.planned_quantity} {alloc.unit || display.unit}
                              </span>
                            </div>
                            {isEditable && (
                              <button
                                onClick={() => handleRemoveInput(alloc.id)}
                                disabled={deleting === alloc.id}
                                className="p-1 text-red-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Added: {allocatedTotal} / {needed} {display.unit} · {remaining} {display.unit} remaining
                        </p>
                      </div>
                    )}

                    {/* Stock on hand hint (when no batches available) */}
                    {stockOnHand !== undefined && stockOnHand > 0 && allocations.length === 0 && (
                      <div className="flex items-center gap-1.5 ml-6 text-xs text-theme-tertiary">
                        <Info className="w-3.5 h-3.5" />
                        Stock on hand: {stockOnHand} {ingredient.stock_unit || display.unit}
                      </div>
                    )}

                    {/* Batch selector + quantity + add button */}
                    <div className="flex items-end gap-2">
                      <div className="flex-1 min-w-0">
                        <BatchSelector
                          key={`${ingredient.stock_item_id}-${allocations.length}`}
                          stockItemId={ingredient.stock_item_id}
                          selectedBatchId={row?.selectedBatchId || null}
                          onSelect={(batchId) => updateRowState(ingredient.ingredient_id, { selectedBatchId: batchId })}
                        />
                      </div>
                      <div className="w-28 flex-shrink-0">
                        <label className="block text-xs font-medium text-theme-secondary mb-1">
                          Qty <span className="font-normal text-theme-tertiary">({display.unit})</span>
                        </label>
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
                        {addingIngredient === ingredient.ingredient_id ? '...' : allocations.length > 0 ? '+ Add' : 'Add'}
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
