'use client';

import { useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from '@/components/ui/icons';
import type { ChecklistCategory } from '@/types/offboarding';
import { CHECKLIST_CATEGORY_LABELS } from '@/types/offboarding';

interface ChecklistItem {
  category: ChecklistCategory;
  title: string;
  description: string | null;
  is_required: boolean;
  is_completed: boolean;
  sort_order: number;
  auto_generated: boolean;
}

interface ChecklistStepProps {
  items: ChecklistItem[];
  onToggle: (index: number) => void;
  onAdd: (item: Omit<ChecklistItem, 'sort_order' | 'auto_generated' | 'is_completed'>) => void;
  onRemove: (index: number) => void;
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

const INPUT_CLASS =
  'px-3 py-2 rounded-lg bg-white dark:bg-white/[0.06] border border-neutral-300 dark:border-white/[0.12] text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-teamly-dark/40 dark:focus:ring-teamly/40 transition-colors';

export function ChecklistStep({ items, onToggle, onAdd, onRemove }: ChecklistStepProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ChecklistCategory>('admin');

  const completedCount = items.filter((i) => i.is_completed).length;
  const totalCount = items.length;
  const requiredCount = items.filter((i) => i.is_required).length;
  const completedRequiredCount = items.filter((i) => i.is_required && i.is_completed).length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CHECKLIST_CATEGORY_LABELS[cat],
    icon: CATEGORY_ICONS[cat],
    items: items
      .map((item, idx) => ({ ...item, originalIndex: idx }))
      .filter((item) => item.category === cat),
  })).filter((g) => g.items.length > 0);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAdd({
      category: newCategory,
      title: newTitle.trim(),
      description: null,
      is_required: false,
    });
    setNewTitle('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.03] p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {completedCount} of {totalCount} items completed
          </p>
          <p className="text-xs text-neutral-500">
            {completedRequiredCount}/{requiredCount} required
          </p>
        </div>
        <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-700/50 overflow-hidden">
          <div
            className="h-full rounded-full dark:bg-teamly bg-teamly-dark transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          You can complete these now or return to them during the offboarding period. Required items
          must be done before offboarding can be finalised.
        </p>
      </div>

      {/* Grouped checklist */}
      <div className="space-y-4">
        {grouped.map(({ category, label, icon, items: categoryItems }) => (
          <div key={category} className="rounded-lg border border-neutral-200 dark:border-white/[0.08] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-200 dark:border-white/[0.08] bg-neutral-100 dark:bg-white/[0.04]">
              <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                <span className="mr-1.5">{icon}</span>
                {label}
              </h4>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
              {categoryItems.map((item) => (
                <div
                  key={item.originalIndex}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onToggle(item.originalIndex)}
                    className={`mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      item.is_completed
                        ? 'dark:bg-teamly bg-teamly-dark dark:border-teamly border-teamly-dark text-white'
                        : 'border-neutral-300 dark:border-neutral-600 hover:border-teamly-dark dark:hover:border-teamly'
                    }`}
                  >
                    {item.is_completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        item.is_completed ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {item.title}
                      {item.is_required && (
                        <span className="ml-1.5 text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </p>
                    {item.description && (
                      <p className="text-xs text-neutral-500 mt-0.5">{item.description}</p>
                    )}
                  </div>
                  {!item.auto_generated && (
                    <button
                      type="button"
                      onClick={() => onRemove(item.originalIndex)}
                      className="shrink-0 p-1 text-neutral-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add custom item */}
      {showAddForm ? (
        <div className="rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.03] p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as ChecklistCategory)}
              className={INPUT_CLASS}
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
              className={`sm:col-span-2 ${INPUT_CLASS}`}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="px-3 py-1.5 text-xs font-medium rounded-lg dark:bg-teamly bg-teamly-dark text-white disabled:opacity-50 transition-colors"
            >
              Add item
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 dark:border-white/[0.12] text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 text-sm dark:text-teamly text-teamly-dark hover:underline"
        >
          <Plus className="w-3.5 h-3.5" />
          Add custom item
        </button>
      )}
    </div>
  );
}
