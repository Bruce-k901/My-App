'use client';

import { useState, useEffect } from 'react';
import { ShiftPattern } from '@/types/teamly';
import TimePicker from '@/components/ui/TimePicker';
import { X } from '@/components/ui/icons';

const PRESET_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#6366f1', '#64748b',
];

const calculateNetHours = (start: string, end: string, breakMins: number): number => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60;
  return Math.round(((endMins - startMins - breakMins) / 60) * 10) / 10;
};

interface ShiftPatternFormProps {
  pattern?: ShiftPattern | null;
  onSubmit: (data: {
    name: string;
    short_code: string;
    description: string | null;
    start_time: string;
    end_time: string;
    break_duration_minutes: number;
    color: string;
    is_active: boolean;
  }) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

export default function ShiftPatternForm({ pattern, onSubmit, onClose, isSubmitting }: ShiftPatternFormProps) {
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMins, setBreakMins] = useState(30);
  const [color, setColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (pattern) {
      setName(pattern.name);
      setShortCode(pattern.short_code || '');
      setDescription(pattern.description || '');
      setStartTime(pattern.start_time);
      setEndTime(pattern.end_time);
      setBreakMins(pattern.break_duration_minutes);
      setColor(pattern.color);
    }
  }, [pattern]);

  const netHours = calculateNetHours(startTime, endTime, breakMins);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({
      name: name.trim(),
      short_code: shortCode.trim().toUpperCase() || name.trim().substring(0, 4).toUpperCase(),
      description: description.trim() || null,
      start_time: startTime,
      end_time: endTime,
      break_duration_minutes: breakMins,
      color,
      is_active: true,
    });
  };

  const formatTime = (time: string): string => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const mins = m !== '00' ? `:${m}` : '';
    if (hour === 0) return `12${mins}am`;
    if (hour === 12) return `12${mins}pm`;
    return hour > 12 ? `${hour - 12}${mins}pm` : `${hour}${mins}am`;
  };

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-theme-surface rounded-xl border border-theme w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <h3 className="text-lg font-semibold text-theme-primary">
            {pattern ? 'Edit Shift Pattern' : 'Add Shift Pattern'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-theme-hover rounded-lg transition-colors">
            <X className="w-5 h-5 text-theme-tertiary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name + Short Code */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-theme-tertiary mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Morning"
                required
                className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-module-fg focus:ring-1 focus:ring-module-fg transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-theme-tertiary mb-1">Short Code</label>
              <input
                type="text"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.toUpperCase().slice(0, 5))}
                placeholder="AM"
                maxLength={5}
                className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm uppercase focus:outline-none focus:border-module-fg focus:ring-1 focus:ring-module-fg transition-colors"
              />
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-theme-tertiary mb-1">Start Time</label>
              <TimePicker value={startTime} onChange={setStartTime} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-theme-tertiary mb-1">End Time</label>
              <TimePicker value={endTime} onChange={setEndTime} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-theme-tertiary mb-1">Break (mins)</label>
              <input
                type="number"
                min="0"
                max="480"
                step="15"
                value={breakMins}
                onChange={(e) => setBreakMins(Math.max(0, Math.min(480, parseInt(e.target.value) || 0)))}
                className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-module-fg focus:ring-1 focus:ring-module-fg transition-colors"
              />
            </div>
          </div>

          {/* Net Hours Preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-theme-muted">
            <div className="w-3 h-8 rounded" style={{ backgroundColor: color }} />
            <div className="flex-1">
              <p className="text-sm font-medium text-theme-primary">
                {shortCode || name.substring(0, 4).toUpperCase() || '—'}: {formatTime(startTime)} – {formatTime(endTime)}
              </p>
              <p className="text-xs text-theme-tertiary">
                {netHours}h net ({breakMins}min break)
              </p>
            </div>
          </div>

          {/* Colour */}
          <div>
            <label className="block text-xs text-theme-tertiary mb-2">Colour</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    color === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-theme-tertiary mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Standard morning shift with breakfast service"
              rows={2}
              className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm resize-none focus:outline-none focus:border-module-fg focus:ring-1 focus:ring-module-fg transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-theme-secondary hover:text-theme-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 text-sm font-medium border border-module-fg text-module-fg rounded-lg hover:shadow-[0_0_12px_rgba(var(--module-fg-rgb),0.7)] transition-all duration-200 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : pattern ? 'Save Changes' : 'Add Pattern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
