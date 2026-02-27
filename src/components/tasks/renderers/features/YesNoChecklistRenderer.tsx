'use client';

import { CheckCircle2, XCircle } from '@/components/ui/icons';
import { isEnhancedYesNoItem } from '@/types/task-completion.types';
import type { YesNoChecklistItem } from '@/types/task-completion.types';

interface Manager {
  id: string;
  full_name: string;
  email: string;
}

interface YesNoChecklistRendererProps {
  items: YesNoChecklistItem[];
  onChange: (index: number, answer: string | null) => void;
  actionResponses?: Record<number, string>;
  onActionResponse?: (index: number, response: string) => void;
  managers?: Manager[];
  managerSelections?: Record<number, string[]>;
  onManagerSelect?: (index: number, managerIds: string[]) => void;
  disabled?: boolean;
}

export function YesNoChecklistRenderer({
  items,
  onChange,
  actionResponses = {},
  onActionResponse,
  managers,
  managerSelections = {},
  onManagerSelect,
  disabled = false
}: YesNoChecklistRendererProps) {
  if (!items || items.length === 0) return null;

  const handleAnswer = (index: number, answer: string) => {
    if (disabled) return;
    // Toggle off if clicking same answer
    const currentAnswer = items[index].answer;
    const newAnswer = currentAnswer === answer ? null : answer;
    onChange(index, newAnswer);
  };

  const getButtonStyle = (value: string, isSelected: boolean): string => {
    if (!isSelected) {
      return 'bg-theme-button text-theme-tertiary hover:bg-theme-button-hover';
    }
    if (value === 'yes') return 'bg-green-500 text-white';
    if (value === 'no') return 'bg-red-500 text-white';
    return 'bg-amber-500 text-white'; // Custom options
  };

  const getButtonIcon = (value: string) => {
    if (value === 'yes') return <CheckCircle2 className="w-4 h-4" />;
    if (value === 'no') return <XCircle className="w-4 h-4" />;
    return null;
  };

  const toggleManager = (itemIndex: number, managerId: string) => {
    if (!onManagerSelect) return;
    const current = managerSelections[itemIndex] || [];
    if (current.includes(managerId)) {
      onManagerSelect(itemIndex, current.filter(id => id !== managerId));
    } else {
      onManagerSelect(itemIndex, [...current, managerId]);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-theme-primary mb-3">Yes/No Checklist</h3>
      <div className="space-y-3">
        {items.map((item, index) => {
          const answer = item.answer;

          // Enhanced item with options
          if (isEnhancedYesNoItem(item)) {
            const selectedOption = answer
              ? item.options.find(o => o.value === answer)
              : null;
            const showMessage = selectedOption?.actions?.message;
            const showRequireAction = selectedOption?.actions?.requireAction;
            const showLogException = selectedOption?.actions?.logException;
            const showRequestAction = selectedOption?.actions?.requestAction;
            const hasActions = !!(showMessage || showRequireAction || showLogException || showRequestAction);
            const selectedManagers = managerSelections[index] || [];

            return (
              <div
                key={index}
                className="p-3 bg-theme-hover border border-theme rounded-lg"
              >
                <p className="text-sm text-theme-primary mb-2">{item.text}</p>

                {/* Option buttons */}
                <div className="flex gap-2 flex-wrap">
                  {item.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleAnswer(index, option.value)}
                      disabled={disabled}
                      className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        getButtonStyle(option.value, answer === option.value)
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {getButtonIcon(option.value)}
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>

                {/* Action indicators + message */}
                {selectedOption && hasActions && (
                  <div className="mt-3 space-y-2">
                    {/* Badges */}
                    {(showLogException || showRequestAction) && (
                      <div className="flex flex-wrap gap-2">
                        {showLogException && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                            Exception logged
                          </span>
                        )}
                        {showRequestAction && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                            Manager will be notified
                          </span>
                        )}
                      </div>
                    )}

                    {/* Message display */}
                    {showMessage && (
                      <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg">
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                          {selectedOption.actions!.message}
                        </p>
                      </div>
                    )}

                    {/* Require action textarea */}
                    {showRequireAction && (
                      <div>
                        <label className="block text-xs font-medium text-theme-secondary mb-1">
                          Describe the action taken <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={actionResponses[index] || ''}
                          onChange={(e) => onActionResponse?.(index, e.target.value)}
                          disabled={disabled}
                          placeholder="Document what action was taken..."
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0f1220] border border-gray-300 dark:border-neutral-800 text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91] resize-none disabled:opacity-50"
                        />
                      </div>
                    )}

                    {/* Manager picker — select who to notify */}
                    {showRequestAction && managers && managers.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-theme-secondary mb-1.5">
                          Select manager(s) to notify <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto rounded-lg border border-theme bg-theme-surface p-2">
                          {managers.map((manager) => {
                            const isSelected = selectedManagers.includes(manager.id);
                            return (
                              <label
                                key={manager.id}
                                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20'
                                    : 'hover:bg-theme-hover border border-transparent'
                                } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleManager(index, manager.id)}
                                  disabled={disabled}
                                  className="w-3.5 h-3.5 rounded border-gray-300 accent-[#D37E91]"
                                />
                                <span className="text-sm text-theme-primary">{manager.full_name}</span>
                                <span className="text-xs text-theme-tertiary ml-auto">{manager.email}</span>
                              </label>
                            );
                          })}
                        </div>
                        {selectedManagers.length > 0 && (
                          <p className="text-xs text-theme-tertiary mt-1">
                            {selectedManagers.length} manager{selectedManagers.length !== 1 ? 's' : ''} selected
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }

          // Legacy item fallback (should rarely hit since items are now normalized)
          return (
            <div
              key={index}
              className="p-3 bg-theme-hover border border-theme rounded-lg"
            >
              <p className="text-sm text-theme-primary mb-2">{item.text}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAnswer(index, 'yes')}
                  disabled={disabled}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    answer === 'yes'
                      ? 'bg-green-500 text-white'
                      : 'bg-theme-button text-theme-tertiary hover:bg-theme-button-hover'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Yes</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAnswer(index, 'no')}
                  disabled={disabled}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    answer === 'no'
                      ? 'bg-red-500 text-white'
                      : 'bg-theme-button text-theme-tertiary hover:bg-theme-button-hover'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">No</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-theme-tertiary mt-2">
        {items.filter(i => i.answer !== null).length} of {items.length} answered
      </div>
    </div>
  );
}
