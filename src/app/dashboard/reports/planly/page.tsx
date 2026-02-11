"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { useReportFilters } from "@/components/reports/hooks/useReportFilters";
import ReportPageHeader from "@/components/reports/ReportPageHeader";
import ReportFiltersBar from "@/components/reports/ReportFiltersBar";
import ReportMetricCard from "@/components/reports/ReportMetricCard";
import ReportEmptyState from "@/components/reports/ReportEmptyState";
import { supabase } from "@/lib/supabase";
import {
  Factory,
  ShoppingCart,
  Users,
  TrendingUp,
  Loader2,
  CheckCircle2,
  Clock,
  Lock,
  Truck,
} from '@/components/ui/icons';
import { format } from "date-fns";

type Tab = "production" | "orders" | "customers";

const tabs: { id: Tab; label: string; icon: typeof Factory }[] = [
  { id: "production", label: "Production", icon: Factory },
  { id: "orders", label: "Order Fulfillment", icon: ShoppingCart },
  { id: "customers", label: "Customer Analysis", icon: Users },
];

/**
 * Get customer IDs for a company (via sites) or a specific site.
 * planly_customers filters by site_id, not company_id.
 */
async function getCustomerIds(companyId: string, siteId: string | null): Promise<string[]> {
  const siteFilter = siteId && siteId !== "all" ? siteId : null;

  let targetSiteIds: string[];
  if (siteFilter) {
    targetSiteIds = [siteFilter];
  } else {
    const { data: sites } = await supabase.from("sites").select("id").eq("company_id", companyId);
    targetSiteIds = sites?.map((s) => s.id) || [];
  }

  if (targetSiteIds.length === 0) return [];

  const { data: customers } = await supabase
    .from("planly_customers")
    .select("id")
    .in("site_id", targetSiteIds)
    .eq("is_active", true);

  return customers?.map((c) => c.id) || [];
}

export default function PlanlyReportsPage() {
  const { companyId } = useAppContext();
  const { dateRange, siteId } = useReportFilters();
  const [activeTab, setActiveTab] = useState<Tab>("production");

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-5">
      <ReportPageHeader title="Planly Reports" subtitle="Production output, order fulfillment, and customer analysis" />
      <ReportFiltersBar />

      <div className="flex gap-1 sm:gap-2 border-b border-gray-200 dark:border-white/[0.1] overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 sm:px-3 md:px-4 py-2 sm:py-3 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id ? "border-orange-500 text-orange-400" : "border-transparent text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        {activeTab === "production" && companyId && (
          <ProductionSection companyId={companyId} siteId={siteId} dateRange={dateRange} />
        )}
        {activeTab === "orders" && companyId && (
          <OrdersSection companyId={companyId} siteId={siteId} dateRange={dateRange} />
        )}
        {activeTab === "customers" && companyId && (
          <CustomerSection companyId={companyId} siteId={siteId} />
        )}
      </div>
    </div>
  );
}

