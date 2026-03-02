"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { ModuleId } from "@/types/dashboard";
import { startOfDay, endOfDay } from "date-fns";

interface HubMetric {
  label: string;
  value: string | number;
}

interface ModuleHubData {
  metrics: HubMetric[];
  loading: boolean;
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function fmtGBP(n: number): string {
  if (n >= 1000) return `£${(n / 1000).toFixed(1)}k`;
  return `£${n.toFixed(0)}`;
}

function pct(n: number, d: number): string {
  if (d === 0) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

async function fetchChecklyKPIs(
  companyId: string,
  siteId: string | null,
  startDate: string,
  endDate: string
): Promise<HubMetric[]> {
  const siteFilter = siteId && siteId !== "all" ? siteId : null;

  // Get site IDs for company if no specific site
  let siteIds: string[] | null = null;
  if (!siteFilter) {
    const { data: sites } = await supabase.from("sites").select("id").eq("company_id", companyId);
    siteIds = sites?.map((s) => s.id) || [];
  }

  const buildQuery = (table: string, select: string) => {
    let q = supabase.from(table).select(select, { count: "exact", head: true });
    if (table === "checklist_tasks") {
      q = q.gte("due_date", startDate).lte("due_date", endDate);
      if (siteFilter) q = q.eq("site_id", siteFilter);
      else if (siteIds && siteIds.length > 0) q = q.in("site_id", siteIds);
    } else {
      q = q.eq("company_id", companyId);
      q = q.gte("created_at", startOfDay(new Date(startDate)).toISOString());
      q = q.lte("created_at", endOfDay(new Date(endDate)).toISOString());
      if (siteFilter) q = q.eq("site_id", siteFilter);
    }
    return q;
  };

  const [tasksAll, tasksCompleted, incidents, tempBreaches] = await Promise.allSettled([
    buildQuery("checklist_tasks", "id"),
    buildQuery("checklist_tasks", "id").eq("status", "completed"),
    buildQuery("incidents", "id"),
    buildQuery("temperature_logs", "id").neq("status", "ok"),
  ]);

  const total = tasksAll.status === "fulfilled" ? tasksAll.value.count || 0 : 0;
  const completed = tasksCompleted.status === "fulfilled" ? tasksCompleted.value.count || 0 : 0;
  const incidentCount = incidents.status === "fulfilled" ? incidents.value.count || 0 : 0;
  const breachCount = tempBreaches.status === "fulfilled" ? tempBreaches.value.count || 0 : 0;

  return [
    { label: "Compliance", value: pct(completed, total) },
    { label: "Tasks Done", value: fmt(completed) },
    { label: "Incidents", value: incidentCount },
    { label: "Temp Breaches", value: breachCount },
  ];
}

async function fetchStocklyKPIs(
  companyId: string,
  siteId: string | null,
  startDate: string,
  endDate: string
): Promise<HubMetric[]> {
  const siteFilter = siteId && siteId !== "all" ? siteId : null;

  const [stockValue, deliveries, wastage] = await Promise.allSettled([
    (async () => {
      let q = supabase.from("stock_levels").select("value");
      if (siteFilter) q = q.eq("site_id", siteFilter);
      const { data } = await q;
      return data?.reduce((sum, r) => sum + (r.value || 0), 0) || 0;
    })(),
    (async () => {
      let q = supabase
        .from("deliveries")
        .select("total")
        .eq("company_id", companyId)
        .gte("delivery_date", startDate)
        .lte("delivery_date", endDate);
      if (siteFilter) q = q.eq("site_id", siteFilter);
      const { data } = await q;
      return data?.reduce((sum, r) => sum + (r.total || 0), 0) || 0;
    })(),
    (async () => {
      let q = supabase
        .from("waste_logs")
        .select("id, waste_log_lines(line_cost)")
        .eq("company_id", companyId)
        .gte("waste_date", startDate)
        .lte("waste_date", endDate);
      if (siteFilter) q = q.eq("site_id", siteFilter);
      const { data } = await q;
      let total = 0;
      data?.forEach((log: any) => {
        if (Array.isArray(log.waste_log_lines)) {
          log.waste_log_lines.forEach((line: any) => {
            total += line.line_cost || 0;
          });
        }
      });
      return total;
    })(),
  ]);

  return [
    { label: "Stock Value", value: fmtGBP(stockValue.status === "fulfilled" ? stockValue.value : 0) },
    { label: "Monthly Spend", value: fmtGBP(deliveries.status === "fulfilled" ? deliveries.value : 0) },
    { label: "Wastage", value: fmtGBP(wastage.status === "fulfilled" ? wastage.value : 0) },
  ];
}

async function fetchTeamlyKPIs(
  companyId: string,
  siteId: string | null
): Promise<HubMetric[]> {
  const siteFilter = siteId && siteId !== "all" ? siteId : null;
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysOut = new Date(Date.now() + 30 * 86400000).toISOString();

  const [shiftsToday, trainingExpiries] = await Promise.allSettled([
    // schedule_shifts table not yet created — return 0 to avoid 404
    Promise.resolve(0),
    (async () => {
      let q = supabase
        .from("training_records")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .lte("expiry_date", thirtyDaysOut)
        .gte("expiry_date", today);
      const { count } = await q;
      return count || 0;
    })(),
  ]);

  return [
    { label: "Shifts Today", value: shiftsToday.status === "fulfilled" ? shiftsToday.value : 0 },
    { label: "Training Expiries", value: trainingExpiries.status === "fulfilled" ? trainingExpiries.value : 0 },
  ];
}

async function fetchPlanlyKPIs(
  companyId: string,
  siteId: string | null
): Promise<HubMetric[]> {
  const siteFilter = siteId && siteId !== "all" ? siteId : null;
  const today = new Date().toISOString().split("T")[0];

  // planly_orders filters through planly_customers.site_id, not direct company_id
  let targetSiteIds: string[];
  if (siteFilter) {
    targetSiteIds = [siteFilter];
  } else {
    const { data: sites } = await supabase.from("sites").select("id").eq("company_id", companyId);
    targetSiteIds = sites?.map((s) => s.id) || [];
  }
  if (targetSiteIds.length === 0) return [{ label: "Orders Today", value: 0 }, { label: "Pending Orders", value: 0 }];

  const { data: customers } = await supabase
    .from("planly_customers")
    .select("id")
    .in("site_id", targetSiteIds)
    .eq("is_active", true);
  const customerIds = customers?.map((c) => c.id) || [];
  if (customerIds.length === 0) return [{ label: "Orders Today", value: 0 }, { label: "Pending Orders", value: 0 }];

  const [ordersToday, pendingOrders] = await Promise.allSettled([
    (async () => {
      const { data } = await supabase
        .from("planly_orders")
        .select("id, status")
        .in("customer_id", customerIds)
        .eq("delivery_date", today);
      const total = data?.length || 0;
      const fulfilled = data?.filter((o) => o.status === "locked" || o.status === "dispatched").length || 0;
      return { total, fulfilled };
    })(),
    (async () => {
      const { count } = await supabase
        .from("planly_orders")
        .select("id", { count: "exact", head: true })
        .in("customer_id", customerIds)
        .in("status", ["draft", "confirmed"]);
      return count || 0;
    })(),
  ]);

  const prod = ordersToday.status === "fulfilled" ? ordersToday.value : { total: 0, fulfilled: 0 };

  return [
    { label: "Orders Today", value: `${prod.fulfilled}/${prod.total}` },
    { label: "Pending Orders", value: pendingOrders.status === "fulfilled" ? pendingOrders.value : 0 },
  ];
}

async function fetchAssetlyKPIs(
  companyId: string,
  siteId: string | null
): Promise<HubMetric[]> {
  const siteFilter = siteId && siteId !== "all" ? siteId : null;
  const today = new Date().toISOString().split("T")[0];

  const [totalAssets, overduePPM, activeCallouts] = await Promise.allSettled([
    (async () => {
      let q = supabase
        .from("assets")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("archived", false);
      if (siteFilter) q = q.eq("site_id", siteFilter);
      const { count } = await q;
      return count || 0;
    })(),
    (async () => {
      let q = supabase
        .from("ppm_schedules")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .lt("next_due_date", today);
      if (siteFilter) q = q.eq("site_id", siteFilter);
      const { count } = await q;
      return count || 0;
    })(),
    (async () => {
      let q = supabase
        .from("callouts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .in("status", ["open", "reopened"]);
      if (siteFilter) q = q.eq("site_id", siteFilter);
      const { count } = await q;
      return count || 0;
    })(),
  ]);

  return [
    { label: "Total Assets", value: totalAssets.status === "fulfilled" ? totalAssets.value : 0 },
    { label: "Overdue PPM", value: overduePPM.status === "fulfilled" ? overduePPM.value : 0 },
    { label: "Active Callouts", value: activeCallouts.status === "fulfilled" ? activeCallouts.value : 0 },
  ];
}

export function useReportHubData(
  enabledModules: ModuleId[],
  dateRange: { start: string; end: string },
  siteId: string | null
) {
  const { companyId } = useAppContext();
  const [data, setData] = useState<Record<ModuleId, ModuleHubData>>({
    checkly: { metrics: [], loading: true },
    stockly: { metrics: [], loading: true },
    teamly: { metrics: [], loading: true },
    planly: { metrics: [], loading: true },
    assetly: { metrics: [], loading: true },
    msgly: { metrics: [], loading: false },
  });

  useEffect(() => {
    if (!companyId) return;

    const fetchers: Record<string, () => Promise<{ moduleId: ModuleId; metrics: HubMetric[] }>> = {};

    if (enabledModules.includes("checkly")) {
      fetchers.checkly = async () => ({
        moduleId: "checkly",
        metrics: await fetchChecklyKPIs(companyId, siteId, dateRange.start, dateRange.end),
      });
    }
    if (enabledModules.includes("stockly")) {
      fetchers.stockly = async () => ({
        moduleId: "stockly",
        metrics: await fetchStocklyKPIs(companyId, siteId, dateRange.start, dateRange.end),
      });
    }
    if (enabledModules.includes("teamly")) {
      fetchers.teamly = async () => ({
        moduleId: "teamly",
        metrics: await fetchTeamlyKPIs(companyId, siteId),
      });
    }
    if (enabledModules.includes("planly")) {
      fetchers.planly = async () => ({
        moduleId: "planly",
        metrics: await fetchPlanlyKPIs(companyId, siteId),
      });
    }
    if (enabledModules.includes("assetly")) {
      fetchers.assetly = async () => ({
        moduleId: "assetly",
        metrics: await fetchAssetlyKPIs(companyId, siteId),
      });
    }

    // Set loading state
    setData((prev) => {
      const next = { ...prev };
      Object.keys(fetchers).forEach((key) => {
        next[key as ModuleId] = { ...next[key as ModuleId], loading: true };
      });
      return next;
    });

    // Fetch all in parallel
    Promise.allSettled(Object.values(fetchers).map((fn) => fn())).then((results) => {
      setData((prev) => {
        const next = { ...prev };
        results.forEach((result) => {
          if (result.status === "fulfilled") {
            next[result.value.moduleId] = {
              metrics: result.value.metrics,
              loading: false,
            };
          }
        });
        // Set any that failed to not loading
        Object.keys(fetchers).forEach((key) => {
          if (next[key as ModuleId].loading) {
            next[key as ModuleId] = { metrics: [], loading: false };
          }
        });
        return next;
      });
    });
  }, [companyId, enabledModules.join(","), dateRange.start, dateRange.end, siteId]);

  return data;
}
