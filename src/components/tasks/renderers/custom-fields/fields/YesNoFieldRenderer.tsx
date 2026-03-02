'use client';

import type { TemplateField } from '@/types/checklist';

interface YesNoOptionActions {
  logException?: boolean;
  requestAction?: boolean;
  requireAction?: boolean;
  message?: string;
}

interface YesNoOption {
  label: string;
  value: string;
  actions?: YesNoOptionActions;
}

interface Manager {
  id: string;
  full_name: string;
  email: string;
}

interface YesNoFieldRendererProps {
  field: TemplateField;
  value: string | null;
  onChange: (value: string) => void;
  actionValue?: string;
  onActionChange?: (value: string) => void;
  managers?: Manager[];
  selectedManagerIds?: string[];
  onManagerSelect?: (ids: string[]) => void;
  disabled?: boolean;
}

export function YesNoFieldRenderer({
  field, value, onChange, actionValue, onActionChange,
  managers, selectedManagerIds = [], onManagerSelect,
  disabled
}: YesNoFieldRendererProps) {
  // Read per-option actions from field.options.yes_no_options (if configured in template builder)
  const yesNoOptions: YesNoOption[] | null = field.options?.yes_no_options ?? null;

  // Find the selected option (only relevant when actions are configured)
  const selectedOption = yesNoOptions && value
    ? yesNoOptions.find(o => o.value === value)
    : null;

  const showMessage = selectedOption?.actions?.message;
  const showRequireAction = selectedOption?.actions?.requireAction;
  const showLogException = selectedOption?.actions?.logException;
  const showRequestAction = selectedOption?.actions?.requestAction;
  const hasActions = !!(showMessage || showRequireAction || showLogException || showRequestAction);

  const toggleManager = (managerId: string) => {
    if (!onManagerSelect) return;
    const current = selectedManagerIds || [];
    if (current.includes(managerId)) {
      onManagerSelect(current.filter(id => id !== managerId));
    } else {
      onManagerSelect([...current, managerId]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-theme-primary mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.help_text && (
        <p className="text-xs text-theme-tertiary mb-2">{field.help_text}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange('yes')}
          disabled={disabled}
          className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 ${
            value === 'yes'
              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'border-theme bg-theme-surface text-theme-secondary hover:border-emerald-500/50'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange('no')}
          disabled={disabled}
          className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 ${
            value === 'no'
              ? 'border-red-500 bg-red-500/15 text-red-600 dark:text-red-400'
              : 'border-theme bg-theme-surface text-theme-secondary hover:border-red-500/50'
          }`}
        >
          No
        </button>
      </div>

      {/* Action layer — shown when the selected answer has configured actions */}
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
                value={actionValue || ''}
                onChange={(e) => onActionChange?.(e.target.value)}
                disabled={disabled}
                placeholder="Document what action was taken..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-theme-surface border border-theme text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91] resize-none disabled:opacity-50"
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
                  const isSelected = selectedManagerIds.includes(manager.id);
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
                        onChange={() => toggleManager(manager.id)}
                        disabled={disabled}
                        className="w-3.5 h-3.5 rounded border-gray-300 accent-[#D37E91]"
                      />
                      <span className="text-sm text-theme-primary">{manager.full_name}</span>
                      <span className="text-xs text-theme-tertiary ml-auto">{manager.email}</span>
                    </label>
                  );
                })}
              </div>
              {selectedManagerIds.length > 0 && (
                <p className="text-xs text-theme-tertiary mt-1">
                  {selectedManagerIds.length} manager{selectedManagerIds.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
