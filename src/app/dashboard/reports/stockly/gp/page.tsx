"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft,
  TrendingUp, 
  TrendingDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  DollarSign,
  Percent,
  Users,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Target
} from '@/components/ui/icons';
import Link from 'next/link';
import { toast } from 'sonner';
import { exportToPdf } from '@/lib/export-pdf';
import { exportToExcel } from '@/lib/export-excel';

interface WeeklyGP {
  week_start: string;
  month_start: string;
  revenue: number;
  cost_of_goods: number;
  gross_profit: number;
  gp_percentage: number;
  transaction_count: number;
  total_covers: number;
  revenue_per_cover: number;
}

interface MonthlyGP {
  month_start: string;
  month_name: string;
  revenue: number;
  cost_of_goods: number;
  gross_profit: number;
  gp_percentage: number;
  transaction_count: number;
  total_covers: number;
  revenue_per_cover: number;
}

interface CategoryGP {
  category_name: string;
  revenue: number;
  cost: number;
  gross_profit: number;
  gp_percentage: number;
  items_sold: number;
}

export default function GPReportPage() {
  const { companyId, siteId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  
  const [weeklyData, setWeeklyData] = useState<WeeklyGP[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyGP[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryGP[]>([]);
  
  // Summary metrics
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    avgGP: 0,
    totalCovers: 0,
    avgPerCover: 0,
    targetGP: 70, // Default target
    gpTrend: 0
  });

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId, siteId]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadWeeklyData(), loadMonthlyData(), loadCategoryData()]);
    setLoading(false);
  }

  async function loadWeeklyData() {
    if (!companyId) return;
    
    try {
      // Try view first, then fallback
      let query = supabase
        .from('v_gp_weekly')
        .select('*')
        .eq('company_id', companyId)
        .order('week_start', { ascending: false })
        .limit(12);
      
      // Only filter by site_id if it's a valid UUID (not "all")
      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        const errorDetails: any = {
          query: 'v_gp_weekly',
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
        
        console.error('Error loading weekly GP:', errorDetails);
        // View might not exist, set empty data
        setWeeklyData([]);
        return;
      }
      
      setWeeklyData((data || []).reverse());
      
      // Calculate summary from last 4 weeks
      const recent = (data || []).slice(0, 4);
      const totalRevenue = recent.reduce((sum, w) => sum + (w.revenue || 0), 0);
      const totalCost = recent.reduce((sum, w) => sum + (w.cost_of_goods || 0), 0);
      const totalProfit = totalRevenue - totalCost;
      const totalCovers = recent.reduce((sum, w) => sum + (w.total_covers || 0), 0);
      
      // Calculate GP trend (compare last 2 weeks)
      const gpTrend = data && data.length >= 2 
        ? (data[0].gp_percentage || 0) - (data[1].gp_percentage || 0)
        : 0;
      
      setSummary({
        totalRevenue,
        totalCost,
        totalProfit,
        avgGP: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        totalCovers,
        avgPerCover: totalCovers > 0 ? totalRevenue / totalCovers : 0,
        targetGP: 70,
        gpTrend
      });
      
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
      
      console.error('Error loading weekly data:', errorDetails);
      toast.error(error?.message || 'Failed to load weekly GP data');
    }
  }

  async function loadMonthlyData() {
    if (!companyId) return;
    
    try {
      // Try view first, then fallback
      let query = supabase
        .from('v_gp_monthly')
        .select('*')
        .eq('company_id', companyId)
        .order('month_start', { ascending: false })
        .limit(12);
      
      // Only filter by site_id if it's a valid UUID (not "all")
      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        const errorDetails: any = {
          query: 'v_gp_monthly',
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
        
        console.error('Error loading monthly GP:', errorDetails);
        // View might not exist, set empty data
        setMonthlyData([]);
        return;
      }
      
      setMonthlyData((data || []).reverse());
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
      
      console.error('Error loading monthly data:', errorDetails);
      toast.error(error?.message || 'Failed to load monthly GP data');
    }
  }

  async function loadCategoryData() {
    if (!companyId) return;
    
    try {
      // Get current month
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      
      // Try view first, then fallback
      let query = supabase
        .from('v_gp_by_category')
        .select('*')
        .eq('company_id', companyId)
        .eq('month_start', currentMonth);
      
      // Only filter by site_id if it's a valid UUID (not "all")
      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        const errorDetails: any = {
          query: 'v_gp_by_category',
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
        
        console.error('Error loading category GP:', errorDetails);
        // View might not exist, set empty data
        setCategoryData([]);
        return;
      }
      
      setCategoryData((data || []).sort((a, b) => b.revenue - a.revenue));
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
      
      console.error('Error loading category data:', errorDetails);
      toast.error(error?.message || 'Failed to load category GP data');
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleExportExcel() {
    try {
      const data = viewMode === 'weekly' ? weeklyData : monthlyData;
      
      // Format data for Excel export
      const formattedData = data.map(item => ({
        [viewMode === 'weekly' ? 'Week Starting' : 'Month']: viewMode === 'weekly' 
          ? new Date(item.week_start).toLocaleDateString('en-GB')
          : (item as MonthlyGP).month_name || '',
        'Revenue': item.revenue,
        'COGS': item.cost_of_goods,
        'Gross Profit': item.gross_profit,
        'GP %': item.gp_percentage,
        'Covers': item.total_covers,
        'Avg/Cover': item.revenue_per_cover
      }));
      
      await exportToExcel(
        formattedData,
        `gp_report_${viewMode}_${new Date().toISOString().split('T')[0]}`,
        `GP ${viewMode === 'weekly' ? 'Weekly' : 'Monthly'}`
      );
      
      toast.success('Excel export completed');
    } catch (error) {
      console.error('Excel export failed:', error);
      toast.error('Failed to export Excel file');
    }
  }

  function handleExportPdf() {
    try {
      const data = viewMode === 'weekly' ? weeklyData : monthlyData;
      
      exportToPdf({
        filename: `gp_report_${viewMode}`,
        title: `Gross Profit Report (${viewMode === 'weekly' ? 'Weekly' : 'Monthly'})`,
        orientation: 'landscape',
        summary: [
          { label: 'Total Revenue', value: formatCurrency(summary.totalRevenue) },
          { label: 'Total COGS', value: formatCurrency(summary.totalCost) },
          { label: 'Gross Profit', value: formatCurrency(summary.totalProfit) },
          { label: 'Avg GP %', value: `${summary.avgGP.toFixed(1)}%` }
        ],
        columns: [
          { header: viewMode === 'weekly' ? 'Week' : 'Month', key: viewMode === 'weekly' ? 'week_start' : 'month_name', width: 25, format: viewMode === 'weekly' ? 'date' : 'text' },
          { header: 'Revenue', key: 'revenue', width: 30, format: 'currency', align: 'right' },
          { header: 'COGS', key: 'cost_of_goods', width: 30, format: 'currency', align: 'right' },
          { header: 'GP', key: 'gross_profit', width: 30, format: 'currency', align: 'right' },
          { header: 'GP %', key: 'gp_percentage', width: 20, format: 'percentage', align: 'right' },
          { header: 'Covers', key: 'total_covers', width: 20, format: 'number', align: 'right' }
        ],
        data
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getGpColor = (gp: number) => {
    if (gp >= 70) return 'text-green-400';
    if (gp >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getGpBgColor = (gp: number) => {
    if (gp >= 70) return 'bg-green-500';
    if (gp >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-stockly-dark dark:text-stockly animate-spin" />
      </div>
    );
  }

  const displayData = viewMode === 'weekly' ? weeklyData : monthlyData;
  const maxRevenue = Math.max(...displayData.map(d => d.revenue), 1);

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
            <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">Gross Profit Report</h1>
            <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm mt-1">Revenue vs Cost of Goods analysis</p>
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
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-2 bg-green-500/10 dark:bg-green-500/10 border border-green-500/30 dark:border-green-500/30 rounded-lg text-green-600 dark:text-green-400 hover:bg-module-fg/10 dark:hover:bg-module-fg/10 transition-colors text-sm"
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
      {weeklyData.length === 0 && monthlyData.length === 0 && (
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-12 text-center">
          <Receipt className="w-16 h-16 text-[rgb(var(--text-tertiary))] dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white mb-2">No GP Data Available</h3>
          <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary max-w-md mx-auto mb-6">
            Import sales data from your POS system to calculate Gross Profit. 
            GP is calculated from Revenue minus Cost of Goods (deliveries).
          </p>
          <Link 
            href="/dashboard/stockly/sales"
            className="inline-flex items-center gap-2 px-4 py-2 bg-stockly-dark dark:bg-stockly hover:bg-stockly-dark/90 dark:hover:bg-stockly/90 text-white rounded-lg transition-colors"
          >
            <DollarSign className="w-4 h-4" />
            Import Sales Data
          </Link>
        </div>
      )}

      {(weeklyData.length > 0 || monthlyData.length > 0) && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-500 dark:text-green-400" />
                </div>
                <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm">Revenue (4 wk)</span>
              </div>
              <p className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                </div>
                <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm">Gross Profit</span>
              </div>
              <p className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{formatCurrency(summary.totalProfit)}</p>
            </div>
            
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-stockly-dark/10 dark:bg-stockly/10 rounded-lg">
                  <Percent className="w-5 h-5 text-stockly-dark dark:text-stockly" />
                </div>
                <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm">Average GP %</span>
              </div>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${getGpColor(summary.avgGP)}`}>
                  {summary.avgGP.toFixed(1)}%
                </p>
                {summary.gpTrend !== 0 && (
                  <span className={`text-sm flex items-center ${summary.gpTrend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {summary.gpTrend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {Math.abs(summary.gpTrend).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                </div>
                <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm">Avg Per Cover</span>
              </div>
              <p className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{formatCurrency(summary.avgPerCover)}</p>
            </div>
          </div>

          {/* GP Target Indicator */}
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary" />
                <span className="text-[rgb(var(--text-primary))] dark:text-white font-medium">GP Target: {summary.targetGP}%</span>
              </div>
              <span className={`flex items-center gap-1 ${summary.avgGP >= summary.targetGP ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {summary.avgGP >= summary.targetGP ? (
                  <><CheckCircle2 className="w-4 h-4" /> On Target</>
                ) : (
                  <><AlertTriangle className="w-4 h-4" /> Below Target</>
                )}
              </span>
            </div>
 <div className="relative h-4 bg-theme-button rounded-full overflow-hidden">
              <div 
                className={`absolute left-0 top-0 h-full rounded-full transition-all ${getGpBgColor(summary.avgGP)}`}
                style={{ width: `${Math.min(summary.avgGP, 100)}%` }}
              />
              <div 
                className="absolute top-0 w-0.5 h-full bg-[rgb(var(--text-secondary))] dark:bg-white/60"
                style={{ left: `${summary.targetGP}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* View Toggle */}
 <div className="flex bg-theme-button rounded-lg p-1 w-fit">
            {(['weekly', 'monthly'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === mode
                    ? 'bg-stockly-dark/20 dark:bg-stockly/20 text-stockly-dark dark:text-stockly'
                    : 'text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))]'
                }`}
              >
                {mode === 'weekly' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>

          {/* Trend Chart */}
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white mb-4">
              {viewMode === 'weekly' ? 'Weekly' : 'Monthly'} GP Trend
            </h2>
            
            {displayData.length === 0 ? (
              <div className="text-center py-8 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
                No data available for this period
              </div>
            ) : (
              <div className="space-y-4">
                {/* Chart bars */}
                <div className="flex items-end gap-2 h-48">
                  {displayData.map((item, index) => {
                    const revenueHeight = (item.revenue / maxRevenue) * 100;
                    const costHeight = (item.cost_of_goods / maxRevenue) * 100;
                    const label = viewMode === 'weekly' 
                      ? formatDate(item.week_start)
                      : (item as MonthlyGP).month_name?.slice(0, 3);
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <span className={`text-xs font-semibold ${getGpColor(item.gp_percentage)}`}>
                          {item.gp_percentage.toFixed(0)}%
                        </span>
                        <div className="w-full flex flex-col gap-0.5" style={{ height: `${revenueHeight}%` }}>
                          <div 
                            className="w-full bg-green-500/80 rounded-t"
                            style={{ height: `${100 - (costHeight / revenueHeight * 100)}%`, minHeight: '2px' }}
                            title={`Profit: ${formatCurrency(item.gross_profit)}`}
                          />
                          <div 
                            className="w-full bg-red-500/60 rounded-b"
                            style={{ height: `${costHeight / revenueHeight * 100}%`, minHeight: '2px' }}
                            title={`COGS: ${formatCurrency(item.cost_of_goods)}`}
                          />
                        </div>
                        <span className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mt-1">{label}</span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500/80" />
                    <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Gross Profit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500/60" />
                    <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Cost of Goods</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Data Table */}
 <div className="bg-theme-surface-elevated border border-theme rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-theme">
              <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white">
                {viewMode === 'weekly' ? 'Weekly' : 'Monthly'} Breakdown
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-theme">
                    <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
                      {viewMode === 'weekly' ? 'Week Starting' : 'Month'}
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Revenue</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">COGS</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Gross Profit</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">GP %</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Covers</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Avg/Cover</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.slice().reverse().map((item, index) => (
 <tr key={index} className="border-b border-theme hover:bg-theme-button-hover">
                      <td className="px-4 py-3 text-[rgb(var(--text-primary))] dark:text-white font-medium">
                        {viewMode === 'weekly' 
                          ? formatDate(item.week_start)
                          : (item as MonthlyGP).month_name
                        }
                      </td>
                      <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-white">
                        {formatCurrency(item.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-theme-secondary">
                        {formatCurrency(item.cost_of_goods)}
                      </td>
                      <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-white">
                        {formatCurrency(item.gross_profit)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${getGpColor(item.gp_percentage)}`}>
                          {item.gp_percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-theme-secondary">
                        {item.total_covers.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-theme-secondary">
                        {formatCurrency(item.revenue_per_cover)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Breakdown */}
          {categoryData.length > 0 && (
 <div className="bg-theme-surface-elevated border border-theme rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-theme">
                <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white">GP by Category (This Month)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-theme">
                      <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Category</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Revenue</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Cost</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">GP</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">GP %</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Items Sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.map((cat, index) => (
 <tr key={index} className="border-b border-theme hover:bg-theme-button-hover">
                        <td className="px-4 py-3 text-[rgb(var(--text-primary))] dark:text-white font-medium">
                          {cat.category_name || 'Uncategorised'}
                        </td>
                        <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-white">
                          {formatCurrency(cat.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-theme-secondary">
                          {formatCurrency(cat.cost || 0)}
                        </td>
                        <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-white">
                          {formatCurrency(cat.gross_profit)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${getGpColor(cat.gp_percentage)}`}>
                            {cat.gp_percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-theme-secondary">
                          {cat.items_sold.toLocaleString()}
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
