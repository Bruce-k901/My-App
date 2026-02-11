"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, ChevronDown, ChevronRight, Check } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import Select from '@/components/ui/Select';
import { fuzzyMatchUnit, normalizeUnitText, type UOM } from '@/lib/utils/unitLookup';
import { generateSKU, extractPrefix } from '@/lib/utils/skuGenerator';
import { handlePrepItemToggle } from '@/lib/utils/prepItemRecipeFlow';
// toast removed per project policy

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
  const [filterCategory, setFilterCategory] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<any | null>(null);
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const [uomList, setUomList] = useState<UOM[]>([]);
  const [unitSearchQuery, setUnitSearchQuery] = useState<Record<string, string>>({});

  const isFetchingRef = useRef(false);
  const loadIngredients = async () => {
    if (isFetchingRef.current) return;
    if (!companyId) { setLoading(false); return; }
    let isCancelled = false;
    try {
      isFetchingRef.current = true;
      setLoading(true);
      // Load ingredients with linked recipe data
      const { data, error } = await supabase
        .from('ingredients_library')
        .select(`
          *,
          linked_recipe:linked_recipe_id (
            id,
            recipe_status,
            is_active
          )
        `)
        .eq('company_id', companyId)
        .order('ingredient_name');
      if (error) throw error;
      if (!isCancelled) setIngredients(data || []);
    } catch (error: any) {
      console.error('Error loading ingredients:', error);
    } finally {
      if (!isCancelled) setLoading(false);
      isFetchingRef.current = false;
    }
    return () => { isCancelled = true; };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadIngredients();
    })();
    return () => { cancelled = true; };
  }, [companyId]);

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
      // Auto-calculate unit cost if pack cost and pack size are provided
      let finalUnitCost = unitCostVal;
      if (packCostVal && packSizeVal && packSizeVal > 0 && (!unitCostVal || rowDraft.unit_cost_auto_calculated)) {
        finalUnitCost = packCostVal / packSizeVal;
      }

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
      
      // Validate prep item supplier requirement
      const isPrepItem = rowDraft.is_prep_item ?? false;
      let finalSupplier = rowDraft.supplier?.trim() || null;
      if (isPrepItem && !finalSupplier) {
        // Default to "CPU" if supplier is empty for prep items
        finalSupplier = 'CPU';
      }
      
      const payload: any = {
        ingredient_name: trimmedName,
        category: rowDraft.category ?? null,
        allergens: allergensVal,
        unit: rowDraft.unit ?? null,
        unit_cost: finalUnitCost,
        supplier: finalSupplier,
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
        
        // Handle prep item toggle for new ingredients
        if (isPrepItem && user?.id && companyId) {
          try {
            await handlePrepItemToggle(data.id, isPrepItem, companyId, user.id);
            console.info('Prep item recipe placeholder created');
          } catch (prepError: any) {
            console.error('Error creating prep item recipe:', prepError);
            // Don't throw - ingredient was saved successfully, recipe creation can be retried
          }
        }
        
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
        
        // Handle prep item toggle for updated ingredients
        if (user?.id && companyId) {
          try {
            // Check if is_prep_item changed
            if (isPrepItem !== previousIsPrepItem) {
              await handlePrepItemToggle(id, isPrepItem, companyId, user.id);
              if (isPrepItem) {
                console.info('Prep item recipe placeholder created');
              } else {
                console.info('Prep item recipe disabled');
              }
            }
          } catch (prepError: any) {
            console.error('Error handling prep item toggle:', prepError);
            // Don't throw - ingredient was updated successfully
          }
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
      is_saleable: item.is_saleable ?? false,
      sale_price: item.sale_price ?? ''
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

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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
        is_saleable: r.is_saleable ? 'true' : 'false',
        sale_price: r.sale_price ?? '',
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

  const filteredItems = ingredients.filter((item: any) => {
    const matchesSearch = (item.ingredient_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-[#D37E91] rounded-full"></div>
            <div>
              <h1 className="text-lg font-semibold text-white">Ingredients Library</h1>
              <p className="text-sm text-neutral-400">Manage ingredients, allergens, and costs</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleUploadClick} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white flex items-center gap-2">
            <Upload size={16} />
            Upload CSV
          </button>
          <button onClick={handleDownloadCSV} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white flex items-center gap-2">
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
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-[0_0_14px_rgba(233,0,126,0.55)] transition"
          >
            <Plus size={18} />
            <span className="sr-only">Add Ingredient</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ingredients..."
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Categories</option>
          {INGREDIENT_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-neutral-400 text-center py-8">Loading ingredients...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-neutral-700">
          <p className="text-neutral-400">No ingredients found.</p>
        </div>
      ) : (
        <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-900">
              <tr>
                <th className="w-10 px-2" aria-label="Expand" />
                <th className="text-left px-4 py-3 font-semibold text-magenta-400 text-[0.95rem]">Name</th>
                <th className="text-left px-2 py-3 font-semibold text-magenta-400 text-[0.95rem]">Category</th>
                <th className="text-left px-2 py-3 font-semibold text-magenta-400 text-[0.95rem]">Unit</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: any) => {
                const expanded = expandedRows.has(item.id);
                return (
                  <React.Fragment key={item.id}>
                    <tr className="border-t border-neutral-700 hover:bg-neutral-800/50">
                      <td className="px-2 py-3 align-top">
                        <button aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => toggleRow(item.id)} className="p-1 rounded hover:bg-neutral-800 text-neutral-300">
                          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-white">
                        {editingRowId === item.id ? (
                          <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.ingredient_name ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, ingredient_name: e.target.value }))} />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{item.ingredient_name}</span>
                            {/* Prep Item Recipe Status Indicators */}
                            {item.is_prep_item && item.linked_recipe && (
                              <>
                                {item.linked_recipe.recipe_status === 'active' && item.linked_recipe.is_active ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#D37E91]/15 text-[#D37E91] border border-[#D37E91]/20">
                                    ✓ Recipe Active
                                  </span>
                                ) : item.linked_recipe.recipe_status === 'draft' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20 italic">
                                    ⚠ Recipe Draft
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    Recipe Disabled
                                  </span>
                                )}
                              </>
                            )}
                            {item.supplier && (
                              <span className="text-neutral-400 text-sm">• {item.supplier}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3 text-neutral-400 text-sm whitespace-nowrap">
                        {editingRowId === item.id ? (
                          <select className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.category ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, category: e.target.value }))}>
                            <option value="">Select...</option>
                            {INGREDIENT_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                          </select>
                        ) : (
                          item.category || '-'
                        )}
                      </td>
                      <td className="px-2 py-3 text-neutral-400 text-sm whitespace-nowrap">
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
                      <tr className="border-t border-neutral-800/60">
                        <td colSpan={4} className="px-4 py-4 bg-neutral-900/40">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Supplier</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.supplier ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, supplier: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.supplier || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Unit Cost</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.unit_cost ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, unit_cost: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.unit_cost ? `£${item.unit_cost}` : '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Pack Size</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.pack_size ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, pack_size: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.pack_size != null ? item.pack_size : '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Pack Cost</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.pack_cost ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, pack_cost: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.pack_cost != null ? `£${item.pack_cost}` : '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs text-neutral-400 mb-2">Allergens (UK 14)</div>
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
                                          style={{ accentColor: '#D37E91' }}
                                          className="w-4 h-4 rounded border-[#D37E91]/50 bg-neutral-900 text-[#D37E91] focus:ring-[#D37E91] focus:ring-2 checked:bg-[#D37E91] checked:border-[#D37E91]"
                                        />
                                        <span className="text-xs text-white">{allergen}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-sm text-white">
                                  {(item.allergens || []).length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {(item.allergens || []).map((allergen: string) => (
                                        <span key={allergen} className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs">
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
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs font-semibold text-neutral-300 mb-2 uppercase">Stock Management</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="flex items-center gap-2">
                                  {editingRowId === item.id ? (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="checkbox" checked={rowDraft?.track_stock ?? false} onChange={(e) => setRowDraft((d: any) => ({ ...d, track_stock: e.target.checked }))} style={{ accentColor: '#D37E91' }} className="w-4 h-4 rounded border-[#D37E91]/50 bg-neutral-900 text-[#D37E91] focus:ring-[#D37E91] focus:ring-2 checked:bg-[#D37E91] checked:border-[#D37E91]" />
                                      <span className="text-xs text-neutral-400">Track Stock</span>
                                    </label>
                                  ) : (
                                    <label className="flex items-center gap-2">
                                      <div className="relative w-4 h-4">
                                        <input type="checkbox" checked={item.track_stock ?? false} disabled className="sr-only" />
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${item.track_stock ? 'bg-[#D37E91] border-[#D37E91]' : 'bg-neutral-900 border-[#D37E91]/30'}`}>
                                          {item.track_stock && <Check size={12} className="text-white" />}
                                        </div>
                                      </div>
                                      <span className="text-xs text-neutral-400">Track Stock</span>
                                    </label>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {editingRowId === item.id ? (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="checkbox" checked={rowDraft?.is_prep_item ?? false} onChange={(e) => setRowDraft((d: any) => ({ ...d, is_prep_item: e.target.checked }))} style={{ accentColor: '#D37E91' }} className="w-4 h-4 rounded border-[#D37E91]/50 bg-neutral-900 text-[#D37E91] focus:ring-[#D37E91] focus:ring-2 checked:bg-[#D37E91] checked:border-[#D37E91]" />
                                      <span className="text-xs text-neutral-400">Prep Item</span>
                                    </label>
                                  ) : (
                                    <label className="flex items-center gap-2">
                                      <div className="relative w-4 h-4">
                                        <input type="checkbox" checked={item.is_prep_item ?? false} disabled className="sr-only" />
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${item.is_prep_item ? 'bg-[#D37E91] border-[#D37E91]' : 'bg-neutral-900 border-[#D37E91]/30'}`}>
                                          {item.is_prep_item && <Check size={12} className="text-white" />}
                                        </div>
                                      </div>
                                      <span className="text-xs text-neutral-400">Prep Item</span>
                                    </label>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {editingRowId === item.id ? (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="checkbox" checked={rowDraft?.is_purchasable ?? true} onChange={(e) => setRowDraft((d: any) => ({ ...d, is_purchasable: e.target.checked }))} style={{ accentColor: '#D37E91' }} className="w-4 h-4 rounded border-[#D37E91]/50 bg-neutral-900 text-[#D37E91] focus:ring-[#D37E91] focus:ring-2 checked:bg-[#D37E91] checked:border-[#D37E91]" />
                                      <span className="text-xs text-neutral-400">Purchasable</span>
                                    </label>
                                  ) : (
                                    <label className="flex items-center gap-2">
                                      <div className="relative w-4 h-4">
                                        <input type="checkbox" checked={item.is_purchasable ?? true} disabled className="sr-only" />
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${item.is_purchasable ? 'bg-[#D37E91] border-[#D37E91]' : 'bg-neutral-900 border-[#D37E91]/30'}`}>
                                          {item.is_purchasable && <Check size={12} className="text-white" />}
                                        </div>
                                      </div>
                                      <span className="text-xs text-neutral-400">Purchasable</span>
                                    </label>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">
                                SKU
                                {editingRowId === item.id && !rowDraft?.sku && (
                                  <span className="ml-2 text-emerald-400 text-[10px]">(Auto-generated on save)</span>
                                )}
                              </div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.sku ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, sku: e.target.value }))} placeholder="Auto-generated if empty" />
                              ) : (
                                <div className="text-sm text-white font-mono">{item.sku || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Current Stock</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.current_stock ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, current_stock: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.current_stock != null ? item.current_stock : '0'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Par Level</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.par_level ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, par_level: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.par_level != null ? item.par_level : '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Reorder Point</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.reorder_point ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, reorder_point: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.reorder_point != null ? item.reorder_point : '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Reorder Qty</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.reorder_qty ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, reorder_qty: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.reorder_qty != null ? item.reorder_qty : '-'}</div>
                              )}
                            </div>
                            {item.low_stock_alert && (
                              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                <div className="text-xs text-red-400 font-semibold">⚠️ Low Stock Alert</div>
                              </div>
                            )}
                            
                            {/* Costing & Pricing Section */}
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs font-semibold text-neutral-300 mb-2 uppercase">Costing & Pricing</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                  <div className="text-xs text-neutral-400 mb-1">Costing Method</div>
                                  {editingRowId === item.id ? (
                                    <select className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white text-sm" value={rowDraft?.costing_method || 'average'} onChange={(e) => setRowDraft((d: any) => ({ ...d, costing_method: e.target.value }))}>
                                      <option value="average">Average</option>
                                      <option value="fifo">FIFO</option>
                                      <option value="lifo">LIFO</option>
                                    </select>
                                  ) : (
                                    <div className="text-sm text-white capitalize">{item.costing_method || 'average'}</div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs text-neutral-400 mb-1">Yield %</div>
                                  {editingRowId === item.id ? (
                                    <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.yield_percent ?? 100} onChange={(e) => setRowDraft((d: any) => ({ ...d, yield_percent: e.target.value }))} />
                                  ) : (
                                    <div className="text-sm text-white">{item.yield_percent != null ? `${item.yield_percent}%` : '100%'}</div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs text-neutral-400 mb-1">Stock Value</div>
                                  <div className="text-sm text-white">{item.stock_value != null ? `£${item.stock_value.toFixed(2)}` : '£0.00'}</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Sales Channels Section */}
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs font-semibold text-neutral-300 mb-2 uppercase">Sales Channels</div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    {editingRowId === item.id ? (
                                      <input type="checkbox" checked={rowDraft?.is_retail_saleable ?? false} onChange={(e) => setRowDraft((d: any) => ({ ...d, is_retail_saleable: e.target.checked }))} style={{ accentColor: '#D37E91' }} className="w-4 h-4 rounded border-[#D37E91]/50 bg-neutral-900 text-[#D37E91] focus:ring-[#D37E91] focus:ring-2 checked:bg-[#D37E91] checked:border-[#D37E91]" />
                                    ) : (
                                      <input type="checkbox" checked={item.is_retail_saleable ?? false} disabled className="w-4 h-4 rounded border-[#D37E91]/30 bg-neutral-900" />
                                    )}
                                    <label className="text-xs text-neutral-400">Retail Saleable</label>
                                  </div>
                                  {editingRowId === item.id ? (
                                    <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white text-sm" value={rowDraft?.retail_price ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, retail_price: e.target.value }))} placeholder="Retail price" />
                                  ) : (
                                    <div className="text-sm text-white">{item.retail_price != null ? `£${item.retail_price}` : '-'}</div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    {editingRowId === item.id ? (
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={rowDraft?.is_wholesale_saleable ?? false} onChange={(e) => setRowDraft((d: any) => ({ ...d, is_wholesale_saleable: e.target.checked }))} style={{ accentColor: '#D37E91' }} className="w-4 h-4 rounded border-[#D37E91]/50 bg-neutral-900 text-[#D37E91] focus:ring-[#D37E91] focus:ring-2 checked:bg-[#D37E91] checked:border-[#D37E91]" />
                                        <span className="text-xs text-neutral-400">Wholesale Saleable</span>
                                      </label>
                                    ) : (
                                      <label className="flex items-center gap-2">
                                        <div className="relative w-4 h-4">
                                          <input type="checkbox" checked={item.is_wholesale_saleable ?? false} disabled className="sr-only" />
                                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${item.is_wholesale_saleable ? 'bg-[#D37E91] border-[#D37E91]' : 'bg-neutral-900 border-[#D37E91]/30'}`}>
                                            {item.is_wholesale_saleable && <Check size={12} className="text-white" />}
                                          </div>
                                        </div>
                                        <span className="text-xs text-neutral-400">Wholesale Saleable</span>
                                      </label>
                                    )}
                                  </div>
                                  {editingRowId === item.id ? (
                                    <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white text-sm" value={rowDraft?.wholesale_price ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, wholesale_price: e.target.value }))} placeholder="Wholesale price" />
                                  ) : (
                                    <div className="text-sm text-white">{item.wholesale_price != null ? `£${item.wholesale_price}` : '-'}</div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    {editingRowId === item.id ? (
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={rowDraft?.is_online_saleable ?? false} onChange={(e) => setRowDraft((d: any) => ({ ...d, is_online_saleable: e.target.checked }))} style={{ accentColor: '#D37E91' }} className="w-4 h-4 rounded border-[#D37E91]/50 bg-neutral-900 text-[#D37E91] focus:ring-[#D37E91] focus:ring-2 checked:bg-[#D37E91] checked:border-[#D37E91]" />
                                        <span className="text-xs text-neutral-400">Online Saleable</span>
                                      </label>
                                    ) : (
                                      <label className="flex items-center gap-2">
                                        <div className="relative w-4 h-4">
                                          <input type="checkbox" checked={item.is_online_saleable ?? false} disabled className="sr-only" />
                                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${item.is_online_saleable ? 'bg-[#D37E91] border-[#D37E91]' : 'bg-neutral-900 border-[#D37E91]/30'}`}>
                                            {item.is_online_saleable && <Check size={12} className="text-white" />}
                                          </div>
                                        </div>
                                        <span className="text-xs text-neutral-400">Online Saleable</span>
                                      </label>
                                    )}
                                  </div>
                                  {editingRowId === item.id ? (
                                    <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white text-sm" value={rowDraft?.online_price ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, online_price: e.target.value }))} placeholder="Online price" />
                                  ) : (
                                    <div className="text-sm text-white">{item.online_price != null ? `£${item.online_price}` : '-'}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs text-neutral-400 mb-1">Yield Notes</div>
                              {editingRowId === item.id ? (
                                <textarea className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white min-h-[60px] text-sm" value={rowDraft?.yield_notes ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, yield_notes: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white whitespace-pre-wrap">{item.yield_notes || '-'}</div>
                              )}
                            </div>
                            
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs text-neutral-400">Notes</div>
                              {editingRowId === item.id ? (
                                <textarea className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white min-h-[80px]" value={rowDraft?.notes ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, notes: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white whitespace-pre-wrap">{item.notes || '-'}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            {editingRowId === item.id ? (
                              <>
                                <button onClick={() => saveRow(item.id)} className="px-3 py-2 rounded-lg border border-magenta-500/60 text-white bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-[0_0_14px_rgba(233,0,126,0.55)] transition flex items-center gap-2">
                                  <Save size={16} className="text-magenta-400" />
                                  <span>Save</span>
                                </button>
                                <button onClick={() => cancelEdit(item.id)} className="px-3 py-2 rounded-lg border border-neutral-600 text-white bg-white/5 backdrop-blur-sm hover:bg-white/10 transition flex items-center gap-2">
                                  <X size={16} className="text-neutral-300" />
                                  <span>Cancel</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button aria-label="Edit Ingredient" onClick={() => handleEdit(item)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-[0_0_14px_rgba(233,0,126,0.55)] transition">
                                  <Edit size={16} />
                                  <span className="sr-only">Edit</span>
                                </button>
                                <button aria-label="Delete Ingredient" onClick={() => handleDelete(item.id)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-500/60 text-red-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-red-400 hover:shadow-[0_0_14px_rgba(239,68,68,0.55)] transition">
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

      {/* Inline add/edit pattern applied; modal removed */}
    </div>
  );
}


