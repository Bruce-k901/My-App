'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MultiChoice } from '../components/MultiChoice';
import { OnboardingForm } from '../components/OnboardingForm';
import { PageShell as LayoutShell } from '../components/PageShell';
import { ProgressRail } from '../components/ProgressRail';
import { SingleChoice } from '../components/SingleChoice';
import { StickyFooterNav } from '../components/StickyFooterNav';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import type { CourseManifest } from '../schemas/course';
import type { ModuleManifest } from '../schemas/module';
import type { Page } from '../schemas/page';
import type { OutcomesMapping } from '../schemas/outcomes';
import type { AssessmentBlueprint } from '../schemas/blueprint';
import { Renderer } from './Renderer';
import { buildPayload, LAST_PAYLOAD_STORAGE_KEY, sendPayload } from './payload';
import { scoreMulti, scoreSingle } from './scoring';
import { sliceQuiz } from './quizzes';
import { ATTEMPT_STORAGE_KEY, useAttemptStore } from './useAttemptStore';

export type ModuleBundle = {
  manifest: ModuleManifest;
  pages: Page[];
  pools: Record<string, Page[]>;
  outcomes?: OutcomesMapping;
  blueprint?: AssessmentBlueprint;
};

type PlayerShellProps = {
  course: CourseManifest;
  modules: ModuleBundle[];
};

type QuizState = {
  moduleId: string;
  poolId: string;
  currentIndex: number;
  questions: Page[];
  correctCount: number;
  answered: Record<number, boolean>;
};

