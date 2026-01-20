"use client";

import React from 'react';
import { format } from 'date-fns';
import DateTimePicker from './DateTimePicker';

type NoteFormData = {
  title: string;
  description: string;
  siteId: string;
  dueDate: Date | null;
  dueTime: string;
  timezone: string;
};

interface NoteFormProps {
  formData: Partial<NoteFormData>;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  sites: Array<{ id: string; name: string | null }>;
}

export default function NoteForm({ formData, setFormData, sites }: NoteFormProps) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Title <span className="text-[#EC4899]">*</span>
        </label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50"
          placeholder="Enter note title"
          required
        />
      </div>

      {/* Description/Content */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Content
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={8}
          className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 resize-none"
          placeholder="Write your note here..."
        />
      </div>

      {/* Date & Time */}
      <DateTimePicker
        value={{
          date: formData.dueDate || null,
          time: formData.dueTime || '',
          timezone: formData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        }}
        onChange={(value) => setFormData(prev => ({ ...prev, ...value }))}
      />

      {/* Site */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Site <span className="text-[#EC4899]">*</span>
        </label>
        <select
          value={formData.siteId || ''}
          onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
          className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 appearance-none cursor-pointer"
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
      </div>
    </div>
  );
}
