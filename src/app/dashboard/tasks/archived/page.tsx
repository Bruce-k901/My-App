"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, RotateCcw, Trash2, Calendar, Clock, CheckCircle, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

export default function ArchivedTasksPage() {
  const router = useRouter();
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [archivedTasks, setArchivedTasks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'checklist' | 'message'>('all');

  const loadArchivedTasks = async () => {
    if (!companyId || !profile?.id) return;
    
    try {
      setLoading(true);
      
      // Load archived tasks from both tables
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("company_id", companyId)
        .eq("archived", true)
        .order("archived_at", { ascending: false });
      
      if (error) throw error;
      
      setArchivedTasks(tasks || []);
    } catch (error: any) {
      console.error('Error loading archived tasks:', error);
      showToast({ title: 'Error loading archived tasks', description: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchivedTasks();
  }, [companyId, profile?.id]);

  const handleRestore = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          archived: false, 
          archived_at: null,
          archived_by: null
        })
        .eq("id", taskId);
      
      if (error) throw error;
      
      showToast({ title: 'Task restored', description: 'Task has been restored to active tasks', type: 'success' });
      loadArchivedTasks();
    } catch (error: any) {
      console.error('Error restoring task:', error);
      showToast({ title: 'Error restoring task', description: error.message, type: 'error' });
    }
  };

  const handlePermanentDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to permanently delete this task? This cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);
      
      if (error) throw error;
      
      showToast({ title: 'Task deleted', description: 'Task has been permanently deleted', type: 'success' });
      loadArchivedTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      showToast({ title: 'Error deleting task', description: error.message, type: 'error' });
    }
  };

  const filteredTasks = archivedTasks.filter(task => {
    const matchesSearch = !searchQuery || 
      task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Archive className="w-8 h-8 text-pink-400" />
          <h1 className="text-3xl font-bold text-white">Archived Tasks</h1>
        </div>
        <p className="text-white/60">View and manage archived tasks</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            placeholder="Search archived tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="text-white/60 text-sm mb-1">Total Archived</div>
          <div className="text-2xl font-bold text-white">{archivedTasks.length}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="text-white/60 text-sm mb-1">This Month</div>
          <div className="text-2xl font-bold text-white">
            {archivedTasks.filter(t => {
              const archivedDate = new Date(t.archived_at);
              const now = new Date();
              return archivedDate.getMonth() === now.getMonth() && 
                     archivedDate.getFullYear() === now.getFullYear();
            }).length}
          </div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="text-white/60 text-sm mb-1">Completed</div>
          <div className="text-2xl font-bold text-green-400">
            {archivedTasks.filter(t => t.status === 'completed' || t.status === 'done').length}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 mb-4">
            <Clock className="w-8 h-8 text-pink-400 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Loading archived tasks...</h3>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8">
          <div className="text-center">
            <Archive className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No archived tasks</h2>
            <p className="text-white/60 max-w-md mx-auto">
              {searchQuery 
                ? "No archived tasks match your search."
                : "Completed tasks will be automatically archived after 30 days."}
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
                      {task.title}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      task.status === 'completed' || task.status === 'done'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : task.status === 'cancelled'
                        ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                  
                  {task.description && (
                    <p className="text-white/60 text-sm mb-3">
                      {task.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-white/40">
                    {task.completed_at && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Completed: {new Date(task.completed_at).toLocaleDateString()}
                      </div>
                    )}
                    {task.archived_at && (
                      <div className="flex items-center gap-1">
                        <Archive className="w-4 h-4" />
                        Archived: {new Date(task.archived_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  onClick={() => handleRestore(task.id)}
                  className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors text-base"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restore</span>
                </button>
                
                <button
                  onClick={() => handlePermanentDelete(task.id)}
                  className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors text-base"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Permanently</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
