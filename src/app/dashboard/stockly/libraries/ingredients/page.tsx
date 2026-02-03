"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, ChevronDown, ChevronRight, Check, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import Select from '@/components/ui/Select';
import { fuzzyMatchUnit, normalizeUnitText, type UOM } from '@/lib/utils/unitLookup';
import { generateSKU, extractPrefix } from '@/lib/utils/skuGenerator';
import { PrepItemRecipeDialog } from '@/components/PrepItemRecipeDialog';
import { IngredientHistoryPanel } from '@/components/stockly/IngredientHistoryPanel';
import { toast } from 'sonner';
import { StorageArea } from '@/lib/types/stockly';
import { ensureSupplierExists, ensureSuppliersExist } from '@/lib/utils/supplierPlaceholderFlow';
import { formatUnitCost } from '@/lib/utils/libraryHelpers';

const INGREDIENT_CATEGORIES = [
  'Meat', 'Fish', 'Vegetables', 'Fruits', 'Dairy', 'Grains', 'Bakery', 'Dry Goods', 'Other'
];

// UK 14 Allergens (EU Food Information Regulation)
const UK_ALLERGENS = [
  'Cereals containing gluten',
  'Crustaceans',
  'Eggs',
  'Fish',
  'Peanuts',
  'Soybeans',
  'Milk',
  'Nuts',
  'Celery',
  'Mustard',
  'Sesame',
  'Sulphites/Sulphur dioxide',
  'Lupin',
  'Molluscs'
];

