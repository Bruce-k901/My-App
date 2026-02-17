"use client";

import { useEffect, useRef } from 'react';
import { X } from '@/components/ui/icons';

interface SlideOutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: 'md' | 'lg' | 'xl' | 'full';
}

const widthClasses = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-2xl'
};

export default function SlideOutPanel({ 
  isOpen, 
  onClose, 
  title, 
  subtitle,
  children,
  width = 'lg'
}: SlideOutPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="absolute inset-y-0 right-0 flex max-w-full">
        <div 
          ref={panelRef}
          className={`w-screen ${widthClasses[width]} transform transition-transform duration-300 ease-out`}
          style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
        >
          <div className="h-full flex flex-col bg-[rgb(var(--background))] dark:bg-[#0f0f1a] border-l border-gray-200 dark:border-white/10 shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-theme-primary">{title}</h2>
                {subtitle && (
                  <p className="text-sm text-theme-tertiary mt-1">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-theme-tertiary hover:text-theme-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
