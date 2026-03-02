'use client';

import { Flame, Package, Trash2 } from '@/components/ui/icons';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Label from '@/components/ui/Label';
import MultiSelect from '@/components/ui/MultiSelect';

export interface StageFormData {
  id: string;
  name: string;
  sequence: number;
  day_offset: number;
  duration_hours?: number;
  is_overnight: boolean;
  instructions?: string;
  // Deprecated single-group columns (keep for backwards compatibility)
  bake_group_id?: string | null;
  destination_group_id?: string | null;
  // New multi-group columns
  bake_group_ids?: string[];
  destination_group_ids?: string[];
  time_constraint?: string | null;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface StepEditorProps {
  stage: StageFormData;
  bakeGroups: { id: string; name: string }[];
  destinationGroups: { id: string; name: string }[];
  onUpdate: (field: keyof StageFormData, value: unknown) => void;
  onDelete: () => void;
}

export function StepEditor({
  stage,
  bakeGroups,
  destinationGroups,
  onUpdate,
  onDelete,
}: StepEditorProps) {
  return (
    <div className="space-y-4 pt-3 border-t border-theme">
      {/* Step Name */}
      <div>
        <Label className="text-theme-tertiary text-xs">Step Name</Label>
        <Input
          value={stage.name}
          onChange={(e) => onUpdate('name', e.target.value)}
          placeholder="e.g., Mix dough, First prove, Bake"
          className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-theme text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-disabled"
        />
      </div>

      {/* Groups Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-theme-tertiary text-xs flex items-center gap-1 mb-1">
            <Flame className="h-3 w-3 text-orange-500 dark:text-orange-400" />
            Oven Groups
          </Label>
          <MultiSelect
            value={stage.bake_group_ids || []}
            options={bakeGroups.map((g) => ({ label: g.name, value: g.id }))}
            onChange={(values) => onUpdate('bake_group_ids', values)}
            placeholder="All oven groups"
          />
        </div>
        <div>
          <Label className="text-theme-tertiary text-xs flex items-center gap-1 mb-1">
            <Package className="h-3 w-3 text-blue-500 dark:text-blue-400" />
            Delivery Routes
          </Label>
          <MultiSelect
            value={stage.destination_group_ids || []}
            options={destinationGroups.map((g) => ({ label: g.name, value: g.id }))}
            onChange={(values) => onUpdate('destination_group_ids', values)}
            placeholder="All delivery routes"
          />
        </div>
      </div>

      {/* Time & Overnight Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-theme-tertiary text-xs">Time Constraint</Label>
          <Input
            type="time"
            value={stage.time_constraint || ''}
            onChange={(e) => onUpdate('time_constraint', e.target.value || null)}
            className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-theme text-theme-primary"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-100 dark:hover:bg-white/[0.03]">
            <input
              type="checkbox"
              checked={stage.is_overnight}
              onChange={(e) => onUpdate('is_overnight', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-module-fg focus:ring-module-fg bg-theme-surface"
            />
            <span className="text-sm text-theme-secondary">Overnight step</span>
          </label>
        </div>
      </div>

      {/* Instructions */}
      <div>
        <Label className="text-theme-tertiary text-xs">Instructions / Notes</Label>
        <Textarea
          value={stage.instructions || ''}
          onChange={(e) => onUpdate('instructions', e.target.value)}
          placeholder="Optional instructions..."
          rows={2}
          className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-theme text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-disabled"
        />
      </div>

      {/* Delete Button */}
      <div className="flex justify-end">
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Step
        </button>
      </div>
    </div>
  );
}
