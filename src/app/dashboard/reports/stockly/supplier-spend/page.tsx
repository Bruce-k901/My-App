"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft,
  Truck, 
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronRight
} from '@/components/ui/icons';
import Link from 'next/link';
import { toast } from 'sonner';
import { exportSupplierSpendReport } from '@/lib/export-excel';
import { exportSupplierSpendPdf } from '@/lib/export-pdf';

interface SupplierSpendData {
  supplier_id: string;
  supplier_name: string;
  delivery_count: number;
  subtotal: number;
  vat_total: number;
  total: number;
  avg_delivery_value: number;
}

interface MonthlyTrend {
  month: string;
  total: number;
}

export default function SupplierSpendReportPage() {
  const { companyId, siteId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year'>('month');
  
  const [totalSpend, setTotalSpend] = useState(0);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [supplierData, setSupplierData] = useState<SupplierSpendData[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

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
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default: // month
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get supplier spend from view (try view first, then fallback)
      let spendQuery = supabase
        .from('v_supplier_spend')
        .select('*')
        .eq('company_id', companyId)
        .gte('week', startDate.toISOString().split('T')[0]);
      
      // Only filter by site_id if it's a valid UUID (not "all")
      if (siteId && siteId !== 'all') {
        spendQuery = spendQuery.eq('site_id', siteId);
      }
      
      const { data: spendData, error: viewError } = await spendQuery;
      
      if (viewError || !spendData || spendData.length === 0) {
        // Fallback to direct query
        let query = supabase
          .from('deliveries')
          .select(`
            id,
            supplier_id,
            delivery_date,
            subtotal,
            tax,
            total,
            suppliers(id, name)
          `)
          .eq('company_id', companyId)
          .eq('status', 'confirmed')
          .gte('delivery_date', startDate.toISOString().split('T')[0]);
        
        // Only filter by site_id if it's a valid UUID (not "all")
        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }
        
        const { data: deliveriesData, error } = await query;
        
        if (error) {
          const errorDetails: any = {
            query: 'deliveries',
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
          
          console.error('Error loading supplier spend:', errorDetails);
          toast.error(error?.message || 'Failed to load supplier spend data');
          return;
        }

        if (!deliveriesData || deliveriesData.length === 0) {
          setTotalSpend(0);
          setTotalDeliveries(0);
          setSupplierData([]);
          setMonthlyTrend([]);
          setLoading(false);
          return;
        }

        // Aggregate by supplier
        const supplierMap = new Map<string, SupplierSpendData>();
        let grandTotal = 0;
        let grandDeliveries = 0;
        
        deliveriesData.forEach((delivery: any) => {
          const supplier = delivery.suppliers;
          const supplierId = delivery.supplier_id || 'unknown';
          const supplierName = supplier?.name || 'Unknown Supplier';
          
          const existing = supplierMap.get(supplierId) || {
            supplier_id: supplierId,
            supplier_name: supplierName,
            delivery_count: 0,
            subtotal: 0,
            vat_total: 0,
            total: 0,
            avg_delivery_value: 0
          };
          
          existing.delivery_count += 1;
          existing.subtotal += delivery.subtotal || 0;
          existing.vat_total += delivery.tax || 0;
          existing.total += delivery.total || 0;
          
          grandTotal += delivery.total || 0;
          grandDeliveries += 1;
          
          supplierMap.set(supplierId, existing);
        });

        // Calculate averages
        const suppliers = Array.from(supplierMap.values()).map(s => ({
          ...s,
          avg_delivery_value: s.delivery_count > 0 ? s.total / s.delivery_count : 0
        })).sort((a, b) => b.total - a.total);

        setSupplierData(suppliers);
        setTotalSpend(grandTotal);
        setTotalDeliveries(grandDeliveries);

        // Get monthly trend
        const monthMap = new Map<string, number>();
        deliveriesData.forEach((delivery: any) => {
          if (delivery.delivery_date) {
            const monthKey = delivery.delivery_date.slice(0, 7); // YYYY-MM format
            monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + (delivery.total || 0));
          }
        });
        
        const trend = Array.from(monthMap.entries())
          .map(([month, total]) => ({ month, total }))
          .sort((a, b) => a.month.localeCompare(b.month));
        
        setMonthlyTrend(trend);
      } else {
        // Use view data
        // Aggregate by supplier
        const supplierMap = new Map<string, SupplierSpendData>();
        let grandTotal = 0;
        let grandDeliveries = 0;
        
        spendData.forEach((row: any) => {
          const existing = supplierMap.get(row.supplier_id) || {
            supplier_id: row.supplier_id,
            supplier_name: row.supplier_name,
            delivery_count: 0,
            subtotal: 0,
            vat_total: 0,
            total: 0,
            avg_delivery_value: 0
          };
          
          existing.delivery_count += row.delivery_count || 0;
          existing.subtotal += row.subtotal || 0;
          existing.vat_total += row.vat_total || 0;
          existing.total += row.total || 0;
          
          grandTotal += row.total || 0;
          grandDeliveries += row.delivery_count || 0;
          
          supplierMap.set(row.supplier_id, existing);
        });

        // Calculate averages
        const suppliers = Array.from(supplierMap.values()).map(s => ({
          ...s,
          avg_delivery_value: s.delivery_count > 0 ? s.total / s.delivery_count : 0
        })).sort((a, b) => b.total - a.total);

        setSupplierData(suppliers);
        setTotalSpend(grandTotal);
        setTotalDeliveries(grandDeliveries);

        // Get monthly trend
        const monthMap = new Map<string, number>();
        spendData.forEach((row: any) => {
          if (row.month) {
            const monthKey = new Date(row.month).toISOString().slice(0, 7);
            monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + (row.total || 0));
          }
        });
        
        const trend = Array.from(monthMap.entries())
          .map(([month, total]) => ({ month, total }))
          .sort((a, b) => a.month.localeCompare(b.month));
        
        setMonthlyTrend(trend);
      }
      
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

  const formatMonth = (monthStr: string) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-stockly-dark dark:text-stockly animate-spin" />
      </div>
    );
  }

  const maxMonthlySpend = Math.max(...monthlyTrend.map(m => m.total), 1);

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
            <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">Supplier Spend Report</h1>
            <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm mt-1">Spend analysis by supplier with trends</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
 <div className="flex bg-theme-button rounded-lg p-1">
            {(['month', 'quarter', 'year'] as const).map((range) => (
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
                await exportSupplierSpendReport(supplierData);
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
                exportSupplierSpendPdf(totalSpend, totalDeliveries, supplierData);
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
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Truck className="w-5 h-5 text-green-500 dark:text-green-400" />
            </div>
            <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm">Total Spend</span>
          </div>
          <p className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{formatCurrency(totalSpend)}</p>
        </div>
        
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm">Deliveries</span>
          </div>
          <p className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{totalDeliveries}</p>
        </div>
        
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            </div>
            <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm">Avg Per Delivery</span>
          </div>
          <p className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white">
            {formatCurrency(totalDeliveries > 0 ? totalSpend / totalDeliveries : 0)}
          </p>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      {monthlyTrend.length > 0 && (
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white mb-4">Monthly Trend</h2>
          <div className="flex items-end gap-2 h-40">
            {monthlyTrend.map((month) => {
              const heightPercent = (month.total / maxMonthlySpend) * 100;
              return (
                <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center justify-end h-32">
                    <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-1">
                      {formatCurrency(month.total)}
                    </span>
                    <div 
                      className="w-full bg-gradient-to-t from-stockly-dark/80 to-stockly-dark/60 dark:from-stockly/80 dark:to-stockly/60 rounded-t-md transition-all duration-500"
                      style={{ height: `${Math.max(heightPercent, 5)}%` }}
                    />
                  </div>
                  <span className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">{formatMonth(month.month)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Supplier Table */}
      {supplierData.length > 0 ? (
 <div className="bg-theme-surface-elevated border border-theme rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-lg font-semibold text-theme-primary">Spend by Supplier</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-sm font-medium text-theme-tertiary">Supplier</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-theme-tertiary">Deliveries</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-theme-tertiary">Net</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-theme-tertiary">VAT</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-theme-tertiary">Gross</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-theme-tertiary">Avg/Delivery</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-theme-tertiary">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {supplierData.map((supplier) => {
                  const percentage = totalSpend > 0 ? (supplier.total / totalSpend) * 100 : 0;
                  
                  return (
                    <tr 
                      key={supplier.supplier_id}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <span className="text-theme-primary font-medium">{supplier.supplier_name}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-theme-secondary">
                        {supplier.delivery_count}
                      </td>
                      <td className="px-4 py-3 text-right text-theme-secondary">
                        {formatCurrency(supplier.subtotal)}
                      </td>
                      <td className="px-4 py-3 text-right text-theme-tertiary">
                        {formatCurrency(supplier.vat_total)}
                      </td>
                      <td className="px-4 py-3 text-right text-theme-primary font-medium">
                        {formatCurrency(supplier.total)}
                      </td>
                      <td className="px-4 py-3 text-right text-theme-secondary">
                        {formatCurrency(supplier.avg_delivery_value)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-theme-tertiary text-sm w-12">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-white/[0.03]">
                  <td className="px-4 py-3 font-semibold text-theme-primary">Total</td>
                  <td className="px-4 py-3 text-right font-semibold text-theme-primary">{totalDeliveries}</td>
                  <td className="px-4 py-3 text-right font-semibold text-theme-primary">
                    {formatCurrency(supplierData.reduce((sum, s) => sum + s.subtotal, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-theme-tertiary">
                    {formatCurrency(supplierData.reduce((sum, s) => sum + s.vat_total, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-theme-primary">
                    {formatCurrency(totalSpend)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-theme-primary">
                    {formatCurrency(totalDeliveries > 0 ? totalSpend / totalDeliveries : 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-theme-primary">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* No Data State */
 <div className="bg-theme-surface-elevated border border-theme rounded-xl p-12 text-center">
              <Truck className="w-12 h-12 text-[rgb(var(--text-tertiary))] dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[rgb(var(--text-primary))] dark:text-white mb-2">No spend data</h3>
          <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">No confirmed deliveries found for this period</p>
        </div>
      )}
    </div>
  );
}
