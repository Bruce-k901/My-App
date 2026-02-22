'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import {
  ONBOARDING_STEPS,
  ONBOARDING_SECTIONS,
  SECTION_ORDER,
  type OnboardingStepWithStatus,
  type OnboardingProgress,
  type SectionProgress,
  type StepStatus,
} from '@/types/onboarding';

interface UseOnboardingProgressReturn {
  sections: SectionProgress[];
  loading: boolean;
  error: string | null;
  totalCompleted: number;
  totalSteps: number;
  allComplete: boolean;
  updateStep: (stepId: string, status: StepStatus, notes?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

async function safeCount(
  table: string,
  column: string,
  value: string | string[],
  extraFilter?: { column: string; value: string }
): Promise<number> {
  try {
    let query = supabase
      .from(table)
      .select('id', { count: 'exact', head: true });

    if (Array.isArray(value)) {
      query = query.in(column, value);
    } else {
      query = query.eq(column, value);
    }

    if (extraFilter) {
      query = query.eq(extraFilter.column, extraFilter.value);
    }

    const { count, error } = await query;
    if (error) {
      if (error.code === '42P01') return 0; // table doesn't exist
      return 0;
    }
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function bootstrapFromCounts(
  companyId: string,
  companyName: string | null | undefined
): Promise<Map<string, { status: StepStatus; detail: string }>> {
  const results = new Map<string, { status: StepStatus; detail: string }>();

  // Fetch site IDs for this company (needed for site_id-based checks like Planly)
  let siteIds: string[] = [];
  try {
    const { data: sites } = await supabase
      .from('sites')
      .select('id')
      .eq('company_id', companyId);
    siteIds = (sites || []).map((s: { id: string }) => s.id);
  } catch {
    // If sites query fails, site_id checks will return 0
  }

  // Run all counts in parallel
  const countPromises = ONBOARDING_STEPS.map(async (step) => {
    if (!step.check) {
      return { stepId: step.stepId, count: 0, special: false };
    }

    // Special case: company field check (just checks a field on the company row)
    if (step.check.companyField) {
      const hasValue = step.check.companyField === 'name' ? !!companyName : false;
      return { stepId: step.stepId, count: hasValue ? 1 : 0, special: true };
    }

    // For site_id checks, use the company's site IDs instead of companyId
    const value = step.check.column === 'site_id'
      ? (siteIds.length > 0 ? siteIds : companyId)
      : companyId;

    const count = await safeCount(
      step.check.table,
      step.check.column,
      value,
      step.check.extraFilter
    );
    return { stepId: step.stepId, count, special: false };
  });

  const counts = await Promise.all(countPromises);

  for (const { stepId, count, special } of counts) {
    let status: StepStatus = 'not_started';
    let detail = 'Not started';

    if (special) {
      // Company field check
      if (count > 0) {
        status = 'complete';
        detail = 'Configured';
      }
    } else if (stepId === 'core_team') {
      // Team: count > 1 means at least one other person invited
      if (count > 1) {
        status = 'complete';
        detail = `${count} team members`;
      } else if (count === 1) {
        status = 'in_progress';
        detail = 'Just you so far';
      }
    } else {
      if (count > 0) {
        status = 'complete';
        detail = `${count} added`;
      }
    }

    results.set(stepId, { status, detail });
  }

  return results;
}

export function useOnboardingProgress(): UseOnboardingProgressReturn {
  const { companyId, company } = useAppContext();
  const [sections, setSections] = useState<SectionProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildSections = useCallback(
    (progressMap: Map<string, { status: StepStatus; detail: string; notes: string | null }>) => {
      return SECTION_ORDER.map((sectionKey) => {
        const sectionMeta = ONBOARDING_SECTIONS[sectionKey];
        const sectionSteps = ONBOARDING_STEPS.filter((s) => s.section === sectionKey);

        const stepsWithStatus: OnboardingStepWithStatus[] = sectionSteps.map((stepDef) => {
          const progress = progressMap.get(stepDef.stepId);
          return {
            ...stepDef,
            status: progress?.status ?? 'not_started',
            detail: progress?.detail ?? 'Not started',
            notes: progress?.notes ?? null,
          };
        });

        const completedCount = stepsWithStatus.filter(
          (s) => s.status === 'complete' || s.status === 'skipped'
        ).length;

        return {
          section: sectionKey,
          label: sectionMeta.label,
          steps: stepsWithStatus,
          completedCount,
          totalCount: stepsWithStatus.length,
        };
      });
    },
    []
  );

  const loadProgress = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch existing progress from API
      const res = await fetch(`/api/onboarding/progress?companyId=${companyId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch progress: ${res.status}`);
      }

      const { progress } = (await res.json()) as { progress: OnboardingProgress[] };

      if (progress.length > 0) {
        // Progress exists — use it
        const progressMap = new Map<string, { status: StepStatus; detail: string; notes: string | null }>();
        for (const p of progress) {
          progressMap.set(p.step_id, {
            status: p.status as StepStatus,
            detail: p.status === 'complete' ? 'Complete' : p.status === 'skipped' ? 'Skipped' : 'Not started',
            notes: p.notes,
          });
        }

        // Enrich with fresh row counts — also catches steps that were missed previously
        const enriched = await bootstrapFromCounts(companyId, company?.name);
        for (const [stepId, derived] of enriched) {
          const existing = progressMap.get(stepId);
          if (existing) {
            // If row counts show complete but persisted status is behind, upgrade it
            if (derived.status === 'complete' && existing.status === 'not_started') {
              existing.status = 'complete';
              existing.detail = derived.detail;
            } else if (existing.status === 'complete' && derived.status === 'complete') {
              existing.detail = derived.detail;
            }
          } else if (derived.status !== 'not_started') {
            // Step wasn't in progress table yet — add it from row counts
            progressMap.set(stepId, { ...derived, notes: null });
          }
        }

        setSections(buildSections(progressMap));
      } else {
        // First visit — bootstrap from row counts, then persist
        const derived = await bootstrapFromCounts(companyId, company?.name);
        const progressMap = new Map<string, { status: StepStatus; detail: string; notes: string | null }>();
        for (const [stepId, d] of derived) {
          progressMap.set(stepId, { ...d, notes: null });
        }

        setSections(buildSections(progressMap));

        // Persist bootstrapped progress in background
        for (const [stepId, d] of derived) {
          if (d.status !== 'not_started') {
            fetch('/api/onboarding/update-step', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                companyId,
                stepId,
                status: d.status,
              }),
            }).catch(() => {
              // Silently fail — bootstrap persist is best-effort
            });
          }
        }
      }
    } catch (err) {
      console.error('Error loading onboarding progress:', err);
      setError('Failed to load onboarding progress');

      // Fallback to row-count-only mode
      try {
        const derived = await bootstrapFromCounts(companyId, company?.name);
        const progressMap = new Map<string, { status: StepStatus; detail: string; notes: string | null }>();
        for (const [stepId, d] of derived) {
          progressMap.set(stepId, { ...d, notes: null });
        }
        setSections(buildSections(progressMap));
      } catch {
        // Complete failure
      }
    } finally {
      setLoading(false);
    }
  }, [companyId, company?.name, buildSections]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const updateStep = useCallback(
    async (stepId: string, status: StepStatus, notes?: string) => {
      if (!companyId) return;

      // Optimistic update
      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          steps: section.steps.map((step) =>
            step.stepId === stepId
              ? {
                  ...step,
                  status,
                  detail: status === 'complete' ? 'Complete' : status === 'skipped' ? 'Skipped' : 'Not started',
                  notes: notes ?? step.notes,
                }
              : step
          ),
          completedCount: section.steps.filter((s) =>
            s.stepId === stepId
              ? status === 'complete' || status === 'skipped'
              : s.status === 'complete' || s.status === 'skipped'
          ).length,
        }))
      );

      const res = await fetch('/api/onboarding/update-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, stepId, status, notes }),
      });

      if (!res.ok) {
        // Revert on failure
        await loadProgress();
      }
    },
    [companyId, loadProgress]
  );

  const totalCompleted = sections.reduce((sum, s) => sum + s.completedCount, 0);
  const totalSteps = ONBOARDING_STEPS.length;

  return {
    sections,
    loading,
    error,
    totalCompleted,
    totalSteps,
    allComplete: totalCompleted >= totalSteps,
    updateStep,
    refresh: loadProgress,
  };
}
