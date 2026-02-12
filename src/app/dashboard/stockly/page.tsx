"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { 
  Truck,
  Trash2,
  User,
  ClipboardList,
  Search,
  AlertTriangle,
  TrendingDown,
  Package,
  DollarSign,
  BarChart3,
  ChefHat,
  Settings,
  Loader2,
  ArrowRight,
  Calendar,
  Clock,
  Warehouse,
  ShoppingCart,
  FileText
} from '@/components/ui/icons';
import Link from 'next/link';

// Panel Components
import SlideOutPanel from '@/components/stockly/SlideOutPanel';
import QuickDeliveryPanel from '@/components/stockly/panels/QuickDeliveryPanel';
import QuickWastePanel from '@/components/stockly/panels/QuickWastePanel';
import QuickStaffPurchasePanel from '@/components/stockly/panels/QuickStaffPurchasePanel';
import QuickStockCountPanel from '@/components/stockly/panels/QuickStockCountPanel';

interface Alert {
  id: string;
  type: 'low_stock' | 'expiring' | 'delivery' | 'variance';
  title: string;
  description: string;
  severity: 'warning' | 'danger' | 'info';
  link?: string;
}

interface DayStats {
  stockValue: number;
  deliveriesToday: number;
  wastageToday: number;
  gpPercent: number | null;
}

type PanelType = 'delivery' | 'waste' | 'staff' | 'count' | null;

