'use client';

import { create } from 'zustand';
import { debounce } from '@/lib/utils';

export type Learner = { full_name: string; position: string; home_site: string };
export type Scores = { modules: Record<string, number>; final?: { percent: number; passed: boolean } };

type CourseProgressState = {
  // Assignment info
  assignmentId: string | null;
  courseId: string | null;
  profileId: string | null;
  companyId: string | null;

  // Learner info
  learner: Learner | null;

  // Current position
  moduleIndex: number;
  pageIndex: number;
  currentModuleId: string | null;
  currentPageId: string | null;

  // Scores
  scores: Scores;

  // Sync state
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;

  // Actions
  initialize: (params: {
    assignmentId: string;
    courseId: string;
    profileId: string;
    companyId: string;
    learner?: Learner;
  }) => Promise<void>;
  setLearner: (learner: Learner) => void;
  toPage: (moduleIndex: number, pageIndex: number, moduleId?: string, pageId?: string) => void;
  setModuleScore: (moduleId: string, percent: number) => Promise<void>;
  setFinalScore: (percent: number, passMark: number) => Promise<void>;
  syncProgress: () => Promise<void>;
  loadProgress: () => Promise<void>;
  reset: () => void;
};

const defaultState: Omit<
  CourseProgressState,
  | 'initialize'
  | 'setLearner'
  | 'toPage'
  | 'setModuleScore'
  | 'setFinalScore'
  | 'syncProgress'
  | 'loadProgress'
  | 'reset'
> = {
  assignmentId: null,
  courseId: null,
  profileId: null,
  companyId: null,
  learner: null,
  moduleIndex: 0,
  pageIndex: 0,
  currentModuleId: null,
  currentPageId: null,
  scores: { modules: {} },
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,
};

// Debounced sync function
const debouncedSync = debounce(async (syncFn: () => Promise<void>) => {
  await syncFn();
}, 1000);

export const useCourseProgressStore = create<CourseProgressState>((set, get) => ({
  ...defaultState,

  initialize: async (params) => {
    set({
      assignmentId: params.assignmentId,
      courseId: params.courseId,
      profileId: params.profileId,
      companyId: params.companyId,
      learner: params.learner || null,
    });

    // Load existing progress from database
    await get().loadProgress();
  },

  setLearner: (learner) => {
    set({ learner });
    // Sync learner info to assignment if needed
    void debouncedSync(() => get().syncProgress());
  },

  toPage: (moduleIndex, pageIndex, moduleId, pageId) => {
    set({
      moduleIndex,
      pageIndex,
      currentModuleId: moduleId || null,
      currentPageId: pageId || null,
    });
    // Sync position to database
    void debouncedSync(() => get().syncProgress());
  },

  setModuleScore: async (moduleId, percent) => {
    const currentScores = get().scores;
    const newScores = {
      ...currentScores,
      modules: { ...currentScores.modules, [moduleId]: percent },
    };
    set({ scores: newScores });

    // Sync module completion to database
    const state = get();
    if (state.assignmentId && state.courseId && state.profileId && state.companyId) {
      try {
        const response = await fetch('/api/training/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignment_id: state.assignmentId,
            course_id: state.courseId,
            profile_id: state.profileId,
            company_id: state.companyId,
            module_id: moduleId,
            status: 'completed',
            quiz_score: percent,
            quiz_passed: percent >= 80, // Assuming 80% pass mark for module quizzes
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to sync module score');
        }
      } catch (error) {
        console.error('Failed to sync module score:', error);
        set({ syncError: error instanceof Error ? error.message : 'Failed to sync' });
      }
    }
  },

  setFinalScore: (percent, passMark) => {
    const currentScores = get().scores;
    set({
      scores: {
        ...currentScores,
        final: { percent, passed: percent >= passMark },
      },
    });
    // Final score sync will be handled by completion flow
  },

  syncProgress: async () => {
    const state = get();
    if (!state.assignmentId || !state.courseId || !state.profileId || !state.companyId) {
      return;
    }

    if (state.isSyncing) {
      return;
    }

    set({ isSyncing: true, syncError: null });

    try {
      const response = await fetch('/api/training/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: state.assignmentId,
          course_id: state.courseId,
          profile_id: state.profileId,
          company_id: state.companyId,
          module_id: state.currentModuleId,
          page_id: state.currentPageId,
          module_index: state.moduleIndex,
          page_index: state.pageIndex,
          status: state.moduleIndex > 0 || state.pageIndex > 0 ? 'in_progress' : 'not_started',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync progress');
      }

      set({ lastSyncedAt: new Date(), syncError: null });
    } catch (error) {
      console.error('Failed to sync progress:', error);
      set({ syncError: error instanceof Error ? error.message : 'Failed to sync' });
    } finally {
      set({ isSyncing: false });
    }
  },

  loadProgress: async () => {
    const state = get();
    if (!state.assignmentId || !state.courseId || !state.profileId) {
      return;
    }

    try {
      const response = await fetch(
        `/api/training/progress?assignment_id=${state.assignmentId}&course_id=${state.courseId}&profile_id=${state.profileId}`
      );

      if (!response.ok) {
        // No existing progress is fine
        return;
      }

      const data = await response.json();
      if (data && data.length > 0) {
        // Find the most recent progress entry
        const latest = data.sort(
          (a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0];

        // Restore position if we have module/page info
        // Note: We'll need to map module_id/page_id back to indices in PlayerShell
        // For now, we'll store the IDs and let PlayerShell handle the mapping
        set({
          currentModuleId: latest.module_id || null,
          currentPageId: latest.page_id || null,
        });
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  },

  reset: () => {
    set({ ...defaultState });
  },
}));
