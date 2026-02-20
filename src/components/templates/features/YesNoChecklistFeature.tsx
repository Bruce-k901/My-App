'use client';

import { useState } from 'react';
import { Trash2, X, ChevronDown, ChevronUp } from '@/components/ui/icons';
import type { YesNoChecklistItemEnhanced, YesNoOption } from '@/types/task-completion.types';
import { normalizeYesNoItem } from '@/types/task-completion.types';

interface YesNoChecklistFeatureProps {
  items: any[];
  onChange: (items: YesNoChecklistItemEnhanced[]) => void;
  onMonitorCallout?: (monitor: boolean, callout: boolean, notes?: string, itemIndex?: number) => void;
  contractorType?: string;
}

function createDefaultItem(): YesNoChecklistItemEnhanced {
  return {
    text: '',
    options: [
      { label: 'No', value: 'no', actions: {} },
      { label: 'Yes', value: 'yes', actions: {} },
    ],
    answer: null,
  };
}

export function YesNoChecklistFeature({
  items,
  onChange,
}: YesNoChecklistFeatureProps) {
  // Normalize all items to enhanced format
  const enhancedItems: YesNoChecklistItemEnhanced[] = items.map(normalizeYesNoItem);

  // Track which items have expanded option configs
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  // Track which options have message fields visible
  const [messageVisible, setMessageVisible] = useState<Set<string>>(new Set());

  const toggleExpanded = (index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleMessage = (itemIndex: number, optionIndex: number) => {
    const key = `${itemIndex}-${optionIndex}`;
    setMessageVisible(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const updateItemText = (index: number, text: string) => {
    const newItems = [...enhancedItems];
    newItems[index] = { ...newItems[index], text };
    onChange(newItems);
  };

  const duplicateItem = (index: number) => {
    const newItems = [...enhancedItems];
    const clone = JSON.parse(JSON.stringify(newItems[index]));
    clone.text = `${clone.text} (copy)`;
    clone.answer = null;
    newItems.splice(index + 1, 0, clone);
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(enhancedItems.filter((_, i) => i !== index));
    // Clean up expanded state
    setExpandedItems(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  };

  const addItem = () => {
    onChange([...enhancedItems, createDefaultItem()]);
  };

  const updateOptionLabel = (itemIndex: number, optionIndex: number, label: string) => {
    const newItems = [...enhancedItems];
    const item = { ...newItems[itemIndex] };
    const options = [...item.options];
    options[optionIndex] = {
      ...options[optionIndex],
      label,
      value: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `option_${optionIndex}`,
    };
    item.options = options;
    newItems[itemIndex] = item;
    onChange(newItems);
  };

  const toggleOptionAction = (
    itemIndex: number,
    optionIndex: number,
    actionKey: 'logException' | 'requestAction' | 'requireAction'
  ) => {
    const newItems = [...enhancedItems];
    const item = { ...newItems[itemIndex] };
    const options = [...item.options];
    const option = { ...options[optionIndex] };
    const actions = { ...(option.actions || {}) };
    actions[actionKey] = !actions[actionKey];
    option.actions = actions;
    options[optionIndex] = option;
    item.options = options;
    newItems[itemIndex] = item;
    onChange(newItems);
  };

  const setOptionMessage = (itemIndex: number, optionIndex: number, message: string) => {
    const newItems = [...enhancedItems];
    const item = { ...newItems[itemIndex] };
    const options = [...item.options];
    const option = { ...options[optionIndex] };
    const actions = { ...(option.actions || {}) };
    actions.message = message;
    option.actions = actions;
    options[optionIndex] = option;
    item.options = options;
    newItems[itemIndex] = item;
    onChange(newItems);
  };

  const addOption = (itemIndex: number) => {
    const newItems = [...enhancedItems];
    const item = { ...newItems[itemIndex] };
    const options = [...item.options];
    const optionNum = options.length + 1;
    options.push({ label: '', value: `option_${optionNum}`, actions: {} });
    item.options = options;
    newItems[itemIndex] = item;
    onChange(newItems);
  };

  const removeOption = (itemIndex: number, optionIndex: number) => {
    const newItems = [...enhancedItems];
    const item = { ...newItems[itemIndex] };
    if (item.options.length <= 2) return; // Minimum 2 options
    const options = item.options.filter((_, i) => i !== optionIndex);
    item.options = options;
    // Reset answer if the removed option was selected
    if (item.answer === enhancedItems[itemIndex].options[optionIndex]?.value) {
      item.answer = null;
    }
    newItems[itemIndex] = item;
    onChange(newItems);
    // Clean up message visibility
    const key = `${itemIndex}-${optionIndex}`;
    setMessageVisible(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  return (
    <div className="border-t border-theme pt-6">
      <h2 className="text-lg font-semibold text-theme-primary mb-1">Yes/No Checklist</h2>
      <p className="text-sm text-theme-secondary mb-4">
        Configure questions with per-option actions. Each option can log exceptions, request actions, or require documentation.
      </p>

      <div className="space-y-4">
        {enhancedItems.map((item, itemIndex) => (
          <div
            key={itemIndex}
            className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-lg overflow-hidden"
          >
            {/* Header row: drag handle + input + buttons */}
            <div className="flex items-center gap-2 p-4 pb-3">
              {/* Drag handle placeholder */}
              <div className="flex flex-col items-center gap-0.5 cursor-grab text-theme-tertiary">
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-current" />
                  <div className="w-1 h-1 rounded-full bg-current" />
                </div>
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-current" />
                  <div className="w-1 h-1 rounded-full bg-current" />
                </div>
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-current" />
                  <div className="w-1 h-1 rounded-full bg-current" />
                </div>
              </div>

              <input
                type="text"
                value={item.text}
                onChange={(e) => updateItemText(itemIndex, e.target.value)}
                placeholder="Enter question/item"
                className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-[#0f1220] border border-gray-300 dark:border-neutral-800 text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
              />

              {/* Duplicate */}
              <button
                type="button"
                onClick={() => duplicateItem(itemIndex)}
                className="p-2 text-theme-tertiary hover:text-theme-primary hover:bg-theme-hover rounded transition-colors"
                title="Duplicate item"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => removeItem(itemIndex)}
                className="p-2 text-theme-tertiary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                title="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Options section */}
            <div className="px-4 pb-4 space-y-3">
              {item.options.map((option, optionIndex) => {
                const messageKey = `${itemIndex}-${optionIndex}`;
                const showMessage = messageVisible.has(messageKey) || !!(option.actions?.message);

                return (
                  <div key={optionIndex} className="space-y-2">
                    {/* Option label */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-theme-tertiary w-12 flex-shrink-0">Option</span>
                      <input
                        type="text"
                        value={option.label}
                        onChange={(e) => updateOptionLabel(itemIndex, optionIndex, e.target.value)}
                        placeholder="Option label (e.g. Yes, No, N/A)"
                        className="flex-1 px-3 py-1.5 rounded bg-white dark:bg-[#0f1220] border border-gray-300 dark:border-neutral-800 text-theme-primary text-sm focus:outline-none focus:ring-1 focus:ring-[#D37E91]"
                      />
                      {item.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(itemIndex, optionIndex)}
                          className="p-1 text-theme-tertiary hover:text-red-500 rounded transition-colors"
                          title="Remove option"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Action checkboxes */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 ml-14">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!option.actions?.logException}
                          onChange={() => toggleOptionAction(itemIndex, optionIndex, 'logException')}
                          className="w-4 h-4 rounded border-gray-300 accent-[#D37E91]"
                        />
                        <span className="text-xs text-theme-secondary">Log exception</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!option.actions?.requestAction}
                          onChange={() => toggleOptionAction(itemIndex, optionIndex, 'requestAction')}
                          className="w-4 h-4 rounded border-gray-300 accent-[#D37E91]"
                        />
                        <span className="text-xs text-theme-secondary">Request action</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!option.actions?.requireAction}
                          onChange={() => toggleOptionAction(itemIndex, optionIndex, 'requireAction')}
                          className="w-4 h-4 rounded border-gray-300 accent-[#D37E91]"
                        />
                        <span className="text-xs text-theme-secondary">Require action</span>
                      </label>
                    </div>

                    {/* Message field */}
                    {showMessage ? (
                      <div className="ml-14">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-theme-secondary">Message when option is selected</span>
                          <button
                            type="button"
                            onClick={() => {
                              setOptionMessage(itemIndex, optionIndex, '');
                              toggleMessage(itemIndex, optionIndex);
                            }}
                            className="p-0.5 text-theme-tertiary hover:text-theme-primary rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={option.actions?.message || ''}
                          onChange={(e) => setOptionMessage(itemIndex, optionIndex, e.target.value)}
                          placeholder="e.g. Please take corrective action..."
                          className="w-full px-3 py-1.5 rounded bg-white dark:bg-[#0f1220] border border-gray-300 dark:border-neutral-800 text-theme-primary text-sm focus:outline-none focus:ring-1 focus:ring-[#D37E91]"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleMessage(itemIndex, optionIndex)}
                        className="ml-14 text-xs text-[#D37E91] hover:underline"
                      >
                        + Add message
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Add option / Add logic jump */}
              <div className="flex gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => addOption(itemIndex)}
                  className="text-xs text-[#D37E91] hover:underline"
                >
                  Add option
                </button>
                <span
                  className="text-xs text-theme-tertiary cursor-default"
                  title="Logic jumps will be available in a future update"
                >
                  Add logic jump (coming soon)
                </span>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="text-sm text-[#D37E91] dark:text-[#D37E91] hover:underline transition-colors"
        >
          + Add Yes/No Question
        </button>
      </div>
    </div>
  );
}
