'use client';

import { useDroppable } from '@dnd-kit/core';
import { Shift } from './types';
import { MoreHorizontal } from 'lucide-react';
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
          ? 'bg-neutral-800 border-[#EC4899]' 
          : 'bg-neutral-800/50 border-dashed border-neutral-500'
      } ${
        !shift.profile_id && isOver ? 'bg-[#EC4899]/10 border-[#EC4899]' : ''
      }`}
      style={{ 
        borderLeftColor: shift.color || '#EC4899',
      }}
    >
      <div className="p-2">
        {/* Time and Menu */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-neutral-300 font-medium text-xs">
            {formatTime(shift.start_time)}-{formatTime(shift.end_time)}
          </span>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-neutral-700 rounded transition-opacity"
          >
            <MoreHorizontal className="w-3 h-3 text-neutral-400" />
          </button>
        </div>
        
        {/* Assigned Person or Role */}
        {shift.profile_id ? (
          <p className="text-white truncate mt-1 text-xs">
            {shift.profile_name}
          </p>
        ) : (
          <p className="text-neutral-500 italic mt-1 text-xs">
            {shift.role_required || 'Unassigned'}
          </p>
        )}

        {/* Menu Dropdown */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 bg-neutral-800 border border-neutral-700 rounded shadow-lg z-20 py-1 min-w-[100px]">
            {shift.profile_id && onUnassign && (
              <button 
                onClick={() => { onUnassign(); setShowMenu(false); }} 
                className="w-full px-3 py-1 text-left text-neutral-300 hover:bg-neutral-700 text-xs"
              >
                Unassign
              </button>
            )}
            {onRemove && (
              <button 
                onClick={() => { onRemove(); setShowMenu(false); }} 
                className="w-full px-3 py-1 text-left text-red-400 hover:bg-neutral-700 text-xs"
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

