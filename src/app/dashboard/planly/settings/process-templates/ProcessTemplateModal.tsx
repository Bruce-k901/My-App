'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronRight, Loader2, Calendar, GripVertical, Flame, Package } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Label from '@/components/ui/Label';
import StyledSelect, { StyledOption } from '@/components/ui/StyledSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useProcessTemplate, useProcessTemplates } from '@/hooks/planly/useProcessTemplates';
import { useBakeGroups } from '@/hooks/planly/useBakeGroups';
import { useDestinationGroups } from '@/hooks/planly/useDestinationGroups';
import { ProcessStage } from '@/types/planly';

interface StageFormData {
  id?: string;
  name: string;
  sequence: number;
  day_offset: number;
  duration_hours?: number;
  is_overnight: boolean;
  instructions?: string;
  bake_group_id?: string | null;
  destination_group_id?: string | null;
  time_constraint?: string | null;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface DayFormData {
  dayNumber: number;
  dayOffset: number;
  stages: StageFormData[];
  isExpanded: boolean;
}

interface ProcessTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId?: string | null;
  siteId: string;
}

export default function ProcessTemplateModal({
  isOpen,
  onClose,
  templateId,
  siteId,
}: ProcessTemplateModalProps) {
  const isEdit = !!templateId;

  const { template, createStage, updateStage, deleteStage, updateTemplate, refreshTemplate } =
    useProcessTemplate(templateId || undefined);
  const { createTemplate } = useProcessTemplates(siteId, true);
  const { groups: bakeGroups } = useBakeGroups(siteId);
  const { data: destinationGroups } = useDestinationGroups(siteId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState<DayFormData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when template loads
  useEffect(() => {
    if (isEdit && template) {
      setName(template.name);
      setDescription(template.description || '');

      // Group stages by day_offset and convert to display days
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
            time_constraint: stage.time_constraint,
          });
          daysMap.set(displayDay, existing);
        }

        const formDays: DayFormData[] = [];
        for (let d = 1; d <= totalDays; d++) {
          const dayOffset = d - totalDays;
          formDays.push({
            dayNumber: d,
            dayOffset,
            stages: (daysMap.get(d) || []).sort((a, b) => a.sequence - b.sequence),
            isExpanded: true,
          });
        }
        setDays(formDays);
      } else {
        // No stages, start with one day
        setDays([{ dayNumber: 1, dayOffset: 0, stages: [], isExpanded: true }]);
      }
    } else if (!isEdit) {
      // New template - start with one day
      setName('');
      setDescription('');
      setDays([{ dayNumber: 1, dayOffset: 0, stages: [], isExpanded: true }]);
    }
  }, [isEdit, template]);

  const recalculateDayOffsets = (daysList: DayFormData[]): DayFormData[] => {
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
  };

  const handleAddDay = () => {
    const newDays = [...days, { dayNumber: days.length + 1, dayOffset: 0, stages: [], isExpanded: true }];
    setDays(recalculateDayOffsets(newDays));
  };

  const handleRemoveDay = (dayNumber: number) => {
    if (days.length === 1) return; // Must have at least one day
    const day = days.find((d) => d.dayNumber === dayNumber);
    if (day && day.stages.length > 0) {
      setError('Cannot remove a day that has stages. Remove the stages first.');
      return;
    }
    const newDays = days.filter((d) => d.dayNumber !== dayNumber);
    setDays(recalculateDayOffsets(newDays));
  };

  const handleAddStage = (dayNumber: number) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.dayNumber === dayNumber) {
          const newSequence = day.stages.length + 1;
          return {
            ...day,
            stages: [
              ...day.stages,
              {
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
  };

  const handleUpdateStageField = (
    dayNumber: number,
    stageIndex: number,
    field: keyof StageFormData,
    value: unknown
  ) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.dayNumber === dayNumber) {
          const newStages = [...day.stages];
          newStages[stageIndex] = { ...newStages[stageIndex], [field]: value };
          return { ...day, stages: newStages };
        }
        return day;
      })
    );
  };

  const handleRemoveStage = (dayNumber: number, stageIndex: number) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.dayNumber === dayNumber) {
          const stage = day.stages[stageIndex];
          if (stage.id && !stage.isNew) {
            // Mark for deletion
            const newStages = [...day.stages];
            newStages[stageIndex] = { ...stage, isDeleted: true };
            return { ...day, stages: newStages };
          } else {
            // Just remove from array
            return { ...day, stages: day.stages.filter((_, i) => i !== stageIndex) };
          }
        }
        return day;
      })
    );
  };

  const toggleDayExpanded = (dayNumber: number) => {
    setDays((prev) =>
      prev.map((day) => (day.dayNumber === dayNumber ? { ...day, isExpanded: !day.isExpanded } : day))
    );
  };

  const handleSave = async () => {
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
        // Renumber sequences
        let seq = 1;
        for (const stage of day.stages) {
          if (stage.isDeleted) {
            // Delete stage
            if (stage.id) {
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
            time_constraint: stage.time_constraint || null,
          };

          if (stage.id && !stage.isNew) {
            // Update existing stage
            await updateStage(stage.id, stageData);
          } else if (stage.name.trim()) {
            // Create new stage (only if name is provided)
            // For new templates, we need to create stages via the API directly
            if (!isEdit && targetTemplateId) {
              await fetch(`/api/planly/process-templates/${targetTemplateId}/stages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stageData),
              });
            } else {
              await createStage(stageData);
            }
          }
          seq++;
        }
      }

      refreshTemplate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const totalDays = days.length;
  const bakeGroupsList = Array.isArray(bakeGroups) ? bakeGroups : [];
  const destGroupsList = Array.isArray(destinationGroups) ? destinationGroups : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">
            {isEdit ? `Edit: ${template?.name || 'Template'}` : 'New Process Template'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Template Info */}
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 dark:text-white/80">Template Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., 3-Day Laminated Pastries"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-white/80">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of this process..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          {/* Days & Stages */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Process Steps</h3>
              <span className="text-sm text-gray-500 dark:text-white/50">
                {totalDays} {totalDays === 1 ? 'day' : 'days'}
              </span>
            </div>

            {days.map((day) => (
              <div
                key={day.dayNumber}
                className="border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden"
              >
                {/* Day Header */}
                <div
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 cursor-pointer"
                  onClick={() => toggleDayExpanded(day.dayNumber)}
                >
                  <div className="flex items-center gap-2">
                    {day.isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <Calendar className="h-4 w-4 text-cyan-500" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      Day {day.dayNumber}
                      {day.dayNumber === totalDays && (
                        <span className="ml-2 text-xs text-cyan-600 dark:text-cyan-400">(Delivery)</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-white/40">
                      {day.stages.filter((s) => !s.isDeleted).length} steps
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddStage(day.dayNumber);
                      }}
                      className="h-8 px-3 text-sm"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Step
                    </Button>
                    {days.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveDay(day.dayNumber);
                        }}
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Day Content */}
                {day.isExpanded && (
                  <div className="p-3 space-y-3">
                    {day.stages.filter((s) => !s.isDeleted).length === 0 ? (
                      <p className="text-center text-gray-400 dark:text-white/40 py-4 text-sm">
                        No steps for this day. Click "Add Step" to add one.
                      </p>
                    ) : (
                      day.stages.map((stage, index) =>
                        stage.isDeleted ? null : (
                          <div
                            key={stage.id || `new-${index}`}
                            className="p-3 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 space-y-3"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-white/10 text-xs font-medium text-gray-600 dark:text-white/60 mt-1">
                                {index + 1}
                              </div>
                              <div className="flex-1 space-y-3">
                                <Input
                                  value={stage.name}
                                  onChange={(e) =>
                                    handleUpdateStageField(day.dayNumber, index, 'name', e.target.value)
                                  }
                                  placeholder="Step description (e.g., Mix dough)"
                                />

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs text-gray-500 dark:text-white/50">
                                      Bake Group
                                    </Label>
                                    <StyledSelect
                                      value={stage.bake_group_id || ''}
                                      onChange={(e) =>
                                        handleUpdateStageField(
                                          day.dayNumber,
                                          index,
                                          'bake_group_id',
                                          e.target.value || null
                                        )
                                      }
                                      className="mt-1"
                                    >
                                      <StyledOption value="">None</StyledOption>
                                      {bakeGroupsList.map((g: { id: string; name: string }) => (
                                        <StyledOption key={g.id} value={g.id}>
                                          {g.name}
                                        </StyledOption>
                                      ))}
                                    </StyledSelect>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-500 dark:text-white/50">
                                      Destination Group
                                    </Label>
                                    <StyledSelect
                                      value={stage.destination_group_id || ''}
                                      onChange={(e) =>
                                        handleUpdateStageField(
                                          day.dayNumber,
                                          index,
                                          'destination_group_id',
                                          e.target.value || null
                                        )
                                      }
                                      className="mt-1"
                                    >
                                      <StyledOption value="">None</StyledOption>
                                      {destGroupsList.map((g: { id: string; name: string }) => (
                                        <StyledOption key={g.id} value={g.id}>
                                          {g.name}
                                        </StyledOption>
                                      ))}
                                    </StyledSelect>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs text-gray-500 dark:text-white/50">
                                      Time Constraint
                                    </Label>
                                    <Input
                                      type="time"
                                      value={stage.time_constraint || ''}
                                      onChange={(e) =>
                                        handleUpdateStageField(
                                          day.dayNumber,
                                          index,
                                          'time_constraint',
                                          e.target.value || null
                                        )
                                      }
                                      className="mt-1"
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-white/5">
                                      <input
                                        type="checkbox"
                                        checked={stage.is_overnight}
                                        onChange={(e) =>
                                          handleUpdateStageField(
                                            day.dayNumber,
                                            index,
                                            'is_overnight',
                                            e.target.checked
                                          )
                                        }
                                        className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-cyan-600 focus:ring-cyan-500"
                                      />
                                      <span className="text-sm text-gray-700 dark:text-white/80">
                                        Overnight step
                                      </span>
                                    </label>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-xs text-gray-500 dark:text-white/50">
                                    Instructions / Notes
                                  </Label>
                                  <Textarea
                                    value={stage.instructions || ''}
                                    onChange={(e) =>
                                      handleUpdateStageField(day.dayNumber, index, 'instructions', e.target.value)
                                    }
                                    placeholder="Optional instructions..."
                                    rows={2}
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveStage(day.dayNumber, index)}
                                className="p-1.5 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                )}
              </div>
            ))}

            <Button variant="outline" onClick={handleAddDay} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Day
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isEdit ? (
              'Save Changes'
            ) : (
              'Create Template'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
