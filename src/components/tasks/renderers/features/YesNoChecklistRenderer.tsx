'use client';

import { CheckCircle2, XCircle } from '@/components/ui/icons';

interface YesNoChecklistRendererProps {
  items: Array<{ text: string; answer: 'yes' | 'no' | null }>;
  onChange: (index: number, answer: 'yes' | 'no' | null) => void;
  disabled?: boolean;
}

export function YesNoChecklistRenderer({
  items,
  onChange,
  disabled = false
}: YesNoChecklistRendererProps) {
  if (!items || items.length === 0) return null;

  const handleAnswer = (index: number, answer: 'yes' | 'no') => {
    if (disabled) return;
    // Toggle off if clicking same answer
    const newAnswer = items[index].answer === answer ? null : answer;
    onChange(index, newAnswer);
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-theme-primary mb-3">Yes/No Checklist</h3>
      <div className="space-y-3">
        {items.map((item, index) => {
          const answer = item.answer;

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
