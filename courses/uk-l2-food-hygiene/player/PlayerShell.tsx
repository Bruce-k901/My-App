'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { MultiChoice } from '../components/MultiChoice';
import { OnboardingForm } from '../components/OnboardingForm';
import { PageShell as LayoutShell } from '../components/PageShell';
import { ProgressRail } from '../components/ProgressRail';
import { SingleChoice } from '../components/SingleChoice';
import { StickyFooterNav } from '../components/StickyFooterNav';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { canAccessFinalAssessment, getCurrentAssignment } from '@/lib/training/courseAccess';
import { useCourseProgressStore } from '@/stores/courseProgressStore';
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
  const {
    initialize: initProgressStore,
    toPage: progressToPage,
    setModuleScore: progressSetModuleScore,
    syncProgress,
  } = useCourseProgressStore();
  const { profile, user } = useAppContext();
  const [homeSiteName, setHomeSiteName] = useState('');
  const [assignmentCheck, setAssignmentCheck] = useState<{
    checking: boolean;
    allowed: boolean;
    reason?: string;
    assignmentId?: string;
  } | null>(null);
  const [progressStoreInitialized, setProgressStoreInitialized] = useState(false);

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

  // Sync progress to database when position changes
  useEffect(() => {
    if (!progressStoreInitialized || !currentModule || !currentPage) return;

    const moduleId = currentModule.manifest.id;
    const pageId = currentPage.id || `page-${pageIndex}`;

    // Sync to database
    void progressToPage(moduleIndex, pageIndex, moduleId, pageId);
  }, [moduleIndex, pageIndex, progressStoreInitialized, currentModule, currentPage, progressToPage]);

  const persist = useCallback(async () => {
    try {
      const snapshot = useAttemptStore.getState();
      
      // Save to localStorage for backward compatibility
      localStorage.setItem(
        ATTEMPT_STORAGE_KEY,
        JSON.stringify({
          learner: snapshot.learner,
          moduleIndex: snapshot.moduleIndex,
          pageIndex: snapshot.pageIndex,
          scores: snapshot.scores,
        })
      );

      // Sync to database if store is initialized
      if (progressStoreInitialized) {
        await syncProgress();
        toast.success('Progress saved');
      } else {
        toast.success('Progress saved');
      }
    } catch (error) {
      console.error('Failed to persist attempt', error);
      toast.error('Could not save progress');
    }
  }, [progressStoreInitialized, syncProgress]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Initialize database-backed progress store
  useEffect(() => {
    if (!profile?.id || !course.course_id || progressStoreInitialized) return;

    void (async () => {
      try {
        // Get course ID from training_courses table
        const { data: courseData } = await supabase
          .from('training_courses')
          .select('id, company_id')
          .or(`code.eq.FS-L2,course_id.eq.${course.course_id}`)
          .maybeSingle();

        if (courseData) {
          // Check for assignment
          const assignment = await getCurrentAssignment(profile.id, courseData.id);

          if (assignment?.assignmentId && assignment.companyId) {
            // Initialize database store
            await initProgressStore({
              assignmentId: assignment.assignmentId,
              courseId: courseData.id,
              profileId: profile.id,
              companyId: assignment.companyId,
              learner: learner || undefined,
            });
            setProgressStoreInitialized(true);
          }
        }
      } catch (error) {
        console.error('Failed to initialize progress store:', error);
      }
    })();
  }, [profile?.id, course.course_id, progressStoreInitialized, initProgressStore, learner]);

  // Load from localStorage for backward compatibility
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
    // Type guard: only access title when page type is 'content'
    if (currentPage?.type === 'content') {
      setTitle(currentPage.title);
    } else {
      setTitle(undefined);
    }
  }, [currentModule?.manifest.id, pageIndex, currentPage]);

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
        // Sync module score to database (fire and forget)
        if (progressStoreInitialized) {
          void progressSetModuleScore(moduleId, percent);
        }
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
    async (moduleId: string, poolId: string, count: number) => {
      // Check access control for final assessment
      if (moduleId === 'final' && profile?.id && course.course_id) {
        setAssignmentCheck({ checking: true, allowed: false });
        
        try {
          // Get course ID from training_courses table using course_id from manifest
          const { data: courseData } = await supabase
            .from('training_courses')
            .select('id')
            .or(`code.eq.FS-L2,course_id.eq.${course.course_id}`)
            .maybeSingle();

          if (courseData) {
            const accessCheck = await canAccessFinalAssessment(profile.id, courseData.id);
            
            if (!accessCheck.allowed) {
              setAssignmentCheck({
                checking: false,
                allowed: false,
                reason: accessCheck.reason,
              });
              toast.error(accessCheck.reason || 'Access denied');
              return;
            }

            setAssignmentCheck({
              checking: false,
              allowed: true,
              assignmentId: accessCheck.assignmentId,
            });
          } else {
            // If course not found in DB, allow access (for backward compatibility)
            setAssignmentCheck({
              checking: false,
              allowed: true,
            });
          }
        } catch (error) {
          console.error('Error checking course access:', error);
          setAssignmentCheck({
            checking: false,
            allowed: false,
            reason: 'Error checking course assignment. Please try again.',
          });
          toast.error('Error checking course access');
          return;
        }
      }

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
    [modules, profile, course]
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

    // Show access denied message if final quiz is blocked
    if (currentModule.manifest.id === 'final' && assignmentCheck && !assignmentCheck.allowed && !assignmentCheck.checking) {
      return (
        <LayoutShell title="Assignment Required" rightPanel={
          <div className="space-y-3 text-sm text-slate-200">
            <p className="font-semibold text-white">Final Assessment Access</p>
            <p>{assignmentCheck.reason}</p>
            <p className="text-xs text-slate-400 mt-4">
              Contact your manager to request course assignment.
            </p>
          </div>
        }>
          <div className="space-y-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-6 text-amber-200">
            <h3 className="text-lg font-semibold text-amber-100">Course Assignment Required</h3>
            <p>{assignmentCheck.reason}</p>
            <p className="text-sm text-amber-200/80">
              You can browse the course content, but the final assessment requires a confirmed assignment from your manager.
            </p>
          </div>
        </LayoutShell>
      );
    }

    return (
      <LayoutShell title={title} rightPanel={rightPanel}>
        <Renderer
          page={currentPage}
          onContinue={() => {
            if (currentPage.type === 'quiz_ref') {
              void startQuiz(currentModule.manifest.id, currentPage.pool, currentPage.count);
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

  // Check if course has been started (not on first page of first module)
  const hasStarted = moduleIndex > 0 || pageIndex > 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-3 sm:px-4 py-6 sm:py-8 text-white">
      <header className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.35em] text-pink-200">{course.course_id}</p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white">{course.title}</h1>
          </div>
          {hasStarted && (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white/80 hover:text-white hover:bg-white/[0.12] transition-all text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
          )}
        </div>
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
