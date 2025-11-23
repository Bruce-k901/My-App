"use client";

import { useState, useEffect, useRef } from 'react';
import { Clock, Calendar, CheckCircle, AlertCircle, Loader2, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';
import { TaskFromTemplateModal } from '@/components/templates/TaskFromTemplateModal';

interface TaskTemplate {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  frequency: string;
  dayparts: string[] | null;
  instructions: string | null;
  is_active?: boolean; // Add is_active to check template status
}

interface ChecklistTask {
  id: string;
  template_id: string;
  site_id: string;
  due_date: string;
  due_time: string | null;
  daypart: string | null;
  status: string;
  priority: string;
  custom_name?: string | null;
  custom_instructions?: string | null;
  task_data?: Record<string, any> | null;
  template?: TaskTemplate | null;
  site?: { name: string } | null;
}

export default function ActiveTasksPage() {
  const { companyId } = useAppContext();
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<ChecklistTask | null>(null);
  const isFetchingRef = useRef(false);
  const fetchCountRef = useRef(0);

  useEffect(() => {
    if (companyId) {
      fetchCountRef.current += 1;
      console.log(`🔄 [${fetchCountRef.current}] Fetching tasks for company:`, companyId);
      fetchTasks();
    } else {
      setLoading(false);
      setTasks([]);
    }
   
  }, [companyId]); // Remove fetchTasks from deps to prevent infinite loops

  async function fetchTasks() {
    if (!companyId) {
      setLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.warn('⚠️ Fetch already in progress, skipping...');
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    try {
      // Active Tasks page = Master Task Registry
      // This page shows ONLY manually created tasks from templates (compliance/templates pages)
      // CRON-GENERATED TASKS ARE EXCLUDED - they should only appear in "Today's Tasks" page
      // Tasks are only removed from this page when manually deleted by the user
      // Use DISTINCT ON to get only one task per unique combination at the database level
      // This prevents duplicates from even being fetched
      // Fetch all tasks first, then filter in JavaScript to avoid complex query issues
      const { data: tasksData, error: tasksError } = await supabase
        .from('checklist_tasks')
        .select('*')
        .eq('company_id', companyId)
        // Don't filter by status - show all tasks (this is the master registry)
        .order('template_id', { ascending: true })
        .order('site_id', { ascending: true })
        .order('due_date', { ascending: true })
        .order('daypart', { ascending: true, nullsFirst: false })
        .order('due_time', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true }); // Oldest first for deduplication

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        console.error('Error details:', JSON.stringify(tasksError, null, 2));
        console.error('Full error:', {
          message: tasksError.message,
          code: tasksError.code,
          details: tasksError.details,
          hint: tasksError.hint
        });
        setTasks([]);
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      // If we have tasks, fetch related template and site data
      if (tasksData && tasksData.length > 0) {
        const templateIds = [...new Set(tasksData.map(t => t.template_id).filter(Boolean))];
        const siteIds = [...new Set(tasksData.map(t => t.site_id).filter(Boolean))];

        let templatesData: any[] = [];
        let sitesData: any[] = [];

        // Fetch templates only if we have template IDs
        // Include is_active field to filter out tasks from inactive templates
        if (templateIds.length > 0) {
          const { data: templates, error: templatesError } = await supabase
            .from('task_templates')
            .select('*, is_active')
            .in('id', templateIds);
          
          if (templatesError) {
            console.warn('Error fetching templates:', templatesError);
          } else {
            templatesData = templates || [];
          }
        }

        // Fetch sites only if we have site IDs
        if (siteIds.length > 0) {
          const { data: sites, error: sitesError } = await supabase
            .from('sites')
            .select('id, name')
            .in('id', siteIds);
          
          if (sitesError) {
            console.warn('Error fetching sites:', sitesError);
          } else {
            sitesData = sites || [];
          }
        }

        // Combine the data and filter out orphaned tasks (tasks without valid templates)
        // Also filter out cron-generated tasks (they should only appear in Today's Tasks page)
        const tasksWithDetails = tasksData
          .map(task => {
            const template = templatesData.find(t => t.id === task.template_id);
            const site = sitesData.find(s => s.id === task.site_id);
            
            return {
              ...task,
              template: template || null,
              site: site || null,
            };
          })
          // Filter out cron-generated tasks - they have task_data->>'source' = 'cron'
          // Active Tasks page should ONLY show manually created tasks from templates
          .filter(task => {
            // Check if task was generated by cron
            if (task.task_data && typeof task.task_data === 'object' && task.task_data.source === 'cron') {
              return false; // Exclude cron-generated tasks
            }
            return true; // Keep manually created tasks
          })
          // Filter out ALL tasks without valid templates
          // Only tasks that come from ACTIVE templates should appear in active tasks
          .filter(task => {
            // Tasks must have a template_id
            if (!task.template_id) {
              console.warn('⚠️ Task without template_id will be filtered out:', {
                task_id: task.id,
                site_id: task.site_id,
                due_date: task.due_date
              });
              return false; // Remove tasks without template_id
            }
            // Task must have a valid template that exists
            if (!task.template) {
              console.warn('⚠️ Orphaned task (template not found) will be filtered out:', {
                task_id: task.id,
                template_id: task.template_id,
                site_id: task.site_id
              });
              return false; // Remove orphaned tasks
            }
            // Task must come from an ACTIVE template
            if (task.template && task.template.is_active === false) {
              console.warn('⚠️ Task from inactive template will be filtered out:', {
                task_id: task.id,
                template_id: task.template_id,
                template_name: task.template.name,
                is_active: task.template.is_active
              });
              return false; // Remove tasks from inactive templates
            }
            return true; // Keep only tasks with valid, active templates
          });

        // Deduplicate tasks: Keep only the oldest task for each unique combination
        // Duplicates are identified by: template_id, site_id, due_date, daypart, due_time
        // Since tasks are already sorted by created_at (oldest first), we can use a Map
        // to efficiently track and keep only the first occurrence of each combination
        const taskMap = new Map<string, typeof tasksWithDetails[0]>();
        const duplicateIds: string[] = [];

        for (const task of tasksWithDetails) {
          // For tasks without template_id, keep all (they're unique by id)
          if (!task.template_id) {
            taskMap.set(task.id, task);
            continue;
          }

          // Create a unique key for this task combination
          const combinationKey = `${task.template_id}|${task.site_id}|${task.due_date}|${task.daypart || ''}|${task.due_time || ''}`;

          if (!taskMap.has(combinationKey)) {
            // First time seeing this combination - keep it
            taskMap.set(combinationKey, task);
          } else {
            // This is a duplicate - log it and track for deletion
            const originalTask = taskMap.get(combinationKey);
            if (originalTask) {
              duplicateIds.push(task.id);
              console.warn('⚠️ Duplicate task detected (will be filtered):', {
                duplicate_id: task.id,
                original_id: originalTask.id,
                template_id: task.template_id,
                site_id: task.site_id,
                due_date: task.due_date,
                daypart: task.daypart,
                due_time: task.due_time,
                duplicate_created: task.created_at,
                original_created: originalTask.created_at
              });
            }
          }
        }

        // Convert map values to array
        const deduplicatedTasks = Array.from(taskMap.values());
        
        // Final safety check: Remove any duplicate IDs (shouldn't happen, but just in case)
        const uniqueTasksById = new Map<string, typeof tasksWithDetails[0]>();
        for (const task of deduplicatedTasks) {
          if (!uniqueTasksById.has(task.id)) {
            uniqueTasksById.set(task.id, task);
          } else {
            console.warn('⚠️ Found duplicate task ID (should not happen):', task.id);
          }
        }
        const finalDeduplicatedTasks = Array.from(uniqueTasksById.values());
        
        // Sort by due_date and due_time for display
        const finalTasks = finalDeduplicatedTasks.sort((a, b) => {
          // First sort by due_date
          if (a.due_date !== b.due_date) {
            return a.due_date.localeCompare(b.due_date);
          }
          // Then by due_time
          if (a.due_time !== b.due_time) {
            if (!a.due_time) return 1;
            if (!b.due_time) return -1;
            return a.due_time.localeCompare(b.due_time);
          }
          return 0;
        });

        // Log detailed summary for debugging
        console.log(`✅ Loaded ${finalTasks.length} unique task(s) for display`);
        console.log(`📊 Task breakdown:`, {
          total_fetched: tasksData.length,
          after_template_filter: tasksWithDetails.length,
          after_deduplication: deduplicatedTasks.length,
          after_id_deduplication: finalDeduplicatedTasks.length,
          final_count: finalTasks.length,
          duplicates_filtered: duplicateIds.length
        });
        
        // Check for duplicate IDs in final array (should never happen)
        const taskIds = finalTasks.map(t => t.id);
        const uniqueTaskIds = new Set(taskIds);
        if (taskIds.length !== uniqueTaskIds.size) {
          console.error('❌ CRITICAL: Duplicate task IDs found in final array!', {
            total_ids: taskIds.length,
            unique_ids: uniqueTaskIds.size,
            duplicates: taskIds.filter((id, index) => taskIds.indexOf(id) !== index)
          });
        }
        
        if (duplicateIds.length > 0) {
          console.warn(`⚠️ Filtered out ${duplicateIds.length} duplicate task(s) from display. Consider running bulk delete script to remove from database.`);
        }

        // Final check before setting state - use Map for guaranteed uniqueness
        const finalUniqueMap = new Map<string, typeof finalTasks[0]>();
        for (const task of finalTasks) {
          if (!finalUniqueMap.has(task.id)) {
            finalUniqueMap.set(task.id, task);
          } else {
            console.error(`❌ CRITICAL: Duplicate task ID ${task.id} found in final array!`);
          }
        }
        
        const finalUniqueTasks = Array.from(finalUniqueMap.values());
        
        if (finalUniqueTasks.length !== finalTasks.length) {
          console.error(`❌ Removed ${finalTasks.length - finalUniqueTasks.length} duplicate IDs before setting state`);
        }
        
        // Verify no duplicates one more time
        const taskIdSet = new Set(finalUniqueTasks.map(t => t.id));
        if (taskIdSet.size !== finalUniqueTasks.length) {
          console.error(`❌ CRITICAL: Still have duplicates after Map deduplication!`);
          console.error('Task IDs:', finalUniqueTasks.map(t => t.id));
        }
        
        console.log(`✅ Setting ${finalUniqueTasks.length} unique tasks to state (verified ${taskIdSet.size} unique IDs)`);
        setTasks(finalUniqueTasks);
      } else {
        setTasks([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch tasks:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      setTasks([]);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }


  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('checklist_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Task deleted successfully!');
      fetchTasks(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error(`Failed to delete task: ${error.message}`);
    }
  };

  const handleEditTask = (task: ChecklistTask) => {
    setEditingTask(task);
  };

  const handleTaskUpdated = () => {
    setEditingTask(null);
    fetchTasks(); // Refresh the list
  };

  return (
    <div className="bg-[#0f1220] text-white border border-neutral-800 rounded-xl p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Active Tasks</h1>
        <p className="text-white/60">Master task registry - manually created tasks from compliance and templates pages only. Cron-generated tasks appear in Today's Tasks page.</p>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="mt-8 text-center py-12">
          <Loader2 className="h-12 w-12 text-pink-500 mx-auto mb-4 animate-spin" />
          <p className="text-white/60">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="mt-8 text-center py-12">
          <AlertCircle className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-2">No active tasks yet</p>
          <p className="text-white/40 text-sm">Tasks you create from templates will appear here</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {(() => {
            // Debug: Check for duplicate IDs in render
            const taskIds = tasks.map(t => t.id);
            const uniqueTaskIds = new Set(taskIds);
            if (taskIds.length !== uniqueTaskIds.size) {
              console.error('❌ RENDER ERROR: Duplicate task IDs in tasks array!', {
                total: taskIds.length,
                unique: uniqueTaskIds.size,
                duplicates: taskIds.filter((id, i) => taskIds.indexOf(id) !== i)
              });
            }
            
            return tasks.map((task) => {
              // Prioritize custom_name over template name (custom_name is required for new tasks)
              const taskName = task.custom_name || task.template?.name || 'Unknown Task';

              return (
                <div
                  key={task.id}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5 hover:bg-white/[0.06] transition-colors"
                >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {taskName}
                      </h3>
                      {/* Status and priority tags removed per user request */}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-white/50">
                      {task.template?.frequency && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="capitalize">{task.template.frequency}</span>
                        </div>
                      )}
                      {task.due_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{task.due_time}</span>
                        </div>
                      )}
                      {task.daypart && (
                        <span className="capitalize">{task.daypart.replace('_', ' ')}</span>
                      )}
                      {task.site?.name && (
                        <span>{task.site.name}</span>
                      )}
                      {task.template_id && !task.template && (
                        <span className="text-orange-400/60">Template ID: {task.template_id.substring(0, 8)}...</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditTask(task)}
                      className="min-h-[44px] min-w-[44px] p-2 rounded-lg active:bg-white/10 text-white/60 touch-manipulation"
                      title="Edit Task"
                      aria-label="Edit Task"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="min-h-[44px] min-w-[44px] p-2 rounded-lg active:bg-red-500/10 text-red-400 touch-manipulation"
                      title="Delete Task"
                      aria-label="Delete Task"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    <button
                      className="min-h-[44px] min-w-[44px] p-2 rounded-lg active:bg-white/10 text-white/60 touch-manipulation"
                      title="Complete Task"
                      aria-label="Complete Task"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          });
          })()}
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && editingTask.template_id && (
        <TaskFromTemplateModal
          isOpen={true}
          onClose={() => setEditingTask(null)}
          onSave={handleTaskUpdated}
          templateId={editingTask.template_id}
          template={editingTask.template}
          existingTask={editingTask}
        />
      )}
    </div>
  );
}
