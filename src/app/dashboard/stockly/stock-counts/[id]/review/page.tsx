'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  ArrowLeft, 
  Loader2,
  Search,
  Package,
  Box,
  Coffee,
  Heart,
  Save,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  Check
} from 'lucide-react';
import Select from '@/components/ui/Select';
import { StockCountItem, LibraryType } from '@/lib/types/stockly';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getCurrentUserId } from '@/lib/stock-counts';
import { XCircle, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import SelectApproverModal from '@/components/stockly/stock-counts/SelectApproverModal';

// Map library types to table names and name columns
const libraryTableMap: Record<string, string> = {
  ingredients: 'ingredients_library',
  packaging: 'packaging_library',
  disposables: 'disposables_library',
  drinks: 'drinks_library',
  ppe: 'ppe_library',
  chemicals: 'chemicals_library',
  glassware: 'glassware_library',
  first_aid: 'first_aid_supplies_library',
  first_aid_supplies: 'first_aid_supplies_library',
  firstaid: 'first_aid_supplies_library',
  foh: 'disposables_library',
  'first_aid_supplies_library': 'first_aid_supplies_library',
};

const nameColumnMap: Record<string, string> = {
  ingredients_library: 'ingredient_name',
  packaging_library: 'item_name',
  disposables_library: 'item_name',
  drinks_library: 'item_name',
  ppe_library: 'item_name',
  chemicals_library: 'product_name',
  glassware_library: 'item_name',
  first_aid_supplies_library: 'item_name',
};

// Map which columns each library table has (for supplier/pack_size)
const libraryColumnsMap: Record<string, string[]> = {
  ingredients_library: ['supplier', 'pack_size'],
  packaging_library: ['supplier', 'pack_size'],
  disposables_library: ['supplier', 'pack_size'],
  chemicals_library: ['supplier', 'pack_size'],
  ppe_library: ['supplier'], // PPE doesn't have pack_size
  drinks_library: ['supplier', 'pack_size'],
  glassware_library: ['supplier', 'pack_size'],
  first_aid_supplies_library: ['supplier', 'pack_size'],
};

// Helper functions for library names and icons
const getLibraryIcon = (type: LibraryType) => {
  switch (type) {
    case 'ingredients': return Package;
    case 'packaging': return Box;
    case 'foh': return Coffee;
    case 'first_aid': return Heart;
    default: return Package;
  }
};

const getLibraryName = (type: LibraryType) => {
  switch (type) {
    case 'ingredients': return 'Ingredients';
    case 'packaging': return 'Packaging';
    case 'foh': return 'FOH Items';
    case 'first_aid': return 'First Aid';
    case 'disposables': return 'Disposables';
    case 'drinks': return 'Drinks';
    case 'ppe': return 'PPE';
    case 'chemicals': return 'Chemicals';
    case 'glassware': return 'Glassware';
    default: return type;
  }
};

export default function ReviewCountItemsPage() {
  const params = useParams();
  const router = useRouter();
  const [count, setCount] = useState<any>(null);
  const [items, setItems] = useState<StockCountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | 'item' | 'supplier' | 'comments'>('all');
  const [selectedLibrary, setSelectedLibrary] = useState<LibraryType | 'all'>('all');
  
  // Column filters state - enhanced with filter types
  const [columnFilters, setColumnFilters] = useState<Record<string, { type?: string; value?: string; min?: string; max?: string; selectedValues?: string[] }>>({});
  
  // Filter dropdown state (Excel-like)
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  
  // Summary table state
  const [showSummary, setShowSummary] = useState<boolean>(true);
  
  // Editing state
  const [editingValues, setEditingValues] = useState<Record<string, { closingStock?: number; comments?: string; reviewerComment?: string; approvalComment?: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isApprover, setIsApprover] = useState(false);
  const [autoApproveCountdown, setAutoApproveCountdown] = useState<number | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [approverInfo, setApproverInfo] = useState<{ name: string; role: string } | null>(null);
  const [loadingApprover, setLoadingApprover] = useState(false);
  const [showApproverModal, setShowApproverModal] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState<{ id: string; name: string; role: string } | null>(null);
  const backfillAttempted = useRef(false); // Track if backfill has been attempted for this count

  // Scroll synchronization refs for split table (per library)
  const scrollRefs = useRef<Record<string, { frozen: HTMLDivElement | null; scrollable: HTMLDivElement | null }>>({});
  const syncingScroll = useRef(false);

  // Define fetchData before useEffect that uses it
  const fetchData = useCallback(async () => {
    if (!params.id) return;
    
    setLoading(true);

    try {
      const countId = Array.isArray(params.id) ? params.id[0] : params.id;
      
      // Fetch count
      const { data: countData, error: countError } = await supabase
        .from('stock_counts')
        .select('*')
        .eq('id', countId)
        .single();

      if (countError) throw countError;
      
      // Debug logging
      console.log('[Review Page] Count data loaded:', {
        id: countData?.id,
        status: countData?.status,
        items_counted: countData?.items_counted,
        total_items: countData?.total_items,
        name: countData?.name,
        completed_at: countData?.completed_at,
        ready_for_approval_at: countData?.ready_for_approval_at,
        approved_by: countData?.approved_by,
      });
      
      // Auto-backfill if count is in an old status that needs updating
      // Only attempt once per count ID to prevent loops
      if (countData && !backfillAttempted.current && (
        countData.status === 'pending_review' || 
        (countData.status === 'in_progress' && countData.items_counted > 0 && countData.items_counted >= countData.total_items) ||
        (countData.status === 'approved' && (!countData.approved_by || !countData.approved_at))
      )) {
        backfillAttempted.current = true; // Mark as attempted
        try {
          // Silently backfill the count
          await fetch(`/api/stock-counts/backfill/${countId}`, {
            method: 'POST',
          });
          // Reload count data after backfill
          const { data: updatedCount } = await supabase
            .from('stock_counts')
            .select('*')
            .eq('id', countId)
            .single();
          if (updatedCount) {
            setCount(updatedCount);
          } else {
            setCount(countData);
          }
        } catch (backfillError) {
          console.warn('Error auto-backfilling count:', backfillError);
          // Continue with original count data
          setCount(countData);
        }
      } else {
        setCount(countData);
      }

      // Fetch items (reviewer_comment column will be available after migration is applied)
      const { data: itemsData, error: itemsError } = await supabase
        .from('stock_count_items')
        .select('*')
        .eq('stock_count_id', countId);

      if (itemsError) throw itemsError;

      // Fetch item names from library tables
      const itemsWithNames: StockCountItem[] = [];
      
      if (itemsData) {
        // Group items by library type
        const itemsByLibrary: Record<string, typeof itemsData> = {};
        itemsData.forEach((item: any) => {
          const libType = item.library_type;
          if (!itemsByLibrary[libType]) {
            itemsByLibrary[libType] = [];
          }
          itemsByLibrary[libType].push(item);
        });

        // Fetch names and supplier for each library type
        for (const [libType, libItems] of Object.entries(itemsByLibrary)) {
          const tableName = libraryTableMap[libType];
          const nameColumn = nameColumnMap[tableName] || 'item_name';
          
          if (!tableName || libItems.length === 0) continue;

          const itemIds = libItems.map((item: any) => item.ingredient_id);
          
          try {
            // Fetch name, supplier, and pack_size for review report
            const additionalColumns = libraryColumnsMap[tableName] || ['supplier', 'pack_size'];
            const selectColumns = ['id', nameColumn, ...additionalColumns].join(', ');
            const { data: libraryItems, error: fetchError } = await supabase
              .from(tableName)
              .select(selectColumns)
              .in('id', itemIds);

            if (fetchError) {
              console.warn(`Error fetching ${tableName} items with supplier:`, fetchError);
              // Fallback: try without supplier/pack_size
              const { data: fallbackItems } = await supabase
                .from(tableName)
                .select(`id, ${nameColumn}`)
                .in('id', itemIds);
              
              if (fallbackItems) {
                // Create map with just names
                const libraryItemMap = new Map(
                  fallbackItems.map((libItem: any) => [
                    libItem.id,
                    {
                      name: libItem[nameColumn] || 'Unknown',
                      supplier: null,
                      pack_size: null,
                    }
                  ])
                );

                libItems.forEach((item: any) => {
                  const libItemData = libraryItemMap.get(item.ingredient_id) || {
                    name: 'Unknown',
                    supplier: null,
                    pack_size: null,
                  };
                  itemsWithNames.push({
                    ...item,
                    ingredient: {
                      id: item.ingredient_id,
                      name: libItemData.name,
                      ingredient_name: libItemData.name,
                      supplier: libItemData.supplier,
                      pack_size: libItemData.pack_size,
                    } as any,
                  });
                });
              }
              continue;
            }

            // Create a map of id -> library item data
            const libraryItemMap = new Map(
              (libraryItems || []).map((libItem: any) => [
                libItem.id,
                {
                  name: libItem[nameColumn] || 'Unknown',
                  supplier: libItem.supplier || null,
                  pack_size: libItem.pack_size || null,
                }
              ])
            );

            // Add names and supplier to items
            libItems.forEach((item: any) => {
              const libItemData = libraryItemMap.get(item.ingredient_id) || {
                name: 'Unknown',
                supplier: null,
                pack_size: null,
              };
              itemsWithNames.push({
                ...item,
                ingredient: {
                  id: item.ingredient_id,
                  name: libItemData.name,
                  ingredient_name: libItemData.name,
                  supplier: libItemData.supplier,
                  pack_size: libItemData.pack_size,
                } as any,
              });
            });
          } catch (err) {
            console.error(`Error processing ${libType}:`, err);
            // Add items without names as fallback
            libItems.forEach((item: any) => {
              itemsWithNames.push({
                ...item,
                ingredient: {
                  id: item.ingredient_id,
                  name: 'Unknown',
                  supplier: null,
                  pack_size: null,
                } as any,
              });
            });
          }
        }
      }

      setItems(itemsWithNames);
      
      // Debug: Check approval comments in fetched data
      if (countData?.status === 'approved' || countData?.status === 'rejected') {
        const itemsWithApprovalComments = itemsWithNames.filter((item: any) => item.approval_comments);
        console.log('💬 Fetched items with approval comments:', {
          totalItems: itemsWithNames.length,
          itemsWithComments: itemsWithApprovalComments.length,
          comments: itemsWithApprovalComments.map((item: any) => ({
            itemId: item.id,
            ingredient: item.ingredient?.name,
            approvalComment: item.approval_comments,
          })),
        });
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      backfillAttempted.current = false; // Reset when count ID changes
      fetchData();
      getCurrentUserId().then(setCurrentUserId);
    }
     
  }, [params.id]); // fetchData is memoized and depends on params.id, so we don't need it in deps

  // Check if current user is the approver and calculate auto-approve countdown
  useEffect(() => {
    if (count && currentUserId) {
      setIsApprover(count.approver_id === currentUserId);
      
      // Calculate auto-approve countdown if status is ready_for_approval
      if (count.status === 'ready_for_approval' && count.ready_for_approval_at) {
        const readyTime = new Date(count.ready_for_approval_at).getTime();
        const autoApproveTime = readyTime + (24 * 60 * 60 * 1000); // 24 hours
        const now = Date.now();
        const remaining = Math.max(0, autoApproveTime - now);
        
        setAutoApproveCountdown(Math.floor(remaining / (60 * 60 * 1000))); // Hours remaining
        
        // Update countdown every minute
        const interval = setInterval(() => {
          const newRemaining = Math.max(0, autoApproveTime - Date.now());
          setAutoApproveCountdown(Math.floor(newRemaining / (60 * 60 * 1000)));
        }, 60000);
        
        return () => clearInterval(interval);
      } else {
        setAutoApproveCountdown(null);
      }

      // Load approver info if count is ready for approval
      if (count.status === 'ready_for_approval' && count.approver_id) {
        loadApproverInfo(count.approver_id);
      } else if ((count.status === 'completed' || count.status === 'rejected' || 
                  count.status === 'in_progress' || count.status === 'draft' || count.status === 'active') &&
                 !approverInfo && !loadingApprover) {
        // Pre-load approver info for counts that can be marked ready
        loadApproverPreview();
      }
    }
  }, [count, currentUserId]);

  // Load approver information
  const loadApproverInfo = async (approverId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', approverId)
        .single();

      if (profile) {
        setApproverInfo({
          name: profile.full_name || profile.email || 'Unknown',
          role: 'Approver',
        });
      }
    } catch (error) {
      console.error('Error loading approver info:', error);
    }
  };

  // Load approver preview before marking ready
  const loadApproverPreview = async () => {
    if (!count || !params.id) return;
    
    const countId = Array.isArray(params.id) ? params.id[0] : params.id;
    setLoadingApprover(true);
    
    try {
      const response = await fetch(`/api/stock-counts/get-approver/${countId}`);
      const data = await response.json();
      
      if (data.success && data.approver) {
        setApproverInfo({
          name: data.approver.name,
          role: data.approver.role,
        });
      }
    } catch (error) {
      console.error('Error loading approver preview:', error);
    } finally {
      setLoadingApprover(false);
    }
  };

  // Helper function to format numbers
  const formatNumber = (value: number | null | undefined, decimals: number = 2): string => {
    if (value === null || value === undefined) return '—';
    return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Helper function to calculate % variance in cost
  const calculateVarianceCostPercent = (theoreticalClosing: number | null, unitCost: number | null, varianceValue: number | null): number | null => {
    if (!theoreticalClosing || !unitCost || theoreticalClosing === 0) return null;
    const theoreticalValue = theoreticalClosing * unitCost;
    if (theoreticalValue === 0) return null;
    return (varianceValue || 0) / theoreticalValue * 100;
  };

  // Get available libraries from actual items
  const availableLibraries = Array.from(new Set(items.map(item => item.library_type).filter(Boolean))) as LibraryType[];

  // Sort items: apply user sort if set, otherwise by library then alphabetically
  const sortedItems = [...items].sort((a, b) => {
    // Apply user-defined sort if set
    if (sortConfig) {
      const { field, direction } = sortConfig;
      let aValue: any;
      let bValue: any;

      switch (field) {
        case 'item':
          aValue = a.ingredient?.name || '';
          bValue = b.ingredient?.name || '';
          break;
        case 'supplier':
          aValue = (a.ingredient as any)?.supplier || '';
          bValue = (b.ingredient as any)?.supplier || '';
          break;
        case 'measurement':
          aValue = a.unit_of_measurement || '';
          bValue = b.unit_of_measurement || '';
          break;
        case 'openingStock':
          aValue = a.opening_stock || 0;
          bValue = b.opening_stock || 0;
          break;
        case 'purchases':
          aValue = a.stock_in || 0;
          bValue = b.stock_in || 0;
          break;
        case 'production':
          aValue = a.transfers_in || 0;
          bValue = b.transfers_in || 0;
          break;
        case 'sales':
          aValue = a.sales || 0;
          bValue = b.sales || 0;
          break;
        case 'waste':
          aValue = a.waste || 0;
          bValue = b.waste || 0;
          break;
        case 'closingStock':
          aValue = a.counted_quantity || 0;
          bValue = b.counted_quantity || 0;
          break;
        case 'varianceUnits':
          aValue = a.variance_quantity || 0;
          bValue = b.variance_quantity || 0;
          break;
        case 'varianceCost':
          aValue = a.variance_value || 0;
          bValue = b.variance_value || 0;
          break;
        case 'variancePercentUnits':
          aValue = a.variance_percentage || 0;
          bValue = b.variance_percentage || 0;
          break;
        case 'variancePercentCost':
          aValue = calculateVarianceCostPercent(a.theoretical_closing, a.unit_cost, a.variance_value) || 0;
          bValue = calculateVarianceCostPercent(b.theoretical_closing, b.unit_cost, b.variance_value) || 0;
          break;
        case 'comments':
          aValue = a.notes || '';
          bValue = b.notes || '';
          break;
        default:
          return 0;
      }

      // Handle string vs number comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return direction === 'asc' ? result : -result;
      } else {
        const result = (aValue as number) - (bValue as number);
        return direction === 'asc' ? result : -result;
      }
    }

    // Default sort: by library type, then alphabetically
    const aLib = a.library_type || '';
    const bLib = b.library_type || '';
    if (aLib !== bLib) return aLib.localeCompare(bLib);
    
    const aName = a.ingredient?.name || '';
    const bName = b.ingredient?.name || '';
    return aName.localeCompare(bName);
  });

  // Handle column header sort click
  const handleSort = (field: string) => {
    setSortConfig(prev => {
      if (prev?.field === field) {
        // Toggle direction if same field
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      // New field, default to ascending
      return { field, direction: 'asc' };
    });
  };

  // Enhanced filter function with dynamic filter types
  const applyFilter = (value: any, filter: { type?: string; value?: string; min?: string; max?: string; selectedValues?: string[] } | undefined): boolean => {
    if (!filter || (!filter.value && !filter.min && !filter.max && !filter.selectedValues?.length)) return true;

    // Handle selectedValues (checkbox list for text columns)
    if (filter.selectedValues && filter.selectedValues.length > 0) {
      const strValue = String(value || '').toLowerCase();
      return filter.selectedValues.some(selected => strValue.includes(selected.toLowerCase()));
    }

    const numValue = typeof value === 'number' ? value : parseFloat(String(value || 0));
    const strValue = String(value || '').toLowerCase();

    if (filter.type === 'range' && (filter.min || filter.max)) {
      const min = filter.min ? parseFloat(filter.min) : -Infinity;
      const max = filter.max ? parseFloat(filter.max) : Infinity;
      return numValue >= min && numValue <= max;
    } else if (filter.type === 'greater') {
      const threshold = filter.value ? parseFloat(filter.value) : 0;
      return numValue > threshold;
    } else if (filter.type === 'less') {
      const threshold = filter.value ? parseFloat(filter.value) : 0;
      return numValue < threshold;
    } else if (filter.type === 'equals') {
      const target = filter.value ? parseFloat(filter.value) : 0;
      return Math.abs(numValue - target) < 0.01; // Allow small floating point differences
    } else if (filter.type === 'positive') {
      return numValue > 0;
    } else if (filter.type === 'negative') {
      return numValue < 0;
    } else if (filter.type === 'zero') {
      return Math.abs(numValue) < 0.01;
    } else {
      // Default: text contains
      const filterValue = (filter.value || '').toLowerCase();
      return strValue.includes(filterValue);
    }
  };

  // Get unique values for a column (for Excel-like checkbox filters)
  // Use sortedItems instead of filteredItems to avoid circular dependency
  const getUniqueValues = (columnKey: string, maxItems: number = 100): string[] => {
    const values = new Set<string>();
    sortedItems.forEach(item => {
      let value: any;
      switch (columnKey) {
        case 'item':
          value = item.ingredient?.name;
          break;
        case 'supplier':
          value = (item.ingredient as any)?.supplier;
          break;
        case 'measurement':
          value = item.unit_of_measurement;
          break;
        case 'comments':
          value = item.notes;
          break;
        default:
          return;
      }
      if (value && String(value).trim()) {
        values.add(String(value));
      }
    });
    return Array.from(values).sort().slice(0, maxItems);
  };

  // Filter items with enhanced column filters
  const filteredItems = sortedItems.filter(item => {
    // Library filter
    const matchesLibrary = selectedLibrary === 'all' || item.library_type === selectedLibrary;
    
    // Enhanced search filter with scope
    const matchesSearch = !searchTerm || (() => {
      const searchLower = searchTerm.toLowerCase();
      if (searchScope === 'all') {
        return (
          (item.ingredient?.name || '').toLowerCase().includes(searchLower) ||
          ((item.ingredient as any)?.supplier || '').toLowerCase().includes(searchLower) ||
          (item.notes || '').toLowerCase().includes(searchLower)
        );
      } else if (searchScope === 'item') {
        return (item.ingredient?.name || '').toLowerCase().includes(searchLower);
      } else if (searchScope === 'supplier') {
        return ((item.ingredient as any)?.supplier || '').toLowerCase().includes(searchLower);
      } else if (searchScope === 'comments') {
        return (item.notes || '').toLowerCase().includes(searchLower);
      }
      return true;
    })();
    
    // Enhanced column filters
    const matchesItem = applyFilter(item.ingredient?.name || '', columnFilters.item);
    const matchesSupplier = applyFilter((item.ingredient as any)?.supplier || '', columnFilters.supplier);
    const matchesMeasurement = applyFilter(item.unit_of_measurement || '', columnFilters.measurement);
    const matchesOpeningStock = applyFilter(item.opening_stock || 0, columnFilters.openingStock);
    const matchesPurchases = applyFilter(item.stock_in || 0, columnFilters.purchases);
    const matchesProduction = applyFilter(item.transfers_in || 0, columnFilters.production);
    const matchesSales = applyFilter(item.sales || 0, columnFilters.sales);
    const matchesWaste = applyFilter(item.waste || 0, columnFilters.waste);
    const matchesClosingStock = applyFilter(item.counted_quantity || 0, columnFilters.closingStock);
    const matchesVarianceUnits = applyFilter(item.variance_quantity || 0, columnFilters.varianceUnits);
    const matchesVarianceCost = applyFilter(item.variance_value || 0, columnFilters.varianceCost);
    const matchesVariancePercentUnits = applyFilter(item.variance_percentage || 0, columnFilters.variancePercentUnits);
    const varianceCostPercent = calculateVarianceCostPercent(item.theoretical_closing, item.unit_cost, item.variance_value);
    const matchesVariancePercentCost = applyFilter(varianceCostPercent || 0, columnFilters.variancePercentCost);
    const matchesComments = applyFilter(item.notes || '', columnFilters.comments);
    
    return matchesLibrary && matchesSearch && matchesItem && matchesSupplier && 
           matchesMeasurement && matchesOpeningStock && matchesPurchases && 
           matchesProduction && matchesSales && matchesWaste && matchesClosingStock &&
           matchesVarianceUnits && matchesVarianceCost && matchesVariancePercentUnits &&
           matchesVariancePercentCost && matchesComments;
  });

  // Group items by library
  const itemsByLibrary = filteredItems.reduce((acc, item) => {
    const libType = item.library_type || 'unknown';
    if (!acc[libType]) {
      acc[libType] = [];
    }
    acc[libType].push(item);
    return acc;
  }, {} as Record<string, StockCountItem[]>);

  // Calculate summary statistics
  const calculateSummary = (items: StockCountItem[]) => {
    const totals = items.reduce((acc, item) => {
      acc.openingStock += item.opening_stock || 0;
      acc.purchases += item.stock_in || 0;
      acc.production += item.transfers_in || 0;
      acc.sales += item.sales || 0;
      acc.waste += item.waste || 0;
      acc.closingStock += item.counted_quantity || 0;
      acc.varianceUnits += item.variance_quantity || 0;
      acc.varianceCost += item.variance_value || 0;
      
      // For percentages, we'll calculate weighted average
      if (item.variance_percentage !== null && item.variance_percentage !== undefined) {
        acc.variancePercentUnitsSum += item.variance_percentage;
        acc.variancePercentUnitsCount++;
      }
      
      const costPercent = calculateVarianceCostPercent(item.theoretical_closing, item.unit_cost, item.variance_value);
      if (costPercent !== null) {
        acc.variancePercentCostSum += costPercent;
        acc.variancePercentCostCount++;
      }
      
      return acc;
    }, {
      openingStock: 0,
      purchases: 0,
      production: 0,
      sales: 0,
      waste: 0,
      closingStock: 0,
      varianceUnits: 0,
      varianceCost: 0,
      variancePercentUnitsSum: 0,
      variancePercentUnitsCount: 0,
      variancePercentCostSum: 0,
      variancePercentCostCount: 0,
    });

    return {
      ...totals,
      avgVariancePercentUnits: totals.variancePercentUnitsCount > 0 
        ? totals.variancePercentUnitsSum / totals.variancePercentUnitsCount 
        : null,
      avgVariancePercentCost: totals.variancePercentCostCount > 0 
        ? totals.variancePercentCostSum / totals.variancePercentCostCount 
        : null,
    };
  };

  // Overall summary (all filtered items)
  const overallSummary = calculateSummary(filteredItems);

  // Per-library summaries
  const librarySummaries = Object.entries(itemsByLibrary).map(([libType, libItems]) => ({
    libraryType: libType,
    libraryName: getLibraryName(libType as LibraryType),
    summary: calculateSummary(libItems),
    itemCount: libItems.length,
  }));


  // Handle saving closing stock and comments
  const handleSaveItem = async (item: StockCountItem) => {
    const editingValue = editingValues[item.id];
    if (!editingValue) return;

    setSaving(item.id);

    try {
      const closingStock = editingValue.closingStock !== undefined 
        ? editingValue.closingStock 
        : item.counted_quantity;
      const comments = editingValue.comments !== undefined 
        ? editingValue.comments 
        : item.notes;
      const approvalComment = editingValue.approvalComment !== undefined
        ? editingValue.approvalComment
        : (item as any).approval_comments;

      // Recalculate variances
      const theoreticalClosing = item.theoretical_closing || 0;
      const varianceQuantity = closingStock !== null ? closingStock - theoreticalClosing : null;
      const variancePercentage = theoreticalClosing !== 0 && varianceQuantity !== null
        ? (varianceQuantity / theoreticalClosing) * 100
        : null;
      const varianceValue = varianceQuantity !== null && item.unit_cost
        ? varianceQuantity * item.unit_cost
        : null;

      const updateData: any = {
        counted_quantity: closingStock,
        variance_quantity: varianceQuantity,
        variance_percentage: variancePercentage,
        variance_value: varianceValue,
        notes: comments || null,
        status: closingStock !== null ? 'counted' : item.status,
        is_counted: closingStock !== null, // Set is_counted for stockly schema trigger
        counted_at: closingStock !== null ? new Date().toISOString() : item.counted_at,
      };

      // Only update approval_comments if it's being edited (for approvers)
      if (editingValue.approvalComment !== undefined) {
        updateData.approval_comments = approvalComment || null;
      }

      const { error } = await supabase
        .from('stock_count_items')
        .update(updateData)
        .eq('id', item.id);

      if (error) {
        console.error('Error saving item:', error);
        alert('Error saving item. Please try again.');
      } else {
        // Clear editing value
        setEditingValues(prev => {
          const newValues = { ...prev };
          delete newValues[item.id];
          return newValues;
        });
        // Refresh data
        fetchData();
      }
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Error saving item. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  // Handle saving all items with pending edits
  const handleSaveAll = async () => {
    const itemsToSave = items.filter(item => {
      const editingValue = editingValues[item.id];
      return editingValue && (
        editingValue.closingStock !== undefined || 
        editingValue.comments !== undefined ||
        editingValue.reviewerComment !== undefined ||
        editingValue.approvalComment !== undefined
      );
    });

    if (itemsToSave.length === 0) {
      toast.info('No changes to save');
      return;
    }

    setProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Save all items in parallel
      const savePromises = itemsToSave.map(async (item) => {
        const editingValue = editingValues[item.id];
        const closingStock = editingValue.closingStock !== undefined 
          ? editingValue.closingStock 
          : item.counted_quantity;
        const comments = editingValue.comments !== undefined 
          ? editingValue.comments 
          : item.notes;
        const approvalComment = editingValue.approvalComment !== undefined
          ? editingValue.approvalComment
          : (item as any).approval_comments;

        // Recalculate variances
        const theoreticalClosing = item.theoretical_closing || 0;
        const varianceQuantity = closingStock !== null ? closingStock - theoreticalClosing : null;
        const variancePercentage = theoreticalClosing !== 0 && varianceQuantity !== null
          ? (varianceQuantity / theoreticalClosing) * 100
          : null;
        const varianceValue = varianceQuantity !== null && item.unit_cost
          ? varianceQuantity * item.unit_cost
          : null;

        const updateData: any = {
          counted_quantity: closingStock,
          variance_quantity: varianceQuantity,
          variance_percentage: variancePercentage,
          variance_value: varianceValue,
          notes: comments || null,
          status: closingStock !== null ? 'counted' : item.status,
          is_counted: closingStock !== null,
          counted_at: closingStock !== null ? new Date().toISOString() : item.counted_at,
        };

        // Only update approval_comments if it's being edited (for approvers)
        if (editingValue.approvalComment !== undefined) {
          updateData.approval_comments = approvalComment || null;
        }

        const { error } = await supabase
          .from('stock_count_items')
          .update(updateData)
          .eq('id', item.id);

        if (error) {
          console.error(`Error saving item ${item.id}:`, error);
          errorCount++;
          throw error;
        } else {
          successCount++;
        }
      });

      await Promise.all(savePromises);

      // Clear all editing values
      setEditingValues({});
      
      // Refresh data
      await fetchData();

      if (errorCount > 0) {
        toast.error(`Saved ${successCount} items, but ${errorCount} failed`);
      } else {
        toast.success(`Successfully saved ${successCount} item${successCount !== 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Error saving items:', error);
      toast.error(`Error saving items. ${successCount > 0 ? `Saved ${successCount} items.` : ''}`);
    } finally {
      setProcessing(false);
    }
  };

  // Handle closing stock change
  const handleClosingStockChange = (itemId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setEditingValues(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        closingStock: isNaN(numValue as number) ? undefined : numValue,
      },
    }));
  };

  // Handle comments change
  const handleCommentsChange = (itemId: string, value: string) => {
    setEditingValues(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        comments: value,
      },
    }));
  };

  // Handle reviewer comment change
  const handleReviewerCommentChange = (itemId: string, value: string) => {
    setEditingValues(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        reviewerComment: value,
      },
    }));
  };

  // Handle approval comment change
  const handleApprovalCommentChange = (itemId: string, value: string) => {
    setEditingValues(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        approvalComment: value,
      },
    }));
  };

  // Handle recalculating items_counted
  const handleRecalculateItemsCounted = async () => {
    if (!count || !params.id) return;
    
    const countId = Array.isArray(params.id) ? params.id[0] : params.id;
    
    setRecalculating(true);
    try {
      const response = await fetch(`/api/stock-counts/recalculate-items-counted/${countId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to recalculate items counted');
      }

      toast.success(`Recalculated: ${data.items_counted} items counted`);
      fetchData();
    } catch (error: any) {
      console.error('Error recalculating items counted:', error);
      toast.error(error.message || 'Failed to recalculate items counted');
    } finally {
      setRecalculating(false);
    }
  };

  // Handle manual backfill for existing counts
  const handleBackfill = async () => {
    if (!count || !params.id) return;
    
    const countId = Array.isArray(params.id) ? params.id[0] : params.id;
    
    setBackfilling(true);
    try {
      const response = await fetch(`/api/stock-counts/backfill/${countId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to backfill count');
      }

      toast.success('Stock count updated for approval workflow');
      fetchData();
    } catch (error: any) {
      console.error('Error backfilling count:', error);
      toast.error(error.message || 'Failed to backfill count');
    } finally {
      setBackfilling(false);
    }
  };

  // Handle opening approver selection modal
  const handleOpenApproverModal = () => {
    setShowApproverModal(true);
  };

  // Handle approver selection from modal
  const handleApproverSelected = async (approver: { id: string; name: string; role: string }) => {
    setSelectedApprover(approver);
    setApproverInfo({
      name: approver.name,
      role: approver.role,
    });
    setShowApproverModal(false);
    
    // Now proceed with marking ready for approval
    await handleMarkReadyForApproval(approver.id);
  };

  // Handle marking ready for approval (with selected approver)
  const handleMarkReadyForApproval = async (approverId?: string) => {
    if (!count || !params.id) return;
    
    const countId = Array.isArray(params.id) ? params.id[0] : params.id;
    
    // If no approver selected, show modal
    if (!approverId && !selectedApprover) {
      handleOpenApproverModal();
      return;
    }

    const finalApproverId = approverId || selectedApprover?.id;
    if (!finalApproverId) {
      toast.error('Please select an approver');
      return;
    }
    
    // Show confirmation with approver name
    const approverName = selectedApprover?.name || approverInfo?.name || 'the approver';
    const approverRole = selectedApprover?.role || approverInfo?.role || 'Approver';
    const confirmMessage = `Mark this stock count ready for approval?\n\n${approverName} (${approverRole}) will receive:\n• An in-app notification\n• A message in Msgly (from Opsly System)\n• A calendar task\n\nThey will be able to review and approve or reject this count.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setMarkingReady(true);
    try {
      const response = await fetch(`/api/stock-counts/ready-for-approval/${countId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approver_id: finalApproverId }),
      });

      const data = await response.json();

      // Debug: log full API response (including debug.logs if present)
      console.log('📋 [ready-for-approval] API response:', data);
      if (data.debug?.logs?.length) {
        console.log('📋 [ready-for-approval] debug logs:');
        data.debug.logs.forEach((line: string) => console.log('  ', line));
        console.log('📋 [ready-for-approval] task_assigned_to:', data.debug.task_assigned_to);
        console.log('📋 [ready-for-approval] calendar_date:', data.debug.calendar_date);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark ready for approval');
      }

      // Update approver info from response if available
      if (data.approver) {
        setApproverInfo({
          name: data.approver.name || approverName,
          role: data.approver.role || approverRole,
        });
      }

      toast.success(
        `✅ Stock count marked ready for approval!\n\n${approverName} has been notified via:\n• In-app notification\n• Msgly message (from Opsly System)\n• Calendar task\n\nThey can now review and approve or reject this count.`,
        { duration: 7000 }
      );
      fetchData();
    } catch (error: any) {
      console.error('Error marking ready for approval:', error);
      toast.error(error.message || 'Failed to mark ready for approval');
    } finally {
      setMarkingReady(false);
    }
  };

  // Handle approval
  const handleApprove = async () => {
    if (!count || !params.id) return;
    
    const countId = Array.isArray(params.id) ? params.id[0] : params.id;
    
    setProcessing(true);
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to approve counts');
        return;
      }

      // Collect approval comments
      const approvalComments: Record<string, string> = {};
      Object.entries(editingValues).forEach(([itemId, values]) => {
        if (values.approvalComment !== undefined) {
          approvalComments[itemId] = values.approvalComment || '';
        }
      });

      console.log('💬 Frontend: Approval comments being sent:', {
        count: Object.keys(approvalComments).length,
        comments: Object.entries(approvalComments).map(([id, comment]) => ({
          itemId: id,
          comment: comment,
          hasComment: !!comment,
        })),
        allEditingValues: Object.keys(editingValues).length,
      });

      const response = await fetch(`/api/stock-counts/approve/${countId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approvalComments }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve count');
      }

      toast.success('Stock count approved. The counter has been notified.');
      fetchData();
    } catch (error: any) {
      console.error('Error approving count:', error);
      toast.error(error.message || 'Failed to approve count');
    } finally {
      setProcessing(false);
    }
  };

  // Handle rejection
  const handleReject = () => {
    setShowRejectionModal(true);
  };

  const handleConfirmReject = async () => {
    if (!count || !params.id || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    
    const countId = Array.isArray(params.id) ? params.id[0] : params.id;

    setProcessing(true);
    try {
      // Collect approval comments
      const approvalComments: Record<string, string> = {};
      Object.entries(editingValues).forEach(([itemId, values]) => {
        if (values.approvalComment !== undefined) {
          approvalComments[itemId] = values.approvalComment || '';
        }
      });

      const response = await fetch(`/api/stock-counts/reject/${countId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason.trim(),
          approvalComments,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject count');
      }

      toast.success('Stock count rejected. The counter has been notified.');
      setShowRejectionModal(false);
      setRejectionReason('');
      fetchData();
    } catch (error: any) {
      console.error('Error rejecting count:', error);
      toast.error(error.message || 'Failed to reject count');
    } finally {
      setProcessing(false);
    }
  };

  // Excel-like filter dropdown component
  const renderFilterDropdown = (columnKey: string, isNumeric: boolean = false, isVariance: boolean = false) => {
    const filter = columnFilters[columnKey] || {};
    const isOpen = openFilterDropdown === columnKey;
    const hasFilter = filter.value || filter.min || filter.max || filter.selectedValues?.length || filter.type;
    const uniqueValues = !isNumeric && !isVariance ? getUniqueValues(columnKey) : [];

    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenFilterDropdown(isOpen ? null : columnKey);
          }}
          className={`w-full h-6 flex items-center justify-center rounded border ${
            hasFilter 
              ? 'bg-emerald-100 dark:bg-emerald-600/20 border-emerald-300 dark:border-emerald-500' 
              : 'bg-white dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.06]'
          } hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors`}
        >
          <Filter className={`h-3 w-3 ${hasFilter ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`} />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onMouseDown={(e) => {
                // Don't close if clicking on Select portal content or inside the dropdown
                const target = e.target as HTMLElement;
                const isInPortal = target.closest('[data-radix-portal]') || 
                                  target.closest('[data-radix-select-content]') ||
                                  target.closest('[data-radix-select-viewport]') ||
                                  target.closest('[data-radix-select-item]');
                const isInDropdown = target.closest('.filter-dropdown-content');
                if (isInPortal || isInDropdown) {
                  return;
                }
                setOpenFilterDropdown(null);
              }}
            />
            <div 
              className="filter-dropdown-content absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/[0.06] rounded-lg shadow-lg z-[100] max-h-96 overflow-y-auto"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 space-y-3" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                {isNumeric || isVariance ? (
                  // Number filters
                  <>
                    <div className="space-y-2">
                      <Select
                        label="Filter Type"
                        value={filter.type || ''}
                        onValueChange={(v) => setColumnFilters(prev => ({
                          ...prev,
                          [columnKey]: { ...prev[columnKey], type: v || undefined }
                        }))}
                        options={
                          isVariance
                            ? [
                                { label: 'All', value: '' },
                                { label: 'Positive', value: 'positive' },
                                { label: 'Negative', value: 'negative' },
                                { label: 'Zero', value: 'zero' },
                                { label: 'Equals', value: 'equals' },
                                { label: 'Greater Than', value: 'greater' },
                                { label: 'Less Than', value: 'less' },
                                { label: 'Between', value: 'range' },
                              ]
                            : [
                                { label: 'All', value: '' },
                                { label: 'Equals', value: 'equals' },
                                { label: 'Greater Than', value: 'greater' },
                                { label: 'Less Than', value: 'less' },
                                { label: 'Between', value: 'range' },
                              ]
                        }
                        className="w-full"
                      />
                      {filter.type === 'range' ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Min"
                            value={filter.min || ''}
                            onChange={(e) => setColumnFilters(prev => ({
                              ...prev,
                              [columnKey]: { ...prev[columnKey], min: e.target.value }
                            }))}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Max"
                            value={filter.max || ''}
                            onChange={(e) => setColumnFilters(prev => ({
                              ...prev,
                              [columnKey]: { ...prev[columnKey], max: e.target.value }
                            }))}
                            className="flex-1"
                          />
                        </div>
                      ) : filter.type && filter.type !== 'positive' && filter.type !== 'negative' && filter.type !== 'zero' ? (
                        <Input
                          type="number"
                          placeholder="Value"
                          value={filter.value || ''}
                          onChange={(e) => setColumnFilters(prev => ({
                            ...prev,
                            [columnKey]: { ...prev[columnKey], value: e.target.value }
                          }))}
                          className="w-full"
                        />
                      ) : null}
                    </div>
                  </>
                ) : (
                  // Text filters with checkbox list
                  <>
                    <div>
                      <Input
                        type="text"
                        placeholder="Search..."
                        value={filter.value || ''}
                        onChange={(e) => setColumnFilters(prev => ({
                          ...prev,
                          [columnKey]: { ...prev[columnKey], value: e.target.value }
                        }))}
                        className="w-full mb-2"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {uniqueValues.map((value) => {
                        const isSelected = filter.selectedValues?.includes(value) || false;
                        return (
                          <label
                            key={value}
                            className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 dark:hover:bg-white/[0.05] cursor-pointer rounded"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const current = filter.selectedValues || [];
                                const newValues = e.target.checked
                                  ? [...current, value]
                                  : current.filter(v => v !== value);
                                setColumnFilters(prev => ({
                                  ...prev,
                                  [columnKey]: { ...prev[columnKey], selectedValues: newValues.length > 0 ? newValues : undefined }
                                }));
                              }}
                              className="rounded border-gray-300 dark:border-white/[0.2]"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{value}</span>
                          </label>
                        );
                      })}
                      {uniqueValues.length === 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 px-2">No values found</p>
                      )}
                    </div>
                  </>
                )}
                <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-white/[0.06]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setColumnFilters(prev => {
                        const newFilters = { ...prev };
                        delete newFilters[columnKey];
                        return newFilters;
                      });
                      setOpenFilterDropdown(null);
                    }}
                    className="flex-1"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setOpenFilterDropdown(null)}
                    className="flex-1"
                  >
                    OK
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Helper to render sortable header with filter button below
  const renderSortableHeader = (field: string, label: string, align: 'left' | 'right' = 'left', isNumeric: boolean = false, isVariance: boolean = false, isSticky: boolean = false) => {
    const isSorted = sortConfig?.field === field;
    const sortDirection = isSorted ? sortConfig.direction : null;
    
    return (
      <th 
        className={`px-2 py-2 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider ${
          isSticky ? 'sticky left-0 z-[3] bg-gray-50 dark:bg-white/[0.05] shadow-[4px_0_6px_rgba(0,0,0,0.15)] min-w-[150px] border-r-2 border-gray-200 dark:border-white/[0.1]' : 'z-[1]'
        }`}
      >
        <div className="flex flex-col items-center gap-1">
          {/* Heading with sort icon */}
          <div 
            className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.08] px-1 py-0.5 rounded transition-colors w-full justify-center"
            onClick={() => handleSort(field)}
          >
            <span className="truncate">{label}</span>
            {isSorted ? (
              sortDirection === 'asc' ? (
                <ArrowUp className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              ) : (
                <ArrowDown className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              )
            ) : (
              <ArrowUpDown className="h-2.5 w-2.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            )}
          </div>
          {/* Filter button below */}
          <div className="flex-shrink-0">
            {renderFilterDropdown(field, isNumeric, isVariance)}
          </div>
        </div>
      </th>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-[#0B0D13]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }

  if (!count) {
    return (
      <div className="w-full bg-gray-50 dark:bg-[#0B0D13] min-h-screen">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Stock count not found</p>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/stockly/stock-counts')}
              className="mt-4 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Back to Counts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-screen flex flex-col overflow-hidden"
      style={{
        maxWidth: '100%',
        position: 'relative'
      }}
    >
      {/* FIXED HEADER - Never scrolls */}
      <div className="flex-shrink-0 bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-white/[0.06] px-6 py-4 space-y-4">
        {/* Back button, title, and action buttons */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/stockly/stock-counts')}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex-shrink-0"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white min-w-0 truncate">
                {count?.name}
              </h1>
              {count?.status && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  count.status === 'completed' || count.status === 'ready_for_approval' 
                    ? 'bg-amber-100 dark:bg-amber-600/20 text-amber-800 dark:text-amber-400'
                    : count.status === 'approved'
                    ? 'bg-green-100 dark:bg-green-600/20 text-green-800 dark:text-green-400'
                    : count.status === 'rejected'
                    ? 'bg-red-100 dark:bg-red-600/20 text-red-800 dark:text-red-400'
                    : count.status === 'in_progress' || count.status === 'draft' || count.status === 'active'
                    ? 'bg-blue-100 dark:bg-blue-600/20 text-blue-800 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-600/20 text-gray-800 dark:text-gray-400'
                }`}>
                  {count.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              )}
            </div>
            {count?.status === 'rejected' && count?.rejection_reason && (
              <div className="flex-1 min-w-0">
                <div className="p-3 bg-red-50 dark:bg-red-600/10 border border-red-200 dark:border-red-600/30 rounded-lg text-sm">
                  <p className="font-semibold text-red-800 dark:text-red-400 mb-1">Rejection reason</p>
                  <p className="text-red-700 dark:text-red-300 whitespace-pre-wrap">{count.rejection_reason}</p>
                  <p className="text-red-600 dark:text-red-400 text-xs mt-2">
                    Check the <strong>Rejection feedback</strong> column below for per-line feedback on which items need attention. Rows with feedback are highlighted.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Backfill button - show for counts that might need updating (finalized/locked without approval flow) */}
          {(count?.status === 'finalized' || count?.status === 'locked') && 
           (!count?.approved_by && !count?.ready_for_approval_at) && (
            <Button
              onClick={handleBackfill}
              disabled={backfilling}
              variant="outline"
              className="border-blue-600/50 text-blue-400 hover:bg-blue-600/10 hover:border-blue-600"
              title="Update this count to work with the approval workflow"
            >
              {backfilling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update for Approval Flow
                </>
              )}
            </Button>
          )}

          {/* Fix Count button - only show if items_counted is 0 but items exist */}
          {count && count.items_counted === 0 && items.length > 0 && (
            <Button
              onClick={handleRecalculateItemsCounted}
              disabled={recalculating}
              size="sm"
              variant="outline"
              className="border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800"
              title="Recalculate items_counted based on items with counted_quantity"
            >
              {recalculating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Recalculating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Fix Count
                </>
              )}
            </Button>
          )}

          {/* Mark Ready for Approval button - show if completed, rejected, or in_progress/draft/active (regardless of items counted) */}
          {((count?.status === 'completed' || count?.status === 'rejected') || 
            count?.status === 'in_progress' ||
            count?.status === 'draft' ||
            count?.status === 'active') && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {loadingApprover && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">Loading approver...</span>
                )}
                {approverInfo && !loadingApprover && (
                  <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-600/30 rounded text-xs">
                    <span className="text-blue-800 dark:text-blue-300">
                      <strong>Will be reviewed by:</strong> {approverInfo.name} ({approverInfo.role})
                    </span>
                  </div>
                )}
              <Button
                onClick={handleOpenApproverModal}
                disabled={markingReady || loadingApprover}
                className="bg-amber-600 hover:bg-amber-700 text-white"
                title={
                  count?.status === 'in_progress' || count?.status === 'draft' || count?.status === 'active'
                    ? 'This will mark the count as completed and ready for approval'
                    : 'Mark this count as ready for approval'
                }
              >
                {markingReady ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark Ready for Approval
                  </>
                )}
              </Button>
              </div>
              {approverInfo && !loadingApprover && (
                <div className="text-xs text-gray-600 dark:text-gray-400 px-1">
                  They will receive an in-app notification, Msgly message (from Opsly System), and a calendar task.
                </div>
              )}
            </div>
          )}

          {/* Status info and approval section - show if ready_for_approval */}
          {count?.status === 'ready_for_approval' && (
            <div className="flex flex-col gap-3">
              {/* Info banner */}
              <div className="px-4 py-3 bg-amber-50 dark:bg-amber-600/10 border border-amber-200 dark:border-amber-600/30 rounded-lg">
                {approverInfo && !isApprover && (
                  <div className="text-sm text-amber-800 dark:text-amber-400 mb-2">
                    <strong>Awaiting approval from:</strong> {approverInfo.name} ({approverInfo.role})
                  </div>
                )}
                {approverInfo && !isApprover && (
                  <div className="text-xs text-amber-700 dark:text-amber-500 mb-2">
                    They have been notified via message and in-app notification. They can review and approve or reject this count.
                  </div>
                )}
                {isApprover && (
                  <div className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-2">
                    ⚠️ Action Required: This count is waiting for your approval
                  </div>
                )}
                {autoApproveCountdown !== null && (
                  <div className="text-xs text-amber-600 dark:text-amber-500">
                    ⏰ Auto-approves in <strong>{autoApproveCountdown}</strong> hours (to ensure stock on hand figures are updated)
                  </div>
                )}
              </div>

              {/* Approval/Rejection buttons - show if user is the approver */}
              {isApprover && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleReject}
                    disabled={processing}
                    variant="outline"
                    size="lg"
                    className="flex-1 border-amber-600/50 text-amber-400 hover:bg-amber-600/10 hover:border-amber-600"
                  >
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Requires Attention
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={processing}
                    size="lg"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    {processing ? 'Processing...' : 'Approve'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Approval/Rejection buttons for pending_review status */}
          {count?.status === 'pending_review' && (
            <div className="flex gap-3">
              <Button
                onClick={handleReject}
                disabled={processing}
                variant="outline"
                size="lg"
                className="flex-1 border-amber-600/50 text-amber-400 hover:bg-amber-600/10 hover:border-amber-600"
              >
                <AlertTriangle className="mr-2 h-5 w-5" />
                Requires Attention
              </Button>
              <Button
                onClick={handleApprove}
                disabled={processing}
                size="lg"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                {processing ? 'Processing...' : 'Approve'}
              </Button>
            </div>
          )}
        </div>

        {/* Save All button - prominent placement when there are unsaved changes */}
        {(() => {
          const itemsWithChanges = items.filter(item => {
            const editingValue = editingValues[item.id];
            if (!editingValue) return false;
            
            // Check if any field has been changed
            const hasClosingStockChange = editingValue.closingStock !== undefined && 
              editingValue.closingStock !== item.counted_quantity;
            const hasCommentsChange = editingValue.comments !== undefined && 
              editingValue.comments !== (item.notes || '');
            const hasReviewerCommentChange = editingValue.reviewerComment !== undefined;
            const hasApprovalCommentChange = editingValue.approvalComment !== undefined;
            
            return hasClosingStockChange || hasCommentsChange || hasReviewerCommentChange || hasApprovalCommentChange;
          });
          
          if (itemsWithChanges.length > 0) {
            console.log('✅ Rendering Save All button with', itemsWithChanges.length, 'items');
            return (
              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-600/10 border border-emerald-200 dark:border-emerald-600/30 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <Save className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    You have {itemsWithChanges.length} unsaved change{itemsWithChanges.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <Button
                  onClick={handleSaveAll}
                  disabled={processing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save All ({itemsWithChanges.length})
                    </>
                  )}
                </Button>
              </div>
            );
          }
          return null;
        })()}

        {/* Search and filters */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search Bar */}
          <div className="flex-1 flex gap-2 min-w-0 max-w-md">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="pl-8 h-9 text-sm bg-white dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
              />
            </div>
            <Select
              label=""
              value={searchScope}
              onValueChange={(v) => setSearchScope(v as 'all' | 'item' | 'supplier' | 'comments')}
              options={[
                { label: 'All', value: 'all' },
                { label: 'Item', value: 'item' },
                { label: 'Supplier', value: 'supplier' },
                { label: 'Comments', value: 'comments' },
              ]}
              className="w-28 h-9 text-sm"
            />
          </div>

          {/* Library Filter */}
          <div className="relative">
            <Select
              label=""
              value={selectedLibrary}
              onValueChange={(v) => setSelectedLibrary(v as LibraryType | 'all')}
              options={[
                { label: 'All Libraries', value: 'all' },
                ...availableLibraries.map((lib) => ({
                  label: getLibraryName(lib),
                  value: lib,
                }))
              ]}
              placeholder="Library..."
              className="w-40 h-9 text-sm"
            />
          </div>

          {/* Clear All Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setColumnFilters({});
              setSearchTerm('');
              setSortConfig(null);
            }}
            className="border-gray-300 dark:border-white/[0.06] text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 h-9 flex-shrink-0"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-[#0B0D13] min-h-0">
        <div className="p-6">
        
        {/* Variance Summary Cards */}
        {count && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Variance</p>
              <p className={`text-2xl font-bold mt-1 ${
                overallSummary.varianceCost < 0 
                  ? 'text-red-600 dark:text-red-400' 
                  : overallSummary.varianceCost > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {overallSummary.varianceCost < 0 ? '-' : overallSummary.varianceCost > 0 ? '+' : ''}
                £{Math.abs(overallSummary.varianceCost || 0).toFixed(2)}
              </p>
            </div>
            
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Shrinkage</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                £{Math.abs(Math.min(overallSummary.varianceCost || 0, 0)).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {filteredItems.filter(i => (i.variance_value || 0) < 0).length} items
              </p>
            </div>
            
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Overage</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                +£{Math.max(overallSummary.varianceCost || 0, 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {filteredItems.filter(i => (i.variance_value || 0) > 0).length} items
              </p>
            </div>
            
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Items with Variance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {filteredItems.filter(i => Math.abs(i.variance_quantity || 0) > 0.001).length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                of {filteredItems.length} total
              </p>
            </div>
          </div>
        )}

        {/* Collapsible Summary Table */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg mb-6 overflow-hidden">
          <button
            onClick={() => setShowSummary(!showSummary)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Summary Statistics</h2>
            {showSummary ? (
              <ChevronUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {showSummary && (
            <div className="border-t border-gray-200 dark:border-white/[0.06]">
              <div className="overflow-x-auto">
                {/* Overall Totals */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-600/10">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Overall Totals</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-white/[0.06]">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Metric</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Opening Stock</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Purchases</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Production</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Sales</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Waste</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Closing Stock</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Variance Units</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Variance Cost</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Avg % Var Units</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Avg % Var Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200 dark:border-white/[0.06]">
                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">Total</td>
                        <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{formatNumber(overallSummary.openingStock)}</td>
                        <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{formatNumber(overallSummary.purchases)}</td>
                        <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{formatNumber(overallSummary.production)}</td>
                        <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{formatNumber(overallSummary.sales)}</td>
                        <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{formatNumber(overallSummary.waste)}</td>
                        <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{formatNumber(overallSummary.closingStock)}</td>
                        <td className={`px-4 py-2 text-right font-medium ${
                          overallSummary.varianceUnits < 0 ? 'text-red-600 dark:text-red-400' : 
                          overallSummary.varianceUnits > 0 ? 'text-green-600 dark:text-green-400' : 
                          'text-gray-900 dark:text-white'
                        }`}>
                          {formatNumber(overallSummary.varianceUnits)}
                        </td>
                        <td className={`px-4 py-2 text-right font-medium ${
                          overallSummary.varianceCost < 0 ? 'text-red-600 dark:text-red-400' : 
                          overallSummary.varianceCost > 0 ? 'text-green-600 dark:text-green-400' : 
                          'text-gray-900 dark:text-white'
                        }`}>
                          {formatNumber(overallSummary.varianceCost)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                          {overallSummary.avgVariancePercentUnits !== null ? `${formatNumber(overallSummary.avgVariancePercentUnits, 2)}%` : '—'}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                          {overallSummary.avgVariancePercentCost !== null ? `${formatNumber(overallSummary.avgVariancePercentCost, 2)}%` : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Per-Library Summaries */}
                {librarySummaries.length > 0 && (
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Per-Library Summaries</h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-white/[0.06]">
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Library</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Items</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Opening Stock</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Purchases</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Production</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Sales</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Waste</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Closing Stock</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Variance Units</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Variance Cost</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Avg % Var Units</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Avg % Var Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {librarySummaries.map((libSummary) => {
                          const Icon = getLibraryIcon(libSummary.libraryType as LibraryType);
                          return (
                            <tr key={libSummary.libraryType} className="border-b border-gray-200 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  <span className="font-medium text-gray-900 dark:text-white">{libSummary.libraryName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{libSummary.itemCount}</td>
                              <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{formatNumber(libSummary.summary.openingStock)}</td>
                              <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{formatNumber(libSummary.summary.purchases)}</td>
                              <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{formatNumber(libSummary.summary.production)}</td>
                              <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{formatNumber(libSummary.summary.sales)}</td>
                              <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{formatNumber(libSummary.summary.waste)}</td>
                              <td className="px-4 py-2 text-right text-gray-900 dark:text-white">{formatNumber(libSummary.summary.closingStock)}</td>
                              <td className={`px-4 py-2 text-right font-medium ${
                                libSummary.summary.varianceUnits < 0 ? 'text-red-600 dark:text-red-400' : 
                                libSummary.summary.varianceUnits > 0 ? 'text-green-600 dark:text-green-400' : 
                                'text-gray-900 dark:text-white'
                              }`}>
                                {formatNumber(libSummary.summary.varianceUnits)}
                              </td>
                              <td className={`px-4 py-2 text-right font-medium ${
                                libSummary.summary.varianceCost < 0 ? 'text-red-600 dark:text-red-400' : 
                                libSummary.summary.varianceCost > 0 ? 'text-green-600 dark:text-green-400' : 
                                'text-gray-900 dark:text-white'
                              }`}>
                                {formatNumber(libSummary.summary.varianceCost)}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                                {libSummary.summary.avgVariancePercentUnits !== null ? `${formatNumber(libSummary.summary.avgVariancePercentUnits, 2)}%` : '—'}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                                {libSummary.summary.avgVariancePercentCost !== null ? `${formatNumber(libSummary.summary.avgVariancePercentCost, 2)}%` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Review Report Table - Grouped by Library */}
        {Object.entries(itemsByLibrary).length === 0 ? (
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No items found</p>
          </div>
        ) : (
          Object.entries(itemsByLibrary).map(([libraryType, libraryItems]) => {
            const Icon = getLibraryIcon(libraryType as LibraryType);
            const libraryName = getLibraryName(libraryType as LibraryType);

            return (
              <div key={libraryType} className="mb-8">
                {/* Library Header */}
                <div className="bg-emerald-50 dark:bg-emerald-600/10 border border-emerald-200 dark:border-emerald-600/30 rounded-t-lg px-6 py-4 flex items-center gap-3">
                  <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {libraryName} ({libraryItems.length} items)
                  </h2>
                </div>

                {/* Split table container */}
                <div className="flex bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] border-t-0 rounded-b-lg">
                  
                  {/* FROZEN ITEM COLUMN */}
                  <div 
                    ref={(el) => {
                      if (!scrollRefs.current[libraryType]) {
                        scrollRefs.current[libraryType] = { frozen: null, scrollable: null };
                      }
                      scrollRefs.current[libraryType].frozen = el;
                    }}
                    onScroll={(e) => {
                      if (syncingScroll.current) return;
                      syncingScroll.current = true;
                      
                      const scrollableDiv = scrollRefs.current[libraryType]?.scrollable;
                      if (scrollableDiv) {
                        scrollableDiv.scrollTop = e.currentTarget.scrollTop;
                      }
                      
                      requestAnimationFrame(() => {
                        syncingScroll.current = false;
                      });
                    }}
                    className="flex-shrink-0 border-r-2 border-gray-200 dark:border-white/[0.1] [&::-webkit-scrollbar]:hidden"
                    style={{
                      width: '200px',
                      height: 'calc(100vh - 250px)',
                      minHeight: '800px',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
                  >
                    <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                      <thead className="sticky top-0 bg-gray-50 dark:bg-white/[0.05] z-10">
                        <tr>
                          <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-white/[0.06]">
                            <div className="flex flex-col items-center gap-1">
                              {/* Heading with sort icon */}
                              <div 
                                className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.08] px-1 py-0.5 rounded transition-colors w-full justify-center"
                                onClick={() => handleSort('item')}
                              >
                                <span className="truncate">Item</span>
                                {sortConfig?.field === 'item' ? (
                                  sortConfig.direction === 'asc' ? (
                                    <ArrowUp className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                  ) : (
                                    <ArrowDown className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                  )
                                ) : (
                                  <ArrowUpDown className="h-2.5 w-2.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                )}
                              </div>
                              {/* Filter button below */}
                              <div className="flex-shrink-0">
                                {renderFilterDropdown('item', false, false)}
                              </div>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {libraryItems.map((item) => {
                          const editingValue = editingValues[item.id];
                          const isEditing = editingValue !== undefined;

                          return (
                            <tr
                              key={item.id}
                              className={`border-b border-gray-200 dark:border-white/[0.06] ${
                                isEditing
                                  ? 'bg-blue-50 dark:bg-blue-500/10'
                                  : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'
                              }`}
                            >
                              <td className="px-3 py-2.5 text-xs text-gray-900 dark:text-white font-medium" style={{ height: '45px' }}>
                                <div className="line-clamp-2 leading-tight">
                                  {item.ingredient?.name || 'Unknown'}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* SCROLLABLE COLUMNS */}
                  <div 
                    ref={(el) => {
                      if (!scrollRefs.current[libraryType]) {
                        scrollRefs.current[libraryType] = { frozen: null, scrollable: null };
                      }
                      scrollRefs.current[libraryType].scrollable = el;
                    }}
                    onScroll={(e) => {
                      if (syncingScroll.current) return;
                      syncingScroll.current = true;
                      
                      const frozenDiv = scrollRefs.current[libraryType]?.frozen;
                      if (frozenDiv) {
                        frozenDiv.scrollTop = e.currentTarget.scrollTop;
                      }
                      
                      requestAnimationFrame(() => {
                        syncingScroll.current = false;
                      });
                    }}
                    className="flex-1"
                    style={{
                      height: 'calc(100vh - 250px)',
                      minHeight: '800px',
                      overflowY: 'auto',
                      overflowX: 'auto'
                    }}
                  >
                    <table style={{ width: '100%', minWidth: 'max-content', tableLayout: 'auto', borderCollapse: 'collapse' }}>
                      <thead className="sticky top-0 bg-gray-50 dark:bg-white/[0.05] z-10">
                        <tr className="border-b border-gray-200 dark:border-white/[0.06]">
                          {renderSortableHeader('supplier', 'Supplier', 'left', false, false, false)}
                          {renderSortableHeader('measurement', 'Measurement', 'left', false, false, false)}
                          {renderSortableHeader('openingStock', 'Opening', 'right', true, false, false)}
                          {renderSortableHeader('purchases', 'Purchases', 'right', true, false, false)}
                          {renderSortableHeader('production', 'Production', 'right', true, false, false)}
                          {renderSortableHeader('sales', 'Sales', 'right', true, false, false)}
                          {renderSortableHeader('waste', 'Waste', 'right', true, false, false)}
                          {renderSortableHeader('closingStock', 'Closing', 'right', true, false, false)}
                          {renderSortableHeader('varianceUnits', 'Var Units', 'right', true, true, false)}
                          {renderSortableHeader('varianceCost', 'Var Cost', 'right', true, true, false)}
                          {renderSortableHeader('variancePercentUnits', '% Var Units', 'right', true, false, false)}
                          {renderSortableHeader('variancePercentCost', '% Var Cost', 'right', true, false, false)}
                          {renderSortableHeader('comments', 'Comments', 'left', false, false, false)}
                          {count?.status === 'pending_review' && (
                            <th className="px-2 py-3 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[120px]">
                              <div className="flex flex-col items-center gap-1">
                                <span>Reviewer Comment</span>
                              </div>
                            </th>
                          )}
                          {count?.status === 'ready_for_approval' && isApprover && (
                            <th className="px-2 py-3 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[120px]">
                              <div className="flex flex-col items-center gap-1">
                                <span>Approval Comments</span>
                              </div>
                            </th>
                          )}
                          {/* Show saved approval/rejection comments for approved/rejected counts */}
                          {(count?.status === 'approved' || count?.status === 'rejected') && (
                            <th className="px-2 py-3 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[140px]">
                              <div className="flex flex-col items-center gap-1">
                                <span>{count?.status === 'rejected' ? 'Rejection feedback' : 'Approval comments'}</span>
                              </div>
                            </th>
                          )}
                          <th className="px-2 py-3 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[80px]">
                            <div className="flex flex-col items-center gap-1">
                              <span>Actions</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {libraryItems.map((item) => {
                          const editingValue = editingValues[item.id];
                          const currentClosingStock = editingValue?.closingStock !== undefined 
                            ? editingValue.closingStock 
                            : item.counted_quantity;
                          const currentComments = editingValue?.comments !== undefined 
                            ? editingValue.comments 
                            : item.notes;
                          const currentReviewerComment = editingValue?.reviewerComment !== undefined
                            ? editingValue.reviewerComment
                            : (item as any).reviewer_comment || '';
                          const currentApprovalComment = editingValue?.approvalComment !== undefined
                            ? editingValue.approvalComment
                            : (item as any).approval_comments || '';
                          
                          // Calculate variances based on current editing value
                          const theoreticalClosing = item.theoretical_closing || 0;
                          const varianceQuantity = currentClosingStock !== null 
                            ? currentClosingStock - theoreticalClosing 
                            : item.variance_quantity;
                          const variancePercentage = theoreticalClosing !== 0 && varianceQuantity !== null
                            ? (varianceQuantity / theoreticalClosing) * 100
                            : item.variance_percentage;
                          const varianceValue = varianceQuantity !== null && item.unit_cost
                            ? varianceQuantity * item.unit_cost
                            : item.variance_value;
                          const varianceCostPercent = calculateVarianceCostPercent(
                            theoreticalClosing,
                            item.unit_cost,
                            varianceValue
                          );

                          const isEditing = editingValue !== undefined;
          const hasChanges = isEditing && (
            editingValue.closingStock !== item.counted_quantity ||
            editingValue.comments !== item.notes ||
            editingValue.reviewerComment !== ((item as any).reviewer_comment || '') ||
            editingValue.approvalComment !== ((item as any).approval_comments || '')
          );
                          const hasRejectionFeedback = count?.status === 'rejected' && !!(item as any).approval_comments;

                          return (
                            <tr
                              key={item.id}
                              className={`border-b border-gray-200 dark:border-white/[0.06] ${
                                isEditing
                                  ? 'bg-blue-50 dark:bg-blue-500/10'
                                  : hasRejectionFeedback
                                  ? 'bg-amber-50 dark:bg-amber-600/10 hover:bg-amber-100 dark:hover:bg-amber-600/20'
                                  : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'
                              }`}
                            >
                              {/* Supplier */}
                              <td className="px-2 py-2.5 text-xs text-gray-700 dark:text-gray-300 text-left" style={{ height: '45px' }}>
                                {(item.ingredient as any)?.supplier || '—'}
                              </td>

                              {/* Measurement */}
                              <td className="px-2 py-2.5 text-xs text-gray-700 dark:text-gray-300 text-center" style={{ height: '45px' }}>
                                {item.unit_of_measurement || '—'}
                              </td>

                              {/* Opening Stock */}
                              <td className="px-2 py-2.5 text-xs text-gray-700 dark:text-gray-300 text-center" style={{ height: '45px' }}>
                                {formatNumber(item.opening_stock)}
                              </td>

                              {/* Purchases */}
                              <td className="px-2 py-2.5 text-xs text-gray-700 dark:text-gray-300 text-center" style={{ height: '45px' }}>
                                {formatNumber(item.stock_in)}
                              </td>

                              {/* Production */}
                              <td className="px-2 py-2.5 text-xs text-gray-700 dark:text-gray-300 text-center" style={{ height: '45px' }}>
                                {formatNumber(item.transfers_in)}
                              </td>

                              {/* Sales */}
                              <td className="px-2 py-2.5 text-xs text-gray-700 dark:text-gray-300 text-center" style={{ height: '45px' }}>
                                {formatNumber(item.sales)}
                              </td>

                              {/* Waste */}
                              <td className="px-2 py-2.5 text-xs text-gray-700 dark:text-gray-300 text-center" style={{ height: '45px' }}>
                                {formatNumber(item.waste)}
                              </td>

                              {/* Closing Stock - EDITABLE */}
                              <td 
                                className="px-2 py-2.5 text-xs text-center whitespace-nowrap"
                                style={{ height: '45px' }}
                              >
                                <div className="flex justify-center">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={currentClosingStock !== null ? currentClosingStock : ''}
                                    onChange={(e) => handleClosingStockChange(item.id, e.target.value)}
                                    onFocus={(e) => {
                                      if (!editingValue) {
                                        setEditingValues(prev => ({
                                          ...prev,
                                          [item.id]: {
                                            closingStock: item.counted_quantity || undefined,
                                            comments: item.notes || undefined,
                                          },
                                        }));
                                      }
                                    }}
                                    className="w-20 h-7 text-xs bg-white dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500/50"
                                    placeholder="0.00"
                                  />
                                </div>
                              </td>

                              {/* Variance Units */}
                              <td className={`px-2 py-2.5 text-xs text-center font-medium ${
                                varianceQuantity !== null && varianceQuantity < 0 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : varianceQuantity !== null && varianceQuantity > 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-900 dark:text-white'
                              }`} style={{ height: '45px' }}>
                                {formatNumber(varianceQuantity)}
                              </td>

                              {/* Variance Cost */}
                              <td className={`px-2 py-2.5 text-xs text-center font-medium ${
                                varianceValue !== null && varianceValue < 0 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : varianceValue !== null && varianceValue > 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-900 dark:text-white'
                              }`} style={{ height: '45px' }}>
                                {formatNumber(varianceValue)}
                              </td>

                              {/* Variance Percentage */}
                              <td className={`px-2 py-2.5 text-xs text-center font-medium ${
                                variancePercentage !== null && variancePercentage < 0 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : variancePercentage !== null && variancePercentage > 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-900 dark:text-white'
                              }`} style={{ height: '45px' }}>
                                {variancePercentage !== null ? `${formatNumber(variancePercentage, 2)}%` : '—'}
                              </td>

                              {/* Variance Cost Percent */}
                              <td className={`px-2 py-2.5 text-xs text-center font-medium ${
                                varianceCostPercent !== null && varianceCostPercent < 0 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : varianceCostPercent !== null && varianceCostPercent > 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-900 dark:text-white'
                              }`} style={{ height: '45px' }}>
                                {varianceCostPercent !== null ? `${formatNumber(varianceCostPercent, 2)}%` : '—'}
                              </td>

                              {/* Comments - EDITABLE */}
                              <td 
                                className="px-2 py-2.5 text-xs whitespace-nowrap text-center"
                                style={{ height: '45px' }}
                              >
                                <div className="flex justify-center">
                                  <Input
                                    type="text"
                                    value={currentComments || ''}
                                    onChange={(e) => handleCommentsChange(item.id, e.target.value)}
                                    onFocus={(e) => {
                                      if (!editingValue) {
                                        setEditingValues(prev => ({
                                          ...prev,
                                          [item.id]: {
                                            closingStock: item.counted_quantity || undefined,
                                            comments: item.notes || undefined,
                                            reviewerComment: (item as any).reviewer_comment || undefined,
                                          },
                                        }));
                                      }
                                    }}
                                    className="w-24 h-7 text-xs bg-white dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white focus:ring-1 focus:ring-emerald-500/50"
                                    placeholder="Comment..."
                                  />
                                </div>
                              </td>

                              {/* Reviewer Comment - Only show if pending review */}
                              {count?.status === 'pending_review' && (
                                <td 
                                  className="px-2 py-2.5 text-xs whitespace-nowrap text-center"
                                  style={{ height: '45px' }}
                                >
                                  <div className="flex justify-center">
                                    <Input
                                      type="text"
                                      value={currentReviewerComment}
                                      onChange={(e) => handleReviewerCommentChange(item.id, e.target.value)}
                                      onFocus={(e) => {
                                        if (!editingValue) {
                                          setEditingValues(prev => ({
                                            ...prev,
                                            [item.id]: {
                                              closingStock: item.counted_quantity || undefined,
                                              comments: item.notes || undefined,
                                              reviewerComment: (item as any).reviewer_comment || undefined,
                                            },
                                          }));
                                        }
                                      }}
                                      className="w-32 h-7 text-xs bg-amber-50 dark:bg-amber-600/10 border-amber-200 dark:border-amber-600/30 text-gray-900 dark:text-white focus:ring-1 focus:ring-amber-500/50"
                                      placeholder="Reviewer note..."
                                    />
                                  </div>
                                </td>
                              )}

                              {/* Approval Comments - Only show if ready_for_approval and user is approver */}
                              {count?.status === 'ready_for_approval' && isApprover && (
                                <td 
                                  className="px-2 py-2.5 text-xs whitespace-nowrap text-center"
                                  style={{ height: '45px' }}
                                >
                                  <div className="flex justify-center">
                                    <Input
                                      type="text"
                                      value={currentApprovalComment}
                                      onChange={(e) => handleApprovalCommentChange(item.id, e.target.value)}
                                      onFocus={(e) => {
                                        if (!editingValue) {
                                          setEditingValues(prev => ({
                                            ...prev,
                                            [item.id]: {
                                              closingStock: item.counted_quantity || undefined,
                                              comments: item.notes || undefined,
                                              approvalComment: (item as any).approval_comments || undefined,
                                            },
                                          }));
                                        }
                                      }}
                                      className="w-32 h-7 text-xs bg-blue-50 dark:bg-blue-600/10 border-blue-200 dark:border-blue-600/30 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500/50"
                                      placeholder="Approval note..."
                                    />
                                  </div>
                                </td>
                              )}
                              
                              {/* Display saved approval comments for approved/rejected counts */}
                              {(count?.status === 'approved' || count?.status === 'rejected') && (item as any).approval_comments && (
                                <td 
                                  className="px-2 py-2.5 text-xs whitespace-nowrap text-center"
                                  style={{ height: '45px' }}
                                >
                                  <div className="flex justify-center">
                                    <div className="w-32 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-600/30 text-gray-900 dark:text-white rounded">
                                      {(item as any).approval_comments}
                                    </div>
                                  </div>
                                </td>
                              )}
                              
                              {/* Empty cell if no approval comments for approved/rejected counts */}
                              {(count?.status === 'approved' || count?.status === 'rejected') && !(item as any).approval_comments && (
                                <td 
                                  className="px-2 py-2.5 text-xs whitespace-nowrap text-center"
                                  style={{ height: '45px' }}
                                >
                                  <span className="text-gray-400 dark:text-gray-600">—</span>
                                </td>
                              )}

                              {/* Actions */}
                              <td className="px-2 py-2.5 text-center" style={{ height: '45px' }}>
                                {hasChanges && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveItem(item)}
                                    disabled={saving === item.id}
                                    loading={saving === item.id}
                                    className="h-6 px-2"
                                  >
                                    {saving === item.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Save className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Stock Count Requires Attention
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please explain what needs to be fixed. The counter will receive this feedback and can make corrections.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim() || processing}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {processing ? 'Sending...' : 'Send Feedback'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Approver Selection Modal */}
      <SelectApproverModal
        isOpen={showApproverModal}
        onClose={() => setShowApproverModal(false)}
        onSelect={handleApproverSelected}
        countId={Array.isArray(params.id) ? params.id[0] : params.id || ''}
        countName={count?.name}
      />
    </div>
  );
}
