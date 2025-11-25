"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckSquare, Clock, AlertCircle, Calendar, Trash2, Edit2, X, Play, CheckCircle, MessageSquare, Save, Archive } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

function TodoTasksPageContent() {
  const router = useRouter();
  const { profile, companyId, loading: authLoading } = useAppContext();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const taskIdParam = searchParams?.get('task');
  
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [viewingTask, setViewingTask] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<any>(null);

  const loadTasks = async () => {
    if (!companyId || !profile?.id) return [];
    
    try {
      setLoading(true);
      
      // To-Do page shows ONLY tasks from messages and widgets (tasks table)
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("company_id", companyId)
        .eq("archived", false)
        .order("due_date", { ascending: true });
      
      if (error) {
        console.error('Error loading tasks:', error);
        throw error;
      }
      
      // Filter to show only user's tasks
      const userTasks = (data || []).filter((task: any) => {
        if (task.created_by && task.created_by === profile.id) return true;
        if (task.assigned_to && task.assigned_to === profile.id) return true;
        return false;
      });
      
      setTasks(userTasks);
      
      // If there's a task ID in the URL, show that task
      if (taskIdParam) {
        const taskToView = userTasks.find(t => t.id === taskIdParam);
        if (taskToView) {
          setViewingTask(taskToView);
        }
      }
      
      return userTasks;
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      showToast({ title: 'Error loading tasks', description: error.message, type: 'error' });
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [companyId, profile?.id, taskIdParam]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const validStatuses = ['todo', 'pending', 'in_progress', 'completed', 'done', 'cancelled'];
      const finalStatus = validStatuses.includes(newStatus) ? newStatus : 'pending';
      
      const updateData: any = { status: finalStatus };
      
      if (finalStatus === 'completed' || finalStatus === 'done') {
        updateData.completed_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", taskId);
      
      if (error) throw error;
      
      showToast({ title: 'Task updated', description: `Task marked as ${finalStatus}`, type: 'success' });
      await loadTasks();
    } catch (error: any) {
      console.error('Error updating task:', error);
      showToast({ title: 'Error updating task', description: error.message, type: 'error' });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);
      
      if (error) throw error;
      
      showToast({ title: 'Task deleted', description: 'Task has been deleted', type: 'success' });
      if (viewingTask?.id === taskId) {
        setViewingTask(null);
      }
      await loadTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      showToast({ title: 'Error deleting task', description: error.message, type: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      'todo': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      'in_progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'completed': 'bg-green-500/10 text-green-400 border-green-500/20',
      'done': 'bg-green-500/10 text-green-400 border-green-500/20',
      'cancelled': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const filteredTasks = tasks.filter((task: any) => {
    if (filter === 'all') return true;
    if (filter === 'pending' && (task.status === 'todo' || task.status === 'pending')) return true;
    if (filter === 'completed' && (task.status === 'completed' || task.status === 'done')) return true;
    return task.status === filter;
  });

  if (authLoading) {
    return (
      <div className="p-8">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="p-8">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">Company Setup Required</h2>
          <p className="text-white/80">Please complete your company setup before accessing this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">To-Do</h1>
          <p className="text-white/60">Personal tasks from messages and quick notes</p>
        </div>
        <Link
          href="/dashboard/tasks/archived"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white/80 hover:text-white hover:bg-white/[0.12] transition-colors"
        >
          <Archive className="w-4 h-4" />
          <span className="hidden sm:inline">Archived</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {[
          { key: 'all', label: 'All', count: tasks.length },
          { key: 'pending', label: 'Pending', count: tasks.filter((t: any) => t.status === 'pending' || t.status === 'todo').length },
          { key: 'in_progress', label: 'In Progress', count: tasks.filter((t: any) => t.status === 'in_progress').length },
          { key: 'completed', label: 'Completed', count: tasks.filter((t: any) => t.status === 'completed' || t.status === 'done').length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-base font-medium transition-colors ${
              filter === key
                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.12] hover:text-white'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-pink-400 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-white mb-2">Loading tasks...</h3>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8">
          <div className="text-center">
            <CheckSquare className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No tasks found</h2>
            <p className="text-white/60 max-w-md mx-auto">
              {filter === 'all' 
                ? "Create tasks from messages or use quick notes to add to-do items."
                : `No ${filter} tasks found.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task: any) => (
            <div key={task.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.06] transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {task.created_from_message_id && (
                      <MessageSquare className="w-5 h-5 text-pink-400 flex-shrink-0" />
                    )}
                    <h3 className="text-lg font-semibold text-white">{task.title || 'Untitled Task'}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                  
                  {task.description && (
                    <p className="text-white/60 text-sm mb-3">{task.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(task.due_date).toLocaleDateString()}
                      </div>
                    )}
                    {task.due_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {task.due_time}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/[0.06]">
                {task.status !== 'completed' && task.status !== 'done' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(task.id, 'in_progress')}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start</span>
                    </button>
                    <button
                      onClick={() => handleStatusChange(task.id, 'completed')}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Complete</span>
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => setViewingTask(task)}
                  className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-pink-500/20 border border-pink-500/30 text-pink-400 hover:bg-pink-500/30 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>View</span>
                </button>

                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task View Modal */}
      {viewingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141823] border border-white/[0.1] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#141823] border-b border-white/[0.1] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-pink-400" />
                <h2 className="text-xl font-semibold text-white">Task Details</h2>
              </div>
              <button
                onClick={() => setViewingTask(null)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Title</label>
                <div className="px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white">
                  {viewingTask.title || 'Untitled Task'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                <div className="px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white whitespace-pre-wrap min-h-[100px]">
                  {viewingTask.description || 'No description'}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Status</label>
                  <div className="px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs border ${getStatusColor(viewingTask.status)}`}>
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
                  <p className="text-sm text-blue-300">This task was created from a message</p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4 border-t border-white/[0.1]">
                {viewingTask.status !== 'completed' && viewingTask.status !== 'done' && (
                  <>
                    <button
                      onClick={() => {
                        handleStatusChange(viewingTask.id, 'in_progress');
                        setViewingTask(null);
                      }}
                      className="flex-1 px-4 py-3 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      Start Task
                    </button>
                    <button
                      onClick={() => {
                        handleStatusChange(viewingTask.id, 'completed');
                        setViewingTask(null);
                      }}
                      className="flex-1 px-4 py-3 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      Mark Complete
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    handleDeleteTask(viewingTask.id);
                    setViewingTask(null);
                  }}
                  className="flex-1 px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TodoTasksPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <div className="text-white">Loading tasks...</div>
      </div>
    }>
      <TodoTasksPageContent />
    </Suspense>
  );
}
