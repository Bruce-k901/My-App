"use client";

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (companyId) {
      fetchTasks();
    }
  }, [companyId]);

  async function fetchTasks() {
    if (!companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Active Tasks are the source of truth - show ALL tasks regardless of status
      // They only disappear when manually deleted
      const { data: tasksData, error: tasksError } = await supabase
        .from('checklist_tasks')
        .select('*')
        .eq('company_id', companyId)
        // Don't filter by status - show all tasks (pending, in_progress, completed, etc.)
        .order('due_date', { ascending: true })
        .order('due_time', { ascending: true });

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        console.error('Error details:', JSON.stringify(tasksError, null, 2));
        setTasks([]);
        setLoading(false);
        return;
      }

      // If we have tasks, fetch related template and site data
      if (tasksData && tasksData.length > 0) {
        const templateIds = [...new Set(tasksData.map(t => t.template_id).filter(Boolean))];
        const siteIds = [...new Set(tasksData.map(t => t.site_id).filter(Boolean))];

        let templatesData: any[] = [];
        let sitesData: any[] = [];

        // Fetch templates only if we have template IDs
        if (templateIds.length > 0) {
          const { data: templates, error: templatesError } = await supabase
            .from('task_templates')
            .select('*')
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

        // Combine the data
        const tasksWithDetails = tasksData.map(task => {
          const template = templatesData.find(t => t.id === task.template_id);
          const site = sitesData.find(s => s.id === task.site_id);
          
          return {
            ...task,
            template: template || null,
            site: site || null,
          };
        });

        setTasks(tasksWithDetails);
      } else {
        setTasks([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch tasks:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      'in_progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'completed': 'bg-green-500/10 text-green-400 border-green-500/20',
      'overdue': 'bg-red-500/10 text-red-400 border-red-500/20',
      'skipped': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      'failed': 'bg-red-500/10 text-red-400 border-red-500/20'
    };
    return colors[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'low': 'bg-green-500/10 text-green-400',
      'medium': 'bg-yellow-500/10 text-yellow-400',
      'high': 'bg-orange-500/10 text-orange-400',
      'critical': 'bg-red-500/10 text-red-400'
    };
    return colors[priority] || 'bg-gray-500/10 text-gray-400';
  };

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
        <p className="text-white/60">All active tasks from compliance and custom templates</p>
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
          {tasks.map((task) => {
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
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-white/50">
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(task.due_date).toLocaleDateString()}</span>
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
                      className="p-2 rounded-lg hover:bg-white/10 text-white/60"
                      title="Edit Task"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-400"
                      title="Delete Task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-white/10 text-white/60"
                      title="Complete Task"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          }          )}
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
