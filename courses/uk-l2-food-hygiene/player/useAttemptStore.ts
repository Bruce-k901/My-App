'use client';

import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

export type Learner = { full_name: string; position: string; home_site: string };
export type Scores = { modules: Record<string, number>; final?: { percent: number; passed: boolean } };

type AttemptState = {
  learner: Learner | null;
  moduleIndex: number;
  pageIndex: number;
  scores: Scores;
  setLearner: (learner: Learner) => void;
  toPage: (moduleIndex: number, pageIndex: number) => void;
  setModuleScore: (moduleId: string, percent: number) => void;
  setFinalScore: (percent: number, passMark: number) => void;
  reset: () => void;
};

const defaultState: Omit<AttemptState, 'setLearner' | 'toPage' | 'setModuleScore' | 'setFinalScore' | 'reset'> = {
  learner: null,
  moduleIndex: 0,
  pageIndex: 0,
  scores: { modules: {} },
};

export const useAttemptStore = create<AttemptState>((set) => ({
  ...defaultState,
  setLearner: (learner) => set({ learner }),
  toPage: (moduleIndex, pageIndex) => set({ moduleIndex, pageIndex }),
  setModuleScore: (moduleId, percent) =>
    set((state) => ({
      scores: {
        ...state.scores,
        modules: { ...state.scores.modules, [moduleId]: percent },
      },
    })),
  setFinalScore: (percent, passMark) =>
    set((state) => ({
      scores: {
        ...state.scores,
        final: { percent, passed: percent >= passMark },
      },
    })),
  reset: () => set({ ...defaultState }),
}));

export const ATTEMPT_STORAGE_KEY = 'selfstudy:l2-food-hygiene';

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
    }, ms);
  };
}

if (typeof window !== 'undefined') {
  const persistSlice = (state: AttemptState) => ({
    learner: state.learner,
    moduleIndex: state.moduleIndex,
    pageIndex: state.pageIndex,
    scores: state.scores,
  });

  const save = debounce((slice: ReturnType<typeof persistSlice>) => {
    try {
      localStorage.setItem(ATTEMPT_STORAGE_KEY, JSON.stringify(slice));
    } catch (error) {
      console.error('Failed to autosave attempt', error);
    }
  }, 300);

  useAttemptStore.subscribe(persistSlice, save, { equalityFn: shallow });
}
