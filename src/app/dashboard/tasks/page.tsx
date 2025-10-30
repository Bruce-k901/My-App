"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Play, Pause, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

export default function MyTasksPage() {
  const { profile, companyId, loading: authLoading } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all'); // all, pending, in_progress, completed

  const loadTasks = async () => {
    if (!companyId || !profile?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("task_instances")
        .select(`
          id,
          custom_name,
          custom_instructions,
          scheduled_date,
          scheduled_time,
          due_datetime,
          status,
          created_at,
          task_templates (
            name,
            description,
            category,
            frequency
          )
        `)
        .eq("company_id", companyId)
        .eq("assigned_to_user_id", profile.id)
        .order("scheduled_date", { ascending: true });
      
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      showToast({ title: 'Error loading tasks', description: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [companyId, profile?.id]);

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
            className="inline-block px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors"
          >
            Go to Business Details
          </a>
        </div>
      </div>
    );
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const { error } = await supabase
        .from("task_instances")
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq("id", taskId);
      
      if (error) throw error;
      
      showToast({ 
        title: 'Task updated', 
        description: `Task marked as ${newStatus}`, 
        type: 'success' 
      });
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      showToast({ title: 'Error updating task', description: error.message, type: 'error' });
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
    return task.status === filter;
  });

  const isOverdue = (dueDatetime) => {
    if (!dueDatetime) return false;
    return new Date(dueDatetime) < new Date() && filteredTasks.some(t => t.id === dueDatetime && t.status === 'pending');
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Tasks</h1>
        <p className="text-white/60">View and manage your assigned tasks</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { key: 'all', label: 'All Tasks', count: tasks.length },
          { key: 'pending', label: 'Pending', count: tasks.filter(t => t.status === 'pending').length },
          { key: 'in_progress', label: 'In Progress', count: tasks.filter(t => t.status === 'in_progress').length },
          { key: 'completed', label: 'Completed', count: tasks.filter(t => t.status === 'completed').length }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.12] hover:text-white'
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
          {filteredTasks.map((task) => (
            <div key={task.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.06] transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {task.custom_name || task.task_templates?.name || 'Untitled Task'}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(task.status)}`}>
                      {getStatusIcon(task.status)}
                      {task.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {task.task_templates?.category && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(task.task_templates.category)}`}>
                        {task.task_templates.category.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-white/60 text-sm mb-3">
                    {task.custom_instructions || task.task_templates?.description || 'No description available'}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(task.scheduled_date).toLocaleDateString()}
                    </div>
                    {task.scheduled_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {task.scheduled_time}
                      </div>
                    )}
                    {task.due_datetime && (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Due: {new Date(task.due_datetime).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {task.status === 'pending' && (
                <div className="flex items-center gap-2 pt-4 border-t border-white/[0.06]">
                  <button
                    onClick={() => handleStatusChange(task.id, 'in_progress')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors text-sm"
                  >
                    <Play className="w-3 h-3" />
                    Start Task
                  </button>
                  
                  <button
                    onClick={() => handleStatusChange(task.id, 'completed')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-colors text-sm"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Mark Complete
                  </button>
                  
                  <button
                    onClick={() => handleStatusChange(task.id, 'skipped')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-500/20 border border-gray-500/30 text-gray-400 hover:bg-gray-500/30 transition-colors text-sm"
                  >
                    <Pause className="w-3 h-3" />
                    Skip
                  </button>
                </div>
              )}
              
              {task.status === 'in_progress' && (
                <div className="flex items-center gap-2 pt-4 border-t border-white/[0.06]">
                  <button
                    onClick={() => handleStatusChange(task.id, 'completed')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-colors text-sm"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Mark Complete
                  </button>
                  
                  <button
                    onClick={() => handleStatusChange(task.id, 'pending')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-colors text-sm"
                  >
                    <Clock className="w-3 h-3" />
                    Back to Pending
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
