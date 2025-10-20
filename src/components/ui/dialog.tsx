'use client';

import { ReactNode } from 'react';

interface DialogProps {
  open: boolean;
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
}

export function Dialog({ open, children }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      {children}
    </div>
  );
}

export function DialogContent({ children, className = '', style }: DialogContentProps) {
  const base = "bg-neutral-900 p-6 rounded-lg border border-neutral-700 shadow-lg w-full max-w-md max-h-[85vh] overflow-y-auto";
  return (
    <div style={style} className={`${base} ${className}`}>
      {children}
    </div>
  );
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return <div className="mb-4">{children}</div>;
}

export function DialogTitle({ children }: DialogTitleProps) {
  return <h2 className="text-lg font-semibold text-white">{children}</h2>;
}
