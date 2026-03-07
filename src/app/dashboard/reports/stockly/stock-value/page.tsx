"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft,
  Package, 
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Warehouse,
  Tag
} from '@/components/ui/icons';
import Link from 'next/link';
import { toast } from 'sonner';
import { exportStockValueReport } from '@/lib/export-excel';
import { exportStockValuePdf } from '@/lib/export-pdf';

interface StockValueByCategory {
  category_id: string | null;
  category_name: string;
  item_count: number;
  total_quantity: number;
  total_value: number;
}

interface StockValueByStorage {
  storage_area_id: string | null;
  storage_area_name: string;
  area_type: string;
  item_count: number;
  total_value: number;
}

interface StockItem {
  id: string;
  name: string;
  category_name: string;
  storage_area_name: string;
  quantity: number;
  unit: string;
  value: number;
}

export default function StockValueReportPage() {
  const { companyId, siteId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [totalValue, setTotalValue] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [byCategory, setByCategory] = useState<StockValueByCategory[]>([]);
  const [byStorage, setByStorage] = useState<StockValueByStorage[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  
  const [viewMode, setViewMode] = useState<'category' | 'storage' | 'items'>('category');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (companyId) {
      loadReportData();
    }
  }, [companyId, siteId]);

  async function loadReportData() {
    if (!companyId) return;
    
    setLoading(true);
    try {
      // Get stock levels (views don't support foreign key relationships, fetch separately)
      let query = supabase
        .from('stock_levels')
        .select('*')
        .eq('company_id', companyId)
        .gt('quantity', 0);
      
      // Only filter by site_id if it's a valid UUID (not "all")
      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        const errorDetails: any = {
          query: 'stock_levels',
          companyId: companyId,
          siteId: siteId,
          message: error?.message || 'No message',
          code: error?.code || 'NO_CODE',
          details: error?.details || 'No details',
          hint: error?.hint || 'No hint',
        };
        
        try {
          errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
        } catch (e) {
          errorDetails.fullError = 'Could not serialize error';
        }
        
        console.error('Error loading stock value data:', errorDetails);
        toast.error(error?.message || 'Failed to load stock value data');
        return;
      }

      if (!data || data.length === 0) {
        setTotalValue(0);
        setTotalItems(0);
        setByCategory([]);
        setByStorage([]);
        setStockItems([]);
        setLoading(false);
        return;
      }

      // Fetch stock items
      const stockItemIds = [...new Set(data.map(item => item.stock_item_id).filter(Boolean))];
      let stockItemsData: any[] = [];
      if (stockItemIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('stock_items')
          .select('id, name, stock_unit, category_id')
          .in('id', stockItemIds);
        
        if (itemsError) {
          const errorDetails: any = {
            query: 'stock_items',
            companyId: companyId,
            message: itemsError?.message || 'No message',
            code: itemsError?.code || 'NO_CODE',
            details: itemsError?.details || 'No details',
            hint: itemsError?.hint || 'No hint',
          };
          
          try {
            errorDetails.fullError = JSON.stringify(itemsError, Object.getOwnPropertyNames(itemsError));
          } catch (e) {
            errorDetails.fullError = 'Could not serialize error';
          }
          
          console.error('Error fetching stock items:', errorDetails);
          throw itemsError;
        }
        stockItemsData = itemsData || [];
      }
      
      const stockItemsMap = new Map(stockItemsData.map(si => [si.id, si]));

      // Fetch categories
      const categoryIds = [...new Set(stockItemsData.map(si => si.category_id).filter(Boolean))];
      let categoriesData: any[] = [];
      if (categoryIds.length > 0) {
        const { data: catsData, error: catsError } = await supabase
          .from('stock_categories')
          .select('id, name')
          .in('id', categoryIds);
        
        if (catsError) {
          const errorDetails: any = {
            query: 'stock_categories',
            companyId: companyId,
            message: catsError?.message || 'No message',
            code: catsError?.code || 'NO_CODE',
            details: catsError?.details || 'No details',
            hint: catsError?.hint || 'No hint',
          };
          
          try {
            errorDetails.fullError = JSON.stringify(catsError, Object.getOwnPropertyNames(catsError));
          } catch (e) {
            errorDetails.fullError = 'Could not serialize error';
          }
          
          console.error('Error fetching categories:', errorDetails);
          throw catsError;
        }
        categoriesData = catsData || [];
      }
      
      const categoriesMap = new Map(categoriesData.map(cat => [cat.id, cat]));

      // Fetch storage areas
      const storageAreaIds = [...new Set(data.map(item => item.storage_area_id).filter(Boolean))];
      let storageAreasData: any[] = [];
      if (storageAreaIds.length > 0) {
        const { data: areasData, error: areasError } = await supabase
          .from('storage_areas')
          .select('id, name, area_type')
          .in('id', storageAreaIds);
        
        if (areasError) {
          const errorDetails: any = {
            query: 'storage_areas',
            siteId: siteId,
            message: areasError?.message || 'No message',
            code: areasError?.code || 'NO_CODE',
            details: areasError?.details || 'No details',
            hint: areasError?.hint || 'No hint',
          };
          
          try {
            errorDetails.fullError = JSON.stringify(areasError, Object.getOwnPropertyNames(areasError));
          } catch (e) {
            errorDetails.fullError = 'Could not serialize error';
          }
          
          console.error('Error fetching storage areas:', errorDetails);
          throw areasError;
        }
        storageAreasData = areasData || [];
      }
      
      const storageAreasMap = new Map(storageAreasData.map(sa => [sa.id, sa]));

      // Enrich data with related objects
      const enrichedData = data.map(item => ({
        ...item,
        stock_items: stockItemsMap.get(item.stock_item_id) ? {
          ...stockItemsMap.get(item.stock_item_id)!,
          stock_categories: categoriesMap.get(stockItemsMap.get(item.stock_item_id)!.category_id) || null
        } : null,
        storage_areas: storageAreasMap.get(item.storage_area_id) || null
      }));

      // Calculate totals
      const total = enrichedData.reduce((sum, item) => sum + (item.value || 0), 0);
      setTotalValue(total);
      setTotalItems(enrichedData.length);

      // Aggregate by category
      const categoryMap = new Map<string, StockValueByCategory>();
      enrichedData.forEach(item => {
        const stockItem = item.stock_items;
        const category = stockItem?.stock_categories || null;
        const catId = category?.id || 'uncategorised';
        const catName = category?.name || 'Uncategorised';
        
        const existing = categoryMap.get(catId) || {
          category_id: catId === 'uncategorised' ? null : catId,
          category_name: catName,
          item_count: 0,
          total_quantity: 0,
          total_value: 0
        };
        
        existing.item_count += 1;
        existing.total_quantity += item.quantity || 0;
        existing.total_value += item.value || 0;
        
        categoryMap.set(catId, existing);
      });
      
      setByCategory(
        Array.from(categoryMap.values())
          .sort((a, b) => b.total_value - a.total_value)
      );

      // Aggregate by storage area
      const storageMap = new Map<string, StockValueByStorage>();
      enrichedData.forEach(item => {
        const storageArea = item.storage_areas;
        const areaId = storageArea?.id || 'unassigned';
        const areaName = storageArea?.name || 'Unassigned';
        const areaType = storageArea?.area_type || 'other';
        
        const existing = storageMap.get(areaId) || {
          storage_area_id: areaId === 'unassigned' ? null : areaId,
          storage_area_name: areaName,
          area_type: areaType,
          item_count: 0,
          total_value: 0
        };
        
        existing.item_count += 1;
        existing.total_value += item.value || 0;
        
        storageMap.set(areaId, existing);
      });
      
      setByStorage(
        Array.from(storageMap.values())
          .sort((a, b) => b.total_value - a.total_value)
      );

      // Individual items
      const items: StockItem[] = enrichedData.map(item => {
        const stockItem = item.stock_items;
        const category = stockItem?.stock_categories || null;
        const storageArea = item.storage_areas;
        
        return {
          id: item.id,
          name: stockItem?.name || 'Unknown',
          category_name: category?.name || 'Uncategorised',
          storage_area_name: storageArea?.name || 'Unassigned',
          quantity: item.quantity || 0,
          unit: stockItem?.stock_unit || 'each',
          value: item.value || 0
        };
      }).sort((a, b) => b.value - a.value);
      
      setStockItems(items);
      
    } catch (error: any) {
      const errorDetails: any = {
        message: error?.message || 'Unknown error',
        code: error?.code || 'NO_CODE',
        details: error?.details || 'No details',
        hint: error?.hint || 'No hint',
      };
      
      try {
        errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
      } catch (e) {
        errorDetails.fullError = 'Could not serialize error';
      }
      
      try {
        errorDetails.errorString = String(error);
      } catch (e) {
        errorDetails.errorString = 'Could not convert to string';
      }
      
      console.error('Error loading report data:', errorDetails);
      
      const userMessage = error?.message || 'Failed to load report data';
      toast.error(userMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-GB').format(value);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getAreaTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'cold_storage': 'bg-blue-500/10 text-blue-400',
      'freezer': 'bg-module-fg/10 text-module-fg',
      'dry_storage': 'bg-amber-500/10 text-amber-400',
      'ambient': 'bg-green-500/10 text-green-400',
      'other': 'bg-theme-surface-elevated0/10 text-theme-tertiary'
    };
    return colors[type] || colors['other'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-stockly-dark dark:text-stockly animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/reports/stockly"
 className="p-2 rounded-lg bg-theme-button hover:bg-theme-button-hover text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">Stock Valuation Report</h1>
            <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm mt-1">Current stock value by category and storage area</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
 className="p-2 rounded-lg bg-theme-button hover:bg-theme-button-hover text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={async () => {
              try {
                await exportStockValueReport({
                  byCategory: byCategory.map(c => ({ 
                    category_name: c.category_name, 
                    item_count: c.item_count, 
                    total_value: c.total_value 
                  })),
                  byStorage: byStorage.map(s => ({
                    storage_area_name: s.storage_area_name,
                    area_type: s.area_type,
                    item_count: s.item_count,
                    total_value: s.total_value
                  })),
                  items: stockItems
                });
                toast.success('Excel export completed');
              } catch (error) {
                console.error('Excel export failed:', error);
                toast.error('Failed to export Excel file');
              }
            }}
            className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 hover:bg-module-fg/10 transition-colors text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button 
            onClick={() => {
              try {
                exportStockValuePdf(totalValue, totalItems, byCategory.map(c => ({
                  category_name: c.category_name,
                  item_count: c.item_count,
                  total_value: c.total_value
                })));
                toast.success('PDF export completed');
              } catch (error) {
                console.error('PDF export failed:', error);
                toast.error('Failed to export PDF file');
              }
            }}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 dark:bg-red-500/10 border border-red-500/30 dark:border-red-500/30 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/20 transition-colors text-sm"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Package className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm">Total Stock Value</span>
          </div>
          <p className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{formatCurrency(totalValue)}</p>
        </div>
        
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Tag className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm">Categories</span>
          </div>
          <p className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{byCategory.length}</p>
        </div>
        
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Warehouse className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            </div>
            <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm">Stock Lines</span>
          </div>
          <p className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{formatNumber(totalItems)}</p>
        </div>
      </div>

      {/* View Toggle */}
 <div className="flex bg-theme-button rounded-lg p-1 w-fit">
        {(['category', 'storage', 'items'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === mode
                    ? 'bg-stockly-dark/20 dark:bg-stockly/20 text-stockly-dark dark:text-stockly'
                    : 'text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))]'
            }`}
          >
            {mode === 'category' ? 'By Category' : mode === 'storage' ? 'By Storage Area' : 'All Items'}
          </button>
        ))}
      </div>

      {/* Data Tables */}
      {viewMode === 'category' && (
        <div className="bg-[rgb(var(--surface-elevated))] border border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                    <tr className="border-b border-theme">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Category</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Items</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Value</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
                      No stock data available
                    </td>
                  </tr>
                ) : (
                  byCategory.map((cat) => {
                    const percentage = totalValue > 0 ? (cat.total_value / totalValue) * 100 : 0;
                    const isExpanded = expandedCategories.has(cat.category_id || '');
                    const categoryItems = stockItems.filter(
                      item => item.category_name === cat.category_name
                    );
                    
                    return (
                      <>
                        <tr 
                          key={cat.category_id || 'uncategorised'}
                          className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer"
                          onClick={() => toggleCategory(cat.category_id || '')}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary" />
                              )}
                              <span className="text-[rgb(var(--text-primary))] dark:text-white font-medium">{cat.category_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-theme-secondary">{cat.item_count}</td>
                          <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-white font-medium">
                            {formatCurrency(cat.total_value)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 h-2 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-stockly-dark dark:bg-stockly rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-theme-tertiary text-sm w-12">
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && categoryItems.map((item) => (
                          <tr 
                            key={item.id}
 className="border-b border-theme bg-theme-surface-elevated"
                          >
                            <td className="px-4 py-2 pl-10">
                              <span className="text-theme-secondary text-sm">{item.name}</span>
                            </td>
                            <td className="px-4 py-2 text-right text-theme-tertiary text-sm">
                              {formatNumber(item.quantity)} {item.unit}
                            </td>
                            <td className="px-4 py-2 text-right text-theme-secondary text-sm">
                              {formatCurrency(item.value)}
                            </td>
                            <td className="px-4 py-2 text-right text-theme-tertiary text-sm">
                              {item.storage_area_name}
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  })
                )}
              </tbody>
              {byCategory.length > 0 && (
                <tfoot>
 <tr className="bg-theme-surface-elevated">
                    <td className="px-4 py-3 font-semibold text-[rgb(var(--text-primary))] dark:text-white">Total</td>
                    <td className="px-4 py-3 text-right font-semibold text-[rgb(var(--text-primary))] dark:text-white">{totalItems}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[rgb(var(--text-primary))] dark:text-white">
                      {formatCurrency(totalValue)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[rgb(var(--text-primary))] dark:text-white">100%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {viewMode === 'storage' && (
 <div className="bg-theme-surface-elevated border border-theme rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                    <tr className="border-b border-theme">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Storage Area</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Type</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Items</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Value</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {byStorage.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-theme-tertiary">
                      No storage area data available
                    </td>
                  </tr>
                ) : (
                  byStorage.map((area) => {
                    const percentage = totalValue > 0 ? (area.total_value / totalValue) * 100 : 0;
                    
                    return (
                      <tr 
                        key={area.storage_area_id || 'unassigned'}
 className="border-b border-theme hover:bg-theme-button-hover"
                      >
                        <td className="px-4 py-3">
                          <span className="text-[rgb(var(--text-primary))] dark:text-white font-medium">{area.storage_area_name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAreaTypeColor(area.area_type)}`}>
                            {area.area_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-theme-secondary">{area.item_count}</td>
                        <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-white font-medium">
                          {formatCurrency(area.total_value)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
 <div className="w-20 h-2 bg-theme-button rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-stockly-dark dark:bg-stockly rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm w-12">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {byStorage.length > 0 && (
                <tfoot>
 <tr className="bg-theme-surface-elevated">
                    <td className="px-4 py-3 font-semibold text-[rgb(var(--text-primary))] dark:text-white">Total</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right font-semibold text-[rgb(var(--text-primary))] dark:text-white">{totalItems}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[rgb(var(--text-primary))] dark:text-white">
                      {formatCurrency(totalValue)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[rgb(var(--text-primary))] dark:text-white">100%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {viewMode === 'items' && (
 <div className="bg-theme-surface-elevated border border-theme rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                    <tr className="border-b border-theme">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Item</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Location</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Quantity</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Value</th>
                </tr>
              </thead>
              <tbody>
                {stockItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
                      No stock items available
                    </td>
                  </tr>
                ) : (
                  stockItems.slice(0, 50).map((item) => (
                    <tr 
                      key={item.id}
 className="border-b border-theme hover:bg-theme-button-hover"
                    >
                      <td className="px-4 py-3">
                        <span className="text-[rgb(var(--text-primary))] dark:text-white font-medium">{item.name}</span>
                      </td>
                      <td className="px-4 py-3 text-[rgb(var(--text-primary))] dark:text-theme-secondary">{item.category_name}</td>
                      <td className="px-4 py-3 text-[rgb(var(--text-primary))] dark:text-theme-secondary">{item.storage_area_name}</td>
                      <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-theme-secondary">
                        {formatNumber(item.quantity)} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-white font-medium">
                        {formatCurrency(item.value)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {stockItems.length > 50 && (
                <tfoot>
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary text-sm">
                      Showing 50 of {stockItems.length} items. Export to see all.
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
