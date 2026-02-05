"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Save, X, Edit, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import debounce from 'lodash/debounce';
import { formatUnitCost } from '@/lib/utils/libraryHelpers';

interface RecipeIngredient {
  id?: string;
  recipe_id: string;
  ingredient_id: string | null;
  sub_recipe_id?: string | null;
  quantity: number;
  unit_id: string | null;  // UUID reference to uom table
  sort_order?: number;      // Changed from display_order
  line_cost?: number;
  
  // Display-only fields (from JOINs)
  ingredient_name?: string;
  supplier?: string;
  ingredient_unit_cost?: number;
  pack_cost?: number;
  pack_size?: number | string;
  yield_percent?: number;
  unit_abbreviation?: string;
  unit_name?: string;
  is_prep_item?: boolean;
  allergens?: string[];
  is_sub_recipe?: boolean;
  linked_recipe_id?: string | null;
}

interface RecipeIngredientsTableProps {
  recipeId: string;
  companyId: string;
  isEditing: boolean;
  onRecipeUpdate?: () => void; // Callback to refresh recipe data
  yieldQty?: number | null; // Recipe yield quantity
  yieldUnit?: string | null; // Recipe yield unit
  uomList?: Array<{ id: string; name: string; abbreviation: string; base_multiplier?: number; unit_type?: string }>; // UOM units for conversion
  onYieldCalculated?: (calculatedYield: number) => void; // Callback when yield is calculated
  isExpanded?: boolean; // Whether the parent card is expanded
}

