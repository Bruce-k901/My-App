'use client';

import { Trash2, Plus, AlertTriangle, Bell, FileText } from '@/components/ui/icons';
import type { YesNoChecklistItemEnhanced } from '@/types/task-completion.types';
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
      { label: 'Yes', value: 'yes', actions: {} },
      { label: 'No', value: 'no', actions: {} },
    ],
    answer: null,
  };
}

export function YesNoChecklistFeature({
  items,
  onChange,
}: YesNoChecklistFeatureProps) {
  const enhancedItems: YesNoChecklistItemEnhanced[] = items.map(normalizeYesNoItem);

  const updateItemText = (index: number, text: string) => {
    const newItems = [...enhancedItems];
    newItems[index] = { ...newItems[index], text };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(enhancedItems.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...enhancedItems, createDefaultItem()]);
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

  return (
    <div className="border-t border-theme pt-6">
      <h2 className="text-lg font-semibold text-theme-primary mb-1">Yes/No Checklist</h2>
      <p className="text-sm text-theme-secondary mb-4">
        Add questions staff must answer. For each answer, you can add a follow-up message and flag it if needed.
      </p>

      <div className="space-y-4">
        {enhancedItems.map((item, itemIndex) => (
          <div
            key={itemIndex}
            className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-lg overflow-hidden"
          >
            {/* Question row */}
            <div className="flex items-center gap-2 p-4 pb-3">
              <span className="text-sm font-medium text-theme-tertiary w-5 flex-shrink-0">
                {itemIndex + 1}.
              </span>
              <input
                type="text"
                value={item.text}
                onChange={(e) => updateItemText(itemIndex, e.target.value)}
                placeholder="Enter question (e.g. Hot Water Available?)"
                className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-[#0f1220] border border-gray-300 dark:border-neutral-800 text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
              />
              <button
                type="button"
                onClick={() => removeItem(itemIndex)}
                className="p-2 text-theme-tertiary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                title="Delete question"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Answer options */}
            <div className="px-4 pb-4 space-y-3">
              {item.options.map((option, optionIndex) => {
                const hasActions = option.actions?.logException || option.actions?.requestAction || option.actions?.requireAction;
                const hasMessage = !!(option.actions?.message);

                return (
                  <div
                    key={optionIndex}
                    className={`rounded-lg border p-3 ${
                      hasActions || hasMessage
                        ? 'border-amber-300/50 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/[0.04]'
                        : 'border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#0f1220]'
                    }`}
                  >
                    {/* Option header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        option.value === 'yes'
                          ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                          : option.value === 'no'
                          ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                      }`}>
                        If {option.label}
                      </span>
                      {hasActions && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Flagged
                        </span>
                      )}
                    </div>

                    {/* Follow-up message */}
                    <div className="mb-3">
                      <label className="block text-xs text-theme-secondary mb-1">
                        Message shown to staff when they select &quot;{option.label}&quot;
                      </label>
                      <input
                        type="text"
                        value={option.actions?.message || ''}
                        onChange={(e) => setOptionMessage(itemIndex, optionIndex, e.target.value)}
                        placeholder={option.value === 'no'
                          ? 'e.g. Follow the corrective action procedure in Ad Hoc tasks'
                          : 'Leave blank if no message needed'
                        }
                        className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-neutral-700 bg-white dark:bg-[#0a0c15] text-theme-primary text-sm focus:outline-none focus:ring-1 focus:ring-[#D37E91] placeholder:text-theme-tertiary/60"
                      />
                    </div>

                    {/* Action toggles - clear labels */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer group" title="Flag this answer as an exception in compliance reports">
                        <input
                          type="checkbox"
                          checked={!!option.actions?.logException}
                          onChange={() => toggleOptionAction(itemIndex, optionIndex, 'logException')}
                          className="w-3.5 h-3.5 rounded border-gray-300 accent-[#D37E91]"
                        />
                        <AlertTriangle className="w-3 h-3 text-theme-tertiary group-hover:text-amber-500" />
                        <span className="text-xs text-theme-secondary">Flag as exception</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer group" title="Send a notification to managers when this answer is selected">
                        <input
                          type="checkbox"
                          checked={!!option.actions?.requestAction}
                          onChange={() => toggleOptionAction(itemIndex, optionIndex, 'requestAction')}
                          className="w-3.5 h-3.5 rounded border-gray-300 accent-[#D37E91]"
                        />
                        <Bell className="w-3 h-3 text-theme-tertiary group-hover:text-blue-500" />
                        <span className="text-xs text-theme-secondary">Notify manager</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer group" title="Staff must write what action they took before they can complete the task">
                        <input
                          type="checkbox"
                          checked={!!option.actions?.requireAction}
                          onChange={() => toggleOptionAction(itemIndex, optionIndex, 'requireAction')}
                          className="w-3.5 h-3.5 rounded border-gray-300 accent-[#D37E91]"
                        />
                        <FileText className="w-3 h-3 text-theme-tertiary group-hover:text-purple-500" />
                        <span className="text-xs text-theme-secondary">Staff must document action</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1.5 text-sm text-[#D37E91] hover:underline transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>
    </div>
  );
}
