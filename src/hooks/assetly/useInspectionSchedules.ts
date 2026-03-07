'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { BuildingInspectionSchedule } from '@/types/rm';

export interface InspectionScheduleFormData {
  building_asset_id: string;
  description?: string;
  frequency_months: number;
  next_due_date?: string;
  assigned_contractor_id?: string;
  auto_create_wo?: boolean;
}

export function useInspectionSchedules(companyId: string | undefined) {
  const [schedules, setSchedules] = useState<BuildingInspectionSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('building_inspection_schedules')
        .select('*')
        .eq('company_id', companyId)
        .order('next_due_date', { ascending: true, nullsFirst: false });

      if (error) {
        if (error.code === '42P01') {
          setSchedules([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        setSchedules([]);
        setLoading(false);
        return;
      }

      // Enrich with names
      const assetIds = [...new Set(data.map(s => s.building_asset_id))];
      const contractorIds = [...new Set(data.map(s => s.assigned_contractor_id).filter(Boolean))];

      const [assetsResult, contractorsResult] = await Promise.all([
        supabase.from('building_assets').select('id, name').in('id', assetIds),
        contractorIds.length > 0
          ? supabase.from('contractors').select('id, name').in('id', contractorIds as string[])
          : { data: [] },
      ]);

      const assetsMap = new Map((assetsResult.data || []).map(a => [a.id, a.name]));
      const contractorsMap = new Map((contractorsResult.data || []).map(c => [c.id, c.name]));

      const enriched: BuildingInspectionSchedule[] = data.map((s: any) => ({
        ...s,
        building_asset_name: assetsMap.get(s.building_asset_id) || 'Unknown',
        contractor_name: s.assigned_contractor_id ? contractorsMap.get(s.assigned_contractor_id) || null : null,
      }));

      setSchedules(enriched);
    } catch (err) {
      console.error('Error fetching inspection schedules:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const createSchedule = async (data: InspectionScheduleFormData) => {
    const { error } = await supabase
      .from('building_inspection_schedules')
      .insert({
        company_id: companyId,
        building_asset_id: data.building_asset_id,
        description: data.description || null,
        frequency_months: data.frequency_months,
        next_due_date: data.next_due_date || null,
        assigned_contractor_id: data.assigned_contractor_id || null,
        auto_create_wo: data.auto_create_wo ?? true,
      });
    if (error) throw error;
    await fetchSchedules();
  };

  const updateSchedule = async (id: string, data: Partial<InspectionScheduleFormData>) => {
    const updates: Record<string, any> = {};
    if (data.description !== undefined) updates.description = data.description || null;
    if (data.frequency_months !== undefined) updates.frequency_months = data.frequency_months;
    if (data.next_due_date !== undefined) updates.next_due_date = data.next_due_date || null;
    if (data.assigned_contractor_id !== undefined) updates.assigned_contractor_id = data.assigned_contractor_id || null;
    if (data.auto_create_wo !== undefined) updates.auto_create_wo = data.auto_create_wo;

    const { error } = await supabase
      .from('building_inspection_schedules')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    await fetchSchedules();
  };

  const deleteSchedule = async (id: string) => {
    const { error } = await supabase
      .from('building_inspection_schedules')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await fetchSchedules();
  };

  const markCompleted = async (id: string) => {
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;

    const today = new Date().toISOString().split('T')[0];
    const nextDue = schedule.frequency_months
      ? new Date(new Date().setMonth(new Date().getMonth() + schedule.frequency_months)).toISOString().split('T')[0]
      : null;

    const { error } = await supabase
      .from('building_inspection_schedules')
      .update({
        last_completed_date: today,
        next_due_date: nextDue,
      })
      .eq('id', id);
    if (error) throw error;
    await fetchSchedules();
  };

  return {
    schedules,
    loading,
    fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    markCompleted,
  };
}