export function RecipeIngredientsTable({
  recipeId,
  companyId,
  isEditing,
  onRecipeUpdate,
  yieldQty,
  yieldUnit,
  uomList = [],
  onYieldCalculated,
  isExpanded = true
}: RecipeIngredientsTableProps) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableIngredients, setAvailableIngredients] = useState<any[]>([]);
  const [loadingAvailableIngredients, setLoadingAvailableIngredients] = useState(false);
  const [availableIngredientsError, setAvailableIngredientsError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<RecipeIngredient> | null>(null);
  const [searchQueries, setSearchQueries] = useState<{ [key: string]: string }>({});
  const [showSearchDropdown, setShowSearchDropdown] = useState<{ [key: string]: boolean }>({});
  const [dropdownPosition, setDropdownPosition] = useState<{ [key: string]: { top: number; left: number; width: number } }>({});
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [mounted, setMounted] = useState(false);
  const [calculatedYield, setCalculatedYield] = useState<number | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Map<string, 'new' | 'modified' | 'deleted'>>(new Map());
  const [isSavingAll, setIsSavingAll] = useState(false);
  const loadControllerRef = useRef<AbortController | null>(null);
  const availableIngredientsLoadedRef = useRef(false);
  const loadingAvailableIngredientsRef = useRef(false);

  // Derived state for UI - check both pendingChanges AND temp rows with valid data
  const hasUnsavedChanges = useMemo(() => {
    // Check if there are pending changes in the Map
    if (pendingChanges.size > 0) return true;

    // Also check for temp rows with valid data (ingredient_id, quantity > 0, unit_id)
    // This handles auto-initialized rows that weren't added to pendingChanges
    const tempRowsWithData = ingredients.filter(ing =>
      ing.id?.startsWith('temp-') &&
      ing.ingredient_id &&
      parseFloat(String(ing.quantity || 0)) > 0 &&
      ing.unit_id
    );
    return tempRowsWithData.length > 0;
  }, [pendingChanges, ingredients]);

  const unsavedCount = useMemo(() => {
    // Count pending changes
    let count = pendingChanges.size;

    // Also count temp rows with valid data that aren't already in pendingChanges
    ingredients.forEach(ing => {
      if (ing.id?.startsWith('temp-') &&
          !pendingChanges.has(ing.id) &&
          ing.ingredient_id &&
          parseFloat(String(ing.quantity || 0)) > 0 &&
          ing.unit_id) {
        count++;
      }
    });

    return count;
  }, [pendingChanges, ingredients]);

  // Load available ingredients - MUST be defined before any useEffect that uses it
  const loadAvailableIngredients = useCallback(async (retryCount = 0) => {
    if (!companyId) {
      console.warn('⚠️ Cannot load available ingredients: no companyId');
      setAvailableIngredientsError('No company ID available');
      return;
    }
    
    // Prevent multiple simultaneous loads using ref
    if (loadingAvailableIngredientsRef.current) {
      console.log('⏸️ Already loading available ingredients, skipping...');
      return;
    }
    
    loadingAvailableIngredientsRef.current = true;
    setLoadingAvailableIngredients(true);
    setAvailableIngredientsError(null);
    
    try {
      console.log('🔍 Loading available ingredients from library for company:', companyId, `(attempt ${retryCount + 1})`);
      const { data, error } = await supabase
        .from('ingredients_library')
        .select('id, ingredient_name, supplier, unit_cost, pack_cost, pack_size, yield_percent, unit, base_unit_id, is_prep_item, linked_recipe_id')
        .eq('company_id', companyId)
        .order('ingredient_name')
        .limit(1000); // Limit to prevent loading too many at once

      if (error) {
        console.error('❌ Error loading available ingredients:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        setAvailableIngredientsError(error.message || 'Failed to load ingredients');
        setAvailableIngredients([]);
        
        // Retry once if it's a network error
        if (retryCount === 0 && (error.message?.includes('network') || error.message?.includes('fetch'))) {
          console.log('🔄 Retrying load available ingredients...');
          loadingAvailableIngredientsRef.current = false;
          setTimeout(() => loadAvailableIngredients(1), 1000);
          return;
        }
        
        // Only show toast on final failure
        if (retryCount > 0) {
          toast.error(`Failed to load ingredients library: ${error.message}`);
        }
        return;
      }
      
      if (!data || data.length === 0) {
        console.warn('⚠️ No ingredients found in library for company:', companyId);
        setAvailableIngredients([]);
        setAvailableIngredientsError('No ingredients found in library');
        return;
      }
      
      console.log('✅ Loaded', data.length, 'ingredients from library');
      
      // Calculate unit_cost from pack_cost/pack_size/yield_percent for each ingredient
      const ingredientsWithCalculatedCosts = (data || []).map((ingredient: any) => {
        const packCost = parseFloat(ingredient.pack_cost || 0);
        const packSize = parseFloat(ingredient.pack_size || 0);
        const yieldPercent = parseFloat(ingredient.yield_percent || 100);
        
        // Calculate unit cost from pack_cost / (pack_size * yield_percent/100) if both are present
        let calculatedUnitCost: number | null = null;
        if (packCost > 0 && packSize > 0) {
          const effectivePackSize = packSize * (yieldPercent / 100);
          if (effectivePackSize > 0) {
            calculatedUnitCost = packCost / effectivePackSize;
          }
        }
        
        // Use calculated cost if available, otherwise use stored unit_cost
        return {
          ...ingredient,
          unit_cost: calculatedUnitCost || ingredient.unit_cost || 0
        };
      });
      
      setAvailableIngredients(ingredientsWithCalculatedCosts);
      setAvailableIngredientsError(null);
      availableIngredientsLoadedRef.current = true;
      console.log('✅ Available ingredients set:', ingredientsWithCalculatedCosts.length);
      console.log('📋 Sample ingredients:', ingredientsWithCalculatedCosts.slice(0, 3).map(i => i.ingredient_name));
    } catch (error: any) {
      console.error('❌ Exception loading available ingredients:', error);
      setAvailableIngredientsError(error.message || 'Unexpected error loading ingredients');
      setAvailableIngredients([]);
      
      // Retry once for unexpected errors
      if (retryCount === 0) {
        console.log('🔄 Retrying after exception...');
        loadingAvailableIngredientsRef.current = false;
        setTimeout(() => loadAvailableIngredients(1), 1000);
        return;
      }
      
      toast.error('Failed to load ingredients library');
    } finally {
      loadingAvailableIngredientsRef.current = false;
      setLoadingAvailableIngredients(false);
    }
  }, [companyId]); // Only depend on companyId

  useEffect(() => {
    setMounted(true);
  }, []);

  // Warn about unsaved changes when navigating away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Convert quantity from one unit to another using UOM data
  // Accepts unit_id (UUID) or unit_abbreviation (string) for fromUnit
  // Memoized to prevent recreation on every render
  const convertUnit = useCallback((quantity: number, fromUnit: string | null | undefined, toUnitId: string | null | undefined): number => {
    if (!fromUnit || !toUnitId) return quantity;
    
    // Find UOM entry for fromUnit (could be UUID, abbreviation, or name)
    let fromUOM = uomList.find(u => 
      u.id === fromUnit ||
      u.abbreviation?.toLowerCase() === fromUnit.toLowerCase() ||
      u.name?.toLowerCase() === fromUnit.toLowerCase()
    );
    
    // Find UOM entry for toUnit (should be a UOM ID)
    const toUOM = uomList.find(u => u.id === toUnitId);
    
    // If we can't find UOM entries, try simple conversions using abbreviations
    if (!fromUOM || !toUOM) {
      const toUnitAbbr = toUOM?.abbreviation?.toLowerCase() || '';
      const fromUnitLower = fromUnit.toLowerCase();
      
      // Simple weight conversions (mg <-> g <-> kg)
      if (fromUnitLower === 'mg' && toUnitAbbr === 'g') return quantity / 1000;
      if (fromUnitLower === 'g' && toUnitAbbr === 'mg') return quantity * 1000;
      if (fromUnitLower === 'mg' && toUnitAbbr === 'kg') return quantity / 1000000;
      if (fromUnitLower === 'kg' && toUnitAbbr === 'mg') return quantity * 1000000;
      if (fromUnitLower === 'g' && toUnitAbbr === 'kg') return quantity / 1000;
      if (fromUnitLower === 'kg' && toUnitAbbr === 'g') return quantity * 1000;
      // Simple volume conversions (ml <-> L)
      if (fromUnitLower === 'ml' && (toUnitAbbr === 'l' || toUnitAbbr === 'litre')) return quantity / 1000;
      if ((fromUnitLower === 'l' || fromUnitLower === 'litre') && toUnitAbbr === 'ml') return quantity * 1000;
      // If units are the same, return as-is
      if (fromUnitLower === toUnitAbbr) return quantity;
      // If we can't convert, return as-is
      console.warn(`Cannot convert from ${fromUnit} to ${toUnitId} - UOM data not found`);
      return quantity;
    }
    
    // Check if units are compatible (same unit_type)
    if (fromUOM.unit_type && toUOM.unit_type && fromUOM.unit_type !== toUOM.unit_type) {
      console.warn(`Cannot convert between ${fromUOM.unit_type} and ${toUOM.unit_type}`);
      return quantity;
    }
    
    // Convert: quantity * from_multiplier / to_multiplier
    const fromMultiplier = fromUOM.base_multiplier || 1;
    const toMultiplier = toUOM.base_multiplier || 1;
    
    if (toMultiplier === 0) return quantity;
    
    return (quantity * fromMultiplier) / toMultiplier;
  }, [uomList]);

  // Calculate yield from all ingredients, converting to recipe's yield unit
  // Memoized to prevent recalculation on every render
  const calculateYield = useCallback((currentIngredients: RecipeIngredient[]): number => {
    if (!yieldUnit || currentIngredients.length === 0) {
      // If no yield unit set, just sum quantities (legacy behavior)
      return currentIngredients.reduce((sum, ing) => {
        const qty = parseFloat(String(ing.quantity || 0));
        return sum + qty;
      }, 0);
    }
    
    // Convert all ingredient quantities to the recipe's yield unit and sum
    return currentIngredients.reduce((sum, ing) => {
      const qty = parseFloat(String(ing.quantity || 0));
      if (!qty || !ing.unit_id) return sum;
      
      // Convert ingredient quantity to recipe's yield unit using unit_id
      const convertedQty = convertUnit(qty, ing.unit_id, yieldUnit);
      return sum + convertedQty;
    }, 0);
  }, [yieldUnit, convertUnit]);

  // Memoize calculated yield to prevent unnecessary recalculations
  // Use a ref to track previous value and only update if changed significantly
  const prevYieldRef = useRef<number | null>(null);
  const calculatedYieldValue = useMemo(() => {
    if (ingredients.length === 0) {
      return 0;
    }
    return calculateYield(ingredients);
  }, [ingredients, calculateYield]);

  // Update calculated yield state and notify parent (debounced to prevent excessive updates)
  useEffect(() => {
    // Only update if value changed significantly (more than 0.01 difference)
    const hasChanged = prevYieldRef.current === null || 
      Math.abs(calculatedYieldValue - prevYieldRef.current) > 0.01;
    
    if (hasChanged) {
      prevYieldRef.current = calculatedYieldValue;
      setCalculatedYield(calculatedYieldValue);
      
      // Use requestAnimationFrame to defer callback and prevent blocking main thread
      const rafId = requestAnimationFrame(() => {
        if (onYieldCalculated) {
          onYieldCalculated(calculatedYieldValue);
        }
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [calculatedYieldValue, onYieldCalculated]);

  // Memoize loadIngredients to prevent recreation on every render
  // Use a ref to track loading state to prevent dependency loop
  const isLoadingRef = useRef(false);
  
  const loadIngredients = useCallback(async () => {
    if (!recipeId || isLoadingRef.current) return; // Prevent concurrent loads
    
    // Cancel previous request if still pending
    if (loadControllerRef.current) {
      loadControllerRef.current.abort();
    }
    
    // Create new AbortController for this request
    const controller = new AbortController();
    loadControllerRef.current = controller;
    
    isLoadingRef.current = true;
    setLoading(true);
    
    try {
      console.log('🔍 Loading ingredients for recipe:', recipeId);
      // Use selective fields instead of SELECT * for better performance
      const { data, error } = await supabase
        .from('recipe_ingredients')  // This is the public view with JOINs
        .select(`
          id,
          recipe_id,
          ingredient_id,
          sub_recipe_id,
          quantity,
          unit_id,
          sort_order,
          line_cost,
          ingredient_name,
          supplier,
          ingredient_unit_cost,
          pack_cost,
          pack_size,
          yield_percent,
          unit_abbreviation,
          unit_name,
          is_prep_item,
          allergens
        `)
        .eq('recipe_id', recipeId)
        .order('sort_order', { ascending: true, nullsFirst: true })
        .abortSignal(controller.signal);

      // Check if request was aborted
      if (controller.signal.aborted) {
        return;
      }

      if (error) {
        console.error('❌ Error loading ingredients:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        setIngredients([]);
        return;
      }

      console.log('✅ Ingredients loaded:', data?.length || 0, 'ingredients');
      
      // Check for missing cost data
      if (data && data.length > 0) {
        const ingredientsWithNoCost = data.filter((ing: RecipeIngredient) => {
          const hasUnitCost = ing.ingredient_unit_cost && ing.ingredient_unit_cost > 0;
          const packSize = parseFloat(String(ing.pack_size || '0'));
          const hasPackData = ing.pack_cost && packSize > 0;
          return !hasUnitCost && !hasPackData;
        });

        if (ingredientsWithNoCost.length > 0) {
          console.warn('⚠️ Ingredients with no cost data:', ingredientsWithNoCost.map((i: RecipeIngredient) => i.ingredient_name));
          toast.warning(`${ingredientsWithNoCost.length} ingredient(s) have no cost data`);
        }
        
        console.log('📋 Sample ingredient:', {
          id: data[0].id,
          ingredient_name: data[0].ingredient_name,
          quantity: data[0].quantity,
          unit_abbreviation: data[0].unit_abbreviation,
          ingredient_id: data[0].ingredient_id,
          line_cost: data[0].line_cost,
          ingredient_unit_cost: data[0].ingredient_unit_cost,
          pack_cost: data[0].pack_cost,
          pack_size: data[0].pack_size
        });
      } else {
        // Only log warning if we've actually tried to load (not on initial mount with no data)
        // This prevents spam when user is just starting to add ingredients
        if (hasLoadedIngredientsRef.current) {
          console.warn('⚠️ No ingredients found for recipe:', recipeId);
          console.log('💡 This could mean:');
          console.log('   1. No ingredients have been added to this recipe yet');
          console.log('   2. Ingredients were not saved properly');
          console.log('   3. There is a view/permission issue');
        } else {
          // First load - just log info, not warning
          console.log('ℹ️ No ingredients found yet for recipe:', recipeId, '- ready to add ingredients');
        }
      }

      // Data from view already includes joined fields (ingredient_name, supplier, unit_abbreviation, etc.)
      setIngredients((data || []) as RecipeIngredient[]);
    } catch (err: any) {
      // Ignore AbortError - it's expected when cancelling requests
      if (err.name !== 'AbortError') {
        console.error('❌ Exception loading ingredients:', err);
        setIngredients([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        isLoadingRef.current = false;
        setLoading(false);
      }
    }
  }, [recipeId]); // Only depend on recipeId - use ref for loading state


  // Load ingredients when recipeId changes
  // Note: Component remounts when recipe changes (due to key prop in parent),
  // so we don't need expansion-specific loading logic
  useEffect(() => {
    if (recipeId && !isLoadingRef.current) {
      console.log('🔄 RecipeIngredientsTable: recipeId changed, loading ingredients for:', recipeId);
      loadIngredients();
    }
  }, [recipeId, loadIngredients]);
  
  // Also reload ingredients when isEditing changes to false (after save)
  // This ensures ingredients are reloaded after recipe save completes
  useEffect(() => {
    if (!isEditing && recipeId && !isLoadingRef.current && hasLoadedIngredientsRef.current) {
      console.log('🔄 RecipeIngredientsTable: Editing ended, reloading ingredients for:', recipeId);
      // Clear pending changes when exiting edit mode
      setPendingChanges(new Map());
      // Small delay to ensure database has updated
      const timeoutId = setTimeout(() => {
        loadIngredients();
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [isEditing, recipeId, loadIngredients]);

  // Real-time subscription for ingredient price updates
  useEffect(() => {
    if (!companyId || !recipeId) return;

    const channel = supabase
      .channel(`recipe-ingredients-price-updates-${recipeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ingredients_library',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('Ingredient price updated in real-time:', payload);
          // Check if price-related fields changed
          const oldData = payload.old as any;
          const newData = payload.new as any;
          
          const priceChanged = 
            oldData.unit_cost !== newData.unit_cost ||
            oldData.pack_cost !== newData.pack_cost ||
            oldData.pack_size !== newData.pack_size ||
            oldData.yield_percent !== newData.yield_percent;
          
          if (priceChanged) {
            console.log('Price change detected, reloading recipe ingredients...');
            // Reload ingredients to get updated prices
            loadIngredients();
            // Notify parent to recalculate recipe cost
            if (onRecipeUpdate) {
              onRecipeUpdate();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'stockly',
          table: 'recipes',
          filter: `id=eq.${recipeId}`,
        },
        (payload) => {
          console.log('Recipe cost updated in real-time:', payload);
          // Reload ingredients to get updated recipe cost data
          loadIngredients();
          // Notify parent to refresh recipe data
          if (onRecipeUpdate) {
            onRecipeUpdate();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, recipeId, loadIngredients, onRecipeUpdate]);

  // Load available ingredients when companyId changes or component mounts
  useEffect(() => {
    if (companyId && !loadingAvailableIngredientsRef.current) {
      // Always try to load if we don't have ingredients yet, or if we haven't marked as loaded
      if (!availableIngredientsLoadedRef.current || availableIngredients.length === 0) {
        console.log('🔄 useEffect: Loading available ingredients - companyId:', companyId);
        loadAvailableIngredients();
      } else {
        console.log('✅ Ingredients already loaded:', availableIngredients.length);
      }
    } else if (!companyId) {
      console.warn('⚠️ Cannot load ingredients: no companyId');
    } else if (loadingAvailableIngredientsRef.current) {
      console.log('⏸️ Already loading ingredients, skipping...');
    }
  }, [companyId, loadAvailableIngredients]); // Include loadAvailableIngredients but it's stable
  
  // Also load when editing starts if ingredients aren't loaded yet (safeguard)
  useEffect(() => {
    if (isEditing && companyId && availableIngredients.length === 0 && !loadingAvailableIngredientsRef.current) {
      console.log('🔄 Loading available ingredients when editing starts (safeguard)');
      loadAvailableIngredients();
    }
  }, [isEditing, companyId, availableIngredients.length, loadAvailableIngredients]);

  // Track if we've successfully loaded ingredients at least once for this recipe
  const hasLoadedIngredientsRef = useRef(false);
  const lastRecipeIdRef = useRef<string | null>(null);
  
  // Reset the flag when recipeId changes
  useEffect(() => {
    if (recipeId !== lastRecipeIdRef.current) {
      hasLoadedIngredientsRef.current = false;
      lastRecipeIdRef.current = recipeId;
    }
  }, [recipeId]);
  
  // Mark that we've loaded ingredients after a successful load
  useEffect(() => {
    if (!loading && !isLoadingRef.current && recipeId) {
      hasLoadedIngredientsRef.current = true;
    }
  }, [loading, recipeId]);

  // Initialize with empty rows when editing and no ingredients
  // BUT: Only if we've finished loading and confirmed there are no ingredients in the database
  useEffect(() => {
    // Only initialize empty rows if:
    // 1. We're editing
    // 2. We have no ingredients
    // 3. We're not currently loading
    // 4. We've successfully loaded ingredients at least once (to avoid clearing ingredients that are still loading)
    // 5. Available ingredients are loaded
    if (isEditing && 
        ingredients.length === 0 && 
        !loading && 
        !isLoadingRef.current &&
        hasLoadedIngredientsRef.current && 
        availableIngredients.length > 0) {
      const emptyRows: RecipeIngredient[] = Array.from({ length: 3 }, (_, i) => ({
        id: `temp-init-${Date.now()}-${i}`,
        recipe_id: recipeId,
        ingredient_id: null,
        ingredient_name: '',
        supplier: '',
        quantity: 0,
        unit_id: null,
        ingredient_unit_cost: 0,
        is_sub_recipe: false,
        linked_recipe_id: null
      }));
      setIngredients(emptyRows);
      // Automatically start editing the first empty row
      if (emptyRows.length > 0 && !editingId) {
        setEditingId(emptyRows[0].id);
        setDraft({ ...emptyRows[0] });
        setSearchQueries(prev => ({ ...prev, [emptyRows[0].id]: '' }));
      }
    }
  }, [isEditing, ingredients.length, loading, availableIngredients.length, recipeId, editingId]);

  const handleAdd = () => {
    const tempId = `temp-${Date.now()}`;
    const newIngredient: Partial<RecipeIngredient> = {
      id: tempId,
      recipe_id: recipeId,
      ingredient_id: null,
      quantity: 0,
      unit_id: null,
      ingredient_unit_cost: 0
    };
    setIngredients(prev => [...prev, newIngredient as RecipeIngredient]);

    // Mark as pending new
    setPendingChanges(prev => new Map(prev).set(tempId, 'new'));

    // Start editing this row
    setEditingId(tempId);
    setDraft(newIngredient);
  };

  // Mark rows as modified when edited
  const markAsModified = useCallback((ingredientId: string) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      // For temp rows (including auto-initialized ones): mark as 'new' if not already tracked
      if (ingredientId.startsWith('temp-')) {
        if (!next.has(ingredientId)) {
          next.set(ingredientId, 'new');
        }
        // If already marked as 'new', keep it that way
      } else {
        // For existing rows: mark as 'modified' if not already marked as 'new'
        if (!next.has(ingredientId) || next.get(ingredientId) !== 'new') {
          next.set(ingredientId, 'modified');
        }
      }
      return next;
    });
  }, []);

  const handleEdit = (ingredient: RecipeIngredient) => {
    setEditingId(ingredient.id);
    setDraft({ ...ingredient });
    setSearchQueries(prev => ({ ...prev, [ingredient.id]: ingredient.ingredient_name || '' }));
  };

  // Calculate total yield from all ingredient quantities and update recipe
  const updateRecipeYield = async (currentIngredients: RecipeIngredient[]) => {
    try {
      // Calculate total yield converting all quantities to recipe's yield unit
      const totalYield = calculateYield(currentIngredients);

      // Update recipe's yield_qty
      const { error } = await supabase
        .from('recipes')
        .update({ yield_qty: totalYield })
        .eq('id', recipeId);

      if (error) {
        console.warn('Error updating recipe yield:', error);
        // Don't throw - this is a background update
      } else {
        // Update local calculated yield
        setCalculatedYield(totalYield);
        // Notify parent to refresh recipe data
        if (onRecipeUpdate) {
          onRecipeUpdate();
        }
      }
    } catch (err) {
      console.warn('Exception updating recipe yield:', err);
      // Don't throw - this is a background update
    }
  };

  const handleSave = async (ingredient: RecipeIngredient) => {
    // Get the current ingredient from the list (most up-to-date)
    const currentIngredient = ingredients.find(ing => ing.id === ingredient.id);
    
    // Use draft if we're actively editing this row, otherwise use current ingredient data
    const dataToSave = (draft && editingId === ingredient.id) 
      ? { ...currentIngredient, ...draft }
      : (currentIngredient || ingredient);
    
    // IMMEDIATE: Validate quickly before optimistic update
    if (!dataToSave.ingredient_id) {
      toast.error('Please select an ingredient');
      return;
    }

    const quantity = parseFloat(String(dataToSave.quantity || '0'));
    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (!dataToSave.unit_id) {
      toast.error('Please select a unit');
      return;
    }

    // Generate temp ID for optimistic update
    const tempId = ingredient.id || `temp-${Date.now()}`;
    const isNewIngredient = !ingredient.id || ingredient.id.toString().startsWith('temp-') || ingredient.id.toString().startsWith('temp-init-');
    
    // IMMEDIATE: Optimistically update UI (< 16ms)
    setIngredients(prev => {
      const exists = prev.find(i => i.id === ingredient.id);
      if (exists) {
        return prev.map(i => 
          i.id === ingredient.id 
            ? { ...i, ...dataToSave, id: tempId, _isSaving: true } 
            : i
        );
      } else {
        return [...prev, { ...dataToSave, id: tempId, _isSaving: true } as RecipeIngredient];
      }
    });

    // Show immediate feedback
    const toastId = `save-${tempId}`;
    toast.loading('Saving...', { id: toastId });

    // Show loading indicator for this specific row
    setSavingIds(prev => new Set([...prev, tempId]));

    // BACKGROUND: Do heavy work asynchronously
    try {
      console.group('🔍 SAVE INGREDIENT DEBUG');
      console.log('1. Ingredient being saved:', ingredient);
      console.log('2. Parsed quantity:', quantity);
      
      // CRITICAL: Fetch ingredient with ALL cost-related fields
      console.log('3. Fetching ingredient details for:', dataToSave.ingredient_id);
      
      const { data: ingredientData, error: fetchError } = await supabase
        .from('ingredients_library')
        .select('unit_cost, pack_cost, pack_size, yield_percent, ingredient_name')
        .eq('id', dataToSave.ingredient_id)
        .single();

      console.log('4. Fetched ingredient data:', ingredientData);
      
      if (fetchError) {
        console.error('❌ Error fetching ingredient:', fetchError);
        console.groupEnd();
        throw new Error('Failed to fetch ingredient details');
      }

      if (!ingredientData) {
        console.error('❌ Ingredient not found in database');
        console.groupEnd();
        throw new Error('Ingredient not found');
      }

      // CRITICAL: Calculate unit_cost if not set
      let unitCost = ingredientData.unit_cost;
      
      console.log('5. Raw unit_cost from database:', unitCost);
      
      // If unit_cost is 0 or null, calculate from pack_cost/pack_size
      if (!unitCost || unitCost === 0) {
        const packSize = parseFloat(String(ingredientData.pack_size || '0'));
        if (ingredientData.pack_cost && packSize > 0) {
          unitCost = ingredientData.pack_cost / packSize;
          console.log('6. Calculated unit_cost from pack:', {
            pack_cost: ingredientData.pack_cost,
            pack_size: packSize,
            calculated_unit_cost: unitCost
          });
        } else {
          console.error('❌ Cannot calculate unit_cost - missing pack data:', {
            pack_cost: ingredientData.pack_cost,
            pack_size: ingredientData.pack_size
          });
          console.groupEnd();
          throw new Error(`${ingredientData.ingredient_name || 'Ingredient'} has no cost data. Please set pack cost and size first.`);
        }
      }

      const yieldPercent = ingredientData.yield_percent || 100;
      console.log('7. Yield percent:', yieldPercent);

      // Calculate line cost with yield factor
      const lineCost = (unitCost * quantity) / (yieldPercent / 100);
      console.log('8. Calculated line_cost:', {
        unit_cost: unitCost,
        quantity: quantity,
        yield_percent: yieldPercent,
        line_cost: lineCost
      });

      if (!lineCost || lineCost === 0) {
        console.error('⚠️ WARNING: line_cost is 0!');
      }

      // Prepare payload - use view (triggers handle routing to base table)
      const payload: any = {
        recipe_id: recipeId,
        ingredient_id: dataToSave.ingredient_id,
        quantity: quantity,
        unit_id: dataToSave.unit_id,  // UUID, not string!
        line_cost: lineCost,
        sort_order: dataToSave.sort_order || ingredients.length,
        company_id: companyId,
      };

      console.log('9. Payload to save:', {
        recipe_id: recipeId,
        ingredient_id: dataToSave.ingredient_id,
        quantity: quantity,
        unit_id: dataToSave.unit_id,
        line_cost: lineCost,
        unit_cost: unitCost,
        yield_percent: yieldPercent,
        isUpdate: !isNewIngredient
      });

      let data, error;
      if (!isNewIngredient && ingredient.id) {
        // Update existing
        console.log('🔄 Updating existing ingredient:', ingredient.id);
        ({ data, error } = await supabase
          .from('recipe_ingredients')
          .update(payload)
          .eq('id', ingredient.id)
          .select()
          .single());
      } else {
        // Insert new - don't include id, let DB generate it
        console.log('➕ Inserting new ingredient');
        const insertPayload = { ...payload };
        delete insertPayload.id;
        ({ data, error } = await supabase
          .from('recipe_ingredients')
          .insert(insertPayload)
          .select()
          .single());
      }

      if (error) {
        console.error('❌ Save error:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          payload
        });
        console.groupEnd();
        throw error;
      }

      if (!data) {
        console.error('❌ Save succeeded but no data returned');
        console.groupEnd();
        throw new Error('Ingredient saved but failed to retrieve saved data');
      }

      console.log('10. Saved data returned:', data);
      
      if (!data.line_cost || data.line_cost === 0) {
        console.error('⚠️ WARNING: line_cost is null/undefined/0 after save!', {
          saved_line_cost: data.line_cost,
          expected_line_cost: lineCost,
          ingredient_id: data.ingredient_id
        });
      } else {
        console.log('✅ line_cost saved successfully:', data.line_cost);
      }
      
      console.groupEnd();

      // Update with real data from database (remove _isSaving flag)
      setIngredients(prev => prev.map(i => 
        i.id === tempId ? { ...data, _isSaving: undefined } as RecipeIngredient : i
      ));

      toast.success('Ingredient saved', { id: toastId });

      // Reload in background to get full joined data (non-blocking)
      loadIngredients();
      
      // Notify parent to refresh recipe data (non-blocking)
      if (onRecipeUpdate) {
        requestAnimationFrame(() => {
          onRecipeUpdate();
        });
      }
    } catch (err: any) {
      // Revert optimistic update on error
      setIngredients(prev => {
        if (isNewIngredient) {
          // Remove the new ingredient
          return prev.filter(i => i.id !== tempId);
        } else {
          // Restore original ingredient
          return prev.map(i => 
            i.id === tempId ? { ...currentIngredient, _isSaving: undefined } as RecipeIngredient : i
          );
        }
      });
      
      const errorMessage = err.message || 'Failed to save ingredient';
      toast.error(errorMessage, { id: toastId });
      console.error('Save error:', err);
    } finally {
      // Remove loading indicator
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    }
  };

  const handleDelete = (id: string | undefined) => {
    if (!id) return;
    if (!confirm('Delete this ingredient from the recipe?')) return;

    // Mark for deletion (will be processed on Save All)
    setPendingChanges(prev => {
      const next = new Map(prev);
      if (id.startsWith('temp-')) {
        // Temp rows just get removed immediately (never saved to DB)
        next.delete(id);
      } else {
        next.set(id, 'deleted');
      }
      return next;
    });

    // Remove from UI immediately
    setIngredients(prev => prev.filter(ing => ing.id !== id));
  };

  const handleCancel = () => {
    setEditingId(null);
    setDraft(null);
    // Remove temp ingredient if it was new
    if (draft?.id?.startsWith('temp-')) {
      setIngredients(prev => prev.filter(ing => ing.id !== draft.id));
      // Also remove from pending changes
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.delete(draft.id!);
        return next;
      });
    }
  };

  // Batch save all pending changes
  const handleSaveAll = async () => {
    // Collect ALL rows that need saving:
    // 1. Any temp row (new) that has valid data
    // 2. Any existing row marked as modified in pendingChanges
    // 3. Any row marked for deletion in pendingChanges

    const rowsToProcess: Array<{ ingredient: RecipeIngredient; action: 'insert' | 'update' | 'delete' }> = [];

    // Check all ingredients for unsaved new rows
    ingredients.forEach(ing => {
      if (!ing.id) return;

      const isTemp = ing.id.startsWith('temp-');
      const hasValidData = ing.ingredient_id &&
                           parseFloat(String(ing.quantity || 0)) > 0 &&
                           ing.unit_id;

      if (isTemp && hasValidData) {
        // New row with data - needs insert
        rowsToProcess.push({ ingredient: ing, action: 'insert' });
      } else if (!isTemp && pendingChanges.get(ing.id) === 'modified') {
        // Existing row marked as modified - needs update
        rowsToProcess.push({ ingredient: ing, action: 'update' });
      }
    });

    // Check for deletions (rows that were removed from UI but need DB delete)
    pendingChanges.forEach((changeType, ingredientId) => {
      if (changeType === 'deleted' && !ingredientId.startsWith('temp-')) {
        // Need to delete from DB
        rowsToProcess.push({
          ingredient: { id: ingredientId } as RecipeIngredient,
          action: 'delete'
        });
      }
    });

    if (rowsToProcess.length === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsSavingAll(true);
    const toastId = toast.loading(`Saving ${rowsToProcess.length} ingredient(s)...`);

    const errors: string[] = [];
    const successCount = { new: 0, modified: 0, deleted: 0 };
    const savedIds: Map<string, string> = new Map(); // Map temp ID -> real ID

    try {
      for (const { ingredient, action } of rowsToProcess) {

        // Handle deletions
        if (action === 'delete') {
          const { error } = await supabase
            .from('recipe_ingredients')
            .delete()
            .eq('id', ingredient.id);

          if (error) {
            errors.push(`Failed to delete: ${error.message}`);
          } else {
            successCount.deleted++;
          }
          continue;
        }

        // Validate for inserts and updates
        if (!ingredient.ingredient_id) {
          errors.push(`Row missing ingredient selection`);
          continue;
        }

        const quantity = parseFloat(String(ingredient.quantity || '0'));
        if (quantity <= 0) {
          errors.push(`${ingredient.ingredient_name || 'Row'}: quantity must be > 0`);
          continue;
        }

        if (!ingredient.unit_id) {
          errors.push(`${ingredient.ingredient_name || 'Row'}: missing unit`);
          continue;
        }

        // Fetch ingredient cost data from library
        const { data: ingredientData, error: fetchError } = await supabase
          .from('ingredients_library')
          .select('unit_cost, pack_cost, pack_size, yield_percent, ingredient_name')
          .eq('id', ingredient.ingredient_id)
          .single();

        if (fetchError || !ingredientData) {
          errors.push(`${ingredient.ingredient_name || 'Row'}: failed to fetch cost data`);
          continue;
        }

        // Calculate unit_cost
        let unitCost = ingredientData.unit_cost;
        if (!unitCost || unitCost === 0) {
          const packSize = parseFloat(String(ingredientData.pack_size || '0'));
          if (ingredientData.pack_cost && packSize > 0) {
            unitCost = ingredientData.pack_cost / packSize;
          } else {
            // Allow save even without cost - just set to 0
            unitCost = 0;
            console.warn(`${ingredientData.ingredient_name}: no cost data, setting to 0`);
          }
        }

        const yieldPercent = ingredientData.yield_percent || 100;
        const lineCost = unitCost > 0 ? (unitCost * quantity) / (yieldPercent / 100) : 0;

        const payload = {
          recipe_id: recipeId,
          ingredient_id: ingredient.ingredient_id,
          quantity: quantity,
          unit_id: ingredient.unit_id,
          line_cost: lineCost,
          unit_cost: unitCost,
          sort_order: ingredient.sort_order ?? ingredients.findIndex(i => i.id === ingredient.id),
          company_id: companyId,
        };

        if (action === 'insert') {
          // Insert new ingredient
          const { data, error } = await supabase
            .from('recipe_ingredients')
            .insert(payload)
            .select()
            .single();

          if (error) {
            errors.push(`${ingredient.ingredient_name || 'Row'}: ${error.message}`);
          } else {
            successCount.new++;
            // Track the mapping from temp ID to real ID
            if (data?.id && ingredient.id) {
              savedIds.set(ingredient.id, data.id);
            }
          }
        } else if (action === 'update') {
          // Update existing ingredient
          const { error } = await supabase
            .from('recipe_ingredients')
            .update(payload)
            .eq('id', ingredient.id);

          if (error) {
            errors.push(`${ingredient.ingredient_name || 'Row'}: ${error.message}`);
          } else {
            successCount.modified++;
          }
        }
      }

      // Clear pending changes
      setPendingChanges(new Map());

      // Show result toast
      const totalSaved = successCount.new + successCount.modified + successCount.deleted;

      if (errors.length === 0) {
        const parts = [];
        if (successCount.new > 0) parts.push(`${successCount.new} added`);
        if (successCount.modified > 0) parts.push(`${successCount.modified} updated`);
        if (successCount.deleted > 0) parts.push(`${successCount.deleted} deleted`);
        toast.success(`Saved: ${parts.join(', ')}`, { id: toastId });
      } else if (totalSaved > 0) {
        toast.warning(
          `Saved ${totalSaved} items, ${errors.length} failed: ${errors[0]}`,
          { id: toastId }
        );
      } else {
        toast.error(`Save failed: ${errors[0]}`, { id: toastId });
      }

      // Reload to get fresh data with proper IDs and joined fields
      await loadIngredients();

      // Notify parent to refresh recipe totals
      if (onRecipeUpdate) {
        onRecipeUpdate();
      }

    } catch (err: any) {
      console.error('Save all error:', err);
      toast.error(`Save failed: ${err.message}`, { id: toastId });
    } finally {
      setIsSavingAll(false);
    }
  };

  const selectedIngredient = draft?.ingredient_id
    ? availableIngredients.find(ing => ing.id === draft.ingredient_id)
    : null;

  // Filter ingredients based on search query
  const getFilteredIngredients = (ingredientId: string) => {
    const query = searchQueries[ingredientId] || '';
    
    // DEBUG: Log everything
    console.log('🔍 getFilteredIngredients:', {
      ingredientId,
      query,
      searchQueries,
      availableIngredientsCount: availableIngredients.length,
      showingDropdown: showSearchDropdown[ingredientId]
    });
    
    if (!query.trim()) {
      const first10 = availableIngredients.slice(0, 10);
      console.log('📋 Returning first 10 (empty query):', first10.map(i => i.ingredient_name));
      return first10;
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = availableIngredients.filter(ing => 
      ing.ingredient_name?.toLowerCase().includes(lowerQuery)
    ).slice(0, 10);
    
    console.log('📋 Filtered results:', filtered.map(i => i.ingredient_name));
    return filtered;
  };

  const updateDropdownPosition = (ingredientId: string) => {
    const input = inputRefs.current[ingredientId];
    if (input) {
      const rect = input.getBoundingClientRect();
      // For fixed positioning, getBoundingClientRect() already returns viewport-relative coordinates
      // No need to add scrollY/scrollX
      setDropdownPosition(prev => ({
        ...prev,
        [ingredientId]: {
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width
        }
      }));
    }
  };

  const handleSearchChange = (ingredientId: string, value: string) => {
    setSearchQueries(prev => ({ ...prev, [ingredientId]: value }));
    setShowSearchDropdown(prev => ({ ...prev, [ingredientId]: true }));
    // Update position immediately AND in RAF for reliability
    updateDropdownPosition(ingredientId);
    requestAnimationFrame(() => updateDropdownPosition(ingredientId));
  };

  const handleSelectIngredient = (ingredientId: string, selectedIng: any) => {
    console.log('🎯 handleSelectIngredient called:', { ingredientId, selectedIngName: selectedIng.ingredient_name });
    
    // Ensure we're editing this ingredient
    if (editingId !== ingredientId) {
      setEditingId(ingredientId);
    }
    
    // Get current ingredient from the list to preserve quantity
    const currentIngredient = ingredients.find(ing => ing.id === ingredientId);
    
    // Get unit_id from ingredient's base_unit_id or find matching UOM
    let unitId = selectedIng.base_unit_id || null;
    if (!unitId && selectedIng.unit) {
      // Try to find matching UOM by abbreviation
      const matchingUOM = uomList.find(u => 
        u.abbreviation?.toLowerCase() === selectedIng.unit?.toLowerCase()
      );
      unitId = matchingUOM?.id || null;
    }
    
    // Calculate unit cost - use stored unit_cost or calculate from pack_cost/pack_size
    let calculatedUnitCost = parseFloat(String(selectedIng.unit_cost || 0));
    const packCost = parseFloat(String(selectedIng.pack_cost || 0));
    const packSize = parseFloat(String(selectedIng.pack_size || 0));
    const yieldPercent = parseFloat(String(selectedIng.yield_percent || 100));

    // If unit_cost is 0, calculate from pack_cost/pack_size
    if ((!calculatedUnitCost || calculatedUnitCost === 0) && packCost > 0 && packSize > 0) {
      calculatedUnitCost = packCost / packSize;
      console.log('📊 Calculated unit_cost from pack:', { packCost, packSize, calculatedUnitCost });
    }

    // Update the draft with the selected ingredient, preserving existing quantity
    const updatedDraft: Partial<RecipeIngredient> = {
      id: ingredientId,
      recipe_id: recipeId,
      ingredient_id: selectedIng.id,
      ingredient_name: selectedIng.ingredient_name || '',
      supplier: selectedIng.supplier || '',
      unit_id: unitId,
      ingredient_unit_cost: calculatedUnitCost,
      pack_cost: packCost || undefined,
      pack_size: packSize || undefined,
      yield_percent: yieldPercent,
      is_sub_recipe: selectedIng.is_prep_item || false,
      linked_recipe_id: selectedIng.linked_recipe_id || null,
      quantity: currentIngredient?.quantity || 0 // Preserve existing quantity
    };
    
    const ingredientName = selectedIng.ingredient_name || '';
    
    console.log('📝 handleSelectIngredient - setting values:', {
      ingredientId,
      ingredientName,
      selectedIngId: selectedIng.id,
      currentEditingId: editingId
    });
    
    // CRITICAL: Update ALL state in correct order
    // 1. Set editingId first if not already set
    if (editingId !== ingredientId) {
      setEditingId(ingredientId);
    }
    
    // 2. Update draft with selected ingredient
    setDraft(updatedDraft);
    
    // 3. Update search query so input field shows the name
    setSearchQueries(prev => {
      const updated = { ...prev, [ingredientId]: ingredientName };
      console.log('📝 Updated searchQueries:', updated);
      return updated;
    });
    
    // 4. Update the ingredient in the list
    setIngredients(prev => {
      const updated = prev.map(ing =>
        ing.id === ingredientId
          ? {
              ...ing,
              ...updatedDraft,
              ingredient_name: ingredientName,
              ingredient_id: selectedIng.id
            } as RecipeIngredient
          : ing
      );
      console.log('📝 Updated ingredients list, row:', updated.find(i => i.id === ingredientId));
      return updated;
    });

    // 4b. Mark as modified for batch save
    markAsModified(ingredientId);
    
    // 5. Close dropdown after state updates
    setTimeout(() => {
      setShowSearchDropdown(prev => ({ ...prev, [ingredientId]: false }));
    }, 150);
    
    console.log('✅ Ingredient selection complete');
  };

  // Memoize cost calculation to prevent recalculation on every render
  // Use the SAME logic as save to ensure consistency
  const calculateCost = useCallback((ingredient: RecipeIngredient): number => {
    // line_cost is already the total cost for the line (quantity * unit_cost / yield_factor)
    // So we should use it directly if it exists
    if (ingredient.line_cost !== null && ingredient.line_cost !== undefined && ingredient.line_cost > 0) {
      return ingredient.line_cost;
    }
    
    // Otherwise, calculate it from quantity, unit_cost, and yield_percent
    // Use the SAME logic as handleSave
    const qty = parseFloat(String(ingredient.quantity || '0'));
    let unitCost = ingredient.ingredient_unit_cost || 0;
    
    // If unit_cost is 0 or null, try to calculate from pack_cost/pack_size (same as save)
    if (!unitCost || unitCost === 0) {
      const packSize = parseFloat(String(ingredient.pack_size || '0'));
      if (ingredient.pack_cost && packSize > 0) {
        unitCost = ingredient.pack_cost / packSize;
      } else {
        return 0; // Can't calculate without cost data
      }
    }
    
    const yieldPercent = ingredient.yield_percent || 100;
    
    // Calculate: (unit_cost * quantity) / (yield_percent / 100)
    if (yieldPercent > 0) {
      return (unitCost * qty) / (yieldPercent / 100);
    }
    
    return unitCost * qty;
  }, []);

  // Memoize total cost calculation
  const totalCost = useMemo(() => {
    return ingredients.reduce((sum, ing) => sum + calculateCost(ing), 0);
  }, [ingredients, calculateCost]);

  // Memoize displayed ingredients (filtered/sorted)
  const displayedIngredients = useMemo(() => {
    return ingredients
      .filter(ing => !(ing as any).isDeleted)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [ingredients]);

  // Debounced cost calculation for quantity changes
  // Use ref to store debounced function so it's stable across renders
  const debouncedCalculateCostRef = useRef(
    debounce((ingredientId: string, quantity: number, ingredient: RecipeIngredient) => {
      const lineCost = calculateCost({ ...ingredient, quantity });
      setIngredients(prev => prev.map(i =>
        i.id === ingredientId ? { ...i, line_cost: lineCost } : i
      ));
    }, 300)
  );

  // Update the debounced function when calculateCost changes
  useEffect(() => {
    debouncedCalculateCostRef.current = debounce((ingredientId: string, quantity: number, ingredient: RecipeIngredient) => {
      const lineCost = calculateCost({ ...ingredient, quantity });
      setIngredients(prev => prev.map(i =>
        i.id === ingredientId ? { ...i, line_cost: lineCost } : i
      ));
    }, 300);
    
    return () => {
      debouncedCalculateCostRef.current.cancel();
    };
  }, [calculateCost]);

  if (loading) {
    return <div className="text-[rgb(var(--text-tertiary))] dark:text-white/40 text-sm py-4">Loading ingredients...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-theme-surface dark:bg-white/[0.02] border border-theme dark:border-white/[0.06] rounded-lg" style={{ overflow: 'visible' }}>
        <div style={{ overflow: 'hidden', borderRadius: '0.5rem' }}>
          <table className="w-full">
          <thead className="bg-theme-button dark:bg-white/[0.03]">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60 w-[30%]">Ingredient</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60 w-[20%]">Supplier</th>
              <th className="px-2 py-2 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60 w-[10%]">Qty</th>
              <th className="px-2 py-2 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60 w-[8%]">Unit</th>
              <th className="px-2 py-2 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60 w-[10%]">Unit Cost</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60 w-[12%]">Total Cost</th>
              <th className="px-2 py-2 text-center text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60 w-[5%]">Sub</th>
              {isEditing && (
                <th className="px-2 py-2 text-center text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60 w-[5%]">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {ingredients.length === 0 && !isEditing ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[rgb(var(--text-tertiary))] dark:text-white/40 text-sm">
                  No ingredients added yet
                </td>
              </tr>
            ) : (
              displayedIngredients.map((ingredient) => {
                // Empty rows (no ingredient_id) are automatically editable when in edit mode
                // Rows with data require explicit edit click (editingId must match)
                const isEmpty = !ingredient.ingredient_id;
                const isEditingThis = isEditing && (isEmpty || editingId === ingredient.id);
                const cost = calculateCost(ingredient);
                const selectedIng = availableIngredients.find(ing => ing.id === ingredient.ingredient_id);

                return (
                  <tr
                    key={ingredient.id}
                    className={`
                      border-t border-theme dark:border-white/[0.06]
                      transition-colors hover:bg-theme-button dark:hover:bg-white/[0.02]
                      ${pendingChanges.has(ingredient.id!) ? 'bg-amber-500/5 border-l-2 border-l-amber-500' : ''}
                      ${pendingChanges.get(ingredient.id!) === 'deleted' ? 'opacity-50 line-through' : ''}
                    `}
                  >
                    <td className="px-4 py-3 w-[30%]" style={{ position: 'relative', zIndex: showSearchDropdown[ingredient.id] ? 9999 : 'auto' }}>
                      {isEditingThis ? (
                        <div className="relative">
                          <input
                            type="text"
                            value={
                              // CRITICAL: searchQueries MUST be first to keep input and dropdown in sync
                              // If searchQueries exists (even if empty string), use it; otherwise fallback
                              searchQueries[ingredient.id] !== undefined
                                ? searchQueries[ingredient.id]
                                : (editingId === ingredient.id && draft?.ingredient_name)
                                  ? draft.ingredient_name
                                  : ingredient.ingredient_name ?? ''
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              
                              // CRITICAL: Update search first (this makes dropdown work)
                              handleSearchChange(ingredient.id, value);
                              
                              // Then update draft if editing
                              if (editingId === ingredient.id) {
                                if (draft) {
                                  setDraft({ ...draft, ingredient_name: value });
                                } else {
                                  setDraft({
                                    ...ingredient,
                                    ingredient_name: value,
                                    id: ingredient.id,
                                    recipe_id: recipeId
                                  });
                                }
                              }
                              
                              // For empty rows
                              if (isEmpty) {
                                setIngredients(prev => prev.map(ing =>
                                  ing.id === ingredient.id ? { ...ing, ingredient_name: value } : ing
                                ));
                              }
                            }}
                            ref={(el) => { inputRefs.current[ingredient.id] = el; }}
                            onFocus={() => {
                              // Safeguard: Load ingredients if not loaded when user focuses on input
                              if (availableIngredients.length === 0 && companyId && !loadingAvailableIngredients) {
                                console.log('🔄 Loading available ingredients on input focus (safeguard)');
                                loadAvailableIngredients();
                              }
                              
                              // Always set this row as being edited when focused
                              if (editingId !== ingredient.id) {
                                setEditingId(ingredient.id);
                                setDraft({ ...ingredient });
                                setSearchQueries(prev => ({ ...prev, [ingredient.id]: ingredient.ingredient_name || '' }));
                              } else {
                                // If already editing this row, ensure searchQueries is initialized
                                if (searchQueries[ingredient.id] === undefined) {
                                  setSearchQueries(prev => ({ ...prev, [ingredient.id]: ingredient.ingredient_name || '' }));
                                }
                              }
                              
                              setShowSearchDropdown(prev => ({ ...prev, [ingredient.id]: true }));
                              // Update dropdown position (use RAF to avoid blocking)
                              requestAnimationFrame(() => updateDropdownPosition(ingredient.id));
                            }}
                            onBlur={(e) => {
                              // Don't close if clicking on dropdown
                              const relatedTarget = e.relatedTarget as HTMLElement;
                              if (relatedTarget?.closest('.ingredient-dropdown')) {
                                return;
                              }
                              // Delay to allow click on dropdown item
                              const timeoutId = setTimeout(() => {
                                setShowSearchDropdown(prev => ({ ...prev, [ingredient.id]: false }));
                              }, 200);
                              return () => clearTimeout(timeoutId);
                            }}
                            placeholder="Search ingredients..."
                            className="w-full px-3 py-1.5 bg-theme-button dark:bg-white/[0.05] border border-theme dark:border-white/[0.1] rounded-md text-[rgb(var(--text-primary))] dark:text-white placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          />
                          {mounted && showSearchDropdown[ingredient.id] && (() => {
                            // DEBUG: Log dropdown render attempt
                            console.log('🎯 Dropdown render attempt:', {
                              ingredientId: ingredient.id,
                              mounted,
                              showDropdown: showSearchDropdown[ingredient.id],
                              hasPosition: !!dropdownPosition[ingredient.id],
                              position: dropdownPosition[ingredient.id]
                            });
                            
                            // Calculate position - use existing or calculate fallback from input ref
                            const input = inputRefs.current[ingredient.id];
                            let position = dropdownPosition[ingredient.id];
                            
                            // If position not set yet, calculate it from input ref
                            if (!position && input) {
                              try {
                                const rect = input.getBoundingClientRect();
                                console.log('📍 Calculating position from input rect:', {
                                  ingredientId: ingredient.id,
                                  rect: {
                                    top: rect.top,
                                    left: rect.left,
                                    bottom: rect.bottom,
                                    right: rect.right,
                                    width: rect.width,
                                    height: rect.height
                                  },
                                  scrollY: window.scrollY,
                                  scrollX: window.scrollX
                                });
                                
                                if (rect.width > 0 && rect.height > 0) {
                                  // For fixed positioning, getBoundingClientRect() already returns viewport-relative coordinates
                                  // No need to add scrollY/scrollX
                                  position = {
                                    top: rect.bottom + 4,
                                    left: rect.left,
                                    width: rect.width
                                  };
                                  console.log('✅ Calculated position:', position);
                                  // Update state so it persists
                                  setDropdownPosition(prev => ({ ...prev, [ingredient.id]: position }));
                                } else {
                                  console.warn('⚠️ Input rect has invalid dimensions:', { width: rect.width, height: rect.height });
                                }
                              } catch (e) {
                                console.error('❌ Error calculating dropdown position:', e);
                              }
                            } else if (!position) {
                              console.warn('⚠️ No input ref found for dropdown:', {
                                ingredientId: ingredient.id,
                                hasInput: !!input,
                                inputRefsKeys: Object.keys(inputRefs.current)
                              });
                            }
                            
                            // Only render if we have a position
                            if (!position) {
                              // Debug: log why dropdown isn't showing
                              if (showSearchDropdown[ingredient.id]) {
                                console.log('🔍 Dropdown not showing - missing position:', {
                                  ingredientId: ingredient.id,
                                  hasInput: !!input,
                                  hasPosition: !!dropdownPosition[ingredient.id],
                                  searchQuery: searchQueries[ingredient.id],
                                  mounted,
                                  showDropdown: showSearchDropdown[ingredient.id]
                                });
                              }
                              return null;
                            }
                            
                            console.log('✅ Rendering dropdown with position:', position);
                            
                            return createPortal(
                            <div 
                              ref={(el) => {
                                if (el) {
                                  // Log when element is actually mounted to DOM
                                  const computed = window.getComputedStyle(el);
                                  const rect = el.getBoundingClientRect();
                                  
                                  // Log each value separately so they're not collapsed
                                  console.group('🎯 Dropdown element mounted to DOM');
                                  console.log('Ingredient ID:', ingredient.id);
                                  console.log('Bounding Rect:', {
                                    top: rect.top,
                                    left: rect.left,
                                    bottom: rect.bottom,
                                    right: rect.right,
                                    width: rect.width,
                                    height: rect.height,
                                    isVisible: rect.width > 0 && rect.height > 0,
                                    isOnScreen: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
                                  });
                                  console.log('Computed Styles:', {
                                    display: computed.display,
                                    visibility: computed.visibility,
                                    opacity: computed.opacity,
                                    zIndex: computed.zIndex,
                                    position: computed.position,
                                    top: computed.top,
                                    left: computed.left,
                                    width: computed.width,
                                    height: computed.height,
                                    overflow: computed.overflow,
                                    maxHeight: computed.maxHeight,
                                    backgroundColor: computed.backgroundColor
                                  });
                                  console.log('Inline Styles:', {
                                    top: el.style.top,
                                    left: el.style.left,
                                    width: el.style.width,
                                    minWidth: el.style.minWidth
                                  });
                                  console.log('DOM Info:', {
                                    offsetParent: el.offsetParent ? 'exists' : null,
                                    parentElement: el.parentElement?.tagName || null,
                                    isInBody: el.parentElement === document.body,
                                    childrenCount: el.children.length
                                  });
                                  console.groupEnd();
                                }
                              }}
                              className="ingredient-dropdown fixed z-[99999] bg-theme-surface-elevated dark:bg-[#0B0D13] border border-theme dark:border-white/[0.06] rounded-md shadow-2xl max-h-60 overflow-y-auto"
                              style={{
                                top: `${position.top}px`,
                                left: `${position.left}px`,
                                width: `${position.width}px`,
                                minWidth: '200px',
                              }}
                              onMouseDown={(e) => {
                                // Prevent blur when clicking on dropdown
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              {(() => {
                                // Show loading state
                                if (loadingAvailableIngredients) {
                                  return (
                                    <div className="px-3 py-4 text-center">
                                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 text-[rgb(var(--text-secondary))] dark:text-white/60" />
                                      <div className="text-sm text-[rgb(var(--text-tertiary))] dark:text-white/40">Loading ingredients...</div>
                                    </div>
                                  );
                                }
                                
                                // Show error state with retry
                                if (availableIngredientsError && availableIngredients.length === 0) {
                                  return (
                                    <div className="px-3 py-4">
                                      <div className="text-sm text-red-500 dark:text-red-400 mb-2">
                                        {availableIngredientsError}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          loadAvailableIngredients();
                                        }}
                                        className="text-xs text-emerald-500 dark:text-emerald-400 hover:underline"
                                      >
                                        Retry loading ingredients
                                      </button>
                                    </div>
                                  );
                                }
                                
                                const filtered = getFilteredIngredients(ingredient.id);
                                
                                if (filtered.length > 0) {
                                  return filtered.map(ing => (
                                    <button
                                      key={ing.id}
                                      type="button"
                                      onMouseDown={(e) => {
                                        // Prevent input blur - CRITICAL for selection to work
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('✅ Ingredient clicked in dropdown:', {
                                          selectedIngredient: ing.ingredient_name,
                                          selectedId: ing.id,
                                          rowId: ingredient.id,
                                          editingId: editingId
                                        });
                                        handleSelectIngredient(ingredient.id, ing);
                                      }}
                                      className="w-full px-3 py-2 text-left text-[rgb(var(--text-primary))] dark:text-white hover:bg-theme-button dark:hover:bg-white/[0.05] border-b border-theme dark:border-white/[0.06] last:border-b-0 transition-colors cursor-pointer"
                                    >
                                      <div className="font-medium">{ing.ingredient_name}</div>
                                      {ing.supplier && (
                                        <div className="text-xs text-[rgb(var(--text-secondary))] dark:text-white/60">{ing.supplier}</div>
                                      )}
                                    </button>
                                  ));
                                } else {
                                  return (
                                    <div className="px-3 py-2 text-[rgb(var(--text-tertiary))] dark:text-white/40 text-sm">
                                      {availableIngredients.length === 0 
                                        ? (availableIngredientsError 
                                            ? `Error: ${availableIngredientsError}` 
                                            : 'No ingredients available. Click to retry.')
                                        : `No ingredients found matching "${searchQueries[ingredient.id] || ''}"`}
                                    </div>
                                  );
                                }
                              })()}
                            </div>,
                            document.body
                            );
                          })()}
                        </div>
                      ) : (
                        <div>
                          <span className="text-[rgb(var(--text-primary))] dark:text-white">{ingredient.ingredient_name || '-'}</span>
                          {ingredient.is_sub_recipe && (
                            <span className="ml-2 text-xs text-emerald-400">(Sub Recipe)</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm w-[20%]">
                      {isEditingThis ? (
                        <input
                          type="text"
                          value={editingId === ingredient.id ? (draft?.supplier || '') : (ingredient.supplier || '')}
                          onChange={(e) => {
                            if (editingId === ingredient.id) {
                              setDraft({ ...draft, supplier: e.target.value });
                            } else {
                              setIngredients(prev => prev.map(ing => 
                                ing.id === ingredient.id ? { ...ing, supplier: e.target.value } : ing
                              ));
                            }
                          }}
                          onFocus={() => {
                            if (isEmpty && editingId !== ingredient.id) {
                              setEditingId(ingredient.id);
                              setDraft({ ...ingredient });
                              setSearchQueries(prev => ({ ...prev, [ingredient.id]: ingredient.ingredient_name || '' }));
                            }
                          }}
                          className="w-full px-3 py-1.5 bg-theme-button dark:bg-white/[0.05] border border-theme dark:border-white/[0.1] rounded-md text-[rgb(var(--text-primary))] dark:text-white placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          placeholder="Supplier"
                        />
                      ) : (
                        ingredient.supplier || '-'
                      )}
                    </td>
                    <td className="px-2 py-3 text-right text-[rgb(var(--text-primary))] dark:text-white w-[10%]">
                      {isEditingThis ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editingId === ingredient.id ? (draft?.quantity === '' ? '' : (draft?.quantity ?? ingredient.quantity ?? '')) : (ingredient.quantity === '' ? '' : (ingredient.quantity ?? ''))}
                          onChange={(e) => {
                            // Allow empty string while typing, convert to number when needed
                            const inputValue = e.target.value;
                            const value = inputValue === '' ? '' : (parseFloat(inputValue) || 0);

                            // Update quantity immediately (for UI responsiveness)
                            setIngredients(prev => prev.map(ing =>
                              ing.id === ingredient.id ? { ...ing, quantity: value as any } : ing
                            ));

                            // Mark as modified for batch save
                            markAsModified(ingredient.id!);

                            // Calculate cost after 300ms of no typing (debounced)
                            if (typeof value === 'number' && value > 0) {
                              debouncedCalculateCostRef.current(ingredient.id!, value, ingredient);
                            }

                            // Also update draft if this is the active editing row
                            if (editingId === ingredient.id && draft) {
                              setDraft({ ...draft, quantity: value as any });
                            } else if (isEmpty && editingId !== ingredient.id) {
                              // For empty rows, set as editing and create draft
                              setEditingId(ingredient.id);
                              setDraft({ ...ingredient, quantity: value as any });
                              setSearchQueries(prev => ({ ...prev, [ingredient.id]: ingredient.ingredient_name || '' }));
                            }
                          }}
                          onFocus={(e) => {
                            // Clear the field if value is 0, otherwise select all text for easy editing
                            const currentValue = editingId === ingredient.id ? (draft?.quantity ?? ingredient.quantity ?? 0) : (ingredient.quantity ?? 0);
                            
                            if (currentValue === 0 || currentValue === '0') {
                              // Clear the field by setting value to empty string
                              e.target.value = '';
                              // Update state to reflect empty value
                              if (editingId === ingredient.id && draft) {
                                setDraft({ ...draft, quantity: '' as any });
                              } else {
                                setIngredients(prev => prev.map(ing => 
                                  ing.id === ingredient.id ? { ...ing, quantity: '' as any } : ing
                                ));
                              }
                            } else {
                              // Select all text for easy editing
                              e.target.select();
                            }
                            
                            if (isEmpty && editingId !== ingredient.id) {
                              setEditingId(ingredient.id);
                              setDraft({ ...ingredient });
                              setSearchQueries(prev => ({ ...prev, [ingredient.id]: ingredient.ingredient_name || '' }));
                            }
                          }}
                          className="w-full px-2 py-1.5 bg-theme-button dark:bg-white/[0.05] border border-theme dark:border-white/[0.1] rounded-md text-[rgb(var(--text-primary))] dark:text-white placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right text-sm"
                        />
                      ) : (
                        <span className="text-[rgb(var(--text-primary))] dark:text-white text-sm">{ingredient.quantity || '0'}</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm w-[8%]">
                      {isEditingThis ? (
                        <Select
                          value={(editingId === ingredient.id ? (draft?.unit_id ?? '') : (ingredient.unit_id ?? '')) || ''}
                          onValueChange={(unitId) => {
                            // Batch state updates
                            setIngredients(prev => prev.map(ing =>
                              ing.id === ingredient.id
                                ? { ...ing, unit_id: unitId }
                                : ing
                            ));

                            // Mark as modified for batch save
                            markAsModified(ingredient.id!);

                            if (editingId === ingredient.id && draft) {
                              setDraft({ ...draft, unit_id: unitId });
                            } else if (isEmpty && editingId !== ingredient.id) {
                              setEditingId(ingredient.id);
                              setDraft({ ...ingredient, unit_id: unitId });
                              setSearchQueries(prev => ({ ...prev, [ingredient.id]: ingredient.ingredient_name || '' }));
                            }
                          }}
                          options={uomList.map(unit => ({
                            label: `${unit.abbreviation} - ${unit.name}`,
                            value: unit.id
                          }))}
                          placeholder="Select unit"
                          className="w-full"
                        />
                      ) : (
                        <span className="text-sm">{ingredient.unit_abbreviation || ingredient.unit_name || '-'}</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right text-white/60 text-sm w-[10%]">
                      {isEditingThis ? (
                        <input
                          type="number"
                          step="0.0001"
                          value={editingId === ingredient.id ? (draft?.ingredient_unit_cost ?? ingredient.ingredient_unit_cost ?? '') : (ingredient.ingredient_unit_cost ?? '')}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            // Always update the ingredient in the list
                            setIngredients(prev => prev.map(ing =>
                              ing.id === ingredient.id ? { ...ing, ingredient_unit_cost: value } : ing
                            ));
                            // Mark as modified for batch save
                            markAsModified(ingredient.id!);
                            // Also update draft if this is the active editing row
                            if (editingId === ingredient.id && draft) {
                              setDraft({ ...draft, ingredient_unit_cost: value });
                            } else if (isEmpty && editingId !== ingredient.id) {
                              setEditingId(ingredient.id);
                              setDraft({ ...ingredient, ingredient_unit_cost: value });
                              setSearchQueries(prev => ({ ...prev, [ingredient.id]: ingredient.ingredient_name || '' }));
                            }
                          }}
                          onFocus={() => {
                            if (isEmpty && editingId !== ingredient.id) {
                              setEditingId(ingredient.id);
                              setDraft({ ...ingredient });
                              setSearchQueries(prev => ({ ...prev, [ingredient.id]: ingredient.ingredient_name || '' }));
                            }
                          }}
                          className="w-full px-2 py-1.5 bg-theme-button dark:bg-white/[0.05] border border-theme dark:border-white/[0.1] rounded-md text-[rgb(var(--text-primary))] dark:text-white placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-right text-sm"
                          placeholder="0.00"
                        />
                      ) : (
                        (() => {
                          // Display yield-adjusted unit cost so Total = UnitCost × Qty makes sense
                          const rawUnitCost = ingredient.ingredient_unit_cost || 0;
                          const yieldPercent = ingredient.yield_percent || 100;
                          const effectiveUnitCost = yieldPercent > 0 && yieldPercent < 100
                            ? rawUnitCost / (yieldPercent / 100)
                            : rawUnitCost;
                          return (
                            <span className="text-emerald-400 text-sm" title={yieldPercent < 100 ? `Raw: ${formatUnitCost(rawUnitCost)} (${yieldPercent}% yield)` : undefined}>
                              {formatUnitCost(effectiveUnitCost)}
                            </span>
                          );
                        })()
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-white font-medium w-[12%]">
                      <span className="text-emerald-400">£{cost.toFixed(2)}</span>
                    </td>
                    <td className="px-2 py-3 text-center w-[5%]">
                      {ingredient.is_sub_recipe ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Yes
                        </span>
                      ) : (
                        <span className="text-[rgb(var(--text-tertiary))] dark:text-white/20">-</span>
                      )}
                    </td>
                    {isEditing && (
                      <td className="px-2 py-3 w-[5%]">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(ingredient)}
                            className="p-1.5 rounded-lg bg-theme-button dark:bg-white/5 hover:bg-theme-button-hover dark:hover:bg-white/10 text-[rgb(var(--text-secondary))] dark:text-white/60 hover:text-[rgb(var(--text-primary))] dark:hover:text-white transition-colors"
                            aria-label="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(ingredient.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-theme-button dark:bg-white/[0.03] border-t border-theme dark:border-white/[0.06]">
            <tr>
              <td colSpan={isEditing ? 3 : 2} className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">
                Total Recipe Cost:
              </td>
              <td className="px-4 py-3 text-right text-lg font-bold text-emerald-400">
                £{totalCost.toFixed(2)}
              </td>
              <td colSpan={isEditing ? 1 : 2} className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">
                Recipe Yield:
              </td>
              <td className="px-4 py-3 text-right text-lg font-bold text-emerald-400">
                {(() => {
                  // Use calculated yield if available (real-time), otherwise use saved yield
                  const displayYield = calculatedYield !== null ? calculatedYield : (yieldQty || null);
                  if (displayYield !== null && displayYield > 0) {
                    // Get unit abbreviation from UOM list
                    let unitAbbr = '';
                    if (yieldUnit) {
                      const uom = uomList.find(u => u.id === yieldUnit);
                      unitAbbr = uom?.abbreviation || '';
                    }
                    // If no unit abbreviation found, try to use yieldUnit as-is (might be abbreviation)
                    if (!unitAbbr && yieldUnit) {
                      unitAbbr = yieldUnit;
                    }
                    return `${displayYield.toFixed(2)}${unitAbbr ? ` ${unitAbbr}` : ''}`.trim();
                  }
                  return '-';
                })()}
              </td>
              {isEditing && <td colSpan={1} />}
            </tr>
          </tfoot>
          </table>
        </div>
      </div>

      {isEditing && (
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Ingredient
          </button>

          {/* Save All button - always visible when editing, disabled when no changes */}
          <button
            onClick={handleSaveAll}
            disabled={isSavingAll || !hasUnsavedChanges}
            className={`flex items-center gap-2 px-6 py-2 font-medium rounded-lg transition-colors ${
              hasUnsavedChanges
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSavingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {hasUnsavedChanges ? `Save All (${unsavedCount})` : 'Save All'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

