'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StepCard } from './StepCard';
import { StageFormData } from './StepEditor';
import { cn } from '@/lib/utils';

export interface DayFormData {
  id: string;
  dayNumber: number;
  dayOffset: number;
  stages: StageFormData[];
}

interface DayColumnProps {
  day: DayFormData;
  isDeliveryDay: boolean;
  totalDays: number;
  expandedStepId: string | null;
  onToggleStep: (stepId: string) => void;
  bakeGroups: { id: string; name: string }[];
  destinationGroups: { id: string; name: string }[];
  onAddStep: () => void;
  onUpdateStep: (stageId: string, field: keyof StageFormData, value: unknown) => void;
  onDeleteStep: (stageId: string) => void;
  onDeleteDay: () => void;
  canDeleteDay: boolean;
}

export function DayColumn({
  day,
  isDeliveryDay,
  totalDays,
  expandedStepId,
  onToggleStep,
  bakeGroups,
  destinationGroups,
  onAddStep,
  onUpdateStep,
  onDeleteStep,
  onDeleteDay,
  canDeleteDay,
}: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day.id}`,
    data: { dayId: day.id },
  });

  const visibleStages = day.stages.filter((s) => !s.isDeleted);
  const stageIds = visibleStages.map((s) => s.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 w-80 bg-white/[0.02] border border-white/[0.06] rounded-lg flex flex-col',
        isOver && 'ring-2 ring-[#14B8A6]/50 bg-[#14B8A6]/5'
      )}
    >
      {/* Day Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#14B8A6]" />
          <span className="font-medium text-white">Day {day.dayNumber}</span>
          {isDeliveryDay && (
            <span className="text-xs px-2 py-0.5 rounded bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20">
              Delivery
            </span>
          )}
          <span className="text-xs text-white/40">
            {visibleStages.length} {visibleStages.length === 1 ? 'stage' : 'stages'}
          </span>
        </div>
        {canDeleteDay && (
          <button
            onClick={onDeleteDay}
            className="p-1.5 rounded text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete day"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Steps List */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto min-h-[200px]">
        <SortableContext items={stageIds} strategy={verticalListSortingStrategy}>
          {visibleStages.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">
              No stages for this day.
              <br />
              Click below to add one.
            </div>
          ) : (
            visibleStages.map((stage) => (
              <StepCard
                key={stage.id}
                stage={stage}
                isExpanded={expandedStepId === stage.id}
                onToggle={() => onToggleStep(stage.id)}
                bakeGroups={bakeGroups}
                destinationGroups={destinationGroups}
                onUpdate={(field, value) => onUpdateStep(stage.id, field, value)}
                onDelete={() => onDeleteStep(stage.id)}
              />
            ))
          )}
        </SortableContext>
      </div>

      {/* Add Step Button */}
      <div className="p-3 border-t border-white/[0.06]">
        <Button
          variant="ghost"
          onClick={onAddStep}
          className="w-full justify-center text-white/60 hover:text-white hover:bg-white/[0.05] border border-dashed border-white/[0.1]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      </div>
    </div>
  );
}
