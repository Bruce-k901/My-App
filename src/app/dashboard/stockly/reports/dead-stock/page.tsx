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
  AlertTriangle,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { exportDeadStockReport } from '@/lib/export-excel';
import { exportDeadStockPdf } from '@/lib/export-pdf';

interface DeadStockItem {
  stock_item_id: string;
  item_name: string;
  category_name: string;
  quantity: number;
  value: number;
  last_movement_at: string | null;
  days_since_movement: number;
}

export default function DeadStockReportPage() {
  const { companyId, siteId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deadStock, setDeadStock] = useState<DeadStockItem[]>([]);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    if (companyId) {
      loadDeadStock();
    }
  }, [companyId, siteId]);

  async function loadDeadStock() {
    if (!companyId) return;
    
    setLoading(true);
    try {
      // Try view first, then fallback to direct query
      let viewQuery = supabase
        .from('v_dead_stock')
        .select('*')
        .eq('company_id', companyId)
        .order('value', { ascending: false });
      
      if (siteId) {
        viewQuery = viewQuery.eq('site_id', siteId);
      }
      
      const { data: viewData, error: viewError } = await viewQuery;
      
      if (!viewError && viewData && viewData.length >= 0) {
        // Use view data
        const items: DeadStockItem[] = viewData.map((item: any) => ({
          stock_item_id: item.stock_item_id || item.id,
          item_name: item.item_name || item.name,
          category_name: item.category_name || 'Uncategorised',
          quantity: item.quantity || 0,
          value: item.value || 0,
          last_movement_at: item.last_movement_at,
          days_since_movement: item.days_since_movement || 0
        }));
        
        setDeadStock(items);
        setTotalValue(items.reduce((sum, item) => sum + (item.value || 0), 0));
        setLoading(false);
        return;
      }
      
      // Fallback to direct query
      // Get stock levels with item details
      let stockQuery = supabase
        .from('stock_levels')
        .select(`
          id,
          stock_item_id,
          quantity,
          value,
          updated_at,
          stock_items!inner (
            id,
            name,
            category_id,
            stock_categories (
              id,
              name
            )
          )
        `)
        .eq('company_id', companyId)
        .gt('quantity', 0);
      
      if (siteId) {
        stockQuery = stockQuery.eq('site_id', siteId);
      }
      
      const { data: stockLevels, error: stockError } = await stockQuery;
      
      if (stockError) {
        const errorDetails: any = {
          query: 'stock_levels',
          companyId: companyId,
          siteId: siteId,
          message: stockError?.message || 'No message',
          code: stockError?.code || 'NO_CODE',
          details: stockError?.details || 'No details',
          hint: stockError?.hint || 'No hint',
        };
        
        try {
          errorDetails.fullError = JSON.stringify(stockError, Object.getOwnPropertyNames(stockError));
        } catch (e) {
          errorDetails.fullError = 'Could not serialize error';
        }
        
        console.error('Error loading stock levels:', errorDetails);
        toast.error(stockError?.message || 'Failed to load stock data');
        return;
      }

      if (!stockLevels || stockLevels.length === 0) {
        setDeadStock([]);
        setTotalValue(0);
        setLoading(false);
        return;
      }

      // Get last delivery dates for each stock item
      const stockItemIds = [...new Set(stockLevels.map(sl => sl.stock_item_id))];
      
      const { data: deliveryLines } = await supabase
        .from('delivery_lines')
        .select(`
          product_variants!inner(
            stock_item_id
          ),
          deliveries!inner(
            delivery_date,
            company_id,
            status
          )
        `)
        .in('product_variants.stock_item_id', stockItemIds)
        .eq('deliveries.company_id', companyId)
        .eq('deliveries.status', 'confirmed')
        .order('deliveries.delivery_date', { ascending: false });

      // Get last wastage dates
      const { data: wasteLines } = await supabase
        .from('waste_log_lines')
        .select(`
          stock_item_id,
          waste_logs!inner(
            waste_date,
            company_id
          )
        `)
        .in('stock_item_id', stockItemIds)
        .eq('waste_logs.company_id', companyId)
        .order('waste_logs.waste_date', { ascending: false });

      // Build map of last movement dates per stock item
      const lastMovementMap = new Map<string, Date>();
      const now = new Date();

      // Process delivery dates
      deliveryLines?.forEach((line: any) => {
        const stockItemId = line.product_variants?.stock_item_id;
        const deliveryDate = line.deliveries?.delivery_date;
        if (stockItemId && deliveryDate) {
          const date = new Date(deliveryDate);
          const existing = lastMovementMap.get(stockItemId);
          if (!existing || date > existing) {
            lastMovementMap.set(stockItemId, date);
          }
        }
      });

      // Process wastage dates
      wasteLines?.forEach((line: any) => {
        const stockItemId = line.stock_item_id;
        const wasteDate = line.waste_logs?.waste_date;
        if (stockItemId && wasteDate) {
          const date = new Date(wasteDate);
          const existing = lastMovementMap.get(stockItemId);
          if (!existing || date > existing) {
            lastMovementMap.set(stockItemId, date);
          }
        }
      });

      // Process stock_levels updated_at as fallback
      stockLevels.forEach((sl: any) => {
        const stockItemId = sl.stock_item_id;
        const updatedAt = sl.updated_at;
        if (stockItemId && updatedAt) {
          const date = new Date(updatedAt);
          const existing = lastMovementMap.get(stockItemId);
          if (!existing || date > existing) {
            lastMovementMap.set(stockItemId, date);
          }
        }
      });

      // Calculate dead stock (30+ days since last movement)
      const deadStockItems: DeadStockItem[] = [];
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      stockLevels.forEach((sl: any) => {
        const stockItem = sl.stock_items as any;
        const category = stockItem?.stock_categories;
        const lastMovement = lastMovementMap.get(sl.stock_item_id);
        
        // If no movement found, use updated_at or consider it dead
        const movementDate = lastMovement || (sl.updated_at ? new Date(sl.updated_at) : null);
        
        if (!movementDate || movementDate < thirtyDaysAgo) {
          const daysSince = movementDate 
            ? Math.floor((now.getTime() - movementDate.getTime()) / (24 * 60 * 60 * 1000))
            : 999; // Very old if no date found
          
          deadStockItems.push({
            stock_item_id: sl.stock_item_id,
            item_name: stockItem?.name || 'Unknown',
            category_name: category?.name || 'Uncategorised',
            quantity: sl.quantity || 0,
            value: sl.value || 0,
            last_movement_at: movementDate?.toISOString().split('T')[0] || null,
            days_since_movement: daysSince
          });
        }
      });

      // Sort by value descending
      deadStockItems.sort((a, b) => b.value - a.value);

      setDeadStock(deadStockItems);
      setTotalValue(deadStockItems.reduce((sum, item) => sum + item.value, 0));
      
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
      
      console.error('Error loading dead stock:', errorDetails);
      toast.error(error?.message || 'Failed to load dead stock data');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadDeadStock();
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysColor = (days: number) => {
    if (days >= 90) return 'text-red-400 bg-red-500/10';
    if (days >= 60) return 'text-orange-400 bg-orange-500/10';
    return 'text-yellow-400 bg-yellow-500/10';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#EC4899] animate-spin" />
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
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Dead Stock Report</h1>
            <p className="text-white/60 text-sm mt-1">Items with no movement in 30+ days</p>
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
                await exportDeadStockReport(deadStock.map(item => ({
                  ...item,
                  category_name: item.category_name || 'Uncategorised'
                })));
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
                exportDeadStockPdf(totalValue, deadStock.map(item => ({
                  ...item,
                  category_name: item.category_name || 'Uncategorised'
                })));
                toast.success('PDF export completed');
              } catch (error) {
                console.error('PDF export failed:', error);
                toast.error('Failed to export PDF file');
              }
            }}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors text-sm"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Package className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-white/60 text-sm">Dead Stock Value</span>
          </div>
          <p className="text-3xl font-bold text-yellow-400">{formatCurrency(totalValue)}</p>
        </div>
        
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-white/60 text-sm">Items Affected</span>
          </div>
          <p className="text-3xl font-bold text-white">{deadStock.length}</p>
        </div>
        
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-white/60 text-sm">90+ Days</span>
          </div>
          <p className="text-3xl font-bold text-red-400">
            {deadStock.filter(item => item.days_since_movement >= 90).length}
          </p>
        </div>
      </div>

      {/* Alert Banner */}
      {totalValue > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-400">Capital Tied Up</h3>
            <p className="text-yellow-400/80 text-sm mt-1">
              {formatCurrency(totalValue)} is tied up in slow-moving stock. 
              Consider promotions, menu changes, or supplier returns to free up capital.
            </p>
          </div>
        </div>
      )}

      {/* Dead Stock Table */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Item</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Category</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-white/60">Quantity</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-white/60">Value</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Last Movement</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-white/60">Days Idle</th>
              </tr>
            </thead>
            <tbody>
              {deadStock.map((item) => (
                <tr 
                  key={item.stock_item_id}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">{item.item_name}</span>
                  </td>
                  <td className="px-4 py-3 text-white/70">{item.category_name || 'Uncategorised'}</td>
                  <td className="px-4 py-3 text-right text-white/80">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-yellow-400 font-medium">
                    {formatCurrency(item.value)}
                  </td>
                  <td className="px-4 py-3 text-white/60 text-sm">
                    {formatDate(item.last_movement_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium ${getDaysColor(item.days_since_movement)}`}>
                      {item.days_since_movement} days
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {deadStock.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-green-400/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No dead stock!</h3>
            <p className="text-white/60">All stock items have had movement in the last 30 days.</p>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {deadStock.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recommendations</h2>
          <ul className="space-y-3 text-white/80">
            <li className="flex items-start gap-3">
              <span className="text-[#EC4899]">•</span>
              <span>Review items over 90 days for potential write-off or clearance</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#EC4899]">•</span>
              <span>Consider menu specials to use slow-moving ingredients</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#EC4899]">•</span>
              <span>Contact suppliers about returns or exchanges where applicable</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#EC4899]">•</span>
              <span>Adjust par levels to prevent over-ordering of slow movers</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
