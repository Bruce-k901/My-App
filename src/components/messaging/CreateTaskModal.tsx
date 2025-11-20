"use client";

import React, { useState, useEffect } from 'react';
import { CheckSquare, X, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';
import type { Message } from '@/types/messaging';

interface CreateTaskModalProps {
  message: Message;
  conversationContext?: {
    site_id?: string;
    asset_id?: string;
  };
  onClose: () => void;
  onSuccess: (taskId: string) => void;
}

export default function CreateTaskModal({ 
  message, 
  conversationContext,
  onClose, 
  onSuccess 
}: CreateTaskModalProps) {
  const { companyId, siteId: userSiteId, userId } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string | null; email: string | null }>>([]);
  
  // Set default due date to today
  const today = new Date().toISOString().split('T')[0];
  const defaultTime = new Date().toTimeString().slice(0, 5); // HH:MM format
  
  const [taskData, setTaskData] = useState({
    title: `Follow up: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`,
    description: message.content,
    assigned_to: '',
    due_date: today,
    due_time: defaultTime,
    priority: 'medium' as 'low' | 'medium' | 'high',
    site_id: conversationContext?.site_id || userSiteId || '',
    asset_id: conversationContext?.asset_id || '',
    category: 'follow-up' as string
  });

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      if (!companyId) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('company_id', companyId)
          .order('full_name');
        
        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    fetchUsers();
  }, [companyId]);

  const handleCreate = async () => {
    if (!taskData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    if (!companyId) {
      toast.error('Company ID is required');
      return;
    }

    if (!taskData.site_id || taskData.site_id.trim() === '') {
      toast.error('Site ID is required. Please ensure you have a site selected.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Validate required fields
      if (!taskData.site_id) {
        toast.error('Site ID is required. Please select a site.');
        setLoading(false);
        return;
      }

      // Combine date and time into a datetime for due_date
      // The tasks table uses due_date (date), but we'll store the time in notes or metadata if needed
      // For now, we'll just use the date and ensure it shows up in today's tasks
      const dueDate = taskData.due_date;
      
      // 1. Create the task in the tasks table
      const taskInsert: any = {
        title: taskData.title,
        description: taskData.description + (taskData.due_time ? `\n\nDue time: ${taskData.due_time}` : ''),
        due_date: dueDate,
        status: 'todo', // Changed from 'pending' to 'todo' to match check constraint
        company_id: companyId,
        site_id: taskData.site_id,
        created_by: userId,
        created_from_message_id: message.id,
      };

      // Only add optional fields if they have values
      if (taskData.assigned_to && taskData.assigned_to.trim() !== '') {
        // Store assignment in description if staff_id column doesn't exist
        taskInsert.description = taskInsert.description + `\n\nAssigned to: ${users.find(u => u.id === taskData.assigned_to)?.full_name || users.find(u => u.id === taskData.assigned_to)?.email || 'User'}`;
      }
      if (taskData.asset_id && taskData.asset_id.trim() !== '') {
        taskInsert.linked_asset_id = taskData.asset_id;
      }
      if (taskData.category) {
        taskInsert.category = taskData.category;
      }

      console.log('Creating task with data:', taskInsert);

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert(taskInsert)
        .select()
        .single();

      if (taskError) {
        console.error('Task creation error details:', {
          message: taskError.message,
          details: taskError.details,
          hint: taskError.hint,
          code: taskError.code,
          fullError: taskError,
        });
        throw taskError;
      }

      // 2. Update the message to mark it has a task
      const { error: messageError } = await supabase
        .from('messaging_messages')
        .update({
          metadata: {
            ...message.metadata,
            action_suggested: true,
            action_type: 'task',
            action_entity_id: task.id,
          }
        })
        .eq('id', message.id);

      if (messageError) {
        console.warn('Could not update message metadata:', messageError);
        // Don't fail the whole operation if this fails
      }

      toast.success('Task created successfully!');
      onSuccess(task.id);
      onClose();
    } catch (error: any) {
      console.error('Error creating task:', error);
      
      // Extract error message with better handling
      let errorMessage = 'Failed to create task';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.hint) {
        errorMessage = error.hint;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error) {
        // Try to stringify the error
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = 'Unknown error occurred';
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0B0D13] border border-white/[0.1] rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#EC4899]" />
            <h2 className="text-lg font-semibold text-white">Create Task</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/60 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              value={taskData.title}
              onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
              className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50"
              placeholder="Enter task title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Description
            </label>
            <textarea
              value={taskData.description}
              onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 resize-none"
              placeholder="Task details..."
            />
          </div>

          {/* Due Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Due Date *
              </label>
              <input
                type="date"
                value={taskData.due_date}
                onChange={(e) => setTaskData({ ...taskData, due_date: e.target.value })}
                min={today}
                className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Due Time
              </label>
              <input
                type="time"
                value={taskData.due_time}
                onChange={(e) => setTaskData({ ...taskData, due_time: e.target.value })}
                className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50"
              />
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Assign To
            </label>
            <select
              value={taskData.assigned_to}
              onChange={(e) => setTaskData({ ...taskData, assigned_to: e.target.value })}
              className="w-full px-4 py-2 bg-[#0B0D13] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                paddingRight: '2.5rem',
              }}
            >
              <option value="" className="bg-[#0B0D13] text-white">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id} className="bg-[#0B0D13] text-white">
                  {user.full_name || user.email || 'Unknown'}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Priority
            </label>
            <select
              value={taskData.priority}
              onChange={(e) => setTaskData({ ...taskData, priority: e.target.value as 'low' | 'medium' | 'high' })}
              className="w-full px-4 py-2 bg-[#0B0D13] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                paddingRight: '2.5rem',
              }}
            >
              <option value="low" className="bg-[#0B0D13] text-white">Low</option>
              <option value="medium" className="bg-[#0B0D13] text-white">Medium</option>
              <option value="high" className="bg-[#0B0D13] text-white">High</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white/[0.05] border border-white/[0.1] text-white/70 rounded-lg hover:bg-white/[0.08] transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !taskData.title.trim()}
            className="flex-1 px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] rounded-lg hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

