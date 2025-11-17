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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center"
      onMouseDown={handleBackdropClick}
    >
      {/* stopPropagation to prevent backdrop close when clicking inside content */}
      <div onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children, className = '', style }: DialogContentProps) {
  const base = "bg-neutral-900 p-4 sm:p-6 rounded-lg border border-neutral-700 shadow-lg w-full max-w-md max-h-[90vh] sm:max-h-[85vh] overflow-y-auto mx-4 sm:mx-0";
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
  return <h2 className={`text-lg font-semibold text-white ${className}`}>{children}</h2>;
}
