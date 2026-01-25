'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  FileText, 
  Loader2,
  CheckCircle,
  Lock,
  AlertCircle,
  Edit,
  Package,
  Box,
  Coffee,
  Trash2
} from 'lucide-react';
import { StockCountWithDetails, StockCountItem, LibraryType } from '@/lib/types/stockly';
import { generateCountSheetPDF, downloadPDF, openPDFInNewTab } from '@/lib/utils/pdf-generator';
import CountDataEntry from '@/components/stockly/stock-counts/CountDataEntry';
import VarianceReport from '@/components/stockly/stock-counts/VarianceReport';
import FinalizeModal from '@/components/stockly/stock-counts/FinalizeModal';
import LockModal from '@/components/stockly/stock-counts/LockModal';
import Link from 'next/link';
import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { hasReviewManagers, getCurrentUserId } from '@/lib/stock-counts';
import { toast } from 'sonner';

export default function StockCountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { companyId } = useAppContext();
  const [count, setCount] = useState<StockCountWithDetails | null>(null);
  const [items, setItems] = useState<StockCountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'print' | 'enter' | 'review'>('print');
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [hasReviewers, setHasReviewers] = useState(false);
  const [submittingForReview, setSubmittingForReview] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchCountDetails();
    }
  }, [params.id]);

  useEffect(() => {
    if (companyId) {
      checkForReviewers();
    }
  }, [companyId]);

  const checkForReviewers = async () => {
    if (!companyId) return;
    const hasReview = await hasReviewManagers(companyId);
    setHasReviewers(hasReview);
  };

  const handleSubmitForReview = async () => {
    if (!count || !params.id) return;
    
    const countId = Array.isArray(params.id) ? params.id[0] : params.id;
    const userId = await getCurrentUserId();
    
    if (!userId) {
      toast.error('Unable to identify current user');
      return;
    }

    setSubmittingForReview(true);
    try {
      const { error } = await supabase
        .from('stock_counts')
        .update({
          status: 'pending_review',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', countId);

      if (error) throw error;

      toast.success('Stock count submitted for review');
      fetchCountDetails();
    } catch (error: any) {
      console.error('Error submitting for review:', error);
      toast.error(error.message || 'Failed to submit for review');
    } finally {
      setSubmittingForReview(false);
    }
  };

  const handleResubmitForReview = async () => {
    if (!count || !params.id) return;
    
    const countId = Array.isArray(params.id) ? params.id[0] : params.id;
    
    setSubmittingForReview(true);
    try {
      const { error } = await supabase
        .from('stock_counts')
        .update({
          status: 'pending_review',
          rejection_reason: null,
          rejected_by: null,
          rejected_at: null,
        })
        .eq('id', countId);

      if (error) throw error;

      toast.success('Stock count resubmitted for review');
      fetchCountDetails();
    } catch (error: any) {
      console.error('Error resubmitting for review:', error);
      toast.error(error.message || 'Failed to resubmit for review');
    } finally {
      setSubmittingForReview(false);
    }
  };

  const handleCompleteCount = async () => {
    if (!count || !params.id) return;
    
    const countId = Array.isArray(params.id) ? params.id[0] : params.id;
    const userId = await getCurrentUserId();
    
    if (!userId) {
      toast.error('Unable to identify current user');
      return;
    }

    setCompleting(true);
    try {
      const { error } = await supabase
        .from('stock_counts')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: userId,
        })
        .eq('id', countId);

      if (error) throw error;

      toast.success('Stock count marked as completed');
      // Redirect to review page where "Mark Ready for Approval" button will be visible
      router.push(`/dashboard/stockly/stock-counts/${countId}/review`);
    } catch (error: any) {
      console.error('Error completing count:', error);
      toast.error(error.message || 'Failed to complete count');
    } finally {
      setCompleting(false);
    }
  };

  // Memoize countId to ensure stable reference
  const countId = useMemo(() => {
    return Array.isArray(params.id) ? params.id[0] : params.id;
  }, [params.id]);

  useEffect(() => {
    // Auto-select appropriate tab based on status
    // CRITICAL: Never redirect new counts (with 0 items) to review page
    if (!count) return; // Don't do anything if count isn't loaded yet
    
    const itemsCounted = count.items_counted || 0;
    const totalItems = count.total_items || 0;
    const status = count.status;
    
    // DEBUG: Log what we're checking
    console.log('[StockCountDetail] Redirect check:', {
      status,
      itemsCounted,
      totalItems,
      countId,
    });
    
    // Draft counts: show print tab - NEVER redirect
    if (status === 'draft') {
      console.log('[StockCountDetail] Draft count - staying on print tab');
      setActiveTab('print');
      return;
    } 
    
    // Active/in_progress counts: show enter tab - NEVER redirect these
    // Even if they have items, they're still being worked on
    if (status === 'active' || status === 'in_progress') {
      console.log('[StockCountDetail] Active/in_progress count - staying on enter tab');
      setActiveTab('enter');
      return; // NEVER redirect in_progress counts, period
    } 
    
    // Only redirect to review for counts that:
    // 1. Are in a review/approval state (completed, ready_for_approval, etc.)
    // 2. AND have actually been worked on (items_counted > 0 AND total_items > 0)
    // 3. AND are NOT in_progress (double-check)
    const hasBeenWorkedOn = itemsCounted > 0 && totalItems > 0;
    const isReviewState = 
      status === 'completed' || 
      status === 'ready_for_approval' || 
      status === 'pending_review' || 
      status === 'approved' ||
      status === 'rejected' ||
      status === 'finalized' || 
      status === 'locked';
    
    // CRITICAL: Never redirect if status is still in_progress or active
    if (status === 'in_progress' || status === 'active') {
      console.log('[StockCountDetail] Status is in_progress/active - NOT redirecting');
      setActiveTab('enter');
      return;
    }
    
    if (isReviewState && hasBeenWorkedOn) {
      console.log('[StockCountDetail] Redirecting to review page');
      // Navigate to review page
      if (countId) {
        router.push(`/dashboard/stockly/stock-counts/${countId}/review`);
      }
    } else {
      // For any other state, default to print tab (safe default)
      console.log('[StockCountDetail] Defaulting to print tab');
      setActiveTab('print');
    }
  }, [count?.status, count?.items_counted, count?.total_items, countId, router, count]);

  const fetchCountDetails = async () => {
    if (!params.id) return;
    
    // Ensure id is a string (Next.js params can be string | string[])
    const countId = Array.isArray(params.id) ? params.id[0] : params.id;
    
    setLoading(true);

    // Fetch count (no longer fetching areas)
    const { data: countData, error: countError } = await supabase
      .from('stock_counts')
      .select('*')
      .eq('id', countId)
      .single();

    if (countError) {
      console.error('Error fetching count:', countError);
      setLoading(false);
      return;
    }

    // Fetch items - use simple query without specifying foreign key names
    const { data: itemsData, error: itemsError } = await supabase
      .from('stock_count_items')
      .select('*')
      .eq('stock_count_id', countId)
      .order('created_at');

    if (itemsError) {
      console.error('Error fetching items:', itemsError);
      setItems([]);
    } else {
      console.log(`Fetched ${itemsData?.length || 0} items for count ${countId}`, {
        items: itemsData,
        count: countData,
      });
      
      // Fetch storage areas separately (only if items exist)
      const itemsWithRelations = (itemsData || []).length > 0
        ? await Promise.all((itemsData || []).map(async (item: any) => {
            const relations: any = {};
            
            // Fetch assigned storage area if exists
            if (item.storage_area_id) {
              const { data: storageArea } = await supabase
                .from('storage_areas')
                .select('*')
                .eq('id', item.storage_area_id)
                .maybeSingle();
              relations.storage_area = storageArea;
            }
            
            // Fetch counted storage area if exists
            if (item.counted_storage_area_id) {
              const { data: countedStorageArea } = await supabase
                .from('storage_areas')
                .select('*')
                .eq('id', item.counted_storage_area_id)
                .maybeSingle();
              relations.counted_storage_area = countedStorageArea;
            }
            
            return { ...item, ...relations };
          }))
        : [];
      
      // Fetch item names from library tables
      const itemsWithNames = itemsWithRelations.length > 0
        ? await fetchItemNames(itemsWithRelations)
        : [];
      
      console.log(`Items with names: ${itemsWithNames.length}`, {
        itemsWithNames,
        libraryTypes: itemsWithNames.map(i => i.library_type),
      });
      
      setItems(itemsWithNames);
    }

    setCount(countData as StockCountWithDetails);
    setLoading(false);
  };

  // Fetch item names from library tables based on library_type
  const fetchItemNames = async (items: any[]): Promise<StockCountItem[]> => {
    if (!items || items.length === 0) {
      return [];
    }

    const libraryTableMap: Record<string, string> = {
      ingredients: 'ingredients_library',
      packaging: 'packaging_library',
      disposables: 'disposables_library',
      drinks: 'drinks_library',
      ppe: 'ppe_library',
      chemicals: 'chemicals_library',
      glassware: 'glassware_library',
      first_aid: 'first_aid_supplies_library', // Database stores 'first_aid'
      first_aid_supplies: 'first_aid_supplies_library', // Handle variations
      firstaid: 'first_aid_supplies_library', // Handle variations
      // Handle any variations
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
    // PPE doesn't have pack_size, so we'll only fetch supplier for it
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

    // Group items by library type
    const itemsByLibrary: Record<string, any[]> = {};
    items.forEach((item: any) => {
      const libType = item.library_type;
      if (!itemsByLibrary[libType]) {
        itemsByLibrary[libType] = [];
      }
      itemsByLibrary[libType].push(item);
    });

    const result: StockCountItem[] = [];

    // Fetch names for each library type
    for (const [libType, libItems] of Object.entries(itemsByLibrary)) {
      const tableName = libraryTableMap[libType];
      const nameColumn = nameColumnMap[tableName] || 'item_name';
      
      if (!tableName || libItems.length === 0) {
        // Add items without names if library table not found
        libItems.forEach((item: any) => {
          result.push({
            ...item,
            ingredient: { id: item.ingredient_id, name: 'Unknown' } as any,
          });
        });
        continue;
      }

      const itemIds = libItems.map((item: any) => item.ingredient_id);
      
      try {
        // Fetch name, supplier, and pack_size for PDF count sheets
        // Only fetch columns that exist for this library table
        const additionalColumns = libraryColumnsMap[tableName] || ['supplier', 'pack_size'];
        const selectColumns = ['id', nameColumn, ...additionalColumns].join(', ');
        const { data: libraryItems, error: fetchError } = await supabase
          .from(tableName)
          .select(selectColumns)
          .in('id', itemIds);

        if (fetchError) {
          console.warn(`Error fetching ${tableName} items with supplier/pack_size:`, fetchError);
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
              result.push({
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

        // Add names and additional fields to items
        libItems.forEach((item: any) => {
          const libItemData = libraryItemMap.get(item.ingredient_id) || {
            name: 'Unknown',
            supplier: null,
            pack_size: null,
          };
          result.push({
            ...item,
            ingredient: {
              id: item.ingredient_id,
              name: libItemData.name,
              ingredient_name: libItemData.name, // For compatibility
              supplier: libItemData.supplier,
              pack_size: libItemData.pack_size,
            } as any,
          });
        });
      } catch (err) {
        // If fetch fails, add items without names
        libItems.forEach((item: any) => {
          result.push({
            ...item,
            ingredient: {
              id: item.ingredient_id,
              name: 'Unknown',
            } as any,
          });
        });
      }
    }

    return result;
  };

  const getLibraryName = (type: string): string => {
    const nameMap: Record<string, string> = {
      ingredients: 'Ingredients Library',
      packaging: 'Packaging Library',
      disposables: 'Disposables Library',
      drinks: 'Drinks Library',
      ppe: 'PPE Library',
      chemicals: 'Chemicals Library',
      glassware: 'Glassware Library',
      first_aid_supplies: 'First Aid Supplies',
    };
    return nameMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getLibraryIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      ingredients: Package,
      packaging: Box,
      disposables: Coffee,
      drinks: Coffee,
      ppe: Package,
      chemicals: Package,
      glassware: Package,
      first_aid_supplies: Package,
    };
    return iconMap[type] || Package;
  };

  const handlePrintSheet = async (libraryType: string) => {
    const libraryItems = items.filter(item => item.library_type === libraryType);
    if (!count) return;

    console.log(`Printing sheet for ${libraryType}:`, {
      totalItems: items.length,
      libraryItems: libraryItems.length,
      libraryType,
      items: libraryItems,
    });

    const pdf = generateCountSheetPDF({
      countName: count.name,
      countDate: count.count_date,
      libraryType: libraryType as LibraryType,
      libraryName: getLibraryName(libraryType),
      items: libraryItems,
    });

    openPDFInNewTab(pdf);
  };

  const handleDownloadSheet = async (libraryType: string) => {
    const libraryItems = items.filter(item => item.library_type === libraryType);
    if (!count) return;

    const pdf = generateCountSheetPDF({
      countName: count.name,
      countDate: count.count_date,
      libraryType: libraryType as LibraryType,
      libraryName: getLibraryName(libraryType),
      items: libraryItems,
    });

    const filename = `${getLibraryName(libraryType).replace(/\s+/g, '_')}_Count_${count.count_date}.pdf`;
    downloadPDF(pdf, filename);
  };

  const handleDownloadAll = async () => {
    if (!count) return;
    
    // Derive libraries from items if libraries_included is not set
    const libraries = count.libraries_included && count.libraries_included.length > 0
      ? count.libraries_included
      : [...new Set(items.map(item => item.library_type).filter(Boolean))];
    
    if (libraries.length === 0) return;

    libraries.forEach(libraryType => {
      handleDownloadSheet(libraryType);
    });
  };

  const handleStartEntering = async () => {
    if (!params.id || !count) return;
    
    try {
      // Ensure id is a string (Next.js params can be string | string[])
      const countId = Array.isArray(params.id) ? params.id[0] : params.id;
      
      // Update status to in_progress - database constraint uses 'in_progress' not 'active'
      const { data, error } = await supabase
        .from('stock_counts')
        .update({ status: 'in_progress' })
        .eq('id', countId)
        .select()
        .single();

      if (error) {
        // Enhanced error logging
        const errorInfo = {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        };
        
        console.error('Error updating stock count status:', errorInfo);
        console.error('Count object:', count);
        
        // Show user-friendly error
        const errorMessage = error.message || 
          error.details || 
          error.hint ||
          'Failed to update status. Please check your permissions and try again.';
        
        alert(`Failed to update status: ${errorMessage}`);
        return;
      }

      if (data) {
        // Wait a brief moment for any triggers/views to sync
        await new Promise(resolve => setTimeout(resolve, 100));
        fetchCountDetails();
        setActiveTab('enter');
      }
    } catch (err) {
      console.error('Unexpected error updating status:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'object' && err !== null
          ? JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
          : String(err);
      alert(`Unexpected error: ${errorMessage}`);
    }
  };

  const getStatusBadge = () => {
    if (!count) return null;

    switch (count.status) {
      case 'draft':
        return (
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-600/20 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600/40 text-sm font-medium">
            <FileText className="h-4 w-4 mr-2" />
            Draft
          </span>
        );
      case 'active':
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-600/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-600/40 text-sm font-medium">
            <AlertCircle className="h-4 w-4 mr-2" />
            In Progress
          </span>
        );
      case 'finalized':
        return (
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-600/40 text-sm font-medium">
            <CheckCircle className="h-4 w-4 mr-2" />
            Finalized
          </span>
        );
      case 'locked':
        return (
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-600/40 text-sm font-medium">
            <Lock className="h-4 w-4 mr-2" />
            Locked
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-gray-50 dark:bg-gray-600/20 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600/40 text-sm font-medium">
            <CheckCircle className="h-4 w-4 mr-2" />
            Completed
          </span>
        );
      case 'ready_for_approval':
        return (
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-600/40 text-sm font-medium">
            <AlertCircle className="h-4 w-4 mr-2" />
            Ready for Approval
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-600/40 text-sm font-medium">
            <CheckCircle className="h-4 w-4 mr-2" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-red-50 dark:bg-red-600/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-600/40 text-sm font-medium">
            <AlertCircle className="h-4 w-4 mr-2" />
            Rejected
          </span>
        );
    }
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
        <div className="container mx-auto py-8 px-4">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Count Not Found</h2>
            <Button 
              onClick={() => router.push('/dashboard/stockly/stock-counts')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Back to Counts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 dark:bg-[#0B0D13] min-h-screen">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/stockly/stock-counts"
            className="inline-flex items-center mb-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Counts
          </Link>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{count.name}</h1>
                {getStatusBadge()}
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Count Date: {new Date(count.count_date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
              {count.notes && (
                <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">{count.notes}</p>
              )}
              {count.status === 'rejected' && count.rejection_reason && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-600/10 border border-red-200 dark:border-red-600/30 rounded-lg">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-400 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{count.rejection_reason}</p>
                </div>
              )}
            </div>

          {/* Action buttons based on status */}
          <div className="flex gap-2">
            {count.status === 'draft' && (
              <Button
                onClick={handleStartEntering}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Edit className="mr-2 h-4 w-4" />
                Start Entering Data
              </Button>
            )}
            
            {count.status !== 'locked' && (
              <Button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm(`Are you sure you want to delete "${count.name}"? This action cannot be undone.`)) {
                    return;
                  }
                  try {
                    // Delete items first
                    await supabase
                      .from('stock_count_items')
                      .delete()
                      .eq('stock_count_id', count.id);
                    // Delete the count
                    await supabase
                      .from('stock_counts')
                      .delete()
                      .eq('id', count.id);
                    router.push('/dashboard/stockly/stock-counts');
                  } catch (error: any) {
                    console.error('Error deleting count:', error);
                    alert(error.message || 'Failed to delete count');
                  }
                }}
                variant="outline"
                className="border-red-600/50 text-red-400 hover:bg-red-600/10 hover:border-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
            
            {count.status === 'finalized' && (
              <Button
                onClick={() => setShowLockModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Lock className="mr-2 h-4 w-4" />
                Lock Count
              </Button>
            )}
            
            {(count.status === 'active' || count.status === 'in_progress') && count.items_counted > 0 && (
              <>
                <Button
                  onClick={handleCompleteCount}
                  disabled={completing}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {completing ? 'Completing...' : 'Complete Count'}
                </Button>
                {hasReviewers && (
                  <Button
                    onClick={handleSubmitForReview}
                    disabled={submittingForReview}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {submittingForReview ? 'Submitting...' : 'Submit for Review'}
                  </Button>
                )}
                <Button
                  onClick={() => setShowFinalizeModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={count.status !== 'approved'}
                  title={count.status !== 'approved' ? 'Count must be approved before finalization' : 'Finalize and adjust stock levels'}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Finalize & Adjust Stock
                  {count.items_counted < count.total_items && (
                    <span className="ml-2 text-xs opacity-90">({count.items_counted}/{count.total_items})</span>
                  )}
                </Button>
              </>
            )}
            {count.status === 'rejected' && (
              <Button
                onClick={handleResubmitForReview}
                disabled={submittingForReview}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <FileText className="mr-2 h-4 w-4" />
                {submittingForReview ? 'Resubmitting...' : 'Resubmit for Review'}
              </Button>
            )}
          </div>
          </div>
        </div>

        {/* Summary Stats */}
        {(() => {
          // Calculate summary values from items array to ensure accuracy
          const countedItems = items.filter(item => item.is_counted === true || item.counted_quantity !== null);
          const itemsWithVariance = countedItems.filter(item => {
            const varianceQty = item.variance_quantity ?? (item.counted_quantity ?? 0) - (item.expected_quantity ?? item.theoretical_closing ?? 0);
            return Math.abs(varianceQty) > 0.001; // More than 0.001 variance
          });
          const totalVarianceValue = countedItems.reduce((sum, item) => {
            const varianceValue = item.variance_value ?? 
              ((item.counted_quantity ?? 0) - (item.expected_quantity ?? item.theoretical_closing ?? 0)) * (item.unit_cost ?? 0);
            return sum + (varianceValue ?? 0);
          }, 0);
          const itemsCounted = countedItems.length;
          const totalItems = count.total_items ?? items.length;
          
          return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-400 text-sm">Total Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalItems}</p>
              </div>
              
              <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-400 text-sm">Items Counted</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {itemsCounted}
                  <span className="text-sm text-gray-500 dark:text-gray-500 ml-2">
                    ({totalItems > 0 ? Math.round((itemsCounted / totalItems) * 100) : 0}%)
                  </span>
                </p>
              </div>
              
              <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-400 text-sm">Variances</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{itemsWithVariance.length}</p>
              </div>
              
              <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-400 text-sm">Variance Value</p>
                <p className={`text-2xl font-bold mt-1 ${
                  totalVarianceValue < 0 ? 'text-red-600 dark:text-red-400' : 
                  totalVarianceValue > 0 ? 'text-emerald-600 dark:text-green-400' : 'text-gray-900 dark:text-white'
                }`}>
                  {totalVarianceValue < 0 ? '-' : totalVarianceValue > 0 ? '+' : ''}
                  £{Math.abs(totalVarianceValue).toFixed(2)}
                </p>
              </div>
            </div>
          );
        })()}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-white/[0.06] mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('print')}
            className={`pb-4 px-2 font-medium transition-colors border-b-2 ${
              activeTab === 'print'
                ? 'border-emerald-600 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Printer className="inline-block mr-2 h-4 w-4" />
            Print Sheets
          </button>
          
          <button
            onClick={() => {
              // If count is in draft status, automatically start entering data
              if (count?.status === 'draft') {
                handleStartEntering();
              } else {
                setActiveTab('enter');
              }
            }}
            className={`pb-4 px-2 font-medium transition-colors border-b-2 ${
              activeTab === 'enter'
                ? 'border-emerald-600 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Edit className="inline-block mr-2 h-4 w-4" />
            Enter Data
          </button>
          
          <button
            onClick={() => router.push(`/dashboard/stockly/stock-counts/${params.id}/review`)}
            className={`pb-4 px-2 font-medium transition-colors border-b-2 ${
              activeTab === 'review'
                ? 'border-emerald-600 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FileText className="inline-block mr-2 h-4 w-4" />
            Review Report
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'print' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Count Sheets by Library</h2>
            <Button
              onClick={handleDownloadAll}
              variant="outline"
              className="border-gray-300 dark:border-white/[0.06] text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <Download className="mr-2 h-4 w-4" />
              Download All PDFs
            </Button>
          </div>

          {(() => {
            // Derive libraries from items if libraries_included is not set
            const libraries = count.libraries_included && count.libraries_included.length > 0
              ? count.libraries_included
              : [...new Set(items.map(item => item.library_type).filter(Boolean))];
            
            return libraries.length > 0 ? (
              libraries.map((libraryType) => {
                const libraryItems = items.filter(item => item.library_type === libraryType);
                const libraryName = getLibraryName(libraryType);
                const LibraryIcon = getLibraryIcon(libraryType);

              return (
                <div
                  key={libraryType}
                  className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {LibraryIcon && <LibraryIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {libraryName}
                        </h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {libraryItems.length} items to count
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDownloadSheet(libraryType)}
                        variant="outline"
                        size="sm"
                        className="border-gray-300 dark:border-white/[0.06] text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                      <Button
                        onClick={() => handlePrintSheet(libraryType)}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
            ) : (
              <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-6 text-center">
                <AlertCircle className="h-8 w-8 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">
                  {items.length === 0 
                    ? 'No items found for this count. Items will appear here once they are loaded.' 
                    : 'No libraries included in this count'}
                </p>
              </div>
            );
          })()}

          {count.status === 'draft' && (
            <div className="bg-emerald-50 dark:bg-emerald-600/10 border border-emerald-200 dark:border-emerald-600/30 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ready to Start?</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Once you've printed the count sheets and handed them out, click below to start entering data.
              </p>
              <Button
                onClick={handleStartEntering}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Start Entering Data
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'enter' && (
        <>
          {count.status === 'draft' ? (
            <div className="bg-emerald-50 dark:bg-emerald-600/10 border border-emerald-200 dark:border-emerald-600/30 rounded-lg p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Starting data entry...
              </p>
            </div>
          ) : (
            <CountDataEntry
              countId={count.id}
              items={items}
              librariesIncluded={count.libraries_included || []}
              onUpdate={fetchCountDetails}
            />
          )}
        </>
      )}

      {/* Modals */}
      <FinalizeModal
        isOpen={showFinalizeModal}
        onClose={() => setShowFinalizeModal(false)}
        count={count}
        onSuccess={fetchCountDetails}
      />

      <LockModal
        isOpen={showLockModal}
        onClose={() => setShowLockModal(false)}
        count={count}
        onSuccess={fetchCountDetails}
      />
      </div>
    </div>
  );
}
