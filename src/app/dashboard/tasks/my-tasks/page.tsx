"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Clock, AlertCircle, Calendar, Trash2, Edit2, X, Play, Pause, MessageSquare, Save, Archive } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { TemperatureCheckTemplate } from '@/components/compliance/TemperatureCheckTemplate';
import { HotHoldingTemplate } from '@/components/compliance/HotHoldingTemplate';
import { FireAlarmTestTemplate } from '@/components/compliance/FireAlarmTestTemplate';
import { EmergencyLightingTemplate } from '@/components/compliance/EmergencyLightingTemplate';

export default function MyTasksPage() {
  const { profile, companyId, loading: authLoading } = useAppContext();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const taskIdParam = searchParams?.get('task');
  
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all'); // all, pending, in_progress, completed, todo
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [viewingTask, setViewingTask] = useState<any>(null); // For viewing tasks from messages
  const [completionNotes, setCompletionNotes] = useState('');
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{taskId: string, status: string, taskType: string} | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{taskId: string, taskType: string} | null>(null);
  const [editingTask, setEditingTask] = useState<any>(null);

  const loadTasks = async () => {
    if (!companyId || !profile?.id) return [];
    
    try {
      setLoading(true);
      
      // Fetch tasks from checklist_tasks table (template-based tasks)
      const { data: checklistTasks, error: checklistError } = await supabase
        .from("checklist_tasks")
        .select("*")
        .eq("company_id", companyId)
        .eq("assigned_to_user_id", profile.id)
        .order("due_date", { ascending: true });
      
      if (checklistError) {
        console.error('Error loading checklist tasks:', checklistError);
        throw checklistError;
      }
      
      // My Tasks page shows ONLY template-based checklist tasks
      // Message/widget tasks are shown in the To-Do page
      const allTasks = (checklistTasks || []).map(t => ({ ...t, taskType: 'checklist' }));
      
      console.log(`Loaded ${allTasks.length} template task(s) for user`);
      
      // Manually fetch templates for checklist tasks
      if (checklistTasks && checklistTasks.length > 0) {
        const templateIds = [...new Set(checklistTasks.map(t => t.template_id).filter(Boolean))];
        if (templateIds.length > 0) {
          const { data: templates, error: templatesError } = await supabase
            .from("task_templates")
            .select("id, name, description, category, frequency")
            .in("id", templateIds);
          
          if (!templatesError && templates) {
            const templatesMap = new Map(templates.map(t => [t.id, t]));
            const tasksWithTemplates = allTasks.map(task => {
              if (task.taskType === 'checklist' && task.template_id) {
                return { ...task, template: templatesMap.get(task.template_id) };
              }
              return task;
            });
            setTasks(tasksWithTemplates);
          } else {
            setTasks(allTasks);
          }
        } else {
          setTasks(allTasks);
        }
      } else {
        setTasks(allTasks);
      }
      
      // If there's a task ID in the URL, show that task
      if (taskIdParam) {
        const taskToView = allTasks.find(t => t.id === taskIdParam);
        if (taskToView) {
          if (taskToView.taskType === 'message') {
            setViewingTask(taskToView);
          } else if (taskToView.template_id) {
            // For checklist tasks, open the template editor
            try {
              const { data, error } = await supabase
                .from("task_templates")
                .select("*")
                .eq("id", taskToView.template_id)
                .single();
              
              if (!error && data) {
                const { data: fields } = await supabase
                  .from('template_fields')
                  .select('field_name, field_type')
                  .eq('template_id', taskToView.template_id);
                
                const templateWithFields = {
                  ...data,
                  template_fields: fields || []
                };
                
                setEditingTemplate(templateWithFields);
                setEditingTemplateId(data.id);
              }
            } catch (error: any) {
              console.error('Error loading template for task:', error);
            }
          }
        }
      }
      
      return allTasks;
    } catch (error) {
      console.error('Error loading tasks:', error);
      const errorMsg = error?.message || JSON.stringify(error);
      console.error('Full error details:', errorMsg);
      showToast({ title: 'Error loading tasks', description: errorMsg, type: 'error' });
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [companyId, profile?.id, taskIdParam]);

  // Show loading only while auth is initializing
  if (authLoading) {
    return (
      <div className="p-8">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // If no company after auth loads, show setup message
  if (!companyId) {
    return (
      <div className="p-8">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">
            Company Setup Required
          </h2>
          <p className="text-white/80 mb-4">
            Please complete your company setup before accessing this page.
          </p>
          <a 
            href="/dashboard/business" 
            className="inline-block px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg transition-all duration-200"
          >
            Go to Business Details
          </a>
        </div>
      </div>
    );
  }

  const handleStatusChange = async (taskId: string, newStatus: string, taskType: string, requireNotes: boolean = false) => {
    // Map status values to valid constraint values
    const validStatuses: Record<string, string> = {
      'todo': 'pending',
      'pending': 'pending',
      'in_progress': 'in_progress',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'overdue': 'overdue'
    };
    
    const mappedStatus = validStatuses[newStatus] || 'pending';
    
    // If completing and notes required, show modal first
    if (mappedStatus === 'completed' && requireNotes) {
      setPendingStatusChange({ taskId, status: mappedStatus, taskType });
      setShowCompletionModal(true);
      return;
    }
    
    // Otherwise proceed with status change
    await executeStatusChange(taskId, mappedStatus, taskType, '');
  };

  const executeStatusChange = async (taskId: string, newStatus: string, taskType: string, notes: string = '') => {
    try {
      const tableName = taskType === 'message' ? 'tasks' : 'checklist_tasks';
      
      // Validate and map status to ensure it matches database constraint
      // For tasks table: 'pending', 'in_progress', 'completed', 'cancelled', 'overdue'
      // For checklist_tasks: 'pending', 'in_progress', 'completed', 'skipped', 'overdue', 'failed'
      const validStatusesForTasks = ['pending', 'in_progress', 'completed', 'cancelled', 'overdue'];
      const validStatusesForChecklist = ['pending', 'in_progress', 'completed', 'skipped', 'overdue', 'failed'];
      
      const validStatuses = taskType === 'message' ? validStatusesForTasks : validStatusesForChecklist;
      
      // Map any invalid statuses to valid ones
      const statusMap: Record<string, string> = {
        'todo': 'pending',
        'pending': 'pending',
        'in_progress': 'in_progress',
        'completed': 'completed',
        'cancelled': 'cancelled',
        'overdue': 'overdue',
        'skipped': taskType === 'message' ? 'cancelled' : 'skipped',
        'failed': taskType === 'message' ? 'cancelled' : 'failed'
      };
      
      // Ensure status is valid, default to 'pending' if not
      let finalStatus = validStatuses.includes(newStatus) 
        ? newStatus 
        : (statusMap[newStatus] || 'pending');
      
      // Final safety check - if still not valid, force to pending
      if (!validStatuses.includes(finalStatus)) {
        console.error(`Status "${finalStatus}" is still invalid after mapping, forcing to 'pending'`);
        finalStatus = 'pending';
      }
      
      if (newStatus !== finalStatus) {
        console.warn(`Status "${newStatus}" mapped to "${finalStatus}" for ${taskType} task`);
      }
      
      console.log(`Updating task ${taskId} (${taskType}) with status: ${finalStatus}`, {
        originalStatus: newStatus,
        finalStatus,
        validStatuses,
        tableName
      });
      
      const updateData: any = { 
        status: finalStatus
      };
      
      // For completed status, set completed_at
      if (finalStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
        // Add notes if provided
        if (notes) {
          // For tasks table, use 'notes' field; for checklist_tasks, might need different field
          if (taskType === 'message') {
            const existingNotes = viewingTask?.notes || viewingTask?.description || '';
            updateData.notes = existingNotes + (existingNotes ? '\n\n' : '') + `Completed: ${notes}`;
          }
        }
      } else if (finalStatus === 'in_progress') {
        // Clear completed_at if starting task
        updateData.completed_at = null;
      }
      
      console.log('Update data being sent:', updateData);
      
      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq("id", taskId);
      
      if (error) throw error;
      
      showToast({ 
        title: 'Task updated', 
        description: `Task marked as ${finalStatus}`, 
        type: 'success' 
      });
      const updatedTasks = await loadTasks();
      if (viewingTask?.id === taskId) {
        // Refresh viewing task data
        const updatedTask = updatedTasks.find((t: any) => t.id === taskId);
        if (updatedTask) setViewingTask(updatedTask);
      }
      setShowCompletionModal(false);
      setCompletionNotes('');
      setPendingStatusChange(null);
    } catch (error: any) {
      console.error('Error updating task:', error);
      showToast({ title: 'Error updating task', description: error.message, type: 'error' });
    }
  };

  const handleUpdateTask = async (taskId: string, taskType: string, updates: any) => {
    try {
      const tableName = taskType === 'message' ? 'tasks' : 'checklist_tasks';
      
      // Validate status if it's being updated
      if (updates.status) {
        const validStatusesForTasks = ['pending', 'in_progress', 'completed', 'cancelled', 'overdue'];
        const validStatusesForChecklist = ['pending', 'in_progress', 'completed', 'skipped', 'overdue', 'failed'];
        const validStatuses = taskType === 'message' ? validStatusesForTasks : validStatusesForChecklist;
        
        if (!validStatuses.includes(updates.status)) {
          console.warn(`Invalid status ${updates.status}, mapping to valid value`);
          // Map invalid statuses
          const statusMap: Record<string, string> = {
            'todo': 'pending',
            'pending': 'pending',
            'in_progress': 'in_progress',
            'completed': 'completed',
            'cancelled': 'cancelled',
            'overdue': 'overdue',
            'skipped': taskType === 'message' ? 'cancelled' : 'skipped',
            'failed': taskType === 'message' ? 'cancelled' : 'failed'
          };
          updates.status = statusMap[updates.status] || 'pending';
        }
      }
      
      const { error } = await supabase
        .from(tableName)
        .update(updates)
        .eq("id", taskId);
      
      if (error) throw error;
      
      showToast({ 
        title: 'Task updated', 
        description: 'Task details have been updated', 
        type: 'success' 
      });
      await loadTasks();
      if (viewingTask?.id === taskId) {
        setViewingTask({ ...viewingTask, ...updates });
      }
      setEditingTask(null);
    } catch (error: any) {
      console.error('Error updating task:', error);
      showToast({ title: 'Error updating task', description: error.message, type: 'error' });
    }
  };

  const handleDeleteTask = async (taskId: string, taskType: string) => {
    setShowDeleteConfirm({ taskId, taskType });
  };

  const confirmDeleteTask = async () => {
    if (!showDeleteConfirm) return;
    const { taskId, taskType } = showDeleteConfirm;
    
    try {
      const tableName = taskType === 'message' ? 'tasks' : 'checklist_tasks';
      
      // For checklist tasks, check for completion records
      if (taskType === 'checklist') {
        const { data: completionRecords } = await supabase
          .from("task_completion_records")
          .select("id")
          .eq("task_id", taskId);
        
        if (completionRecords && completionRecords.length > 0) {
          const { error: completionError } = await supabase
            .from("task_completion_records")
            .delete()
            .eq("task_id", taskId);
          
          if (completionError) {
            console.error('Error deleting completion records:', completionError);
          }
        }
      }
      
      // Delete the task
      const { error, data } = await supabase
        .from(tableName)
        .delete()
        .eq("id", taskId)
        .select();
      
      if (error) {
        console.error('Delete error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('Task deleted successfully:', taskId);
      
      showToast({ 
        title: 'Task deleted', 
        description: 'Task permanently deleted', 
        type: 'success' 
      });
      
      // Force reload tasks to refresh the list
      await loadTasks();
      if (viewingTask?.id === taskId) {
        setViewingTask(null);
      }
      setShowDeleteConfirm(null);
    } catch (error: any) {
      console.error('Error deleting task:', error);
      const errorMessage = error?.message || error?.error?.message || 'Unknown error occurred';
      showToast({ 
        title: 'Error deleting task', 
        description: errorMessage, 
        type: 'error' 
      });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      'in_progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'completed': 'bg-green-500/10 text-green-400 border-green-500/20',
      'overdue': 'bg-red-500/10 text-red-400 border-red-500/20',
      'failed': 'bg-red-500/10 text-red-400 border-red-500/20',
      'skipped': 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    };
    return colors[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'overdue': return <AlertCircle className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      case 'skipped': return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'food_safety': 'bg-green-500/10 text-green-400',
      'h_and_s': 'bg-blue-500/10 text-blue-400',
      'fire': 'bg-red-500/10 text-red-400',
      'cleaning': 'bg-purple-500/10 text-purple-400',
      'compliance': 'bg-yellow-500/10 text-yellow-400'
    };
    return colors[category] || 'bg-gray-500/10 text-gray-400';
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    // Map 'todo' status to 'pending' for checklist tasks
    if (filter === 'pending' && task.status === 'todo') return true;
    if (filter === 'todo' && task.status === 'pending') return true;
    return task.status === filter;
  });

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Tasks</h1>
          <p className="text-white/60">Template-based compliance and operational tasks</p>
        </div>
        <Link
          href="/dashboard/tasks/archived"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white/80 hover:text-white hover:bg-white/[0.12] transition-colors"
        >
          <Archive className="w-4 h-4" />
          <span className="hidden sm:inline">Archived Tasks</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {[
          { key: 'all', label: 'All Tasks', count: tasks.length },
          { key: 'pending', label: 'Pending', count: tasks.filter(t => t.status === 'pending' || t.status === 'todo').length },
          { key: 'in_progress', label: 'In Progress', count: tasks.filter(t => t.status === 'in_progress').length },
          { key: 'completed', label: 'Completed', count: tasks.filter(t => t.status === 'completed').length }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-base font-medium transition-colors touch-manipulation active:scale-[0.98] ${
              filter === key
                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                : 'bg-white/[0.06] text-white/60 active:bg-white/[0.12] active:text-white'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 mb-4">
            <Clock className="w-8 h-8 text-pink-400 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Loading tasks...</h3>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 mb-4">
              <CheckCircle className="w-8 h-8 text-pink-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No tasks found</h2>
            <p className="text-white/60 max-w-md mx-auto">
              {filter === 'all' 
                ? "You don't have any tasks assigned yet. Create a template and deploy it to see tasks here."
                : `No ${filter} tasks found.`
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const isMessageTask = task.taskType === 'message';
            const taskTitle = isMessageTask ? (task.title || task.name || 'Untitled Task') : (task.template?.name || 'Untitled Task');
            const taskDescription = isMessageTask ? (task.description || task.notes || 'No description available') : (task.template?.description || 'No description available');
            
            return (
              <div key={task.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.06] transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {isMessageTask && (
                        <MessageSquare className="w-5 h-5 text-[#EC4899] flex-shrink-0" />
                      )}
                      <h3 className="text-lg font-semibold text-white">
                        {taskTitle}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    
                    <p className="text-white/60 text-sm mb-3">
                      {taskDescription}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-white/60">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                      </div>
                      {task.due_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {task.due_time}
                        </div>
                      )}
                      {task.daypart && (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {task.daypart.charAt(0).toUpperCase() + task.daypart.slice(1)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/[0.06]">
                  {/* Status Change Buttons */}
                  {task.status !== 'completed' && (
                    <button
                      onClick={() => {
                        if (confirm('Start this task? It will be marked as in progress.')) {
                          handleStatusChange(task.id, 'in_progress', task.taskType, false);
                        }
                      }}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 active:bg-blue-500/30 transition-colors text-base touch-manipulation"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start</span>
                    </button>
                  )}
                  {task.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusChange(task.id, 'completed', task.taskType, true)}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 active:bg-green-500/30 transition-colors text-base touch-manipulation"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Complete</span>
                    </button>
                  )}
                  
                  {/* View/Edit Task button */}
                  <button
                    onClick={() => setViewingTask(task)}
                    className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-pink-500/20 border border-pink-500/30 text-pink-400 active:bg-pink-500/30 transition-colors text-base touch-manipulation"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>{isMessageTask ? 'View' : 'Edit'} Task</span>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteTask(task.id, task.taskType)}
                    className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 active:bg-red-500/30 transition-colors text-base touch-manipulation"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task View/Edit Modal (for tasks from messages) */}
      {viewingTask && viewingTask.taskType === 'message' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-[#141823] border border-white/[0.1] rounded-none sm:rounded-xl max-w-2xl w-full h-full sm:h-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="sticky top-0 bg-[#141823] border-b border-white/[0.1] p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#EC4899]" />
                <h2 className="text-lg sm:text-xl font-semibold text-white">Task Details</h2>
              </div>
              <button
                onClick={() => setViewingTask(null)}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg active:bg-white/10 text-white/60 active:text-white transition-colors touch-manipulation"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Title</label>
                <div className="px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white">
                  {viewingTask.title || viewingTask.name || 'Untitled Task'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                <div className="px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white whitespace-pre-wrap min-h-[100px]">
                  {viewingTask.description || viewingTask.notes || 'No description'}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Status</label>
                  <div className="px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${getStatusColor(viewingTask.status)}`}>
                      {viewingTask.status}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Due Date</label>
                  <div className="px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white">
                    {viewingTask.due_date ? new Date(viewingTask.due_date).toLocaleDateString() : 'No due date'}
                  </div>
                </div>
              </div>
              
              {viewingTask.created_from_message_id && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-300">
                    This task was created from a message
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/[0.1]">
                {viewingTask.status !== 'completed' && (
                  <>
                    <button
                      onClick={() => {
                        if (confirm('Start this task? It will be marked as in progress.')) {
                          handleStatusChange(viewingTask.id, 'in_progress', 'message', false);
                        }
                      }}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 active:bg-blue-500/30 transition-colors text-base touch-manipulation"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start Task</span>
                    </button>
                    <button
                      onClick={() => {
                        handleStatusChange(viewingTask.id, 'completed', 'message', true);
                      }}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 active:bg-green-500/30 transition-colors text-base touch-manipulation"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Mark Complete</span>
                    </button>
                    <button
                      onClick={() => setEditingTask(viewingTask)}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-pink-500/20 border border-pink-500/30 text-pink-400 active:bg-pink-500/30 transition-colors text-base touch-manipulation"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit Task</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDeleteTask(viewingTask.id, 'message')}
                  className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 active:bg-red-500/30 transition-colors text-base touch-manipulation"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Task</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Notes Modal */}
      {showCompletionModal && pendingStatusChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141823] border border-white/[0.1] rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Complete Task</h3>
            <p className="text-sm text-white/60 mb-4">Add notes about the completion (optional):</p>
            <textarea
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Enter completion notes..."
              rows={4}
              className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 text-base focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  setCompletionNotes('');
                  setPendingStatusChange(null);
                }}
                className="flex-1 min-h-[44px] px-4 py-3 bg-white/[0.05] border border-white/[0.1] text-white/70 rounded-lg active:bg-white/[0.08] transition-colors text-base font-medium touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingStatusChange) {
                    executeStatusChange(
                      pendingStatusChange.taskId,
                      pendingStatusChange.status,
                      pendingStatusChange.taskType,
                      completionNotes
                    );
                  }
                }}
                className="flex-1 min-h-[44px] px-4 py-3 bg-transparent border border-[#EC4899] text-[#EC4899] rounded-lg active:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out text-base font-medium touch-manipulation"
              >
                Complete Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141823] border border-white/[0.1] rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Task</h3>
            <p className="text-sm text-white/60 mb-6">
              Are you sure you want to delete this task? This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Permanently delete the task</li>
                <li>Remove it from your task list</li>
                <li>This action cannot be undone</li>
              </ul>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 min-h-[44px] px-4 py-3 bg-white/[0.05] border border-white/[0.1] text-white/70 rounded-lg active:bg-white/[0.08] transition-colors text-base font-medium touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTask}
                className="flex-1 min-h-[44px] px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg active:bg-red-500/30 transition-colors text-base font-medium touch-manipulation"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141823] border border-white/[0.1] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Edit Task</h3>
              <button
                onClick={() => setEditingTask(null)}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg active:bg-white/10 text-white/60 active:text-white transition-colors touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Title</label>
                <input
                  type="text"
                  value={editingTask.title || editingTask.name || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 text-base focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                <textarea
                  value={editingTask.description || editingTask.notes || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value, notes: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 text-base focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={editingTask.due_date ? new Date(editingTask.due_date).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-base focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Status</label>
                  <select
                    value={editingTask.status || 'pending'}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0B0D13] border border-white/[0.1] rounded-lg text-white text-base focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 appearance-none cursor-pointer touch-manipulation min-h-[44px]"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      paddingRight: '2.5rem',
                    }}
                  >
                    <option value="pending" className="bg-[#0B0D13] text-white">Pending</option>
                    <option value="in_progress" className="bg-[#0B0D13] text-white">In Progress</option>
                    <option value="completed" className="bg-[#0B0D13] text-white">Completed</option>
                    <option value="cancelled" className="bg-[#0B0D13] text-white">Cancelled</option>
                    <option value="overdue" className="bg-[#0B0D13] text-white">Overdue</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-white/[0.1]">
                <button
                  onClick={() => setEditingTask(null)}
                  className="flex-1 min-h-[44px] px-4 py-3 bg-white/[0.05] border border-white/[0.1] text-white/70 rounded-lg active:bg-white/[0.08] transition-colors text-base font-medium touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const updates: any = {};
                    if (editingTask.title || editingTask.name) {
                      updates.title = editingTask.title || editingTask.name;
                      updates.name = editingTask.title || editingTask.name;
                    }
                    if (editingTask.description || editingTask.notes) {
                      updates.description = editingTask.description || editingTask.notes;
                      updates.notes = editingTask.description || editingTask.notes;
                    }
                    if (editingTask.due_date) updates.due_date = editingTask.due_date;
                    if (editingTask.status) {
                      // Map to valid status
                      const validStatuses: Record<string, string> = {
                        'todo': 'pending',
                        'pending': 'pending',
                        'in_progress': 'in_progress',
                        'completed': 'completed',
                        'cancelled': 'cancelled',
                        'overdue': 'overdue'
                      };
                      updates.status = validStatuses[editingTask.status] || 'pending';
                    }
                    handleUpdateTask(editingTask.id, editingTask.taskType, updates);
                  }}
                  className="flex-1 min-h-[44px] px-4 py-3 bg-transparent border border-[#EC4899] text-[#EC4899] rounded-lg active:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out text-base font-medium touch-manipulation flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Editor Modal */}
      {editingTemplate && editingTemplateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-[#141823] border border-white/[0.1] rounded-none sm:rounded-xl max-w-4xl w-full h-full sm:h-auto max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="sticky top-0 bg-[#141823] border-b border-white/[0.1] p-4 flex items-center justify-between z-10">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Edit Task</h2>
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setEditingTemplateId(null);
                }}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg active:bg-white/10 text-white/60 active:text-white transition-colors touch-manipulation"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
              {(() => {
                // Determine template type - check multiple indicators
                const templateName = (editingTemplate.name || '').toLowerCase();
                const templateSlug = (editingTemplate.slug || '').toLowerCase();
                const repeatableField = (editingTemplate.repeatable_field_name || '').toLowerCase();
                const assetType = (editingTemplate.asset_type || '').toLowerCase();
                const category = (editingTemplate.category || '').toLowerCase();
                const templateFields = (editingTemplate as any).template_fields || [];
                
                // Helper function to determine template type
                const getTemplateType = () => {
                  // FIRE ALARM - check multiple ways
                  if (repeatableField === 'fire_alarm_call_point' || repeatableField === 'fire_alarm_location') {
                    return 'fire_alarm';
                  }
                  if (templateName.includes('fire') && templateName.includes('alarm')) {
                    return 'fire_alarm';
                  }
                  if (assetType === 'fire_alarms' && category === 'h_and_s') {
                    return 'fire_alarm';
                  }
                  
                  // EMERGENCY LIGHTING
                  if (repeatableField === 'emergency_light_location') {
                    return 'emergency_lighting';
                  }
                  if (templateName.includes('emergency') && templateName.includes('light')) {
                    return 'emergency_lighting';
                  }
                  if (assetType === 'emergency_lighting') {
                    return 'emergency_lighting';
                  }
                  
                  // HOT HOLDING
                  if (repeatableField === 'hot_holding_unit') {
                    return 'hot_holding';
                  }
                  if (templateName.includes('hot') && templateName.includes('holding')) {
                    return 'hot_holding';
                  }
                  if (assetType === 'hot_holding_equipment') {
                    return 'hot_holding';
                  }
                  
                  // TEMPERATURE CHECK
                  if (repeatableField === 'fridge_name') {
                    return 'temperature';
                  }
                  if (templateName.includes('temperature') || templateName.includes('temp check')) {
                    return 'temperature';
                  }
                  
                  // Check template_fields as last resort
                  if (templateFields.length > 0) {
                    const fieldNames = templateFields.map((f: any) => f.field_name).join('|');
                    if (fieldNames.includes('fire_alarm')) return 'fire_alarm';
                    if (fieldNames.includes('emergency_light')) return 'emergency_lighting';
                    if (fieldNames.includes('hot_holding')) return 'hot_holding';
                    if (fieldNames.includes('fridge_name')) return 'temperature';
                  }
                  
                  return null;
                };
                
                const templateType = getTemplateType();
                const onSaveCallback = () => {
                        setEditingTemplate(null);
                        setEditingTemplateId(null);
                        loadTasks(); // Refresh tasks to show updated task info
                        showToast({ 
                          title: 'Task updated', 
                          description: 'Task configuration has been successfully updated.', 
                          type: 'success' 
                        });
                };
                
                // Render the appropriate template component
                if (templateType === 'fire_alarm') {
                  return <FireAlarmTestTemplate editTemplateId={editingTemplateId} onSave={onSaveCallback} />;
                } else if (templateType === 'emergency_lighting') {
                  return <EmergencyLightingTemplate editTemplateId={editingTemplateId} onSave={onSaveCallback} />;
                } else if (templateType === 'hot_holding') {
                  return <HotHoldingTemplate editTemplateId={editingTemplateId} onSave={onSaveCallback} />;
                } else if (templateType === 'temperature') {
                  return <TemperatureCheckTemplate editTemplateId={editingTemplateId} onSave={onSaveCallback} />;
                } else {
                  // Generic template - show message that editing not available for this template type
                  return (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-yellow-200 text-sm mb-2">
                        Template editing is not yet available for this template type. 
                        Please use the Templates page to edit this template.
                      </p>
                      <div className="text-xs text-yellow-300/80 bg-black/20 p-3 rounded overflow-auto max-h-60 mt-2">
                        <div><strong>Name:</strong> {editingTemplate.name || '(empty)'}</div>
                        <div><strong>Slug:</strong> {editingTemplate.slug || '(empty)'}</div>
                        <div><strong>Repeatable Field:</strong> {editingTemplate.repeatable_field_name || '(empty)'}</div>
                        <div><strong>Category:</strong> {editingTemplate.category || '(empty)'}</div>
                        <div><strong>Asset Type:</strong> {editingTemplate.asset_type || '(empty)'}</div>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
