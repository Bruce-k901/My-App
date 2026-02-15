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
  step?: number; // Step in seconds (60 = 1 minute, 900 = 15 minutes)
}

/**
 * TimePicker component using native time input
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
  step = 60, // Default to 1-minute increments
}: TimePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <input
      type="time"
      id={id}
      name={name}
      value={value}
      onChange={handleChange}
      onBlur={onBlur}
      disabled={disabled}
      required={required}
      step={step}
      placeholder={placeholder}
      className={`
        w-full px-3 py-2
        bg-white dark:bg-gray-900
        border-2 border-theme
        rounded-lg
        text-theme-primary
        text-sm font-mono
        focus:outline-none focus:border-blue-500 dark:focus:border-blue-400
        focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20
        disabled:opacity-50 disabled:cursor-not-allowed
        disabled:bg-gray-100 dark:disabled:bg-gray-800
        shadow-sm
        hover:border-gray-400 dark:hover:border-gray-600
        transition-colors
        ${className}
      `}
    />
  );
}
