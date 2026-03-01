'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronRight, Flame, Package, Moon, Clock } from '@/components/ui/icons';
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

// Format group names as compact text with dividers
function formatGroupsList(
  groupIds: string[] | undefined,
  allGroups: { id: string; name: string }[],
  legacyGroupId: string | undefined,
  maxShow: number = 3
): string | null {
  // Check for legacy single-group field first
  if (legacyGroupId && (!groupIds || groupIds.length === 0)) {
    const legacyGroup = allGroups.find(g => g.id === legacyGroupId);
    return legacyGroup?.name || null;
  }

  if (!groupIds || groupIds.length === 0) return null;

  const names = groupIds
    .map(id => allGroups.find(g => g.id === id)?.name)
    .filter(Boolean) as string[];

  if (names.length === 0) return null;

  if (names.length <= maxShow) {
    return names.join(' · ');
  }

  return `${names.slice(0, maxShow).join(' · ')} +${names.length - maxShow} more`;
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

  // Format group text for compact display
  const bakeGroupText = formatGroupsList(
    stage.bake_group_ids,
    bakeGroups,
    stage.bake_group_id,
    3
  );
  const destGroupText = formatGroupsList(
    stage.destination_group_ids,
    destinationGroups,
    stage.destination_group_id,
    2
  );

  const hasBakeGroups = bakeGroupText !== null;
  const hasDestGroups = destGroupText !== null;
  const isAllGroups = !hasBakeGroups && !hasDestGroups;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-gray-50 dark:bg-white/[0.02] border border-theme rounded-lg overflow-hidden',
        isDragging && 'ring-2 ring-module-fg/50'
      )}
    >
      {/* Collapsed Header */}
      <div className="p-3">
        {/* Top Row: Drag Handle, Sequence, Name, Chevron */}
        <div
          className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.02] transition-colors -m-3 p-3 mb-0"
          onClick={onToggle}
        >
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/[0.05] text-theme-tertiary hover:text-theme-tertiary dark:hover:text-theme-tertiary cursor-grab active:cursor-grabbing shrink-0"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Sequence Number */}
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-white/[0.05] text-xs font-medium text-theme-tertiary shrink-0">
            {stage.sequence}
          </div>

          {/* Step Name */}
          <div className="flex-1 min-w-0">
            <span className={cn('text-sm font-medium leading-tight', stage.name ? 'text-theme-primary' : 'text-theme-tertiary italic')}>
              {stage.name || 'Untitled step'}
            </span>
          </div>

          {/* Time/Overnight Badges - Keep inline for quick scanning */}
          <div className="flex items-center gap-1.5 shrink-0">
            {stage.time_constraint && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-white/[0.05] text-theme-tertiary">
                <Clock className="h-3 w-3" />
                {stage.time_constraint}
              </span>
            )}
            {stage.is_overnight && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
                <Moon className="h-3 w-3" />
              </span>
            )}
          </div>

          {/* Expand/Collapse */}
          <div className="text-theme-tertiary shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        </div>

        {/* Group Tags - Compact Layout Below */}
        <div className="ml-[3.25rem] mt-2 space-y-1">
          {isAllGroups ? (
            <p className="text-xs text-theme-tertiary italic">
              Applies to all groups
            </p>
          ) : (
            <>
              {hasBakeGroups && (
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3 h-3 text-orange-500 dark:text-orange-400 shrink-0" />
                  <span className="text-xs text-theme-tertiary">
                    {bakeGroupText}
                  </span>
                </div>
              )}

              {hasDestGroups && (
                <div className="flex items-center gap-1.5">
                  <Package className="w-3 h-3 text-blue-500 dark:text-blue-400 shrink-0" />
                  <span className="text-xs text-theme-tertiary">
                    {destGroupText}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Expanded Editor */}
      {isExpanded && (
        <div className="border-t border-theme bg-white dark:bg-white/[0.01] px-3 py-3">
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
