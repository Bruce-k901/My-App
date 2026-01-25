"use client";

import { useState, useEffect, useCallback } from 'react';
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
  const { companyId, siteId, profile, selectedSiteId } = useAppContext();
  const [completedTasks, setCompletedTasks] = useState<CompletedTaskWithRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDebugInfo, setShowDebugInfo] = useState(false); // Debug info should be hidden by default

  // Define fetchCompletedTasks with useCallback to avoid dependency issues
  const fetchCompletedTasks = useCallback(async () => {
    if (!companyId) {
      console.log('⚠️ No companyId available, skipping fetch');
      setLoading(false);
      return;
    }

    // Wait for profile to load
    if (!profile) {
      console.log('⏳ Waiting for profile to load...');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Determine effective site ID based on role (same logic as "My Tasks" and "Today's Tasks")
      const userRole = profile?.app_role?.toLowerCase() || 'staff';
      const isManager = ['manager', 'general_manager', 'admin', 'owner'].includes(userRole);
      const homeSiteId = profile?.home_site || profile?.site_id;
      
      let effectiveSiteId: string | null = null;
      
      if (isManager) {
        // Managers: use selectedSiteId from header if it's a specific site (not 'all'), otherwise use home site
        if (selectedSiteId && selectedSiteId !== 'all') {
          effectiveSiteId = selectedSiteId;
          console.log('🔍 Manager: Filtering completed tasks by selected site:', effectiveSiteId);
        } else {
          effectiveSiteId = homeSiteId;
          console.log('🔍 Manager: Using home site (no specific site selected):', effectiveSiteId);
        }
      } else {
        // Staff: always use home site (ignore selectedSiteId)
        effectiveSiteId = homeSiteId;
        console.log('🔍 Staff: Filtering completed tasks by home site:', effectiveSiteId);
        
        if (!effectiveSiteId) {
          console.warn('⚠️ Staff member has no home site assigned - no tasks to show');
          setCompletedTasks([]);
          setLoading(false);
          return;
        }
      }

      console.log('🔍 Starting fetch for completed tasks:', {
        companyId,
        effectiveSiteId,
        userRole,
        isManager,
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

      // Filter by effective site ID
      if (effectiveSiteId) {
        console.log('🔍 Filtering by effective site:', effectiveSiteId);
        query = query.eq('site_id', effectiveSiteId);
      } else {
        console.log('🔍 No site filter - fetching all sites (manager view)');
      }

      // IMPORTANT: Show ALL completed tasks regardless of source
      // This includes:
      // - Template-based tasks (have site_checklist_id)
      // - Monitoring tasks (have flag_reason: 'monitoring', no site_checklist_id)
      // - Calendar tasks (no site_checklist_id)
      // - Other reactive tasks
      // Staff and managers should see all tasks they have access to based on site
      console.log('🔍 Showing all completed tasks (template-based, monitoring, calendar, etc.)');

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
            
            // Apply the same filtering logic as the main query
            // Filter by effective site ID
            if (effectiveSiteId) {
              tasks = tasksViaCompletions.filter((t: any) => t.site_id === effectiveSiteId);
            } else {
              tasks = tasksViaCompletions;
            }
            
            // Show all tasks regardless of source (template-based, monitoring, calendar, etc.)
            console.log(`✅ After site filter: ${tasks.length} tasks (including all types: template, monitoring, calendar, etc.)`);
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
        setCompletedTasks([]);
        setLoading(false);
        return;
      }

      console.log(`✅ Fetched ${tasks?.length || 0} completed/missed tasks for company ${companyId}${siteId ? ` and site ${siteId}` : ''}`);
      
      if (tasks && tasks.length > 0) {
        // Log breakdown by task type
        const taskTypeBreakdown = {
          templateBased: tasks.filter((t: any) => t.site_checklist_id != null).length,
          monitoring: tasks.filter((t: any) => t.flag_reason === 'monitoring').length,
          calendar: tasks.filter((t: any) => t.site_checklist_id == null && t.flag_reason !== 'monitoring').length,
          other: tasks.filter((t: any) => t.flag_reason && !['monitoring'].includes(t.flag_reason)).length
        };
        
        console.log('📋 Sample task data:', {
          firstTask: {
            id: tasks[0].id,
            status: tasks[0].status,
            completed_at: tasks[0].completed_at,
            template_id: tasks[0].template_id,
            company_id: tasks[0].company_id,
            site_id: tasks[0].site_id,
            site_checklist_id: tasks[0].site_checklist_id,
            flag_reason: tasks[0].flag_reason
          },
          statusBreakdown: {
            completed: tasks.filter(t => t.status === 'completed').length,
            missed: tasks.filter(t => t.status === 'missed').length
          },
          taskTypeBreakdown
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
      
      // Helper function to extract string ID from various formats
      const extractStringId = (value: any): string | null => {
        if (!value) return null
        if (typeof value === 'string') return value
        if (typeof value === 'object' && value !== null) {
          // Try to extract ID from object
          return value.id || value.value || value.asset_id || null
        }
        return null
      }
      
      tasks.forEach((task: any) => {
        if (task.task_data && typeof task.task_data === 'object') {
          // Check for repeatable field data
          Object.entries(task.task_data).forEach(([key, value]: [string, any]) => {
            if (Array.isArray(value)) {
              value.forEach((item: any) => {
                const id1 = extractStringId(item.value)
                const id2 = extractStringId(item.asset_id)
                const id3 = extractStringId(item.id)
                
                if (id1 && typeof id1 === 'string') assetIds.add(id1)
                if (id2 && typeof id2 === 'string') assetIds.add(id2)
                if (id3 && typeof id3 === 'string') assetIds.add(id3)
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
  }, [companyId, siteId, profile, selectedSiteId]);

  useEffect(() => {
    if (companyId && profile?.id) {
      fetchCompletedTasks();
    }
  }, [companyId, siteId, profile?.id, profile?.app_role, profile?.home_site, profile?.site_id, selectedSiteId, fetchCompletedTasks]);

  // Set up real-time subscription for new task completions
  useEffect(() => {
    if (!companyId || !profile?.id) return;

    console.log('🔔 Setting up real-time subscription for task completions...');
    
    // Subscribe to task_completion_records table changes
    const channel = supabase
      .channel(`task-completions-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_completion_records',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          console.log('🔔 New task completion detected via real-time:', payload.new);
          // Refresh the completed tasks list immediately
          setTimeout(() => {
            fetchCompletedTasks();
          }, 300); // Small delay to ensure task status is also updated
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'checklist_tasks',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          // If a task status changed to 'completed' or 'missed', refresh
          if (payload.new.status === 'completed' || payload.new.status === 'missed') {
            console.log('🔔 Task status changed to completed/missed via real-time:', payload.new);
            setTimeout(() => {
              fetchCompletedTasks();
            }, 300);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to task completion events');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('🔔 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [companyId, profile?.id, fetchCompletedTasks]);

  // Also listen for custom events (e.g., when task is completed from modal)
  useEffect(() => {
    const handleTaskCompleted = (event: any) => {
      console.log('🔔 Task completed event received:', event.detail);
      // Immediate refresh with retry logic
      const refreshWithRetry = async (retries = 3) => {
        for (let i = 0; i < retries; i++) {
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
          console.log(`🔄 Refreshing completed tasks (attempt ${i + 1}/${retries})...`);
          await fetchCompletedTasks();
          // Check if the task appeared (optional - could check state)
        }
      };
      refreshWithRetry();
    };

    window.addEventListener('task-completed', handleTaskCompleted);
    
    return () => {
      window.removeEventListener('task-completed', handleTaskCompleted);
    };
  }, [fetchCompletedTasks]);

  return (
    <div className="bg-[rgb(var(--surface-elevated))] dark:bg-[#0f1220] text-[rgb(var(--text-primary))] dark:text-white border border-[rgb(var(--border))] dark:border-neutral-800 rounded-xl p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-2">Completed Tasks</h1>
        <p className="text-[rgb(var(--text-secondary))] dark:text-white/60">View all completed and missed task records</p>
      </div>

      {/* Debug Info - HIDDEN (removed per user request) */}
      {false && showDebugInfo && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="font-bold mb-2">Debug Info:</p>
          <p>Query Executed: Yes</p>
          <p>Tasks Found: {completedTasks.length}</p>
          <p>Company ID: {companyId}</p>
          <p>Site ID: {siteId || 'N/A'}</p>
          <p className="text-xs mt-2">Check browser console (F12) for detailed logs</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="mt-8 text-center py-12">
          <Loader2 className="h-12 w-12 text-pink-500 mx-auto mb-4 animate-spin" />
          <p className="text-[rgb(var(--text-secondary))] dark:text-white/60">Loading completed tasks...</p>
        </div>
      ) : completedTasks.length === 0 ? (
        <div className="mt-8 text-center py-12">
          <AlertCircle className="h-12 w-12 text-[rgb(var(--text-tertiary))] dark:text-white/20 mx-auto mb-4" />
          <p className="text-[rgb(var(--text-secondary))] dark:text-white/60 mb-2">No completed tasks yet</p>
          <p className="text-[rgb(var(--text-tertiary))] dark:text-white/40 text-sm">Completed and missed tasks will appear here</p>
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
