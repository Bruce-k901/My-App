import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export interface ActivityItem {
  id: string;
  type: 'task_completed' | 'task_overdue' | 'incident' | 'stock_alert' | 'clock_in' | 'clock_out';
  title: string;
  detail?: string;
  severity?: string;
  timestamp: string;
  module: 'checkly' | 'stockly' | 'teamly' | 'assetly';
  href?: string;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId");
  const siteId = url.searchParams.get("siteId");
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);

  if (!companyId) {
    return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString().split('T')[0];

  // Run all queries in parallel, each wrapped in try/catch for 42P01 resilience
  const results = await Promise.allSettled([
    // 1. Recently completed tasks (last 24h)
    (async (): Promise<ActivityItem[]> => {
      try {
        let query = supabase
          .from('checklist_tasks')
          .select('id, title, completed_at, completed_by, site_id')
          .eq('company_id', companyId)
          .eq('status', 'completed')
          .gte('completed_at', twentyFourHoursAgo)
          .order('completed_at', { ascending: false })
          .limit(10);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;
        if (error?.code === '42P01') return [];
        if (error) throw error;

        return (data || []).map(t => ({
          id: `task-done-${t.id}`,
          type: 'task_completed' as const,
          title: `Completed: ${t.title || 'Task'}`,
          timestamp: t.completed_at || new Date().toISOString(),
          module: 'checkly' as const,
          href: `/dashboard/tasks/view/${t.id}`,
        }));
      } catch {
        return [];
      }
    })(),

    // 2. Overdue tasks
    (async (): Promise<ActivityItem[]> => {
      try {
        let query = supabase
          .from('checklist_tasks')
          .select('id, title, due_date, due_time, site_id')
          .eq('company_id', companyId)
          .in('status', ['pending', 'in_progress'])
          .lt('due_date', today)
          .order('due_date', { ascending: false })
          .limit(5);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;
        if (error?.code === '42P01') return [];
        if (error) throw error;

        return (data || []).map(t => ({
          id: `task-overdue-${t.id}`,
          type: 'task_overdue' as const,
          title: `Overdue: ${t.title || 'Task'}`,
          detail: `Due ${t.due_date}`,
          timestamp: t.due_date || new Date().toISOString(),
          module: 'checkly' as const,
          href: `/dashboard/tasks/view/${t.id}`,
        }));
      } catch {
        return [];
      }
    })(),

    // 3. Low stock alerts
    (async (): Promise<ActivityItem[]> => {
      try {
        let query = supabase
          .from('stock_items')
          .select('id, name, current_quantity, reorder_level, updated_at, site_id')
          .eq('company_id', companyId)
          .eq('active', true);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;
        if (error?.code === '42P01') return [];
        if (error) throw error;

        // Filter items below reorder level client-side (can't do .lte with column ref in PostgREST)
        const lowStock = (data || []).filter(
          item => item.reorder_level != null && item.current_quantity != null && item.current_quantity <= item.reorder_level
        );

        return lowStock.slice(0, 5).map(s => ({
          id: `stock-${s.id}`,
          type: 'stock_alert' as const,
          title: `Low stock: ${s.name}`,
          detail: `${s.current_quantity ?? 0} remaining (reorder at ${s.reorder_level})`,
          timestamp: s.updated_at || new Date().toISOString(),
          module: 'stockly' as const,
          href: `/dashboard/stockly/stock-items`,
        }));
      } catch {
        return [];
      }
    })(),

    // 4. Recent clock-ins/outs (last 24h)
    (async (): Promise<ActivityItem[]> => {
      try {
        let query = supabase
          .from('staff_attendance')
          .select('id, user_id, clock_in_time, clock_out_time, site_id')
          .eq('company_id', companyId)
          .gte('clock_in_time', twentyFourHoursAgo)
          .order('clock_in_time', { ascending: false })
          .limit(5);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;
        if (error?.code === '42P01') return [];
        if (error) throw error;

        const items: ActivityItem[] = [];
        for (const a of data || []) {
          items.push({
            id: `clock-in-${a.id}`,
            type: 'clock_in',
            title: 'Staff clocked in',
            timestamp: a.clock_in_time,
            module: 'teamly',
            href: '/dashboard/people/attendance',
          });
          if (a.clock_out_time) {
            items.push({
              id: `clock-out-${a.id}`,
              type: 'clock_out',
              title: 'Staff clocked out',
              timestamp: a.clock_out_time,
              module: 'teamly',
              href: '/dashboard/people/attendance',
            });
          }
        }
        return items;
      } catch {
        return [];
      }
    })(),
  ]);

  // Merge all fulfilled results
  const allItems: ActivityItem[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  }

  // Sort by timestamp descending, limit
  allItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({ items: allItems.slice(0, limit) });
}
