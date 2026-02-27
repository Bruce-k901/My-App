'use client';

import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import {
  useAllShiftPatterns,
  useCreateShiftPattern,
  useUpdateShiftPattern,
  useDeleteShiftPattern,
  useReorderShiftPatterns,
} from '@/hooks/use-shift-patterns';
import ShiftPatternForm from '@/components/teamly/ShiftPatternForm';
import { ShiftPattern } from '@/types/teamly';
import { toast } from 'sonner';
import Link from 'next/link';
import { Layers, ArrowLeft, Plus, GripVertical, Edit3, Trash2 } from '@/components/ui/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ============================================
// SORTABLE ROW COMPONENT
// ============================================

function SortablePatternRow({
  pattern,
  onEdit,
  onDelete,
}: {
  pattern: ShiftPattern;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pattern.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatTime = (time: string): string => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const mins = m !== '00' ? `:${m}` : '';
    if (hour === 0) return `12${mins}am`;
    if (hour === 12) return `12${mins}pm`;
    return hour > 12 ? `${hour - 12}${mins}pm` : `${hour}${mins}am`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-theme-surface rounded-lg border border-theme group"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-theme-tertiary hover:text-theme-secondary cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Colour bar */}
      <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: pattern.color }} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-theme-primary truncate">{pattern.name}</span>
          {pattern.short_code && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-theme-muted text-theme-tertiary">
              {pattern.short_code}
            </span>
          )}
        </div>
        <p className="text-xs text-theme-tertiary">
          {formatTime(pattern.start_time)} – {formatTime(pattern.end_time)}
          <span className="mx-1.5">·</span>
          {pattern.break_duration_minutes}min break
          <span className="mx-1.5">·</span>
          {pattern.total_hours}h
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-md hover:bg-theme-hover text-theme-tertiary hover:text-theme-primary transition-colors"
          title="Edit"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md hover:bg-red-500/10 text-theme-tertiary hover:text-red-400 transition-colors"
          title="Deactivate"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function ShiftPatternsSettingsPage() {
  const { companyId } = useAppContext();
  const { data: patterns = [], isLoading } = useAllShiftPatterns();
  const createMutation = useCreateShiftPattern();
  const updateMutation = useUpdateShiftPattern();
  const deleteMutation = useDeleteShiftPattern();
  const reorderMutation = useReorderShiftPatterns();

  const [formOpen, setFormOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<ShiftPattern | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ShiftPattern | null>(null);

  // Only show active patterns in the main list
  const activePatterns = patterns.filter((p) => p.is_active);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activePatterns.findIndex((p) => p.id === active.id);
    const newIndex = activePatterns.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(activePatterns, oldIndex, newIndex);
    const updates = reordered.map((p, i) => ({ id: p.id, sort_order: i + 1 }));

    reorderMutation.mutate(updates, {
      onError: () => toast.error('Failed to reorder patterns'),
    });
  };

  const handleSubmit = async (data: Parameters<React.ComponentProps<typeof ShiftPatternForm>['onSubmit']>[0]) => {
    try {
      if (editingPattern) {
        await updateMutation.mutateAsync({ id: editingPattern.id, ...data });
        toast.success('Shift pattern updated');
      } else {
        const nextOrder = activePatterns.length > 0
          ? Math.max(...activePatterns.map((p) => p.sort_order)) + 1
          : 1;
        await createMutation.mutateAsync({
          ...data,
          sort_order: nextOrder,
          is_premium: false,
          premium_rate_multiplier: 1.0,
          min_staff: 1,
          paid_break_minutes: 0,
        });
        toast.success('Shift pattern created');
      }
      setFormOpen(false);
      setEditingPattern(null);
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.error('A pattern with this name already exists');
      } else {
        toast.error(`Failed to save: ${error?.message || 'Unknown error'}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      toast.success(`"${deleteConfirm.name}" deactivated`);
      setDeleteConfirm(null);
    } catch (error: any) {
      toast.error(`Failed to deactivate: ${error?.message || 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-theme-primary/60">Loading shift patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/people/settings"
            className="inline-flex items-center gap-2 text-sm text-theme-primary/60 hover:text-theme-primary mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
          <h1 className="text-2xl font-bold text-theme-primary mb-2 flex items-center gap-2">
            <Layers className="w-6 h-6 text-module-fg" />
            Shift Patterns
          </h1>
          <p className="text-theme-tertiary text-sm">
            Define reusable shift templates that appear as quick-select options when adding shifts to the rota.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPattern(null);
            setFormOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-module-fg text-module-fg rounded-lg hover:shadow-[0_0_12px_rgba(var(--module-fg-rgb),0.7)] transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Add Pattern
        </button>
      </div>

      {/* Pattern List */}
      {activePatterns.length === 0 ? (
        <div className="text-center py-12 bg-theme-surface rounded-lg border border-theme">
          <Layers className="w-10 h-10 text-theme-tertiary mx-auto mb-3" />
          <p className="text-theme-primary font-medium mb-1">No shift patterns</p>
          <p className="text-sm text-theme-tertiary mb-4">
            Add your first shift pattern to use as a quick-select template on the rota.
          </p>
          <button
            onClick={() => {
              setEditingPattern(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-module-fg text-module-fg rounded-lg hover:shadow-[0_0_12px_rgba(var(--module-fg-rgb),0.7)] transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Add Pattern
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activePatterns.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {activePatterns.map((pattern) => (
                <SortablePatternRow
                  key={pattern.id}
                  pattern={pattern}
                  onEdit={() => {
                    setEditingPattern(pattern);
                    setFormOpen(true);
                  }}
                  onDelete={() => setDeleteConfirm(pattern)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Hint */}
      {activePatterns.length > 0 && (
        <p className="text-xs text-theme-tertiary">
          Drag to reorder. These patterns appear as quick-select templates when adding shifts to the rota.
        </p>
      )}

      {/* Add/Edit Modal */}
      {formOpen && (
        <ShiftPatternForm
          pattern={editingPattern}
          onSubmit={handleSubmit}
          onClose={() => {
            setFormOpen(false);
            setEditingPattern(null);
          }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-theme-surface rounded-xl border border-theme w-full max-w-sm shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-theme-primary mb-2">Deactivate Pattern</h3>
            <p className="text-sm text-theme-tertiary mb-4">
              Are you sure you want to deactivate &ldquo;{deleteConfirm.name}&rdquo;? It will no longer appear as a quick-select option. Existing shifts using this pattern are unaffected.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-theme-secondary hover:text-theme-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
