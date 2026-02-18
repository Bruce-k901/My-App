'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, ExternalLink, AlertTriangle, ChevronDown, ChevronUp, X, Plus, Trash2, Search, FileText, Save, Edit, Pencil, Package } from '@/components/ui/icons';
import Link from 'next/link';
import { ModuleReferences } from '@/lib/module-references';
import { useWasteTasks } from '@/hooks/useModuleReferences';
import { format } from 'date-fns';
import BatchSelector from '@/components/stockly/BatchSelector'; // @salsa

interface StockItem {
  id: string;
  name: string;
  stock_unit: string;
}

const WASTE_REASONS = [
  { value: 'expired', label: 'Expired', icon: '📅' },
  { value: 'damaged', label: 'Damaged', icon: '💔' },
  { value: 'quality', label: 'Quality/Spoiled', icon: '🤢' },
  { value: 'spillage', label: 'Spillage', icon: '💧' },
  { value: 'overproduction', label: 'Overproduction', icon: '📦' },
  { value: 'temperature_breach', label: 'Temperature Breach', icon: '🌡️' },
  { value: 'pest_damage', label: 'Pest Damage', icon: '🐛' },
  { value: 'theft', label: 'Theft/Loss', icon: '🚨' },
  { value: 'prep_waste', label: 'Prep Waste', icon: '🔪' },
  { value: 'customer_return', label: 'Customer Return', icon: '↩️' },
  { value: 'other', label: 'Other', icon: '📝' },
];

// Normalize old/invalid reason values to valid ones
function normalizeWasteReason(reason: string): string {
  if (reason === 'spoiled') return 'quality';
  const validReasons = WASTE_REASONS.map(r => r.value);
  if (validReasons.includes(reason)) return reason;
  return 'other';
}

