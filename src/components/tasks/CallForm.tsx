"use client";

import React from 'react';
import { format } from 'date-fns';
import ParticipantSelector from './ParticipantSelector';
import DateTimePicker from './DateTimePicker';
import { useAppContext } from '@/context/AppContext';

type CallFormData = {
  title: string;
  description: string;
  siteId: string;
  dueDate: Date | null;
  dueTime: string;
  timezone: string;
  participants: string[];
  duration: '15' | '30' | '60' | 'custom';
  customDuration?: number;
  location: 'office' | 'virtual' | 'custom';
  customLocation?: string;
  meetingLink?: string;
};

interface CallFormProps {
  formData: Partial<CallFormData>;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  sites: Array<{ id: string; name: string | null }>;
  onParticipantsChange?: (participants: string[], participantNames?: string[]) => void;
}

export default function CallForm({ formData, setFormData, sites, onParticipantsChange }: CallFormProps) {
  const { userId, companyId } = useAppContext();

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
          <span>
            Title <span className="text-[#D37E91]">*</span>
          </span>
          <span className="text-xs text-gray-500 dark:text-white/40 font-normal">
            Auto-generated from selections
          </span>
        </label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50"
          placeholder="Enter call title"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
          Description
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 resize-none"
          placeholder="Call agenda or notes..."
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

      {/* Participants */}
      {userId && companyId && (
        <ParticipantSelector
          selectedParticipants={formData.participants || []}
          onChange={(participants, participantNames) => {
            setFormData({ ...formData, participants });
            if (onParticipantsChange) {
              onParticipantsChange(participants, participantNames);
            }
          }}
          currentUserId={userId}
          companyId={companyId}
          required
        />
      )}

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
          Duration
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(['15', '30', '60'] as const).map((dur) => (
            <button
              key={dur}
              type="button"
              onClick={() => setFormData({ ...formData, duration: dur })}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                formData.duration === dur
                  ? 'bg-[#D37E91] text-white'
                  : 'bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {dur} min
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFormData({ ...formData, duration: 'custom' })}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              formData.duration === 'custom'
                ? 'bg-[#D37E91] text-white'
                : 'bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Custom
          </button>
        </div>
        {formData.duration === 'custom' && (
          <input
            type="number"
            min="5"
            step="5"
            value={formData.customDuration || ''}
            onChange={(e) => setFormData({ ...formData, customDuration: parseInt(e.target.value) || undefined })}
            placeholder="Minutes"
            className="w-full mt-2 px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50"
          />
        )}
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
          Location
        </label>
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {(['office', 'virtual', 'custom'] as const).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setFormData({ ...formData, location: loc })}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  formData.location === loc
                    ? 'bg-[#D37E91] text-white'
                    : 'bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
          {formData.location === 'custom' && (
            <input
              type="text"
              value={formData.customLocation || ''}
              onChange={(e) => setFormData({ ...formData, customLocation: e.target.value })}
              placeholder="Enter location"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50"
            />
          )}
        </div>
      </div>

      {/* Meeting Link */}
      {formData.location === 'virtual' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
            Call Link
          </label>
          <input
            type="url"
            value={formData.meetingLink || ''}
            onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
            placeholder="https://..."
            className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50"
          />
        </div>
      )}
    </div>
  );
}
