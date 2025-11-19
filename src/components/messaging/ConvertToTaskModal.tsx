"use client";

import React, { useState } from 'react';
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
  const [taskData, setTaskData] = useState({
    name: message.content.substring(0, 100), // First 100 chars as name
    notes: message.content,
    assigned_to: '',
    due_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    site_id: conversationContext?.site_id || userSiteId || '',
    asset_id: conversationContext?.asset_id || ''
  });

  const handleCreate = async () => {
    if (!taskData.name.trim()) {
      toast.error('Please enter a task name');
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
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          name: taskData.name,
          notes: taskData.notes,
          assigned_to: taskData.assigned_to || null,
          due_date: taskData.due_date || new Date().toISOString().split('T')[0],
          status: 'pending',
          company_id: companyId,
          site_id: taskData.site_id,
          linked_asset_id: taskData.asset_id || null,
          created_at: new Date().toISOString(),
        })
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
        await supabase.from('messaging_messages').insert({
          channel_id: message.channel_id,
          sender_id: userId,
          sender_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'System',
          content: `Created task: "${taskData.name}"`,
          message_type: 'system',
          is_system: true,
          attachments: [],
          metadata: {
            type: 'task_created',
            task_id: task.id,
            original_message_id: message.id
          }
        });
      }

      toast.success('Task created successfully');
      onSuccess(task.id);
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

          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Task Name *
            </label>
            <input
              type="text"
              value={taskData.name}
              onChange={(e) => setTaskData({ ...taskData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#EC4899] transition-colors"
              placeholder="Enter task name..."
              maxLength={200}
            />
          </div>

          {/* Task Notes */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Notes
            </label>
            <textarea
              value={taskData.notes}
              onChange={(e) => setTaskData({ ...taskData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#EC4899] transition-colors resize-none"
              placeholder="Add more details..."
            />
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
            disabled={loading || !taskData.name.trim()}
            className="px-6 py-2.5 bg-transparent text-[#EC4899] border border-[#EC4899] rounded-lg font-medium hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

