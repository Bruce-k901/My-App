"use client";

import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import CompletedTaskCard from '@/components/checklists/CompletedTaskCard';
import { ChecklistTaskWithTemplate } from '@/types/checklist-types';

type CompletedTaskWithRecord = ChecklistTaskWithTemplate & {
  completion_record?: {
    id: string
    completion_data: Record<string, any>
    evidence_attachments?: string[]
    completed_at: string
    completed_by: string
    duration_seconds?: number | null
  } | null
}

export default function CompletedTasksPage() {
  const { companyId, siteId } = useAppContext();
  const [completedTasks, setCompletedTasks] = useState<CompletedTaskWithRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      fetchCompletedTasks();
    }
  }, [companyId, siteId]);

  async function fetchCompletedTasks() {
    if (!companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch all completion records for this company
      let query = supabase
        .from('task_completion_records')
        .select('*')
        .eq('company_id', companyId)
        .order('completed_at', { ascending: false });

      // Filter by site if available
      if (siteId) {
        query = query.eq('site_id', siteId);
      }

      const { data: completionRecords, error } = await query;

      if (error) {
        console.error('Error fetching completion records:', error);
        setCompletedTasks([]);
        setLoading(false);
        return;
      }

      if (!completionRecords || completionRecords.length === 0) {
        setCompletedTasks([]);
        setLoading(false);
        return;
      }

      // Get unique task IDs and template IDs
      const taskIds = [...new Set(completionRecords.map(r => r.task_id).filter(Boolean))];
      const templateIds = [...new Set(completionRecords.map(r => r.template_id).filter(Boolean))];
      const userIds = [...new Set(completionRecords.map(r => r.completed_by).filter(Boolean))];
      
      // Extract asset IDs from completion_data and tasks to fetch asset names
      const assetIds = new Set<string>()
      
      // First pass: extract from completion records
      completionRecords.forEach((record: any) => {
        if (record.completion_data?.equipment_list && Array.isArray(record.completion_data.equipment_list)) {
          record.completion_data.equipment_list.forEach((eq: any) => {
            if (eq.asset_id) assetIds.add(eq.asset_id)
          })
        }
      })
      
      // Fetch tasks, templates, profiles, and assets separately
      let tasksMap = new Map();
      let templatesMap = new Map();
      let profilesMap = new Map();
      let assetsMap = new Map();

      // Fetch tasks first to get task_data
      if (taskIds.length > 0) {
        const { data: tasks } = await supabase
          .from('checklist_tasks')
          .select('*, task_data')
          .in('id', taskIds);

        if (tasks) {
          tasksMap = new Map(tasks.map(t => [t.id, t]));
          
          // Second pass: extract asset IDs from task_data
          tasks.forEach((task: any) => {
            if (task.task_data && typeof task.task_data === 'object') {
              // Check for repeatable field data
              Object.entries(task.task_data).forEach(([key, value]: [string, any]) => {
                if (Array.isArray(value)) {
                  value.forEach((item: any) => {
                    if (item.value) assetIds.add(item.value)
                    if (item.asset_id) assetIds.add(item.asset_id)
                    if (item.id) assetIds.add(item.id)
                  })
                }
              })
            }
          })
        }
      }

      if (templateIds.length > 0) {
        const { data: templates } = await supabase
          .from('task_templates')
          .select('*')
          .in('id', templateIds);

        if (templates) {
          templatesMap = new Map(templates.map(t => [t.id, t]));
        }
      }

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profiles) {
          profilesMap = new Map(profiles.map(p => [p.id, p]));
        }
      }

      // Fetch assets to get names
      if (assetIds.size > 0) {
        const { data: assets } = await supabase
          .from('assets')
          .select('id, name')
          .in('id', Array.from(assetIds));

        if (assets) {
          assetsMap = new Map(assets.map(a => [a.id, a]));
        }
      }

      // Transform the data to match our component structure
      const tasksWithRecords: CompletedTaskWithRecord[] = completionRecords.map((record: any) => {
        const task = tasksMap.get(record.task_id);
        const template = record.template_id ? templatesMap.get(record.template_id) : null;
        const completedByProfile = record.completed_by ? profilesMap.get(record.completed_by) : null;

        return {
          ...task,
          template,
          completed_by_profile: completedByProfile,
          assets_map: assetsMap, // Include assets map for component to use
          completion_record: {
            id: record.id,
            completion_data: record.completion_data,
            evidence_attachments: record.evidence_attachments || [],
            completed_at: record.completed_at,
            completed_by: record.completed_by,
            duration_seconds: record.duration_seconds
          }
        };
      }).filter(item => item.id); // Filter out any records where task wasn't found

      setCompletedTasks(tasksWithRecords);
    } catch (error: any) {
      console.error('Failed to fetch completed tasks:', error);
      setCompletedTasks([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#0f1220] text-white border border-neutral-800 rounded-xl p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Completed Tasks</h1>
        <p className="text-white/60">View all completed task records - these are immutable audit trails</p>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="mt-8 text-center py-12">
          <Loader2 className="h-12 w-12 text-pink-500 mx-auto mb-4 animate-spin" />
          <p className="text-white/60">Loading completed tasks...</p>
        </div>
      ) : completedTasks.length === 0 ? (
        <div className="mt-8 text-center py-12">
          <AlertCircle className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-2">No completed tasks yet</p>
          <p className="text-white/40 text-sm">Completed tasks will appear here for viewing and reporting</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {completedTasks.map((task) => (
            <CompletedTaskCard
              key={task.completion_record?.id || task.id}
              task={task}
              completionRecord={task.completion_record}
            />
          ))}
        </div>
      )}
    </div>
  );
}
