'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronDown, ChevronRight, RefreshCw, Trash2, Edit2, Loader2, Calendar, Flame, Package } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useProcessTemplates, useProcessTemplate } from '@/hooks/planly/useProcessTemplates';
import { useAppContext } from '@/context/AppContext';
import { ProcessTemplate, ProcessStage } from '@/types/planly';

function StageCard({ stage, dayNumber }: { stage: ProcessStage; dayNumber: number }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-white/10 text-xs font-medium text-gray-600 dark:text-white/60">
        {stage.sequence}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-gray-900 dark:text-white font-medium">{stage.name}</div>
        {stage.instructions && (
          <p className="text-sm text-gray-500 dark:text-white/50 mt-1">{stage.instructions}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-2">
          {stage.bake_group && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20">
              <Flame className="h-3 w-3" />
              {stage.bake_group.name}
            </span>
          )}
          {stage.destination_group && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
              <Package className="h-3 w-3" />
              {stage.destination_group.name}
            </span>
          )}
          {stage.time_constraint && (
            <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60">
              Start: {stage.time_constraint}
            </span>
          )}
          {stage.is_overnight && (
            <span className="text-xs px-2 py-1 rounded bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
              Overnight
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function DaySection({
  dayNumber,
  stages,
  totalDays,
}: {
  dayNumber: number;
  stages: ProcessStage[];
  totalDays: number;
}) {
  const isDeliveryDay = dayNumber === totalDays;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-cyan-500" />
        <h4 className="font-medium text-gray-900 dark:text-white">
          Day {dayNumber}
          {isDeliveryDay && (
            <span className="ml-2 text-xs text-cyan-600 dark:text-cyan-400">(Delivery)</span>
          )}
        </h4>
        <span className="text-xs text-gray-400 dark:text-white/40">
          {stages.length} {stages.length === 1 ? 'stage' : 'stages'}
        </span>
      </div>
      <div className="space-y-2 ml-6">
        {stages.map((stage) => (
          <StageCard key={stage.id} stage={stage} dayNumber={dayNumber} />
        ))}
      </div>
    </div>
  );
}

function TemplateCardContent({ templateId }: { templateId: string }) {
  const { template, getStagesByDay, getTotalDays, dayOffsetToDisplayDay } = useProcessTemplate(templateId);

  if (!template) return null;

  const stagesByDay = getStagesByDay();
  const totalDays = getTotalDays();

  if (totalDays === 0) {
    return (
      <div className="text-center py-6 text-gray-400 dark:text-white/40">
        No stages defined yet
      </div>
    );
  }

  // Convert stagesByDay map to sorted array with display day numbers
  const daysArray: { displayDay: number; stages: ProcessStage[] }[] = [];
  stagesByDay.forEach((stages, dayOffset) => {
    daysArray.push({
      displayDay: dayOffsetToDisplayDay(dayOffset, totalDays),
      stages,
    });
  });
  daysArray.sort((a, b) => a.displayDay - b.displayDay);

  return (
    <div className="space-y-4">
      {daysArray.map(({ displayDay, stages }) => (
        <DaySection key={displayDay} dayNumber={displayDay} stages={stages} totalDays={totalDays} />
      ))}
    </div>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
  isExpanded,
  onToggle,
}: {
  template: ProcessTemplate;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const stageCount = template.stages?.length || 0;

  // Calculate total days from stages
  let totalDays = 0;
  if (template.stages && template.stages.length > 0) {
    const minOffset = Math.min(...template.stages.map((s) => s.day_offset));
    totalDays = Math.abs(minOffset) + 1;
  }

  // Get day summary for collapsed view
  const getDaySummary = () => {
    if (!template.stages || template.stages.length === 0) return '';

    const stagesByDay = new Map<number, ProcessStage[]>();
    for (const stage of template.stages) {
      const existing = stagesByDay.get(stage.day_offset) || [];
      existing.push(stage);
      stagesByDay.set(stage.day_offset, existing);
    }

    const dayLabels: string[] = [];
    const sortedOffsets = Array.from(stagesByDay.keys()).sort((a, b) => a - b);

    for (const offset of sortedOffsets) {
      const stages = stagesByDay.get(offset)!;
      const dayNum = totalDays + offset;
      const firstStageName = stages[0]?.name || '';
      dayLabels.push(`Day ${dayNum}: ${firstStageName}`);
    }

    return dayLabels.join(' → ');
  };

  return (
    <Card className="p-0 overflow-hidden">
      {/* Header - Always Visible */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/20">
              <RefreshCw className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                {template.is_master && (
                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    Master
                  </span>
                )}
              </div>
              {template.description && (
                <p className="text-sm text-gray-500 dark:text-white/50 mt-0.5">
                  {template.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(template.id);
              }}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(template.id);
              }}
              className="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Summary Info */}
        <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-white/50">
          <span>
            {totalDays} {totalDays === 1 ? 'day' : 'days'}
          </span>
          <span>
            {stageCount} {stageCount === 1 ? 'stage' : 'stages'}
          </span>
        </div>

        {/* Day Summary (Collapsed) */}
        {!isExpanded && stageCount > 0 && (
          <div className="mt-2 text-sm text-gray-400 dark:text-white/40 truncate">{getDaySummary()}</div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-white/10">
          <div className="pt-4">
            <TemplateCardContent templateId={template.id} />
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ProcessTemplatesPage() {
  const { siteId } = useAppContext();
  const { templates, isLoading, error, deleteTemplate } = useProcessTemplates(siteId, true);
  const router = useRouter();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEdit = (id: string) => {
    router.push(`/dashboard/planly/settings/process-templates/${id}/edit`);
  };

  const handleCreate = () => {
    router.push('/dashboard/planly/settings/process-templates/new');
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteTemplate(deletingId);
      setDeletingId(null);
      if (expandedId === deletingId) {
        setExpandedId(null);
      }
    }
  };

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-white/60">Please select a site</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-white/40 mr-2" />
        <span className="text-gray-500 dark:text-white/60">Loading process templates...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500 dark:text-red-400">Error loading process templates</div>
      </div>
    );
  }

  const templatesList = Array.isArray(templates) ? (templates as ProcessTemplate[]) : [];

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Production Timeline</h1>
          <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
            Define your multi-day production workflows. The production plan uses this to tell you what to do and when.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Timeline
        </Button>
      </div>

      {/* Empty State */}
      {templatesList.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-lg border border-dashed border-gray-200 dark:border-white/10">
          <RefreshCw className="h-12 w-12 mx-auto text-gray-300 dark:text-white/20 mb-4" />
          <p className="text-gray-400 dark:text-white/40 mb-4">No process templates yet</p>
          <Button onClick={handleCreate} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create First Template
          </Button>
        </div>
      )}

      {/* Template Cards */}
      <div className="space-y-4">
        {templatesList.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onEdit={handleEdit}
            onDelete={setDeletingId}
            isExpanded={expandedId === template.id}
            onToggle={() => setExpandedId(expandedId === template.id ? null : template.id)}
          />
        ))}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete process template?"
        description="This will permanently delete this template and all its stages. Products using this template will be unlinked."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