export function PlayerShell({ course, modules }: PlayerShellProps) {
  const [canProceed, setCanProceed] = useState(false);
  const [title, setTitle] = useState<string | undefined>();
  const [rightPanel, setRightPanel] = useState<React.ReactNode | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const attemptStartRef = useRef<string>(new Date().toISOString());
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { learner, moduleIndex, pageIndex, scores, toPage, setLearner, setModuleScore, setFinalScore } =
    useAttemptStore();
  const { profile, user } = useAppContext();
  const [homeSiteName, setHomeSiteName] = useState('');

  useEffect(() => {
    let active = true;

    const siteIdentifier =
      profile?.home_site ||
      profile?.site_name ||
      profile?.site ||
      profile?.site_id ||
      (user?.user_metadata?.home_site as string | undefined);

    if (!siteIdentifier) {
      setHomeSiteName('');
      return () => {
        active = false;
      };
    }

    if (profile?.site_name) {
      setHomeSiteName(profile.site_name);
      return () => {
        active = false;
      };
    }

    if (profile?.home_site && profile.home_site !== siteIdentifier) {
      setHomeSiteName(profile.home_site);
      return () => {
        active = false;
      };
    }

    if (/^[0-9a-fA-F-]{36}$/.test(siteIdentifier)) {
      void (async () => {
        try {
          const { data, error } = await supabase
            .from('sites')
            .select('name')
            .eq('id', siteIdentifier)
            .maybeSingle();
          if (!active) return;
          if (error) {
            console.error('Failed to resolve site name', error);
            setHomeSiteName(siteIdentifier);
            return;
          }
          setHomeSiteName(data?.name ?? siteIdentifier);
        } catch (error) {
          if (active) {
            console.error('Failed to resolve site name', error);
            setHomeSiteName(siteIdentifier);
          }
        }
      })();
    } else {
      setHomeSiteName(siteIdentifier);
    }

    return () => {
      active = false;
    };
  }, [profile, user]);

  const onboardingDefaults = useMemo(() => {
    const profileFullName =
      profile?.full_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
      '';
    const metaFullName = (user?.user_metadata?.full_name as string | undefined) ?? '';
    const fullName = (profileFullName || metaFullName).trim();

    const position =
      profile?.position_title ||
      profile?.position ||
      profile?.job_title ||
      (user?.user_metadata?.position as string | undefined) ||
      '';

    return {
      full_name: fullName,
      position,
      home_site: homeSiteName,
    };
  }, [profile, user, homeSiteName]);

  const currentModule = modules[moduleIndex];
  const currentPage = currentModule?.pages[pageIndex];

  const progressModules = useMemo(() => {
    const totalPages = modules.reduce((sum, bundle) => sum + bundle.pages.length, 0) || 1;
    const completedPages =
      modules
        .slice(0, moduleIndex)
        .reduce((sum, bundle) => sum + bundle.pages.length, 0) + Math.min(pageIndex, modules[moduleIndex]?.pages.length ?? 0);
    const percentage = Math.min(100, Math.round((completedPages / totalPages) * 100));

    return {
      modules: modules.map((bundle, index) => ({
        id: bundle.manifest.id,
        title: bundle.manifest.title,
        isActive: index === moduleIndex,
        isComplete: index < moduleIndex,
      })),
      percentage,
    };
  }, [modules, moduleIndex, pageIndex]);

  const persist = useCallback(() => {
    try {
      const snapshot = useAttemptStore.getState();
      localStorage.setItem(
        ATTEMPT_STORAGE_KEY,
        JSON.stringify({
          learner: snapshot.learner,
          moduleIndex: snapshot.moduleIndex,
          pageIndex: snapshot.pageIndex,
          scores: snapshot.scores,
        })
      );
      toast.success('Progress saved');
    } catch (error) {
      console.error('Failed to persist attempt', error);
      toast.error('Could not save progress');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(ATTEMPT_STORAGE_KEY) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          learner: typeof learner;
          moduleIndex: number;
          pageIndex: number;
          scores: typeof scores;
        };
        useAttemptStore.setState({
          learner: parsed.learner,
          moduleIndex: parsed.moduleIndex ?? 0,
          pageIndex: parsed.pageIndex ?? 0,
          scores: parsed.scores ?? { modules: {} },
        });
      } catch (error) {
        console.warn('Unable to restore saved attempt', error);
      }
    }
  }, []);

  useEffect(() => {
    setTitle(currentPage?.type === 'content' ? currentPage.title : undefined);
  }, [currentModule?.manifest.id, pageIndex, currentPage?.type, currentPage?.title]);

  const completeCourse = useCallback(async () => {
    const snapshot = useAttemptStore.getState();
    const moduleScores = Object.values(snapshot.scores.modules);
    const finalPercent = moduleScores.length
      ? Math.round(moduleScores.reduce((sum, value) => sum + value, 0) / moduleScores.length)
      : 0;
    setFinalScore(finalPercent, course.pass_mark_percent);

    if (!snapshot.learner) {
      return;
    }

    const scoresWithFinal = {
      modules: snapshot.scores.modules,
      final: { percent: finalPercent, passed: finalPercent >= course.pass_mark_percent },
    };

    const moduleMeta = modules.map((bundle) => ({
      id: bundle.manifest.id,
      title: bundle.manifest.title,
      outcomes: bundle.outcomes,
      blueprint: bundle.blueprint,
    content: bundle.pages,
    }));

    const payload = buildPayload({
      courseId: course.course_id,
      learner: snapshot.learner,
      start: attemptStartRef.current,
      scores: scoresWithFinal,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      moduleMeta,
    });

    try {
      localStorage.setItem(LAST_PAYLOAD_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to persist last attempt payload', error);
    }

    const submit = async () => {
      try {
        await sendPayload('/api/training-matrix/ingest', payload);
        toast.success('Training matrix updated');
      } catch (error) {
        console.error('Failed to submit training matrix payload', error);
        toast.error('Could not save results. Retrying in 10s…');
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        retryTimeoutRef.current = setTimeout(() => {
          void sendPayload('/api/training-matrix/ingest', payload).catch(() => undefined);
        }, 10_000);
      }
    };

    await submit();
  }, [course.course_id, course.pass_mark_percent, setFinalScore]);

  const goNext = () => {
    if (!quiz && !canProceed) return;

    if (quiz) {
      const { currentIndex, questions, moduleId, correctCount } = quiz;
      const nextIndex = currentIndex + 1;
      if (nextIndex >= questions.length) {
        const percent = Math.round((correctCount / questions.length) * 100);
        setModuleScore(moduleId, percent);
        setQuiz(null);
        toast.success(`Module score: ${percent}%`);
        toPage(moduleIndex, pageIndex + 1);
      } else {
        setQuiz({ ...quiz, currentIndex: nextIndex });
        setCanProceed(false);
      }
      return;
    }

    if (!currentModule) return;
    if (pageIndex < currentModule.pages.length - 1) {
      toPage(moduleIndex, pageIndex + 1);
      return;
    }

    if (moduleIndex < modules.length - 1) {
      toPage(moduleIndex + 1, 0);
    } else {
      void completeCourse();
      toast.success('Course complete!');
    }
  };

  const goBack = () => {
    if (quiz) {
      if (quiz.currentIndex > 0) {
        setQuiz({ ...quiz, currentIndex: quiz.currentIndex - 1 });
        setCanProceed(false);
      }
      return;
    }

    if (pageIndex > 0) {
      toPage(moduleIndex, pageIndex - 1);
    } else if (moduleIndex > 0) {
      const previous = modules[moduleIndex - 1];
      toPage(moduleIndex - 1, previous.pages.length - 1);
    }
  };

  const startQuiz = useCallback(
    (moduleId: string, poolId: string, count: number) => {
      const bundle = modules.find((item) => item.manifest.id === moduleId);
      if (!bundle) return;
      const available = bundle.pools[poolId] ?? [];
      if (available.length === 0) {
        toast.error(`No questions configured for pool ${poolId}`);
        setCanProceed(true);
        return;
      }
      const questions = sliceQuiz(available, count);
      setQuiz({ moduleId, poolId, currentIndex: 0, questions, correctCount: 0, answered: {} });
      setCanProceed(false);
    },
    [modules]
  );

  const handleQuizAnswer = (score: number) => {
    setQuiz((state) => {
      if (!state) return state;
      if (score === 1 && !state.answered[state.currentIndex]) {
        return {
          ...state,
          correctCount: state.correctCount + 1,
          answered: { ...state.answered, [state.currentIndex]: true },
        };
      }
      return {
        ...state,
        answered: score === 1 ? { ...state.answered, [state.currentIndex]: true } : state.answered,
      };
    });
    setCanProceed(score === 1);
  };

  const renderMain = () => {
    if (!learner) {
      return (
        <LayoutShell title="Tell us about you">
          <OnboardingForm
            defaultValues={onboardingDefaults}
            onSubmit={(data) => {
              setLearner(data);
              attemptStartRef.current = new Date().toISOString();
            }}
          />
        </LayoutShell>
      );
    }

    if (quiz) {
      const question = quiz.questions[quiz.currentIndex];
      if (question?.type !== 'single_choice' && question?.type !== 'multi_choice') {
        return (
          <LayoutShell title="Unsupported quiz item">
            <p className="text-sm text-slate-200">Only choice questions are supported in this build.</p>
          </LayoutShell>
        );
      }

      return (
        <LayoutShell title={`Quiz question ${quiz.currentIndex + 1} of ${quiz.questions.length}`}>
          {question.type === 'single_choice' ? (
            <SingleChoice
              stem={question.stem}
              options={question.options}
              correctIndex={question.answer}
              onDone={(picked) => {
                const score = scoreSingle(picked, question.answer);
                handleQuizAnswer(score);
              }}
            />
          ) : (
            <MultiChoice
              stem={question.stem}
              options={question.options}
              correctIndices={question.answers}
              onDone={(picked) => {
                const score = scoreMulti(picked, question.answers);
                handleQuizAnswer(score);
              }}
            />
          )}
        </LayoutShell>
      );
    }

    if (!currentModule || !currentPage) {
      return (
        <LayoutShell title="Loading module">
          <p className="text-sm text-slate-200">Preparing learning content…</p>
        </LayoutShell>
      );
    }

    return (
      <LayoutShell title={title} rightPanel={rightPanel}>
        <Renderer
          page={currentPage}
          onContinue={() => {
            if (currentPage.type === 'quiz_ref') {
              startQuiz(currentModule.manifest.id, currentPage.pool, currentPage.count);
              return;
            }
            setCanProceed(true);
          }}
          setCanProceed={setCanProceed}
          setTitle={setTitle}
          setRightPanel={setRightPanel}
        />
      </LayoutShell>
    );
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 text-white">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.35em] text-pink-200">{course.course_id}</p>
        <h1 className="text-3xl font-semibold text-white">{course.title}</h1>
      </header>
      <div className="flex flex-1 flex-col gap-6">
        <details className="rounded-2xl border border-white/10 bg-neutral-900/70 p-4 text-sm text-slate-200 transition">
          <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-white">
            Module overview
            <span className="text-xs font-normal text-slate-400">{progressModules.percentage}% complete</span>
          </summary>
          <div className="mt-4">
            <ProgressRail modules={progressModules.modules} overallPercent={progressModules.percentage} />
          </div>
        </details>
        <main className="flex-1">
          {renderMain()}
        </main>
      </div>
      <StickyFooterNav
        onBack={goBack}
        onNext={goNext}
        onSave={persist}
        disableNext={!canProceed && !quiz}
        nextLabel={quiz ? (quiz.currentIndex === quiz.questions.length - 1 ? 'Finish quiz' : 'Next question') : 'Next'}
      />
    </div>
  );
}
