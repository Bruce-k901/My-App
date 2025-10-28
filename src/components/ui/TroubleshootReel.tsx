'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface TroubleshootReelProps {
  items: string[];
  onComplete: () => void;
  onStepChange?: (stepIndex: number) => void;
}

interface QuestionAnswer {
  questionIndex: number;
  answer: 'yes' | 'no' | null;
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
    
    // Check if all questions are answered
    const newAnswers = new Map(answers);
    newAnswers.set(questionIndex, answer);
    if (newAnswers.size === items.length) {
      setTimeout(() => {
        onComplete();
      }, 500);
    }
  };




  return (
    <div className="w-full">
      {/* Questions Container */}
      <div 
        ref={containerRef}
        className="h-[300px] w-full bg-white/5 backdrop-blur-md rounded-md border border-magenta-500/20 overflow-y-auto scrollbar-hide"
      >
        {/* Header inside scrollable container */}
        <div className="flex items-center justify-between p-3 border-b border-neutral-700/50 sticky top-0 bg-neutral-800 z-10">
          <div className="flex-1 text-sm font-medium text-neutral-400">Question</div>
          <div className="flex gap-8 w-20 -ml-6">
            <div className="text-sm font-medium text-neutral-400 w-6 text-center">Yes</div>
            <div className="text-sm font-medium text-neutral-400 w-6 text-center">No</div>
          </div>
        </div>
        
        <div className="p-3 space-y-2">
          {items.map((item, index) => {
            const currentAnswer = answers.get(index);
            const isAnswered = currentAnswer !== undefined;
            
            return (
              <motion.div
                key={`${index}-${item}`}
                className={`flex items-center justify-between p-2 rounded-md transition-all duration-300 ${
                  isAnswered 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : 'bg-neutral-800/30 border border-neutral-700/50'
                }`}
                initial={false}
                animate={{
                  opacity: isAnswered ? 1 : 0.7,
                  scale: isAnswered ? 1.02 : 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 32
                }}
              >
                <span className={`text-sm font-medium transition-colors flex-1 ${
                  isAnswered ? 'text-green-400' : 'text-neutral-300'
                }`}>
                  {item}
                </span>
                
                {/* Yes/No Tick Boxes */}
                <div className="flex gap-8 w-20">
                              {/* Yes Button */}
                              <motion.button
                                onClick={() => handleAnswerSelect(index, 'yes')}
                                className={`relative w-8 h-8 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                                  currentAnswer === 'yes'
                                    ? 'bg-green-500 border-green-500' 
                                    : 'border-neutral-500 hover:border-green-400'
                                }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      animate={currentAnswer === 'yes' ? {
                        scale: [1, 1.2, 1],
                        opacity: [0, 1, 1]
                      } : {
                        opacity: 0
                      }}
                      transition={{ duration: 0.25 }}
                                  className="w-5 h-5"
                    >
                      <Image
                        src="/assets/tick_icon.png"
                        alt="Yes"
                        width={16}
                        height={16}
                        className="w-full h-full"
                      />
                    </motion.div>
                  </motion.button>
                  
                              {/* No Button */}
                              <motion.button
                                onClick={() => handleAnswerSelect(index, 'no')}
                                className={`relative w-8 h-8 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                                  currentAnswer === 'no'
                                    ? 'bg-red-500 border-red-500' 
                                    : 'border-neutral-500 hover:border-red-400'
                                }`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      animate={currentAnswer === 'no' ? {
                        scale: [1, 1.2, 1],
                        opacity: [0, 1, 1]
                      } : {
                        opacity: 0
                      }}
                      transition={{ duration: 0.25 }}
                                  className="w-5 h-5"
                    >
                      <Image
                        src="/assets/tick_icon.png"
                        alt="No"
                        width={16}
                        height={16}
                        className="w-full h-full"
                      />
                    </motion.div>
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
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center bg-green-400/10 rounded-md"
            >
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0, 1, 0]
                }}
                transition={{ duration: 0.4 }}
                className="w-12 h-12"
              >
                <Image
                  src="/assets/tick_icon.png"
                  alt="Check"
                  width={48}
                  height={48}
                  className="w-full h-full"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Caption */}
      <p className="text-xs text-neutral-400 text-center mt-2">
        {allCompleted 
          ? "All troubleshooting questions answered!" 
          : "Answer all questions to enable submission"
        }
      </p>
    </div>
  );
}
