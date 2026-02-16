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
  Scale,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Clock,
  Truck,
  AlertCircle,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import StyledSelect, { StyledOption } from '@/components/ui/StyledSelect';
import { useProductionPlan, getDateRange, formatDateDisplay, getTodayString } from '@/hooks/planly/useProductionPlan';
import { useMixSheet } from '@/hooks/planly/useMixSheet';
import { useTrayLayout } from '@/hooks/planly/useTrayLayout';
import { useAppContext } from '@/context/AppContext';
import {
  ProductionPlan,
  DeliveryOrderSummary,
  ProductionTask,
  TrayRequirement,
  CookieRequirement,
  DoughMixResult,
  LaminationSheetResult,
  SheetSummary,
  TrayLayoutDestinationGroup,
  TrayLayoutEquipment,
} from '@/types/planly';
import { cn } from '@/lib/utils';

// Aggregate products across orders for Daily Book table
interface ProductRow {
  product_id: string;
  product_name: string;
  quantities: Record<string, number>;
  total: number;
}

function aggregateDeliveryOrders(orders: DeliveryOrderSummary[] | undefined): {
  productRows: ProductRow[];
  destinationGroups: { id: string; name: string }[];
} {
  const productMap = new Map<string, ProductRow>();
  const destGroups = new Map<string, string>();

  if (!orders || orders.length === 0) {
    return { productRows: [], destinationGroups: [] };
  }

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
function groupTasksByType(tasks: ProductionTask[] | undefined): Map<string, ProductionTask[]> {
  const groups = new Map<string, ProductionTask[]>();

  if (!tasks || tasks.length === 0) {
    return groups;
  }

  tasks.forEach((task) => {
    const key = task.stage_name;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(task);
  });

  return groups;
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="production-section border border-theme rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-theme-button hover:bg-theme-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-module-fg" />
          <h2 className="text-lg font-semibold text-theme-primary">{title}</h2>
          {badge !== undefined && (
            <span className="px-2 py-0.5 text-xs font-medium bg-module-fg/10 text-module-fg rounded-full">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-theme-tertiary" />
        ) : (
          <ChevronDown className="h-5 w-5 text-theme-tertiary" />
        )}
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
}

// Daily Book Section Component
function DailyBookSection({ orders, date }: { orders?: DeliveryOrderSummary[]; date: string }) {
  const { productRows, destinationGroups } = useMemo(
    () => aggregateDeliveryOrders(orders),
    [orders]
  );

  if (!orders || orders.length === 0) {
    return (
      <CollapsibleSection title={`Daily Book for ${formatDateDisplay(date)}`} icon={Package} badge={0}>
        <p className="text-theme-tertiary">No deliveries scheduled for this date</p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title={`Daily Book for ${formatDateDisplay(date)}`}
      icon={Package}
      badge={productRows.reduce((sum, r) => sum + r.total, 0)}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-theme-muted">
              <th className="border border-theme px-3 py-2 text-left font-semibold text-theme-primary">
                Product
              </th>
              {destinationGroups.map((dg) => (
                <th
                  key={dg.id}
                  className="border border-theme px-3 py-2 text-center font-semibold text-theme-primary"
                >
                  {dg.name}
                </th>
              ))}
              <th className="border border-theme px-3 py-2 text-center font-bold text-theme-primary bg-module-fg/10">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {productRows.map((row) => (
              <tr key={row.product_id} className="hover:bg-theme-hover">
                <td className="border border-theme px-3 py-2 text-theme-primary">
                  {row.product_name}
                </td>
                {destinationGroups.map((dg) => (
                  <td
                    key={dg.id}
                    className="border border-theme px-3 py-2 text-center text-theme-secondary"
                  >
                    {row.quantities[dg.id] || '-'}
                  </td>
                ))}
                <td className="border border-theme px-3 py-2 text-center font-bold text-theme-primary bg-module-fg/5">
                  {row.total}
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="bg-theme-muted font-semibold">
              <td className="border border-theme px-3 py-2 text-theme-primary">
                Total
              </td>
              {destinationGroups.map((dg) => {
                const total = productRows.reduce((sum, row) => sum + (row.quantities[dg.id] || 0), 0);
                return (
                  <td
                    key={dg.id}
                    className="border border-theme px-3 py-2 text-center text-theme-primary"
                  >
                    {total}
                  </td>
                );
              })}
              <td className="border border-theme px-3 py-2 text-center text-theme-primary bg-module-fg/10">
                {productRows.reduce((sum, r) => sum + r.total, 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  );
}

// Mix Sheet Section Component (using Base Doughs + Lamination Styles model)
function MixSheetSection({
  doughMixes,
  mixDay,
  sheetSummary,
  orderSummary,
  isLoading,
  selectedDate,
}: {
  doughMixes: DoughMixResult[];
  mixDay?: string;
  sheetSummary?: SheetSummary | null;
  orderSummary?: { confirmed_orders: number; pending_orders: number; pending_note?: string };
  isLoading: boolean;
  selectedDate: string;
}) {
  // Compute tomorrow's date for the title
  const tomorrow = useMemo(() => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }, [selectedDate]);

  if (isLoading) {
    return (
      <CollapsibleSection title={`Mix Sheets for ${formatDateDisplay(tomorrow)}`} icon={Scale}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-theme-tertiary mr-2" />
          <span className="text-theme-tertiary">Loading mix sheets...</span>
        </div>
      </CollapsibleSection>
    );
  }

  if (!doughMixes || doughMixes.length === 0) {
    return (
      <CollapsibleSection title={`Dough Sheets for ${formatDateDisplay(tomorrow)}`} icon={Scale} badge={0}>
        <p className="text-theme-tertiary">No mix sheets required for this date</p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title={`Dough Sheets for ${formatDateDisplay(tomorrow)}`}
      icon={Scale}
      badge={doughMixes.length}
    >
      {/* Order Summary Warning */}
      {orderSummary && orderSummary.pending_orders > 0 && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {orderSummary.pending_orders} pending order(s)
            </p>
            {orderSummary.pending_note && (
              <p className="text-xs text-amber-600 dark:text-amber-400/80">{orderSummary.pending_note}</p>
            )}
          </div>
        </div>
      )}

      {/* Sheet Summary */}
      {sheetSummary && sheetSummary.total_sheets > 0 && (
        <div className="mb-4 p-3 bg-module-fg/10 dark:bg-module-fg/10 border border-module-fg/20 dark:border-module-fg/20 rounded-lg">
          <h4 className="text-sm font-medium text-module-fg mb-2">
            Total Lamination Sheets: {sheetSummary.total_sheets}
          </h4>
          <div className="space-y-1">
            {sheetSummary.by_style.map((style, idx) => (
              <p key={idx} className="text-xs text-module-fg/80">
                • {style.style_name} ({style.base_dough_name}): {style.sheets_needed} sheets = {style.total_products} products
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {doughMixes.map((dough) => (
          <div key={dough.dough_id} className="border border-theme rounded-lg overflow-hidden">
            {/* Dough Mix Header */}
            <div className="bg-theme-muted px-4 py-3 border-b border-theme">
              <h3 className="font-semibold text-theme-primary">
                Dough Mix - {dough.dough_name}
              </h3>
              <div className="flex gap-4 mt-1 text-sm text-theme-secondary">
                <span>Total: <strong>{dough.total_kg.toFixed(2)} kg</strong></span>
                {dough.total_batches && (
                  <span>Batches: <strong>{dough.total_batches}</strong></span>
                )}
                {dough.lamination_styles.length > 0 && (
                  <span>
                    Sheets: <strong className="text-module-fg">
                      {dough.lamination_styles.reduce((sum, s) => sum + s.sheets_needed, 0)}
                    </strong>
                  </span>
                )}
              </div>
              {dough.recipe_name && (
                <p className="text-xs text-theme-tertiary mt-1">
                  Recipe: {dough.recipe_name} | Mix {dough.mix_lead_days} day(s) ahead
                </p>
              )}
            </div>

            <div className="p-4 space-y-4">
              {/* Lamination Sheets Section */}
              {dough.lamination_styles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-theme-secondary mb-2">
                    Lamination Sheets
                  </h4>
                  <p className="text-xs text-theme-tertiary mb-3">
                    Laminate these sheets today for production
                  </p>
                  <div className="space-y-3">
                    {dough.lamination_styles.map((style) => (
                      <div
                        key={style.style_id}
                        className="p-3 bg-module-fg/10 dark:bg-module-fg/10 rounded-lg border border-module-fg/20 dark:border-module-fg/20"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium text-theme-primary">
                              {style.style_name}
                            </span>
                            {style.recipe_name && (
                              <p className="text-xs text-theme-tertiary mt-0.5">
                                Recipe: {style.recipe_name}
                              </p>
                            )}
                            <p className="text-xs text-theme-tertiary">
                              {style.products_per_sheet} products/sheet • {style.laminate_lead_days} day(s) ahead
                            </p>
                          </div>
                          <span className="text-lg font-bold text-module-fg">
                            {style.sheets_needed} sheet{style.sheets_needed !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Products in this lamination style */}
                        {style.products.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-module-fg/20 dark:border-module-fg/20">
                            <p className="text-xs text-theme-secondary mb-1">
                              Products ({style.total_products} total):
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {style.products.map((product, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-white dark:bg-white/10 px-2 py-0.5 rounded"
                                >
                                  {product.name}: {product.quantity}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Lamination Recipe Ingredients */}
                        {style.ingredients.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-module-fg/20 dark:border-module-fg/20">
                            <p className="text-xs font-medium text-theme-secondary mb-1">
                              Total ingredients for {style.sheets_needed} sheets:
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                              {style.ingredients.map((ing, idx) => (
                                <p key={idx} className="text-xs text-theme-secondary">
                                  • {ing.name}: {ing.quantity.toFixed(2)} {ing.unit}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Products (Non-laminated) */}
              {dough.direct_products.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-theme-secondary mb-2">
                    Direct Products (Non-laminated)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {dough.direct_products.map((product, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-theme-button rounded-lg border border-theme"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-theme-primary">{product.name}</span>
                          <span className="text-sm text-theme-tertiary">
                            {product.quantity} units
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {dough.total_batches && dough.batch_size_kg && (
                    <p className="text-xs text-theme-tertiary mt-2">
                      {dough.total_batches} batches × {dough.batch_size_kg}kg = {(dough.total_batches * dough.batch_size_kg).toFixed(2)}kg
                    </p>
                  )}
                </div>
              )}

              {/* Base Dough Ingredients */}
              {dough.ingredients.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-theme-secondary mb-2">
                    Dough Ingredients (for {dough.total_kg.toFixed(2)} kg)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {dough.ingredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-2 bg-theme-surface rounded border border-theme"
                      >
                        <span className="text-sm text-theme-secondary truncate">{ing.name}</span>
                        <span className="text-sm font-mono font-medium text-theme-primary ml-2">
                          {ing.quantity.toFixed(2)} {ing.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

// Tray Layout Section Component
function TrayLayoutSection({
  destinationGroups,
  isLoading,
  selectedDate,
}: {
  destinationGroups: TrayLayoutDestinationGroup[];
  isLoading: boolean;
  selectedDate: string;
}) {
  // Compute tomorrow's date for the title
  const tomorrow = useMemo(() => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }, [selectedDate]);

  if (isLoading) {
    return (
      <CollapsibleSection title={`Tray Layout for ${formatDateDisplay(tomorrow)}`} icon={LayoutGrid}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-theme-tertiary mr-2" />
          <span className="text-theme-tertiary">Loading tray layout...</span>
        </div>
      </CollapsibleSection>
    );
  }

  if (!destinationGroups || destinationGroups.length === 0) {
    return (
      <CollapsibleSection title={`Tray Layout for ${formatDateDisplay(tomorrow)}`} icon={LayoutGrid} badge={0}>
        <p className="text-theme-tertiary">No tray layouts required for this date</p>
      </CollapsibleSection>
    );
  }

  const totalEquipment = destinationGroups.reduce((sum, dg) => sum + dg.summary.total_equipment, 0);
  const totalItems = destinationGroups.reduce((sum, dg) => sum + dg.summary.total_items, 0);

  return (
    <CollapsibleSection
      title={`Tray Layout for ${formatDateDisplay(tomorrow)}`}
      icon={LayoutGrid}
      badge={`${totalEquipment} trays`}
    >
      <div className="space-y-6">
        {destinationGroups.map((destGroup) => (
          <div key={destGroup.destination_group_id} className="border border-theme rounded-lg overflow-hidden">
            {/* Destination Group Header */}
            <div className="bg-theme-muted px-4 py-3 border-b border-theme">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-theme-primary">{destGroup.destination_group_name}</h3>
                <div className="flex items-center gap-4 text-sm">
                  {destGroup.bake_deadline && (
                    <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                      <Flame className="h-3 w-3" />
                      Bake by {destGroup.bake_deadline}
                    </span>
                  )}
                  {destGroup.dispatch_time && (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Truck className="h-3 w-3" />
                      Dispatch {destGroup.dispatch_time}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-4 mt-1 text-sm text-theme-secondary">
                <span>Trays: <strong>{destGroup.summary.total_equipment}</strong></span>
                <span>Items: <strong>{destGroup.summary.total_items}</strong></span>
                <span>Utilization: <strong>{destGroup.summary.utilization_percent}%</strong></span>
              </div>
            </div>

            {/* Equipment Grid */}
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {destGroup.equipment.map((equip) => (
                  <div
                    key={equip.number}
                    className="p-3 bg-theme-surface rounded-lg border border-theme"
                  >
                    {/* Tray Number */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-module-fg bg-module-fg/10 px-2 py-0.5 rounded">
                        Tray {equip.number}
                      </span>
                      <span className="text-xs text-theme-tertiary">
                        {equip.used}/{equip.capacity}
                      </span>
                    </div>
                    {/* Bake Group */}
                    <div className="text-xs text-theme-tertiary mb-2">{equip.bake_group}</div>
                    {/* Items */}
                    <div className="space-y-1">
                      {equip.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-theme-secondary truncate">{item.product}</span>
                          <span className="font-mono font-medium text-theme-primary ml-1">{item.qty}</span>
                        </div>
                      ))}
                    </div>
                    {/* Utilization Bar */}
                    <div className="mt-2 h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          equip.used === equip.capacity
                            ? 'bg-module-fg'
                            : equip.used / equip.capacity > 0.8
                            ? 'bg-amber-500'
                            : 'bg-gray-400'
                        )}
                        style={{ width: `${(equip.used / equip.capacity) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}

// Production Tasks Section Component
function ProductionTasksSection({ tasks, date }: { tasks?: ProductionTask[]; date: string }) {
  const taskGroups = useMemo(() => groupTasksByType(tasks), [tasks]);

  if (!tasks || tasks.length === 0) {
    return (
      <CollapsibleSection title={`Production Tasks for ${formatDateDisplay(date)}`} icon={Clock} badge={0}>
        <p className="text-theme-tertiary">No production tasks for this date</p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection title={`Production Tasks for ${formatDateDisplay(date)}`} icon={Clock} badge={tasks.length}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              <h3 className="font-semibold text-theme-primary mb-1">{stageName}</h3>
              {deliveryDate && (
                <p className="text-xs text-theme-tertiary mb-3">
                  For delivery: {formatDateDisplay(deliveryDate)}
                </p>
              )}
              <div className="space-y-2">
                {Object.entries(productTotals).map(([productId, data]) => (
                  <div
                    key={productId}
                    className="flex justify-between items-center py-1 border-b border-theme last:border-0"
                  >
                    <span className="text-theme-secondary">{data.product_name}</span>
                    <span className="font-mono font-semibold text-theme-primary">
                      {data.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

// Tray Setup Section Component (Legacy)
function TraySetupSection({ traySetup }: { traySetup?: TrayRequirement[] }) {
  if (!traySetup || traySetup.length === 0) {
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
      <h3 className="font-semibold text-theme-primary mb-3 flex items-center gap-2">
        <Flame className="h-4 w-4 text-orange-500" />
        Tray Setup (Legacy)
      </h3>

      <div className="space-y-4">
        {Object.entries(groupedByBakeGroup).map(([groupName, items]) => (
          <div key={groupName}>
            <h4 className="text-sm font-medium text-theme-secondary mb-2">{groupName}</h4>
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item.product_id}
                  className="flex justify-between items-center py-1 text-sm"
                >
                  <span className="text-theme-secondary">{item.product_name}</span>
                  <span className="text-theme-secondary">
                    Trays {item.tray_start}-{item.tray_end}{' '}
                    <span className="text-xs text-theme-tertiary">({item.items_per_tray}/tray)</span>
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
function CookieLayoutSection({ cookies }: { cookies?: CookieRequirement[] }) {
  if (!cookies || cookies.length === 0) {
    return null;
  }

  return (
    <div className="production-section" id="cookie-layout">
      <h3 className="font-semibold text-theme-primary mb-3 flex items-center gap-2">
        <Cookie className="h-4 w-4 text-amber-500" />
        Cookies to Layout
      </h3>

      <div className="space-y-1">
        {cookies.map((cookie) => (
          <div
            key={cookie.product_id}
            className="flex justify-between items-center py-1 text-sm"
          >
            <span className="text-theme-secondary">{cookie.product_name}</span>
            <span className="font-mono font-semibold text-theme-primary">
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
  const { plan, isLoading: planLoading, error: planError } = useProductionPlan(selectedDate, siteId);
  const { mixSheet, isLoading: mixSheetLoading } = useMixSheet(selectedDate, siteId);
  const { trayLayout, isLoading: trayLayoutLoading } = useTrayLayout(selectedDate, siteId);

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
        <div className="text-theme-tertiary">Please select a site</div>
      </div>
    );
  }

  const isLoading = planLoading || mixSheetLoading || trayLayoutLoading;

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
        <Button onClick={handlePrint} disabled={isLoading} className="gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      {/* Error State */}
      {planError && (
        <div className="text-center py-12 text-red-500 dark:text-red-400">
          Error loading production plan
        </div>
      )}

      {/* Content */}
      <div className="space-y-4 print:space-y-6">
        {/* Section 1: Daily Book */}
        {plan && <DailyBookSection orders={plan.delivery_orders} date={selectedDate} />}

        {/* Section 2: Mix Sheets (Opsly) */}
        <MixSheetSection
          doughMixes={mixSheet?.dough_mixes || []}
          mixDay={mixSheet?.mix_day}
          sheetSummary={mixSheet?.sheet_summary}
          orderSummary={mixSheet?.order_summary}
          isLoading={mixSheetLoading}
          selectedDate={selectedDate}
        />

        {/* Section 3: Tray Layout (Opsly) */}
        <TrayLayoutSection
          destinationGroups={trayLayout?.destination_groups || []}
          isLoading={trayLayoutLoading}
          selectedDate={selectedDate}
        />

        {/* Section 4: Production Tasks */}
        {plan && <ProductionTasksSection tasks={plan.production_tasks} date={selectedDate} />}

        {/* Section 5: Legacy Supplementary Info */}
        {plan && ((plan.tray_setup?.length || 0) > 0 || (plan.cookie_layout?.length || 0) > 0) && (
          <CollapsibleSection title="Additional Info" icon={Cookie} defaultOpen={false}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(plan.tray_setup?.length || 0) > 0 && (
                <Card className="p-4">
                  <TraySetupSection traySetup={plan.tray_setup} />
                </Card>
              )}
              {(plan.cookie_layout?.length || 0) > 0 && (
                <Card className="p-4">
                  <CookieLayoutSection cookies={plan.cookie_layout} />
                </Card>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Empty State */}
        {!isLoading &&
          plan?.delivery_orders?.length === 0 &&
          plan?.production_tasks?.length === 0 &&
          (!mixSheet?.dough_mixes || mixSheet.dough_mixes.length === 0) &&
          (!trayLayout?.destination_groups || trayLayout.destination_groups.length === 0) && (
            <div className="text-center py-12 bg-theme-button rounded-lg">
              <Calendar className="h-12 w-12 mx-auto text-gray-300 dark:text-white/20 mb-4" />
              <p className="text-theme-tertiary">
                No production activity scheduled for {formatDateDisplay(selectedDate)}
              </p>
            </div>
          )}
      </div>

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

          /* Ensure sections are visible when printing */
          .production-section > div {
            display: block !important;
          }
        }

        @media screen {
          .production-plan-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 1.5rem;
          }

          .production-section {
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
