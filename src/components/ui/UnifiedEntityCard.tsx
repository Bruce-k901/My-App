"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CardChevron from "./CardChevron";

interface UnifiedEntityCardProps {
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  children?: React.ReactNode;
  isExpandable?: boolean;
  defaultExpanded?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function UnifiedEntityCard({
  title,
  subtitle,
  rightContent,
  children,
  isExpandable = false,
  defaultExpanded = false,
  onClick,
  className = "",
}: UnifiedEntityCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on interactive elements (links, buttons)
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.closest('a') || target.closest('button')) {
      return;
    }
    
    if (onClick) {
      onClick();
    } else if (isExpandable) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExpandable) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <motion.div
      onClick={handleCardClick}
      className={`cursor-pointer rounded-xl bg-white/[0.05] border border-white/[0.1] backdrop-blur-md px-6 py-4 min-h-[72px] shadow-[0_0_20px_rgba(0,0,0,0.4)] hover:shadow-[0_0_12px_rgba(236,72,153,0.25)] hover:border-pink-500/40 transition-colors relative ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-center">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-300 mt-1 truncate">{subtitle}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {rightContent}
          {isExpandable && (
            <CardChevron 
              isOpen={isExpanded} 
              onToggle={() => handleToggleClick({} as React.MouseEvent)}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpandable && isExpanded && children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="pt-4 mt-4 border-t border-white/[0.1]"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}