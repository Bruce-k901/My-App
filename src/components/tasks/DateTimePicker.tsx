"use client";

import React from 'react';
import { Calendar, Clock } from '@/components/ui/icons';
import { format } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import TimePicker from '../ui/TimePicker';

interface DateTimePickerProps {
  value: {
    date: Date | null;
    time: string;
    timezone: string;
  };
  onChange: (value: { date: Date | null; time: string; timezone: string }) => void;
  label?: string;
  required?: boolean;
}

export default function DateTimePicker({
  value,
  onChange,
  label = 'Date & Time',
  required = false
}: DateTimePickerProps) {
  const userTimezone = value.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const dateValue = value.date 
    ? format(value.date, 'yyyy-MM-dd')
    : '';
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      // Parse date string in local timezone to avoid timezone shift issues
      const [year, month, day] = e.target.value.split('-').map(Number);
      const newDate = new Date(year, month - 1, day);
      onChange({
        ...value,
        date: newDate,
      });
    } else {
      onChange({
        ...value,
        date: null,
      });
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    onChange({
      ...value,
      time: newTime || '',
    });
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-theme-secondary">
        {label} {required && <span className="text-[#D37E91]">*</span>}
      </label>

      <div className="grid grid-cols-2 gap-4">
        {/* Date Picker */}
        <div>
          <label className="flex items-center gap-1 text-xs text-theme-secondary mb-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Date
          </label>
          <input
            type="date"
            value={dateValue}
            onChange={(e) => {
              e.stopPropagation();
              handleDateChange(e);
            }}
            onClick={(e) => e.stopPropagation()}
            onInput={(e) => {
              e.stopPropagation();
            }}
            min={format(new Date(), 'yyyy-MM-dd')}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 focus:border-[#D37E91]/50 cursor-pointer"
            required={required}
          />
        </div>

        {/* Time Picker */}
        <div>
          <label className="flex items-center gap-1 text-xs text-theme-secondary mb-1.5">
            <Clock className="w-3.5 h-3.5" />
            Time
          </label>
          <TimePicker
            value={value.time || ''}
            onChange={(newTime) => {
              onChange({
                ...value,
                time: newTime,
              });
            }}
            step={900}
            className="w-full"
            required={required}
          />
        </div>
      </div>

      {/* Timezone Display */}
      <p className="text-xs text-theme-tertiary mt-1">
        Timezone: {userTimezone}
      </p>
    </div>
  );
}
