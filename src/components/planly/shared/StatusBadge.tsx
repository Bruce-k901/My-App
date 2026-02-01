'use client';

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'confirmed' | 'locked' | 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = {
    confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    locked: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    approved: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    active: 'bg-[#14B8A6]/20 text-[#14B8A6] border-[#14B8A6]/30',
    inactive: 'bg-white/10 text-white/60 border-white/20',
  };

  return (
    <span
      className={cn(
        'text-xs px-2 py-1 rounded border font-medium',
        styles[status],
        className
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
