'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronRight, Flame, Package, Moon, Clock } from 'lucide-react';
import { StepEditor, StageFormData } from './StepEditor';
import { cn } from '@/lib/utils';

interface StepCardProps {
  stage: StageFormData;
  isExpanded: boolean;
  onToggle: () => void;
  bakeGroups: { id: string; name: string }[];
  destinationGroups: { id: string; name: string }[];
  onUpdate: (field: keyof StageFormData, value: unknown) => void;
  onDelete: () => void;
}

export function StepCard({
  stage,
  isExpanded,
  onToggle,
  bakeGroups,
  destinationGroups,
  onUpdate,
  onDelete,
}: StepCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Find group names for display (supports both old single-group and new multi-group)
  const selectedBakeGroups = bakeGroups.filter((g) =>
    stage.bake_group_ids?.includes(g.id)
  );
  const selectedDestGroups = destinationGroups.filter((g) =>
    stage.destination_group_ids?.includes(g.id)
  );

  // Fallback to legacy single-group fields if multi-group arrays are empty
  const legacyBakeGroupName = stage.bake_group_id && selectedBakeGroups.length === 0
    ? bakeGroups.find((g) => g.id === stage.bake_group_id)?.name
    : null;
  const legacyDestGroupName = stage.destination_group_id && selectedDestGroups.length === 0
    ? destinationGroups.find((g) => g.id === stage.destination_group_id)?.name
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden',
        isDragging && 'ring-2 ring-[#14B8A6]/50'
      )}
    >
      {/* Collapsed Header */}
      <div
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={onToggle}
      >
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-white/[0.05] text-white/40 hover:text-white/60 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Sequence Number */}
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/[0.05] text-xs font-medium text-white/60">
          {stage.sequence}
        </div>

        {/* Step Name */}
        <div className="flex-1 min-w-0">
          <span className={cn('text-sm font-medium', stage.name ? 'text-white' : 'text-white/40 italic')}>
            {stage.name || 'Untitled step'}
          </span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Bake Group Badges */}
          {selectedBakeGroups.length === 0 && !legacyBakeGroupName ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-white/[0.05] text-white/40 border border-white/[0.1]">
              <Flame className="h-3 w-3" />
              All
            </span>
          ) : selectedBakeGroups.length > 3 ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Flame className="h-3 w-3" />
              {selectedBakeGroups.length} groups
            </span>
          ) : selectedBakeGroups.length > 0 ? (
            selectedBakeGroups.map((group) => (
              <span key={group.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Flame className="h-3 w-3" />
                {group.name}
              </span>
            ))
          ) : legacyBakeGroupName ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Flame className="h-3 w-3" />
              {legacyBakeGroupName}
            </span>
          ) : null}

          {/* Destination Group Badges */}
          {selectedDestGroups.length === 0 && !legacyDestGroupName ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-white/[0.05] text-white/40 border border-white/[0.1]">
              <Package className="h-3 w-3" />
              All
            </span>
          ) : selectedDestGroups.length > 3 ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Package className="h-3 w-3" />
              {selectedDestGroups.length} groups
            </span>
          ) : selectedDestGroups.length > 0 ? (
            selectedDestGroups.map((group) => (
              <span key={group.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Package className="h-3 w-3" />
                {group.name}
              </span>
            ))
          ) : legacyDestGroupName ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Package className="h-3 w-3" />
              {legacyDestGroupName}
            </span>
          ) : null}

          {stage.time_constraint && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-white/[0.05] text-white/60">
              <Clock className="h-3 w-3" />
              {stage.time_constraint}
            </span>
          )}
          {stage.is_overnight && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Moon className="h-3 w-3" />
            </span>
          )}
        </div>

        {/* Expand/Collapse */}
        <div className="text-white/40">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Expanded Editor */}
      {isExpanded && (
        <div className="px-3 pb-3">
          <StepEditor
            stage={stage}
            bakeGroups={bakeGroups}
            destinationGroups={destinationGroups}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
}
