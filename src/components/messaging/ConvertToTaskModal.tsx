"use client";

import React, { useState, useEffect } from 'react';
import { CheckSquare, X, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';
import type { Message } from '@/types/messaging';

interface ConvertToTaskModalProps {
  message: Message;
  conversationContext?: {
    site_id?: string;
    asset_id?: string;
  };
  onClose: () => void;
  onSuccess: (taskId: string) => void;
}

export default function ConvertToTaskModal({ 
  message, 
  conversationContext,
  onClose, 
  onSuccess 
}: ConvertToTaskModalProps) {
  const { companyId, siteId: userSiteId, userId } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Array<{ id: string; name: string | null }>>([]);
  const [taskData, setTaskData] = useState({
    title: (message.content || '').substring(0, 100), // First 100 chars as title
    description: message.content || '',
    assigned_to: '',
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    site_id: conversationContext?.site_id || userSiteId || '',
    asset_id: conversationContext?.asset_id || ''
  });

  // Fetch sites for the company
  useEffect(() => {
    const fetchSites = async () => {
      if (!companyId) return;
      
      try {
        const { data, error } = await supabase
          .from('sites')
          .select('id, name')
          .eq('company_id', companyId)
          .order('name');
        
        if (error) throw error;
        setSites(data || []);
        
        // If no site_id is set and we have sites, set the first one as default
        if ((!conversationContext?.site_id && !userSiteId) && data && data.length > 0) {
          setTaskData(prev => {
            // Only update if site_id is still empty
            if (!prev.site_id) {
              return { ...prev, site_id: data[0].id };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error fetching sites:', error);
      }
    };
    
    fetchSites();
  }, [companyId, conversationContext?.site_id, userSiteId]);

  const handleCreate = async () => {
    if (!taskData.title?.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    if (!companyId) {
      toast.error('Company ID is required');
      return;
    }

    if (!taskData.site_id) {
      toast.error('Site ID is required');
      return;
    }

    setLoading(true);
    try {
      // 1. Create the task in the tasks table
      const taskInsert: any = {
        title: taskData.title,
        description: taskData.description,
        due_date: taskData.due_date || new Date().toISOString().split('T')[0],
        status: 'todo',
        company_id: companyId,
        site_id: taskData.site_id,
        created_by: userId,
        created_from_message_id: message.id,
      };

      // Only add optional fields if they have values
      if (taskData.assigned_to && taskData.assigned_to.trim() !== '') {
        taskInsert.assigned_to = taskData.assigned_to;
      }
      if (taskData.asset_id && taskData.asset_id.trim() !== '') {
        taskInsert.linked_asset_id = taskData.asset_id;
      }
      if (taskData.priority) {
        taskInsert.priority = taskData.priority;
      }

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert(taskInsert)
        .select()
        .single();

      if (taskError) throw taskError;

      // 2. Update the message to mark it as a task
      const { error: messageError } = await supabase
        .from('messaging_messages')
        .update({
          metadata: {
            ...message.metadata,
            is_task: true,
            task_id: task.id,
            action_taken: true,
            action_type: 'task_created',
            action_entity_id: task.id
          }
        })
        .eq('id', message.id);

      if (messageError) throw messageError;

      // 3. Add a system message to the conversation
      if (userId) {
        const { data: { user } } = await supabase.auth.getUser();
        const senderName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'System';
        await supabase.from('messaging_messages').insert({
          channel_id: message.channel_id,
          sender_profile_id: userId,
          content: `Created task: "${taskData.title}"`,
          message_type: 'text',
          metadata: {
            type: 'task_created',
            task_id: task.id,
            original_message_id: message.id,
            sender_name: senderName,
            sender_email: user?.email,
          }
        });
      }

      toast.success('Task created successfully');
      onSuccess(task.id);
      onClose();
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error(error?.message || 'Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1d2e] border border-white/[0.08] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckSquare className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Convert to Task</h2>
              <p className="text-sm text-white/60">Create a trackable task from this message</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-white/60" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Original Message Preview */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
            <p className="text-xs text-white/40 mb-2">Original Message:</p>
            <p className="text-sm text-white/80 line-clamp-3">{message.content}</p>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Task Title *
            </label>
            <input
              type="text"
              value={taskData.title}
              onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#EC4899] transition-colors"
              placeholder="Enter task title..."
              maxLength={200}
            />
          </div>

          {/* Task Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Description
            </label>
            <textarea
              value={taskData.description}
              onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#EC4899] transition-colors resize-none"
              placeholder="Add more details..."
            />
          </div>

          {/* Site Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Site *
            </label>
            <select
              value={taskData.site_id}
              onChange={(e) => setTaskData({ ...taskData, site_id: e.target.value })}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-[#EC4899] transition-colors appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                paddingRight: '2.5rem',
              }}
              required
            >
              <option value="" className="bg-[#0B0D13] text-white">Select a site...</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id} className="bg-[#0B0D13] text-white">
                  {site.name || 'Unnamed Site'}
                </option>
              ))}
            </select>
            {sites.length === 0 && (
              <p className="text-xs text-white/50 mt-1">No sites available. Please create a site first.</p>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              <Calendar className="inline h-4 w-4 mr-2" />
              Due Date
            </label>
            <input
              type="date"
              value={taskData.due_date}
              onChange={(e) => setTaskData({ ...taskData, due_date: e.target.value })}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-[#EC4899] transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white hover:bg-white/[0.06] transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !taskData.title.trim() || !taskData.site_id}
            className="px-6 py-2.5 bg-transparent text-[#EC4899] border border-[#EC4899] rounded-lg font-medium hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

