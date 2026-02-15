'use client';

import { ReactNode, useCallback } from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

interface DialogContentProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface DialogHeaderProps {
  children: ReactNode;
}

interface DialogTitleProps {
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const handleBackdropClick = useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  if (!open) {
    return null;
  }

  return (
    <div
      id="dialog-overlay"
      className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center"
      onMouseDown={handleBackdropClick}
      style={{ zIndex: 9999 }}
    >
      {/* stopPropagation to prevent backdrop close when clicking inside content */}
      <div onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children, className = '', style }: DialogContentProps) {
  // Only apply default max-w-md if className doesn't specify a max-width
  // Check for any max-w class (including arbitrary values like max-w-[3600px])
  const hasCustomMaxWidth = /max-w-/.test(className);
  const base = `bg-white dark:bg-[#0B0D13] p-4 sm:p-6 rounded-lg border border-theme shadow-lg w-full ${hasCustomMaxWidth ? '' : 'max-w-md'} max-h-[90vh] sm:max-h-[85vh] overflow-y-auto mx-4 sm:mx-0`;
  // Put className last so custom max-w classes can override base styles
  return (
    <div style={style} className={`${base} ${className}`}>
      {children}
    </div>
  );
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return <div className="mb-4">{children}</div>;
}

export function DialogTitle({ children, className = '' }: DialogTitleProps) {
  return <h2 className={`text-lg font-semibold text-theme-primary ${className}`}>{children}</h2>;
}

interface DialogDescriptionProps {
  children: ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

export function DialogDescription({ children, className = '' }: DialogDescriptionProps) {
 return <p className={`text-sm text-gray-600 dark:text-theme-tertiary mt-2 ${className}`}>{children}</p>;
}

export function DialogFooter({ children, className = '' }: DialogFooterProps) {
  return <div className={`mt-6 flex justify-end gap-3 ${className}`}>{children}</div>;
}
