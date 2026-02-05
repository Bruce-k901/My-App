'use client';

import useSWR, { mutate } from 'swr';
import { ProcessTemplate, ProcessStage } from '@/types/planly';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useProcessTemplates(siteId?: string, includeMasters = false) {
  const params = new URLSearchParams();
  if (siteId) params.set('siteId', siteId);
  if (includeMasters) params.set('includeMasters', 'true');

  const cacheKey = `/api/planly/process-templates?${params.toString()}`;

  const { data, error, isLoading } = useSWR<ProcessTemplate[]>(cacheKey, fetcher);

  const createTemplate = async (input: {
    site_id: string;
    name: string;
    description?: string;
    is_master?: boolean;
    base_dough_recipe_id?: string;
    production_plan_label?: string;
  }) => {
    const res = await fetch('/api/planly/process-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (res.ok) {
      mutate(cacheKey);
    }

    return res.json();
  };

  const updateTemplate = async (
    templateId: string,
    updates: {
      name?: string;
      description?: string;
      is_active?: boolean;
      base_dough_recipe_id?: string | null;
      production_plan_label?: string | null;
    }
  ) => {
    const res = await fetch(`/api/planly/process-templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (res.ok) {
      mutate(cacheKey);
      mutate(`/api/planly/process-templates/${templateId}`);
    }

    return res.json();
  };

  const deleteTemplate = async (templateId: string) => {
    const res = await fetch(`/api/planly/process-templates/${templateId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      mutate(cacheKey);
    }

    return res.ok;
  };

  return {
    templates: data,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

// Hook for working with a single template and its stages
export function useProcessTemplate(templateId?: string) {
  const cacheKey = templateId ? `/api/planly/process-templates/${templateId}` : null;

  const { data, error, isLoading } = useSWR<ProcessTemplate>(cacheKey, fetcher);

  const refreshTemplate = () => {
    if (cacheKey) {
      mutate(cacheKey);
    }
  };

  const updateTemplate = async (updates: {
    name?: string;
    description?: string;
    is_active?: boolean;
    base_dough_recipe_id?: string | null;
    production_plan_label?: string | null;
  }) => {
    if (!templateId) return null;

    const res = await fetch(`/api/planly/process-templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (res.ok) {
      refreshTemplate();
    }

    return res.json();
  };

  const createStage = async (input: {
    name: string;
    sequence: number;
    day_offset: number;
    duration_hours?: number;
    is_overnight?: boolean;
    instructions?: string;
    bake_group_id?: string | null;
    destination_group_id?: string | null;
    bake_group_ids?: string[];
    destination_group_ids?: string[];
    time_constraint?: string | null;
  }) => {
    if (!templateId) return null;

    const res = await fetch(`/api/planly/process-templates/${templateId}/stages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (res.ok) {
      refreshTemplate();
    }

    return res.json();
  };

  const updateStage = async (
    stageId: string,
    updates: {
      name?: string;
      sequence?: number;
      day_offset?: number;
      duration_hours?: number;
      is_overnight?: boolean;
      instructions?: string;
      bake_group_id?: string | null;
      destination_group_id?: string | null;
      bake_group_ids?: string[];
      destination_group_ids?: string[];
      time_constraint?: string | null;
    }
  ) => {
    if (!templateId) return null;

    const res = await fetch(`/api/planly/process-templates/${templateId}/stages/${stageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (res.ok) {
      refreshTemplate();
    }

    return res.json();
  };

  const deleteStage = async (stageId: string) => {
    if (!templateId) return false;

    const res = await fetch(`/api/planly/process-templates/${templateId}/stages/${stageId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      refreshTemplate();
    }

    return res.ok;
  };

  // Group stages by day_offset for UI display
  const getStagesByDay = (): Map<number, ProcessStage[]> => {
    const stagesByDay = new Map<number, ProcessStage[]>();

    if (data?.stages) {
      // Sort stages by day_offset then by sequence
      const sortedStages = [...data.stages].sort((a, b) => {
        if (a.day_offset !== b.day_offset) {
          return a.day_offset - b.day_offset; // day_offset is negative, so this sorts correctly
        }
        return a.sequence - b.sequence;
      });

      for (const stage of sortedStages) {
        const existing = stagesByDay.get(stage.day_offset) || [];
        existing.push(stage);
        stagesByDay.set(stage.day_offset, existing);
      }
    }

    return stagesByDay;
  };

  // Calculate total days from the stages
  const getTotalDays = (): number => {
    if (!data?.stages || data.stages.length === 0) return 0;

    const minOffset = Math.min(...data.stages.map(s => s.day_offset));
    // day_offset is negative (e.g., -2 means 2 days before delivery)
    // Total days = abs(minOffset) + 1 (including delivery day)
    return Math.abs(minOffset) + 1;
  };

  // Convert day_offset to display day number (1, 2, 3...)
  const dayOffsetToDisplayDay = (dayOffset: number, totalDays: number): number => {
    // day_offset -2 with 3 total days = Day 1
    // day_offset -1 with 3 total days = Day 2
    // day_offset 0 with 3 total days = Day 3
    return totalDays + dayOffset;
  };

  // Convert display day number to day_offset
  const displayDayToDayOffset = (displayDay: number, totalDays: number): number => {
    // Day 1 with 3 total days = day_offset -2
    // Day 2 with 3 total days = day_offset -1
    // Day 3 with 3 total days = day_offset 0
    return displayDay - totalDays;
  };

  return {
    template: data,
    isLoading,
    error,
    updateTemplate,
    createStage,
    updateStage,
    deleteStage,
    refreshTemplate,
    getStagesByDay,
    getTotalDays,
    dayOffsetToDisplayDay,
    displayDayToDayOffset,
  };
}
