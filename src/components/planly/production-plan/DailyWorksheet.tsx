// ============================================================================
// src/components/planly/production-plan/DailyWorksheet.tsx
//
// DAILY PRODUCTION WORKSHEET — Staff-facing, printable daily plan
//
// Sections:
//   1. Packing Plan — products x customers TABLE
//   2. Prep Row (3-col): Dough Sheets | Cookie Prep | Dough Mix
//   3. Tray Layout — products x tray numbers TABLE
//   4. Cross-Check — order totals by destination group
// ============================================================================

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, addDays, subDays } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  RefreshCw,
  Loader2,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';

// ─── Fixed bake group order ─────────────────────────────────────────────
// This ensures consistent product ordering across all sections
const BAKE_GROUP_ORDER = ['Croissants', 'Savory', 'Swirls', 'Cookies'];

function getBakeGroupPriority(name: string): number {
  const idx = BAKE_GROUP_ORDER.findIndex(bg => bg.toLowerCase() === name?.toLowerCase());
  return idx >= 0 ? idx : 99;
}

// ─── Types ──────────────────────────────────────────────────────────────

interface TrayItem { product: string; product_id: string; qty: number; }

interface Tray {
  number: number;
  local_number: number;
  bake_group: string;
  bake_group_id: string;
  items: TrayItem[];
  used: number;
  capacity: number;
}

interface DestGroup {
  destination_group_id: string;
  destination_group_name: string;
  dispatch_time: string | null;
  bake_deadline: string | null;
  tray_start: number;
  tray_end: number;
  equipment: Tray[];
  summary: { total_equipment: number; total_items: number; utilization_percent: number; };
}

interface TrayLayoutRes { delivery_date: string; total_trays: number; destination_groups: DestGroup[]; }

interface OrderLine {
  product_id: string;
  product_name: string;
  quantity: number;
  bake_group_id: string;
  bake_group_name: string;
  prep_method?: 'laminated' | 'frozen' | 'fresh' | 'par_baked';
  ship_state?: 'baked' | 'frozen';
}

interface DeliveryOrder {
  order_id: string;
  customer_name: string;
  destination_group_id: string;
  destination_group_name: string;
  lines: OrderLine[];
}

interface PlanRes {
  date: string;
  delivery_orders: DeliveryOrder[];
  production_tasks: any[];
  dough_ingredients: any[];
  tray_setup: any[];
  cookie_layout: any[];
}

interface ProcessingGroupResult {
  group_id: string;
  group_name: string;
  total_units: number;
  batches_rounded: number;
  total_kg: number;
  sheets_needed: number | null;
  sheet_yield_kg: number | null;
  lamination_method: string | null;
  products: { name: string; quantity: number; grams_each: number }[];
}

interface DoughMix {
  dough_id: string;
  dough_name: string;
  recipe_name: string | null;
  total_kg: number;
  total_batches: number | null;
  lamination_styles: {
    style_name: string;
    sheets_needed: number;
    total_products: number;
  }[];
  ingredients: { name: string; quantity: number; unit: string }[];
}

interface MixSheetRes {
  delivery_date: string;
  mix_day: string;
  dough_mixes: DoughMix[];
  sheet_summary: {
    total_sheets: number;
    by_style: { style_name: string; base_dough_name: string; sheets_needed: number; total_products: number }[];
  } | null;
}

interface Props { siteId: string; initialDate?: Date; }

// ─── Component ──────────────────────────────────────────────────────────

