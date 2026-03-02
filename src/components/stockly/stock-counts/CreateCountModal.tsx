'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import Textarea from '@/components/ui/Textarea';
import Checkbox from '@/components/ui/Checkbox';
import { LibraryType, LibraryInfo } from '@/lib/types/stockly';
import { Loader2, Package, Box, Coffee, Heart, Shield, FlaskConical } from '@/components/ui/icons';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

interface CreateCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCountModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCountModalProps) {
  const { companyId } = useAppContext();
  const [name, setName] = useState('');
  const [countDate, setCountDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [libraries, setLibraries] = useState<LibraryInfo[]>([]);
  const [selectedLibraries, setSelectedLibraries] = useState<LibraryType[]>(['ingredients']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && companyId) {
      // Reset state when modal opens
      setSelectedSiteId('');
      setSites([]);
      setError(null);
      
      fetchInitialData();
      // Set default name
      const weekNum = Math.ceil(
        (new Date().getDate() + new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay()) / 7
      );
      const monthName = new Date().toLocaleDateString('en-GB', { month: 'short' });
      setName(`Weekly Count - W${weekNum} ${monthName} ${new Date().getFullYear()}`);
    } else if (!isOpen) {
      // Reset state when modal closes
      setSelectedSiteId('');
      setSites([]);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, companyId]);

