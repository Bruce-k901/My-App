"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft,
  Trash2, 
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { exportWastageReport } from '@/lib/export-excel';
import { exportWastagePdf } from '@/lib/export-pdf';

interface WastageByReason {
  reason: string;
  count: number;
  total_quantity: number;
  total_value: number;
}

interface WastageByCategory {
  category_name: string;
  count: number;
  total_value: number;
}

interface WastageItem {
  id: string;
  item_name: string;
  category_name: string;
  quantity: number;
  unit: string;
  total_value: number;
  reason: string;
  wastage_date: string;
  notes: string | null;
}

const REASON_LABELS: Record<string, string> = {
  'expired': 'Expired',
  'damaged': 'Damaged',
  'contaminated': 'Contaminated',
  'over_production': 'Over Production',
  'quality_issue': 'Quality Issue',
  'spillage': 'Spillage',
  'theft': 'Theft',
  'other': 'Other'
};

const REASON_COLORS: Record<string, string> = {
  'expired': 'bg-red-500/10 text-red-400 border-red-500/30',
  'damaged': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  'contaminated': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'over_production': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'quality_issue': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  'spillage': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  'theft': 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  'other': 'bg-gray-500/10 text-gray-400 border-gray-500/30'
};

export default function WastageReportPage() {
  const { companyId, siteId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('month');
  
  const [totalWastage, setTotalWastage] = useState(0);
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [byReason, setByReason] = useState<WastageByReason[]>([]);
  const [byCategory, setByCategory] = useState<WastageByCategory[]>([]);
  const [wastageItems, setWastageItems] = useState<WastageItem[]>([]);
  
  const [viewMode, setViewMode] = useState<'reason' | 'category' | 'items'>('reason');

  useEffect(() => {
    if (companyId) {
      loadReportData();
    }
  }, [companyId, siteId, dateRange]);

  async function loadReportData() {
    if (!companyId) return;
    
    setLoading(true);
    try {
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default: // month
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get wastage records - need to filter through waste_logs for RLS
      // First get waste logs for the company and date range (with all needed fields)
      let wasteLogsQuery = supabase
        .from('waste_logs')
        .select('id, company_id, site_id, waste_date, waste_reason, notes, total_cost, created_at')
        .eq('company_id', companyId)
        .gte('waste_date', startDate.toISOString().split('T')[0]);
      
      // Only filter by site_id if it's a valid UUID (not "all")
      if (siteId && siteId !== 'all') {
        wasteLogsQuery = wasteLogsQuery.eq('site_id', siteId);
      }
      
      const { data: wasteLogsData, error: logsError } = await wasteLogsQuery;
      
      if (logsError) {
        console.error('Error fetching waste logs:', logsError);
        toast.error('Failed to load waste logs');
        setLoading(false);
        return;
      }
      
      if (!wasteLogsData || wasteLogsData.length === 0) {
        setTotalWastage(0);
        setTotalIncidents(0);
        setByReason([]);
        setByCategory([]);
        setWastageItems([]);
        setLoading(false);
        return;
      }
      
      // Now get waste_log_lines for those waste_log_ids
      const logIds = wasteLogsData.map(wl => wl.id);
      let query = supabase
        .from('waste_log_lines')
        .select('*')
        .in('waste_log_id', logIds);
      
      const { data: linesData, error: linesError } = await query;
      
      if (linesError) {
        // Extract meaningful error details
        const errorDetails: any = {
          query: 'waste_log_lines',
          companyId: companyId,
          siteId: siteId,
        };
        
        // Check if error is empty object
        const errorKeys = linesError && typeof linesError === 'object' ? Object.keys(linesError) : [];
        const isEmptyObject = errorKeys.length === 0;
        
        if (isEmptyObject) {
          errorDetails.isEmptyObject = true;
          errorDetails.note = 'Error object is empty - this might indicate an RLS policy issue or permission problem';
          errorDetails.message = 'Empty error object - check RLS policies and permissions';
          errorDetails.code = 'EMPTY_ERROR';
        } else {
          // Extract standard Supabase error fields
          errorDetails.message = linesError?.message || linesError?.error?.message || 'No message';
          errorDetails.code = linesError?.code || linesError?.error?.code || linesError?.statusCode || 'NO_CODE';
          errorDetails.details = linesError?.details || linesError?.error?.details || 'No details';
          errorDetails.hint = linesError?.hint || linesError?.error?.hint || 'No hint';
          
          // Try to get all properties
          try {
            const allProps = Object.getOwnPropertyNames(linesError);
            errorDetails.allProperties = allProps;
            errorDetails.fullError = JSON.stringify(linesError, allProps);
          } catch (e) {
            errorDetails.fullError = 'Could not serialize error';
          }
          
          // Try to stringify the error
          try {
            errorDetails.errorString = String(linesError);
          } catch (e) {
            errorDetails.errorString = 'Could not convert to string';
          }
        }
        
        console.error('Error loading wastage data:', errorDetails);
        
        // Show user-friendly error message
        const userMessage = isEmptyObject 
          ? 'Failed to load wastage data. Check console for details.'
          : (linesError?.message || errorDetails.message || 'Failed to load wastage data');
        toast.error(userMessage);
        return;
      }

      if (!linesData || linesData.length === 0) {
        setTotalWastage(0);
        setTotalIncidents(0);
        setByReason([]);
        setByCategory([]);
        setWastageItems([]);
        setLoading(false);
        return;
      }

      // We already have waste logs data from the first query
      const wasteLogsMap = new Map(wasteLogsData.map(wl => [wl.id, wl]));
      
      // Lines are already filtered by waste_log_ids, so use them directly
      const filteredLines = linesData || [];

      if (filteredLines.length === 0) {
        setTotalWastage(0);
        setTotalIncidents(0);
        setByReason([]);
        setByCategory([]);
        setWastageItems([]);
        setLoading(false);
        return;
      }

      // Fetch stock items
      const stockItemIds = [...new Set(filteredLines.map(l => l.stock_item_id).filter(Boolean))];
      let stockItemsData: any[] = [];
      if (stockItemIds.length > 0) {
        const { data, error: itemsError } = await supabase
          .from('stock_items')
          .select('id, name, stock_unit, category_id')
          .in('id', stockItemIds);
        
        if (itemsError) {
          const errorDetails: any = {
            query: 'stock_items',
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
            query: 'stock_categories',
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
      
      const categoriesMap = new Map(categoriesData.map(cat => [cat.id, cat]));

      // Combine data
      const data = filteredLines.map(line => {
        const wasteLog = wasteLogsMap.get(line.waste_log_id);
        const stockItem = stockItemsMap.get(line.stock_item_id);
        const category = stockItem ? categoriesMap.get(stockItem.category_id) : null;
        
        return {
          ...line,
          waste_logs: wasteLog,
          stock_items: stockItem ? {
            ...stockItem,
            stock_categories: category
          } : null
        };
      });

      // Calculate totals
      const total = data.reduce((sum, item) => sum + (item.line_cost || item.unit_cost * item.quantity || 0), 0);
      
      // Count unique waste_logs (incidents)
      const uniqueLogIds = new Set(data.map(item => (item.waste_logs as any)?.id).filter(Boolean));
      const incidentCount = uniqueLogIds.size;
      
      setTotalWastage(total);
      setTotalIncidents(incidentCount);

      // Aggregate by reason
      const reasonMap = new Map<string, WastageByReason>();
      data.forEach(item => {
        const wasteLog = item.waste_logs as any;
        const reason = wasteLog?.waste_reason || 'other';
        
        const existing = reasonMap.get(reason) || {
          reason,
          count: 0,
          total_quantity: 0,
          total_value: 0
        };
        
        existing.count += 1;
        existing.total_quantity += item.quantity || 0;
        existing.total_value += item.line_cost || (item.unit_cost || 0) * (item.quantity || 0);
        
        reasonMap.set(reason, existing);
      });
      
      setByReason(
        Array.from(reasonMap.values())
          .sort((a, b) => b.total_value - a.total_value)
      );

      // Aggregate by category
      const categoryMap = new Map<string, WastageByCategory>();
      data.forEach(item => {
        const stockItem = item.stock_items as any;
        const category = stockItem?.stock_categories;
        const catName = category?.name || 'Uncategorised';
        
        const existing = categoryMap.get(catName) || {
          category_name: catName,
          count: 0,
          total_value: 0
        };
        
        existing.count += 1;
        existing.total_value += item.line_cost || (item.unit_cost || 0) * (item.quantity || 0);
        
        categoryMap.set(catName, existing);
      });
      
      setByCategory(
        Array.from(categoryMap.values())
          .sort((a, b) => b.total_value - a.total_value)
      );

      // Individual items
      const items: WastageItem[] = data.map(item => {
        const wasteLog = item.waste_logs as any;
        const stockItem = item.stock_items as any;
        const category = stockItem?.stock_categories;
        
        return {
          id: item.id,
          item_name: stockItem?.name || 'Unknown',
          category_name: category?.name || 'Uncategorised',
          quantity: item.quantity || 0,
          unit: stockItem?.stock_unit || 'each',
          total_value: item.line_cost || (item.unit_cost || 0) * (item.quantity || 0),
          reason: wasteLog?.waste_reason || 'other',
          wastage_date: wasteLog?.waste_date || '',
          notes: wasteLog?.notes
        };
      });
      
      setWastageItems(items);
      
    } catch (error: any) {
      // Extract meaningful error information
      const errorDetails: any = {
        message: error?.message || 'Unknown error',
        code: error?.code || 'NO_CODE',
        details: error?.details || 'No details',
        hint: error?.hint || 'No hint',
      };
      
      // Try to serialize the error object
      try {
        errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
      } catch (e) {
        errorDetails.fullError = 'Could not serialize error';
      }
      
      // Try to get error as string
      try {
        errorDetails.errorString = String(error);
      } catch (e) {
        errorDetails.errorString = 'Could not convert to string';
      }
      
      console.error('Error loading report data:', errorDetails);
      
      // Show user-friendly error message
      const userMessage = error?.message || errorDetails.message || 'Failed to load report data';
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-600 dark:text-[#EC4899] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/stockly/reports"
            className="p-2 rounded-lg bg-theme-button dark:bg-white/5 hover:bg-theme-button-hover dark:hover:bg-white/10 text-[rgb(var(--text-secondary))] dark:text-white/60 hover:text-[rgb(var(--text-primary))] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">Wastage Report</h1>
            <p className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm mt-1">Stock wastage analysis by reason and category</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/stockly/waste"
            className="flex items-center gap-2 px-3 py-2 bg-theme-button dark:bg-white/5 hover:bg-theme-button-hover dark:hover:bg-white/10 border border-theme dark:border-white/10 rounded-lg text-[rgb(var(--text-primary))] dark:text-white transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" />
            View Waste Log
          </Link>
          
          <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex bg-theme-button dark:bg-white/5 rounded-lg p-1">
            {(['week', 'month', 'quarter'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  dateRange === range
                    ? 'bg-emerald-500/20 dark:bg-[#EC4899]/20 text-emerald-600 dark:text-[#EC4899]'
                    : 'text-[rgb(var(--text-secondary))] dark:text-white/60 hover:text-[rgb(var(--text-primary))] dark:hover:text-white'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-theme-button dark:bg-white/5 hover:bg-theme-button-hover dark:hover:bg-white/10 text-[rgb(var(--text-secondary))] dark:text-white/60 hover:text-[rgb(var(--text-primary))] dark:hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={async () => {
              try {
                await exportWastageReport(wastageItems.map(item => ({
                  ...item,
                  notes: item.notes || undefined
                })));
                toast.success('Excel export completed');
              } catch (error) {
                console.error('Excel export failed:', error);
                toast.error('Failed to export Excel file');
              }
            }}
            className="flex items-center gap-2 px-3 py-2 bg-green-500/10 dark:bg-green-500/10 border border-green-500/30 dark:border-green-500/30 rounded-lg text-green-600 dark:text-green-400 hover:bg-green-500/20 dark:hover:bg-green-500/20 transition-colors text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button 
            onClick={() => {
              try {
                exportWastagePdf(totalWastage, totalIncidents, wastageItems);
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-theme-surface-elevated dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>
            <span className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm">Total Wastage</span>
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalWastage)}</p>
        </div>
        
        <div className="bg-theme-surface-elevated dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            </div>
            <span className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm">Incidents</span>
          </div>
          <p className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{totalIncidents}</p>
        </div>
        
        <div className="bg-theme-surface-elevated dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Calendar className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
            </div>
            <span className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm">Avg Per Incident</span>
          </div>
          <p className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white">
            {formatCurrency(totalIncidents > 0 ? totalWastage / totalIncidents : 0)}
          </p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex bg-theme-button dark:bg-white/5 rounded-lg p-1 w-fit">
        {(['reason', 'category', 'items'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === mode
                ? 'bg-emerald-500/20 dark:bg-[#EC4899]/20 text-emerald-600 dark:text-[#EC4899]'
                : 'text-[rgb(var(--text-secondary))] dark:text-white/60 hover:text-[rgb(var(--text-primary))] dark:hover:text-white'
            }`}
          >
            {mode === 'reason' ? 'By Reason' : mode === 'category' ? 'By Category' : 'All Items'}
          </button>
        ))}
      </div>

      {/* Data Tables */}
      {viewMode === 'reason' && (
        <div className="bg-theme-surface-elevated dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-theme dark:border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Reason</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Incidents</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Value</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {byReason.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[rgb(var(--text-tertiary))] dark:text-white/40">
                      No wastage data available
                    </td>
                  </tr>
                ) : (
                  byReason.map((row) => {
                    const percentage = totalWastage > 0 ? (row.total_value / totalWastage) * 100 : 0;
                    
                    return (
                      <tr 
                        key={row.reason}
                        className="border-b border-theme dark:border-white/[0.03] hover:bg-theme-button-hover dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${REASON_COLORS[row.reason] || REASON_COLORS['other']}`}>
                            {REASON_LABELS[row.reason] || row.reason}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-white/80">{row.count}</td>
                        <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-medium">
                          {formatCurrency(row.total_value)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 bg-theme-button dark:bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-red-500 dark:bg-red-500 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm w-12">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {byReason.length > 0 && (
                <tfoot>
                  <tr className="bg-theme-surface-elevated dark:bg-white/[0.03]">
                    <td className="px-4 py-3 font-semibold text-[rgb(var(--text-primary))] dark:text-white">Total</td>
                    <td className="px-4 py-3 text-right font-semibold text-[rgb(var(--text-primary))] dark:text-white">{totalIncidents}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">
                      {formatCurrency(totalWastage)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[rgb(var(--text-primary))] dark:text-white">100%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {viewMode === 'category' && (
        <div className="bg-theme-surface-elevated dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-theme dark:border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Category</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Incidents</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Value</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[rgb(var(--text-tertiary))] dark:text-white/40">
                      No category data available
                    </td>
                  </tr>
                ) : (
                  byCategory.map((row) => {
                    const percentage = totalWastage > 0 ? (row.total_value / totalWastage) * 100 : 0;
                    
                    return (
                      <tr 
                        key={row.category_name}
                        className="border-b border-theme dark:border-white/[0.03] hover:bg-theme-button-hover dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <span className="text-[rgb(var(--text-primary))] dark:text-white font-medium">{row.category_name}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-white/80">{row.count}</td>
                        <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-medium">
                          {formatCurrency(row.total_value)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 bg-theme-button dark:bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-orange-500 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm w-12">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {byCategory.length > 0 && (
                <tfoot>
                  <tr className="bg-theme-surface-elevated dark:bg-white/[0.03]">
                    <td className="px-4 py-3 font-semibold text-[rgb(var(--text-primary))] dark:text-white">Total</td>
                    <td className="px-4 py-3 text-right font-semibold text-[rgb(var(--text-primary))] dark:text-white">{totalIncidents}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">
                      {formatCurrency(totalWastage)}
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
        <div className="bg-theme-surface-elevated dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-theme dark:border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Item</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Reason</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Qty</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Value</th>
                </tr>
              </thead>
              <tbody>
                {wastageItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[rgb(var(--text-tertiary))] dark:text-white/40">
                      No wastage items available
                    </td>
                  </tr>
                ) : (
                  wastageItems.slice(0, 50).map((item) => (
                    <tr 
                      key={item.id}
                      className="border-b border-theme dark:border-white/[0.03] hover:bg-theme-button-hover dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm">
                        {formatDate(item.wastage_date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[rgb(var(--text-primary))] dark:text-white font-medium">{item.item_name}</span>
                        {item.notes && (
                          <p className="text-[rgb(var(--text-tertiary))] dark:text-white/40 text-xs mt-0.5 truncate max-w-xs">{item.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[rgb(var(--text-primary))] dark:text-white/70">{item.category_name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${REASON_COLORS[item.reason] || REASON_COLORS['other']}`}>
                          {REASON_LABELS[item.reason] || item.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-white/80">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-medium">
                        {formatCurrency(item.total_value)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {wastageItems.length > 50 && (
                <tfoot>
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-center text-[rgb(var(--text-tertiary))] dark:text-white/40 text-sm">
                      Showing 50 of {wastageItems.length} items. Export to see all.
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* No Data State */}
      {totalIncidents === 0 && (
        <div className="bg-theme-surface-elevated dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-12 text-center">
          <Trash2 className="w-12 h-12 text-[rgb(var(--text-tertiary))] dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[rgb(var(--text-primary))] dark:text-white mb-2">No wastage recorded</h3>
          <p className="text-[rgb(var(--text-secondary))] dark:text-white/60">No wastage incidents found for this period</p>
        </div>
      )}
    </div>
  );
}
