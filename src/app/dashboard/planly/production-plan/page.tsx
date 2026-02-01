'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Lock,
  Calendar,
  Package,
  Flame,
  Cookie,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import StyledSelect, { StyledOption } from '@/components/ui/StyledSelect';
import { useProductionPlan, getDateRange, formatDateDisplay, getTodayString } from '@/hooks/planly/useProductionPlan';
import { useAppContext } from '@/context/AppContext';
import {
  ProductionPlan,
  DeliveryOrderSummary,
  ProductionTask,
  TrayRequirement,
  CookieRequirement,
} from '@/types/planly';
import { cn } from '@/lib/utils';

// Aggregate products across orders for Daily Book table
interface ProductRow {
  product_id: string;
  product_name: string;
  quantities: Record<string, number>;
  total: number;
}

function aggregateDeliveryOrders(orders: DeliveryOrderSummary[]): {
  productRows: ProductRow[];
  destinationGroups: { id: string; name: string }[];
} {
  const productMap = new Map<string, ProductRow>();
  const destGroups = new Map<string, string>();

  orders.forEach((order) => {
    const destId = order.destination_group_id || 'none';
    const destName = order.destination_group_name || 'Other';
    destGroups.set(destId, destName);

    order.lines.forEach((line) => {
      const key = line.product_id;

      if (!productMap.has(key)) {
        productMap.set(key, {
          product_id: line.product_id,
          product_name: line.product_name,
          quantities: {},
          total: 0,
        });
      }

      const row = productMap.get(key)!;
      row.quantities[destId] = (row.quantities[destId] || 0) + line.quantity;
      row.total += line.quantity;
    });
  });

  return {
    productRows: Array.from(productMap.values()).sort((a, b) =>
      a.product_name.localeCompare(b.product_name)
    ),
    destinationGroups: Array.from(destGroups.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

// Group tasks by stage type for display
function groupTasksByType(tasks: ProductionTask[]): Map<string, ProductionTask[]> {
  const groups = new Map<string, ProductionTask[]>();

  tasks.forEach((task) => {
    const key = task.stage_name;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(task);
  });

  return groups;
}

// Daily Book Section Component
function DailyBookSection({ orders, date }: { orders: DeliveryOrderSummary[]; date: string }) {
  const { productRows, destinationGroups } = useMemo(
    () => aggregateDeliveryOrders(orders),
    [orders]
  );

  if (orders.length === 0) {
    return (
      <div className="production-section" id="daily-book">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b-2 border-gray-300 dark:border-white/20 pb-2 mb-4">
          Daily Book - {formatDateDisplay(date)}
        </h2>
        <p className="text-gray-500 dark:text-white/50">No deliveries scheduled for this date</p>
      </div>
    );
  }

  return (
    <div className="production-section" id="daily-book">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b-2 border-gray-300 dark:border-white/20 pb-2 mb-4">
        Daily Book - {formatDateDisplay(date)}
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-white/10">
              <th className="border border-gray-200 dark:border-white/10 px-3 py-2 text-left font-semibold text-gray-900 dark:text-white">
                Product
              </th>
              {destinationGroups.map((dg) => (
                <th
                  key={dg.id}
                  className="border border-gray-200 dark:border-white/10 px-3 py-2 text-center font-semibold text-gray-900 dark:text-white"
                >
                  {dg.name}
                </th>
              ))}
              <th className="border border-gray-200 dark:border-white/10 px-3 py-2 text-center font-bold text-gray-900 dark:text-white">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {productRows.map((row) => (
              <tr key={row.product_id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                <td className="border border-gray-200 dark:border-white/10 px-3 py-2 text-gray-900 dark:text-white">
                  {row.product_name}
                </td>
                {destinationGroups.map((dg) => (
                  <td
                    key={dg.id}
                    className="border border-gray-200 dark:border-white/10 px-3 py-2 text-center text-gray-700 dark:text-white/80"
                  >
                    {row.quantities[dg.id] || '-'}
                  </td>
                ))}
                <td className="border border-gray-200 dark:border-white/10 px-3 py-2 text-center font-bold text-gray-900 dark:text-white">
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Production Tasks Section Component
function ProductionTasksSection({ tasks, date }: { tasks: ProductionTask[]; date: string }) {
  const taskGroups = useMemo(() => groupTasksByType(tasks), [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="production-section" id="production-tasks">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b-2 border-gray-300 dark:border-white/20 pb-2 mb-4">
          Production Tasks
        </h2>
        <p className="text-gray-500 dark:text-white/50">No production tasks for this date</p>
      </div>
    );
  }

  return (
    <div className="production-section" id="production-tasks">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b-2 border-gray-300 dark:border-white/20 pb-2 mb-4">
        Production Tasks
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from(taskGroups.entries()).map(([stageName, stageTasks]) => {
          // Aggregate quantities by product
          const productTotals = stageTasks.reduce(
            (acc, task) => {
              if (!acc[task.product_id]) {
                acc[task.product_id] = {
                  product_name: task.product_name,
                  quantity: 0,
                  delivery_date: task.delivery_date,
                };
              }
              acc[task.product_id].quantity += task.quantity;
              return acc;
            },
            {} as Record<string, { product_name: string; quantity: number; delivery_date: string }>
          );

          const deliveryDate = stageTasks[0]?.delivery_date;

          return (
            <Card key={stageName} className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{stageName}</h3>
              {deliveryDate && (
                <p className="text-xs text-gray-500 dark:text-white/50 mb-3">
                  For delivery: {formatDateDisplay(deliveryDate)}
                </p>
              )}
              <div className="space-y-2">
                {Object.entries(productTotals).map(([productId, data]) => (
                  <div
                    key={productId}
                    className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-white/5 last:border-0"
                  >
                    <span className="text-gray-700 dark:text-white/80">{data.product_name}</span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-white">
                      {data.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Tray Setup Section Component
function TraySetupSection({ traySetup }: { traySetup: TrayRequirement[] }) {
  if (traySetup.length === 0) {
    return null;
  }

  // Group by bake group
  const groupedByBakeGroup = traySetup.reduce(
    (acc, item) => {
      const key = item.bake_group_name || 'Ungrouped';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, TrayRequirement[]>
  );

  return (
    <div className="production-section" id="tray-setup">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Flame className="h-4 w-4 text-orange-500" />
        Tray Setup
      </h3>

      <div className="space-y-4">
        {Object.entries(groupedByBakeGroup).map(([groupName, items]) => (
          <div key={groupName}>
            <h4 className="text-sm font-medium text-gray-700 dark:text-white/70 mb-2">{groupName}</h4>
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item.product_id}
                  className="flex justify-between items-center py-1 text-sm"
                >
                  <span className="text-gray-700 dark:text-white/80">{item.product_name}</span>
                  <span className="text-gray-600 dark:text-white/60">
                    Trays {item.tray_start}-{item.tray_end}{' '}
                    <span className="text-xs text-gray-400">({item.items_per_tray}/tray)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Cookie Layout Section Component
function CookieLayoutSection({ cookies }: { cookies: CookieRequirement[] }) {
  if (cookies.length === 0) {
    return null;
  }

  return (
    <div className="production-section" id="cookie-layout">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Cookie className="h-4 w-4 text-amber-500" />
        Cookies to Layout
      </h3>

      <div className="space-y-1">
        {cookies.map((cookie) => (
          <div
            key={cookie.product_id}
            className="flex justify-between items-center py-1 text-sm"
          >
            <span className="text-gray-700 dark:text-white/80">{cookie.product_name}</span>
            <span className="font-mono font-semibold text-gray-900 dark:text-white">
              {cookie.quantity}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Page Component
export default function ProductionPlanPage() {
  const { siteId } = useAppContext();
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  const { plan, isLoading, error } = useProductionPlan(selectedDate, siteId);
  const dateRange = useMemo(() => getDateRange(7), []);

  const handlePrevDay = () => {
    const currentIndex = dateRange.indexOf(selectedDate);
    if (currentIndex > 0) {
      setSelectedDate(dateRange[currentIndex - 1]);
    }
  };

  const handleNextDay = () => {
    const currentIndex = dateRange.indexOf(selectedDate);
    if (currentIndex < dateRange.length - 1) {
      setSelectedDate(dateRange[currentIndex + 1]);
    }
  };

  const handleToday = () => {
    setSelectedDate(getTodayString());
  };

  const handlePrint = () => {
    window.print();
  };

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-white/60">Please select a site</div>
      </div>
    );
  }

  return (
    <div className="production-plan-container">
      {/* Controls - Hidden on Print */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handlePrevDay} className="p-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <StyledSelect
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-48"
          >
            {dateRange.map((date) => (
              <StyledOption key={date} value={date}>
                {formatDateDisplay(date)}
              </StyledOption>
            ))}
          </StyledSelect>

          <Button variant="ghost" onClick={handleNextDay} className="p-2">
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button variant="outline" onClick={handleToday}>
            Today
          </Button>
        </div>

        {/* Cutoff Warning */}
        {plan?.is_past_cutoff && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Lock className="h-4 w-4" />
            <span className="text-sm">Orders locked (past cutoff)</span>
          </div>
        )}

        {/* Print Button */}
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Print Production Plan
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-white/40 mr-2" />
          <span className="text-gray-500 dark:text-white/60">Loading production plan...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12 text-red-500 dark:text-red-400">
          Error loading production plan
        </div>
      )}

      {/* Content */}
      {plan && !isLoading && (
        <div className="space-y-8 print:space-y-6">
          {/* Section 1: Daily Book */}
          <DailyBookSection orders={plan.delivery_orders} date={selectedDate} />

          {/* Section 2: Production Tasks */}
          <ProductionTasksSection tasks={plan.production_tasks} date={selectedDate} />

          {/* Section 3: Supplementary Info */}
          {(plan.tray_setup.length > 0 || plan.cookie_layout.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-4">
                <TraySetupSection traySetup={plan.tray_setup} />
              </Card>
              <Card className="p-4">
                <CookieLayoutSection cookies={plan.cookie_layout} />
              </Card>
            </div>
          )}

          {/* Empty State */}
          {plan.delivery_orders.length === 0 &&
            plan.production_tasks.length === 0 && (
              <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-lg">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 dark:text-white/20 mb-4" />
                <p className="text-gray-500 dark:text-white/50">
                  No production activity scheduled for {formatDateDisplay(selectedDate)}
                </p>
              </div>
            )}
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          @page {
            size: A4;
            margin: 1cm;
          }

          body {
            font-size: 10pt;
            line-height: 1.3;
            color: #000 !important;
            background: #fff !important;
          }

          .production-plan-container {
            max-width: 100%;
            padding: 0;
          }

          .production-section {
            break-inside: avoid;
            margin-bottom: 1rem;
          }

          h2,
          h3,
          h4 {
            break-after: avoid;
            color: #000 !important;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th,
          td {
            border: 1px solid #ccc !important;
            padding: 4px 8px;
            color: #000 !important;
          }

          thead {
            background-color: #f0f0f0 !important;
          }
        }

        @media screen {
          .production-plan-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1.5rem;
          }

          .production-section {
            margin-bottom: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