function ProductionSection({
  companyId,
  siteId,
  dateRange,
}: {
  companyId: string;
  siteId: string | null;
  dateRange: { start: string; end: string };
}) {
  const [data, setData] = useState<{
    total: number;
    confirmed: number;
    locked: number;
    dispatched: number;
    pending: number;
    completionRate: number;
    daily: Array<{ date: string; fulfilled: number; total: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const customerIds = await getCustomerIds(companyId, siteId);
        if (customerIds.length === 0) {
          setData({ total: 0, confirmed: 0, locked: 0, dispatched: 0, pending: 0, completionRate: 0, daily: [] });
          setLoading(false);
          return;
        }

        const { data: orders, error } = await supabase
          .from("planly_orders")
          .select("id, status, delivery_date")
          .in("customer_id", customerIds)
          .gte("delivery_date", dateRange.start)
          .lte("delivery_date", dateRange.end);

        if (error) {
          console.debug("Production query error (handled):", error.code || error.message);
          setData({ total: 0, confirmed: 0, locked: 0, dispatched: 0, pending: 0, completionRate: 0, daily: [] });
          return;
        }

        const result = {
          total: orders?.length || 0,
          confirmed: 0,
          locked: 0,
          dispatched: 0,
          pending: 0,
          completionRate: 0,
          daily: [] as Array<{ date: string; fulfilled: number; total: number }>,
        };

        const dailyMap = new Map<string, { fulfilled: number; total: number }>();

        orders?.forEach((o) => {
          if (o.status === "locked") result.locked++;
          else if (o.status === "dispatched") result.dispatched++;
          else if (o.status === "confirmed") result.confirmed++;
          else result.pending++;

          const date = o.delivery_date;
          if (date) {
            const entry = dailyMap.get(date) || { fulfilled: 0, total: 0 };
            entry.total++;
            if (o.status === "locked" || o.status === "dispatched") entry.fulfilled++;
            dailyMap.set(date, entry);
          }
        });

        result.completionRate = result.total > 0
          ? Math.round(((result.locked + result.dispatched) / result.total) * 100)
          : 0;
        result.daily = Array.from(dailyMap.entries())
          .map(([date, d]) => ({ date, ...d }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setData(result);
      } catch (error) {
        console.error("Error loading production:", error);
        setData({ total: 0, confirmed: 0, locked: 0, dispatched: 0, pending: 0, completionRate: 0, daily: [] });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId, siteId, dateRange.start, dateRange.end]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
        <span className="ml-3 text-gray-500 dark:text-white/60">Loading production data...</span>
      </div>
    );
  }

  if (!data) return <ReportEmptyState icon={Factory} message="No production data available" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ReportMetricCard label="Total Orders" value={data.total} icon={Factory} color="orange" />
        <ReportMetricCard label="Confirmed" value={data.confirmed} icon={CheckCircle2} color="blue" />
        <ReportMetricCard label="Locked" value={data.locked} icon={Lock} color="green" />
        <ReportMetricCard label="Dispatched" value={data.dispatched} icon={Truck} color="green" />
      </div>

      {/* Completion Rate */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fulfilment Rate</h3>
          <span className={`text-3xl font-bold ${data.completionRate >= 90 ? "text-green-400" : data.completionRate >= 70 ? "text-yellow-400" : "text-red-400"}`}>
            {data.completionRate}%
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-white/[0.05] rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${data.completionRate >= 90 ? "bg-green-500" : data.completionRate >= 70 ? "bg-yellow-500" : "bg-red-500"}`}
            style={{ width: `${data.completionRate}%` }}
          />
        </div>
      </div>

      {/* Daily Breakdown */}
      {data.daily.length > 0 && (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Delivery Schedule</h3>
          <div className="space-y-2">
            {data.daily.slice(-14).map((day) => {
              const rate = day.total > 0 ? Math.round((day.fulfilled / day.total) * 100) : 0;
              return (
                <div key={day.date} className="flex items-center gap-4">
                  <span className="text-sm text-gray-500 dark:text-white/60 w-24">{format(new Date(day.date), "MMM dd")}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-white/[0.05] rounded-full h-6 relative">
                    <div
                      className={`h-6 rounded-full ${rate >= 90 ? "bg-green-500" : rate >= 70 ? "bg-yellow-500" : "bg-orange-500"}`}
                      style={{ width: `${rate}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                      {day.fulfilled}/{day.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersSection({
  companyId,
  siteId,
  dateRange,
}: {
  companyId: string;
  siteId: string | null;
  dateRange: { start: string; end: string };
}) {
  const [data, setData] = useState<{
    total: number;
    pending: number;
    confirmed: number;
    locked: number;
    dispatched: number;
    revenue: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const customerIds = await getCustomerIds(companyId, siteId);
        if (customerIds.length === 0) {
          setData({ total: 0, pending: 0, confirmed: 0, locked: 0, dispatched: 0, revenue: 0 });
          setLoading(false);
          return;
        }

        const { data: orders, error } = await supabase
          .from("planly_orders")
          .select("id, status, total_value")
          .in("customer_id", customerIds)
          .gte("delivery_date", dateRange.start)
          .lte("delivery_date", dateRange.end);

        if (error) {
          console.debug("Orders query error (handled):", error.code || error.message);
          setData({ total: 0, pending: 0, confirmed: 0, locked: 0, dispatched: 0, revenue: 0 });
          return;
        }

        const result = { total: orders?.length || 0, pending: 0, confirmed: 0, locked: 0, dispatched: 0, revenue: 0 };
        orders?.forEach((o: any) => {
          if (o.status === "pending") result.pending++;
          else if (o.status === "confirmed") result.confirmed++;
          else if (o.status === "locked") result.locked++;
          else if (o.status === "dispatched") result.dispatched++;
          result.revenue += o.total_value || 0;
        });

        setData(result);
      } catch (error) {
        console.error("Error loading orders:", error);
        setData({ total: 0, pending: 0, confirmed: 0, locked: 0, dispatched: 0, revenue: 0 });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId, siteId, dateRange.start, dateRange.end]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
        <span className="ml-3 text-gray-500 dark:text-white/60">Loading order data...</span>
      </div>
    );
  }

  if (!data) return <ReportEmptyState icon={ShoppingCart} message="No order data available" />;

  const fmtGBP = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <ReportMetricCard label="Total Orders" value={data.total} icon={ShoppingCart} color="orange" />
        <ReportMetricCard label="Pending" value={data.pending} icon={Clock} color="yellow" />
        <ReportMetricCard label="Confirmed" value={data.confirmed} icon={CheckCircle2} color="blue" />
        <ReportMetricCard label="Locked" value={data.locked} icon={Lock} color="green" />
        <ReportMetricCard label="Revenue" value={fmtGBP(data.revenue)} icon={TrendingUp} color="green" />
      </div>

      {/* Status Breakdown */}
      {data.total > 0 && (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Status Pipeline</h3>
          <div className="flex gap-2 h-8">
            {[
              { label: "Pending", count: data.pending, color: "bg-yellow-500" },
              { label: "Confirmed", count: data.confirmed, color: "bg-blue-500" },
              { label: "Locked", count: data.locked, color: "bg-green-500" },
              { label: "Dispatched", count: data.dispatched, color: "bg-emerald-500" },
            ]
              .filter((s) => s.count > 0)
              .map((s) => (
                <div
                  key={s.label}
                  className={`${s.color} rounded-md flex items-center justify-center text-xs font-medium text-white px-2`}
                  style={{ width: `${(s.count / data.total) * 100}%`, minWidth: "40px" }}
                >
                  {s.label} ({s.count})
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerSection({ companyId, siteId }: { companyId: string; siteId: string | null }) {
  const [data, setData] = useState<Array<{ name: string; orderCount: number; totalSpend: number }> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const customerIds = await getCustomerIds(companyId, siteId);
        if (customerIds.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        const { data: orders, error } = await supabase
          .from("planly_orders")
          .select("id, total_value, customer:planly_customers(name)")
          .in("customer_id", customerIds);

        if (error) {
          console.debug("Customer orders query error (handled):", error.code || error.message);
          setData([]);
          return;
        }

        const customerMap = new Map<string, { name: string; orderCount: number; totalSpend: number }>();
        orders?.forEach((o: any) => {
          const name = o.customer?.name || "Unknown Customer";
          const existing = customerMap.get(name) || { name, orderCount: 0, totalSpend: 0 };
          existing.orderCount++;
          existing.totalSpend += o.total_value || 0;
          customerMap.set(name, existing);
        });

        setData(Array.from(customerMap.values()).sort((a, b) => b.totalSpend - a.totalSpend));
      } catch (error) {
        console.error("Error loading customers:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId, siteId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
        <span className="ml-3 text-gray-500 dark:text-white/60">Loading customer data...</span>
      </div>
    );
  }

  if (!data || data.length === 0) return <ReportEmptyState icon={Users} message="No customer order data available" />;

  const fmtGBP = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0 }).format(n);

  const maxSpend = data[0]?.totalSpend || 1;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Customers by Revenue</h3>
        <div className="space-y-3">
          {data.slice(0, 15).map((customer) => (
            <div key={customer.name} className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <span className="text-gray-700 dark:text-white/80 truncate block">{customer.name}</span>
                <span className="text-xs text-gray-400 dark:text-white/40">{customer.orderCount} orders</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-100 dark:bg-white/[0.05] rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${(customer.totalSpend / maxSpend) * 100}%` }}
                  />
                </div>
                <span className="text-gray-900 dark:text-white font-semibold w-20 text-right">{fmtGBP(customer.totalSpend)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