export function DailyWorksheet({ siteId, initialDate = new Date() }: Props) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [planToday, setPlanToday] = useState<PlanRes | null>(null);
  const [planTomorrow, setPlanTomorrow] = useState<PlanRes | null>(null);
  const [trayLayout, setTrayLayout] = useState<TrayLayoutRes | null>(null);
  const [mixSheetTomorrow, setMixSheetTomorrow] = useState<MixSheetRes | null>(null);
  const [mixSheetDayAfter, setMixSheetDayAfter] = useState<MixSheetRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date strings for API calls
  const todayStr = format(selectedDate, 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(selectedDate, 1), 'yyyy-MM-dd');
  const dayAfterStr = format(addDays(selectedDate, 2), 'yyyy-MM-dd');

  // ── Fetch APIs with correct date offsets ────────────────────────────
  // Packing Plan: TODAY's delivery
  // Tray Layout, Cross-Check, Cookies: TOMORROW's delivery (prep today)
  // Dough Sheets: TOMORROW's delivery (sheet prep today)
  // Dough Mix: DAY AFTER TOMORROW's delivery (mix today)

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pTodayRes, pTomorrowRes, tRes, mTomorrowRes, mDayAfterRes] = await Promise.all([
        // TODAY: for packing plan
        fetch(`/api/planly/production-plan?date=${todayStr}&siteId=${siteId}`),
        // TOMORROW: for tray layout, cross-check, cookie prep
        fetch(`/api/planly/production-plan?date=${tomorrowStr}&siteId=${siteId}`),
        // TOMORROW: for tray layout
        fetch(`/api/planly/production-plan/tray-layout?date=${tomorrowStr}&siteId=${siteId}`),
        // TOMORROW: for dough sheets (prep today for tomorrow's bake)
        fetch(`/api/planly/production-plan/mix-sheet?date=${tomorrowStr}&siteId=${siteId}`),
        // DAY AFTER TOMORROW: for dough mix (mix today for day after's bake)
        fetch(`/api/planly/production-plan/mix-sheet?date=${dayAfterStr}&siteId=${siteId}`),
      ]);

      if (!pTodayRes.ok) throw new Error('Failed to load today\'s production plan');
      if (!pTomorrowRes.ok) throw new Error('Failed to load tomorrow\'s production plan');
      if (!tRes.ok) throw new Error('Failed to load tray layout');

      const [pTodayData, pTomorrowData, tData] = await Promise.all([
        pTodayRes.json(),
        pTomorrowRes.json(),
        tRes.json(),
      ]);

      // Mix sheets may fail if not configured - that's OK
      const mTomorrowData = mTomorrowRes.ok ? await mTomorrowRes.json() : null;
      const mDayAfterData = mDayAfterRes.ok ? await mDayAfterRes.json() : null;

      setPlanToday(pTodayData);
      setPlanTomorrow(pTomorrowData);
      setTrayLayout(tData);
      setMixSheetTomorrow(mTomorrowData);
      setMixSheetDayAfter(mDayAfterData);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [todayStr, tomorrowStr, dayAfterStr, siteId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Print handlers - force light theme before print ───────────────────
  useEffect(() => {
    let wasDarkMode = false;

    const handleBeforePrint = () => {
      // Remove dark mode class from html element
      wasDarkMode = document.documentElement.classList.contains('dark');
      if (wasDarkMode) {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }

      // Force light theme on body
      document.body.style.backgroundColor = 'white';
      document.body.style.color = 'black';
    };

    const handleAfterPrint = () => {
      // Restore dark mode if it was active
      if (wasDarkMode) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      }

      // Restore body styles
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // ── Derived: Packing Grid (TODAY's orders) ──────────────────────────

  const packing = useMemo(() => {
    if (!planToday?.delivery_orders?.length) return null;

    type Row = { name: string; bg: string; frozenCustomers: Set<string>; byCust: Map<string, number>; total: number };
    const rows = new Map<string, Row>();
    const custs = new Set<string>();

    for (const order of planToday.delivery_orders) {
      custs.add(order.customer_name);
      for (const l of order.lines) {
        if (!rows.has(l.product_name)) {
          rows.set(l.product_name, { name: l.product_name, bg: l.bake_group_name || 'Other', frozenCustomers: new Set(), byCust: new Map(), total: 0 });
        }
        const r = rows.get(l.product_name)!;
        // Track which specific customer orders are frozen
        if (l.ship_state === 'frozen') r.frozenCustomers.add(order.customer_name);
        r.byCust.set(order.customer_name, (r.byCust.get(order.customer_name) || 0) + l.quantity);
        r.total += l.quantity;
      }
    }

    const custList = [...custs].sort();
    const prodList = [...rows.values()];

    // Sort by fixed bake group order then product name
    prodList.sort((a, b) => {
      const bgDiff = getBakeGroupPriority(a.bg) - getBakeGroupPriority(b.bg);
      return bgDiff !== 0 ? bgDiff : a.name.localeCompare(b.name);
    });

    const colTotals = new Map<string, number>();
    custList.forEach(c => {
      let t = 0; prodList.forEach(p => t += p.byCust.get(c) || 0);
      colTotals.set(c, t);
    });
    const grand = prodList.reduce((s, p) => s + p.total, 0);

    return { products: prodList, customers: custList, colTotals, grand };
  }, [planToday]);

  // ── Derived: Cross-check (TOMORROW's orders, excludes frozen) ───────

  const xcheck = useMemo(() => {
    if (!planTomorrow?.delivery_orders?.length) return null;

    const dests = new Set<string>();
    const prods = new Map<string, { name: string; bg: string; byDest: Map<string, number>; total: number }>();

    for (const order of planTomorrow.delivery_orders) {
      const dest = order.destination_group_name || 'Unassigned';
      dests.add(dest);
      for (const l of order.lines) {
        // Skip frozen orders - they don't go on baking trays
        if (l.ship_state === 'frozen') continue;

        if (!prods.has(l.product_name))
          prods.set(l.product_name, { name: l.product_name, bg: l.bake_group_name || 'Other', byDest: new Map(), total: 0 });
        const p = prods.get(l.product_name)!;
        p.byDest.set(dest, (p.byDest.get(dest) || 0) + l.quantity);
        p.total += l.quantity;
      }
    }

    // Sort destinations in reverse order (Wholesale before Kiosk)
    const destList = [...dests].sort((a, b) => b.localeCompare(a));
    const grand = [...prods.values()].reduce((s, p) => s + p.total, 0);
    // Return as map for easy lookup by product name
    return { productMap: prods, dests: destList, grand };
  }, [planTomorrow]);

  // ── Derived: Tray Grids ─────────────────────────────────────────────

  // Unified product list for tray layout and cross-check alignment
  const unifiedTrayProducts = useMemo(() => {
    if (!trayLayout?.destination_groups?.length) return null;

    const allProducts = new Map<string, { bg: string; priority: number }>();

    for (const dg of trayLayout.destination_groups) {
      for (const tray of dg.equipment) {
        for (const item of tray.items) {
          if (!allProducts.has(item.product)) {
            allProducts.set(item.product, {
              bg: tray.bake_group,
              priority: getBakeGroupPriority(tray.bake_group)
            });
          }
        }
      }
    }

    const sortedProducts = [...allProducts.keys()].sort((a, b) => {
      const aInfo = allProducts.get(a)!;
      const bInfo = allProducts.get(b)!;
      if (aInfo.priority !== bInfo.priority) return aInfo.priority - bInfo.priority;
      return a.localeCompare(b);
    });

    return { products: sortedProducts, productInfo: allProducts };
  }, [trayLayout]);

  const trayGrids = useMemo(() => {
    if (!trayLayout?.destination_groups?.length) return null;

    return trayLayout.destination_groups.map(dg => {
      // Collect products with their bake groups
      const productInfo = new Map<string, { bg: string; priority: number }>();
      for (const tray of dg.equipment) {
        for (const item of tray.items) {
          if (!productInfo.has(item.product)) {
            productInfo.set(item.product, {
              bg: tray.bake_group,
              priority: getBakeGroupPriority(tray.bake_group)
            });
          }
        }
      }

      // Sort products by fixed bake group order
      const productOrder = [...productInfo.keys()].sort((a, b) => {
        const aInfo = productInfo.get(a)!;
        const bInfo = productInfo.get(b)!;
        if (aInfo.priority !== bInfo.priority) return aInfo.priority - bInfo.priority;
        return a.localeCompare(b);
      });

      const productBG = new Map<string, string>();
      productOrder.forEach(p => productBG.set(p, productInfo.get(p)!.bg));

      // Build grid: product → tray_number → qty
      const grid = new Map<string, Map<number, number>>();
      const trayNums: number[] = [];

      for (const tray of dg.equipment) {
        trayNums.push(tray.number);
        for (const item of tray.items) {
          if (!grid.has(item.product)) grid.set(item.product, new Map());
          grid.get(item.product)!.set(tray.number, item.qty);
        }
      }

      return {
        name: dg.destination_group_name,
        dispatch: dg.dispatch_time,
        start: dg.tray_start,
        end: dg.tray_end,
        trayNums,
        products: productOrder,
        productBG,
        grid,
        totalItems: dg.summary.total_items,
      };
    });
  }, [trayLayout]);

  // ── Derived: Cookie Prep (TOMORROW's cookies - place on trays today) ──

  const cookies = useMemo(() => {
    if (!planTomorrow?.delivery_orders?.length) return null;
    const totals = new Map<string, number>();
    for (const order of planTomorrow.delivery_orders) {
      for (const l of order.lines) {
        if (l.bake_group_name === 'Cookies') {
          totals.set(l.product_name, (totals.get(l.product_name) || 0) + l.quantity);
        }
      }
    }
    if (totals.size === 0) return null;
    return [...totals.entries()].map(([n, q]) => ({ name: n, qty: q })).sort((a, b) => a.name.localeCompare(b.name));
  }, [planTomorrow]);

  // ── Derived: Frozen Packing Tasks (from process templates - tasks due TODAY for frozen products) ──

  const frozenPackingTasks = useMemo(() => {
    if (!planToday?.production_tasks?.length) return null;

    // Filter production tasks for frozen products
    const frozenTasks = planToday.production_tasks.filter(
      (task: any) => task.ship_state === 'frozen'
    );

    if (frozenTasks.length === 0) return null;

    // Group by stage_name, then by customer, then by product
    const byStage = new Map<string, Map<string, Map<string, number>>>();

    for (const task of frozenTasks) {
      const stageName = task.stage_name || 'Pack';
      // Use customer name if available, otherwise "Stock"
      const custName = task.customer_name || 'Stock';

      if (!byStage.has(stageName)) byStage.set(stageName, new Map());
      
      const byCust = byStage.get(stageName)!;
      if (!byCust.has(custName)) byCust.set(custName, new Map());
      
      const products = byCust.get(custName)!;
      products.set(task.product_name, (products.get(task.product_name) || 0) + task.quantity);
    }

    // Convert to array format
    const result = [];
    for (const [stage, custMap] of byStage) {
      const customers = [...custMap.entries()].map(([cName, prodMap]) => ({
        name: cName,
        products: [...prodMap.entries()].map(([pName, qty]) => ({ name: pName, qty })).sort((a, b) => a.name.localeCompare(b.name)),
        total: [...prodMap.values()].reduce((s, q) => s + q, 0)
      })).sort((a, b) => a.name.localeCompare(b.name));
      
      result.push({ stage, customers });
    }

    return result.length > 0 ? result : null;
  }, [planToday]);

  // Also keep simple frozen orders count from tomorrow's delivery_orders as fallback
  // Now grouped by customer for better packing instructions
  const frozenOrdersFallback = useMemo(() => {
    if (!planTomorrow?.delivery_orders?.length) return null;

    // Group by customer, then by product
    const byCustomer = new Map<string, Map<string, number>>();
    let totalItems = 0;

    for (const order of planTomorrow.delivery_orders) {
      for (const l of order.lines) {
        if (l.ship_state === 'frozen') {
          if (!byCustomer.has(order.customer_name)) {
            byCustomer.set(order.customer_name, new Map());
          }
          const products = byCustomer.get(order.customer_name)!;
          products.set(l.product_name, (products.get(l.product_name) || 0) + l.quantity);
          totalItems += l.quantity;
        }
      }
    }

    if (byCustomer.size === 0) return null;

    // Convert to array format with customer grouping
    const result = [...byCustomer.entries()]
      .map(([customer, products]) => ({
        customer,
        products: [...products.entries()]
          .map(([name, qty]) => ({ name, qty }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        total: [...products.values()].reduce((s, q) => s + q, 0),
      }))
      .sort((a, b) => a.customer.localeCompare(b.customer));

    return { customers: result, totalItems };
  }, [planTomorrow]);

  // ── Derived: Dough Sheets (TOMORROW's bake - prep sheets today) ─────

  const doughSheets = useMemo(() => {
    if (!mixSheetTomorrow?.sheet_summary) return null;
    return mixSheetTomorrow.sheet_summary;
  }, [mixSheetTomorrow]);

  // ── Derived: Dough Mix (DAY AFTER TOMORROW - mix today) ─────────────

  const doughMix = useMemo(() => {
    if (!mixSheetDayAfter?.dough_mixes?.length) return null;
    return mixSheetDayAfter.dough_mixes;
  }, [mixSheetDayAfter]);

  // ── Helpers ─────────────────────────────────────────────────────────

  const hasOrdersToday = planToday?.delivery_orders && planToday.delivery_orders.length > 0;
  const hasOrdersTomorrow = planTomorrow?.delivery_orders && planTomorrow.delivery_orders.length > 0;
  const hasAnyData = hasOrdersToday || hasOrdersTomorrow;

  // Date displays - include day name for clarity when printing
  const todayDisplay = format(selectedDate, 'EEEE dd-MMM');
  const tomorrowDisplay = format(addDays(selectedDate, 1), 'EEEE dd-MMM');
  const dayAfterDisplay = format(addDays(selectedDate, 2), 'EEEE dd-MMM');
  const todayDayName = format(selectedDate, 'EEEE');
  const tomorrowDayName = format(addDays(selectedDate, 1), 'EEEE');

  // ── Print Handler ──────────────────────────────────────────────────

  const handlePrint = () => {
    window.print();
  };

  // ── Loading / Error ─────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-5 w-5 animate-spin text-theme-tertiary mr-3" />
      <span className="text-theme-tertiary">Loading production plan...</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
      <div className="text-red-500 dark:text-red-400 text-sm">{error}</div>
      <Button variant="outline" size="sm" onClick={loadData}>
        <RefreshCw className="h-4 w-4 mr-2" /> Retry
      </Button>
    </div>
  );

  // ── RENDER ──────────────────────────────────────────────────────────

  return (
    <div className="ws-root space-y-4 print:space-y-2">

      {/* ── DATE NAV ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(d => subDays(d, 1))}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <h2 className="text-xl font-bold text-theme-primary">
            {format(selectedDate, 'EEEE d MMMM yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(d => addDays(d, 1))}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={handlePrint} disabled={loading}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Print header - Page 1 */}
      <div className="hidden print:block print:mb-1"><h1 className="text-[10px] font-bold">Packing Plan — {format(selectedDate, 'EEEE d MMM yyyy')}</h1></div>

      {!hasAnyData && (
        <Sec title="No Orders" sub={todayDisplay}>
          <p className="text-theme-tertiary text-center py-6">No orders for today or tomorrow. Navigate to a date with orders.</p>
        </Sec>
      )}

      {hasAnyData && (
        <>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 1: PACKING PLAN — TODAY's delivery orders
              ═══════════════════════════════════════════════════════════════ */}
          <Sec title="Packing Plan" sub={packing ? `${planToday!.delivery_orders.length} orders | ${packing.grand} items — for ${todayDisplay}` : ''}>
            {packing ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-gray-300 dark:border-white/20 table-fixed">
                  <thead>
                    <tr className="border-b-2 border-gray-500 dark:border-white/40 bg-gray-100 dark:bg-white/5">
                      <th className="text-left py-0.5 px-1.5 text-theme-secondary font-bold sticky left-0 bg-theme-muted z-10 w-[140px] print:w-[100px] border-r-2 border-gray-400 dark:border-white/30 text-[10px] print:text-[8px]">Product</th>
                      {packing.customers.map(c => (
                        <th key={c} className="py-1 px-1 text-theme-secondary font-semibold text-center border-r border-gray-300 dark:border-white/20 text-[9px] print:text-[7px] align-bottom leading-tight whitespace-normal">{c}</th>
                      ))}
                      <th className="text-center py-0.5 px-1 text-module-fg font-bold w-[45px] print:w-[35px] border-l-2 border-gray-500 dark:border-white/40 bg-teal-50 dark:bg-teal-900/20 text-[10px] print:text-[8px]">Tot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let lastBG = '';
                      const out: JSX.Element[] = [];
                      let rowIdx = 0;
                      packing.products.forEach(p => {
                        if (p.bg !== lastBG) {
                          lastBG = p.bg;
                          out.push(
                            <tr key={`bg-${p.bg}`} className="bg-gray-50 dark:bg-white/[0.03]">
                              <td colSpan={packing.customers.length + 2}
                                  className="py-1 px-2 text-[9px] print:text-[7px] font-bold text-module-fg uppercase tracking-wider border-t border-gray-300 dark:border-white/20">
                                ● {p.bg}
                              </td>
                            </tr>
                          );
                          rowIdx = 0;
                        }
                        const isEven = rowIdx % 2 === 0;
                        out.push(
                          <tr key={p.name} className={`border-b border-gray-300 dark:border-white/20 hover:bg-module-fg/10 ${isEven ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-white/[0.02]'}`}>
                            <td className={`py-0.5 px-1.5 text-theme-primary font-medium sticky left-0 z-10 border-r-2 border-gray-400 dark:border-white/30 text-[11px] print:text-[8px] ${isEven ? 'bg-white dark:bg-gray-900' : 'bg-theme-surface'}`}>
                              {p.name}
                            </td>
                            {packing.customers.map((c, ci) => {
                              const q = p.byCust.get(c) || 0;
                              const isFrozenOrder = p.frozenCustomers?.has(c);
                              return (
 <td key={c} className={`text-center py-0.5 px-0.5 tabular-nums border-r border-gray-300 dark:border-white/20 text-[10px] print:text-[8px] ${isFrozenOrder ? 'bg-blue-100 dark:bg-blue-900/40' : ''} ${q > 0 ? 'text-theme-primary font-medium' : 'text-gray-300/20'}`}>
                                  {q > 0 ? (
                                    <span className="flex items-center justify-center gap-0.5">
                                      {q}
                                      {isFrozenOrder && <span className="text-[6px] print:text-[5px]">❄️</span>}
                                    </span>
                                  ) : ''}
                                </td>
                              );
                            })}
                            <td className="text-center py-0.5 px-1 text-module-fg font-bold tabular-nums border-l-2 border-gray-500 dark:border-white/40 bg-teal-50/50 dark:bg-teal-900/10 text-[11px] print:text-[8px]">{p.total}</td>
                          </tr>
                        );
                        rowIdx++;
                      });
                      // Totals row
                      out.push(
                        <tr key="_totals" className="border-t-2 border-gray-500 dark:border-white/40 font-bold bg-gray-100 dark:bg-white/5">
                          <td className="py-1 px-1.5 text-theme-primary sticky left-0 bg-theme-muted z-10 border-r-2 border-gray-400 dark:border-white/30 text-[11px] print:text-[8px]">Totals</td>
                          {packing.customers.map(c => (
                            <td key={c} className="text-center py-1 px-0.5 text-theme-secondary/90 tabular-nums border-r border-gray-300 dark:border-white/20 text-[10px] print:text-[8px]">{packing.colTotals.get(c) || ''}</td>
                          ))}
                          <td className="text-center py-1 px-1 text-teal-700 dark:text-teal-300 tabular-nums border-l-2 border-gray-500 dark:border-white/40 bg-module-fg/10 text-[11px] print:text-[8px]">{packing.grand}</td>
                        </tr>
                      );
                      return out;
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-theme-tertiary/30 text-sm py-4 text-center italic border border-dashed border-gray-300 dark:border-white/20 rounded">
                No orders to pack today
              </p>
            )}
          </Sec>

          {/* Page break for print - Packing Plan on page 1, rest on page 2 */}
          <div className="hidden print:block print:page-break-after-always" />

          {/* Page 2 header for print */}
          <div className="hidden print:block print:mb-1">
            <h2 className="text-[10px] font-bold">Prep & Trays — {format(selectedDate, 'EEEE d MMM yyyy')}</h2>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 2: PREP ROW — 4-column grid (or 3 if no frozen)
              Frozen Packing | Dough Sheets | Cookie Prep | Dough Mix
              ═══════════════════════════════════════════════════════════════ */}
          <div className={`grid grid-cols-1 gap-3 print:gap-2 ${(frozenPackingTasks || frozenOrdersFallback) ? 'md:grid-cols-4 print:grid-cols-4' : 'md:grid-cols-3 print:grid-cols-3'}`}>
            {/* Frozen Packing - for TOMORROW's frozen deliveries */}
            {(frozenPackingTasks || frozenOrdersFallback) && (
              <div className="ws-section border-2 border-blue-300 dark:border-blue-500/30 rounded-lg p-2.5 print:p-1 bg-blue-50 dark:bg-blue-900/20 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1.5 print:mb-0.5 pb-1 print:pb-0 border-b border-blue-200 dark:border-blue-500/20">
                  <span className="text-blue-600 dark:text-blue-400 text-sm print:text-[8px]">❄️</span>
                  <h3 className="text-xs font-bold text-blue-700 dark:text-blue-300 print:text-[7px]">
                    Frozen Pack
                  </h3>
                  <span className="text-[10px] print:text-[6px] text-blue-500 dark:text-blue-400/70">
                    {tomorrowDisplay}
                  </span>
                </div>

                {/* Show tasks from process templates (preferred) */}
                {frozenPackingTasks ? (
                  <div className="space-y-3">
                    {frozenPackingTasks.map((stageGroup) => (
                      <div key={stageGroup.stage} className="space-y-1">
                        <div className="text-[9px] print:text-[6px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider border-b border-blue-200 dark:border-blue-500/20 mb-1">
                          {stageGroup.stage}
                        </div>
                        
                        {stageGroup.customers.map((cust) => (
                          <div key={cust.name} className="border border-blue-200 dark:border-blue-500/20 rounded overflow-hidden bg-white dark:bg-gray-900/50">
                            <div className="flex justify-between px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-500/20">
                              <span className="text-blue-800 dark:text-blue-200 font-semibold text-[10px] print:text-[6px] truncate max-w-[120px]">{cust.name}</span>
                              <span className="text-blue-600 dark:text-blue-400 font-bold text-[10px] print:text-[6px]">{cust.total}</span>
                            </div>
                            <table className="w-full text-[9px] print:text-[6px]">
                              <tbody>
                                {cust.products.map((p, pi) => (
                                  <tr key={p.name} className={`border-b border-blue-50 dark:border-blue-500/10 last:border-0 ${pi % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-blue-50/20 dark:bg-blue-900/10'}`}>
                                    <td className="py-0.5 px-1.5 text-theme-primary/90">{p.name}</td>
                                    <td className="py-0.5 px-1.5 text-right text-blue-600 dark:text-blue-400 font-medium tabular-nums w-8">{p.qty}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : frozenOrdersFallback ? (
                  /* Fallback: show tomorrow's frozen delivery orders grouped by customer */
                  <div className="space-y-1.5">
                    <div className="p-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded text-[8px] print:hidden">
                      <span className="text-amber-600 dark:text-amber-400">⚠️</span>
                      <span className="text-amber-700 dark:text-amber-300 ml-1">
                        Set Day 1 as D-1 in process template
                      </span>
                    </div>
                    {frozenOrdersFallback.customers.map((cust, ci) => (
                      <div key={cust.customer} className="border border-blue-200 dark:border-blue-500/20 rounded overflow-hidden">
                        <div className="flex justify-between px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-500/20">
                          <span className="text-blue-800 dark:text-blue-200 font-semibold text-[10px] print:text-[6px]">{cust.customer}</span>
                          <span className="text-blue-600 dark:text-blue-400 font-bold text-[10px] print:text-[6px]">{cust.total}</span>
                        </div>
                        <table className="w-full text-[9px] print:text-[6px]">
                          <tbody>
                            {cust.products.map((p, pi) => (
                              <tr key={p.name} className={`border-b border-blue-100 dark:border-blue-500/10 last:border-0 ${pi % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-blue-50/30 dark:bg-blue-900/10'}`}>
                                <td className="py-0.5 px-1.5 text-theme-primary/90">{p.name}</td>
                                <td className="py-0.5 px-1.5 text-right text-blue-600 dark:text-blue-400 font-medium tabular-nums w-8">{p.qty}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                    <div className="flex justify-between px-1.5 py-1 bg-blue-200 dark:bg-blue-800/50 rounded font-bold text-[10px] print:text-[6px]">
                      <span className="text-blue-800 dark:text-blue-200">Total</span>
                      <span className="text-blue-700 dark:text-blue-300">{frozenOrdersFallback.totalItems}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
            {/* Dough Sheets - for TOMORROW's bake */}
            <Sec title="Dough Sheets" sub={tomorrowDisplay}>
              {doughSheets?.by_style && doughSheets.by_style.length > 0 ? (
                <table className="text-xs print:text-[7px] border-collapse w-full border border-gray-300 dark:border-white/20">
                  <thead>
                    <tr className="border-b-2 border-gray-400 dark:border-white/30 bg-gray-100 dark:bg-white/5">
                      <th className="text-left py-1.5 px-2 text-theme-secondary font-semibold border-r border-theme">Style</th>
                      <th className="text-right py-1.5 px-2 text-theme-secondary font-semibold border-r border-theme">Sheets</th>
                      <th className="text-right py-1.5 px-2 text-theme-secondary font-semibold">Products</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doughSheets.by_style.map((s, i) => (
                      <tr key={`${s.style_name}-${i}`} className={`border-b border-theme ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-white/[0.02]'}`}>
                        <td className="py-1.5 px-2 text-theme-primary border-r border-theme">
                          {s.style_name}
                          <span className="text-[10px] text-theme-tertiary ml-1">({s.base_dough_name})</span>
                        </td>
                        <td className="py-1.5 px-2 text-right text-module-fg font-bold tabular-nums border-r border-theme">{s.sheets_needed}</td>
                        <td className="py-1.5 px-2 text-right text-theme-secondary tabular-nums">{s.total_products}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-400 dark:border-white/30 font-bold bg-gray-100 dark:bg-white/5">
                      <td className="py-1.5 px-2 text-theme-primary border-r border-theme">Total</td>
                      <td className="py-1.5 px-2 text-right text-teal-700 dark:text-teal-300 tabular-nums border-r border-theme">{doughSheets.total_sheets}</td>
                      <td className="py-1.5 px-2 text-right text-theme-secondary tabular-nums">
                        {doughSheets.by_style.reduce((sum, s) => sum + s.total_products, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="text-theme-tertiary/30 text-sm py-4 text-center italic border border-dashed border-gray-300 dark:border-white/20 rounded">
                  Configure lamination styles with products_per_sheet
                </p>
              )}
            </Sec>

            {/* Cookie Prep - for TOMORROW's bake */}
            <Sec title="Cookie Prep" sub={tomorrowDisplay}>
              {cookies && cookies.length > 0 ? (
                <table className="text-xs print:text-[7px] border-collapse w-full border border-gray-300 dark:border-white/20">
                  <thead>
                    <tr className="border-b-2 border-gray-400 dark:border-white/30 bg-gray-100 dark:bg-white/5">
                      <th className="text-left py-1.5 px-2 text-theme-secondary font-semibold border-r border-theme">Cookie</th>
                      <th className="text-right py-1.5 px-2 text-theme-secondary font-semibold w-16">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cookies.map((c, i) => (
                      <tr key={c.name} className={`border-b border-theme ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-white/[0.02]'}`}>
                        <td className="py-1.5 px-2 text-theme-primary border-r border-theme">{c.name}</td>
                        <td className="py-1.5 px-2 text-right text-module-fg font-bold tabular-nums">{c.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-theme-tertiary/30 text-sm py-4 text-center italic border border-dashed border-gray-300 dark:border-white/20 rounded">
                  No cookies ordered
                </p>
              )}
            </Sec>

            {/* Dough Mix - for DAY AFTER TOMORROW's bake */}
            <Sec title="Dough Mix" sub={dayAfterDisplay}>
              {doughMix && doughMix.length > 0 ? (
                <div className="space-y-2 print:space-y-1">
                  {doughMix.map((mix, i) => (
                    <div key={i} className="border border-gray-300 dark:border-white/20 rounded overflow-hidden">
                      <div className="flex justify-between px-1.5 py-1 bg-gray-100 dark:bg-white/5 border-b border-gray-300 dark:border-white/20">
                        <span className="text-theme-primary font-semibold text-xs print:text-[7px]">{mix.dough_name}</span>
                        <span className="text-module-fg font-bold font-mono text-xs print:text-[7px]">{mix.total_kg}kg</span>
                      </div>
                      {mix.ingredients.length > 0 && (
                        <table className="w-full text-[10px] print:text-[6px]">
                          <tbody>
                            {mix.ingredients.map((ing, j) => (
                              <tr key={j} className={`border-b border-theme last:border-0 ${j % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-white/[0.02]'}`}>
                                <td className="py-0.5 px-1.5 text-theme-secondary border-r border-theme">{ing.name}</td>
                                <td className="py-0.5 px-1.5 text-right text-theme-primary font-mono tabular-nums">
                                  {Number(ing.quantity).toLocaleString()}{ing.unit}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-theme-tertiary/30 text-sm py-4 text-center italic border border-dashed border-gray-300 dark:border-white/20 rounded">
                  Link processing groups to recipes
                </p>
              )}
            </Sec>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 3: CONSOLIDATED TRAY LAYOUT + CROSS-CHECK
              Single table with all destination groups, products on left side
              Tray layout gets 2/3 width, Cross-check gets 1/3 width
              ═══════════════════════════════════════════════════════════════ */}
          {(trayGrids && trayGrids.length > 0) && (
            <div className="tray-confirmation-grid grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 print:gap-2">
              {/* Consolidated Tray Layout - all destination groups in one table */}
              <Sec title="Tray Layout" sub={`${tomorrowDisplay} — ${trayGrids.reduce((s, dg) => s + dg.totalItems, 0)} items`}>
                {(() => {
                  // Use pre-computed unified product list for alignment with cross-check
                  if (!unifiedTrayProducts) return null;
                  const { products: sortedProducts, productInfo } = unifiedTrayProducts;

                  // Build destination grids map
                  const allDestGrids = new Map<string, Map<string, Map<number, number>>>();
                  trayGrids.forEach(dg => {
                    allDestGrids.set(dg.name, dg.grid);
                  });

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] print:text-[8px] border-collapse whitespace-nowrap border-2 border-gray-400 dark:border-white/30">
                        <thead>
                          {/* Destination group header row */}
                          <tr className="border-b border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/[0.03]">
                            <th className="text-left py-1 px-1.5 text-theme-secondary font-semibold border-r-2 border-gray-400 dark:border-white/30"></th>
                            {trayGrids.map((dg, di) => (
                              <th key={dg.name} colSpan={dg.trayNums.length}
                                  className={`text-center py-1 px-1 text-theme-secondary font-bold text-[9px] print:text-[7px] bg-gray-100 dark:bg-white/5 ${di < trayGrids.length - 1 ? 'border-r-2 border-gray-400 dark:border-white/30' : ''}`}>
                                {dg.name} <span className="text-theme-tertiary font-normal">({dg.start}–{dg.end})</span>
                              </th>
                            ))}
                          </tr>
                          {/* Tray number header row */}
                          <tr className="border-b-2 border-gray-500 dark:border-white/40 bg-gray-100 dark:bg-white/5">
                            <th className="text-left py-1 px-1.5 text-theme-secondary font-semibold border-r-2 border-gray-400 dark:border-white/30 min-w-[130px] print:min-w-[90px]">Product</th>
                            {trayGrids.map((dg, di) => (
                              dg.trayNums.map((tn, ti) => (
                                <th key={`${dg.name}-${tn}`}
                                    className={`text-center py-1 px-0.5 text-module-fg font-bold w-7 print:w-5 bg-teal-50 dark:bg-teal-900/20 ${ti === dg.trayNums.length - 1 && di < trayGrids.length - 1 ? 'border-r-2 border-gray-400 dark:border-white/30' : 'border-r border-gray-300 dark:border-white/20'}`}>
                                  {tn}
                                </th>
                              ))
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let lastBG = '';
                            let rowIdx = 0;
                            const out: JSX.Element[] = [];
                            const totalCols = trayGrids.reduce((s, dg) => s + dg.trayNums.length, 0);

                            sortedProducts.forEach(prod => {
                              const bg = productInfo.get(prod)?.bg || '';

                              if (bg !== lastBG) {
                                lastBG = bg;
                                rowIdx = 0;
                                out.push(
                                  <tr key={`bg-${bg}`} className="bg-gray-100 dark:bg-white/[0.05]">
                                    <td colSpan={totalCols + 1}
                                        className="py-1 px-1.5 text-[10px] print:text-[8px] font-bold text-module-fg uppercase tracking-wider border-t-2 border-b border-gray-400 dark:border-white/30">
                                      ● {bg}
                                    </td>
                                  </tr>
                                );
                              }

                              const isEven = rowIdx % 2 === 0;
                              out.push(
                                <tr key={prod} className={`border-b border-gray-300 dark:border-white/20 ${isEven ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-white/[0.02]'}`}>
                                  <td className={`py-0.5 px-1.5 text-theme-primary font-medium border-r-2 border-gray-400 dark:border-white/30 whitespace-normal text-[10px] print:text-[8px] ${isEven ? 'bg-white dark:bg-gray-900' : 'bg-theme-surface'}`}>
                                    {prod}
                                  </td>
                                  {trayGrids.map((dg, di) => (
                                    dg.trayNums.map((tn, ti) => {
                                      const q = allDestGrids.get(dg.name)?.get(prod)?.get(tn);
                                      const isLastInGroup = ti === dg.trayNums.length - 1 && di < trayGrids.length - 1;
                                      return (
                                        <td key={`${dg.name}-${tn}`}
 className={`text-center py-0.5 px-0.5 tabular-nums ${isLastInGroup ? 'border-r-2 border-gray-400' : 'border-r border-theme'} ${q != null ? 'text-theme-primary font-medium' : ''}`}>
                                          {q ?? ''}
                                        </td>
                                      );
                                    })
                                  ))}
                                </tr>
                              );
                              rowIdx++;
                            });

                            return out;
                          })()}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </Sec>

              {/* Cross-Check - uses same product order as tray layout for alignment */}
              {xcheck && unifiedTrayProducts && (
                <Sec title="Confirmation" sub={`${tomorrowDisplay} totals`}>
                  <table className="w-full text-[10px] print:text-[8px] border-collapse border-2 border-gray-400 dark:border-white/30">
                    <thead>
                      {/* Spacer row to align with Tray Layout's destination group header */}
                      <tr className="border-b border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/[0.03]">
                        <th className="text-left py-1 px-1.5 text-theme-secondary font-semibold border-r-2 border-gray-400 dark:border-white/30"></th>
                        <th colSpan={xcheck.dests.length + 1} className="text-center py-1 px-1 text-theme-secondary font-bold text-[9px] print:text-[7px] bg-gray-100 dark:bg-white/5">
                          Totals by Destination
                        </th>
                      </tr>
                      <tr className="border-b-2 border-gray-500 dark:border-white/40 bg-gray-100 dark:bg-white/5">
                        <th className="text-left py-1 px-1.5 text-theme-secondary font-semibold border-r-2 border-gray-400 dark:border-white/30 min-w-[80px] print:min-w-[60px]">Product</th>
                        {xcheck.dests.map(d => (
                          <th key={d} className="text-center py-1 px-2 text-theme-secondary font-semibold border-r border-gray-300 dark:border-white/20 text-[9px] print:text-[7px] min-w-[70px] print:min-w-[55px]">{d.replace(' Bake', '')}</th>
                        ))}
                        <th className="text-center py-1 px-1.5 text-module-fg font-bold border-l-2 border-gray-500 dark:border-white/40 bg-teal-50 dark:bg-teal-900/20 min-w-[40px]">Tot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Use same product order as tray layout for row alignment
                        const { products: sortedProducts, productInfo } = unifiedTrayProducts;
                        let lastBG = '';
                        let rowIdx = 0;
                        const out: JSX.Element[] = [];

                        sortedProducts.forEach(prodName => {
                          const bg = productInfo.get(prodName)?.bg || '';
                          const p = xcheck.productMap.get(prodName);

                          if (bg !== lastBG) {
                            lastBG = bg;
                            rowIdx = 0;
                            out.push(
                              <tr key={`bg-${bg}`} className="bg-gray-100 dark:bg-white/[0.05]">
                                <td colSpan={xcheck.dests.length + 2}
                                    className="py-1 px-1.5 text-[10px] print:text-[8px] font-bold text-module-fg uppercase tracking-wider border-t-2 border-b border-gray-400 dark:border-white/30">
                                  ● {bg}
                                </td>
                              </tr>
                            );
                          }
                          const isEven = rowIdx % 2 === 0;
                          const total = p?.total || 0;
                          out.push(
                            <tr key={prodName} className={`border-b border-gray-300 dark:border-white/20 ${isEven ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-white/[0.02]'}`}>
                              <td className={`py-0.5 px-1.5 text-theme-primary font-medium border-r-2 border-gray-400 dark:border-white/30 whitespace-normal text-[10px] print:text-[8px] ${isEven ? 'bg-white dark:bg-gray-900' : 'bg-theme-surface'}`}>{prodName}</td>
                              {xcheck.dests.map(d => {
                                const q = p?.byDest.get(d) || 0;
 return <td key={d} className={`text-center py-0.5 px-2 tabular-nums border-r border-gray-300 dark:border-white/20 min-w-[70px] print:min-w-[55px] ${q > 0 ? 'text-theme-primary font-medium' : 'text-gray-300/20'}`}>{q > 0 ? q : ''}</td>;
                              })}
                              <td className="text-center py-0.5 px-1.5 text-module-fg font-bold tabular-nums border-l-2 border-gray-500 dark:border-white/40 bg-teal-50/50 dark:bg-teal-900/10">{total > 0 ? total : ''}</td>
                            </tr>
                          );
                          rowIdx++;
                        });
                        // Totals row
                        out.push(
                          <tr key="_totals" className="border-t-2 border-gray-500 dark:border-white/40 font-bold bg-gray-100 dark:bg-white/5">
                            <td className="py-1 px-1.5 text-theme-primary border-r-2 border-gray-400 dark:border-white/30 text-[10px] print:text-[8px]">Totals</td>
                            {xcheck.dests.map(d => {
                              const t = [...xcheck.productMap.values()].reduce((s, p) => s + (p.byDest.get(d) || 0), 0);
                              return <td key={d} className="text-center py-1 px-2 text-theme-secondary/90 tabular-nums border-r border-gray-300 dark:border-white/20 min-w-[70px] print:min-w-[55px]">{t}</td>;
                            })}
                            <td className="text-center py-1 px-1.5 text-teal-700 dark:text-teal-300 tabular-nums border-l-2 border-gray-500 dark:border-white/40 bg-module-fg/10">{xcheck.grand}</td>
                          </tr>
                        );
                        return out;
                      })()}
                    </tbody>
                  </table>
                </Sec>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Print Styles ─────────────────────────────────────────────── */}
      <style jsx global>{`
        @media print {
          /* Page setup — zero margin eliminates browser headers/footers */
          @page {
            margin: 0;
            size: A4 landscape;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide app chrome — Tailwind print: classes handle the rest */
          nav, header, aside, footer,
          [role="navigation"], [role="banner"],
          .no-print {
            display: none !important;
          }

          /* Reset app-shell layout */
          main {
            margin: 0 !important;
            padding: 1mm !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          .ws-root {
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            gap: 1mm !important;
          }

          /* Compact section cards for density */
          .ws-section {
            padding: 1mm !important;
            margin-bottom: 1mm !important;
          }

          .ws-section > div:first-child {
            margin-bottom: 0.5mm !important;
            padding-bottom: 0 !important;
          }

          /* Compact grids */
          .tray-confirmation-grid {
            gap: 1mm !important;
          }

          /* Page break support */
          .print\\:page-break-after-always {
            page-break-after: always !important;
            break-after: page !important;
          }

          /* Scrollable areas must be visible in print */
          .overflow-x-auto, .overflow-auto {
            overflow: visible !important;
          }

          /* Sticky columns break print layout */
          .sticky {
            position: static !important;
          }

          /* Force dark: classes to light values */
          .dark\\:bg-gray-900, .dark\\:bg-gray-900\\/50,
          .dark\\:bg-white\\/\\[0\\.02\\], .dark\\:bg-white\\/\\[0\\.03\\],
          .dark\\:bg-white\\/5 {
            background: white !important;
          }

          .dark\\:text-white, .dark\\:text-gray-100,
          .dark\\:text-gray-200, .dark\\:text-gray-300 {
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Section Card ───────────────────────────────────────────────────────

function Sec({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="ws-section border border-gray-300 dark:border-white/20 rounded-lg p-2.5 print:p-1 bg-white dark:bg-gray-900/50 shadow-sm">
      <div className="flex items-center gap-1.5 mb-1.5 print:mb-0.5 pb-1 print:pb-0 border-b border-theme">
        <h3 className="text-xs font-bold text-theme-primary print:text-[7px]">{title}</h3>
        {sub && <span className="text-[10px] print:text-[6px] text-theme-tertiary">{sub}</span>}
      </div>
      {children}
    </div>
  );
}
