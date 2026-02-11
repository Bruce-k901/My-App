'use client';

import { CheckCircle2, Circle } from '@/components/ui/icons';

interface ChecklistRendererProps {
  items: Array<{ text: string; completed: boolean }>;
  onChange: (index: number, completed: boolean) => void;
  disabled?: boolean;
}

export function ChecklistRenderer({
  items,
  onChange,
  disabled = false
}: ChecklistRendererProps) {
  if (!items || items.length === 0) return null;

  const handleToggle = (index: number) => {
    if (disabled) return;
    onChange(index, !items[index].completed);
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-white mb-3">Checklist</h3>
      <div className="space-y-2">
        {items.map((item, index) => {
          const isChecked = item.completed;

          return (
            <label
              key={index}
              className={`flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg transition-colors ${
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex-shrink-0">
                {isChecked ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-neutral-500" />
                )}
              </div>
              <span className={`text-sm ${isChecked ? 'text-neutral-400 line-through' : 'text-white'}`}>
                {item.text}
              </span>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(index)}
                disabled={disabled}
                className="hidden"
              />
            </label>
          );
        })}
      </div>
      <div className="text-xs text-neutral-500 mt-2">
        {items.filter(i => i.completed).length} of {items.length} completed
      </div>
    </div>
  );
}
