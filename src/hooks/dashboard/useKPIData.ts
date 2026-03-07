'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export interface KPIMetric {
  value: number;
  total?: number;
  sparkline: number[];
  trend: number; // percentage change vs prior period
  status: 'good' | 'warning' | 'urgent' | 'neutral';
}

export interface KPIData {
  tasksCompleted: KPIMetric;
  complianceScore: KPIMetric;
  openIncidents: KPIMetric;
  pendingOrders: KPIMetric;
  staffOnShift: KPIMetric;
  loading: boolean;
}

const EMPTY_METRIC: KPIMetric = {
  value: 0,
  sparkline: [],
  trend: 0,
  status: 'neutral',
};

function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function calcTrend(sparkline: number[]): number {
  if (sparkline.length < 2) return 0;
  const today = sparkline[sparkline.length - 1];
  const prior = sparkline.slice(0, -1);
  const avg = prior.reduce((a, b) => a + b, 0) / prior.length;
  if (avg === 0) return today > 0 ? 100 : 0;
  return Math.round(((today - avg) / avg) * 100);
}

export function useKPIData(): KPIData {
  const { companyId, siteId } = useAppContext();
  const [data, setData] = useState<KPIData>({
    tasksCompleted: EMPTY_METRIC,
    complianceScore: EMPTY_METRIC,
    openIncidents: EMPTY_METRIC,
    pendingOrders: EMPTY_METRIC,
    staffOnShift: EMPTY_METRIC,
    loading: true,
  });

  useEffect(() => {
    if (!companyId) {
      setData((prev) => ({ ...prev, loading: false }));
      return;
    }

    async function fetchAll() {
      const today = getToday();
      const sevenDaysAgo = getDaysAgo(7);

      const [tasks, incidents, orders, shifts] = await Promise.all([
        // 1. Tasks completed — last 7 days by date
        fetchTasksByDay(companyId!, siteId, sevenDaysAgo, today),
        // 2. Open incidents
        fetchIncidentsByDay(companyId!, siteId, sevenDaysAgo, today),
        // 3. Pending orders
        fetchOrdersByDay(companyId!, siteId, sevenDaysAgo, today),
        // 4. Staff on shift today
        fetchStaffOnShift(companyId!, siteId, today),
      ]);

      // Tasks completed today
      const todayTasks = tasks.byDay[today] || { done: 0, total: 0 };
      const taskSparkline = buildSparkline(tasks.byDay, 7, (d) => d.done);
      const taskTrend = calcTrend(taskSparkline);

      // Compliance score (% completed per day)
      const complianceSparkline = buildSparkline(tasks.byDay, 7, (d) =>
        d.total > 0 ? Math.round((d.done / d.total) * 100) : 100
      );
      const todayCompliance = todayTasks.total > 0
        ? Math.round((todayTasks.done / todayTasks.total) * 100)
        : 100;
      const complianceTrend = calcTrend(complianceSparkline);

      // Open incidents
      const todayIncidents = incidents.currentOpen;
      const incidentSparkline = buildSparkline(incidents.byDay, 7, (d) => d);
      const incidentTrend = calcTrend(incidentSparkline);

      // Pending orders
      const todayOrders = orders.currentPending;
      const orderSparkline = buildSparkline(orders.byDay, 7, (d) => d);
      const orderTrend = calcTrend(orderSparkline);

      setData({
        tasksCompleted: {
          value: todayTasks.done,
          total: todayTasks.total,
          sparkline: taskSparkline,
          trend: taskTrend,
          status: todayTasks.total > 0 && todayTasks.done === todayTasks.total
            ? 'good'
            : todayTasks.done > 0
            ? 'warning'
            : todayTasks.total > 0
            ? 'urgent'
            : 'neutral',
        },
        complianceScore: {
          value: todayCompliance,
          sparkline: complianceSparkline,
          trend: complianceTrend,
          status: todayCompliance >= 90 ? 'good' : todayCompliance >= 70 ? 'warning' : 'urgent',
        },
        openIncidents: {
          value: todayIncidents,
          sparkline: incidentSparkline,
          trend: incidentTrend,
          status: todayIncidents === 0 ? 'good' : todayIncidents <= 2 ? 'warning' : 'urgent',
        },
        pendingOrders: {
          value: todayOrders,
          sparkline: orderSparkline,
          trend: orderTrend,
          status: 'neutral',
        },
        staffOnShift: {
          value: shifts.count,
          sparkline: [],
          trend: 0,
          status: shifts.count > 0 ? 'good' : 'neutral',
        },
        loading: false,
      });
    }

    fetchAll();
  }, [companyId, siteId]);

  return data;
}

// Build a 7-day sparkline from a byDay map
function buildSparkline<T>(
  byDay: Record<string, T>,
  days: number,
  getValue: (item: T) => number
): number[] {
  const result: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = getDaysAgo(i);
    const item = byDay[date];
    result.push(item ? getValue(item) : 0);
  }
  return result;
}

// Fetch tasks grouped by day
async function fetchTasksByDay(
  companyId: string,
  siteId: string | null,
  from: string,
  to: string
): Promise<{ byDay: Record<string, { done: number; total: number }> }> {
  try {
    let query = supabase
      .from('checklist_tasks')
      .select('due_date, status')
      .eq('company_id', companyId)
      .gte('due_date', from)
      .lte('due_date', to);

    if (siteId && siteId !== 'all') {
      query = query.eq('site_id', siteId);
    }

    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01') return { byDay: {} };
      throw error;
    }

    const byDay: Record<string, { done: number; total: number }> = {};
    (data || []).forEach((t: any) => {
      const date = t.due_date;
      if (!byDay[date]) byDay[date] = { done: 0, total: 0 };
      byDay[date].total++;
      if (t.status === 'completed') byDay[date].done++;
    });

    return { byDay };
  } catch {
    return { byDay: {} };
  }
}

// Fetch incidents grouped by day
async function fetchIncidentsByDay(
  companyId: string,
  siteId: string | null,
  from: string,
  to: string
): Promise<{ currentOpen: number; byDay: Record<string, number> }> {
  try {
    let query = supabase
      .from('incidents')
      .select('id, status, created_at')
      .eq('company_id', companyId);

    if (siteId && siteId !== 'all') {
      query = query.eq('site_id', siteId);
    }

    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01') return { currentOpen: 0, byDay: {} };
      throw error;
    }

    const items = data || [];
    const currentOpen = items.filter(
      (i: any) => i.status === 'open' || i.status === 'investigating'
    ).length;

    // Count open incidents created per day
    const byDay: Record<string, number> = {};
    items.forEach((i: any) => {
      if (i.status === 'open' || i.status === 'investigating') {
        const date = i.created_at?.split('T')[0];
        if (date && date >= from && date <= to) {
          byDay[date] = (byDay[date] || 0) + 1;
        }
      }
    });

    return { currentOpen, byDay };
  } catch {
    return { currentOpen: 0, byDay: {} };
  }
}

// planly_customer_orders table not yet created — return empty to avoid 404
async function fetchOrdersByDay(
  _companyId: string,
  _siteId: string | null,
  _from: string,
  _to: string
): Promise<{ currentPending: number; byDay: Record<string, number> }> {
  return { currentPending: 0, byDay: {} };
}

// schedule_shifts table not yet created — return empty to avoid 404
async function fetchStaffOnShift(
  _companyId: string,
  _siteId: string | null,
  _today: string
): Promise<{ count: number }> {
  return { count: 0 };
}
