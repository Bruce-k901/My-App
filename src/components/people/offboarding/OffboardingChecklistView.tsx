'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Plus, Trash2, Loader2 } from '@/components/ui/icons';
import type { OffboardingChecklistItem, ChecklistCategory } from '@/types/offboarding';
import { CHECKLIST_CATEGORY_LABELS } from '@/types/offboarding';
import { toast } from 'sonner';

interface OffboardingChecklistViewProps {
  profileId: string;
  companyId: string;
  currentUserId: string;
  onCompleteOffboarding?: () => void;
}

const CATEGORY_ORDER: ChecklistCategory[] = [
  'it_access',
  'equipment',
  'payroll',
  'admin',
  'knowledge_transfer',
  'compliance',
];

const CATEGORY_ICONS: Record<ChecklistCategory, string> = {
  it_access: '\uD83D\uDD12',
  equipment: '\uD83D\uDCE6',
  payroll: '\uD83D\uDCB0',
  admin: '\uD83D\uDCCB',
  knowledge_transfer: '\uD83D\uDCDA',
  compliance: '\u2696\uFE0F',
};

export function OffboardingChecklistView({
  profileId,
  companyId,
  currentUserId,
  onCompleteOffboarding,
}: OffboardingChecklistViewProps) {
  const [items, setItems] = useState<OffboardingChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ChecklistCategory>('admin');
  const [completing, setCompleting] = useState(false);

  // Fetch checklist items
  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/people/offboarding-checklist?profileId=${profileId}`);
      if (res.ok) {
        const { data } = await res.json();
        setItems(data || []);
      }
    } catch (err) {
      console.error('[OffboardingChecklist] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Toggle item completion
  const handleToggle = async (item: OffboardingChecklistItem) => {
    const newCompleted = !item.is_completed;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_completed: newCompleted } : i)),
    );

    try {
      const res = await fetch('/api/people/offboarding-checklist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          isCompleted: newCompleted,
          completedBy: currentUserId,
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
    } catch {
      // Revert on failure
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_completed: !newCompleted } : i)),
      );
      toast.error('Failed to update checklist item');
    }
  };

  // Add custom item
  const handleAdd = async () => {
    if (!newTitle.trim()) return;

    try {
      const res = await fetch('/api/people/offboarding-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          companyId,
          title: newTitle.trim(),
          category: newCategory,
        }),
      });

      if (res.ok) {
        const { data } = await res.json();
        setItems((prev) => [...prev, data]);
        setNewTitle('');
        setShowAddForm(false);
      }
    } catch {
      toast.error('Failed to add item');
    }
  };

  // Delete custom item
  const handleDelete = async (item: OffboardingChecklistItem) => {
    try {
      const res = await fetch('/api/people/offboarding-checklist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }
    } catch {
      toast.error('Failed to delete item');
    }
  };

  // Complete offboarding
  const handleCompleteOffboarding = async () => {
    setCompleting(true);
    try {
      const res = await fetch('/api/people/complete-offboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: profileId,
          p45Issued: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.incomplete) {
          toast.error(
            `${err.incomplete.length} required item${err.incomplete.length !== 1 ? 's' : ''} still incomplete`,
          );
        } else {
          toast.error(err.error || 'Failed to complete offboarding');
        }
        return;
      }

      toast.success('Offboarding completed — employee archived');
      onCompleteOffboarding?.();
    } catch {
      toast.error('Failed to complete offboarding');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
      </div>
    );
  }

  const completedCount = items.filter((i) => i.is_completed).length;
  const requiredItems = items.filter((i) => i.is_required);
  const allRequiredDone = requiredItems.every((i) => i.is_completed);
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  // Group by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CHECKLIST_CATEGORY_LABELS[cat],
    icon: CATEGORY_ICONS[cat],
    items: items.filter((item) => item.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700/50 overflow-hidden">
          <div
            className="h-full rounded-full dark:bg-teamly bg-teamly-dark transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
          {completedCount}/{items.length}
        </p>
      </div>

      {/* Grouped items */}
      {grouped.map(({ category, label, icon, items: catItems }) => (
        <div key={category}>
          <h5 className="text-xs font-semibold text-neutral-500 mb-2">
            {icon} {label}
          </h5>
          <div className="space-y-1">
            {catItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2.5 py-1.5 group"
              >
                <button
                  onClick={() => handleToggle(item)}
                  className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    item.is_completed
                      ? 'dark:bg-teamly bg-teamly-dark dark:border-teamly border-teamly-dark text-white'
                      : 'border-neutral-300 dark:border-neutral-600 hover:border-teamly-dark dark:hover:border-teamly'
                  }`}
                >
                  {item.is_completed && <CheckCircle2 className="w-3 h-3" />}
                </button>
                <p
                  className={`text-sm flex-1 ${
                    item.is_completed ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  {item.title}
                  {item.is_required && !item.is_completed && (
                    <span className="ml-1 text-[10px] text-red-600 dark:text-red-400">*</span>
                  )}
                </p>
                {!item.auto_generated && (
                  <button
                    onClick={() => handleDelete(item)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-neutral-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add item */}
      {showAddForm ? (
        <div className="flex gap-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as ChecklistCategory)}
            className="px-2 py-1.5 rounded bg-white dark:bg-white/[0.06] border border-neutral-300 dark:border-white/[0.12] text-xs text-neutral-900 dark:text-neutral-100"
          >
            {CATEGORY_ORDER.map((cat) => (
              <option key={cat} value={cat}>
                {CHECKLIST_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Item title..."
            className="flex-1 px-2 py-1.5 rounded bg-white dark:bg-white/[0.06] border border-neutral-300 dark:border-white/[0.12] text-xs text-neutral-900 dark:text-neutral-100"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim()}
            className="px-2 py-1.5 text-xs rounded dark:bg-teamly bg-teamly-dark text-white disabled:opacity-50"
          >
            Add
          </button>
          <button
            onClick={() => setShowAddForm(false)}
            className="px-2 py-1.5 text-xs rounded border border-neutral-300 dark:border-white/[0.12] text-neutral-600 dark:text-neutral-400"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 text-xs dark:text-teamly text-teamly-dark hover:underline"
        >
          <Plus className="w-3 h-3" />
          Add item
        </button>
      )}

      {/* Complete offboarding button */}
      {onCompleteOffboarding && (
        <div className="pt-4 border-t border-neutral-200 dark:border-white/[0.08]">
          <button
            onClick={handleCompleteOffboarding}
            disabled={!allRequiredDone || completing}
            className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {completing
              ? 'Processing...'
              : allRequiredDone
                ? 'Complete Offboarding & Archive'
                : `Complete all required items first (${requiredItems.filter((i) => !i.is_completed).length} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
}