  const fetchInitialData = async () => {
    if (!companyId) {
      setError('Company ID not available');
      return;
    }

    setLoading(true);
    setError(null); // Clear any previous errors

    try {
      // Fetch sites
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      // Check if there's a meaningful error (not just an empty object)
      if (sitesError && (sitesError.message || sitesError.code || Object.keys(sitesError).length > 0)) {
        const errorMessage = sitesError.message || sitesError.hint || 'Unknown error';
        console.error('Error fetching sites:', {
          message: errorMessage,
          code: sitesError.code,
          details: sitesError.details,
          hint: sitesError.hint
        });
        setError(`Failed to load sites: ${errorMessage}`);
        setSites([]);
      } else {
        // No error or empty error object - treat as success
        const sitesArray = sitesData || [];
        setSites(sitesArray);
        if (sitesArray.length > 0) {
          // Always set the first site as selected if none is selected
          if (!selectedSiteId) {
            setSelectedSiteId(sitesArray[0].id);
          }
        } else {
          setError('No sites found. Please create a site first.');
        }
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || 'Unknown error';
      console.error('Error fetching sites:', {
        message: errorMessage,
        error: err
      });
      setError(`Failed to load sites: ${errorMessage}`);
      setSites([]);
    } finally {
      setLoading(false);
    }

    // Fetch library counts - all available libraries
    const libraryQueries = [
      {
        type: 'ingredients' as LibraryType,
        name: 'Ingredients',
        description: 'Recipe ingredients and raw materials',
        table: 'ingredients_library',
        query: supabase.from('ingredients_library').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      },
      {
        type: 'packaging' as LibraryType,
        name: 'Packaging',
        description: 'Containers, boxes, and packaging',
        table: 'packaging_library',
        query: supabase.from('packaging_library').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      },
      {
        type: 'foh' as LibraryType,
        name: 'FOH Items',
        description: 'Front of house and serving items (Disposables)',
        table: 'disposables_library',
        query: supabase.from('disposables_library').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      },
      {
        type: 'first_aid' as LibraryType,
        name: 'First Aid',
        description: 'First aid and medical supplies',
        table: 'first_aid_supplies_library',
        query: supabase.from('first_aid_supplies_library').select('*', { count: 'exact', head: true }).or(`company_id.eq.${companyId},company_id.is.null`),
      },
      {
        type: 'ppe' as LibraryType,
        name: 'PPE',
        description: 'Personal protective equipment',
        table: 'ppe_library',
        query: supabase.from('ppe_library').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      },
      {
        type: 'chemicals' as LibraryType,
        name: 'Chemicals',
        description: 'Cleaning chemicals and COSHH items',
        table: 'chemicals_library',
        query: supabase.from('chemicals_library').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      },
    ];

    const libraryResults = await Promise.all(
      libraryQueries.map(async (lib) => {
        try {
          const { count, error } = await lib.query;
          if (error) {
            console.error(`Error fetching ${lib.table}:`, error);
            return { ...lib, count: 0 };
          }
          return { ...lib, count: count ?? 0 };
        } catch (err) {
          console.error(`Error fetching ${lib.table}:`, err);
          return { ...lib, count: 0 };
        }
      })
    );

    // Always show all supported libraries, even with 0 items
    setLibraries(
      libraryResults.map(({ type, name, description, count }) => ({
        type,
        name,
        count,
        description,
      }))
    );
  };

  const toggleLibrary = (libraryType: LibraryType) => {
    setSelectedLibraries(prev =>
      prev.includes(libraryType)
        ? prev.filter(t => t !== libraryType)
        : [...prev, libraryType]
    );
  };

  const getTotalItems = () => {
    return libraries
      .filter(lib => selectedLibraries.includes(lib.type))
      .reduce((sum, lib) => sum + lib.count, 0);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a count name');
      return;
    }

    if (!selectedSiteId) {
      setError('Please select a site');
      return;
    }
    
    if (selectedLibraries.length === 0) {
      setError('Please select at least one library');
      return;
    }

    if (!companyId) {
      setError('Company not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create stock count
      const insertData: any = {
        company_id: companyId,
        site_id: selectedSiteId,
        name: name.trim(),
        count_date: countDate,
        status: 'draft',
        notes: notes.trim() || null,
        created_by: user.id,
        libraries_included: selectedLibraries, // Include selected libraries
      };

      // Only include frequency if column exists (some schemas don't have it)
      // libraries_included is now included above

      const { data: count, error: countError } = await supabase
        .from('stock_counts')
        .insert(insertData)
        .select()
        .single();

      if (countError) throw countError;

      // Fetch items from selected libraries for this site
      const allItems: any[] = [];

      // Map library types to table names
      const libraryTableMap: Record<string, string> = {
        ingredients: 'ingredients_library',
        packaging: 'packaging_library',
        foh: 'disposables_library', // Using disposables_library for FOH items
        first_aid: 'first_aid_supplies_library',
        ppe: 'ppe_library',
        chemicals: 'chemicals_library',
      };

      const nameColumnMap: Record<string, string> = {
        ingredients_library: 'ingredient_name',
        packaging_library: 'item_name',
        disposables_library: 'item_name',
        first_aid_supplies_library: 'item_name',
        ppe_library: 'item_name',
        chemicals_library: 'product_name',
      };

      const unitColumnMap: Record<string, string> = {
        ingredients_library: 'unit',
        packaging_library: 'unit_of_measurement', // packaging_library uses unit_of_measurement, not unit
        disposables_library: 'pack_size', // disposables_library doesn't have unit_per_pack, use pack_size or null
        first_aid_supplies_library: 'pack_size',
        ppe_library: 'standard_compliance', // PPE doesn't have unit, use standard_compliance or null
        chemicals_library: 'pack_size',
      };

      // Process each selected library
      for (const libraryType of selectedLibraries) {
        const tableName = libraryTableMap[libraryType];
        if (!tableName) continue;

        const nameColumn = nameColumnMap[tableName] || 'item_name';
        const unitColumn = unitColumnMap[tableName] || 'unit';

        // Build query - handle special cases
        // For PPE, packaging, and disposables, we don't select unit columns since they may not exist
        // disposables_library uses pack_cost instead of unit_cost
        let selectColumns: string;
        if (tableName === 'ppe_library' || tableName === 'packaging_library') {
          selectColumns = `id, ${nameColumn}, unit_cost`;
        } else if (tableName === 'disposables_library') {
          selectColumns = `id, ${nameColumn}, pack_cost`;
        } else {
          selectColumns = `id, ${nameColumn}, ${unitColumn}, unit_cost`;
        }
        
        let query = supabase.from(tableName).select(selectColumns);

        if (tableName === 'first_aid_supplies_library') {
          query = query.or(`company_id.eq.${companyId},company_id.is.null`);
        } else {
          query = query.eq('company_id', companyId);
        }

        const { data: items, error: itemsError } = await query;

        if (itemsError) {
          console.error(`Error fetching ${tableName}:`, itemsError);
          continue;
        }

        if (items) {
          // Get stock levels for this site
          for (const item of items) {
            const { data: stockLevel } = await supabase
              .from('library_stock_levels')
              .select('current_level, average_cost')
              .eq('site_id', selectedSiteId)
              .eq('item_id', item.id)
              .eq('library_type', libraryType)
              .maybeSingle();

            // For PPE, packaging, and disposables, unit_of_measurement should be null since they don't have standard unit columns
            const unitValue = (tableName === 'ppe_library' || tableName === 'packaging_library' || tableName === 'disposables_library')
              ? null 
              : (item[unitColumn] || null);
            
            // Handle cost - disposables_library uses pack_cost instead of unit_cost
            const itemCost = tableName === 'disposables_library' 
              ? (stockLevel?.average_cost || (item as any).pack_cost || 0)
              : (stockLevel?.average_cost || (item as any).unit_cost || 0);
            
            allItems.push({
              stock_count_id: count.id,
              ingredient_id: item.id,
              library_type: libraryType,
              opening_stock: stockLevel?.current_level || 0,
              theoretical_closing: stockLevel?.current_level || 0,
              unit_of_measurement: unitValue,
              unit_cost: itemCost,
            });
          }
        }
      }

      // @salsa — Expand items into per-batch rows where batches exist
      // 1. Bulk fetch stock_items for this company (maps library items → stock_item_ids)
      const { data: stockItems } = await supabase
        .from('stock_items')
        .select('id, library_item_id, library_type')
        .eq('company_id', companyId);

      // 2. Bulk fetch active stock_batches for this company + site
      let batchQuery = supabase
        .from('stock_batches')
        .select('id, stock_item_id, batch_code, quantity_remaining, unit, use_by_date, best_before_date, created_at')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .gt('quantity_remaining', 0)
        .order('created_at', { ascending: true }); // FIFO — oldest first

      if (selectedSiteId) {
        batchQuery = batchQuery.eq('site_id', selectedSiteId);
      }

      const { data: activeBatches } = await batchQuery;

      // 3. Build lookup maps
      const libraryTypeDbMap: Record<string, string> = {
        ingredients: 'ingredients_library',
        packaging: 'packaging_library',
        foh: 'disposables_library',
        first_aid: 'first_aid_supplies_library',
        ppe: 'ppe_library',
        chemicals: 'chemicals_library',
      };

      // Map: `{library_item_id}_{library_type}` → stock_item_id
      const libraryToStockItem = new Map<string, string>();
      if (stockItems) {
        for (const si of stockItems) {
          if (si.library_item_id && si.library_type) {
            libraryToStockItem.set(`${si.library_item_id}_${si.library_type}`, si.id);
          }
        }
      }

      // Map: stock_item_id → StockBatch[]
      const stockItemToBatches = new Map<string, typeof activeBatches>();
      if (activeBatches) {
        for (const batch of activeBatches) {
          const existing = stockItemToBatches.get(batch.stock_item_id) || [];
          existing.push(batch);
          stockItemToBatches.set(batch.stock_item_id, existing);
        }
      }

      // 4. Expand items: replace aggregate rows with per-batch rows where batches exist
      const expandedItems: any[] = [];
      for (const item of allItems) {
        const dbLibType = libraryTypeDbMap[item.library_type] || item.library_type;
        const stockItemId = libraryToStockItem.get(`${item.ingredient_id}_${dbLibType}`);
        const batches = stockItemId ? stockItemToBatches.get(stockItemId) : null;

        if (batches && batches.length > 0) {
          // Create one row per batch
          for (const batch of batches) {
            expandedItems.push({
              stock_count_id: item.stock_count_id,
              ingredient_id: item.ingredient_id,
              library_type: item.library_type,
              batch_id: batch.id,
              opening_stock: batch.quantity_remaining,
              theoretical_closing: batch.quantity_remaining,
              unit_of_measurement: batch.unit || item.unit_of_measurement,
              unit_cost: item.unit_cost,
            });
          }
        } else {
          // No batches — keep as aggregate row (batch_id = null)
          expandedItems.push(item);
        }
      }

      // Insert all items (expanded)
      if (expandedItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('stock_count_items')
          .insert(expandedItems);

        if (itemsError) throw itemsError;
      }

      // Navigate to detail page (NOT review page - new counts should go to detail page first)
      router.push(`/dashboard/stockly/stock-counts/${count.id}`);
      onSuccess();
      onClose();
      
      // Reset form
      setName('');
      setNotes('');
      setSelectedLibraries(['ingredients']);
    } catch (err: any) {
      console.error('Error creating stock count:', err);
      setError(err.message || 'Failed to create stock count');
    } finally {
      setLoading(false);
    }
  };

  const getLibraryIcon = (type: LibraryType) => {
    switch (type) {
      case 'ingredients':
        return Package;
      case 'packaging':
        return Box;
      case 'foh':
        return Coffee;
      case 'first_aid':
        return Heart;
      case 'ppe':
        return Shield;
      case 'chemicals':
        return FlaskConical;
      default:
        return Package;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[3600px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-theme-primary">Create Stock Count</DialogTitle>
          <p className="text-theme-secondary">Simple 3-step setup</p>
        </DialogHeader>

        <div className="space-y-8 mt-6">
          {/* Step 1: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">1. Basic Information</h3>
            
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name" className="text-sm font-medium text-theme-primary">Count Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Weekly Count - W1 Jan 2026"
                  className="bg-white dark:bg-gray-900 border-theme focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 text-theme-primary w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium text-theme-primary">Count Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={countDate}
                  onChange={(e) => setCountDate(e.target.value)}
                  className="bg-white dark:bg-gray-900 border-theme focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 text-theme-primary w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="site" className="text-sm font-medium text-theme-primary">Site *</Label>
                {loading ? (
 <div className="w-full px-3 py-2 bg-theme-surface ] border border-theme rounded-md text-theme-secondary text-sm">
                    Loading sites...
                  </div>
                ) : sites.length > 0 ? (
                  <select
                    id="site"
                    value={selectedSiteId || ''}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-theme rounded-lg px-4 py-2.5 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 appearance-none cursor-pointer"
                  >
                    <option value="">Select site...</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                ) : (
 <div className="w-full px-3 py-2 bg-theme-surface ] border border-theme rounded-md text-theme-secondary text-sm">
                    {error || 'No sites available'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Select Libraries */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">2. Select Libraries to Count</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {libraries.map((library) => {
                const Icon = getLibraryIcon(library.type);
                const isSelected = selectedLibraries.includes(library.type);

                return (
                  <div
                    key={library.type}
                    onClick={() => toggleLibrary(library.type)}
                    className={`flex items-center gap-4 p-5 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-600/10 shadow-sm'
                        : 'border-theme hover:border-gray-300 dark:hover:border-white/[0.1] bg-theme-surface hover:shadow-sm'
                    }`}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedLibraries(prev => [...prev, library.type]);
                          } else {
                            setSelectedLibraries(prev => prev.filter(t => t !== library.type));
                          }
                        }}
                      />
                    </div>
                    
                    <Icon className="h-6 w-6 text-module-fg flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-theme-primary text-base">
                          {library.name}
                        </h4>
                        <span className="text-sm font-medium text-module-fg whitespace-nowrap">
                          {library.count} items
                        </span>
                      </div>
                      <p className="text-sm text-theme-secondary mt-1">
                        {library.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedLibraries.length > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-600/10 border border-module-fg/30 rounded-lg p-4">
                <p className="text-module-fg font-medium">
                  Total: {getTotalItems()} items will be loaded for counting
                </p>
              </div>
            )}
          </div>

          {/* Step 3: Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-theme-primary mb-2">3. Additional Notes (Optional)</h3>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-theme-primary">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this count..."
                className="bg-white dark:bg-gray-900 border-theme focus-visible:ring-emerald-500/50 dark:focus-visible:ring-emerald-500 focus-visible:border-emerald-600 dark:focus-visible:border-emerald-500 text-theme-primary resize-none w-full"
                rows={3}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-theme">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-theme hover:bg-theme-hover text-theme-secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading || selectedLibraries.length === 0 || !selectedSiteId}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 min-w-[180px] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Continue to Review Items'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