export default function StocklyDashboard() {
  const { companyId, siteId } = useAppContext();
  const [loading, setLoading] = useState(true);
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<DayStats>({
    stockValue: 0,
    deliveriesToday: 0,
    wastageToday: 0,
    gpPercent: null
  });
  
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadDashboardData();
    }
  }, [companyId]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      await Promise.all([
        loadAlerts(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAlerts() {
    const alertList: Alert[] = [];
    
    // Check low stock items
    const { data: lowStock } = await supabase
      .from('stock_items')
      .select(`
        id, name, reorder_point,
        stock_levels(quantity)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .not('reorder_point', 'is', null);
    
    (lowStock || []).forEach(item => {
      const qty = item.stock_levels?.[0]?.quantity || 0;
      if (qty <= (item.reorder_point || 0)) {
        alertList.push({
          id: `low-${item.id}`,
          type: 'low_stock',
          title: `${item.name} is low`,
          description: `Only ${qty} remaining (reorder at ${item.reorder_point})`,
          severity: qty === 0 ? 'danger' : 'warning',
          link: `/dashboard/stockly/stock-items/${item.id}`
        });
      }
    });
    
    // Check for pending purchase orders
    const { data: pendingOrders, count: ordersCount } = await supabase
      .from('purchase_orders')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['draft', 'pending', 'ordered']);
    
    if (ordersCount && ordersCount > 0) {
      alertList.push({
        id: 'pending-orders',
        type: 'delivery',
        title: `${ordersCount} active order${ordersCount > 1 ? 's' : ''}`,
        description: 'Purchase orders in progress',
        severity: 'info',
        link: '/dashboard/stockly/orders'
      });
    }
    
    // Check for expected deliveries (would need a deliveries expected table)
    // For now, just add a placeholder if we have pending deliveries
    const { data: pendingDeliveries, count } = await supabase
      .from('deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'pending');
    
    if (count && count > 0) {
      alertList.push({
        id: 'pending-deliveries',
        type: 'delivery',
        title: `${count} pending delivery${count > 1 ? 's' : ''}`,
        description: 'Awaiting confirmation',
        severity: 'info',
        link: '/dashboard/stockly/deliveries'
      });
    }
    
    setAlerts(alertList.slice(0, 5)); // Limit to 5 alerts
  }

  async function loadStats() {
    const today = new Date().toISOString().split('T')[0];
    
    // Stock value - query stock_items first, then get stock_levels and product_variants separately
    const { data: stockItems } = await supabase
      .from('stock_items')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_active', true);
    
    if (stockItems && stockItems.length > 0) {
      const itemIds = stockItems.map(item => item.id);
      
      // Get stock levels
      const { data: stockData } = await supabase
        .from('stock_levels')
        .select('quantity, stock_item_id')
        .in('stock_item_id', itemIds);
      
      // Get product variants with prices (preferred variant or first one)
      // Handle errors gracefully if product_variants table doesn't exist or isn't accessible
      let productVariants: any[] = [];
      try {
        // Use unit_cost or unit_price (actual columns in the table)
        const { data, error } = await supabase
          .from('product_variants')
          .select('stock_item_id, unit_cost, unit_price, is_preferred')
          .in('stock_item_id', itemIds)
          .eq('is_active', true);
        
        if (error) {
          // Log error for debugging (only in development)
          if (process.env.NODE_ENV === 'development') {
            console.warn('product_variants query error:', {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
          }
          productVariants = [];
        } else if (data) {
          // Map unit_cost/unit_price to current_price for compatibility
          productVariants = data.map((v: any) => ({
            ...v,
            current_price: v.unit_cost || v.unit_price || 0
          }));
        }
      } catch (error: any) {
        // Log error for debugging (only in development)
        if (process.env.NODE_ENV === 'development') {
          console.warn('product_variants query exception:', error);
        }
        productVariants = [];
      }
      
      let stockValue = 0;
      (stockData || []).forEach(sl => {
        // Find preferred variant, or first variant for this stock item
        const variants = (productVariants || []).filter(pv => pv.stock_item_id === sl.stock_item_id);
        const preferredVariant = variants.find(pv => pv.is_preferred) || variants[0];
        const price = preferredVariant?.current_price || 0;
        stockValue += (sl.quantity || 0) * price;
      });
      
      setStats(prev => ({ ...prev, stockValue }));
    }
    
    // Today's deliveries - use 'total' column, not 'total_amount'
    const { data: deliveryData } = await supabase
      .from('deliveries')
      .select('total')
      .eq('company_id', companyId)
      .eq('delivery_date', today);
    
    const deliveriesToday = (deliveryData || []).reduce((sum, d) => sum + (Number(d.total) || 0), 0);
    
    // Today's wastage
    const { data: wasteData } = await supabase
      .from('waste_logs')
      .select('total_cost')
      .eq('company_id', companyId)
      .eq('waste_date', today);
    
    const wastageToday = (wasteData || []).reduce((sum, w) => sum + (Number(w.total_cost) || 0), 0);
    
    // Latest GP (if available) - use maybeSingle to avoid error if no data
    const { data: gpData } = await supabase
      .from('daily_sales_summary')
      .select('gp_percentage')
      .eq('company_id', companyId)
      .order('summary_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    setStats(prev => ({
      ...prev,
      deliveriesToday,
      wastageToday,
      gpPercent: gpData?.gp_percentage || null
    }));
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      // Query stock_items separately (can't join through views)
      const { data: items } = await supabase
        .from('stock_items')
        .select(`
          id, name, stock_unit,
          stock_levels(quantity)
        `)
        .eq('company_id', companyId)
        .ilike('name', `%${query}%`)
        .limit(10);
      
      if (items && items.length > 0) {
        const itemIds = items.map(item => item.id);
        
        // Query product_variants separately (handle errors gracefully)
        let variants: any[] = [];
        try {
          // Use unit_cost or unit_price (actual columns in the table)
          const { data: variantData, error: variantError } = await supabase
            .from('product_variants')
            .select('stock_item_id, unit_cost, unit_price, is_preferred')
            .in('stock_item_id', itemIds)
            .eq('is_active', true);
          
          if (variantError) {
            // Log error for debugging (only in development)
            if (process.env.NODE_ENV === 'development') {
              console.warn('product_variants search query error:', {
                message: variantError.message,
                code: variantError.code,
                details: variantError.details,
                hint: variantError.hint
              });
            }
            variants = [];
          } else if (variantData) {
            // Map unit_cost/unit_price to current_price for compatibility
            variants = variantData.map((v: any) => ({
              ...v,
              current_price: v.unit_cost || v.unit_price || 0
            }));
          }
        } catch (error: any) {
          // Log error for debugging (only in development)
          if (process.env.NODE_ENV === 'development') {
            console.warn('product_variants search query exception:', error);
          }
          variants = [];
        }
        
        // Join variants to items manually
        const results = items.map(item => {
          const itemVariants = (variants || []).filter(pv => pv.stock_item_id === item.id);
          const preferredVariant = itemVariants.find(pv => pv.is_preferred) || itemVariants[0];
          return {
            ...item,
            product_variants: preferredVariant ? [{ unit_price: preferredVariant.current_price }] : []
          };
        });
        
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handlePanelComplete() {
    setActivePanel(null);
    loadDashboardData(); // Refresh data
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const quickActions = [
    { id: 'order', title: 'New Order', description: 'Create purchase order', icon: FileText, href: '/dashboard/stockly/orders/new' },
    { id: 'delivery', title: 'Receive Delivery', description: 'Log incoming stock', icon: Truck },
    { id: 'waste', title: 'Record Waste', description: 'Log wastage or loss', icon: Trash2 },
    { id: 'staff', title: 'Staff Purchase', description: 'Sell to team member', icon: User },
    { id: 'count', title: 'Quick Count', description: 'Spot check items', icon: ClipboardList }
  ];

  const setupLinks = [
    { name: 'Stock Items', href: '/dashboard/stockly/stock-items', icon: Package },
    { name: 'Suppliers', href: '/dashboard/stockly/suppliers', icon: ShoppingCart },
    { name: 'Orders', href: '/dashboard/stockly/orders', icon: FileText },
    { name: 'Deliveries', href: '/dashboard/stockly/deliveries', icon: Truck },
    { name: 'Stock Counts', href: '/dashboard/stockly/stock-counts', icon: ClipboardList },
    { name: 'Recipes', href: '/dashboard/stockly/recipes', icon: ChefHat },
    { name: 'Storage Areas', href: '/dashboard/stockly/storage-areas', icon: Warehouse },
    { name: 'Reports', href: '/dashboard/stockly/reports', icon: BarChart3 },
    { name: 'Settings', href: '/dashboard/stockly/settings', icon: Settings }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-module-fg animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <div className="w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-theme-primary mb-2 flex items-center gap-3">
              <Package className="w-8 h-8 text-module-fg" />
              Stockly
            </h1>
            <p className="text-theme-secondary text-sm flex items-center gap-2 mt-1">
              <Clock className="w-4 h-4" />
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {quickActions.map((action) => {
          const Component = action.href ? Link : 'button';
          const props = action.href 
            ? { href: action.href }
            : { onClick: () => setActivePanel(action.id as PanelType) };
          
          return (
            <Component
              key={action.id}
              {...props}
              className="relative overflow-hidden bg-module-fg/[0.04] border border-module-fg/[0.12] rounded-xl p-5 text-left transition-all hover:bg-module-fg/[0.08] hover:border-module-fg hover:-translate-y-px group"
            >
              <div className="w-10 h-10 rounded-lg bg-module-fg/[0.10] flex items-center justify-center mb-3">
                <action.icon className="w-5 h-5 text-module-fg" />
              </div>
              <h3 className="text-[rgb(var(--text-primary))] font-semibold">{action.title}</h3>
              <p className="text-[rgb(var(--text-tertiary))] text-sm">{action.description}</p>
              <ArrowRight className="absolute bottom-4 right-4 w-5 h-5 text-[rgb(var(--text-tertiary))] group-hover:text-module-fg transition-colors" />
            </Component>
          );
        })}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="bg-module-fg/[0.04] border border-module-fg/[0.12] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-module-fg/[0.12] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-module-fg" />
            <span className="text-sm font-medium text-[rgb(var(--text-primary))]">Alerts</span>
            <span className="text-xs text-[rgb(var(--text-tertiary))]">({alerts.length})</span>
          </div>
          <div className="divide-y divide-module-fg/[0.10]">
            {alerts.map((alert) => (
              <Link
                key={alert.id}
                href={alert.link || '#'}
                className="flex items-center gap-3 px-4 py-3 hover:bg-module-fg/[0.08] transition-colors group"
              >
                <div className={`w-2 h-2 rounded-full ${
                  alert.severity === 'danger' ? 'bg-red-500' :
                  alert.severity === 'warning' ? 'bg-amber-500' :
                  'bg-module-fg'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[rgb(var(--text-primary))] text-sm font-medium">{alert.title}</p>
                  <p className="text-[rgb(var(--text-tertiary))] text-xs truncate">{alert.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[rgb(var(--text-tertiary))] group-hover:text-module-fg transition-colors" />
              </Link>
            ))}
          </div>
          </div>
        )}

        {/* Today's Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/dashboard/stockly/stock-items"
          className="bg-module-fg/[0.04] border border-module-fg/[0.12] rounded-xl p-4 hover:bg-module-fg/[0.08] hover:border-module-fg/[0.18] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-module-fg" />
            <span className="text-[rgb(var(--text-tertiary))] text-xs">Stock Value</span>
          </div>
          <p className="text-xl font-bold text-module-fg">{formatCurrency(stats.stockValue)}</p>
        </Link>

        <Link
          href="/dashboard/stockly/deliveries"
          className="bg-module-fg/[0.04] border border-module-fg/[0.12] rounded-xl p-4 hover:bg-module-fg/[0.08] hover:border-module-fg/[0.18] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-module-fg" />
            <span className="text-[rgb(var(--text-tertiary))] text-xs">Deliveries Today</span>
          </div>
          <p className="text-xl font-bold text-module-fg">{formatCurrency(stats.deliveriesToday)}</p>
        </Link>
        
        <Link
          href="/dashboard/stockly/reports/wastage"
          className="bg-module-fg/[0.04] border border-module-fg/[0.12] rounded-xl p-4 hover:bg-module-fg/[0.08] hover:border-module-fg/[0.18] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-2">
            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-[rgb(var(--text-tertiary))] text-xs">Wastage Today</span>
          </div>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">
            {stats.wastageToday > 0 ? `-${formatCurrency(stats.wastageToday)}` : '£0'}
          </p>
        </Link>

        <Link
          href="/dashboard/stockly/reports/gp"
          className="bg-module-fg/[0.04] border border-module-fg/[0.12] rounded-xl p-4 hover:bg-module-fg/[0.08] hover:border-module-fg/[0.18] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className={`w-4 h-4 ${
              stats.gpPercent && stats.gpPercent >= 70 ? 'text-module-fg' : 'text-amber-600 dark:text-amber-400'
            }`} />
            <span className="text-[rgb(var(--text-tertiary))] text-xs">Latest GP</span>
          </div>
          <p className={`text-xl font-bold ${
            stats.gpPercent && stats.gpPercent >= 70 ? 'text-module-fg' :
            stats.gpPercent ? 'text-amber-600 dark:text-amber-400' : 'text-[rgb(var(--text-tertiary))]'
          }`}>
            {stats.gpPercent ? `${stats.gpPercent}%` : '-'}
          </p>
        </Link>
        </div>

        {/* Quick Search */}
        <div className="bg-module-fg/[0.04] border border-module-fg/[0.12] rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-module-fg" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Quick search stock items..."
            className="w-full pl-10 pr-4 py-3 bg-module-fg/[0.04] border border-module-fg/[0.12] rounded-lg text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] focus:outline-none focus:ring-2 focus:ring-module-fg/[0.25] focus:border-module-fg/[0.25]"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-tertiary animate-spin" />
          )}
        </div>
        
        {searchResults.length > 0 && (
          <div className="mt-3 divide-y divide-gray-200 dark:divide-white/[0.06]">
            {searchResults.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/stockly/stock-items/${item.id}`}
                className="flex items-center justify-between py-2 hover:bg-theme-surface-elevated dark:hover:bg-white/[0.02] px-2 rounded -mx-2"
              >
                <div>
                  <span className="text-theme-primary">{item.name}</span>
                  <span className="text-theme-tertiary text-sm ml-2">
                    {item.stock_levels?.[0]?.quantity || 0} {item.stock_unit}
                  </span>
                </div>
                <span className="text-theme-tertiary text-sm">
                  £{item.product_variants?.[0]?.unit_price?.toFixed(2) || '0.00'}
                </span>
              </Link>
            ))}
          </div>
        )}
        </div>

        {/* Setup Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {setupLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 px-4 py-3 border border-module-fg/[0.12] hover:bg-module-fg/[0.08] hover:border-module-fg/[0.18] rounded-lg transition-colors group"
          >
            <link.icon className="w-5 h-5 text-module-fg transition-colors" />
            <span className="text-[rgb(var(--text-secondary))] group-hover:text-[rgb(var(--text-primary))] text-sm font-medium">{link.name}</span>
            <ArrowRight className="w-4 h-4 text-[rgb(var(--text-tertiary))] group-hover:text-module-fg ml-auto transition-colors" />
          </Link>
        ))}
        </div>

        {/* Slide Out Panels */}
        <SlideOutPanel
          isOpen={activePanel === 'delivery'}
          onClose={() => setActivePanel(null)}
          title="Receive Delivery"
          subtitle="Log incoming stock from supplier"
          width="lg"
        >
          <QuickDeliveryPanel 
            onComplete={handlePanelComplete}
            onCancel={() => setActivePanel(null)}
          />
        </SlideOutPanel>

        <SlideOutPanel
          isOpen={activePanel === 'waste'}
          onClose={() => setActivePanel(null)}
          title="Record Waste"
          subtitle="Log wastage, spoilage, or loss"
          width="lg"
        >
          <QuickWastePanel 
            onComplete={handlePanelComplete}
            onCancel={() => setActivePanel(null)}
          />
        </SlideOutPanel>

        <SlideOutPanel
          isOpen={activePanel === 'staff'}
          onClose={() => setActivePanel(null)}
          title="Staff Purchase"
          subtitle="Sell items to team members"
          width="lg"
        >
          <QuickStaffPurchasePanel 
            onComplete={handlePanelComplete}
            onCancel={() => setActivePanel(null)}
          />
        </SlideOutPanel>

        <SlideOutPanel
          isOpen={activePanel === 'count'}
          onClose={() => setActivePanel(null)}
          title="Quick Stock Count"
          subtitle="Spot check specific items"
          width="lg"
        >
          <QuickStockCountPanel 
            onComplete={handlePanelComplete}
            onCancel={() => setActivePanel(null)}
          />
        </SlideOutPanel>
      </div>
    </div>
  );
}
