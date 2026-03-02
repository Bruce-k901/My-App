'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 🔒 LOCKED: TroubleshootReel interface - DO NOT MODIFY without updating CALLOUT_SYSTEM_LOCKED.md
// The onComplete callback MUST receive the answers Map to capture actual Yes/No responses
interface TroubleshootReelProps {
  items: string[];
  onComplete: (answers?: Map<number, 'yes' | 'no'>) => void; // 🔒 CRITICAL: Must pass answers back
  onStepChange?: (stepIndex: number) => void;
}

export default function TroubleshootReel({
  items,
  onComplete,
  onStepChange
}: TroubleshootReelProps) {
  // Default all answers to 'yes'
  const [answers, setAnswers] = useState<Map<number, 'yes' | 'no'>>(() => {
    const initial = new Map<number, 'yes' | 'no'>();
    items.forEach((_, i) => initial.set(i, 'yes'));
    return initial;
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFiredComplete = useRef(false);

  // All questions are answered from the start (defaulted to yes)
  const allCompleted = answers.size === items.length;

  // 🔒 LOCKED: Fire onComplete on mount since all are pre-answered
  useEffect(() => {
    if (allCompleted && !hasFiredComplete.current) {
      hasFiredComplete.current = true;
      onComplete(new Map(answers));
    }
  }, []);

  // Handle toggle
  const handleToggle = (questionIndex: number) => {
    setAnswers(prev => {
      const newAnswers = new Map(prev);
      const current = newAnswers.get(questionIndex);
      newAnswers.set(questionIndex, current === 'yes' ? 'no' : 'yes');
      return newAnswers;
    });

    // 🔒 LOCKED: Pass answers back via onComplete callback
    const newAnswers = new Map(answers);
    const current = newAnswers.get(questionIndex);
    newAnswers.set(questionIndex, current === 'yes' ? 'no' : 'yes');
    onComplete(newAnswers);
  };

  return (
    <div className="w-full">
      {/* Questions Container */}
      <div
        ref={containerRef}
        className="max-h-[300px] w-full rounded-xl border border-black/10 dark:border-white/10 overflow-y-auto overscroll-contain"
      >
        <div className="p-2 space-y-1.5">
          {items.map((item, index) => {
            const currentAnswer = answers.get(index) ?? 'yes';
            const isYes = currentAnswer === 'yes';

            return (
              <div
                key={`${index}-${item}`}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]"
              >
                <span className="text-sm text-theme-secondary flex-1 pr-2">
                  {item}
                </span>

                {/* Toggle Slider */}
                <button
                  onClick={() => handleToggle(index)}
                  className="flex-shrink-0 relative flex items-center"
                  aria-label={`${item}: ${isYes ? 'Yes' : 'No'}`}
                >
                  <div className={`relative w-[72px] h-8 rounded-full transition-colors duration-200 ${
                    isYes
                      ? 'bg-green-500/20 dark:bg-green-500/20'
                      : 'bg-red-500/20 dark:bg-red-500/20'
                  }`}>
                    {/* Labels */}
                    <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wide transition-opacity duration-200 ${
                      isYes ? 'opacity-0' : 'opacity-100 text-red-400'
                    }`}>
                      No
                    </span>
                    <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wide transition-opacity duration-200 ${
                      isYes ? 'opacity-100 text-green-400' : 'opacity-0'
                    }`}>
                      Yes
                    </span>

                    {/* Thumb */}
                    <motion.div
                      className={`absolute top-1 w-6 h-6 rounded-full shadow-sm ${
                        isYes
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }`}
                      animate={{ left: isYes ? 4 : 40 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Caption */}
      <p className="text-xs text-theme-tertiary text-center mt-2">
        Toggle any answer to No if applicable
      </p>
    </div>
  );
}
