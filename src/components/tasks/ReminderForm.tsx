"use client";

import React from 'react';
import DateTimePicker from './DateTimePicker';

type ReminderFormData = {
  title: string;
  description: string;
  siteId: string;
  dueDate: Date | null;
  dueTime: string;
  timezone: string;
  repeat: 'once' | 'daily' | 'weekly';
};

interface ReminderFormProps {
  formData: Partial<ReminderFormData>;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  sites: Array<{ id: string; name: string | null }>;
}

export default function ReminderForm({ formData, setFormData, sites }: ReminderFormProps) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
          Title <span className="text-[#D37E91]">*</span>
        </label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50"
          placeholder="Enter reminder title"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
          Notes
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 resize-none"
          placeholder="Add any notes for this reminder..."
        />
      </div>

      {/* Repeat Option */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
          Repeat
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['once', 'daily', 'weekly'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFormData({ ...formData, repeat: option })}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                formData.repeat === option
                  ? 'bg-[#D37E91] text-white shadow-[0_0_12px_rgba(211,126,145,0.4)]'
                  : 'bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.05]'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Date & Time */}
      <DateTimePicker
        value={{
          date: formData.dueDate || null,
          time: formData.dueTime || '',
          timezone: formData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        }}
        onChange={(value) => setFormData((prev: any) => ({ ...prev, dueDate: value.date, dueTime: value.time, timezone: value.timezone }))}
      />

      {/* Site */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
          Site <span className="text-[#D37E91]">*</span>
        </label>
        <select
          value={formData.siteId || ''}
          onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
          className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
            paddingRight: '2.5rem',
          }}
          required
        >
          <option value="" className="bg-white dark:bg-[#0B0D13] text-gray-900 dark:text-white">Select a site...</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id} className="bg-white dark:bg-[#0B0D13] text-gray-900 dark:text-white">
              {site.name || 'Unnamed Site'}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
