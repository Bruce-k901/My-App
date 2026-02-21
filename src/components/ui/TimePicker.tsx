"use client";

import React, { useMemo } from 'react';

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
  step?: number; // Step in seconds (60 = 1 minute, 900 = 15 minutes)
}

/**
 * TimePicker component using dual select dropdowns
 * Enforces step-based increments on all platforms (including iOS)
 * Accepts and returns time in "HH:MM" format
 */
export default function TimePicker({
  value,
  onChange,
  className = "",
  disabled = false,
  required = false,
  id,
  name,
  onBlur,
  step = 60,
}: TimePickerProps) {
  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
    []
  );

  const stepMinutes = Math.max(1, Math.floor(step / 60));
  const minutes = useMemo(
    () => Array.from({ length: Math.floor(60 / stepMinutes) }, (_, i) =>
      String(i * stepMinutes).padStart(2, '0')
    ),
    [stepMinutes]
  );

  // Parse current value and snap to nearest valid minute
  const [h, m] = (value || '00:00').split(':');
  const parsedHour = h?.padStart(2, '0') || '00';
  const parsedMin = parseInt(m || '0', 10);
  const snappedMin = minutes.reduce((prev, curr) =>
    Math.abs(parseInt(curr) - parsedMin) < Math.abs(parseInt(prev) - parsedMin) ? curr : prev
  );

  const selectClass = `
    flex-1 px-2 py-2
    bg-white dark:bg-gray-900
    border-2 border-theme
    rounded-lg
    text-theme-primary
    text-sm font-mono text-center
    focus:outline-none focus:border-blue-500 dark:focus:border-blue-400
    focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20
    disabled:opacity-50 disabled:cursor-not-allowed
    disabled:bg-gray-100 dark:disabled:bg-gray-800
    shadow-sm
    hover:border-gray-400 dark:hover:border-gray-600
    transition-colors
    appearance-none cursor-pointer
  `;

  return (
    <div className={`flex items-center gap-1 ${className}`} id={id}>
      {name && <input type="hidden" name={name} value={`${parsedHour}:${snappedMin}`} />}
      <select
        value={parsedHour}
        onChange={(e) => onChange(`${e.target.value}:${snappedMin}`)}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        className={selectClass}
        aria-label="Hour"
      >
        {hours.map((hr) => (
          <option key={hr} value={hr}>{hr}</option>
        ))}
      </select>
      <span className="text-theme-secondary font-mono text-sm font-bold">:</span>
      <select
        value={snappedMin}
        onChange={(e) => onChange(`${parsedHour}:${e.target.value}`)}
        onBlur={onBlur}
        disabled={disabled}
        className={selectClass}
        aria-label="Minute"
      >
        {minutes.map((min) => (
          <option key={min} value={min}>{min}</option>
        ))}
      </select>
    </div>
  );
}
