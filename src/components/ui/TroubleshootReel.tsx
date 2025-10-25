'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

interface TroubleshootReelProps {
  items: string[];
  onComplete: () => void;
  onStepChange?: (stepIndex: number) => void;
}

export default function TroubleshootReel({ 
  items, 
  onComplete, 
  onStepChange 
}: TroubleshootReelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if all steps are completed
  const allCompleted = completedSteps.size === items.length;

  // Handle step completion
  const handleStepComplete = (stepIndex: number) => {
    if (completedSteps.has(stepIndex)) return;
    
    setCompletedSteps(prev => new Set([...prev, stepIndex]));
    
    // Check if all steps are completed
    const newCompletedSteps = new Set([...completedSteps, stepIndex]);
    if (newCompletedSteps.size === items.length) {
      setTimeout(() => {
        onComplete();
      }, 500);
    }
  };




  return (
    <div className="w-full">
      {/* Scrollable Container */}
      <div 
        ref={containerRef}
        className="h-[200px] w-full bg-white/5 backdrop-blur-md rounded-md border border-magenta-500/20 overflow-y-auto"
      >
        <div className="p-4 space-y-3">
          {items.map((item, index) => {
            const isCompleted = completedSteps.has(index);
            const isActive = index === currentIndex;
            
            return (
              <motion.div
                key={`${index}-${item}`}
                className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : isActive
                    ? 'bg-magenta-500/10 border border-magenta-500/30'
                    : 'bg-neutral-800/30 border border-neutral-700/50'
                }`}
                initial={false}
                animate={{
                  opacity: isActive ? 1 : 0.7,
                  scale: isActive ? 1.02 : 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 32
                }}
              >
                <span className={`text-sm font-medium transition-colors flex-1 ${
                  isCompleted ? 'text-green-400' : isActive ? 'text-white' : 'text-neutral-300'
                }`}>
                  {item}
                </span>
                
                <motion.button
                  onClick={() => handleStepComplete(index)}
                  disabled={isCompleted}
                  className={`relative p-2 rounded-full transition-all duration-200 ${
                    isCompleted 
                      ? 'text-green-400' 
                      : 'text-neutral-500 hover:text-green-400'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    animate={isCompleted ? {
                      scale: [1, 1.2, 1],
                      boxShadow: [
                        '0 0 0px rgba(0,255,180,0)',
                        '0 0 8px rgba(0,255,180,0.6)',
                        '0 0 0px rgba(0,255,180,0)'
                      ]
                    } : {}}
                    transition={{ duration: 0.25 }}
                  >
                    <Check 
                      size={18} 
                      className={`transition-all duration-200 ${
                        isCompleted 
                          ? 'text-green-400 fill-green-400' 
                          : 'text-neutral-500'
                      }`}
                    />
                  </motion.div>
                </motion.button>
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
              >
                <Check 
                  size={48} 
                  className="text-green-400 fill-green-400"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Caption */}
      <p className="text-xs text-neutral-400 text-center mt-2">
        {allCompleted 
          ? "All troubleshooting steps completed!" 
          : "Complete all steps to enable submission"
        }
      </p>
    </div>
  );
}
