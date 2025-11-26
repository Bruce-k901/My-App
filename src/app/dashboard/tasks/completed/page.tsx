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
  const [debugInfo, setDebugInfo] = useState<{
    queryExecuted: boolean;
    tasksFound: number;
    error: string | null;
    companyId: string | null;
    siteId: string | null;
  } | null>(null);

  useEffect(() => {
    if (companyId) {
      fetchCompletedTasks();
    }
  }, [companyId, siteId]);

  async function fetchCompletedTasks() {
    if (!companyId) {
      console.log('⚠️ No companyId available, skipping fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Starting fetch for completed tasks:', {
        companyId,
        siteId: siteId || 'all sites',
        timestamp: new Date().toISOString()
      });

      // DIAGNOSTIC: Check ALL tasks for this company (any status) to see what exists
      const { data: allCompanyTasks, error: allTasksError } = await supabase
        .from('checklist_tasks')
        .select('id, status, company_id, site_id, completed_at, updated_at')
        .eq('company_id', companyId)
        .limit(50);

      console.log('🔍 DIAGNOSTIC: All tasks for company:', {
        totalTasks: allCompanyTasks?.length || 0,
        error: allTasksError,
        statusBreakdown: allCompanyTasks?.reduce((acc: any, task: any) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {}) || {},
        sampleTasks: allCompanyTasks?.slice(0, 5).map((t: any) => ({
          id: t.id,
          status: t.status,
          company_id: t.company_id,
          site_id: t.site_id,
          completed_at: t.completed_at,
          updated_at: t.updated_at
        }))
      });

      // Check for completed/missed tasks specifically
      const { data: allTasks, error: countError } = await supabase
        .from('checklist_tasks')
        .select('id, status, company_id, site_id, completed_at, updated_at', { count: 'exact' })
        .eq('company_id', companyId)
        .in('status', ['completed', 'missed']);

      console.log('📊 Task count check (completed/missed only):', {
        totalCompletedOrMissed: allTasks?.length || 0,
        error: countError,
        sampleTasks: allTasks?.slice(0, 5).map((t: any) => ({
          id: t.id,
          status: t.status,
          company_id: t.company_id,
          site_id: t.site_id,
          completed_at: t.completed_at,
          updated_at: t.updated_at
        }))
      });

      // DIAGNOSTIC: Check task_completion_records to see if those exist
      const { data: completionRecords, error: recordsError } = await supabase
        .from('task_completion_records')
        .select('task_id, completed_at, completed_by')
        .limit(10);

      console.log('🔍 DIAGNOSTIC: Completion records (any company):', {
        totalRecords: completionRecords?.length || 0,
        error: recordsError,
        sampleRecords: completionRecords?.slice(0, 3)
      });

      // DIAGNOSTIC: Check if there are tasks with completion records but wrong status
      if (completionRecords && completionRecords.length > 0) {
        const taskIdsFromRecords = completionRecords.map(r => r.task_id).filter(Boolean);
        if (taskIdsFromRecords.length > 0) {
          const { data: tasksWithRecords, error: tasksError } = await supabase
            .from('checklist_tasks')
            .select('id, status, company_id, site_id')
            .in('id', taskIdsFromRecords.slice(0, 10))
            .eq('company_id', companyId);

          console.log('🔍 DIAGNOSTIC: Tasks that have completion records:', {
            found: tasksWithRecords?.length || 0,
            error: tasksError,
            statusMismatch: tasksWithRecords?.filter((t: any) => t.status !== 'completed' && t.status !== 'missed') || [],
            tasks: tasksWithRecords
          });
        }
      }

      // DIAGNOSTIC: Try query WITHOUT site filter first to see if that's the issue
      if (siteId) {
        console.log('🔍 DIAGNOSTIC: Trying query WITHOUT site filter first...');
        const { data: tasksWithoutSiteFilter, error: noSiteError } = await supabase
          .from('checklist_tasks')
          .select('id, status, company_id, site_id, completed_at')
          .eq('company_id', companyId)
          .in('status', ['completed', 'missed'])
          .limit(10);

        console.log('🔍 DIAGNOSTIC: Results WITHOUT site filter:', {
          found: tasksWithoutSiteFilter?.length || 0,
          error: noSiteError,
          tasks: tasksWithoutSiteFilter
        });
      }

      // Fetch completed AND missed tasks directly from checklist_tasks
      let query = supabase
        .from('checklist_tasks')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['completed', 'missed']);

      // Filter by site if available
      if (siteId) {
        console.log('🔍 Filtering by site:', siteId);
        query = query.eq('site_id', siteId);
      } else {
        console.log('🔍 No site filter - fetching all sites');
      }

      // Order by updated_at (most recently updated first) - this works for both completed and missed tasks
      // updated_at is set when task status changes, so it's reliable for sorting
      query = query.order('updated_at', { ascending: false });

      console.log('📤 Executing main query...');
      let { data: tasks, error } = await query;

      // FALLBACK: If no tasks found, try finding tasks via completion_records
      // This handles the case where tasks have completion records but status wasn't updated
      if ((!tasks || tasks.length === 0) && !error) {
        console.log('⚠️ No tasks found with status filter, trying fallback via completion_records...');
        
        // First, get completion records for this company
        const { data: companyCompletionRecords } = await supabase
          .from('task_completion_records')
          .select('task_id, completed_at')
          .limit(100);

        if (companyCompletionRecords && companyCompletionRecords.length > 0) {
          const taskIdsFromCompletions = companyCompletionRecords.map(r => r.task_id).filter(Boolean);
          
          // Get tasks that have completion records
          const { data: tasksViaCompletions, error: fallbackError } = await supabase
            .from('checklist_tasks')
            .select('*')
            .eq('company_id', companyId)
            .in('id', taskIdsFromCompletions);

          if (tasksViaCompletions && tasksViaCompletions.length > 0) {
            console.log(`✅ FALLBACK: Found ${tasksViaCompletions.length} tasks via completion records`);
            console.log('⚠️ These tasks have completion records but may have wrong status:', {
              statuses: tasksViaCompletions.map((t: any) => t.status),
              sample: tasksViaCompletions[0]
            });
            
            // Filter by site if needed
            if (siteId) {
              tasks = tasksViaCompletions.filter((t: any) => t.site_id === siteId);
            } else {
              tasks = tasksViaCompletions;
            }
            
            console.log(`✅ After site filter: ${tasks.length} tasks`);
          } else {
            console.log('⚠️ FALLBACK: No tasks found via completion records either');
          }
        }
      }

      if (error) {
        console.error('❌ Error fetching completed tasks:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error hint:', error.hint);
        setDebugInfo({
          queryExecuted: true,
          tasksFound: 0,
          error: error.message || 'Unknown error',
          companyId,
          siteId: siteId || null
        });
        setCompletedTasks([]);
        setLoading(false);
        return;
      }

      console.log(`✅ Fetched ${tasks?.length || 0} completed/missed tasks for company ${companyId}${siteId ? ` and site ${siteId}` : ''}`);
      
      // Update debug info
      setDebugInfo({
        queryExecuted: true,
        tasksFound: tasks?.length || 0,
        error: null,
        companyId,
        siteId: siteId || null
      });
      
      if (tasks && tasks.length > 0) {
        console.log('📋 Sample task data:', {
          firstTask: {
            id: tasks[0].id,
            status: tasks[0].status,
            completed_at: tasks[0].completed_at,
            template_id: tasks[0].template_id,
            company_id: tasks[0].company_id,
            site_id: tasks[0].site_id
          },
          statusBreakdown: {
            completed: tasks.filter(t => t.status === 'completed').length,
            missed: tasks.filter(t => t.status === 'missed').length
          }
        });
      }

      if (!tasks || tasks.length === 0) {
        console.log('ℹ️ No completed or missed tasks found');
        console.log('💡 Debugging info:', {
          companyId,
          siteId: siteId || 'all sites',
          queryFilters: {
            company_id: companyId,
            status: ['completed', 'missed'],
            ...(siteId && { site_id: siteId })
          }
        });
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

      console.log('✅ Final tasks with records:', {
        count: tasksWithRecords.length,
        withTemplates: tasksWithRecords.filter(t => t.template).length,
        withCompletionRecords: tasksWithRecords.filter(t => t.completion_record).length,
        sample: tasksWithRecords[0] ? {
          id: tasksWithRecords[0].id,
          status: tasksWithRecords[0].status,
          hasTemplate: !!tasksWithRecords[0].template,
          hasCompletionRecord: !!tasksWithRecords[0].completion_record
        } : null
      });

      setCompletedTasks(tasksWithRecords);
      console.log('✅ State updated with', tasksWithRecords.length, 'completed tasks');
    } catch (error: any) {
      console.error('❌ Failed to fetch completed tasks:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));
      setCompletedTasks([]);
    } finally {
      setLoading(false);
      console.log('🏁 Fetch completed, loading set to false');
    }
  }

  return (
    <div className="bg-[#0f1220] text-white border border-neutral-800 rounded-xl p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Completed Tasks</h1>
        <p className="text-white/60">View all completed and missed task records</p>
        
        {/* Debug Info */}
        {debugInfo && (
          <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg text-sm">
            <p className="text-white/80 font-semibold mb-2">Debug Info:</p>
            <ul className="space-y-1 text-white/60">
              <li>Query Executed: {debugInfo.queryExecuted ? '✅ Yes' : '❌ No'}</li>
              <li>Tasks Found: {debugInfo.tasksFound}</li>
              <li>Company ID: {debugInfo.companyId || 'Not set'}</li>
              <li>Site ID: {debugInfo.siteId || 'All sites'}</li>
              {debugInfo.error && (
                <li className="text-red-400">Error: {debugInfo.error}</li>
              )}
            </ul>
            <p className="text-white/40 text-xs mt-2">
              Check browser console (F12) for detailed logs
            </p>
          </div>
        )}
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
