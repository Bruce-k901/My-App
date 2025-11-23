'use client';

import { useState, useEffect } from 'react';

interface TimePickerProps {
  value: string; // Format: "HH:MM" or empty string
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function TimePicker({
  value,
  onChange,
  className = '',
  placeholder = 'Select time',
  disabled = false,
  required = false
}: TimePickerProps) {
  // Parse the value into hours and minutes
  const [hours, setHours] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('');

  // Update local state when value prop changes
  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      setHours(h.padStart(2, '0'));
      setMinutes(m.padStart(2, '0'));
    } else {
      setHours('');
      setMinutes('');
    }
  }, [value]);

  // Generate hour options (00-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return { value: hour, label: hour };
  });

  // Generate minute options (00, 15, 30, 45)
  const minuteOptions = [
    { value: '00', label: '00' },
    { value: '15', label: '15' },
    { value: '30', label: '30' },
    { value: '45', label: '45' },
  ];

  const handleHourChange = (newHour: string) => {
    setHours(newHour);
    if (newHour && minutes) {
      onChange(`${newHour}:${minutes}`);
    } else if (newHour) {
      // If hour is set but no minutes, default to 00
      setMinutes('00');
      onChange(`${newHour}:00`);
    } else {
      onChange('');
    }
  };

  const handleMinuteChange = (newMinute: string) => {
    setMinutes(newMinute);
    if (hours && newMinute) {
      onChange(`${hours}:${newMinute}`);
    } else if (newMinute) {
      // If minute is set but no hour, default to 00
      setHours('00');
      onChange(`00:${newMinute}`);
    } else {
      onChange('');
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Hours Select */}
      <select
        value={hours}
        onChange={(e) => handleHourChange(e.target.value)}
        disabled={disabled}
        required={required}
        className="px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-pink-500/50 focus:shadow-[0_0_12px_rgba(236,72,153,0.3)] transition-all duration-200 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255,255,255,0.7)%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:1.5em] bg-[right_0.5rem_center] hover:bg-white/[0.08] hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ colorScheme: 'dark' }}
      >
        <option value="" className="bg-[#0B0D13] text-white">{placeholder}</option>
        {hourOptions.map((hour) => (
          <option key={hour.value} value={hour.value} className="bg-[#0B0D13] text-white">
            {hour.label}
          </option>
        ))}
      </select>

      <span className="text-white/60">:</span>

      {/* Minutes Select */}
      <select
        value={minutes}
        onChange={(e) => handleMinuteChange(e.target.value)}
        disabled={disabled || !hours}
        required={required && hours ? true : false}
        className="px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-pink-500/50 focus:shadow-[0_0_12px_rgba(236,72,153,0.3)] transition-all duration-200 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255,255,255,0.7)%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:1.5em] bg-[right_0.5rem_center] hover:bg-white/[0.08] hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ colorScheme: 'dark' }}
      >
        <option value="" className="bg-[#0B0D13] text-white">--</option>
        {minuteOptions.map((minute) => (
          <option key={minute.value} value={minute.value} className="bg-[#0B0D13] text-white">
            {minute.label}
          </option>
        ))}
      </select>
    </div>
  );
}

