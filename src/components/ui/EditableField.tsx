'use client';

import React, { useState, useEffect } from 'react';
import { Edit2, Check, X, Edit3 } from 'lucide-react';

interface EditableFieldProps {
  label: string;
  value: string | null;
  type: 'text' | 'date' | 'select' | 'textarea' | 'number';
  fetchOptions?: () => Promise<Array<{ value: string; label: string }>>;
  onSave: (value: string) => Promise<void>;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

export default function EditableField({
  label,
  value,
  type,
  fetchOptions,
  onSave,
  className = '',
  placeholder,
  required = false
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value || '');
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing && fetchOptions) {
      setLoading(true);
      fetchOptions()
        .then(setOptions)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [editing, fetchOptions]);

  const handleSave = async () => {
    if (required && !temp.trim()) {
      return;
    }
    
    setSaving(true);
    try {
      await onSave(temp);
      setEditing(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTemp(value || '');
    setEditing(false);
  };

  const displayValue = value || '—';

  if (!editing) {
    return (
      <div className={`flex justify-between items-center border-b border-neutral-800 pb-1 group ${className}`}>
        <span className="text-sm text-neutral-400">{label}</span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setEditing(true)} 
            className="text-neutral-500 hover:text-magenta-400 hover:drop-shadow-[0_0_3px_#ff00ff] transition-all duration-150"
            title="Edit"
          >
            <Edit3 size={14} />
          </button>
          <span className="text-white font-medium text-sm">
            {type === 'textarea' && value ? (
              <div className="max-w-xs truncate" title={value}>
                {value}
              </div>
            ) : (
              displayValue
            )}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex justify-between items-center border-b border-neutral-800 pb-1 ${className}`}>
      <span className="text-sm text-neutral-400">{label}</span>
      <div className="flex items-center gap-2">
        {type === 'select' ? (
          <select
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            className="bg-neutral-800 border border-neutral-600 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-magenta-500/40"
            disabled={loading}
          >
            <option value="">Select {label.toLowerCase()}...</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            className="bg-neutral-800 border border-neutral-600 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-magenta-500/40 resize-none w-64"
            rows={2}
            placeholder={placeholder}
          />
        ) : (
          <input
            type={type}
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            className="bg-neutral-800 border border-neutral-600 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-magenta-500/40"
            placeholder={placeholder}
          />
        )}
        <button
          onClick={handleSave}
          disabled={saving || (required && !temp.trim())}
          className="text-green-400 hover:text-green-300 disabled:opacity-50"
          title="Save"
        >
          <Check size={14} />
        </button>
        <button
          onClick={handleCancel}
          className="text-neutral-500 hover:text-neutral-400"
          title="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
