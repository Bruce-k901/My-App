'use client';

import { useDroppable } from '@dnd-kit/core';
import { Shift } from './types';
import { MoreHorizontal } from '@/components/ui/icons';
import { useState } from 'react';

interface ShiftCardProps {
  shift: Shift;
  onRemove?: () => void;
  onUnassign?: () => void;
  onEdit?: () => void;
  compact?: boolean;
  isDragging?: boolean;
}

export function ShiftCard({ 
  shift, 
  onRemove, 
  onUnassign, 
  onEdit,
  compact = false,
  isDragging = false
}: ShiftCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  // Make unassigned shifts droppable
  const { setNodeRef, isOver } = useDroppable({
    id: `shift-${shift.id}`,
    disabled: !!shift.profile_id, // Only droppable if unassigned
    data: { type: 'shift', shift }
  });
  
  const formatTime = (time: string) => {
    const [h] = time.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'p' : 'a'}`;
  };

  return (
    <div
      ref={setNodeRef}
      className={`group relative rounded border-l-2 transition-all ${
        shift.profile_id
          ? 'bg-theme-muted border-[#D37E91]'
          : 'bg-theme-button/50 border-dashed border-gray-300 dark:border-neutral-500'
      } ${
        !shift.profile_id && isOver ? 'bg-[#D37E91]/10 dark:bg-[#D37E91]/10 border-[#D37E91]' : ''
      }`}
      style={{ 
        borderLeftColor: shift.color || '#D37E91',
      }}
    >
      <div className="p-2">
        {/* Time and Menu */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-gray-600 dark:text-neutral-300 font-medium text-xs">
            {formatTime(shift.start_time)}-{formatTime(shift.end_time)}
          </span>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded transition-opacity"
          >
            <MoreHorizontal className="w-3 h-3 text-theme-tertiary" />
          </button>
        </div>
        
        {/* Assigned Person or Role */}
        {shift.profile_id ? (
          <p className="text-theme-primary truncate mt-1 text-xs">
            {shift.profile_name}
          </p>
        ) : (
 <p className="text-gray-400 dark:text-theme-tertiary italic mt-1 text-xs">
            {shift.role_required || 'Unassigned'}
          </p>
        )}

        {/* Menu Dropdown */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 bg-theme-surface border border-theme rounded shadow-lg z-20 py-1 min-w-[100px]">
            {shift.profile_id && onUnassign && (
              <button
                onClick={() => { onUnassign(); setShowMenu(false); }}
                className="w-full px-3 py-1 text-left text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 text-xs"
              >
                Unassign
              </button>
            )}
            {onRemove && (
              <button
                onClick={() => { onRemove(); setShowMenu(false); }}
                className="w-full px-3 py-1 text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-neutral-700 text-xs"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

