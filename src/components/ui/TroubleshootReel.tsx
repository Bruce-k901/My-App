'use client';

import React, { useState, useRef } from 'react';
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
  const [answers, setAnswers] = useState<Map<number, 'yes' | 'no'>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if all steps are completed (all questions answered)
  const allCompleted = answers.size === items.length;

  // Handle answer selection
  const handleAnswerSelect = (questionIndex: number, answer: 'yes' | 'no') => {
    setAnswers(prev => {
      const newAnswers = new Map(prev);
      newAnswers.set(questionIndex, answer);
      return newAnswers;
    });

    // 🔒 LOCKED: Pass answers back via onComplete callback
    // This is critical for callout system to capture actual Yes/No responses
    // DO NOT MODIFY without updating CALLOUT_SYSTEM_LOCKED.md
    const newAnswers = new Map(answers);
    newAnswers.set(questionIndex, answer);
    if (newAnswers.size === items.length) {
      setTimeout(() => {
        onComplete(newAnswers); // 🔒 CRITICAL: Must pass answers map, not just completion status
      }, 500);
    }
  };

  return (
    <div className="w-full">
      {/* Questions Container */}
      <div
        ref={containerRef}
        className="max-h-[300px] w-full rounded-xl border border-black/10 dark:border-white/10 overflow-y-auto overscroll-contain"
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/10 dark:border-white/10 sticky top-0 bg-black/[0.03] dark:bg-white/[0.06] backdrop-blur-sm z-10">
          <div className="flex-1 text-xs font-semibold text-theme-tertiary uppercase tracking-wider">Question</div>
          <div className="flex gap-6 w-[88px] justify-end">
            <span className="text-xs font-semibold text-theme-tertiary uppercase tracking-wider">Yes</span>
            <span className="text-xs font-semibold text-theme-tertiary uppercase tracking-wider">No</span>
          </div>
        </div>

        <div className="p-2 space-y-1.5">
          {items.map((item, index) => {
            const currentAnswer = answers.get(index);
            const isAnswered = currentAnswer !== undefined;

            return (
              <motion.div
                key={`${index}-${item}`}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isAnswered
                    ? 'bg-green-500/10 dark:bg-green-500/10 border border-green-500/20 dark:border-green-500/30'
                    : 'bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]'
                }`}
                initial={false}
                animate={{
                  opacity: isAnswered ? 1 : 0.85,
                }}
              >
                <span className={`text-sm transition-colors flex-1 pr-3 ${
                  isAnswered ? 'text-green-700 dark:text-green-400 font-medium' : 'text-theme-secondary'
                }`}>
                  {item}
                </span>

                {/* Yes/No Buttons */}
                <div className="flex gap-3 flex-shrink-0">
                  {/* Yes Button */}
                  <motion.button
                    onClick={() => handleAnswerSelect(index, 'yes')}
                    className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                      currentAnswer === 'yes'
                        ? 'bg-green-500 border-green-500 shadow-sm shadow-green-500/30'
                        : 'border-black/15 dark:border-white/15 hover:border-green-500/50 dark:hover:border-green-400/50'
                    }`}
                    whileTap={{ scale: 0.9 }}
                  >
                    {currentAnswer === 'yes' && (
                      <motion.svg
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-4 h-4 text-white"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
                      </motion.svg>
                    )}
                  </motion.button>

                  {/* No Button */}
                  <motion.button
                    onClick={() => handleAnswerSelect(index, 'no')}
                    className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                      currentAnswer === 'no'
                        ? 'bg-red-500 border-red-500 shadow-sm shadow-red-500/30'
                        : 'border-black/15 dark:border-white/15 hover:border-red-500/50 dark:hover:border-red-400/50'
                    }`}
                    whileTap={{ scale: 0.9 }}
                  >
                    {currentAnswer === 'no' && (
                      <motion.svg
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-3.5 h-3.5 text-white"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 4L12 12M12 4L4 12" />
                      </motion.svg>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Completion Flash Overlay */}
        <AnimatePresence>
          {allCompleted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center bg-green-500/10 rounded-xl pointer-events-none"
            >
              <motion.svg
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [1, 1.3, 1], opacity: [0, 1, 0] }}
                transition={{ duration: 0.6 }}
                className="w-12 h-12 text-green-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 13l4 4L19 7" />
              </motion.svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Caption */}
      <p className="text-xs text-theme-tertiary text-center mt-2">
        {allCompleted
          ? "All troubleshooting questions answered!"
          : "Answer all questions to enable submission"
        }
      </p>
    </div>
  );
}
