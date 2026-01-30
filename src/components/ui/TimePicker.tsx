"use client";

import React from 'react';

interface TimePickerProps {
  value: string; // Format: "HH:MM" or empty string
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  id?: string;
  name?: string;
  onBlur?: () => void;
}

/**
 * TimePicker component that restricts minutes to 15-minute increments (00, 15, 30, 45)
 * Accepts and returns time in "HH:MM" format
 */
export default function TimePicker({
  value,
  onChange,
  className = "",
  disabled = false,
  placeholder = "HH:MM",
  required = false,
  id,
  name,
  onBlur,
}: TimePickerProps) {
  // Parse the time value
  const [hours, minutes] = value ? value.split(':') : ['', ''];
  const hourValue = hours || '';
  const minuteValue = minutes || '';

  // Round minutes to nearest 15-minute increment if needed
  const getRoundedMinute = (min: string): string => {
    if (!min) return '';
    const minNum = parseInt(min, 10);
    if (isNaN(minNum)) return '';
    // Round to nearest 15-minute increment
    const rounded = Math.round(minNum / 15) * 15;
    return String(rounded).padStart(2, '0');
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = e.target.value;
    const currentMinute = minuteValue || '00';
    const roundedMinute = getRoundedMinute(currentMinute);
    onChange(newHour && roundedMinute ? `${newHour}:${roundedMinute}` : newHour ? `${newHour}:00` : '');
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = e.target.value;
    const currentHour = hourValue || '00';
    onChange(currentHour && newMinute ? `${currentHour}:${newMinute}` : '');
  };

  // If we have a value with minutes not in 15-minute increments, round it
  React.useEffect(() => {
    if (value && minuteValue) {
      const rounded = getRoundedMinute(minuteValue);
      if (rounded !== minuteValue && rounded !== '') {
        const newValue = hourValue ? `${hourValue}:${rounded}` : '';
        if (newValue !== value) {
          onChange(newValue);
        }
      }
    }
  }, [value]); // Only run when value changes externally

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Hour Selector */}
      <select
        id={id ? `${id}-hour` : undefined}
        name={name ? `${name}-hour` : undefined}
        value={hourValue}
        onChange={handleHourChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required && !value}
        className="px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-gray-900 text-sm font-medium focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:border-gray-200 shadow-sm hover:border-gray-400 transition-colors appearance-none cursor-pointer min-w-[70px]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          paddingRight: '32px'
        }}
      >
        <option value="" className="text-gray-500">HH</option>
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={String(i).padStart(2, '0')} className="text-gray-900">
            {String(i).padStart(2, '0')}
          </option>
        ))}
      </select>
      
      <span className="text-gray-600 text-lg font-semibold">:</span>
      
      {/* Minute Selector - Only 15-minute increments */}
      <select
        id={id ? `${id}-minute` : undefined}
        name={name ? `${name}-minute` : undefined}
        value={minuteValue ? getRoundedMinute(minuteValue) : ''}
        onChange={handleMinuteChange}
        onBlur={onBlur}
        disabled={disabled || !hourValue}
        required={required && hourValue && !minuteValue}
        className={`px-3 py-2 border-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 transition-colors appearance-none cursor-pointer min-w-[70px] shadow-sm ${
          disabled || !hourValue
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-pink-500 focus:ring-pink-500/20'
        }`}
        style={{
          backgroundImage: disabled || !hourValue 
            ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`
            : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          paddingRight: '32px'
        }}
      >
        <option value="" className="text-gray-500">MM</option>
        {[0, 15, 30, 45].map((minute) => (
          <option key={minute} value={String(minute).padStart(2, '0')} className="text-gray-900">
            {String(minute).padStart(2, '0')}
          </option>
        ))}
      </select>
    </div>
  );
}
