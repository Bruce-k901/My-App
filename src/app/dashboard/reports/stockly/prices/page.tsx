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
  AlertTriangle
} from '@/components/ui/icons';
import Link from 'next/link';
import { toast } from 'sonner';
import { exportPriceHistoryReport } from '@/lib/export-excel';
import { exportPriceChangesPdf } from '@/lib/export-pdf';

interface PriceChange {
  stock_item_id: string;
  item_name: string;
  supplier_name: string;
  delivery_date: string;
  unit_price: number;
  previous_price: number | null;
  price_change_pct: number;
}

export default function PriceTrackingReportPage() {
  const { companyId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
  const [filter, setFilter] = useState<'all' | 'increases' | 'decreases'>('all');

  useEffect(() => {
    if (companyId) {
      loadPriceData();
    }
  }, [companyId]);

  async function loadPriceData() {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Try view first, then fallback
      let query = supabase
        .from('v_price_history')
        .select('*')
        .eq('company_id', companyId)
        .gte('delivery_date', thirtyDaysAgo.toISOString().split('T')[0])
        .not('previous_price', 'is', null)
        .order('delivery_date', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        const errorDetails: any = {
          query: 'v_price_history',
          companyId: companyId,
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
        
        console.error('Error loading price data:', errorDetails);
        // Fallback: query deliveries directly and calculate price changes
        // This would require joining delivery_lines with product_variants and stock_items
        // For now, just set empty array
        setPriceChanges([]);
        toast.error(error?.message || 'Failed to load price data');
        return;
      }

      setPriceChanges(data || []);
      
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
      
      console.error('Error loading price data:', errorDetails);
      toast.error(error?.message || 'Failed to load price data');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadPriceData();
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
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredChanges = priceChanges.filter(item => {
    if (filter === 'increases') return item.price_change_pct > 0;
    if (filter === 'decreases') return item.price_change_pct < 0;
    return true;
  });

  const significantIncreases = priceChanges.filter(item => item.price_change_pct > 10);

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
            className="p-2 rounded-lg bg-theme-button dark:bg-white/5 hover:bg-theme-button-hover dark:hover:bg-white/10 text-[rgb(var(--text-secondary))] dark:text-white/60 hover:text-[rgb(var(--text-primary))] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">Price Tracking</h1>
            <p className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm mt-1">Item price history and change alerts</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={async () => {
              try {
                await exportPriceHistoryReport(filteredChanges);
                toast.success('Excel export completed');
              } catch (error) {
                console.error('Excel export failed:', error);
                toast.error('Failed to export Excel file');
              }
            }}
            className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button 
            onClick={() => {
              try {
                exportPriceChangesPdf(filteredChanges);
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

      {/* Alert Banner */}
      {significantIncreases.length > 0 && (
        <div className="bg-red-500/10 dark:bg-red-500/10 border border-red-500/30 dark:border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-600 dark:text-red-400">Price Increase Alerts</h3>
            <p className="text-red-600/80 dark:text-red-400/80 text-sm mt-1">
              {significantIncreases.length} item(s) have increased more than 10% in the last 30 days
            </p>
          </div>
        </div>
      )}

      {/* Filter Toggle */}
      <div className="flex bg-white/5 rounded-lg p-1 w-fit">
        {(['all', 'increases', 'decreases'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              filter === f
                ? 'bg-emerald-500/20 dark:bg-[#D37E91]/20 text-emerald-600 dark:text-[#D37E91]'
                : 'text-[rgb(var(--text-secondary))] dark:text-white/60 hover:text-[rgb(var(--text-primary))] dark:hover:text-white'
            }`}
          >
            {f === 'increases' && <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />}
            {f === 'decreases' && <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />}
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Price Changes Table */}
      <div className="bg-theme-surface-elevated dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-theme dark:border-white/[0.06]">
                <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Item</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Supplier</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Previous</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">New Price</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Change</th>
              </tr>
            </thead>
            <tbody>
              {filteredChanges.slice(0, 50).map((item, index) => (
                <tr 
                  key={`${item.stock_item_id}-${item.delivery_date}-${index}`}
                  className="border-b border-theme dark:border-white/[0.03] hover:bg-theme-button-hover dark:hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm">
                    {formatDate(item.delivery_date)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[rgb(var(--text-primary))] dark:text-white font-medium">{item.item_name}</span>
                  </td>
                  <td className="px-4 py-3 text-[rgb(var(--text-primary))] dark:text-white/70">{item.supplier_name}</td>
                  <td className="px-4 py-3 text-right text-[rgb(var(--text-secondary))] dark:text-white/60">
                    {item.previous_price ? formatCurrency(item.previous_price) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-[rgb(var(--text-primary))] dark:text-white font-medium">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium ${
                      item.price_change_pct > 0 
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400' 
                        : item.price_change_pct < 0 
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                    }`}>
                      {item.price_change_pct > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : item.price_change_pct < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : null}
                      {item.price_change_pct > 0 ? '+' : ''}{item.price_change_pct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredChanges.length === 0 && (
          <div className="p-12 text-center">
            <TrendingUp className="w-12 h-12 text-[rgb(var(--text-tertiary))] dark:text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[rgb(var(--text-primary))] dark:text-white mb-2">No price changes</h3>
            <p className="text-[rgb(var(--text-secondary))] dark:text-white/60">No price changes recorded in the last 30 days</p>
          </div>
        )}
      </div>
    </div>
  );
}
