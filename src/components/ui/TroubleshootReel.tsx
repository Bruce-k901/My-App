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
    
    // Move to next step if not the last one
    if (stepIndex < items.length - 1) {
      setTimeout(() => {
        setCurrentIndex(stepIndex + 1);
        onStepChange?.(stepIndex + 1);
      }, 300);
    } else {
      // All steps completed
      setTimeout(() => {
        onComplete();
      }, 500);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimating) return;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            onStepChange?.(currentIndex - 1);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < items.length - 1) {
            setCurrentIndex(currentIndex + 1);
            onStepChange?.(currentIndex + 1);
          }
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          handleStepComplete(currentIndex);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isAnimating, items.length]);

  // Render item with proper positioning and styling
  const renderItem = (item: string, index: number, position: 'above' | 'center' | 'below') => {
    const isCompleted = completedSteps.has(index);
    const isActive = index === currentIndex;
    
    return (
      <motion.div
        key={`${index}-${item}`}
        className={`flex items-center justify-between px-4 py-3 transition-all duration-300 ${
          position === 'center' 
            ? 'opacity-100 scale-100' 
            : 'opacity-40 scale-90'
        }`}
        initial={false}
        animate={{
          opacity: position === 'center' ? 1 : 0.4,
          scale: position === 'center' ? 1 : 0.9,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 32
        }}
      >
        <span className={`text-sm font-medium transition-colors ${
          isCompleted ? 'text-neutral-400' : 'text-white'
        }`}>
          {item}
        </span>
        
        <motion.button
          onClick={() => handleStepComplete(index)}
          disabled={isCompleted || isAnimating}
          className={`relative p-1 rounded-full transition-all duration-200 ${
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
              size={20} 
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
  };

  // Get visible items (current + one above + one below)
  const getVisibleItems = () => {
    const visible = [];
    
    // Item above (if exists)
    if (currentIndex > 0) {
      visible.push({
        item: items[currentIndex - 1],
        index: currentIndex - 1,
        position: 'above' as const
      });
    }
    
    // Current item
    visible.push({
      item: items[currentIndex],
      index: currentIndex,
      position: 'center' as const
    });
    
    // Item below (if exists)
    if (currentIndex < items.length - 1) {
      visible.push({
        item: items[currentIndex + 1],
        index: currentIndex + 1,
        position: 'below' as const
      });
    }
    
    return visible;
  };

  return (
    <div className="w-full">
      {/* Reel Container */}
      <div 
        ref={containerRef}
        className="h-[160px] w-full bg-white/5 backdrop-blur-md rounded-md overflow-hidden relative border border-magenta-500/20"
      >
        <motion.div
          layoutId="troubleshoot-reel"
          className="relative h-full"
          animate={{
            y: -currentIndex * 53.33 // Approximate item height
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 32
          }}
        >
          {getVisibleItems().map(({ item, index, position }) => 
            renderItem(item, index, position)
          )}
        </motion.div>
        
        {/* Completion Flash Overlay */}
        <AnimatePresence>
          {allCompleted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center bg-green-400/10"
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
