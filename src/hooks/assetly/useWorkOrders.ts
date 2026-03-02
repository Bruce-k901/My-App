'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { WorkOrder, WorkOrderComment, WOStatus, WOPriority, WOType, WOTargetType } from '@/types/rm';

export interface WorkOrderFormData {
  site_id: string;
  target_type: WOTargetType;
  asset_id?: string;
  building_asset_id?: string;
  wo_type: WOType;
  priority: WOPriority;
  title: string;
  description?: string;
  assigned_to_contractor_id?: string;
  assigned_to_user_id?: string;
  scheduled_date?: string;
  estimated_cost?: number;
  tags?: string[];
}

export interface WorkOrderFilters {
  status?: WOStatus | 'open' | 'closed' | 'all';
  priority?: WOPriority;
  wo_type?: WOType;
  target_type?: WOTargetType;
}

const OPEN_STATUSES = ['requested', 'triaged', 'approved', 'assigned', 'scheduled', 'in_progress', 'on_hold'];

export function useWorkOrders(companyId: string | undefined, siteId?: string | null) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkOrders = useCallback(async (filters?: WorkOrderFilters) => {
    if (!companyId) { setLoading(false); return; }
    try {
      setLoading(true);

      let query = supabase
        .from('work_orders')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        if (filters.status === 'open') {
          query = query.in('status', OPEN_STATUSES);
        } else if (filters.status === 'closed') {
          query = query.in('status', ['completed', 'verified', 'closed', 'cancelled']);
        } else {
          query = query.eq('status', filters.status);
        }
      }
      if (filters?.priority) query = query.eq('priority', filters.priority);
      if (filters?.wo_type) query = query.eq('wo_type', filters.wo_type);
      if (filters?.target_type) query = query.eq('target_type', filters.target_type);

      const { data, error } = await query;

      if (error) {
        if (error.code === '42P01') {
          setWorkOrders([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        setWorkOrders([]);
        setLoading(false);
        return;
      }

      // Enrich with related names (parallel queries + Maps pattern)
      const siteIds = [...new Set(data.map(wo => wo.site_id).filter(Boolean))];
      const assetIds = [...new Set(data.map(wo => wo.asset_id).filter(Boolean))];
      const buildingAssetIds = [...new Set(data.map(wo => wo.building_asset_id).filter(Boolean))];
      const contractorIds = [...new Set(data.map(wo => wo.assigned_to_contractor_id).filter(Boolean))];
      const userIds = [...new Set([
        ...data.map(wo => wo.assigned_to_user_id),
        ...data.map(wo => wo.reported_by),
      ].filter(Boolean))];

      const [sitesResult, assetsResult, buildingAssetsResult, contractorsResult, profilesResult] = await Promise.all([
        siteIds.length > 0
          ? supabase.from('sites').select('id, name').in('id', siteIds)
          : { data: [] },
        assetIds.length > 0
          ? supabase.from('assets').select('id, name').in('id', assetIds as string[])
          : { data: [] },
        buildingAssetIds.length > 0
          ? supabase.from('building_assets').select('id, name').in('id', buildingAssetIds as string[])
          : { data: [] },
        contractorIds.length > 0
          ? supabase.from('contractors').select('id, name').in('id', contractorIds as string[])
          : { data: [] },
        userIds.length > 0
          ? supabase.from('profiles').select('id, full_name').in('id', userIds as string[])
          : { data: [] },
      ]);

      const sitesMap = new Map((sitesResult.data || []).map(s => [s.id, s.name]));
      const assetsMap = new Map((assetsResult.data || []).map(a => [a.id, a.name]));
      const buildingAssetsMap = new Map((buildingAssetsResult.data || []).map(a => [a.id, a.name]));
      const contractorsMap = new Map((contractorsResult.data || []).map(c => [c.id, c.name]));
      const profilesMap = new Map((profilesResult.data || []).map(p => [p.id, p.full_name]));

      const enriched: WorkOrder[] = data.map((wo: any) => ({
        ...wo,
        before_photos: wo.before_photos || [],
        after_photos: wo.after_photos || [],
        documents: wo.documents || [],
        timeline: wo.timeline || [],
        tags: wo.tags || [],
        site_name: sitesMap.get(wo.site_id) || null,
        asset_name: wo.asset_id ? assetsMap.get(wo.asset_id) || null : null,
        building_asset_name: wo.building_asset_id ? buildingAssetsMap.get(wo.building_asset_id) || null : null,
        contractor_name: wo.assigned_to_contractor_id ? contractorsMap.get(wo.assigned_to_contractor_id) || null : null,
        assigned_user_name: wo.assigned_to_user_id ? profilesMap.get(wo.assigned_to_user_id) || null : null,
        reported_by_name: wo.reported_by ? profilesMap.get(wo.reported_by) || null : null,
      }));

      setWorkOrders(enriched);
    } catch (err) {
      console.error('Error fetching work orders:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, siteId]);

  const createWorkOrder = async (data: WorkOrderFormData, userId: string) => {
    const { data: wo, error } = await supabase
      .from('work_orders')
      .insert({
        company_id: companyId,
        site_id: data.site_id,
        target_type: data.target_type,
        asset_id: data.target_type === 'equipment' ? data.asset_id : null,
        building_asset_id: data.target_type === 'building_fabric' ? data.building_asset_id : null,
        wo_type: data.wo_type,
        priority: data.priority,
        title: data.title,
        description: data.description || null,
        reported_by: userId,
        assigned_to_contractor_id: data.assigned_to_contractor_id || null,
        assigned_to_user_id: data.assigned_to_user_id || null,
        scheduled_date: data.scheduled_date || null,
        estimated_cost: data.estimated_cost || null,
        tags: data.tags || null,
        wo_number: '', // trigger will set this
        timeline: [{ action: 'created', by: userId, at: new Date().toISOString() }],
      })
      .select()
      .single();

    if (error) throw error;
    return wo;
  };

  const updateWorkOrderStatus = async (woId: string, newStatus: WOStatus, notes?: string) => {
    const updates: Record<string, any> = { status: newStatus };
    if (notes) updates.resolution_notes = notes;

    const { error } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', woId);

    if (error) throw error;
  };

  const updateWorkOrder = async (woId: string, updates: Partial<WorkOrder>) => {
    const { error } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', woId);
    if (error) throw error;
  };

  // Comments
  const fetchComments = async (woId: string): Promise<WorkOrderComment[]> => {
    const { data, error } = await supabase
      .from('work_order_comments')
      .select('*')
      .eq('work_order_id', woId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) return [];

    const authorIds = [...new Set(data.map(c => c.author_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', authorIds);

    const profilesMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

    return data.map((c: any) => ({
      ...c,
      attachments: c.attachments || [],
      author_name: profilesMap.get(c.author_id) || 'Unknown',
    }));
  };

  const addComment = async (woId: string, content: string, userId: string, isInternal = false) => {
    const { error } = await supabase
      .from('work_order_comments')
      .insert({
        work_order_id: woId,
        author_id: userId,
        content,
        is_internal: isInternal,
      });
    if (error) throw error;
  };

  // Evidence upload
  const uploadEvidence = async (woId: string, file: File, type: 'before' | 'after' | 'document') => {
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const path = `${woId}/${type}-${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('work-order-documents')
      .upload(path, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('work-order-documents')
      .getPublicUrl(path);

    const url = urlData.publicUrl;

    // Fetch current WO to append to the right array
    const { data: wo, error: fetchError } = await supabase
      .from('work_orders')
      .select(type === 'document' ? 'documents' : type === 'before' ? 'before_photos' : 'after_photos')
      .eq('id', woId)
      .single();

    if (fetchError) throw fetchError;

    if (type === 'document') {
      const docs = [...(wo.documents || []), { url, name: file.name, type: file.type }];
      await supabase.from('work_orders').update({ documents: docs }).eq('id', woId);
    } else {
      const field = type === 'before' ? 'before_photos' : 'after_photos';
      const photos = [...(wo[field] || []), { url, caption: file.name }];
      await supabase.from('work_orders').update({ [field]: photos }).eq('id', woId);
    }

    return url;
  };

  return {
    workOrders,
    loading,
    fetchWorkOrders,
    createWorkOrder,
    updateWorkOrderStatus,
    updateWorkOrder,
    fetchComments,
    addComment,
    uploadEvidence,
  };
}
