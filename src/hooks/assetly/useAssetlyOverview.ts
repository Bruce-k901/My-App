'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { OPEN_STATUSES, PRIORITY_CONFIG, WO_STATUS_CONFIG } from '@/types/rm';
import type { WOPriority, WOStatus } from '@/types/rm';

export interface AssetlyKPIs {
  equipmentCount: number;
  buildingAssetCount: number;
  openWorkOrders: number;
  openWOByPriority: Record<string, number>;
  overduePPMs: number;
  overdueInspections: number;
  monthlySpend: number;
}

export interface RecentWorkOrder {
  id: string;
  wo_number: string;
  title: string;
  priority: WOPriority;
  status: WOStatus;
  created_at: string;
}

export interface UpcomingInspection {
  id: string;
  building_asset_name: string;
  description: string | null;
  next_due_date: string;
  isOverdue: boolean;
}

export interface SetupStep {
  id: string;
  label: string;
  description: string;
  href: string;
  completed: boolean;
}

const safeQuery = async (fn: () => Promise<any>) => {
  try {
    const result = await fn();
    if (result.error) {
      if (result.error.code === '42P01') return { data: null, count: 0 };
      throw result.error;
    }
    return result;
  } catch {
    return { data: null, count: 0 };
  }
};

export function useAssetlyOverview(companyId: string | undefined, siteId: string | null) {
  const [kpis, setKpis] = useState<AssetlyKPIs>({
    equipmentCount: 0,
    buildingAssetCount: 0,
    openWorkOrders: 0,
    openWOByPriority: {},
    overduePPMs: 0,
    overdueInspections: 0,
    monthlySpend: 0,
  });
  const [recentWOs, setRecentWOs] = useState<RecentWorkOrder[]>([]);
  const [upcomingInspections, setUpcomingInspections] = useState<UpcomingInspection[]>([]);
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const monthStart = `${today.substring(0, 7)}-01`;
      const siteFilter = siteId && siteId !== 'all' ? siteId : null;

      // Fetch all KPIs in parallel
      const [
        equipmentRes,
        buildingRes,
        openWORes,
        overduePPMRes,
        overdueInspRes,
        monthlySpendRes,
        recentWORes,
        upcomingInspRes,
        // Setup step checks
        hasAssets,
        hasContractors,
        hasPPMSchedules,
        hasBuildingAssets,
        hasInspSchedules,
        hasWorkOrders,
      ] = await Promise.all([
        // 1. Equipment count
        safeQuery(() => {
          let q = supabase.from('assets').select('id', { count: 'exact', head: true })
            .eq('company_id', companyId).eq('archived', false);
          if (siteFilter) q = q.eq('site_id', siteFilter);
          return q;
        }),
        // 2. Building asset count
        safeQuery(() => {
          let q = supabase.from('building_assets').select('id', { count: 'exact', head: true })
            .eq('company_id', companyId).eq('status', 'active');
          if (siteFilter) q = q.eq('site_id', siteFilter);
          return q;
        }),
        // 3. Open work orders (with priority breakdown)
        safeQuery(() => {
          let q = supabase.from('work_orders').select('priority')
            .eq('company_id', companyId).in('status', OPEN_STATUSES);
          if (siteFilter) q = q.eq('site_id', siteFilter);
          return q;
        }),
        // 4. Overdue PPMs
        safeQuery(() => {
          let q = supabase.from('ppm_schedules').select('id', { count: 'exact', head: true })
            .eq('company_id', companyId).lt('next_due_date', today);
          if (siteFilter) q = q.eq('site_id', siteFilter);
          return q;
        }),
        // 5. Overdue inspections
        safeQuery(() => {
          let q = supabase.from('building_inspection_schedules').select('id', { count: 'exact', head: true })
            .eq('company_id', companyId).lt('next_due_date', today);
          return q;
        }),
        // 6. Monthly R&M spend
        safeQuery(() => {
          let q = supabase.from('work_orders').select('actual_cost')
            .eq('company_id', companyId).gte('created_at', monthStart).not('actual_cost', 'is', null);
          if (siteFilter) q = q.eq('site_id', siteFilter);
          return q;
        }),
        // 7. Recent work orders (5 most recent)
        safeQuery(() => {
          let q = supabase.from('work_orders')
            .select('id, wo_number, title, priority, status, created_at')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(5);
          if (siteFilter) q = q.eq('site_id', siteFilter);
          return q;
        }),
        // 8. Upcoming inspections (5 due soonest within 60 days)
        safeQuery(() => {
          const sixtyDaysFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          return supabase.from('building_inspection_schedules')
            .select('id, building_asset_id, description, next_due_date')
            .eq('company_id', companyId)
            .lte('next_due_date', sixtyDaysFromNow)
            .order('next_due_date', { ascending: true })
            .limit(5);
        }),
        // Setup step checks (count > 0 means done)
        safeQuery(() => supabase.from('assets').select('id', { count: 'exact', head: true }).eq('company_id', companyId).limit(1)),
        safeQuery(() => supabase.from('contractors').select('id', { count: 'exact', head: true }).eq('company_id', companyId).limit(1)),
        safeQuery(() => supabase.from('ppm_schedules').select('id', { count: 'exact', head: true }).eq('company_id', companyId).limit(1)),
        safeQuery(() => supabase.from('building_assets').select('id', { count: 'exact', head: true }).eq('company_id', companyId).limit(1)),
        safeQuery(() => supabase.from('building_inspection_schedules').select('id', { count: 'exact', head: true }).eq('company_id', companyId).limit(1)),
        safeQuery(() => supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('company_id', companyId).limit(1)),
      ]);

      // Compute priority breakdown
      const openWOByPriority: Record<string, number> = {};
      if (openWORes.data) {
        for (const wo of openWORes.data) {
          openWOByPriority[wo.priority] = (openWOByPriority[wo.priority] || 0) + 1;
        }
      }

      // Compute monthly spend
      const monthlySpend = (monthlySpendRes.data || []).reduce(
        (sum: number, wo: any) => sum + (wo.actual_cost || 0), 0
      );

      setKpis({
        equipmentCount: equipmentRes.count ?? 0,
        buildingAssetCount: buildingRes.count ?? 0,
        openWorkOrders: openWORes.data?.length ?? 0,
        openWOByPriority,
        overduePPMs: overduePPMRes.count ?? 0,
        overdueInspections: overdueInspRes.count ?? 0,
        monthlySpend,
      });

      // Recent work orders
      setRecentWOs((recentWORes.data || []) as RecentWorkOrder[]);

      // Upcoming inspections — enrich with building asset names
      if (upcomingInspRes.data && upcomingInspRes.data.length > 0) {
        const assetIds = [...new Set(upcomingInspRes.data.map((i: any) => i.building_asset_id))];
        const { data: bAssets } = await supabase.from('building_assets').select('id, name').in('id', assetIds);
        const assetMap = new Map((bAssets || []).map((a: any) => [a.id, a.name]));

        setUpcomingInspections(upcomingInspRes.data.map((i: any) => ({
          id: i.id,
          building_asset_name: assetMap.get(i.building_asset_id) || 'Unknown',
          description: i.description,
          next_due_date: i.next_due_date,
          isOverdue: i.next_due_date < today,
        })));
      } else {
        setUpcomingInspections([]);
      }

      // Setup steps
      setSetupSteps([
        { id: 'equipment', label: 'Register Equipment', description: 'Add equipment, vehicles and other assets', href: '/dashboard/assets', completed: (hasAssets.count ?? 0) > 0 },
        { id: 'contractors', label: 'Add Contractors', description: 'Add maintenance and servicing contractors', href: '/dashboard/assets/contractors', completed: (hasContractors.count ?? 0) > 0 },
        { id: 'ppm', label: 'PPM Schedules', description: 'Set up planned preventive maintenance', href: '/dashboard/ppm', completed: (hasPPMSchedules.count ?? 0) > 0 },
        { id: 'buildings', label: 'Building Register', description: 'Add building fabric assets (roof, walls, HVAC)', href: '/dashboard/assets/rm', completed: (hasBuildingAssets.count ?? 0) > 0 },
        { id: 'inspections', label: 'Inspection Schedules', description: 'Set up recurring building inspections', href: '/dashboard/assets/rm/inspections', completed: (hasInspSchedules.count ?? 0) > 0 },
        { id: 'work_orders', label: 'Work Orders', description: 'Create your first R&M work order', href: '/dashboard/assets/rm/work-orders', completed: (hasWorkOrders.count ?? 0) > 0 },
      ]);
    } catch (err) {
      console.error('Error fetching Assetly overview:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, siteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { kpis, recentWOs, upcomingInspections, setupSteps, loading, refresh: fetchData };
}