export default function IngredientsLibraryPage() {
  const { companyId, company, user } = useAppContext();
  // no toast

  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery); // Initialize with searchQuery
  const [filterCategory, setFilterCategory] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<any | null>(null);
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const [uomList, setUomList] = useState<UOM[]>([]);
  const [unitSearchQuery, setUnitSearchQuery] = useState<Record<string, string>>({});
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);
  const [storageAreas, setStorageAreas] = useState<StorageArea[]>([]);

  const isFetchingRef = useRef(false);
  const loadIngredients = async () => {
    if (isFetchingRef.current) return;
    if (!companyId) { setLoading(false); return; }
    let isCancelled = false;
    try {
      isFetchingRef.current = true;
      setLoading(true);
      // Load ingredients - only select columns we actually need for better performance
      // Note: Using recipes table directly since linked_recipe_id relationship may not be cached
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('ingredients_library')
        .select(`
          id,
          company_id,
          ingredient_name,
          category,
          allergens,
          supplier,
          unit,
          unit_cost,
          pack_cost,
          pack_size,
          yield_percent,
          is_prep_item,
          linked_recipe_id,
          is_purchasable,
          is_retail_saleable,
          is_wholesale_saleable,
          is_online_saleable,
          retail_price,
          wholesale_price,
          online_price,
          track_stock,
          current_stock,
          par_level,
          reorder_point,
          reorder_qty,
          low_stock_alert,
          sku,
          storage_area_id,
          created_at,
          updated_at
        `)
        .eq('company_id', companyId)
        .order('ingredient_name', { ascending: true });
      
      if (ingredientsError) {
        throw ingredientsError;
      }
      
      // Fetch linked recipes separately for prep items
      const prepItemIds = (ingredientsData || [])
        .filter((ing: any) => ing.linked_recipe_id)
        .map((ing: any) => ing.linked_recipe_id);
      
      let recipesMap: Record<string, any> = {};
      if (prepItemIds.length > 0) {
        // Fetch recipes - only select columns that exist
        // Note: recipes table uses total_cost, cost_per_portion, total_ingredient_cost, and yield_qty
        const { data: recipesData, error: recipesError } = await supabase
          .from('recipes')
          .select('id, recipe_status, is_active, total_cost, cost_per_portion, total_ingredient_cost, yield_qty, yield_unit_id')
          .in('id', prepItemIds);
        
        if (recipesError) {
          console.error('Error fetching recipes:', recipesError);
        } else if (recipesData) {
          recipesMap = recipesData.reduce((acc: Record<string, any>, recipe: any) => {
            acc[recipe.id] = recipe;
            return acc;
          }, {});
        }
      }
      
      // Merge recipe data with ingredients and calculate costs in a single pass
      // This reduces the number of iterations and improves performance
      const processIngredients = () => {
        return (ingredientsData || []).map((ingredient: any) => {
          const packCost = parseFloat(ingredient.pack_cost || 0);
          const packSize = parseFloat(ingredient.pack_size || 0);
          const yieldPercent = parseFloat(ingredient.yield_percent || 100);
          
          // Calculate unit cost from pack_cost / (pack_size * yield_percent/100)
          let calculatedUnitCostFromPack: number | null = null;
          if (packCost > 0 && packSize > 0) {
            const effectivePackSize = packSize * (yieldPercent / 100);
            if (effectivePackSize > 0) {
              calculatedUnitCostFromPack = packCost / effectivePackSize;
            }
          }
          
          // Get linked recipe
          const linkedRecipe = ingredient.linked_recipe_id ? recipesMap[ingredient.linked_recipe_id] : null;
          
          // For prep items, also get recipe cost info
          let recipeCostInfo: any = null;
          if (ingredient.is_prep_item && linkedRecipe) {
            // Priority: total_ingredient_cost > total_cost > cost_per_portion
            const recipeCost = parseFloat(linkedRecipe.total_ingredient_cost || linkedRecipe.total_cost || linkedRecipe.cost_per_portion || 0);
            const yieldQty = parseFloat(linkedRecipe.yield_qty || linkedRecipe.yield_quantity || 1);
            
            if (recipeCost > 0 && yieldQty > 0) {
              const calculatedUnitCostFromRecipe = recipeCost / yieldQty;
              recipeCostInfo = {
                unit_cost_from_recipe: calculatedUnitCostFromRecipe,
                recipe_cost: recipeCost,
                recipe_yield: yieldQty
              };
            }
          }
          
          // Use calculated pack cost if available, otherwise use existing unit_cost or recipe cost
          const finalUnitCost = calculatedUnitCostFromPack || ingredient.unit_cost || recipeCostInfo?.unit_cost_from_recipe || null;

          // Calculate stock value: current_stock * unit_cost
          const currentStock = parseFloat(ingredient.current_stock || 0);
          const stockValue = finalUnitCost && currentStock > 0 ? currentStock * finalUnitCost : 0;

          return {
            ...ingredient,
            linked_recipe: linkedRecipe,
            unit_cost: finalUnitCost,
            stock_value: stockValue,
            ...recipeCostInfo
          };
        });
      };
      
      // Process ingredients
      const processed = processIngredients();
      if (!isCancelled) {
        // Use requestAnimationFrame for smoother UI updates
        // This ensures the UI doesn't freeze during large data processing
        requestAnimationFrame(() => {
          if (!isCancelled) {
            setIngredients(processed);
            setLoading(false);
            isFetchingRef.current = false;
          }
        });
      }
    } catch (error: any) {
      console.error('Error loading ingredients:', error);
      if (!isCancelled) {
        requestAnimationFrame(() => {
          if (!isCancelled) {
            setLoading(false);
            isFetchingRef.current = false;
          }
        });
      }
    }
    return () => { isCancelled = true; };
  };

  // Load UOM units on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('uom')
          .select('id, name, abbreviation, unit_type')
          .order('sort_order, name');
        if (error) throw error;
        if (!cancelled) setUomList(data || []);
      } catch (error) {
        console.error('Error loading UOM units:', error);
        // Fallback to common units if table doesn't exist
        if (!cancelled) {
          setUomList([
            { id: '1', name: 'Kilogram', abbreviation: 'kg', unit_type: 'weight' },
            { id: '2', name: 'Gram', abbreviation: 'g', unit_type: 'weight' },
            { id: '3', name: 'Litre', abbreviation: 'L', unit_type: 'volume' },
            { id: '4', name: 'Millilitre', abbreviation: 'ml', unit_type: 'volume' },
            { id: '5', name: 'Each', abbreviation: 'ea', unit_type: 'count' },
            { id: '6', name: 'Pack', abbreviation: 'pack', unit_type: 'count' },
            { id: '7', name: 'Case', abbreviation: 'case', unit_type: 'count' },
          ]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load storage areas on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!companyId) return;
      try {
        const { data, error } = await supabase
          .from('storage_areas')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        if (!cancelled) setStorageAreas(data || []);
      } catch (error) {
        console.error('Error loading storage areas:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadIngredients();
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  // Real-time subscription for ingredient price updates
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`ingredients-price-updates-${companyId}`)
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
            console.log('Price change detected, reloading ingredients...');
            loadIngredients();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ingredients_library',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('New ingredient added, reloading...');
          loadIngredients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  // Initialize debounced search query to match search query on mount
  useEffect(() => {
    setDebouncedSearchQuery(searchQuery);
  }, []); // Only run on mount

  // Debounce search query to reduce filtering overhead
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 50); // Reduced delay for better responsiveness
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-calculate unit cost when pack cost, pack size, or yield percent changes
  useEffect(() => {
    if (!rowDraft || !editingRowId) return;
    
    const packCost = parseFloat(String(rowDraft.pack_cost || ''));
    const packSize = parseFloat(String(rowDraft.pack_size || ''));
    const yieldPercent = parseFloat(String(rowDraft.yield_percent || 100));
    
    if (packCost && packSize && packSize > 0) {
      // Calculate unit cost accounting for yield percentage (waste/loss)
      const effectivePackSize = packSize * (yieldPercent / 100);
      if (effectivePackSize > 0) {
        const calculatedUnitCost = packCost / effectivePackSize;
        // Store with full precision (6 decimal places) to handle small unit costs from large pack sizes
        setRowDraft((prev: any) => ({
          ...prev,
          unit_cost: calculatedUnitCost.toFixed(6),
          unit_cost_auto_calculated: true
        }));
      }
    }
  }, [rowDraft?.pack_cost, rowDraft?.pack_size, rowDraft?.yield_percent, editingRowId]);

  const saveRow = async (id: string) => {
    if (!rowDraft) return;
    try {
      setLoading(true);
      if (!companyId) { console.error('Error saving ingredient: Missing company context'); return; }
      const trimmedName = (rowDraft.ingredient_name ?? '').toString().trim();
      if (!trimmedName) { console.error('Validation error: Name is required'); return; }
      const unitCostRaw = rowDraft.unit_cost;
      const unitCostVal = unitCostRaw === '' || unitCostRaw === null || unitCostRaw === undefined
        ? null
        : parseFloat(String(unitCostRaw));
      if (unitCostVal !== null && Number.isNaN(unitCostVal)) { console.error('Validation error: Unit cost must be a number'); return; }
      const allergensVal = Array.isArray(rowDraft.allergens)
        ? rowDraft.allergens.map((s: any) => (s == null ? '' : String(s))).filter((s: string) => s.length > 0)
        : [];
      const packCostRaw = rowDraft.pack_cost;
      const packCostVal = packCostRaw === '' || packCostRaw === null || packCostRaw === undefined
        ? null
        : parseFloat(String(packCostRaw));
      const packSizeRaw = rowDraft.pack_size;
      const packSizeVal = packSizeRaw === '' || packSizeRaw === null || packSizeRaw === undefined
        ? null
        : parseFloat(String(packSizeRaw));
      const currentStockRaw = rowDraft.current_stock;
      const currentStockVal = currentStockRaw === '' || currentStockRaw === null || currentStockRaw === undefined
        ? 0
        : parseFloat(String(currentStockRaw));
      const parLevelRaw = rowDraft.par_level;
      const parLevelVal = parLevelRaw === '' || parLevelRaw === null || parLevelRaw === undefined
        ? null
        : parseFloat(String(parLevelRaw));
      const reorderPointRaw = rowDraft.reorder_point;
      const reorderPointVal = reorderPointRaw === '' || reorderPointRaw === null || reorderPointRaw === undefined
        ? null
        : parseFloat(String(reorderPointRaw));
      const reorderQtyRaw = rowDraft.reorder_qty;
      const reorderQtyVal = reorderQtyRaw === '' || reorderQtyRaw === null || reorderQtyRaw === undefined
        ? null
        : parseFloat(String(reorderQtyRaw));
      const yieldPercentRaw = rowDraft.yield_percent;
      const yieldPercentVal = yieldPercentRaw === '' || yieldPercentRaw === null || yieldPercentRaw === undefined
        ? 100
        : parseFloat(String(yieldPercentRaw));
      // Get supplier value
      const supplierVal = rowDraft.supplier?.trim() || null;

      // Ensure supplier placeholder exists
      if (supplierVal && companyId) {
        await ensureSupplierExists(supplierVal, companyId);
      }

      // Auto-calculate unit cost if pack cost and pack size are provided
      // BUT: For prep items, don't calculate from pack_cost/pack_size - cost comes from recipe
      const isPrepItem = rowDraft.is_prep_item ?? false;
      let finalUnitCost = unitCostVal;
      
      if (!isPrepItem && packCostVal && packSizeVal && packSizeVal > 0 && (!unitCostVal || rowDraft.unit_cost_auto_calculated)) {
        // Calculate unit cost accounting for yield percentage
        const yieldPercent = yieldPercentVal || 100;
        const effectivePackSize = packSizeVal * (yieldPercent / 100);
        if (effectivePackSize > 0) {
          finalUnitCost = packCostVal / effectivePackSize;
        }
      }
      // For prep items, leave unit_cost as null or existing value - it will be updated from recipe cost

      // Auto-generate SKU if not provided
      let finalSKU = rowDraft.sku?.trim() || null;
      if (!finalSKU && company && trimmedName) {
        const companyPrefix = extractPrefix(company.name || '');
        const itemPrefix = extractPrefix(trimmedName);
        // Get existing SKUs for this company
        const existingSKUs = ingredients
          .filter((ing: any) => ing.sku && ing.company_id === companyId)
          .map((ing: any) => ing.sku);
        finalSKU = generateSKU(companyPrefix, itemPrefix, existingSKUs);
      }

      const retailPriceRaw = rowDraft.retail_price;
      const retailPriceVal = retailPriceRaw === '' || retailPriceRaw === null || retailPriceRaw === undefined
        ? null
        : parseFloat(String(retailPriceRaw));
      const wholesalePriceRaw = rowDraft.wholesale_price;
      const wholesalePriceVal = wholesalePriceRaw === '' || wholesalePriceRaw === null || wholesalePriceRaw === undefined
        ? null
        : parseFloat(String(wholesalePriceRaw));
      const onlinePriceRaw = rowDraft.online_price;
      const onlinePriceVal = onlinePriceRaw === '' || onlinePriceRaw === null || onlinePriceRaw === undefined
        ? null
        : parseFloat(String(onlinePriceRaw));
      
      const payload: any = {
        ingredient_name: trimmedName,
        category: rowDraft.category ?? null,
        allergens: allergensVal,
        unit: rowDraft.unit ?? null,
        unit_cost: finalUnitCost,
        supplier: supplierVal,
        pack_size: packSizeVal,
        pack_cost: packCostVal,
        notes: rowDraft.notes ?? null,
        // Stockly fields
        track_stock: rowDraft.track_stock ?? false,
        current_stock: currentStockVal,
        par_level: parLevelVal,
        reorder_point: reorderPointVal,
        reorder_qty: reorderQtyVal,
        sku: finalSKU,
        yield_percent: yieldPercentVal,
        yield_notes: rowDraft.yield_notes?.trim() || null,
        costing_method: rowDraft.costing_method || 'average',
        is_prep_item: rowDraft.is_prep_item ?? false,
        is_purchasable: rowDraft.is_purchasable ?? true,
        // Sales channels (replacing is_saleable)
        is_retail_saleable: rowDraft.is_retail_saleable ?? false,
        is_wholesale_saleable: rowDraft.is_wholesale_saleable ?? false,
        is_online_saleable: rowDraft.is_online_saleable ?? false,
        retail_price: retailPriceVal,
        wholesale_price: wholesalePriceVal,
        online_price: onlinePriceVal,
        storage_area_id: rowDraft.storage_area_id || null,
        company_id: companyId,
      };
      // Track previous is_prep_item state for update operations
      let previousIsPrepItem = false;
      if (!newRowIds.has(id)) {
        const existingIngredient = ingredients.find((ing: any) => ing.id === id);
        previousIsPrepItem = existingIngredient?.is_prep_item ?? false;
      }

      if (newRowIds.has(id)) {
        const { data, error, status, statusText } = await supabase
          .from('ingredients_library')
          .insert(payload)
          .select('*')
          .single();
        if (error) {
          console.error('Supabase insert error (ingredients_library)', { error, status, statusText, payload });
          throw error;
        }
        console.info('Ingredient added');
        
        // Recipe creation is now handled by PrepItemRecipeDialog
        // No automatic recipe creation here - user chooses via dialog
        
        setIngredients(prev => prev.map((ing: any) => ing.id === id ? data : ing));
        setNewRowIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
        // ensure UI reflects DB state
        await loadIngredients();
      } else {
        const { company_id: _omitCompanyId, ...updatePayload } = payload;
        const { error, status, statusText } = await supabase
          .from('ingredients_library')
          .update(updatePayload)
          .eq('id', id)
          .eq('company_id', companyId);
        if (error) {
          console.error('Supabase update error (ingredients_library)', { error, status, statusText, updatePayload, id });
          throw error;
        }
        console.info('Ingredient updated');
        
        // Recipe creation is now handled by PrepItemRecipeDialog
        // No automatic recipe creation here - user chooses via dialog
        // If unchecking prep item, recipe stays but ingredient is unlinked
        if (!isPrepItem && previousIsPrepItem) {
          // Unlink recipe but don't delete it
          await supabase
            .from('ingredients_library')
            .update({ linked_recipe_id: null })
            .eq('id', id);
        }
        
        setIngredients(prev => prev.map((ing: any) => ing.id === id ? { ...ing, ...updatePayload } : ing));
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
        // ensure UI reflects DB state
        await loadIngredients();
      }
    } catch (error: any) {
      const description = (error && (error.message || (error as any).error_description || (error as any).hint))
        || (typeof error === 'string' ? error : '')
        || (error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : 'Unknown error');
      console.error('Error saving ingredient:', error);
      // toast removed; rely on console for now
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ingredient?')) return;
    try {
      const { error } = await supabase
        .from('ingredients_library')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      console.info('Ingredient deleted');
      loadIngredients();
    } catch (error: any) {
      console.error('Error deleting ingredient:', error);
    }
  };

  const handleEdit = (item: any) => {
    setEditingRowId(item.id);
    setRowDraft({
      ingredient_name: item.ingredient_name || '',
      category: item.category || '',
      allergens: item.allergens || [],
      unit: item.unit || '',
      unit_cost: item.unit_cost ?? '',
      supplier: item.supplier || '',
      pack_size: item.pack_size ?? '',
      pack_cost: item.pack_cost ?? '',
      notes: item.notes || '',
      // Stockly fields
      track_stock: item.track_stock ?? false,
      current_stock: item.current_stock ?? '',
      par_level: item.par_level ?? '',
      reorder_point: item.reorder_point ?? '',
      reorder_qty: item.reorder_qty ?? '',
      sku: item.sku || '',
      yield_percent: item.yield_percent ?? 100,
      yield_notes: item.yield_notes || '',
      costing_method: item.costing_method || 'average',
      is_prep_item: item.is_prep_item ?? false,
      is_purchasable: item.is_purchasable ?? true,
      unit_cost_auto_calculated: false,
      is_retail_saleable: item.is_retail_saleable ?? false,
      is_wholesale_saleable: item.is_wholesale_saleable ?? false,
      is_online_saleable: item.is_online_saleable ?? false,
      retail_price: item.retail_price ?? '',
      wholesale_price: item.wholesale_price ?? '',
      online_price: item.online_price ?? '',
      storage_area_id: item.storage_area_id ?? ''
    });
    setExpandedRows(prev => new Set(prev).add(item.id));
  };

  const cancelEdit = (id: string) => {
    if (newRowIds.has(id)) {
      setIngredients(prev => prev.filter((ing: any) => ing.id !== id));
      setNewRowIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
    setEditingRowId(null);
    setRowDraft(null);
  };

  // Memoize toggleRow to prevent unnecessary re-renders
  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // CSV helpers (align with ChemicalsClient)
  const CSV_HEADERS = [
    'ingredient_name',
    'category',
    'allergens',
    'unit',
    'unit_cost',
    'supplier',
    'pack_size',
    'pack_cost',
    'track_stock',
    'current_stock',
    'par_level',
    'reorder_point',
    'reorder_qty',
    'sku',
    'yield_percent',
    'yield_notes',
    'costing_method',
    'is_prep_item',
    'is_purchasable',
    'is_retail_saleable',
    'is_wholesale_saleable',
    'is_online_saleable',
    'retail_price',
    'wholesale_price',
    'online_price',
    'notes'
  ];

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const toCSV = (rows: any[]): string => {
    const header = CSV_HEADERS.join(',');
    const body = rows.map((r) => {
      const obj: any = {
        ingredient_name: r.ingredient_name ?? '',
        category: r.category ?? '',
        allergens: (r.allergens || []).join('; '),
        unit: r.unit ?? '',
        unit_cost: r.unit_cost ?? '',
        supplier: r.supplier ?? '',
        pack_size: r.pack_size ?? '',
        pack_cost: r.pack_cost ?? '',
        track_stock: r.track_stock ? 'true' : 'false',
        current_stock: r.current_stock ?? 0,
        par_level: r.par_level ?? '',
        reorder_point: r.reorder_point ?? '',
        reorder_qty: r.reorder_qty ?? '',
        sku: r.sku ?? '',
        yield_percent: r.yield_percent ?? 100,
        yield_notes: r.yield_notes ?? '',
        costing_method: r.costing_method ?? 'average',
        is_prep_item: r.is_prep_item ? 'true' : 'false',
        is_purchasable: r.is_purchasable !== false ? 'true' : 'false',
        is_retail_saleable: r.is_retail_saleable ? 'true' : 'false',
        is_wholesale_saleable: r.is_wholesale_saleable ? 'true' : 'false',
        is_online_saleable: r.is_online_saleable ? 'true' : 'false',
        retail_price: r.retail_price ?? '',
        wholesale_price: r.wholesale_price ?? '',
        online_price: r.online_price ?? '',
        notes: r.notes ?? ''
      };
      return CSV_HEADERS.map((h) => escapeCSV(obj[h])).join(',');
    }).join('\n');
    return header + (body ? ('\n' + body) : '');
  };

  const handleDownloadCSV = () => {
    const csv = toCSV(ingredients.length ? ingredients : []);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ingredients_library.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
          if (ch === '"') {
            if (line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = false; }
          } else { current += ch; }
        } else {
          if (ch === ',') { result.push(current); current = ''; }
          else if (ch === '"') { inQuotes = true; }
          else { current += ch; }
        }
      }
      result.push(current);
      return result;
    };
    const headers = parseLine(lines[0] || '').map(h => h.trim());
    const rows = lines.slice(1).filter(l => l.trim().length > 0).map(parseLine);
    return { headers, rows };
  };

  const normaliseArrayCell = (cell: string): string[] => {
    if (!cell) return [];
    return cell.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  };

  const handleUploadClick = () => csvInputRef.current?.click();

  const handleUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      if (!headers.length) throw new Error('CSV has no headers');
      const headerIndex: Record<string, number> = {};
      headers.forEach((h, i) => { headerIndex[h] = i; });
      const prepared: any[] = [];
      for (const row of rows) {
        const name = row[headerIndex['ingredient_name']] ?? '';
        if (!name.trim()) continue;
        
        // Unit fuzzy matching
        const unitRaw = row[headerIndex['unit']] ?? '';
        let matchedUnit = unitRaw?.trim() || null;
        if (unitRaw && uomList.length > 0) {
          const fuzzyMatched = fuzzyMatchUnit(unitRaw, uomList);
          if (fuzzyMatched) {
            matchedUnit = fuzzyMatched;
          }
        }
        
        // Allergen fuzzy matching to UK standard list
        const allergensRaw = row[headerIndex['allergens']];
        const allergenArray = normaliseArrayCell(allergensRaw);
        const matchedAllergens = allergenArray.map((allergen: string) => {
          const normalized = allergen.toLowerCase().trim();
          // Match against UK_ALLERGENS with fuzzy matching
          const matched = UK_ALLERGENS.find((ukAllergen) => {
            const ukNormalized = ukAllergen.toLowerCase();
            return ukNormalized === normalized || 
                   ukNormalized.includes(normalized) || 
                   normalized.includes(ukNormalized) ||
                   normalized.replace(/[^a-z]/g, '') === ukNormalized.replace(/[^a-z]/g, '');
          });
          return matched || allergen; // Return matched standard name or original if no match
        }).filter((a: string) => UK_ALLERGENS.includes(a)); // Only keep valid UK allergens
        
        const unitCostRaw = row[headerIndex['unit_cost']];
        const packCostRaw = row[headerIndex['pack_cost']];
        const packCostVal = packCostRaw && packCostRaw.trim() !== '' ? Number(packCostRaw) : null;
        const packSizeRaw = row[headerIndex['pack_size']];
        const packSizeVal = packSizeRaw && packSizeRaw.trim() !== '' ? Number(packSizeRaw) : null;
        
        // Auto-calculate unit cost if pack cost and pack size are provided
        let calculatedUnitCost = unitCostRaw && unitCostRaw.trim() !== '' ? Number(unitCostRaw) : null;
        if (packCostVal && packSizeVal && packSizeVal > 0 && !calculatedUnitCost) {
          calculatedUnitCost = packCostVal / packSizeVal;
        }
        
        // Auto-generate SKU if not provided
        let generatedSKU = row[headerIndex['sku']]?.trim() || null;
        if (!generatedSKU && company && name.trim()) {
          const companyPrefix = extractPrefix(company.name || '');
          const itemPrefix = extractPrefix(name.trim());
          // Get existing SKUs for this company (from current ingredients + already prepared items)
          const existingSKUs = [
            ...ingredients.filter((ing: any) => ing.sku && ing.company_id === companyId).map((ing: any) => ing.sku),
            ...prepared.filter((p: any) => p.sku).map((p: any) => p.sku)
          ];
          generatedSKU = generateSKU(companyPrefix, itemPrefix, existingSKUs);
        }
        
        const trackStockRaw = row[headerIndex['track_stock']];
        const trackStockVal = trackStockRaw && (trackStockRaw.trim().toLowerCase() === 'true' || trackStockRaw.trim() === '1');
        const currentStockRaw = row[headerIndex['current_stock']];
        const currentStockVal = currentStockRaw && currentStockRaw.trim() !== '' ? Number(currentStockRaw) : 0;
        const parLevelRaw = row[headerIndex['par_level']];
        const parLevelVal = parLevelRaw && parLevelRaw.trim() !== '' ? Number(parLevelRaw) : null;
        const reorderPointRaw = row[headerIndex['reorder_point']];
        const reorderPointVal = reorderPointRaw && reorderPointRaw.trim() !== '' ? Number(reorderPointRaw) : null;
        const reorderQtyRaw = row[headerIndex['reorder_qty']];
        const reorderQtyVal = reorderQtyRaw && reorderQtyRaw.trim() !== '' ? Number(reorderQtyRaw) : null;
        const yieldPercentRaw = row[headerIndex['yield_percent']];
        const yieldPercentVal = yieldPercentRaw && yieldPercentRaw.trim() !== '' ? Number(yieldPercentRaw) : 100;
        const isPrepItemRaw = row[headerIndex['is_prep_item']];
        const isPrepItemVal = isPrepItemRaw && (isPrepItemRaw.trim().toLowerCase() === 'true' || isPrepItemRaw.trim() === '1');
        const isPurchasableRaw = row[headerIndex['is_purchasable']];
        const isPurchasableVal = isPurchasableRaw === undefined || isPurchasableRaw === '' || isPurchasableRaw.trim().toLowerCase() === 'true' || isPurchasableRaw.trim() === '1';
        const isRetailSaleableRaw = row[headerIndex['is_retail_saleable']];
        const isRetailSaleableVal = isRetailSaleableRaw && (isRetailSaleableRaw.trim().toLowerCase() === 'true' || isRetailSaleableRaw.trim() === '1');
        const isWholesaleSaleableRaw = row[headerIndex['is_wholesale_saleable']];
        const isWholesaleSaleableVal = isWholesaleSaleableRaw && (isWholesaleSaleableRaw.trim().toLowerCase() === 'true' || isWholesaleSaleableRaw.trim() === '1');
        const isOnlineSaleableRaw = row[headerIndex['is_online_saleable']];
        const isOnlineSaleableVal = isOnlineSaleableRaw && (isOnlineSaleableRaw.trim().toLowerCase() === 'true' || isOnlineSaleableRaw.trim() === '1');
        const retailPriceRaw = row[headerIndex['retail_price']];
        const retailPriceVal = retailPriceRaw && retailPriceRaw.trim() !== '' ? Number(retailPriceRaw) : null;
        const wholesalePriceRaw = row[headerIndex['wholesale_price']];
        const wholesalePriceVal = wholesalePriceRaw && wholesalePriceRaw.trim() !== '' ? Number(wholesalePriceRaw) : null;
        const onlinePriceRaw = row[headerIndex['online_price']];
        const onlinePriceVal = onlinePriceRaw && onlinePriceRaw.trim() !== '' ? Number(onlinePriceRaw) : null;
        
        prepared.push({
          company_id: companyId,
          ingredient_name: name.trim(),
          category: row[headerIndex['category']] ?? null,
          allergens: matchedAllergens,
          unit: matchedUnit,
          unit_cost: calculatedUnitCost,
          supplier: row[headerIndex['supplier']] ?? null,
          pack_size: packSizeVal,
          pack_cost: packCostVal,
          track_stock: trackStockVal,
          current_stock: currentStockVal,
          par_level: parLevelVal,
          reorder_point: reorderPointVal,
          reorder_qty: reorderQtyVal,
          sku: generatedSKU,
          yield_percent: yieldPercentVal,
          yield_notes: row[headerIndex['yield_notes']]?.trim() || null,
          costing_method: row[headerIndex['costing_method']]?.trim() || 'average',
          is_prep_item: isPrepItemVal,
          is_purchasable: isPurchasableVal,
          is_retail_saleable: isRetailSaleableVal,
          is_wholesale_saleable: isWholesaleSaleableVal,
          is_online_saleable: isOnlineSaleableVal,
          retail_price: retailPriceVal,
          wholesale_price: wholesalePriceVal,
          online_price: onlinePriceVal,
          notes: row[headerIndex['notes']] ?? null,
        });
      }
      if (!prepared.length) { console.warn('CSV import: No rows to import'); return; }
      
      // Create supplier placeholders for all unique suppliers in CSV
      const supplierNamesInCSV = prepared.map(row => row.supplier);
      if (companyId) {
        await ensureSuppliersExist(supplierNamesInCSV, companyId);
      }
      
      const chunkSize = 500;
      for (let i = 0; i < prepared.length; i += chunkSize) {
        const chunk = prepared.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from('ingredients_library')
          .insert(chunk)
          .select('*');
        if (error) throw error;
        setIngredients(prev => [ ...(data || []), ...prev ]);
      }
      console.info(`Import complete: Imported ${prepared.length} row(s)`);
    } catch (err: any) {
      console.error('CSV import error:', err);
      // toast removed
    } finally {
      setLoading(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  // Memoize filtered items to avoid recalculating on every render
  // Use debounced search query to reduce filtering frequency
  const filteredItems = useMemo(() => {
    if (!ingredients.length) return [];
    
    const queryLower = debouncedSearchQuery.toLowerCase();
    const isAllCategory = filterCategory === 'all';
    
    return ingredients.filter((item: any) => {
      const matchesSearch = !queryLower || (item.ingredient_name || '').toLowerCase().includes(queryLower);
      const matchesCategory = isAllCategory || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [ingredients, debouncedSearchQuery, filterCategory]);

  return (
    <div className="w-full bg-gray-50 dark:bg-[#0B0D13] min-h-screen">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <Package className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              Ingredients Library
            </h1>
            <p className="text-sm text-gray-600 dark:text-white/60">Manage ingredients, allergens, and costs</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleUploadClick} className="px-4 py-2 bg-white dark:bg-white/[0.05] border border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:shadow-[0_0_12px_rgba(16,185,129,0.7)] rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2">
              <Upload size={16} />
              Upload CSV
            </button>
            <button onClick={handleDownloadCSV} className="px-4 py-2 bg-white dark:bg-white/[0.05] border border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:shadow-[0_0_12px_rgba(16,185,129,0.7)] rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2">
              <Download size={16} />
              Download CSV
            </button>
            <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={handleUploadChange} className="hidden" />
            <button
              onClick={() => {
                const tempId = `temp-${Date.now()}`;
                const empty: any = {
                  id: tempId,
                  ingredient_name: '',
                  category: '',
                  allergens: [],
                  unit: '',
                  unit_cost: null,
                  supplier: '',
                  pack_size: null,
                  pack_cost: null,
                  notes: '',
                  track_stock: false,
                  current_stock: 0,
                  par_level: null,
                  reorder_point: null,
                  reorder_qty: null,
                  sku: '',
                  yield_percent: 100,
                  yield_notes: '',
                  costing_method: 'average',
                  is_prep_item: false,
                  is_purchasable: true,
                  is_saleable: false,
                  sale_price: null
                };
                setIngredients(prev => [empty, ...prev]);
                setExpandedRows(prev => new Set(prev).add(tempId));
                setEditingRowId(tempId);
                setRowDraft({ ...empty, unit_cost: '', current_stock: '', par_level: '', reorder_point: '', reorder_qty: '', pack_size: '', pack_cost: '', yield_percent: 100, sale_price: '', id: undefined });
                setNewRowIds(prev => new Set(prev).add(tempId));
              }}
              aria-label="Add Ingredient"
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-emerald-600 dark:border-emerald-500/60 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/10 hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-[0_0_14px_rgba(16,185,129,0.7)] transition"
            >
              <Plus size={18} />
              <span className="sr-only">Add Ingredient</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-white/40" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ingredients..."
                className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-lg pl-10 pr-4 py-2.5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 min-w-[180px] appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {INGREDIENT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-600 dark:text-white/60 text-center py-8">Loading ingredients...</div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-8 text-center">
            <p className="text-gray-600 dark:text-white/60">No ingredients found.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-white/[0.05] border-b border-gray-200 dark:border-white/[0.06]">
                <tr>
                  <th className="w-10 px-2" aria-label="Expand" />
                  <th className="text-left px-4 py-3 font-semibold text-gray-900 dark:text-emerald-400 text-[0.95rem]">Name</th>
                  <th className="text-left px-2 py-3 font-semibold text-gray-900 dark:text-emerald-400 text-[0.95rem]">Category</th>
                  <th className="text-left px-2 py-3 font-semibold text-gray-900 dark:text-emerald-400 text-[0.95rem]">Unit</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item: any) => {
                  const expanded = expandedRows.has(item.id);
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="border-b border-gray-100 dark:border-white/[0.05] hover:bg-gray-50 dark:hover:bg-white/[0.02] bg-white dark:bg-transparent">
                        <td className="px-2 py-3 align-top">
                          <button aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => toggleRow(item.id)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/[0.05] text-gray-600 dark:text-white/60">
                            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {editingRowId === item.id ? (
                            <input className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.ingredient_name ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, ingredient_name: e.target.value }))} />
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-gray-900 dark:text-white font-medium">{item.ingredient_name}</span>
                              {item.supplier && (
                                <span className="text-gray-500 dark:text-white/40 text-sm">• {item.supplier}</span>
                              )}
                              {/* Prep Item Recipe Status Indicators */}
                              {item.is_prep_item && item.linked_recipe && (
                                <>
                                  {item.linked_recipe.recipe_status === 'active' && item.linked_recipe.is_active ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                      ✓ Recipe Active
                                    </span>
                                  ) : item.linked_recipe.recipe_status === 'draft' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 dark:bg-gray-500/10 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-500/20 italic">
                                      ⚠ Recipe Draft
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                                      Recipe Disabled
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-3 text-gray-700 dark:text-white/80 text-sm whitespace-nowrap">
                          {editingRowId === item.id ? (
                            <select className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white" value={rowDraft?.category ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, category: e.target.value }))}>
                              <option value="">Select...</option>
                              {INGREDIENT_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                            </select>
                          ) : (
                            item.category || '-'
                          )}
                        </td>
                        <td className="px-2 py-3 text-gray-700 dark:text-white/80 text-sm whitespace-nowrap">
                          {editingRowId === item.id ? (
                            <Select
                              value={rowDraft?.unit ?? ''}
                              onValueChange={(val) => setRowDraft((d: any) => ({ ...d, unit: val }))}
                              options={uomList.map((uom) => ({ label: `${uom.name} (${uom.abbreviation})`, value: uom.abbreviation }))}
                              placeholder="Select unit..."
                              className="w-full"
                            />
                          ) : (
                            item.unit || '-'
                          )}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-t border-gray-200 dark:border-white/[0.06]">
                          <td colSpan={4} className="px-4 py-4 bg-gray-50 dark:bg-white/[0.02]">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40">Supplier</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.supplier ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, supplier: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.supplier || '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">
                                Unit Cost
                                {(item.pack_cost && item.pack_size) && (
                                  <span className="ml-2 text-emerald-600 dark:text-emerald-400 text-[10px]">(from pack)</span>
                                )}
                                {item.is_prep_item && item.unit_cost_from_recipe && (
                                  <span className="ml-2 text-emerald-600 dark:text-emerald-400 text-[10px]">(from recipe)</span>
                                )}
                                {editingRowId === item.id && rowDraft?.unit_cost_auto_calculated && (
                                  <span className="ml-2 text-emerald-600 dark:text-emerald-400 text-[10px]">(Auto-calculated)</span>
                                )}
                              </div>
                              {editingRowId === item.id ? (
                                <input 
                                  type="number" 
                                  step="0.01" 
                                  className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" 
                                  value={rowDraft?.unit_cost ?? ''} 
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, unit_cost: e.target.value, unit_cost_auto_calculated: false }))}
                                  readOnly={rowDraft?.unit_cost_auto_calculated}
                                />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {item.unit_cost ? (
                                    <span className={item.pack_cost && item.pack_size ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                                      {formatUnitCost(parseFloat(item.unit_cost))}
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">
                                Pack Size {item.unit && <span className="text-emerald-500">({item.unit})</span>}
                              </div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.pack_size ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, pack_size: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">
                                  {item.pack_size != null ? item.pack_size : '-'}
                                  {item.pack_size != null && item.unit && <span className="text-gray-500 dark:text-white/50 ml-1">{item.unit}</span>}
                                </div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Pack Cost</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.pack_cost ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, pack_cost: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.pack_cost != null ? `£${item.pack_cost}` : '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-2">Allergens (UK 14)</div>
                              {editingRowId === item.id ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                  {UK_ALLERGENS.map((allergen) => {
                                    const isChecked = (rowDraft?.allergens || []).includes(allergen);
                                    return (
                                      <label key={allergen} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            const current = rowDraft?.allergens || [];
                                            if (e.target.checked) {
                                              setRowDraft((d: any) => ({ ...d, allergens: [...current, allergen] }));
                                            } else {
                                              setRowDraft((d: any) => ({ ...d, allergens: current.filter((a: string) => a !== allergen) }));
                                            }
                                          }}
                                          style={{ accentColor: '#10B981' }}
                                          className="w-4 h-4 rounded border-emerald-500/50 bg-white dark:bg-neutral-900 text-emerald-500 focus:ring-emerald-500 focus:ring-2 checked:bg-emerald-500 checked:border-emerald-500"
                                        />
                                        <span className="text-xs text-gray-900 dark:text-white">{allergen}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {(item.allergens || []).length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {(item.allergens || []).map((allergen: string) => (
                                        <span key={allergen} className="px-2 py-1 bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded text-xs">
                                          {allergen}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    '-'
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Stockly Fields Section */}
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs font-semibold text-gray-700 dark:text-white/80 mb-2 uppercase">Stock Management</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="flex items-center gap-2">
                                  {editingRowId === item.id ? (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="checkbox" checked={rowDraft?.track_stock ?? false} onChange={(e) => setRowDraft((d: any) => ({ ...d, track_stock: e.target.checked }))} style={{ accentColor: '#10B981' }} className="w-4 h-4 rounded border-emerald-500/50 bg-white dark:bg-neutral-900 text-emerald-500 focus:ring-emerald-500 focus:ring-2 checked:bg-emerald-500 checked:border-emerald-500" />
                                      <span className="text-xs text-gray-600 dark:text-white/60">Track Stock</span>
                                    </label>
                                  ) : (
                                    <label className="flex items-center gap-2">
                                      <div className="relative w-4 h-4">
                                        <input type="checkbox" checked={item.track_stock ?? false} disabled className="sr-only" />
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${item.track_stock ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-neutral-900 border-emerald-500/30'}`}>
                                          {item.track_stock && <Check size={12} className="text-white" />}
                                        </div>
                                      </div>
                                      <span className="text-xs text-gray-600 dark:text-white/60">Track Stock</span>
                                    </label>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {editingRowId === item.id ? (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input 
                                        type="checkbox" 
                                        checked={rowDraft?.is_prep_item ?? false} 
                                        onChange={(e) => {
                                          const newValue = e.target.checked;

                                          // If checking the box, show recipe dialog
                                          if (newValue && !rowDraft?.is_prep_item) {
                                            // Merge rowDraft values with item to include user's typed data
                                            // Keep item.id to preserve the original ingredient ID (rowDraft may have undefined id)
                                            setSelectedIngredient({ ...item, ...rowDraft, id: item.id });
                                            setShowRecipeDialog(true);
                                          } else {
                                            // Unchecking - update directly
                                            setRowDraft((d: any) => ({ ...d, is_prep_item: newValue }));
                                          }
                                        }} 
                                        style={{ accentColor: '#10B981' }} 
                                        className="w-4 h-4 rounded border-emerald-500/50 bg-white dark:bg-neutral-900 text-emerald-500 focus:ring-emerald-500 focus:ring-2 checked:bg-emerald-500 checked:border-emerald-500" 
                                      />
                                      <span className="text-xs text-gray-600 dark:text-white/60">Prep Item</span>
                                    </label>
                                  ) : (
                                    <label className="flex items-center gap-2">
                                      <div className="relative w-4 h-4">
                                        <input type="checkbox" checked={item.is_prep_item ?? false} disabled className="sr-only" />
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${item.is_prep_item ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-neutral-900 border-emerald-500/30'}`}>
                                          {item.is_prep_item && <Check size={12} className="text-white" />}
                                        </div>
                                      </div>
                                      <span className="text-xs text-gray-600 dark:text-white/60">Prep Item</span>
                                    </label>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {editingRowId === item.id ? (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="checkbox" checked={rowDraft?.is_purchasable ?? true} onChange={(e) => setRowDraft((d: any) => ({ ...d, is_purchasable: e.target.checked }))} style={{ accentColor: '#10B981' }} className="w-4 h-4 rounded border-emerald-500/50 bg-white dark:bg-neutral-900 text-emerald-500 focus:ring-emerald-500 focus:ring-2 checked:bg-emerald-500 checked:border-emerald-500" />
                                      <span className="text-xs text-gray-600 dark:text-white/60">Purchasable</span>
                                    </label>
                                  ) : (
                                    <label className="flex items-center gap-2">
                                      <div className="relative w-4 h-4">
                                        <input type="checkbox" checked={item.is_purchasable ?? true} disabled className="sr-only" />
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${item.is_purchasable ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-neutral-900 border-emerald-500/30'}`}>
                                          {item.is_purchasable && <Check size={12} className="text-white" />}
                                        </div>
                                      </div>
                                      <span className="text-xs text-gray-600 dark:text-white/60">Purchasable</span>
                                    </label>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">SKU</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.sku ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, sku: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.sku || '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Storage Area</div>
                              {editingRowId === item.id ? (
                                <Select
                                  value={rowDraft?.storage_area_id ?? ''}
                                  onValueChange={(val) => setRowDraft((d: any) => ({ ...d, storage_area_id: val }))}
                                  options={[
                                    { label: 'Not assigned', value: '' },
                                    ...storageAreas.map((area) => ({
                                      label: `${area.name}${area.division ? ` (${area.division})` : ''}`,
                                      value: area.id
                                    }))
                                  ]}
                                  placeholder="Select storage area (optional)"
                                  className="w-full"
                                />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {item.storage_area_id 
                                    ? (() => {
                                        const area = storageAreas.find(a => a.id === item.storage_area_id);
                                        return area ? `${area.name}${area.division ? ` (${area.division})` : ''}` : '-';
                                      })()
                                    : '-'
                                  }
                                </div>
                              )}
                              <p className="text-xs text-gray-500 dark:text-white/40 mt-1">
                                Assign to a physical storage location for stock counting
                              </p>
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">
                                Current Stock {item.unit && <span className="text-emerald-500">({item.unit})</span>}
                              </div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.current_stock ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, current_stock: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">
                                  {item.current_stock != null ? item.current_stock : '0'}
                                  {item.unit && <span className="text-gray-500 dark:text-white/50 ml-1">{item.unit}</span>}
                                </div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">
                                Par Level {item.unit && <span className="text-emerald-500">({item.unit})</span>}
                              </div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.par_level ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, par_level: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">
                                  {item.par_level != null ? item.par_level : '-'}
                                  {item.par_level != null && item.unit && <span className="text-gray-500 dark:text-white/50 ml-1">{item.unit}</span>}
                                </div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">
                                Reorder Point {item.unit && <span className="text-emerald-500">({item.unit})</span>}
                              </div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.reorder_point ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, reorder_point: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">
                                  {item.reorder_point != null ? item.reorder_point : '-'}
                                  {item.reorder_point != null && item.unit && <span className="text-gray-500 dark:text-white/50 ml-1">{item.unit}</span>}
                                </div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">
                                Reorder Qty {item.unit && <span className="text-emerald-500">({item.unit})</span>}
                              </div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.reorder_qty ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, reorder_qty: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">
                                  {item.reorder_qty != null ? item.reorder_qty : '-'}
                                  {item.reorder_qty != null && item.unit && <span className="text-gray-500 dark:text-white/50 ml-1">{item.unit}</span>}
                                </div>
                              )}
                            </div>
                            {item.low_stock_alert && (
                              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3">
                                <div className="text-xs text-red-700 dark:text-red-400 font-semibold">⚠️ Low Stock Alert</div>
                              </div>
                            )}
                            
                            {/* Costing & Pricing Section */}
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs font-semibold text-gray-700 dark:text-white/80 mb-2 uppercase">Costing & Pricing</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Costing Method</div>
                                  {editingRowId === item.id ? (
                                    <select className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.costing_method || 'average'} onChange={(e) => setRowDraft((d: any) => ({ ...d, costing_method: e.target.value }))}>
                                      <option value="average">Average</option>
                                      <option value="fifo">FIFO</option>
                                      <option value="lifo">LIFO</option>
                                    </select>
                                  ) : (
                                    <div className="text-sm text-gray-900 dark:text-white font-medium capitalize">{item.costing_method || 'average'}</div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Yield %</div>
                                  {editingRowId === item.id ? (
                                    <input type="number" step="0.01" className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.yield_percent ?? 100} onChange={(e) => setRowDraft((d: any) => ({ ...d, yield_percent: e.target.value }))} />
                                  ) : (
                                    <div className="text-sm text-gray-900 dark:text-white font-medium">{item.yield_percent != null ? `${item.yield_percent}%` : '100%'}</div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Stock Value</div>
                                  <div className="text-sm text-gray-900 dark:text-white font-medium">{item.stock_value != null ? `£${item.stock_value.toFixed(2)}` : '£0.00'}</div>
                                </div>
                              </div>
                              {/* Recipe Cost Information for Prep Items */}
                              {item.is_prep_item && item.linked_recipe && item.recipe_cost && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">Recipe Cost Information</div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Total Recipe Cost</div>
                                      <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">£{item.recipe_cost.toFixed(2)}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Recipe Yield</div>
                                      <div className="text-sm text-gray-900 dark:text-white">{item.recipe_yield || item.linked_recipe.yield_qty || 1} {item.linked_recipe.yield_unit || item.unit || ''}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Unit Cost (Calculated)</div>
                                      <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">£{item.unit_cost_from_recipe?.toFixed(2) || '-'}</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Sales Channels Section */}
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs font-semibold text-gray-700 dark:text-white/80 mb-2 uppercase">Sales Channels</div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    {editingRowId === item.id ? (
                                      <input type="checkbox" checked={rowDraft?.is_retail_saleable ?? false} onChange={(e) => setRowDraft((d: any) => ({ ...d, is_retail_saleable: e.target.checked }))} style={{ accentColor: '#10B981' }} className="w-4 h-4 rounded border-emerald-500/50 bg-white dark:bg-neutral-900 text-emerald-500 focus:ring-emerald-500 focus:ring-2 checked:bg-emerald-500 checked:border-emerald-500" />
                                    ) : (
                                      <div className="relative w-4 h-4">
                                        <input type="checkbox" checked={item.is_retail_saleable ?? false} disabled className="sr-only" />
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${item.is_retail_saleable ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-neutral-900 border-emerald-500/30'}`}>
                                          {item.is_retail_saleable && <Check size={12} className="text-white" />}
                                        </div>
                                      </div>
                                    )}
                                    <label className="text-xs text-gray-600 dark:text-white/60">Retail Saleable</label>
                                  </div>
                                  {editingRowId === item.id ? (
                                    <input type="number" step="0.01" className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.retail_price ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, retail_price: e.target.value }))} placeholder="Retail price" />
                                  ) : (
                                    <div className="text-sm text-gray-900 dark:text-white font-medium">{item.retail_price != null ? `£${item.retail_price}` : '-'}</div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    {editingRowId === item.id ? (
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={rowDraft?.is_wholesale_saleable ?? false} onChange={(e) => setRowDraft((d: any) => ({ ...d, is_wholesale_saleable: e.target.checked }))} style={{ accentColor: '#10B981' }} className="w-4 h-4 rounded border-emerald-500/50 bg-white dark:bg-neutral-900 text-emerald-500 focus:ring-emerald-500 focus:ring-2 checked:bg-emerald-500 checked:border-emerald-500" />
                                        <span className="text-xs text-gray-600 dark:text-white/60">Wholesale Saleable</span>
                                      </label>
                                    ) : (
                                      <label className="flex items-center gap-2">
                                        <div className="relative w-4 h-4">
                                          <input type="checkbox" checked={item.is_wholesale_saleable ?? false} disabled className="sr-only" />
                                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${item.is_wholesale_saleable ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-neutral-900 border-emerald-500/30'}`}>
                                            {item.is_wholesale_saleable && <Check size={12} className="text-white" />}
                                          </div>
                                        </div>
                                        <span className="text-xs text-gray-600 dark:text-white/60">Wholesale Saleable</span>
                                      </label>
                                    )}
                                  </div>
                                  {editingRowId === item.id ? (
                                    <input type="number" step="0.01" className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.wholesale_price ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, wholesale_price: e.target.value }))} placeholder="Wholesale price" />
                                  ) : (
                                    <div className="text-sm text-gray-900 dark:text-white font-medium">{item.wholesale_price != null ? `£${item.wholesale_price}` : '-'}</div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    {editingRowId === item.id ? (
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={rowDraft?.is_online_saleable ?? false} onChange={(e) => setRowDraft((d: any) => ({ ...d, is_online_saleable: e.target.checked }))} style={{ accentColor: '#10B981' }} className="w-4 h-4 rounded border-emerald-500/50 bg-white dark:bg-neutral-900 text-emerald-500 focus:ring-emerald-500 focus:ring-2 checked:bg-emerald-500 checked:border-emerald-500" />
                                        <span className="text-xs text-gray-600 dark:text-white/60">Online Saleable</span>
                                      </label>
                                    ) : (
                                      <label className="flex items-center gap-2">
                                        <div className="relative w-4 h-4">
                                          <input type="checkbox" checked={item.is_online_saleable ?? false} disabled className="sr-only" />
                                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${item.is_online_saleable ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-neutral-900 border-emerald-500/30'}`}>
                                            {item.is_online_saleable && <Check size={12} className="text-white" />}
                                          </div>
                                        </div>
                                        <span className="text-xs text-gray-600 dark:text-white/60">Online Saleable</span>
                                      </label>
                                    )}
                                  </div>
                                  {editingRowId === item.id ? (
                                    <input type="number" step="0.01" className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.online_price ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, online_price: e.target.value }))} placeholder="Online price" />
                                  ) : (
                                    <div className="text-sm text-gray-900 dark:text-white font-medium">{item.online_price != null ? `£${item.online_price}` : '-'}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Yield Notes</div>
                              {editingRowId === item.id ? (
                                <textarea className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white min-h-[60px] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.yield_notes ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, yield_notes: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{item.yield_notes || '-'}</div>
                              )}
                            </div>
                            
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Notes</div>
                              {editingRowId === item.id ? (
                                <textarea className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white min-h-[80px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.notes ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, notes: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{item.notes || '-'}</div>
                              )}
                            </div>

                            {/* History Panel */}
                            {companyId && (
                              <IngredientHistoryPanel
                                ingredientId={item.id}
                                companyId={companyId}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            {editingRowId === item.id ? (
                              <>
                                <button onClick={() => saveRow(item.id)} className="px-3 py-2 rounded-lg border border-emerald-600 dark:border-emerald-500/60 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/10 hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-[0_0_14px_rgba(16,185,129,0.7)] transition flex items-center gap-2">
                                  <Save size={16} className="text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-gray-900 dark:text-white">Save</span>
                                </button>
                                <button onClick={() => cancelEdit(item.id)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-white/20 text-gray-700 dark:text-white bg-white dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/10 transition flex items-center gap-2">
                                  <X size={16} className="text-gray-600 dark:text-white/60" />
                                  <span className="text-gray-900 dark:text-white">Cancel</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button aria-label="Edit Ingredient" onClick={() => handleEdit(item)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-emerald-600 dark:border-emerald-500/60 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/10 hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-[0_0_14px_rgba(16,185,129,0.7)] transition">
                                  <Edit size={16} />
                                  <span className="sr-only">Edit</span>
                                </button>
                                <button aria-label="Delete Ingredient" onClick={() => handleDelete(item.id)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-600 dark:border-red-500/60 text-red-600 dark:text-red-400 bg-white dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/10 hover:border-red-500 dark:hover:border-red-400 hover:shadow-[0_0_14px_rgba(239,68,68,0.55)] transition">
                                  <Trash2 size={16} />
                                  <span className="sr-only">Delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Prep Item Recipe Dialog */}
      {showRecipeDialog && selectedIngredient && (
        <PrepItemRecipeDialog
          open={showRecipeDialog}
          onClose={() => {
            setShowRecipeDialog(false);
            setSelectedIngredient(null);
            // Reset the checkbox if user cancels
            if (rowDraft?.id === selectedIngredient.id) {
              setRowDraft((d: any) => ({ ...d, is_prep_item: false }));
            }
          }}
          ingredientId={selectedIngredient.id}
          ingredientName={selectedIngredient.ingredient_name}
          ingredientData={selectedIngredient}
          companyId={companyId || ''}
          userId={user?.id || ''}
          onRecipeCreated={(recipeId) => {
            // Update the draft to reflect prep item status
            if (rowDraft?.id === selectedIngredient.id) {
              setRowDraft((d: any) => ({ ...d, is_prep_item: true }));
            }
            // Reload ingredients to show updated state
            loadIngredients();
            toast.success('Recipe created! You can now add ingredients to the recipe.');
          }}
          onIngredientSaved={(savedIngredient) => {
            // Update local state to replace temp ingredient with saved one
            setIngredients((prev: any[]) => prev.map((ing: any) =>
              ing.id === selectedIngredient.id ? savedIngredient : ing
            ));
            setSelectedIngredient(savedIngredient);
            // Clear temp row tracking
            setNewRowIds((prev: Set<string>) => {
              const n = new Set(prev);
              n.delete(selectedIngredient.id);
              return n;
            });
          }}
        />
      )}
      </div>
    </div>
  );
}