export default function WasteLogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { companyId, siteId, userId, profile } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Check if viewing a specific waste log detail
  const wasteId = searchParams.get('id');
  const taskId = searchParams.get('taskId'); // Optional taskId for linking
  
  // Batch entry state
  const [wasteLines, setWasteLines] = useState<Array<{
    id: string;
    stock_item_id: string | null;
    name: string;
    quantity: number;
    unit: string;
    unit_cost: number;
    line_cost: number;
    reason: string;
    notes: string;
    current_stock?: number;
    stock_warning?: boolean;
    batch_id?: string | null; // @salsa — linked batch for SALSA traceability
  }>>([]);
  const [wasteDate, setWasteDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [globalNotes, setGlobalNotes] = useState<string>('');
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Waste logs history
  const [wasteLogsHistory, setWasteLogsHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateLines, setTemplateLines] = useState<Array<{
    id: string;
    stock_item_id: string | null;
    name: string;
    quantity: number;
    unit: string;
    default_reason: string;
    notes: string;
  }>>([]);
  const [templateItemSearch, setTemplateItemSearch] = useState('');
  const [templateSearchResults, setTemplateSearchResults] = useState<any[]>([]);
  const [loadingTemplateSearch, setLoadingTemplateSearch] = useState(false);
  const [showTemplateSearchResults, setShowTemplateSearchResults] = useState(false);
  const templateSearchRef = useRef<HTMLDivElement>(null);

  // Waste detail state
  const [wasteLog, setWasteLog] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['details']));

  // Get linked tasks for this waste record
  const { data: linkedTasks, isLoading: loadingTasks } = useWasteTasks(wasteId);

  useEffect(() => {
    if (wasteId && companyId) {
      loadWasteDetail();
    } else {
      setLoading(false);
      // Load waste logs history and templates when not viewing a specific log
      if (companyId) {
        loadWasteLogsHistory();
        loadTemplates();
      }
    }
  }, [wasteId, companyId]);

  async function getStockItemDetails(stockItemId: string): Promise<any> {
    if (!companyId) return null;

    try {
      // Get stock item basic info with library link
      const { data: item, error: itemError } = await supabase
        .from('stock_items')
        .select('id, name, stock_unit, library_item_id, library_type')
        .eq('id', stockItemId)
        .eq('company_id', companyId)
        .maybeSingle();

      if (itemError) throw itemError;
      if (!item) return null;

      // Get stock level
      let stockLevelQuery = supabase
        .from('stock_levels')
        .select('quantity')
        .eq('stock_item_id', stockItemId);
      
      if (siteId) {
        stockLevelQuery = stockLevelQuery.eq('site_id', siteId);
      }
      
      const { data: stockLevel } = await stockLevelQuery.maybeSingle();

      // Try to get cost from ingredient library first (most accurate)
      let unitCost = 0;
      let unit = item.stock_unit || 'unit';
      
      if (item.library_type === 'ingredients_library' && item.library_item_id) {
        try {
          const { data: ingredient, error: ingredientError } = await supabase
            .from('ingredients_library')
            .select('unit_cost, unit, pack_cost, pack_size, yield_percent')
            .eq('id', item.library_item_id)
            .eq('company_id', companyId)
            .maybeSingle();

          if (!ingredientError && ingredient) {
            // Calculate unit cost from pack if available
            if (ingredient.pack_cost && ingredient.pack_size) {
              const packCost = parseFloat(ingredient.pack_cost.toString());
              const packSize = parseFloat(ingredient.pack_size.toString());
              const yieldPercent = parseFloat(ingredient.yield_percent?.toString() || '100');
              
              if (packCost > 0 && packSize > 0) {
                const effectivePackSize = packSize * (yieldPercent / 100);
                if (effectivePackSize > 0) {
                  unitCost = packCost / effectivePackSize;
                  unit = ingredient.unit || item.stock_unit || 'g';
                  console.log(`[Waste] Calculated unit cost from pack: ${unitCost} per ${unit} (pack: £${packCost} / ${packSize} * ${yieldPercent}%)`);
                }
              }
            } else if (ingredient.unit_cost) {
              // Use direct unit cost if available
              unitCost = parseFloat(ingredient.unit_cost.toString());
              unit = ingredient.unit || item.stock_unit || 'g';
              console.log(`[Waste] Using direct unit cost: ${unitCost} per ${unit}`);
            } else {
              console.warn(`[Waste] No cost found for ingredient ${item.library_item_id}`);
            }
          }
        } catch (error) {
          console.warn('Could not fetch ingredient library cost:', error);
        }
      }

      // Fallback to product variant price if no library cost found
      if (unitCost === 0) {
        try {
          const { data: variants, error: variantError } = await supabase
            .from('product_variants')
            .select('unit_cost, unit_price, is_preferred')
            .eq('stock_item_id', stockItemId)
            .eq('is_active', true)
            .order('is_preferred', { ascending: false })
            .limit(1);

          if (!variantError && variants && variants.length > 0) {
            unitCost = variants[0]?.unit_cost || variants[0]?.unit_price || 0;
          }
        } catch (error) {
          console.warn('Could not fetch product variant price:', error);
        }
      }

      return {
        id: item.id,
        name: item.name,
        stock_unit: unit,
        current_quantity: stockLevel?.quantity || 0,
        unit_cost: unitCost
      };
    } catch (error) {
      console.error('Error fetching stock item details:', error);
      return null;
    }
  }

  async function handleItemSelect(stockItemId: string, stockItem?: any) {
    // Check if item is already in the list
    if (wasteLines.some(line => line.stock_item_id === stockItemId)) {
      toast.error('Item already added to waste list');
      return;
    }

    // Handle library items that don't have stock_items yet
    let actualStockItemId = stockItemId;
    let itemData = stockItem;
    
    if (stockItem?.source === 'library' && stockItem?.library_data) {
      // Need to create or find stock_item for this library item
      try {
        // Check if stock_item already exists
        const { data: existingStock, error: checkError } = await supabase
          .from('stock_items')
          .select('id, name, description, stock_unit, library_item_id, library_type')
          .eq('company_id', companyId)
          .eq('library_item_id', stockItem.library_item_id)
          .eq('library_type', stockItem.library_type)
          .eq('is_active', true)
          .maybeSingle();
        
        if (existingStock && !checkError) {
          actualStockItemId = existingStock.id;
          itemData = existingStock;
        } else {
          // Create stock_item from library item
          const libData = stockItem.library_data;
          const nameField = stockItem.library_type === 'ingredients_library' ? 'ingredient_name' : 'item_name';
          const itemName = libData[nameField] || libData.name || 'Unknown Item';
          
          const { data: newStockItem, error: createError } = await supabase
            .from('stock_items')
            .insert({
              company_id: companyId,
              name: itemName,
              description: libData.description || libData.notes || '',
              stock_unit: stockItem.stock_unit || 'unit',
              library_item_id: stockItem.library_item_id,
              library_type: stockItem.library_type,
              is_active: true
            })
            .select('id, name, description, stock_unit, library_item_id, library_type')
            .single();
          
          if (createError || !newStockItem) {
            throw new Error(createError?.message || 'Failed to create stock item');
          }
          
          actualStockItemId = newStockItem.id;
          itemData = newStockItem;
          toast.success(`Created stock item: ${itemName}`);
        }
      } catch (error: any) {
        console.error('[Waste] Error creating stock item from library:', error);
        toast.error(`Failed to add item: ${error.message || 'Unknown error'}`);
        return;
      }
    }

    // Get full stock item details
    const itemDetails = await getStockItemDetails(actualStockItemId);
    
    const currentStock = itemDetails?.current_quantity || 0;
    const unitCost = itemDetails?.unit_cost || 0;
    const newLine = {
      id: `temp-${Date.now()}-${Math.random()}`,
      stock_item_id: actualStockItemId,
      name: itemDetails?.name || itemData?.name || stockItem?.display_name || 'Unknown Item',
      quantity: 1,
      unit: itemDetails?.stock_unit || itemData?.stock_unit || stockItem?.stock_unit || 'unit',
      unit_cost: unitCost,
      line_cost: 1 * unitCost, // Calculate initial cost
      reason: 'quality',
      notes: '',
      current_stock: currentStock,
      stock_warning: 1 > currentStock
    };
    
    console.log(`[Waste] Added item: ${newLine.name}, unit_cost: ${unitCost}, line_cost: ${newLine.line_cost}`);
    
    setWasteLines([...wasteLines, newLine]);
    setItemSearchTerm('');
    setShowSearchResults(false);
    setSearchResults([]);
    toast.success(`Added: ${newLine.name}`);
  }

  // Search stock items
  useEffect(() => {
    if (!companyId) return;

    if (itemSearchTerm.trim()) {
      const timer = setTimeout(() => {
        searchStockItems();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [itemSearchTerm, companyId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSearchResults]);

  async function searchStockItems() {
    if (!companyId || !itemSearchTerm.trim()) return;
    
    setLoadingSearch(true);
    try {
      const searchTerm = itemSearchTerm.trim().toLowerCase();
      const selectedIds = wasteLines.map(l => l.stock_item_id).filter(Boolean);
      
      console.log(`[Waste Search] Searching for: "${searchTerm}"`);
      
      const allResults: any[] = [];
      
      // 1. Search stock_items first
      try {
        let stockQuery = supabase
          .from('stock_items')
          .select('id, name, description, stock_unit, library_item_id, library_type')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .limit(100)
          .order('name');
        
        const { data: stockData, error: stockError } = await stockQuery;
        
        if (!stockError && stockData) {
          stockData.forEach(item => {
            allResults.push({
              ...item,
              source: 'stock_item',
              display_name: item.name
            });
          });
          console.log(`[Waste Search] Found ${stockData.length} stock items`);
        }
      } catch (err) {
        console.warn('[Waste Search] Error searching stock_items:', err);
      }
      
      // 2. Search all library tables
      const libraries = [
        { table: 'ingredients_library', nameField: 'ingredient_name', unitField: 'unit' },
        { table: 'disposables_library', nameField: 'item_name', unitField: 'unit' },
        { table: 'chemicals_library', nameField: 'product_name', unitField: 'unit' },
        { table: 'ppe_library', nameField: 'item_name', unitField: 'unit' },
        { table: 'drinks_library', nameField: 'item_name', unitField: 'unit' },
        { table: 'packaging_library', nameField: 'item_name', unitField: 'unit' },
        { table: 'glassware_library', nameField: 'item_name', unitField: 'unit' },
        { table: 'serving_equipment_library', nameField: 'item_name', unitField: 'unit' }
      ];
      
      for (const lib of libraries) {
        try {
          // Search the library table
          let libQuery = supabase
            .from(lib.table)
            .select('*')
            .eq('company_id', companyId);
          
          // Build search on name field
          libQuery = libQuery.ilike(lib.nameField, `%${searchTerm}%`);
          libQuery = libQuery.limit(50).order(lib.nameField);
          
          const { data: libData, error: libError } = await libQuery;
          
          if (!libError && libData) {
            // For each library item, find or create corresponding stock_item
            for (const libItem of libData) {
              const displayName = libItem[lib.nameField] || libItem.name || 'Unknown';
              
              // Check if stock_item already exists for this library item
              const existingStockItem = allResults.find(r => 
                r.library_item_id === libItem.id && 
                r.library_type === lib.table
              );
              
              if (!existingStockItem) {
                // Try to find existing stock_item
                const { data: existingStock, error: stockCheckError } = await supabase
                  .from('stock_items')
                  .select('id, name, description, stock_unit, library_item_id, library_type')
                  .eq('company_id', companyId)
                  .eq('library_item_id', libItem.id)
                  .eq('library_type', lib.table)
                  .eq('is_active', true)
                  .maybeSingle();
                
                if (existingStock && !stockCheckError) {
                  // Use existing stock_item
                  allResults.push({
                    ...existingStock,
                    source: 'stock_item',
                    display_name: existingStock.name
                  });
                } else {
                  // Create a virtual result for library item (will need to create stock_item on selection)
                  allResults.push({
                    id: `lib_${lib.table}_${libItem.id}`, // Temporary ID
                    name: displayName,
                    description: libItem.description || libItem.notes || '',
                    stock_unit: libItem[lib.unitField] || libItem.unit || 'unit',
                    library_item_id: libItem.id,
                    library_type: lib.table,
                    library_data: libItem, // Store full library item data
                    source: 'library',
                    display_name: displayName
                  });
                }
              }
            }
            console.log(`[Waste Search] Found ${libData.length} items in ${lib.table}`);
          }
        } catch (err) {
          console.warn(`[Waste Search] Error searching ${lib.table}:`, err);
        }
      }
      
      // Filter out selected items and deduplicate
      const filtered = allResults.filter(item => {
        // Skip if already selected
        if (selectedIds.includes(item.id)) return false;
        // Skip if it's a library item that already has a stock_item in results
        if (item.source === 'library') {
          const hasStockItem = allResults.some(r => 
            r.source === 'stock_item' && 
            r.library_item_id === item.library_item_id &&
            r.library_type === item.library_type
          );
          return !hasStockItem;
        }
        return true;
      });
      
      // Remove duplicates based on library_item_id + library_type
      const uniqueResults = filtered.filter((item, index, self) => 
        index === self.findIndex(t => 
          (t.library_item_id && t.library_type) ? 
            t.library_item_id === item.library_item_id && t.library_type === item.library_type :
            t.id === item.id
        )
      );
      
      console.log(`[Waste Search] Total results: ${uniqueResults.length} (${allResults.length} before filtering)`);
      setSearchResults(uniqueResults);
      setShowSearchResults(true);
    } catch (error: any) {
      console.error('[Waste Search] Error searching:', error);
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  }

  function updateLine(lineId: string, updates: Partial<typeof wasteLines[0]>) {
    setWasteLines(prev => prev.map(line => {
      if (line.id !== lineId) return line;
      
      const updated = { ...line, ...updates };
      
      // Normalize reason
      if (updates.reason !== undefined) {
        updated.reason = normalizeWasteReason(updates.reason);
      }
      
      // Always recalculate line cost - use current values from updated line
      const quantity = updated.quantity || 0;
      const unitCost = updated.unit_cost || 0;
      updated.line_cost = quantity * unitCost;
      
      // Update stock warning
      if (updated.current_stock !== undefined) {
        updated.stock_warning = quantity > updated.current_stock;
      }
      
      return updated;
    }));
  }

  function removeLine(lineId: string) {
    setWasteLines(prev => prev.filter(line => line.id !== lineId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (wasteLines.length === 0) {
      toast.error('Please add at least one item to waste');
      return;
    }

    // Filter to lines with valid stock items and quantity > 0 (skip zero-qty template items)
    const validLines = wasteLines.filter(line =>
      line.stock_item_id && line.quantity > 0
    );

    if (validLines.length === 0) {
      toast.error('Please ensure at least one item has a quantity greater than 0');
      return;
    }

    if (!companyId) {
      toast.error('Company ID is required');
      return;
    }

    setSaving(true);

    try {
      // Normalize all reasons
      const normalizedLines = validLines.map(line => ({
        ...line,
        reason: normalizeWasteReason(line.reason)
      }));

      // Group lines by reason to create separate waste logs (or combine into one)
      // For simplicity, we'll create one waste log with all items
      const totalCost = normalizedLines.reduce((sum, line) => sum + line.line_cost, 0);
      const primaryReason = normalizedLines[0]?.reason || 'other';

      // Create waste log
      const { data: wasteLog, error: logError } = await supabase
        .from('waste_logs')
        .insert({
          company_id: companyId,
          site_id: siteId || null,
          waste_date: wasteDate,
          waste_reason: primaryReason,
          total_cost: totalCost,
          recorded_by: userId,
          notes: globalNotes || null,
        })
        .select()
        .single();

      if (logError) throw logError;

      // Link waste to task using module_references (if taskId exists)
      if (wasteLog && taskId && companyId) {
        try {
          await ModuleReferences.linkEntities(
            {
              source_module: 'checkly',
              source_table: 'checklist_tasks',
              source_id: taskId,
              target_module: 'stockly',
              target_table: 'waste_logs',
              target_id: wasteLog.id,
              link_type: 'generated_waste',
              metadata: {
                cost: totalCost,
              },
            },
            companyId,
            profile?.id || null
          );
        } catch (linkError) {
          console.error('Error linking waste to task:', linkError);
        }
      }

      // Create waste log lines and update stock
      for (const line of normalizedLines) {
        // Create waste log line
        const { error: lineError } = await supabase
          .from('waste_log_lines')
          .insert({
            waste_log_id: wasteLog.id,
            stock_item_id: line.stock_item_id!,
            quantity: line.quantity,
            unit_cost: line.unit_cost,
            line_cost: line.line_cost,
            specific_reason: line.reason,
            notes: line.notes || null,
            batch_id: line.batch_id || null, // @salsa
          });

        if (lineError) throw lineError;

        // @salsa — Update batch quantity if batch is linked
        if (line.batch_id) {
          try {
            await fetch(`/api/stockly/batches/${line.batch_id}/consume`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                quantity: line.quantity,
                movement_type: 'consumed_waste',
                reference_type: 'waste_log',
                reference_id: wasteLog.id,
                notes: `Waste: ${line.reason}${line.notes ? ' — ' + line.notes : ''}`,
              }),
            });
          } catch (batchErr) {
            console.error('Error updating batch for waste:', batchErr);
          }
        }

        // Update stock level
        let stockLevelQuery = supabase
          .from('stock_levels')
          .select('id, quantity')
          .eq('stock_item_id', line.stock_item_id!);
        
        if (siteId) {
          stockLevelQuery = stockLevelQuery.eq('site_id', siteId);
        }
        
        const { data: stockLevel } = await stockLevelQuery.maybeSingle();

        if (stockLevel) {
          const newQuantity = Math.max(0, (stockLevel.quantity || 0) - line.quantity);
          await supabase
            .from('stock_levels')
            .update({ quantity: newQuantity })
            .eq('id', stockLevel.id);
        }

        // Record stock movement
        try {
          await supabase
            .from('stock_movements')
            .insert({
              company_id: companyId,
              stock_item_id: line.stock_item_id!,
              movement_type: 'waste',
              quantity: -line.quantity,
              unit_cost: line.unit_cost,
              ref_type: 'waste_log',
              ref_id: wasteLog.id,
              notes: `${line.reason}: ${line.notes || 'No notes'}`,
            });
        } catch (error) {
          console.error('Error recording stock movement:', error);
        }
      }

      toast.success(`Waste logged successfully! ${normalizedLines.length} item(s), Total: £${totalCost.toFixed(2)}`);
      
      // Reset form
      setWasteLines([]);
      setGlobalNotes('');
      setWasteDate(new Date().toISOString().split('T')[0]);
      
      // Reload history
      loadWasteLogsHistory();
      // Reload templates
      loadTemplates();
    } catch (error: any) {
      console.error('Error saving waste log:', error);
      toast.error(error.message || 'Failed to save waste log');
    } finally {
      setSaving(false);
    }
  }

  async function loadWasteDetail() {
    if (!wasteId || !companyId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('waste_logs')
        .select(`
          *,
          waste_log_lines(
            *,
            stock_items(id, name, stock_unit)
          )
        `)
        .eq('id', wasteId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      setWasteLog(data);
    } catch (error: any) {
      console.error('Error loading waste detail:', error);
      toast.error('Failed to load waste log');
    } finally {
      setLoading(false);
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  async function loadWasteLogsHistory() {
    if (!companyId) return;
    
    setLoadingHistory(true);
    try {
      let query = supabase
        .from('waste_logs')
        .select(`
          id,
          waste_date,
          waste_reason,
          total_cost,
          recorded_by,
          notes,
          waste_log_lines(
            id,
            quantity,
            line_cost,
            stock_items(id, name, stock_unit)
          )
        `)
        .eq('company_id', companyId)
        .order('waste_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (siteId) {
        query = query.eq('site_id', siteId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setWasteLogsHistory(data || []);
    } catch (error: any) {
      console.error('Error loading waste logs history:', error);
      toast.error('Failed to load waste logs history');
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadTemplates() {
    if (!companyId) return;
    
    setLoadingTemplates(true);
    try {
      let query = supabase
        .from('waste_templates')
        .select(`
          id,
          name,
          description,
          is_active,
          waste_template_lines(
            id,
            stock_item_id,
            quantity,
            default_reason,
            notes,
            display_order,
            stock_items(id, name, stock_unit)
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (siteId) {
        query = query.or(`site_id.is.null,site_id.eq.${siteId}`);
      } else {
        query = query.is('site_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function applyTemplate(templateId: string) {
    const template = templates.find(t => t.id === templateId);
    if (!template || !template.waste_template_lines || template.waste_template_lines.length === 0) {
      toast.error('Template has no items');
      return;
    }

    // Clear existing lines
    setWasteLines([]);

    // Load each template line item
    const newLines: typeof wasteLines = [];
    
    for (const line of template.waste_template_lines) {
      if (line.stock_item_id) {
        // Get stock item details
        const itemDetails = await getStockItemDetails(line.stock_item_id);
        
        if (itemDetails) {
          const currentStock = itemDetails.current_quantity || 0;
          const newLine = {
            id: `temp-${Date.now()}-${Math.random()}-${line.id}`,
            stock_item_id: line.stock_item_id,
            name: itemDetails.name || 'Unknown Item',
            quantity: line.quantity || 1,
            unit: itemDetails.stock_unit || 'unit',
            unit_cost: itemDetails.unit_cost || 0,
            line_cost: (line.quantity || 1) * (itemDetails.unit_cost || 0),
            reason: line.default_reason || 'quality',
            notes: line.notes || '',
            current_stock: currentStock,
            stock_warning: (line.quantity || 1) > currentStock
          };
          newLines.push(newLine);
        }
      }
    }

    setWasteLines(newLines);
    toast.success(`Applied template: ${template.name} (${newLines.length} items)`);
  }

  async function saveAsTemplate() {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (wasteLines.length === 0) {
      toast.error('Please add items to save as template');
      return;
    }

    if (!companyId) {
      toast.error('Company ID is required');
      return;
    }

    try {
      // Create template
      const { data: template, error: templateError } = await supabase
        .from('waste_templates')
        .insert({
          company_id: companyId,
          site_id: siteId || null,
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          created_by: userId,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create template lines
      const linesToSave = wasteLines.map((line, index) => ({
        waste_template_id: template.id,
        stock_item_id: line.stock_item_id!,
        quantity: line.quantity,
        default_reason: line.reason,
        notes: line.notes || null,
        display_order: index,
      }));

      const { error: linesError } = await supabase
        .from('waste_template_lines')
        .insert(linesToSave);

      if (linesError) throw linesError;

      toast.success(`Template "${templateName}" saved successfully!`);
      setShowSaveTemplateModal(false);
      setTemplateName('');
      setTemplateDescription('');
      loadTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    }
  }

  function startCreateTemplate() {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateDescription('');
    setTemplateLines([]);
    setShowCreateTemplateModal(true);
  }

  function startEditTemplate(template: any) {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    
    // Load template lines
    const lines = (template.waste_template_lines || []).map((line: any) => ({
      id: line.id,
      stock_item_id: line.stock_item_id,
      name: line.stock_items?.name || 'Unknown Item',
      quantity: line.quantity || 1,
      unit: line.stock_items?.stock_unit || 'unit',
      default_reason: line.default_reason || 'quality',
      notes: line.notes || '',
    }));
    setTemplateLines(lines);
    setShowCreateTemplateModal(true);
  }

  async function handleTemplateItemSelect(stockItemId: string, stockItem?: any) {
    // Check if item is already in the template
    if (templateLines.some(line => line.stock_item_id === stockItemId)) {
      toast.error('Item already in template');
      return;
    }

    // Handle library items that don't have stock_items yet
    let actualStockItemId = stockItemId;
    let itemData = stockItem;
    
    if (stockItem?.source === 'library' && stockItem?.library_data) {
      // Need to create or find stock_item for this library item
      try {
        // Check if stock_item already exists
        const { data: existingStock, error: checkError } = await supabase
          .from('stock_items')
          .select('id, name, description, stock_unit, library_item_id, library_type')
          .eq('company_id', companyId)
          .eq('library_item_id', stockItem.library_item_id)
          .eq('library_type', stockItem.library_type)
          .eq('is_active', true)
          .maybeSingle();
        
        if (existingStock && !checkError) {
          actualStockItemId = existingStock.id;
          itemData = existingStock;
        } else {
          // Create stock_item from library item
          const libData = stockItem.library_data;
          const nameField = stockItem.library_type === 'ingredients_library' ? 'ingredient_name' : 'item_name';
          const itemName = libData[nameField] || libData.name || 'Unknown Item';
          
          const { data: newStockItem, error: createError } = await supabase
            .from('stock_items')
            .insert({
              company_id: companyId,
              name: itemName,
              description: libData.description || libData.notes || '',
              stock_unit: stockItem.stock_unit || 'unit',
              library_item_id: stockItem.library_item_id,
              library_type: stockItem.library_type,
              is_active: true
            })
            .select('id, name, description, stock_unit, library_item_id, library_type')
            .single();
          
          if (createError || !newStockItem) {
            throw new Error(createError?.message || 'Failed to create stock item');
          }
          
          actualStockItemId = newStockItem.id;
          itemData = newStockItem;
          toast.success(`Created stock item: ${itemName}`);
        }
      } catch (error: any) {
        console.error('[Template] Error creating stock item from library:', error);
        toast.error(`Failed to add item: ${error.message || 'Unknown error'}`);
        return;
      }
    }

    // Get stock item details
    const itemDetails = await getStockItemDetails(actualStockItemId);
    
    const newLine = {
      id: `temp-${Date.now()}-${Math.random()}`,
      stock_item_id: actualStockItemId,
      name: itemDetails?.name || itemData?.name || stockItem?.display_name || 'Unknown Item',
      quantity: 1,
      unit: itemDetails?.stock_unit || itemData?.stock_unit || stockItem?.stock_unit || 'unit',
      default_reason: 'quality',
      notes: '',
    };
    
    setTemplateLines([...templateLines, newLine]);
    setTemplateItemSearch('');
    setShowTemplateSearchResults(false);
    setTemplateSearchResults([]);
  }

  function updateTemplateLine(lineId: string, updates: Partial<typeof templateLines[0]>) {
    setTemplateLines(prev => prev.map(line => {
      if (line.id !== lineId) return line;
      return { ...line, ...updates };
    }));
  }

  function removeTemplateLine(lineId: string) {
    setTemplateLines(prev => prev.filter(line => line.id !== lineId));
  }

  // Search for template items
  useEffect(() => {
    if (!companyId) return;

    if (templateItemSearch.trim()) {
      const timer = setTimeout(() => {
        searchTemplateItems();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      // When search is cleared, optionally load recent items
      setTemplateSearchResults([]);
      setShowTemplateSearchResults(false);
    }
  }, [templateItemSearch, companyId]);

  async function searchTemplateItems() {
    if (!companyId || !templateItemSearch.trim()) return;
    
    setLoadingTemplateSearch(true);
    try {
      const searchTerm = templateItemSearch.trim().toLowerCase();
      const selectedIds = templateLines.map(l => l.stock_item_id).filter(Boolean);
      
      console.log(`[Template Search] Searching for: "${searchTerm}"`);
      
      const allResults: any[] = [];
      
      // 1. Search stock_items first
      try {
        let stockQuery = supabase
          .from('stock_items')
          .select('id, name, description, stock_unit, library_item_id, library_type')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .limit(100)
          .order('name');
        
        const { data: stockData, error: stockError } = await stockQuery;
        
        if (!stockError && stockData) {
          stockData.forEach(item => {
            allResults.push({
              ...item,
              source: 'stock_item',
              display_name: item.name
            });
          });
          console.log(`[Template Search] Found ${stockData.length} stock items`);
        }
      } catch (err) {
        console.warn('[Template Search] Error searching stock_items:', err);
      }
      
      // 2. Search all library tables
      const libraries = [
        { table: 'ingredients_library', nameField: 'ingredient_name', unitField: 'unit' },
        { table: 'disposables_library', nameField: 'item_name', unitField: 'unit' },
        { table: 'chemicals_library', nameField: 'product_name', unitField: 'unit' },
        { table: 'ppe_library', nameField: 'item_name', unitField: 'unit' },
        { table: 'drinks_library', nameField: 'item_name', unitField: 'unit' },
        { table: 'packaging_library', nameField: 'item_name', unitField: 'unit' },
        { table: 'glassware_library', nameField: 'item_name', unitField: 'unit' },
        { table: 'serving_equipment_library', nameField: 'item_name', unitField: 'unit' }
      ];
      
      for (const lib of libraries) {
        try {
          // Search the library table
          let libQuery = supabase
            .from(lib.table)
            .select('*')
            .eq('company_id', companyId);
          
          // Build search on name field
          libQuery = libQuery.ilike(lib.nameField, `%${searchTerm}%`);
          libQuery = libQuery.limit(50).order(lib.nameField);
          
          const { data: libData, error: libError } = await libQuery;
          
          if (!libError && libData) {
            // For each library item, find or create corresponding stock_item
            for (const libItem of libData) {
              const displayName = libItem[lib.nameField] || libItem.name || 'Unknown';
              
              // Check if stock_item already exists for this library item
              const existingStockItem = allResults.find(r => 
                r.library_item_id === libItem.id && 
                r.library_type === lib.table
              );
              
              if (!existingStockItem) {
                // Try to find existing stock_item
                const { data: existingStock, error: stockCheckError } = await supabase
                  .from('stock_items')
                  .select('id, name, description, stock_unit, library_item_id, library_type')
                  .eq('company_id', companyId)
                  .eq('library_item_id', libItem.id)
                  .eq('library_type', lib.table)
                  .eq('is_active', true)
                  .maybeSingle();
                
                if (existingStock && !stockCheckError) {
                  // Use existing stock_item
                  allResults.push({
                    ...existingStock,
                    source: 'stock_item',
                    display_name: existingStock.name
                  });
                } else {
                  // Create a virtual result for library item (will need to create stock_item on selection)
                  allResults.push({
                    id: `lib_${lib.table}_${libItem.id}`, // Temporary ID
                    name: displayName,
                    description: libItem.description || libItem.notes || '',
                    stock_unit: libItem[lib.unitField] || libItem.unit || 'unit',
                    library_item_id: libItem.id,
                    library_type: lib.table,
                    library_data: libItem, // Store full library item data
                    source: 'library',
                    display_name: displayName
                  });
                }
              }
            }
            console.log(`[Template Search] Found ${libData.length} items in ${lib.table}`);
          }
        } catch (err) {
          console.warn(`[Template Search] Error searching ${lib.table}:`, err);
        }
      }
      
      // Filter out selected items and deduplicate
      const filtered = allResults.filter(item => {
        // Skip if already selected
        if (selectedIds.includes(item.id)) return false;
        // Skip if it's a library item that already has a stock_item in results
        if (item.source === 'library') {
          const hasStockItem = allResults.some(r => 
            r.source === 'stock_item' && 
            r.library_item_id === item.library_item_id &&
            r.library_type === item.library_type
          );
          return !hasStockItem;
        }
        return true;
      });
      
      // Remove duplicates based on library_item_id + library_type
      const uniqueResults = filtered.filter((item, index, self) => 
        index === self.findIndex(t => 
          (t.library_item_id && t.library_type) ? 
            t.library_item_id === item.library_item_id && t.library_type === item.library_type :
            t.id === item.id
        )
      );
      
      console.log(`[Template Search] Total results: ${uniqueResults.length} (${allResults.length} before filtering)`);
      setTemplateSearchResults(uniqueResults);
      setShowTemplateSearchResults(true);
    } catch (error: any) {
      console.error('[Template Search] Error searching:', error);
      toast.error(`Search error: ${error.message || 'Failed to search items'}`);
      setTemplateSearchResults([]);
      setShowTemplateSearchResults(true);
    } finally {
      setLoadingTemplateSearch(false);
    }
  }

  // Close template search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (templateSearchRef.current && !templateSearchRef.current.contains(event.target as Node)) {
        setShowTemplateSearchResults(false);
      }
    }

    if (showTemplateSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTemplateSearchResults]);

  async function saveTemplate() {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (templateLines.length === 0) {
      toast.error('Please add at least one item to the template');
      return;
    }

    if (!companyId) {
      toast.error('Company ID is required');
      return;
    }

    try {
      if (editingTemplate) {
        // Update existing template
        const { data: template, error: templateError } = await supabase
          .from('waste_templates')
          .update({
            name: templateName.trim(),
            description: templateDescription.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTemplate.id)
          .select()
          .single();

        if (templateError) throw templateError;

        // Delete old lines
        await supabase
          .from('waste_template_lines')
          .delete()
          .eq('waste_template_id', editingTemplate.id);

        // Create new lines
        const linesToSave = templateLines.map((line, index) => ({
          waste_template_id: editingTemplate.id,
          stock_item_id: line.stock_item_id!,
          quantity: line.quantity,
          default_reason: line.default_reason,
          notes: line.notes || null,
          display_order: index,
        }));

        const { error: linesError } = await supabase
          .from('waste_template_lines')
          .insert(linesToSave);

        if (linesError) throw linesError;

        toast.success(`Template "${templateName}" updated successfully!`);
      } else {
        // Create new template
        const { data: template, error: templateError } = await supabase
          .from('waste_templates')
          .insert({
            company_id: companyId,
            site_id: siteId || null,
            name: templateName.trim(),
            description: templateDescription.trim() || null,
            created_by: userId,
          })
          .select()
          .single();

        if (templateError) throw templateError;

        // Create template lines
        const linesToSave = templateLines.map((line, index) => ({
          waste_template_id: template.id,
          stock_item_id: line.stock_item_id!,
          quantity: line.quantity,
          default_reason: line.default_reason,
          notes: line.notes || null,
          display_order: index,
        }));

        const { error: linesError } = await supabase
          .from('waste_template_lines')
          .insert(linesToSave);

        if (linesError) throw linesError;

        toast.success(`Template "${templateName}" created successfully!`);
      }

      setShowCreateTemplateModal(false);
      setTemplateName('');
      setTemplateDescription('');
      setTemplateLines([]);
      setEditingTemplate(null);
      loadTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    }
  }

  async function deleteTemplate(templateId: string, templateName: string) {
    if (!confirm(`Are you sure you want to delete the template "${templateName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('waste_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast.success(`Template "${templateName}" deleted successfully!`);
      loadTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error(error.message || 'Failed to delete template');
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#10B981] animate-spin" />
      </div>
    );
  }

  // Show waste detail view if id is present
  if (wasteId && wasteLog) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/stockly/waste"
 className="p-2 rounded-lg bg-theme-button hover:bg-theme-button-hover text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">Waste Log Details</h1>
              <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm mt-1">
                Waste Record #{wasteId.slice(0, 8)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Waste Details */}
            <div className="bg-theme-surface border border-theme rounded-xl p-6">
              <button
                onClick={() => toggleSection('details')}
                className="w-full flex items-center justify-between mb-4"
              >
                <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white">Waste Details</h2>
                {expandedSections.has('details') ? (
                  <ChevronUp className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary" />
                )}
              </button>

              {expandedSections.has('details') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-1">Date</div>
                      <div className="text-[rgb(var(--text-primary))] dark:text-white">
                        {wasteLog.waste_date ? format(new Date(wasteLog.waste_date), 'dd MMM yyyy') : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-1">Reason</div>
                      <div className="text-[rgb(var(--text-primary))] dark:text-white capitalize">{wasteLog.waste_reason || 'N/A'}</div>
                    </div>
                    {wasteLog.total_cost !== null && (
                      <div>
                        <div className="text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-1">Total Cost</div>
                        <div className="text-[rgb(var(--text-primary))] dark:text-white font-semibold">£{parseFloat(wasteLog.total_cost).toFixed(2)}</div>
                      </div>
                    )}
                  </div>

                  {wasteLog.notes && (
                    <div>
                      <div className="text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-2">Notes</div>
                      <div className="text-[rgb(var(--text-primary))] dark:text-white bg-theme-button rounded-lg p-3">
                        {wasteLog.notes}
                      </div>
                    </div>
                  )}

                  {wasteLog.waste_log_lines && wasteLog.waste_log_lines.length > 0 && (
                    <div>
                      <div className="text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-2">Items</div>
                      <div className="space-y-2">
                        {wasteLog.waste_log_lines.map((line: any) => (
                          <div key={line.id} className="bg-theme-button rounded-lg p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-[rgb(var(--text-primary))] dark:text-white font-medium">
                                {line.stock_items?.name || 'Unknown Item'}
                              </span>
                              <span className="text-[rgb(var(--text-primary))] dark:text-theme-secondary">
                                {line.quantity} {line.stock_items?.stock_unit || ''}
                              </span>
                            </div>
                            {line.line_cost && (
                              <div className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mt-1">
                                Cost: £{parseFloat(line.line_cost).toFixed(2)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Related Tasks Section */}
            <div className="bg-theme-surface border border-theme rounded-xl p-6">
              <button
                onClick={() => toggleSection('tasks')}
                className="w-full flex items-center justify-between mb-4"
              >
                <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white">
                  Related Tasks {linkedTasks && linkedTasks.length > 0 && `(${linkedTasks.length})`}
                </h2>
                {expandedSections.has('tasks') ? (
                  <ChevronUp className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary" />
                )}
              </button>

              {expandedSections.has('tasks') && (
                <div>
                  {loadingTasks ? (
 <div className="text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">Loading...</div>
                  ) : linkedTasks && linkedTasks.length > 0 ? (
                    <div className="space-y-2">
                      {linkedTasks.map(link => (
                        <Link
                          key={link.link_id}
                          href={`/dashboard/tasks/view/${link.source_id}`}
 className="block p-3 border border-theme rounded-lg bg-theme-button hover:bg-theme-button-hover transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-[rgb(var(--text-primary))] dark:text-white font-medium">Task: {link.source_id.slice(0, 8)}</p>
 <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
                                Linked: {format(new Date(link.created_at), 'dd MMM yyyy HH:mm')}
                              </p>
                              {link.link_type && (
                                <span className="inline-block mt-2 text-xs bg-module-fg/[0.10] text-module-fg border border-module-fg/[0.20] px-2 py-1 rounded">
                                  {link.link_type.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                            <ExternalLink className="w-4 h-4 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
 <p className="text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">No tasks linked to this waste record</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/stockly"
 className="p-2 rounded-lg bg-theme-button hover:bg-theme-button-hover text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">Waste Log</h1>
            <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm mt-1">
              Record daily waste and losses
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Create Waste | Daily Templates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Regular Create Waste Form */}
        <form onSubmit={handleSubmit} className="bg-theme-surface border border-theme rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-theme-primary">Create Waste Log</h2>
            {wasteLines.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-emerald-50 dark:bg-module-fg/10 hover:bg-emerald-100 dark:hover:bg-module-fg/10 text-module-fg border border-emerald-200 dark:border-module-fg/30 rounded-lg transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save as Template
              </button>
            )}
          </div>

          {/* Date and Global Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[rgb(var(--text-primary))] dark:text-theme-secondary mb-2">
                Date <span className="text-red-400">*</span>
              </label>
              <Input
                type="date"
                value={wasteDate}
                onChange={(e) => setWasteDate(e.target.value)}
 className="w-full bg-theme-button border-theme text-[rgb(var(--text-primary))] dark:text-white focus:border-[#10B981]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[rgb(var(--text-primary))] dark:text-theme-secondary mb-2">
                General Notes (Optional)
              </label>
              <Input
                type="text"
                value={globalNotes}
                onChange={(e) => setGlobalNotes(e.target.value)}
 className="w-full bg-theme-button border-theme text-[rgb(var(--text-primary))] dark:text-white focus:border-[#10B981]"
                placeholder="Notes for all items..."
              />
            </div>
          </div>

        {/* Waste Items Table */}
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-theme-primary/80 mb-2">
              Wasted Items <span className="text-red-400">*</span>
            </label>
            
            {/* Inline Search */}
            <div className="relative" ref={searchRef}>
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-theme-tertiary"size={18} />
              <input
                type="text"
                value={itemSearchTerm}
                onChange={(e) => {
                  setItemSearchTerm(e.target.value);
                  if (e.target.value.trim()) {
                    setShowSearchResults(true);
                  } else {
                    setShowSearchResults(false);
                  }
                }}
                onFocus={() => {
                  if (itemSearchTerm.trim() && searchResults.length > 0) {
                    setShowSearchResults(true);
                  }
                }}
                placeholder="Search stock items to add..."
                className="w-full pl-10 pr-4 py-2.5 bg-theme-surface border border-theme rounded-lg text-theme-primary placeholder-gray-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-[#10B981]/50 focus:border-emerald-500 dark:focus:border-[#10B981] transition-colors"
              />
              
              {/* Search Results Dropdown */}
              {showSearchResults && (loadingSearch || searchResults.length > 0 || itemSearchTerm.trim()) && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1a1a2e] border border-theme rounded-lg shadow-xl max-h-96 overflow-y-auto">
                  {loadingSearch ? (
 <div className="px-4 py-3 text-sm text-gray-500 dark:text-theme-tertiary text-center">
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <>
                      {searchResults.slice(0, 50).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleItemSelect(item.id, item)}
                          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-theme-hover transition-colors text-left first:rounded-t-lg last:rounded-b-lg border-b border-theme last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-theme-primary truncate">{item.name}</div>
                            {item.description && (
 <div className="text-xs text-gray-500 dark:text-theme-tertiary mt-0.5 truncate">{item.description}</div>
                            )}
                            {item.library_type && (
                              <div className="text-xs text-module-fg dark:text-module-fg mt-1">
                                {item.source === 'library' ? 'From ' : 'Linked to '}
                                {item.library_type.replace('_library', '').replace(/_/g, ' ')}
                              </div>
                            )}
                            {item.source === 'library' && (
                              <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                (Will create stock item on selection)
                              </div>
                            )}
                          </div>
                          <Plus className="text-module-fg dark:text-[#10B981] flex-shrink-0 ml-2" size={18} />
                        </button>
                      ))}
                      {searchResults.length > 50 && (
 <div className="px-4 py-2 text-xs text-gray-500 dark:text-theme-tertiary text-center border-t border-theme">
                          Showing first 50 of {searchResults.length} results. Try a more specific search.
                        </div>
                      )}
                    </>
                  ) : itemSearchTerm.trim() ? (
 <div className="px-4 py-3 text-sm text-gray-500 dark:text-theme-tertiary text-center">
                      <p>No items found matching "{itemSearchTerm}"</p>
                      <p className="text-xs text-theme-tertiary mt-1">
                        Try a different search term or check if the item exists in your stock items
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {wasteLines.length === 0 ? (
            <div className="border-2 border-dashed border-theme rounded-lg p-8 text-center bg-gray-50/50 dark:bg-transparent">
              <Trash2 className="w-12 h-12 text-theme-tertiary/20 mx-auto mb-3" />
              <p className="text-theme-secondary text-sm mb-2">No items added yet</p>
              <p className="text-theme-tertiary text-xs">Search above to add items to the waste log</p>
            </div>
          ) : (
            <div className="border border-theme rounded-lg overflow-hidden bg-white dark:bg-transparent">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-white/[0.03]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">Item</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-theme-secondary uppercase tracking-wider">Available</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-theme-secondary uppercase tracking-wider">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">Reason</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-theme-secondary uppercase tracking-wider">Cost</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-theme-secondary w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10 bg-white dark:bg-transparent">
                    {wasteLines.map((line) => (
                      <tr key={line.id} className={`hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors ${line.stock_warning ? 'bg-red-50 dark:bg-red-500/5' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-theme-primary">{line.name}</p>
                          {/* @salsa — Batch selector for SALSA traceability */}
                          {line.stock_item_id && (
                            <BatchSelector
                              stockItemId={line.stock_item_id}
                              selectedBatchId={line.batch_id || null}
                              onSelect={(batchId) => updateLine(line.id, { batch_id: batchId } as any)}
                              required={true}
                              className="mt-1"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {line.current_stock !== undefined ? (
                            <span className="text-xs text-theme-secondary">
                              {line.current_stock.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-theme-tertiary">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.quantity}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow empty input during editing, but update with 0 if invalid
                                const numValue = value === '' ? 0 : parseFloat(value);
                                if (!isNaN(numValue) && numValue >= 0) {
                                  // Update quantity - this will trigger cost recalculation in updateLine
                                  updateLine(line.id, { quantity: numValue });
                                } else if (value === '' || value === '-') {
                                  // Allow empty or minus sign for user to type
                                  updateLine(line.id, { quantity: 0 });
                                }
                              }}
                              onBlur={(e) => {
                                // Ensure we have a valid number on blur
                                const value = parseFloat(e.target.value);
                                if (isNaN(value) || value < 0) {
                                  updateLine(line.id, { quantity: 0 });
                                }
                              }}
                              className={`w-24 px-2 py-1.5 bg-theme-surface border rounded text-sm text-right text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 dark:focus:ring-[#10B981]/50 ${
                                line.stock_warning 
                                  ? 'border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/5' 
                                  : 'border-theme'
                              }`}
                              onFocus={(e) => e.target.select()}
                            />
                            <span className="text-xs text-theme-secondary font-medium whitespace-nowrap min-w-[2rem]">
                              {line.unit}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {WASTE_REASONS.slice(0, 5).map(reason => (
                              <button
                                key={reason.value}
                                type="button"
                                onClick={() => updateLine(line.id, { reason: reason.value })}
                                className={`px-2 py-1 rounded text-xs transition-colors border ${
                                  line.reason === reason.value
                                    ? 'bg-emerald-100 dark:bg-[#10B981]/20 text-emerald-700 dark:text-[#10B981] border-emerald-300 dark:border-[#10B981]/50'
                                    : 'bg-theme-surface text-theme-secondary border-theme hover:bg-theme-surface-elevated dark:hover:bg-white/10'
                                }`}
                                title={reason.label}
                              >
                                {reason.icon}
                              </button>
                            ))}
                            <select
                              value={line.reason}
                              onChange={(e) => updateLine(line.id, { reason: e.target.value })}
                              className="px-2 py-1 rounded text-xs bg-theme-surface border border-theme text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-[#10B981]/50"
                            >
                              {WASTE_REASONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.icon} {r.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">
                            £{line.line_cost.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            className="p-1.5 text-theme-tertiary hover:text-red-600 dark:hover:text-red-400 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-500/10"
                            aria-label="Remove item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-white/[0.03] border-t border-theme">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium text-theme-secondary/60">
                        Total Waste Value:
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-lg font-bold text-red-600 dark:text-red-400">
                          £{wasteLines.reduce((sum, line) => sum + line.line_cost, 0).toFixed(2)}
                        </span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t border-theme">
            <Button
              type="submit"
              disabled={saving || wasteLines.length === 0}
              className="bg-transparent border border-[#10B981] text-[#10B981] hover:shadow-module-glow transition-all duration-200 ease-in-out disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                `Save Waste Log${wasteLines.length > 0 ? ` (${wasteLines.length} items)` : ''}`
              )}
            </Button>
            <Link href="/dashboard/stockly">
              <Button
                type="button"
                variant="ghost"
 className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))]"
              >
                Cancel
              </Button>
            </Link>
          </div>
        </form>

        {/* Right Side: Daily Waste Templates */}
        <div className="bg-theme-surface border border-theme rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-theme-primary">Daily Waste Templates</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={loadTemplates}
                disabled={loadingTemplates}
                className="text-xs text-theme-tertiary hover:text-theme-secondary dark:hover:text-theme-secondary disabled:opacity-50"
              >
                {loadingTemplates ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={startCreateTemplate}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-emerald-50 dark:bg-module-fg/10 hover:bg-emerald-100 dark:hover:bg-module-fg/10 text-module-fg border border-emerald-200 dark:border-module-fg/30 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Template
              </button>
            </div>
          </div>
          
          <p className="text-sm text-theme-secondary">
            Use saved templates to quickly add common waste items
          </p>

          {loadingTemplates ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-module-fg dark:text-[#10B981] animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-theme rounded-lg">
              <FileText className="w-12 h-12 text-theme-tertiary/20 mx-auto mb-3" />
              <p className="text-theme-tertiary text-sm mb-2">No templates yet</p>
              <p className="text-xs text-theme-tertiary">
                Add items to the waste log and click "Save as Template" to create one
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="group p-4 border border-theme rounded-lg hover:bg-theme-hover transition-colors bg-white dark:bg-transparent"
                >
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => applyTemplate(template.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <h4 className="font-medium text-theme-primary truncate">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm text-theme-tertiary mt-1 line-clamp-2">{template.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-theme-tertiary">
                          {template.waste_template_lines?.length || 0} item{template.waste_template_lines?.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 ml-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditTemplate(template);
                        }}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-module-fg/10 rounded transition-colors"
                        aria-label="Edit template"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTemplate(template.id, template.name);
                        }}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                        aria-label="Delete template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => applyTemplate(template.id)}
                        className="p-1.5 text-module-fg dark:text-[#10B981] hover:bg-module-fg/10 rounded transition-colors"
                        aria-label="Apply template"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Waste Logs History */}
      <div className="bg-theme-surface border border-theme rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-theme-primary">Recent Waste Logs</h2>
          <button
            onClick={loadWasteLogsHistory}
            disabled={loadingHistory}
            className="text-sm text-module-fg dark:text-[#10B981] hover:underline disabled:opacity-50"
          >
            {loadingHistory ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-module-fg dark:text-[#10B981] animate-spin" />
          </div>
        ) : wasteLogsHistory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-theme-tertiary">No waste logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-white/[0.03]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">Items</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-theme-secondary uppercase tracking-wider">Total Cost</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-theme-secondary w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10 bg-white dark:bg-transparent">
                {wasteLogsHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-theme-surface-elevated dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm text-theme-primary">
                        {log.waste_date ? format(new Date(log.waste_date), 'dd MMM yyyy') : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-theme-secondary capitalize">
                        {log.waste_reason || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-theme-secondary">
                        {log.waste_log_lines?.length || 0} item{log.waste_log_lines?.length !== 1 ? 's' : ''}
                      </div>
                      {log.waste_log_lines && log.waste_log_lines.length > 0 && (
                        <div className="text-xs text-theme-tertiary mt-1">
                          {log.waste_log_lines.slice(0, 2).map((line: any) => (
                            <div key={line.id}>
                              {line.stock_items?.name || 'Unknown'} ({line.quantity} {line.stock_items?.stock_unit || ''})
                            </div>
                          ))}
                          {log.waste_log_lines.length > 2 && (
                            <div className="text-theme-tertiary/30">
                              +{log.waste_log_lines.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        £{parseFloat(log.total_cost || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/dashboard/stockly/waste?id=${log.id}`}
                        className="text-module-fg dark:text-[#10B981] hover:underline text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSaveTemplateModal(false);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-white/20 rounded-xl w-full max-w-md flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-theme flex items-center justify-between bg-gray-50 dark:bg-white/[0.02]">
              <div>
                <h3 className="text-lg font-semibold text-theme-primary">Save as Template</h3>
                <p className="text-sm text-theme-secondary mt-1">Save current items for quick reuse</p>
              </div>
              <button 
                onClick={() => setShowSaveTemplateModal(false)} 
                className="text-theme-tertiary hover:text-theme-secondary transition-colors p-2 hover:bg-theme-muted rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  Template Name <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Daily Bakery Waste"
                  className="w-full bg-theme-surface border-theme text-theme-primary focus:border-emerald-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Brief description of this template..."
                  className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none"
                  rows={3}
                />
              </div>
              <div className="bg-theme-button rounded-lg p-3">
                <p className="text-xs text-theme-secondary">
                  This will save <strong>{wasteLines.length} item{wasteLines.length !== 1 ? 's' : ''}</strong> with their quantities and default reasons.
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-theme flex items-center gap-3">
              <Button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                variant="ghost"
                className="flex-1 text-theme-secondary"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={saveAsTemplate}
                disabled={!templateName.trim()}
                className="flex-1 bg-emerald-600 dark:bg-[#10B981] hover:bg-emerald-700 dark:hover:bg-[#059669] text-white disabled:opacity-50"
              >
                Save Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Template Modal */}
      {showCreateTemplateModal && (
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateTemplateModal(false);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-white/20 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-theme flex items-center justify-between bg-gray-50 dark:bg-white/[0.02]">
              <div>
                <h3 className="text-lg font-semibold text-theme-primary">
                  {editingTemplate ? 'Edit Template' : 'Create Template'}
                </h3>
                <p className="text-sm text-theme-secondary mt-1">
                  {editingTemplate ? 'Update your waste template' : 'Create a new daily waste template'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowCreateTemplateModal(false);
                  setEditingTemplate(null);
                  setTemplateName('');
                  setTemplateDescription('');
                  setTemplateLines([]);
                }} 
                className="text-theme-tertiary hover:text-theme-secondary transition-colors p-2 hover:bg-theme-muted rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Template Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-primary mb-2">
                    Template Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Daily Bakery Waste"
                    className="w-full bg-theme-surface border-theme text-theme-primary focus:border-emerald-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-primary mb-2">
                    Description (Optional)
                  </label>
                  <Input
                    type="text"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Brief description..."
                    className="w-full bg-theme-surface border-theme text-theme-primary focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Add Items Section */}
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  Template Items <span className="text-red-400">*</span>
                </label>
                
                {/* Search Input */}
                <div className="relative mb-4" ref={templateSearchRef}>
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-theme-tertiary"size={18} />
                  <input
                    type="text"
                    value={templateItemSearch}
                    onChange={(e) => {
                      setTemplateItemSearch(e.target.value);
                      if (e.target.value.trim()) {
                        setShowTemplateSearchResults(true);
                      } else {
                        setShowTemplateSearchResults(false);
                      }
                    }}
                    onFocus={() => {
                      if (templateItemSearch.trim() && templateSearchResults.length > 0) {
                        setShowTemplateSearchResults(true);
                      }
                    }}
                    placeholder="Search stock items to add... (searches name and description)"
                    className="w-full pl-10 pr-4 py-2.5 bg-theme-surface border border-theme rounded-lg text-theme-primary placeholder-gray-400 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-[#10B981]/50 focus:border-emerald-500 dark:focus:border-[#10B981] transition-colors"
                  />
                  
                  {/* Search Results Dropdown */}
                  {showTemplateSearchResults && (loadingTemplateSearch || templateSearchResults.length > 0 || templateItemSearch.trim()) && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1a1a2e] border border-theme rounded-lg shadow-xl max-h-96 overflow-y-auto">
                      {loadingTemplateSearch ? (
 <div className="px-4 py-3 text-sm text-gray-500 dark:text-theme-tertiary text-center">
                          Searching...
                        </div>
                      ) : templateSearchResults.length > 0 ? (
                        <>
                          {templateSearchResults.slice(0, 50).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleTemplateItemSelect(item.id, item)}
                              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-theme-hover transition-colors text-left first:rounded-t-lg last:rounded-b-lg border-b border-theme last:border-0"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-theme-primary truncate">{item.name}</div>
                                {item.description && (
 <div className="text-xs text-gray-500 dark:text-theme-tertiary mt-0.5 truncate">{item.description}</div>
                                )}
                                {item.library_type && (
                                  <div className="text-xs text-module-fg dark:text-module-fg mt-1">
                                    Linked to {item.library_type.replace('_library', '').replace('_', ' ')}
                                  </div>
                                )}
                              </div>
                              <Plus className="text-module-fg dark:text-[#10B981] flex-shrink-0 ml-2" size={18} />
                            </button>
                          ))}
                          {templateSearchResults.length > 50 && (
 <div className="px-4 py-2 text-xs text-gray-500 dark:text-theme-tertiary text-center border-t border-theme">
                              Showing first 50 of {templateSearchResults.length} results. Try a more specific search.
                            </div>
                          )}
                        </>
                      ) : templateItemSearch.trim() ? (
 <div className="px-4 py-3 text-sm text-gray-500 dark:text-theme-tertiary text-center">
                          <p>No items found matching "{templateItemSearch}"</p>
                          <p className="text-xs text-theme-tertiary mt-1">
                            Try a different search term or check if the item exists in your stock items
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Template Items List */}
                {templateLines.length === 0 ? (
                  <div className="border-2 border-dashed border-theme rounded-lg p-8 text-center bg-gray-50/50 dark:bg-transparent">
                    <Package className="w-12 h-12 text-theme-tertiary/20 mx-auto mb-3" />
                    <p className="text-theme-secondary text-sm mb-2">No items added yet</p>
                    <p className="text-theme-tertiary text-xs">Search above to add items to the template</p>
                  </div>
                ) : (
                  <div className="border border-theme rounded-lg overflow-hidden bg-white dark:bg-transparent">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-white/[0.03]">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">Item</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-theme-secondary uppercase tracking-wider">Quantity</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-theme-secondary uppercase tracking-wider">Default Reason</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-theme-secondary w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                          {templateLines.map((line) => (
                            <tr key={line.id} className="hover:bg-theme-surface-elevated dark:hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3">
                                <p className="text-sm font-medium text-theme-primary">{line.name}</p>
                                <p className="text-xs text-theme-tertiary">{line.unit}</p>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 justify-end">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={line.quantity}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      updateTemplateLine(line.id, { quantity: value });
                                    }}
                                    className="w-24 px-2 py-1.5 bg-theme-surface border border-theme rounded text-sm text-right text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                                  />
                                  <span className="text-xs text-theme-secondary font-medium whitespace-nowrap min-w-[2rem]">
                                    {line.unit}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={line.default_reason}
                                  onChange={(e) => updateTemplateLine(line.id, { default_reason: e.target.value })}
                                  className="px-2 py-1 rounded text-xs bg-theme-surface border border-theme text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                >
                                  {WASTE_REASONS.map((r) => (
                                    <option key={r.value} value={r.value}>
                                      {r.icon} {r.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeTemplateLine(line.id)}
                                  className="p-1.5 text-theme-tertiary hover:text-red-600 dark:hover:text-red-400 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-500/10"
                                  aria-label="Remove item"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-theme flex items-center gap-3">
              <Button
                type="button"
                onClick={() => {
                  setShowCreateTemplateModal(false);
                  setEditingTemplate(null);
                  setTemplateName('');
                  setTemplateDescription('');
                  setTemplateLines([]);
                }}
                variant="ghost"
                className="flex-1 text-theme-secondary"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={saveTemplate}
                disabled={!templateName.trim() || templateLines.length === 0}
                className="flex-1 bg-emerald-600 dark:bg-[#10B981] hover:bg-emerald-700 dark:hover:bg-[#059669] text-white disabled:opacity-50"
              >
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

