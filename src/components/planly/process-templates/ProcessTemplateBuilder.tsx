'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { ArrowLeft, Loader2, Plus, Save, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { DayColumn, DayFormData } from './DayColumn';
import { StageFormData } from './StepEditor';
import { useProcessTemplate, useProcessTemplates } from '@/hooks/planly/useProcessTemplates';
import { useBakeGroups } from '@/hooks/planly/useBakeGroups';
import { useDestinationGroups } from '@/hooks/planly/useDestinationGroups';
import { cn } from '@/lib/utils';

interface ProcessTemplateBuilderProps {
  templateId?: string;
  siteId: string;
}

function generateId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function ProcessTemplateBuilder({ templateId, siteId }: ProcessTemplateBuilderProps) {
  const router = useRouter();
  const isEdit = !!templateId;

  // Hooks
  const { template, createStage, updateStage, deleteStage, updateTemplate, refreshTemplate } =
    useProcessTemplate(templateId);
  const { createTemplate } = useProcessTemplates(siteId, true);
  const { groups: bakeGroups } = useBakeGroups(siteId);
  const { data: destinationGroups } = useDestinationGroups(siteId);

  // Local state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState<DayFormData[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize form data
  useEffect(() => {
    if (isEdit && template && !isInitialized) {
      setName(template.name);
      setDescription(template.description || '');

      if (template.stages && template.stages.length > 0) {
        const minOffset = Math.min(...template.stages.map((s) => s.day_offset));
        const totalDays = Math.abs(minOffset) + 1;

        const daysMap = new Map<number, StageFormData[]>();
        for (const stage of template.stages) {
          const displayDay = totalDays + stage.day_offset;
          const existing = daysMap.get(displayDay) || [];
          existing.push({
            id: stage.id,
            name: stage.name,
            sequence: stage.sequence,
            day_offset: stage.day_offset,
            duration_hours: stage.duration_hours,
            is_overnight: stage.is_overnight,
            instructions: stage.instructions,
            bake_group_id: stage.bake_group_id,
            destination_group_id: stage.destination_group_id,
            bake_group_ids: stage.bake_group_ids || [],
            destination_group_ids: stage.destination_group_ids || [],
            time_constraint: stage.time_constraint,
          });
          daysMap.set(displayDay, existing);
        }

        const formDays: DayFormData[] = [];
        for (let d = 1; d <= totalDays; d++) {
          const dayOffset = d - totalDays;
          formDays.push({
            id: generateId(),
            dayNumber: d,
            dayOffset,
            stages: (daysMap.get(d) || []).sort((a, b) => a.sequence - b.sequence),
          });
        }
        setDays(formDays);
      } else {
        setDays([{ id: generateId(), dayNumber: 1, dayOffset: 0, stages: [] }]);
      }
      setIsInitialized(true);
    } else if (!isEdit && !isInitialized) {
      setName('');
      setDescription('');
      setDays([{ id: generateId(), dayNumber: 1, dayOffset: 0, stages: [] }]);
      setIsInitialized(true);
    }
  }, [isEdit, template, isInitialized]);

  // Recalculate day offsets when days change
  const recalculateDayOffsets = useCallback((daysList: DayFormData[]): DayFormData[] => {
    const totalDays = daysList.length;
    return daysList.map((day, index) => {
      const newDayNumber = index + 1;
      const newDayOffset = newDayNumber - totalDays;
      return {
        ...day,
        dayNumber: newDayNumber,
        dayOffset: newDayOffset,
        stages: day.stages.map((stage) => ({
          ...stage,
          day_offset: newDayOffset,
        })),
      };
    });
  }, []);

  // Day operations
  const handleAddDay = useCallback(() => {
    setDays((prev) => {
      const newDays = [...prev, { id: generateId(), dayNumber: prev.length + 1, dayOffset: 0, stages: [] }];
      return recalculateDayOffsets(newDays);
    });
    setIsDirty(true);
  }, [recalculateDayOffsets]);

  const handleRemoveDay = useCallback((dayId: string) => {
    setDays((prev) => {
      const day = prev.find((d) => d.id === dayId);
      if (day && day.stages.filter((s) => !s.isDeleted).length > 0) {
        setError('Cannot remove a day that has steps. Remove the steps first.');
        return prev;
      }
      const newDays = prev.filter((d) => d.id !== dayId);
      if (newDays.length === 0) return prev; // Must have at least one day
      return recalculateDayOffsets(newDays);
    });
    setIsDirty(true);
  }, [recalculateDayOffsets]);

  // Stage operations
  const handleAddStep = useCallback((dayId: string) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.id === dayId) {
          const visibleStages = day.stages.filter((s) => !s.isDeleted);
          const newSequence = visibleStages.length + 1;
          const newStageId = generateId();
          return {
            ...day,
            stages: [
              ...day.stages,
              {
                id: newStageId,
                name: '',
                sequence: newSequence,
                day_offset: day.dayOffset,
                is_overnight: false,
                isNew: true,
              },
            ],
          };
        }
        return day;
      })
    );
    setIsDirty(true);
  }, []);

  const handleUpdateStep = useCallback((dayId: string, stageId: string, field: keyof StageFormData, value: unknown) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.id === dayId) {
          return {
            ...day,
            stages: day.stages.map((stage) =>
              stage.id === stageId ? { ...stage, [field]: value } : stage
            ),
          };
        }
        return day;
      })
    );
    setIsDirty(true);
  }, []);

  const handleDeleteStep = useCallback((dayId: string, stageId: string) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.id === dayId) {
          const stage = day.stages.find((s) => s.id === stageId);
          if (stage?.id && !stage.isNew) {
            // Mark for deletion
            return {
              ...day,
              stages: day.stages.map((s) => (s.id === stageId ? { ...s, isDeleted: true } : s)),
            };
          } else {
            // Just remove from array
            return {
              ...day,
              stages: day.stages.filter((s) => s.id !== stageId),
            };
          }
        }
        return day;
      })
    );
    if (expandedStepId === stageId) {
      setExpandedStepId(null);
    }
    setIsDirty(true);
  }, [expandedStepId]);

  // Drag-and-drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeStageId = active.id as string;
    const overId = over.id as string;

    // Find which day the active stage is in
    let sourceDayId: string | null = null;
    let sourceStage: StageFormData | null = null;
    for (const day of days) {
      const stage = day.stages.find((s) => s.id === activeStageId);
      if (stage) {
        sourceDayId = day.id;
        sourceStage = stage;
        break;
      }
    }

    if (!sourceDayId || !sourceStage) return;

    // Determine target day
    let targetDayId: string | null = null;

    // Check if dropped on a day column
    if (overId.startsWith('day-')) {
      targetDayId = overId.replace('day-', '');
    } else {
      // Dropped on another stage - find which day that stage is in
      for (const day of days) {
        if (day.stages.some((s) => s.id === overId)) {
          targetDayId = day.id;
          break;
        }
      }
    }

    if (!targetDayId) return;

    setDays((prev) => {
      // Same day reorder
      if (sourceDayId === targetDayId) {
        return prev.map((day) => {
          if (day.id !== sourceDayId) return day;

          const visibleStages = day.stages.filter((s) => !s.isDeleted);
          const oldIndex = visibleStages.findIndex((s) => s.id === activeStageId);
          const newIndex = visibleStages.findIndex((s) => s.id === overId);

          if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return day;

          const reorderedVisible = arrayMove(visibleStages, oldIndex, newIndex);
          // Resequence
          const resequenced = reorderedVisible.map((s, i) => ({ ...s, sequence: i + 1 }));
          // Merge back with deleted stages
          const deletedStages = day.stages.filter((s) => s.isDeleted);
          return {
            ...day,
            stages: [...resequenced, ...deletedStages],
          };
        });
      }

      // Cross-day move
      return prev.map((day) => {
        if (day.id === sourceDayId) {
          // Remove from source
          const newStages = day.stages.filter((s) => s.id !== activeStageId);
          // Resequence remaining
          let seq = 1;
          return {
            ...day,
            stages: newStages.map((s) => {
              if (s.isDeleted) return s;
              return { ...s, sequence: seq++ };
            }),
          };
        }
        if (day.id === targetDayId) {
          // Add to target
          const visibleStages = day.stages.filter((s) => !s.isDeleted);
          const targetIndex = visibleStages.findIndex((s) => s.id === overId);
          const insertIndex = targetIndex === -1 ? visibleStages.length : targetIndex;

          const movedStage = {
            ...sourceStage!,
            day_offset: day.dayOffset,
          };

          const newVisible = [...visibleStages];
          newVisible.splice(insertIndex, 0, movedStage);

          // Resequence
          const resequenced = newVisible.map((s, i) => ({ ...s, sequence: i + 1 }));
          const deletedStages = day.stages.filter((s) => s.isDeleted);
          return {
            ...day,
            stages: [...resequenced, ...deletedStages],
          };
        }
        return day;
      });
    });
    setIsDirty(true);
  };

  // Save handler
  const handleSave = async (exitAfter = false) => {
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let targetTemplateId = templateId;

      if (!isEdit) {
        // Create new template
        const created = await createTemplate({
          site_id: siteId,
          name: name.trim(),
          description: description.trim() || undefined,
        });
        if (!created?.id) {
          throw new Error('Failed to create template');
        }
        targetTemplateId = created.id;
      } else {
        // Update template metadata
        await updateTemplate({
          name: name.trim(),
          description: description.trim() || undefined,
        });
      }

      // Process stages for all days
      for (const day of days) {
        let seq = 1;
        for (const stage of day.stages) {
          if (stage.isDeleted) {
            // Delete stage
            if (stage.id && !stage.id.startsWith('temp-')) {
              await deleteStage(stage.id);
            }
            continue;
          }

          const stageData = {
            name: stage.name,
            sequence: seq,
            day_offset: day.dayOffset,
            duration_hours: stage.duration_hours,
            is_overnight: stage.is_overnight,
            instructions: stage.instructions || null,
            bake_group_id: stage.bake_group_id || null,
            destination_group_id: stage.destination_group_id || null,
            bake_group_ids: stage.bake_group_ids || [],
            destination_group_ids: stage.destination_group_ids || [],
            time_constraint: stage.time_constraint || null,
          };

          if (stage.id && !stage.id.startsWith('temp-') && !stage.isNew) {
            // Update existing stage
            const updateResult = await updateStage(stage.id, stageData);
            if (updateResult?.error) {
              throw new Error(updateResult.error || `Failed to update stage ${stage.name}`);
            }
          } else {
            // Create new stage - use a default name if empty
            const createData = {
              ...stageData,
              name: stageData.name.trim() || `Step ${seq}`,
            };
            if (!isEdit && targetTemplateId) {
              const res = await fetch(`/api/planly/process-templates/${targetTemplateId}/stages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createData),
              });
              if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create stage');
              }
            } else {
              const createResult = await createStage(createData);
              if (createResult?.error) {
                throw new Error(createResult.error || `Failed to create stage ${createData.name}`);
              }
            }
          }
          seq++;
        }
      }

      refreshTemplate();
      setIsDirty(false);

      if (exitAfter) {
        router.push('/dashboard/planly/settings/process-templates');
      } else if (!isEdit && targetTemplateId) {
        // Redirect to edit page after creating
        router.push(`/dashboard/planly/settings/process-templates/${targetTemplateId}/edit`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const bakeGroupsList = Array.isArray(bakeGroups) ? bakeGroups : [];
  const destGroupsList = Array.isArray(destinationGroups) ? destinationGroups : [];
  const totalDays = days.length;

  if (isEdit && !template) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#14B8A6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex flex-col">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-white/[0.02]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/planly/settings/process-templates"
                className="p-2 rounded-lg hover:bg-white/[0.05] text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex-1">
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Template name..."
                  className="text-xl font-semibold bg-transparent border-none text-white placeholder:text-white/30 focus:ring-0 px-0"
                />
                <Input
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Optional description..."
                  className="text-sm bg-transparent border-none text-white/60 placeholder:text-white/30 focus:ring-0 px-0 mt-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isDirty && (
                <span className="text-sm text-white/40 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Unsaved changes
                </span>
              )}
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="bg-white/[0.03] border-white/[0.06] text-white hover:bg-white/[0.05]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="bg-[#14B8A6] hover:bg-[#14B8A6]/90 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save & Exit'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="container mx-auto px-4 py-2">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="container mx-auto px-4 py-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4">
              {days.map((day) => (
                <DayColumn
                  key={day.id}
                  day={day}
                  isDeliveryDay={day.dayNumber === totalDays}
                  totalDays={totalDays}
                  expandedStepId={expandedStepId}
                  onToggleStep={(stepId) =>
                    setExpandedStepId(expandedStepId === stepId ? null : stepId)
                  }
                  bakeGroups={bakeGroupsList}
                  destinationGroups={destGroupsList}
                  onAddStep={() => handleAddStep(day.id)}
                  onUpdateStep={(stageId, field, value) =>
                    handleUpdateStep(day.id, stageId, field, value)
                  }
                  onDeleteStep={(stageId) => handleDeleteStep(day.id, stageId)}
                  onDeleteDay={() => handleRemoveDay(day.id)}
                  canDeleteDay={totalDays > 1 && day.stages.filter((s) => !s.isDeleted).length === 0}
                />
              ))}

              {/* Add Day Column */}
              <button
                onClick={handleAddDay}
                className={cn(
                  'flex-shrink-0 w-48 min-h-[300px] rounded-lg',
                  'border-2 border-dashed border-white/[0.1] hover:border-white/[0.2]',
                  'flex flex-col items-center justify-center gap-2',
                  'text-white/40 hover:text-white/60 transition-colors'
                )}
              >
                <Plus className="h-8 w-8" />
                <span className="text-sm font-medium">Add Day</span>
              </button>
            </div>

            <DragOverlay>
              {activeId && (
                <div className="bg-white/[0.05] border border-[#14B8A6]/50 rounded-lg p-3 shadow-xl opacity-80">
                  <span className="text-white text-sm">Moving step...</span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
