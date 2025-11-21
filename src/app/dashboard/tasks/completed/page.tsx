"use client";

import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import CompletedTaskCard from '@/components/checklists/CompletedTaskCard';
import { ChecklistTaskWithTemplate } from '@/types/checklist-types';
import { enrichTemplateWithDefinition } from '@/lib/templates/enrich-template';

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
      // Fetch completed AND missed tasks directly from checklist_tasks
      let query = supabase
        .from('checklist_tasks')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['completed', 'missed'])
        .order('completed_at', { ascending: false });

      // Filter by site if available
      if (siteId) {
        query = query.eq('site_id', siteId);
      }

      const { data: tasks, error } = await query;

      if (error) {
        console.error('Error fetching completed tasks:', error);
        setCompletedTasks([]);
        setLoading(false);
        return;
      }

      if (!tasks || tasks.length === 0) {
        setCompletedTasks([]);
        setLoading(false);
        return;
      }

      // Get unique template IDs and user IDs
      const templateIds = [...new Set(tasks.map(t => t.template_id).filter(Boolean))];
      const userIds = [...new Set(tasks.map(t => t.completed_by).filter(Boolean))];
      
      // Extract asset IDs from task_data
      const assetIds = new Set<string>()
      
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
      
      // Fetch templates, profiles, and assets separately
      let templatesMap = new Map();
      let profilesMap = new Map();
      let assetsMap = new Map();

      if (templateIds.length > 0) {
        const { data: templates } = await supabase
          .from('task_templates')
          .select('*')
          .in('id', templateIds);

        if (templates) {
          templatesMap = new Map(
            templates.map((template: any) => {
              const enriched = enrichTemplateWithDefinition(template);
              return [enriched.id, enriched];
            }),
          );
        }
      }

      if (userIds.length > 0) {
        const query = supabase
          .from('profiles')
          .select('id, full_name, email');
        const { data: profiles } = userIds.length === 1
          ? await query.eq('id', userIds[0])
          : await query.in('id', userIds);

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

      // For missed tasks, fetch completion records if they exist (they might not)
      // For completed tasks, fetch completion records
      const taskIds = tasks.map(t => t.id);
      let completionRecordsMap = new Map();
      
      if (taskIds.length > 0) {
        const { data: completionRecords } = await supabase
          .from('task_completion_records')
          .select('*')
          .in('task_id', taskIds);

        if (completionRecords) {
          completionRecordsMap = new Map(completionRecords.map(r => [r.task_id, r]));
        }
      }

      // Transform tasks to match component structure
      const tasksWithRecords: CompletedTaskWithRecord[] = tasks.map((task: any) => {
        const template = task.template_id ? templatesMap.get(task.template_id) : null;
        const completedByProfile = task.completed_by ? profilesMap.get(task.completed_by) : null;
        const completionRecord = completionRecordsMap.get(task.id) || null;

        return {
          ...task,
          template,
          completed_by_profile: completedByProfile,
          assets_map: assetsMap,
          completion_record: completionRecord ? {
            id: completionRecord.id,
            completion_data: completionRecord.completion_data || {},
            evidence_attachments: completionRecord.evidence_attachments || [],
            completed_at: completionRecord.completed_at || task.completed_at,
            completed_by: completionRecord.completed_by || task.completed_by,
            duration_seconds: completionRecord.duration_seconds
          } : null
        };
      });

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
        <p className="text-white/60">View all completed and missed task records</p>
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
          <p className="text-white/40 text-sm">Completed and missed tasks will appear here</p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {completedTasks.map((task) => (
            <CompletedTaskCard
              key={task.id}
              task={task}
              completionRecord={task.completion_record}
            />
          ))}
        </div>
      )}
    </div>
  );
}
