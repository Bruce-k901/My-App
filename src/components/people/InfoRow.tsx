'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Edit } from '@/components/ui/icons';

export interface InfoRowProps {
  label: string;
  value: string;
  actualValue?: unknown;
  status?: 'success' | 'warning' | 'error';
  fieldName?: string;
  employeeId?: string;
  onUpdate?: () => void;
  type?: 'text' | 'date' | 'number' | 'select' | 'boolean' | 'textarea';
  options?: { value: string; label: string }[];
}

export function InfoRow({
  label,
  value,
  actualValue,
  status,
  fieldName,
  employeeId,
  onUpdate,
  type = 'text',
  options,
}: InfoRowProps) {
  const [isEditing, setIsEditing] = useState(false);

  const originalEditValue = useMemo(() => {
    const isPlaceholder = (v: unknown) =>
      v === null ||
      v === undefined ||
      v === '' ||
      v === 'Not set' ||
      v === 'N/A' ||
      v === 'No expiry';

    const toIsoDate = (v: unknown): string | null => {
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      if (!s) return null;

      // Already ISO date or datetime
      const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})/);
      if (isoMatch) return isoMatch[1];

      // en-GB formatted date: DD/MM/YYYY
      const gbMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (gbMatch) {
        const dd = gbMatch[1].padStart(2, '0');
        const mm = gbMatch[2].padStart(2, '0');
        const yyyy = gbMatch[3];
        return `${yyyy}-${mm}-${dd}`;
      }

      // Best-effort fallback
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      return null;
    };

    const toNumberString = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'number' && Number.isFinite(v)) return String(v);
      const s = String(v);
      const cleaned = s.replace(/[^0-9.-]/g, '');
      const n = cleaned ? Number.parseFloat(cleaned) : NaN;
      return Number.isFinite(n) ? String(n) : '';
    };

    if (type === 'date') {
      if (!isPlaceholder(actualValue)) {
        const iso = toIsoDate(actualValue);
        return iso || '';
      }
      if (isPlaceholder(value)) return '';
      const iso = toIsoDate(value);
      return iso || '';
    }

    if (type === 'number') {
      if (!isPlaceholder(actualValue)) return toNumberString(actualValue);
      if (isPlaceholder(value)) return '';
      return toNumberString(value);
    }

    if (type === 'boolean') {
      if (typeof actualValue === 'boolean') return actualValue ? 'true' : 'false';
      if (value === 'Yes') return 'true';
      if (value === 'No') return 'false';
      if (value === 'true' || value === 'false') return value;
      return '';
    }

    if (type === 'select' && options) {
      const actual = actualValue === null || actualValue === undefined ? '' : String(actualValue);
      if (actual && options.some((o) => o.value === actual)) return actual;

      const labelStr = value === null || value === undefined ? '' : String(value).trim().toLowerCase();
      const matched = options.find(
        (o) => o.value === value || o.label.trim().toLowerCase() === labelStr
      );
      return matched?.value || '';
    }

    return isPlaceholder(value) ? '' : value;
  }, [type, value, actualValue, options]);

  const [editValue, setEditValue] = useState(originalEditValue);

  // Keep edit state in sync when the backing value changes (e.g. after refresh)
  useEffect(() => {
    if (!isEditing) setEditValue(originalEditValue);
  }, [originalEditValue, isEditing]);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fieldName || !employeeId || editValue === originalEditValue) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {};

      if (type === 'number') {
        const numValue = editValue ? parseFloat(editValue) : null;
        if (fieldName === 'hourly_rate' && numValue !== null) {
          updateData[fieldName] = Math.round(numValue * 100); // Convert to pence
        } else {
          updateData[fieldName] = numValue;
        }
      } else if (type === 'boolean') {
        updateData[fieldName] = editValue === 'true' || editValue === 'Yes';
      } else if (type === 'date') {
        updateData[fieldName] = editValue || null;
      } else if (type === 'select') {
        updateData[fieldName] = editValue === '' || editValue === 'Not set' ? null : editValue;
      } else {
        updateData[fieldName] = editValue || null;
      }

      const res = await fetch('/api/people/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, updateData }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Update failed');
      }

      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error('Error updating field:', err);
      alert(`Failed to update ${label}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(originalEditValue);
    setIsEditing(false);
  };

  const inputClassName =
    'flex-1 max-w-xs px-2 py-1 bg-theme-surface-elevated border border-module-fg/50 rounded text-theme-primary text-sm focus:ring-2 focus:ring-module-fg focus:border-module-fg transition-colors';

  if (!fieldName || !employeeId) {
    // Non-editable row - maintain alignment with editable rows
    return (
      <div className="flex justify-between items-center py-2 border-b border-theme group">
        <span className="text-theme-tertiary text-sm">{label}</span>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span
            className={`text-right text-sm ${
              status === 'success'
                ? 'text-green-400'
                : status === 'warning'
                  ? 'text-amber-400'
                  : status === 'error'
                    ? 'text-red-400'
                    : 'text-theme-primary'
            }`}
          >
            {value}
          </span>
          {/* Invisible placeholder to maintain alignment */}
          <button
            disabled
            className="opacity-0 px-2 py-1 pointer-events-none"
            aria-hidden="true"
            tabIndex={-1}
            style={{ visibility: 'hidden' }}
          >
            <Edit className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center py-2 border-b border-theme group">
      <span className="text-theme-tertiary text-sm">{label}</span>
      <div className="flex items-center gap-2 flex-1 justify-end">
        {isEditing ? (
          <>
            {type === 'select' && options ? (
              <select
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                className={inputClassName}
                autoFocus
                disabled={options.length === 0}
              >
                <option value="">Not set</option>
                {options.length > 0 ? (
                  options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    Loading options...
                  </option>
                )}
              </select>
            ) : type === 'boolean' ? (
              <select
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className={inputClassName}
                autoFocus
              >
                <option value="">Not set</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : type === 'date' ? (
              <input
                type="date"
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                className={inputClassName}
                autoFocus
              />
            ) : type === 'number' ? (
              <input
                type="number"
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                className={inputClassName}
                autoFocus
              />
            ) : type === 'textarea' ? (
              <textarea
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                className={inputClassName}
                rows={2}
                autoFocus
              />
            ) : (
              <input
                type="text"
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                className={inputClassName}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
              />
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-2 py-1 bg-module-fg hover:bg-module-fg/90 text-white text-xs rounded disabled:opacity-50"
            >
              {saving ? '...' : '\u2713'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-2 py-1 bg-theme-surface-elevated hover:bg-theme-hover text-theme-primary text-xs rounded disabled:opacity-50"
            >
              \u2715
            </button>
          </>
        ) : (
          <>
            <span
              className={`text-right text-sm ${
                status === 'success'
                  ? 'text-green-400'
                  : status === 'warning'
                    ? 'text-amber-400'
                    : status === 'error'
                      ? 'text-red-400'
                      : 'text-theme-primary'
              }`}
            >
              {value}
            </span>
            <button
              onClick={() => setIsEditing(true)}
              className="opacity-0 group-hover:opacity-100 px-2 py-1 text-module-fg hover:text-module-fg text-xs transition-opacity"
              title="Edit"
            >
              <Edit className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
