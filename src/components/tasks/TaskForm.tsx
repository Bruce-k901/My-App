"use client";

import React from 'react';
import { format } from 'date-fns';
import ParticipantSelector from './ParticipantSelector';
import DateTimePicker from './DateTimePicker';
import { useAppContext } from '@/context/AppContext';

type TaskFormData = {
  title: string;
  description: string;
  siteId: string;
  dueDate: Date | null;
  dueTime: string;
  timezone: string;
  assignedTo: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'blocked';
};

interface TaskFormProps {
  formData: Partial<TaskFormData>;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  sites: Array<{ id: string; name: string | null }>;
}

export default function TaskForm({ formData, setFormData, sites }: TaskFormProps) {
  const { userId, companyId } = useAppContext();

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-2">
          Title <span className="text-[#D37E91]">*</span>
        </label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-theme-primary placeholder-gray-400 dark:placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50"
          placeholder="Enter task title"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-2">
          Description
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-theme-primary placeholder-gray-400 dark:placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 resize-none"
          placeholder="Task details..."
        />
      </div>

      {/* Date & Time */}
      <DateTimePicker
        value={{
          date: formData.dueDate || null,
          time: formData.dueTime || '',
          timezone: formData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        }}
        onChange={(value) => setFormData(prev => ({ ...prev, dueDate: value.date, dueTime: value.time, timezone: value.timezone }))}
        required
      />

      {/* Site */}
      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-2">
          Site <span className="text-[#D37E91]">*</span>
        </label>
        <select
          value={formData.siteId || ''}
          onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
          className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
            paddingRight: '2.5rem',
          }}
          required
        >
          <option value="" className="bg-white dark:bg-[#0B0D13] text-theme-primary">Select a site...</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id} className="bg-white dark:bg-[#0B0D13] text-theme-primary">
              {site.name || 'Unnamed Site'}
            </option>
          ))}
        </select>
      </div>

      {/* Assigned To */}
      {userId && companyId && (
        <ParticipantSelector
          selectedParticipants={formData.assignedTo || []}
          onChange={(participants) => setFormData({ ...formData, assignedTo: participants })}
          currentUserId={userId}
          companyId={companyId}
          sites={sites}
          label="Assign To"
        />
      )}

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-2">
          Priority
        </label>
        <select
          value={formData.priority || 'medium'}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
          className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
            paddingRight: '2.5rem',
          }}
        >
          <option value="low" className="bg-white dark:bg-[#0B0D13] text-theme-primary">Low</option>
          <option value="medium" className="bg-white dark:bg-[#0B0D13] text-theme-primary">Medium</option>
          <option value="high" className="bg-white dark:bg-[#0B0D13] text-theme-primary">High</option>
          <option value="urgent" className="bg-white dark:bg-[#0B0D13] text-theme-primary">Urgent</option>
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-2">
          Status
        </label>
        <select
          value={formData.status || 'todo'}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
            paddingRight: '2.5rem',
          }}
        >
          <option value="todo" className="bg-white dark:bg-[#0B0D13] text-theme-primary">To Do</option>
          <option value="in_progress" className="bg-white dark:bg-[#0B0D13] text-theme-primary">In Progress</option>
          <option value="blocked" className="bg-white dark:bg-[#0B0D13] text-theme-primary">Blocked</option>
        </select>
      </div>
    </div>
  );
}
