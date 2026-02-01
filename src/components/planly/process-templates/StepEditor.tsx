'use client';

import { Flame, Package, Trash2 } from 'lucide-react';
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
    <div className="space-y-4 pt-3 border-t border-white/[0.06]">
      {/* Step Name */}
      <div>
        <Label className="text-white/60 text-xs">Step Name</Label>
        <Input
          value={stage.name}
          onChange={(e) => onUpdate('name', e.target.value)}
          placeholder="e.g., Mix dough, First prove, Bake"
          className="mt-1 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/30"
        />
      </div>

      {/* Groups Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-white/60 text-xs flex items-center gap-1 mb-1">
            <Flame className="h-3 w-3 text-orange-400" />
            Bake Groups
          </Label>
          <MultiSelect
            value={stage.bake_group_ids || []}
            options={bakeGroups.map((g) => ({ label: g.name, value: g.id }))}
            onChange={(values) => onUpdate('bake_group_ids', values)}
            placeholder="All bake groups"
          />
        </div>
        <div>
          <Label className="text-white/60 text-xs flex items-center gap-1 mb-1">
            <Package className="h-3 w-3 text-blue-400" />
            Destination Groups
          </Label>
          <MultiSelect
            value={stage.destination_group_ids || []}
            options={destinationGroups.map((g) => ({ label: g.name, value: g.id }))}
            onChange={(values) => onUpdate('destination_group_ids', values)}
            placeholder="All destination groups"
          />
        </div>
      </div>

      {/* Time & Overnight Row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-white/60 text-xs">Time Constraint</Label>
          <Input
            type="time"
            value={stage.time_constraint || ''}
            onChange={(e) => onUpdate('time_constraint', e.target.value || null)}
            className="mt-1 bg-white/[0.03] border-white/[0.06] text-white"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white/[0.03]">
            <input
              type="checkbox"
              checked={stage.is_overnight}
              onChange={(e) => onUpdate('is_overnight', e.target.checked)}
              className="w-4 h-4 rounded border-white/20 text-[#14B8A6] focus:ring-[#14B8A6] bg-white/[0.03]"
            />
            <span className="text-sm text-white/80">Overnight step</span>
          </label>
        </div>
      </div>

      {/* Instructions */}
      <div>
        <Label className="text-white/60 text-xs">Instructions / Notes</Label>
        <Textarea
          value={stage.instructions || ''}
          onChange={(e) => onUpdate('instructions', e.target.value)}
          placeholder="Optional instructions..."
          rows={2}
          className="mt-1 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/30"
        />
      </div>

      {/* Delete Button */}
      <div className="flex justify-end">
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Step
        </button>
      </div>
    </div>
  );
}
