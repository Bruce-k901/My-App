"use client";

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Link as LinkIcon, Trash2 } from '@/components/ui/icons';
import { PRIORITY_OPTIONS, getRiskLevel } from '@/lib/fire-ra/constants';
import type { FireRATaskPreview } from '@/types/fire-ra';

interface FireRATaskReviewModalProps {
  open: boolean;
  onClose: () => void;
  previews: FireRATaskPreview[];
  onConfirm: (selectedPreviews: FireRATaskPreview[]) => void;
  loading?: boolean;
}

export default function FireRATaskReviewModal({
  open,
  onClose,
  previews: initialPreviews,
  onConfirm,
  loading = false,
}: FireRATaskReviewModalProps) {
  const [previews, setPreviews] = useState<FireRATaskPreview[]>(initialPreviews);

  useEffect(() => {
    setPreviews(initialPreviews);
  }, [initialPreviews]);

  if (!open) return null;

  const selectedCount = previews.filter(p => p.selected).length;
  const linkCount = previews.filter(p => p.selected && p.linkToExisting).length;
  const newCount = selectedCount - linkCount;

  const toggleSelected = (idx: number) => {
    setPreviews(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
  };

  const toggleLinkExisting = (idx: number) => {
    setPreviews(prev => prev.map((p, i) => i === idx ? { ...p, linkToExisting: !p.linkToExisting } : p));
  };

  const updatePreview = (idx: number, partial: Partial<FireRATaskPreview>) => {
    setPreviews(prev => prev.map((p, i) => i === idx ? { ...p, ...partial } : p));
  };

  // Group by priority
  const highPriority = previews.filter(p => p.priority === 'high');
  const medPriority = previews.filter(p => p.priority === 'medium');
  const lowPriority = previews.filter(p => p.priority === 'low');
  const noPriority = previews.filter(p => !p.priority || !['high', 'medium', 'low'].includes(p.priority));
  const grouped = [
    { label: 'High Priority', items: highPriority, color: 'text-red-600 dark:text-red-400' },
    { label: 'Medium Priority', items: medPriority, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Low Priority', items: lowPriority, color: 'text-green-600 dark:text-green-400' },
    { label: 'No Priority', items: noPriority, color: 'text-gray-500 dark:text-neutral-400' },
  ].filter(g => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[rgb(var(--background))] dark:bg-neutral-900 rounded-2xl border border-theme shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-theme">
          <div>
            <h2 className="text-lg font-semibold text-theme-primary">Generate Compliance Tasks</h2>
            <p className="text-sm text-gray-500 dark:text-neutral-400 mt-0.5">
              {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
              {newCount > 0 && ` (${newCount} new`}
              {linkCount > 0 && `, ${linkCount} linked`}
              {(newCount > 0 || linkCount > 0) && ')'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {grouped.map(group => (
            <div key={group.label}>
              <h3 className={`text-xs font-semibold ${group.color} mb-2`}>
                {group.label} ({group.items.length})
              </h3>
              <div className="space-y-2">
                {group.items.map(preview => {
                  const globalIdx = previews.indexOf(preview);
                  return (
                    <div
                      key={preview.itemId}
                      className={`p-3 rounded-lg border transition-colors ${
                        preview.selected
                          ? 'bg-theme-surface/50 border-theme'
                          : 'bg-gray-50 dark:bg-neutral-900/30 border-gray-200 dark:border-neutral-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={preview.selected}
                          onChange={() => toggleSelected(globalIdx)}
                          className="mt-1 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-theme-primary truncate">
                            {preview.taskName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                            {preview.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-neutral-500">
                            {preview.dueDate && (
                              <span>Due: {preview.dueDate}</span>
                            )}
                            {preview.existingMatchName && (
                              <label className="flex items-center gap-1 cursor-pointer text-blue-600 dark:text-blue-400">
                                <input
                                  type="checkbox"
                                  checked={preview.linkToExisting}
                                  onChange={() => toggleLinkExisting(globalIdx)}
                                  className="rounded"
                                />
                                <LinkIcon size={12} />
                                Link to: {preview.existingMatchName}
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {previews.length === 0 && (
            <p className="text-center text-gray-500 dark:text-neutral-400 py-8 text-sm">
              No action items to generate tasks for.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-theme">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-neutral-400 hover:text-theme-primary"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(previews)}
            disabled={loading || selectedCount === 0}
            className="flex items-center gap-2 px-5 py-2 bg-module-fg hover:bg-module-fg/90 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
          >
            <CheckCircle size={16} />
            {loading ? 'Creating...' : `Create ${selectedCount} Task${selectedCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
