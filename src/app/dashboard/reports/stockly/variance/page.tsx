"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft,
  AlertTriangle, 
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  Package
} from '@/components/ui/icons';
import Link from 'next/link';
import { toast } from 'sonner';
import { exportToExcel } from '@/lib/export-excel';
import { exportToPdf } from '@/lib/export-pdf';

interface StockCountSummary {
  id: string;
  count_number: string;
  count_type: string;
  status: string;
  scheduled_date: string | null;
  completed_at: string | null;
  total_items: number;
  items_counted: number;
  variance_value: number;
}

interface VarianceItem {
  id: string;
  stock_count_id: string;
  count_number: string;
  count_date: string;
  item_name: string;
  category_name: string;
  expected_quantity: number;
  counted_quantity: number;
  variance_quantity: number;
  unit_cost: number;
  variance_value: number;
  unit: string;
}

interface CategoryVariance {
  category_name: string;
  item_count: number;
  total_variance_value: number;
  positive_count: number;
  negative_count: number;
}

export default function VarianceReportPage() {
  const { companyId, siteId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [stockCounts, setStockCounts] = useState<StockCountSummary[]>([]);
  const [varianceItems, setVarianceItems] = useState<VarianceItem[]>([]);
  const [categoryVariance, setCategoryVariance] = useState<CategoryVariance[]>([]);
  
  const [selectedCount, setSelectedCount] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'items' | 'categories' | 'counts'>('items');
  
  const [summary, setSummary] = useState({
    totalVariance: 0,
    positiveVariance: 0,
    negativeVariance: 0,
    itemsWithVariance: 0,
    countsCompleted: 0
  });

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId, siteId]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadStockCounts(), loadVarianceItems()]);
    setLoading(false);
  }

  async function loadStockCounts() {
    if (!companyId) return;
    
    try {
      let query = supabase
        .from('stock_counts')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['approved', 'pending_approval', 'completed', 'finalized', 'finalised', 'locked'])
        .order('completed_at', { ascending: false });
      
      // Only filter by site_id if it's a valid UUID (not "all")
      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        const errorDetails: any = {
          query: 'stock_counts',
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
        
        console.error('Error loading stock counts:', errorDetails);
        toast.error(error?.message || 'Failed to load stock counts');
        setStockCounts([]);
        return;
      }
      
      setStockCounts(data || []);
      
      const totalVariance = data?.reduce((sum, c) => sum + (c.variance_value || 0), 0) || 0;
      const positive = data?.reduce((sum, c) => sum + (c.variance_value > 0 ? c.variance_value : 0), 0) || 0;
      const negative = data?.reduce((sum, c) => sum + (c.variance_value < 0 ? Math.abs(c.variance_value) : 0), 0) || 0;
      
      setSummary(prev => ({
        ...prev,
        totalVariance,
        positiveVariance: positive,
        negativeVariance: negative,
        countsCompleted: data?.length || 0
      }));
      
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
      
      console.error('Error loading stock counts:', errorDetails);
      toast.error(error?.message || 'Failed to load stock counts');
    }
  }

  async function loadVarianceItems() {
    if (!companyId) return;
    
    try {
      // First, get stock counts filtered by company_id and site_id (respects RLS)
      let stockCountsQuery = supabase
        .from('stock_counts')
        .select('id, company_id, site_id, status')
        .eq('company_id', companyId)
        .in('status', ['approved', 'pending_approval', 'completed', 'finalized', 'finalised', 'locked']);
      
      if (siteId) {
        stockCountsQuery = stockCountsQuery.eq('site_id', siteId);
      }
      
      const { data: stockCountsData, error: countsError } = await stockCountsQuery;
      
      if (countsError) {
        const errorDetails: any = {
          query: 'stock_counts (for variance)',
          companyId: companyId,
          siteId: siteId,
          message: countsError?.message || 'No message',
          code: countsError?.code || 'NO_CODE',
          details: countsError?.details || 'No details',
          hint: countsError?.hint || 'No hint',
        };
        
        try {
          errorDetails.fullError = JSON.stringify(countsError, Object.getOwnPropertyNames(countsError));
        } catch (e) {
          errorDetails.fullError = 'Could not serialize error';
        }
        
        console.error('Error fetching stock counts:', errorDetails);
        toast.error(countsError?.message || 'Failed to load stock counts');
        setVarianceItems([]);
        return;
      }

      if (!stockCountsData || stockCountsData.length === 0) {
        setVarianceItems([]);
        return;
      }

      // Get stock count IDs
      const stockCountIds = stockCountsData.map(sc => sc.id);
      const stockCountsMap = new Map(stockCountsData.map(sc => [sc.id, sc]));

      // Now fetch stock count items for those stock count IDs
      const { data: itemsData, error: itemsError } = await supabase
        .from('stock_count_items')
        .select('*')
        .in('stock_count_id', stockCountIds)
        .eq('is_counted', true)
        .neq('variance_quantity', 0);
      
      if (itemsError) {
        const errorDetails: any = {
          query: 'stock_count_items',
          stockCountIds: stockCountIds.length,
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
        
        console.error('Error loading variance items:', errorDetails);
        toast.error(itemsError?.message || 'Failed to load variance items');
        setVarianceItems([]);
        return;
      }

      if (!itemsData || itemsData.length === 0) {
        setVarianceItems([]);
        return;
      }

      // Items are already filtered by stock count IDs, so they're valid
      const filteredItems = itemsData;

      if (filteredItems.length === 0) {
        setVarianceItems([]);
        return;
      }

      // Fetch stock items
      const stockItemIds = [...new Set(filteredItems.map(item => item.stock_item_id).filter(Boolean))];
      let stockItemsData: any[] = [];
      if (stockItemIds.length > 0) {
        const { data, error: itemsError } = await supabase
          .from('stock_items')
          .select('id, name, stock_unit, category_id')
          .in('id', stockItemIds);
        
        if (itemsError) {
          const errorDetails: any = {
            query: 'stock_items (for variance)',
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
        stockItemsData = data || [];
      }
      
      const stockItemsMap = new Map(stockItemsData.map(si => [si.id, si]));

      // Fetch categories
      const categoryIds = [...new Set(stockItemsData.map(si => si.category_id).filter(Boolean))];
      let categoriesData: any[] = [];
      if (categoryIds.length > 0) {
        const { data, error: catsError } = await supabase
          .from('stock_categories')
          .select('id, name')
          .in('id', categoryIds);
        
        if (catsError) {
          const errorDetails: any = {
            query: 'stock_categories (for variance)',
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
        categoriesData = data || [];
      }
      
      const categoriesMap = new Map((categoriesData || []).map(cat => [cat.id, cat]));

      // Map to variance items format
      const filtered = filteredItems.map(item => {
        const count = stockCountsMap.get(item.stock_count_id);
        const stockItem = stockItemsMap.get(item.stock_item_id);
        const category = stockItem ? categoriesMap.get(stockItem.category_id) : null;
        
        return {
          id: item.id,
          stock_count_id: count?.id || '',
          count_number: count?.count_number || '',
          count_date: count?.completed_at || '',
          item_name: stockItem?.name || 'Unknown',
          category_name: category?.name || 'Uncategorised',
          expected_quantity: item.expected_quantity || 0,
          counted_quantity: item.counted_quantity || 0,
          variance_quantity: item.variance_quantity || 0,
          unit_cost: item.unit_cost || 0,
          variance_value: item.variance_value || 0,
          unit: stockItem?.stock_unit || 'each'
        };
      }).sort((a, b) => Math.abs(b.variance_value) - Math.abs(a.variance_value));
      
      setVarianceItems(filtered);
      
      const catMap = new Map<string, CategoryVariance>();
      filtered.forEach(item => {
        const existing = catMap.get(item.category_name) || {
          category_name: item.category_name,
          item_count: 0,
          total_variance_value: 0,
          positive_count: 0,
          negative_count: 0
        };
        
        existing.item_count += 1;
        existing.total_variance_value += item.variance_value;
        if (item.variance_value > 0) existing.positive_count += 1;
        if (item.variance_value < 0) existing.negative_count += 1;
        
        catMap.set(item.category_name, existing);
      });
      
      setCategoryVariance(
        Array.from(catMap.values())
          .sort((a, b) => Math.abs(b.total_variance_value) - Math.abs(a.total_variance_value))
      );
      
      setSummary(prev => ({
        ...prev,
        itemsWithVariance: filtered.length
      }));
      
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
      
      console.error('Error loading variance items:', errorDetails);
      toast.error(error?.message || 'Failed to load variance items');
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleExportExcel() {
    try {
      const filteredItems = selectedCount === 'all' 
        ? varianceItems 
        : varianceItems.filter(i => i.stock_count_id === selectedCount);
      
      // Format data for Excel export
      const formattedData = filteredItems.map(item => ({
        'Count #': item.count_number,
        'Date': item.count_date ? new Date(item.count_date).toLocaleDateString('en-GB') : '',
        'Item': item.item_name,
        'Category': item.category_name,
        'Expected': item.expected_quantity,
        'Counted': item.counted_quantity,
        'Variance': item.variance_quantity,
        'Value': item.variance_value
      }));
      
      await exportToExcel(
        formattedData,
        `variance_report_${new Date().toISOString().split('T')[0]}`,
        'Variances'
      );
      
      toast.success('Excel export completed');
    } catch (error) {
      console.error('Excel export failed:', error);
      toast.error('Failed to export Excel file');
    }
  }

  function handleExportPdf() {
    try {
      const filteredItems = selectedCount === 'all' 
        ? varianceItems 
        : varianceItems.filter(i => i.stock_count_id === selectedCount);
      
      exportToPdf({
        filename: 'variance_report',
        title: 'Stock Variance Report',
        orientation: 'landscape',
        summary: [
          { label: 'Total Variance', value: formatCurrency(summary.totalVariance) },
          { label: 'Shrinkage', value: formatCurrency(summary.negativeVariance) },
          { label: 'Overage', value: formatCurrency(summary.positiveVariance) },
          { label: 'Items Affected', value: String(summary.itemsWithVariance) }
        ],
        columns: [
          { header: 'Item', key: 'item_name', width: 50 },
          { header: 'Category', key: 'category_name', width: 35 },
          { header: 'Expected', key: 'expected_quantity', width: 25, format: 'number', align: 'right' },
          { header: 'Counted', key: 'counted_quantity', width: 25, format: 'number', align: 'right' },
          { header: 'Variance', key: 'variance_quantity', width: 25, format: 'number', align: 'right' },
          { header: 'Value', key: 'variance_value', width: 30, format: 'currency', align: 'right' }
        ],
        data: filteredItems
      });
      
      toast.success('PDF export completed');
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to export PDF file');
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredItems = selectedCount === 'all' 
    ? varianceItems 
    : varianceItems.filter(i => i.stock_count_id === selectedCount);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-600 dark:text-[#D37E91] animate-spin" />
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
            className="p-2 rounded-lg bg-theme-button dark:bg-white/5 hover:bg-theme-button-hover dark:hover:bg-white/10 text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-secondary))] dark:text-white/60 hover:text-[rgb(var(--text-primary))] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">Variance Analysis</h1>
            <p className="text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm mt-1">Stock count variances and shrinkage</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[rgb(var(--text-secondary))] dark:text-white/60 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button 
            onClick={handleExportPdf}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 dark:bg-red-500/10 border border-red-500/30 dark:border-red-500/30 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/20 transition-colors text-sm"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* No Data State */}
      {stockCounts.length === 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
          <ClipboardList className="w-16 h-16 text-[rgb(var(--text-tertiary))] dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white mb-2">No Stock Counts Completed</h3>
          <p className="text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-secondary))] dark:text-white/60 max-w-md mx-auto mb-6">
            Complete and approve a stock count to see variance analysis. 
            Variances show the difference between expected and actual stock levels.
          </p>
          <Link 
            href="/dashboard/stockly/stock-counts"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#D37E91] hover:bg-[#D37E91]/90 text-white rounded-lg transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            Start Stock Count
          </Link>
        </div>
      )}

      {stockCounts.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>
                <span className="text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm">Total Variance</span>
              </div>
              <p className={`text-2xl font-bold ${summary.totalVariance < 0 ? 'text-red-400' : summary.totalVariance > 0 ? 'text-green-400' : 'text-white'}`}>
                {formatCurrency(summary.totalVariance)}
              </p>
            </div>
            
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                </div>
                <span className="text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm">Shrinkage</span>
              </div>
              <p className="text-2xl font-bold text-red-400">
                {formatCurrency(summary.negativeVariance)}
              </p>
            </div>
            
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm">Overage</span>
              </div>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(summary.positiveVariance)}
              </p>
            </div>
            
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Package className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm">Items w/ Variance</span>
              </div>
              <p className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">
                {summary.itemsWithVariance}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedCount}
              onChange={(e) => setSelectedCount(e.target.value)}
              className="px-3 py-2 bg-theme-button dark:bg-white/5 border border-theme dark:border-white/10 rounded-lg text-[rgb(var(--text-primary))] dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#D37E91]"
            >
              <option value="all">All Stock Counts</option>
              {stockCounts.map(count => (
                <option key={count.id} value={count.id}>
                  {count.count_number} - {formatDate(count.completed_at || count.scheduled_date || '')}
                </option>
              ))}
            </select>

            <div className="flex bg-white/5 rounded-lg p-1">
              {(['items', 'categories', 'counts'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === mode
                    ? 'bg-emerald-500/20 dark:bg-[#D37E91]/20 text-emerald-600 dark:text-[#D37E91]'
                    : 'text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-secondary))] dark:text-white/60 hover:text-[rgb(var(--text-primary))] dark:hover:text-white'
                  }`}
                >
                  {mode === 'items' ? 'By Item' : mode === 'categories' ? 'By Category' : 'By Count'}
                </button>
              ))}
            </div>
          </div>

          {/* Items View */}
          {viewMode === 'items' && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-theme dark:border-white/[0.06]">
                      <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-secondary))] dark:text-white/60">Item</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-secondary))] dark:text-white/60">Category</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Expected</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Counted</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Variance</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.slice(0, 50).map((item) => (
                      <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div>
                            <span className="text-white font-medium">{item.item_name}</span>
                            <span className="text-[rgb(var(--text-tertiary))] dark:text-white/40 text-xs ml-2">{item.count_number}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[rgb(var(--text-primary))] dark:text-[rgb(var(--text-primary))] dark:text-white/70">{item.category_name}</td>
                        <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-[rgb(var(--text-primary))] dark:text-white/70">
                          {item.expected_quantity} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          {item.counted_quantity} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`flex items-center justify-end gap-1 ${
                            item.variance_quantity < 0 ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {item.variance_quantity < 0 ? (
                              <TrendingDown className="w-4 h-4" />
                            ) : (
                              <TrendingUp className="w-4 h-4" />
                            )}
                            {item.variance_quantity > 0 ? '+' : ''}{item.variance_quantity} {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-medium ${
                            item.variance_value < 0 ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {formatCurrency(item.variance_value)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredItems.length === 0 && (
                <div className="p-12 text-center">
                  <Package className="w-12 h-12 text-green-400/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Variances</h3>
                  <p className="text-[rgb(var(--text-secondary))] dark:text-white/60">All counted items matched expected quantities</p>
                </div>
              )}
            </div>
          )}

          {/* Categories View */}
          {viewMode === 'categories' && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-theme dark:border-white/[0.06]">
                      <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Category</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Items</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Shrinkage</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Overage</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Net Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryVariance.map((cat) => (
                      <tr key={cat.category_name} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-[rgb(var(--text-primary))] dark:text-white font-medium">{cat.category_name}</td>
                        <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-[rgb(var(--text-primary))] dark:text-white/70">{cat.item_count}</td>
                        <td className="px-4 py-3 text-right text-red-400">{cat.negative_count}</td>
                        <td className="px-4 py-3 text-right text-green-400">{cat.positive_count}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-medium ${
                            cat.total_variance_value < 0 ? 'text-red-400' : 
                            cat.total_variance_value > 0 ? 'text-green-400' : 'text-white'
                          }`}>
                            {formatCurrency(cat.total_variance_value)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Counts View */}
          {viewMode === 'counts' && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-theme dark:border-white/[0.06]">
                      <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Count #</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Completed</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Items</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Variance</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockCounts.map((count) => (
                      <tr key={count.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <Link 
                            href={`/dashboard/stockly/stock-counts/${count.id}`}
                            className="text-white font-medium hover:text-[#D37E91]"
                          >
                            {count.count_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[rgb(var(--text-primary))] dark:text-[rgb(var(--text-primary))] dark:text-white/70 capitalize">{count.count_type}</td>
                        <td className="px-4 py-3 text-[rgb(var(--text-primary))] dark:text-[rgb(var(--text-primary))] dark:text-white/70">{formatDate(count.completed_at || '')}</td>
                        <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-[rgb(var(--text-primary))] dark:text-white/70">
                          {count.items_counted}/{count.total_items}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-medium ${
                            count.variance_value < 0 ? 'text-red-400' : 
                            count.variance_value > 0 ? 'text-green-400' : 'text-white'
                          }`}>
                            {formatCurrency(count.variance_value)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ['approved', 'completed', 'finalized', 'finalised', 'locked'].includes(count.status)
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                              : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                          }`}>
                            {count.status === 'approved' ? 'Approved' : 
                             count.status === 'completed' ? 'Completed' :
                             count.status === 'finalized' || count.status === 'finalised' ? 'Finalized' :
                             count.status === 'locked' ? 'Locked' :
                             'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
