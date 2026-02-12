"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  ChevronRight,
  PieChart,
  DollarSign,
  Users,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  ArrowLeft
} from '@/components/ui/icons';
import Link from 'next/link';
import { toast } from 'sonner';
import { exportToExcelMultiSheet } from '@/lib/export-excel';
import { exportToPdf } from '@/lib/export-pdf';

// Types
interface ReportMetrics {
  stockValue: number;
  stockValueChange: number;
  monthlySpend: number;
  spendChange: number;
  varianceValue: number;
  varianceChange: number;
  wastageValue: number;
  wastageChange: number;
}

interface CategorySpend {
  category_name: string;
  total: number;
}

interface SupplierSpend {
  supplier_name: string;
  total: number;
}

export default function StocklyReportsPage() {
  const { companyId, siteId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('month');

  // Metrics state
  const [metrics, setMetrics] = useState<ReportMetrics>({
    stockValue: 0,
    stockValueChange: 0,
    monthlySpend: 0,
    spendChange: 0,
    varianceValue: 0,
    varianceChange: 0,
    wastageValue: 0,
    wastageChange: 0
  });

  // Chart data state
  const [categorySpend, setCategorySpend] = useState<CategorySpend[]>([]);
  const [supplierSpend, setSupplierSpend] = useState<SupplierSpend[]>([]);

  useEffect(() => {
    if (companyId) {
      loadReportData();
    }
  }, [companyId, siteId, dateRange]);

  async function loadReportData() {
    if (!companyId) return;

    setLoading(true);
    try {
      // Get current stock value
      let stockQuery = supabase
        .from('stock_levels')
        .select('value')
        .eq('company_id', companyId);

      // Only filter by site_id if it's a valid UUID (not "all")
      if (siteId && siteId !== 'all') {
        stockQuery = stockQuery.eq('site_id', siteId);
      }

      const { data: stockData, error: stockError } = await stockQuery;

      if (stockError) {
        console.error('Error fetching stock levels:', stockError);
        toast.error('Failed to load stock value');
      }

      const totalStockValue = stockData?.reduce((sum, item) => sum + (item.value || 0), 0) || 0;

      // Get date range boundaries
      const now = new Date();
      let startDate: Date;
      let prevStartDate: Date;
      let prevEndDate: Date;

      switch (dateRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          prevEndDate = new Date(startDate.getTime() - 1);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          prevStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          prevEndDate = new Date(startDate.getTime() - 1);
          break;
        default: // month
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          prevStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          prevEndDate = new Date(startDate.getTime() - 1);
      }

      // Get current period spend from deliveries
      let spendQuery = supabase
        .from('deliveries')
        .select('total')
        .eq('company_id', companyId)
        .eq('status', 'confirmed')
        .gte('delivery_date', startDate.toISOString().split('T')[0]);

      // Only filter by site_id if it's a valid UUID (not "all")
      if (siteId && siteId !== 'all') {
        spendQuery = spendQuery.eq('site_id', siteId);
      }

      const { data: spendData, error: spendError } = await spendQuery;

      if (spendError) {
        console.error('Error fetching spend data:', spendError);
        toast.error('Failed to load spend data');
      }

      const currentSpend = spendData?.reduce((sum, d) => sum + (d.total || 0), 0) || 0;

      // Get previous period spend for comparison
      let prevSpendQuery = supabase
        .from('deliveries')
        .select('total')
        .eq('company_id', companyId)
        .eq('status', 'confirmed')
        .gte('delivery_date', prevStartDate.toISOString().split('T')[0])
        .lte('delivery_date', prevEndDate.toISOString().split('T')[0]);

      // Only filter by site_id if it's a valid UUID (not "all")
      if (siteId && siteId !== 'all') {
        prevSpendQuery = prevSpendQuery.eq('site_id', siteId);
      }

      const { data: prevSpendData } = await prevSpendQuery;
      const prevSpend = prevSpendData?.reduce((sum, d) => sum + (d.total || 0), 0) || 0;
      const spendChange = prevSpend > 0 ? ((currentSpend - prevSpend) / prevSpend) * 100 : 0;

      // Get wastage data (views don't support foreign key relationships)
      let totalWastage = 0;
      try {
        // First, fetch waste logs filtered by date, company_id, and site_id
        let logsQuery = supabase
          .from('waste_logs')
          .select('id, company_id, site_id')
          .eq('company_id', companyId)
          .gte('waste_date', startDate.toISOString().split('T')[0]);

        // Only filter by site_id if it's a valid UUID (not "all")
        if (siteId && siteId !== 'all') {
          logsQuery = logsQuery.eq('site_id', siteId);
        }

        const { data: logsData } = await logsQuery;

        if (logsData && logsData.length > 0) {
          const validLogIds = logsData.map(l => l.id);

          // Then fetch waste log lines for those waste log IDs
          const { data: linesData } = await supabase
            .from('waste_log_lines')
            .select('line_cost, waste_log_id')
            .in('waste_log_id', validLogIds);

          if (linesData && linesData.length > 0) {
            // Sum line costs for valid waste logs
            totalWastage = linesData
              .reduce((sum, w) => sum + (w.line_cost || 0), 0);
          }
        }
      } catch (error) {
        console.log('Wastage query failed:', error);
      }

      // Get category spend breakdown
      // Try view first, then fallback to direct query
      let categoryBreakdown: CategorySpend[] = [];
      try {
        // Try view first
        let catSpendQuery = supabase
          .from('v_category_spend')
          .select('category_name, total')
          .eq('company_id', companyId)
          .gte('week', startDate.toISOString().split('T')[0]);

        // Only filter by site_id if it's a valid UUID (not "all")
        if (siteId && siteId !== 'all') {
          catSpendQuery = catSpendQuery.eq('site_id', siteId);
        }

        const { data: catData, error: catError } = await catSpendQuery;

        if (!catError && catData) {
          // Aggregate by category
          const catMap = new Map<string, number>();
          catData.forEach((item: any) => {
            const name = item.category_name || 'Uncategorised';
            catMap.set(name, (catMap.get(name) || 0) + (item.total || 0));
          });
          categoryBreakdown = Array.from(catMap.entries())
            .map(([category_name, total]) => ({ category_name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 6);
        } else {
          // Fallback to direct query (views don't support foreign key relationships)
          let deliveryLinesQuery = supabase
            .from('delivery_lines')
            .select('line_total, delivery_id, product_variant_id')
            .gte('created_at', startDate.toISOString());

          const { data: deliveryLinesData } = await deliveryLinesQuery;

          if (deliveryLinesData && deliveryLinesData.length > 0) {
            // Fetch deliveries to filter by company_id and status
            const deliveryIds = [...new Set(deliveryLinesData.map(l => l.delivery_id).filter(Boolean))];
            if (deliveryIds.length > 0) {
              let deliveriesQuery = supabase
                .from('deliveries')
                .select('id, company_id, status, delivery_date')
                .in('id', deliveryIds)
                .eq('company_id', companyId)
                .eq('status', 'confirmed')
                .gte('delivery_date', startDate.toISOString().split('T')[0]);

              // Only filter by site_id if it's a valid UUID (not "all")
              if (siteId && siteId !== 'all') {
                deliveriesQuery = deliveriesQuery.eq('site_id', siteId);
              }

              const { data: deliveriesData } = await deliveriesQuery;
              const validDeliveryIds = new Set((deliveriesData || []).map(d => d.id));

              // Fetch product variants and stock items
              const variantIds = [...new Set(deliveryLinesData.map(l => l.product_variant_id).filter(Boolean))];
              let stockItemsMap = new Map();
              if (variantIds.length > 0) {
                const { data: variantsData } = await supabase
                  .from('product_variants')
                  .select('id, stock_item_id')
                  .in('id', variantIds);

                const stockItemIds = [...new Set((variantsData || []).map(v => v.stock_item_id).filter(Boolean))];
                if (stockItemIds.length > 0) {
                  const { data: itemsData } = await supabase
                    .from('stock_items')
                    .select('id, category_id')
                    .in('id', stockItemIds);

                  const categoryIds = [...new Set((itemsData || []).map(i => i.category_id).filter(Boolean))];
                  if (categoryIds.length > 0) {
                    const { data: catsData } = await supabase
                      .from('stock_categories')
                      .select('id, name')
                      .in('id', categoryIds);

                    const categoriesMap = new Map((catsData || []).map(c => [c.id, c]));
                    stockItemsMap = new Map((itemsData || []).map(i => [i.id, categoriesMap.get(i.category_id)?.name || 'Uncategorised']));
                  }
                }

                const variantsMap = new Map((variantsData || []).map(v => [v.id, stockItemsMap.get(v.stock_item_id) || 'Uncategorised']));

                const catMap = new Map<string, number>();
                deliveryLinesData
                  .filter(line => validDeliveryIds.has(line.delivery_id))
                  .forEach((line: any) => {
                    const categoryName = variantsMap.get(line.product_variant_id) || 'Uncategorised';
                    const total = line.line_total || 0;
                    catMap.set(categoryName, (catMap.get(categoryName) || 0) + total);
                  });

                categoryBreakdown = Array.from(catMap.entries())
                  .map(([category_name, total]) => ({ category_name, total }))
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 6);
              }
            }
          }
        }
      } catch (error) {
        console.log('Category spend query failed, using empty data:', error);
      }

      // Get supplier spend breakdown
      // Try view first, then fallback to direct query
      let supplierBreakdown: SupplierSpend[] = [];
      try {
        // Try view first
        let supSpendQuery = supabase
          .from('v_supplier_spend')
          .select('supplier_name, total')
          .eq('company_id', companyId)
          .gte('week', startDate.toISOString().split('T')[0]);

        if (siteId) {
          supSpendQuery = supSpendQuery.eq('site_id', siteId);
        }

        const { data: supData, error: supError } = await supSpendQuery;

        if (!supError && supData) {
          // Aggregate by supplier
          const supMap = new Map<string, number>();
          supData.forEach((item: any) => {
            const name = item.supplier_name || 'Unknown';
            supMap.set(name, (supMap.get(name) || 0) + (item.total || 0));
          });
          supplierBreakdown = Array.from(supMap.entries())
            .map(([supplier_name, total]) => ({ supplier_name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 6);
        } else {
          // Fallback to direct query (views don't support foreign key relationships)
          let supplierQuery = supabase
            .from('deliveries')
            .select('total, site_id, supplier_id')
            .eq('company_id', companyId)
            .eq('status', 'confirmed')
            .gte('delivery_date', startDate.toISOString().split('T')[0]);

          // Only filter by site_id if it's a valid UUID (not "all")
          if (siteId && siteId !== 'all') {
            supplierQuery = supplierQuery.eq('site_id', siteId);
          }

          const { data: supplierData } = await supplierQuery;

          if (supplierData && supplierData.length > 0) {
            // Fetch suppliers
            const supplierIds = [...new Set(supplierData.map(d => d.supplier_id).filter(Boolean))];
            let suppliersMap = new Map();
            if (supplierIds.length > 0) {
              const { data: suppliersData } = await supabase
                .from('suppliers')
                .select('id, name')
                .in('id', supplierIds);

              suppliersMap = new Map((suppliersData || []).map(s => [s.id, s.name]));
            }

            const supMap = new Map<string, number>();
            supplierData.forEach((delivery: any) => {
              const supplierName = suppliersMap.get(delivery.supplier_id) || 'Unknown';
              const total = delivery.total || 0;
              supMap.set(supplierName, (supMap.get(supplierName) || 0) + total);
            });

            supplierBreakdown = Array.from(supMap.entries())
              .map(([supplier_name, total]) => ({ supplier_name, total }))
              .sort((a, b) => b.total - a.total)
              .slice(0, 6);
          }
        }
      } catch (error) {
        console.log('Supplier spend query failed, using empty data:', error);
      }

      // Update state
      setMetrics({
        stockValue: totalStockValue,
        stockValueChange: 0, // Would need historical data
        monthlySpend: currentSpend,
        spendChange: spendChange,
        varianceValue: 0, // From stock counts - would need to calculate
        varianceChange: 0,
        wastageValue: totalWastage,
        wastageChange: 0
      });

      setCategorySpend(categoryBreakdown);
      setSupplierSpend(supplierBreakdown);

    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Failed to load report data');
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const quickReports = [
    {
      title: 'Stock Valuation',
      description: 'Current stock value by category and storage area',
      icon: Package,
      href: '/dashboard/reports/stockly/stock-value',
      color: 'text-blue-400'
    },
    {
      title: 'Supplier Spend',
      description: 'Spend analysis by supplier with trends',
      icon: Truck,
      href: '/dashboard/reports/stockly/supplier-spend',
      color: 'text-green-400'
    },
    {
      title: 'Variance Analysis',
      description: 'Stock count variances and shrinkage',
      icon: AlertTriangle,
      href: '/dashboard/reports/stockly/variance',
      color: 'text-orange-400'
    },
    {
      title: 'Wastage Report',
      description: 'Wastage by reason and category',
      icon: TrendingDown,
      href: '/dashboard/reports/stockly/wastage',
      color: 'text-red-400'
    },
    {
      title: 'Gross Profit',
      description: 'Revenue vs COGS analysis',
      icon: Percent,
      href: '/dashboard/reports/stockly/gp',
      color: 'text-stockly-dark dark:text-stockly'
    },
    {
      title: 'Price Tracking',
      description: 'Item price history and alerts',
      icon: TrendingUp,
      href: '/dashboard/reports/stockly/prices',
      color: 'text-purple-400'
    },
    {
      title: 'Dead Stock',
      description: 'Items with no movement in 30+ days',
      icon: BarChart3,
      href: '/dashboard/reports/stockly/dead-stock',
      color: 'text-yellow-400'
    }
  ];

  const handleExcelExport = async () => {
    try {
      await exportToExcelMultiSheet({
        filename: 'stockly_summary_report',
        sheets: [
          {
            name: 'Spend by Category',
            columns: [
              { header: 'Category', key: 'category_name', width: 25 },
              { header: 'Total', key: 'total', width: 15, format: 'currency' }
            ],
            data: categorySpend
          },
          {
            name: 'Spend by Supplier',
            columns: [
              { header: 'Supplier', key: 'supplier_name', width: 25 },
              { header: 'Total', key: 'total', width: 15, format: 'currency' }
            ],
            data: supplierSpend
          }
        ]
      });
      toast.success('Excel export completed');
    } catch (error) {
      console.error('Excel export failed:', error);
      toast.error('Failed to export Excel file');
    }
  };

  const handlePdfExport = () => {
    try {
      exportToPdf({
        filename: 'stockly_summary_report',
        title: 'Stockly Summary Report',
        summary: [
          { label: 'Stock Value', value: formatCurrency(metrics.stockValue) },
          { label: `${dateRange === 'week' ? 'Weekly' : dateRange === 'quarter' ? 'Quarterly' : 'Monthly'} Spend`, value: formatCurrency(metrics.monthlySpend) },
          { label: 'Wastage', value: formatCurrency(metrics.wastageValue) }
        ],
        columns: [
          { header: 'Category', key: 'category_name', width: 60 },
          { header: 'Spend', key: 'total', width: 40, format: 'currency', align: 'right' }
        ],
        data: categorySpend
      });
      toast.success('PDF export completed');
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to export PDF file');
    }
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
            href="/dashboard/stockly"
 className="p-2 rounded-lg bg-theme-button hover:bg-theme-button-hover text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">Reports</h1>
            <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm mt-1">Stock analytics and insights</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
 <div className="flex bg-theme-button rounded-lg p-1">
            {(['week', 'month', 'quarter'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  dateRange === range
                    ? 'bg-stockly-dark/20 dark:bg-stockly/20 text-stockly-dark dark:text-stockly'
                    : 'text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))]'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
 className="p-2 rounded-lg bg-theme-button hover:bg-theme-button-hover text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stock Value */}
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Package className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            {metrics.stockValueChange !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${
                metrics.stockValueChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {metrics.stockValueChange > 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {Math.abs(metrics.stockValueChange).toFixed(1)}%
              </div>
            )}
          </div>
          <p className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{formatCurrency(metrics.stockValue)}</p>
          <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mt-1">Stock Value</p>
        </div>

        {/* Monthly Spend */}
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-500 dark:text-green-400" />
            </div>
            {metrics.spendChange !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${
                metrics.spendChange > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {metrics.spendChange > 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {Math.abs(metrics.spendChange).toFixed(1)}%
              </div>
            )}
          </div>
          <p className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{formatCurrency(metrics.monthlySpend)}</p>
          <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mt-1">{dateRange === 'week' ? 'Weekly' : dateRange === 'quarter' ? 'Quarterly' : 'Monthly'} Spend</p>
        </div>

        {/* Variance */}
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${metrics.varianceValue < 0 ? 'text-red-600 dark:text-red-400' : 'text-[rgb(var(--text-primary))] dark:text-white'}`}>
            {formatCurrency(metrics.varianceValue)}
          </p>
          <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mt-1">Stock Variance</p>
        </div>

        {/* Wastage */}
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(metrics.wastageValue)}</p>
          <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mt-1">Wastage</p>
        </div>
      </div>

      {/* Quick Reports Grid */}
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white mb-4">Quick Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickReports.map((report) => (
            <Link
              key={report.title}
              href={report.href}
 className="flex items-center gap-4 p-4 bg-theme-button border border-theme rounded-lg hover:bg-theme-button-hover hover:border-theme dark:hover:border-white/[0.1] transition-colors group"
            >
 <div className={`p-3 rounded-lg bg-theme-button`}>
                <report.icon className={`w-5 h-5 ${report.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[rgb(var(--text-primary))] dark:text-white group-hover:text-stockly-dark dark:group-hover:text-stockly transition-colors">
                  {report.title}
                </h3>
                <p className="text-sm text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary truncate">{report.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[rgb(var(--text-tertiary))] dark:text-theme-disabled group-hover:text-[rgb(var(--text-secondary))] dark:group-hover:text-theme-tertiary transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by Category */}
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white">Spend by Category</h2>
            <PieChart className="w-5 h-5 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary" />
          </div>

          {categorySpend.length === 0 ? (
            <div className="text-center py-8 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No spend data for this period</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categorySpend.map((cat, index) => {
                const maxValue = categorySpend[0]?.total || 1;
                const percentage = (cat.total / maxValue) * 100;
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-stockly dark:bg-stockly', 'bg-yellow-500'];

                return (
                  <div key={cat.category_name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[rgb(var(--text-primary))] dark:text-theme-secondary">{cat.category_name}</span>
                      <span className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">{formatCurrency(cat.total)}</span>
                    </div>
 <div className="h-2 bg-theme-button rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[index % colors.length]} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Suppliers */}
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white">Top Suppliers</h2>
            <Users className="w-5 h-5 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary" />
          </div>

          {supplierSpend.length === 0 ? (
            <div className="text-center py-8 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
              <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No supplier data for this period</p>
            </div>
          ) : (
            <div className="space-y-3">
              {supplierSpend.map((sup, index) => {
                const maxValue = supplierSpend[0]?.total || 1;
                const percentage = (sup.total / maxValue) * 100;
                const colors = ['bg-stockly-dark dark:bg-stockly', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'];

                return (
                  <div key={sup.supplier_name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[rgb(var(--text-primary))] dark:text-theme-secondary">{sup.supplier_name}</span>
                      <span className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">{formatCurrency(sup.total)}</span>
                    </div>
 <div className="h-2 bg-theme-button rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[index % colors.length]} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Export Section */}
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white mb-4">Export Reports</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExcelExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 dark:bg-green-500/10 border border-green-500/30 dark:border-green-500/30 rounded-lg text-green-600 dark:text-green-400 hover:bg-module-fg/10 dark:hover:bg-module-fg/10 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export to Excel
          </button>
          <button
            onClick={handlePdfExport}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 dark:bg-red-500/10 border border-red-500/30 dark:border-red-500/30 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/20 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export to PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 dark:bg-blue-500/10 border border-blue-500/30 dark:border-blue-500/30 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-module-fg/10 dark:hover:bg-module-fg/10 transition-colors">
            <Download className="w-4 h-4" />
            Download All Data
          </button>
        </div>
      </div>
    </div>
  );
}
