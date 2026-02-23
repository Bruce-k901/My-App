'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Course, Module, Lesson, Slide, Question } from '@/data/courses/schema';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, ChevronLeft, CheckCircle, AlertCircle, XCircle, Loader2 } from '@/components/ui/icons';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { selectRandomQuestions, calculateScore, QUIZ_QUESTION_COUNT, PASS_MARK_PERCENTAGE } from '@/lib/quiz-utils';
import { BeforeYouStart } from './BeforeYouStart';

interface CourseLayoutProps {
  course: Course;
  assignmentId?: string | null;
}

export function CourseLayout({ course, assignmentId }: CourseLayoutProps) {
  const router = useRouter();
  const { profile, siteId } = useAppContext();
  const [courseStarted, setCourseStarted] = useState(false);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number; percentage: number; passed: boolean } | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [completing, setCompleting] = useState(false);

  const currentModule = course.modules[currentModuleIndex];
  const currentLesson = currentModule?.lessons[currentLessonIndex];
  const currentSlide = currentLesson?.slides[currentSlideIndex];

  // Select random quiz questions when entering a quiz slide
  useEffect(() => {
    if (currentSlide?.type === 'quiz') {
      setQuizAnswers({});
      setQuizSubmitted(false);
      setQuizScore(null);
      const bank = course.questionBanks?.['final'] || [];
      setQuizQuestions(selectRandomQuestions(bank, QUIZ_QUESTION_COUNT));
    }
  }, [currentSlideIndex, currentLessonIndex, currentModuleIndex, currentSlide?.type, course.questionBanks]);

  const handleCourseComplete = useCallback(async (scorePercentage: number, passed: boolean) => {
    if (!passed) {
      // Failed - redirect to results page
      router.push(`/learn/${course.id}/results?scorePercentage=${scorePercentage}&passed=false&courseId=${course.id}`);
      return;
    }

    setCompleting(true);
    try {
      const response = await fetch('/api/courses/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          scorePercentage,
          assignmentId: assignmentId || undefined,
          siteId: siteId || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete course');
      }

      const result = await response.json();
      router.push(
        `/learn/${course.id}/results?` +
        `trainingRecordId=${result.trainingRecordId}` +
        `&certificateNumber=${result.certificateNumber || ''}` +
        `&scorePercentage=${scorePercentage}` +
        `&passed=true` +
        `&courseId=${course.id}`
      );
    } catch (error: any) {
      console.error('Error completing course:', error);
      // Still redirect to results but without certificate info
      router.push(
        `/learn/${course.id}/results?scorePercentage=${scorePercentage}&passed=true&error=${encodeURIComponent(error.message)}&courseId=${course.id}`
      );
    } finally {
      setCompleting(false);
    }
  }, [course.id, assignmentId, siteId, router]);

  // Show "Before You Start" page until user begins the course
  if (!courseStarted) {
    return (
      <BeforeYouStart
        course={course}
        assignmentId={assignmentId}
        onBegin={() => setCourseStarted(true)}
      />
    );
  }

  if (!currentSlide) {
    return (
        <div className="flex items-center justify-center h-screen bg-[rgb(var(--background))] dark:bg-slate-900 text-[rgb(var(--text-primary))] dark:text-white">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Course Content Not Found</h1>
                <Link href="/dashboard/courses" className="text-[#D37E91] dark:text-[#D37E91] hover:underline">Return to Courses</Link>
            </div>
        </div>
    );
  }

  const handleNext = () => {
    if (currentSlideIndex < currentLesson.slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else if (currentLessonIndex < currentModule.lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
      setCurrentSlideIndex(0);
    } else if (currentModuleIndex < course.modules.length - 1) {
      setCurrentModuleIndex(currentModuleIndex + 1);
      setCurrentLessonIndex(0);
      setCurrentSlideIndex(0);
    }
    // If on last slide and quiz submitted, completion is handled by handleQuizFinish
  };

  const handlePrev = () => {
     if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    } else if (currentLessonIndex > 0) {
      const prevLesson = currentModule.lessons[currentLessonIndex - 1];
      setCurrentLessonIndex(currentLessonIndex - 1);
      setCurrentSlideIndex(prevLesson.slides.length - 1);
    } else if (currentModuleIndex > 0) {
      const prevModule = course.modules[currentModuleIndex - 1];
      const prevLesson = prevModule.lessons[prevModule.lessons.length - 1];
      setCurrentModuleIndex(currentModuleIndex - 1);
      setCurrentLessonIndex(prevModule.lessons.length - 1);
      setCurrentSlideIndex(prevLesson.slides.length - 1);
    }
  };

  const handleQuizSubmit = () => {
    if (quizQuestions.length === 0) return;
    const score = calculateScore(quizQuestions, quizAnswers);
    setQuizScore(score);
    setQuizSubmitted(true);
  };

  const handleQuizFinish = () => {
    if (!quizScore) return;
    handleCourseComplete(quizScore.percentage, quizScore.passed);
  };

  const isLastSlide =
    currentSlideIndex === currentLesson.slides.length - 1 &&
    currentLessonIndex === currentModule.lessons.length - 1 &&
    currentModuleIndex === course.modules.length - 1;

  const answeredCount = Object.keys(quizAnswers).length;

  return (
    <div className="flex h-screen bg-[rgb(var(--background))] dark:bg-slate-900 text-[rgb(var(--text-primary))] dark:text-white font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex w-80 border-r border-[rgb(var(--border))] dark:border-white/10 bg-[rgb(var(--surface-elevated))] dark:bg-[#0B0D13] flex-col">
        <div className="p-6 border-b border-[rgb(var(--border))] dark:border-white/10">
 <Link href="/dashboard/courses"className="flex items-center gap-2 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Courses
            </Link>
            <h1 className="text-xl font-bold text-[rgb(var(--text-primary))] dark:text-white leading-tight">{course.title}</h1>
 <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mt-2">{course.description}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {course.modules.map((module, mIdx) => (
            <div key={module.id}>
 <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${mIdx === currentModuleIndex ?'text-[#D37E91] dark:text-[#D37E91]':'text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary'}`}>
                Module {mIdx + 1}: {module.title}
              </h3>
              <div className="space-y-1">
                {module.lessons.map((lesson, lIdx) => {
                    const isActive = mIdx === currentModuleIndex && lIdx === currentLessonIndex;
                    return (
                        <div
                            key={lesson.id}
 className={`px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${isActive ?'bg-[rgb(var(--surface))] dark:bg-white/10 text-[#D37E91] dark:text-[#D37E91] font-medium':'text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] dark:hover:text-theme-secondary hover:bg-[rgb(var(--surface))] dark:hover:bg-white/5'}`}
                        >
                            {lesson.title}
                        </div>
                    );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[rgb(var(--border))] dark:border-white/10 flex items-center justify-between px-8 bg-[rgb(var(--surface-elevated))] dark:bg-[#0B0D13]">
 <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
            <span className="font-medium text-[rgb(var(--text-primary))] dark:text-white">{currentModule.title}</span>
            <span className="text-[rgb(var(--text-tertiary))] dark:text-slate-600">/</span>
 <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">{currentLesson.title}</span>
          </div>
          <div className="text-sm font-medium bg-[rgb(var(--surface))] dark:bg-white/5 px-3 py-1.5 rounded-full border border-[rgb(var(--border))] dark:border-white/10 text-[rgb(var(--text-secondary))] dark:text-theme-secondary">
            Slide {currentSlideIndex + 1} of {currentLesson.slides.length}
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto flex justify-center bg-[rgb(var(--background))] dark:bg-[#0f1119]">
          <div className="max-w-4xl w-full animate-in fade-in duration-500">

            {currentSlide.type === 'text-graphic-split' && (
              <div className={`grid ${currentSlide.mediaUrl ? 'lg:grid-cols-2' : 'lg:grid-cols-1 max-w-3xl mx-auto'} gap-12 items-start`}>
                <div className="space-y-6">
                    <h2 className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{currentSlide.title}</h2>
                    <div className="max-w-none">
                        {(() => {
                            const lines = currentSlide.content?.split('\n') || [];
                            const elements: React.ReactNode[] = [];
                            let currentList: string[] = [];

                            const flushList = () => {
                                if (currentList.length > 0) {
                                    elements.push(
                                        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-2 mt-4 mb-4 ml-4 text-[rgb(var(--text-secondary))] dark:text-theme-secondary">
                                            {currentList.map((item, idx) => (
                                                <li key={idx} dangerouslySetInnerHTML={{__html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[rgb(var(--text-primary))] dark:text-white font-semibold">$1</strong>')}} />
                                            ))}
                                        </ul>
                                    );
                                    currentList = [];
                                }
                            };

                            lines.forEach((line, i) => {
                                if (line.startsWith('## ')) {
                                    flushList();
                                    elements.push(<h2 key={i} className="text-2xl font-bold mt-6 mb-4 text-[rgb(var(--text-primary))] dark:text-white">{line.replace('## ', '')}</h2>);
                                } else if (line.startsWith('### ')) {
                                    flushList();
                                    elements.push(<h3 key={i} className="text-xl font-semibold mt-4 mb-2 text-[rgb(var(--text-primary))] dark:text-white">{line.replace('### ', '')}</h3>);
                                } else if (line.startsWith('- ')) {
                                    currentList.push(line.replace('- ', ''));
                                } else if (line.trim() === '') {
                                    flushList();
                                    elements.push(<br key={i} />);
                                } else {
                                    flushList();
 elements.push(<p key={i} className="text-[rgb(var(--text-secondary))] dark:text-theme-secondary leading-relaxed mb-4" dangerouslySetInnerHTML={{__html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[rgb(var(--text-primary))] font-semibold">$1</strong>')}} />);
                                }
                            });
                            flushList();
                            return elements;
                        })()}
                    </div>
                </div>
                {currentSlide.mediaUrl && (
                  <div className="bg-[rgb(var(--surface-elevated))] dark:bg-slate-800 rounded-2xl overflow-hidden border border-[rgb(var(--border))] dark:border-white/10 shadow-2xl sticky top-8">
                    <div className="aspect-video bg-[rgb(var(--surface))] dark:bg-slate-900 flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#D37E91]/25 to-purple-500/20 mix-blend-overlay" />
                        <img
                            src={currentSlide.mediaUrl}
                            alt={currentSlide.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/1e293b/white?text=Image+Placeholder';
                            }}
                        />
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentSlide.type === 'scenario-decision' && (
               <div className="max-w-2xl mx-auto">
                 <div className="bg-gradient-to-br from-[rgb(var(--surface-elevated))] to-[rgb(var(--surface))] dark:from-slate-800 dark:to-slate-900 p-8 rounded-2xl border border-[rgb(var(--border))] dark:border-white/10 shadow-xl">
                    <div className="w-12 h-12 bg-[#D37E91]/25 rounded-xl flex items-center justify-center mb-6 text-[#D37E91] dark:text-[#D37E91]">
                        <AlertCircle size={24} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-[rgb(var(--text-primary))] dark:text-white">{currentSlide.title}</h2>
                    <div className="mb-8 max-w-none">
                        <p className="text-[rgb(var(--text-secondary))] dark:text-theme-secondary leading-relaxed">
                            {currentSlide.scenarioData?.nodes['start']?.text}
                        </p>
                    </div>

                    <div className="space-y-3">
                        {currentSlide.scenarioData?.nodes['start']?.options.map((opt: any, idx: number) => (
                        <button
                            key={idx}
                            onClick={() => alert(`You chose: ${opt.label}\n\n(Full interactive scenario logic would go here)`)}
                            className="w-full p-4 bg-[rgb(var(--surface))] dark:bg-white/5 hover:bg-[rgb(var(--surface-elevated))] dark:hover:bg-white/10 border border-[rgb(var(--border))] dark:border-white/10 hover:border-[#D37E91]/50 rounded-xl text-left transition-all duration-200 flex items-center justify-between group"
                        >
                            <span className="font-medium text-[rgb(var(--text-secondary))] dark:text-theme-primary group-hover:text-[rgb(var(--text-primary))] dark:group-hover:text-white">{opt.label}</span>
 <ChevronRight className="w-5 h-5 text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary group-hover:text-[#D37E91] dark:group-hover:text-[#D37E91]"/>
                        </button>
                        ))}
                    </div>
                 </div>
               </div>
            )}

             {currentSlide.type === 'quiz' && (
               <div className="max-w-2xl mx-auto">
                 <div className="bg-[rgb(var(--surface-elevated))] dark:bg-slate-800 p-8 rounded-2xl border border-[rgb(var(--border))] dark:border-white/10 text-center">
                    <div className={`w-16 h-16 ${quizSubmitted && quizScore ? (quizScore.passed ? 'bg-green-500/20' : 'bg-red-500/20') : 'bg-green-500/20'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                        {quizSubmitted && quizScore ? (
                          quizScore.passed
                            ? <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
                            : <XCircle size={32} className="text-red-600 dark:text-red-400" />
                        ) : (
                          <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
                        )}
                    </div>
                    <h2 className="text-3xl font-bold mb-4 text-[rgb(var(--text-primary))] dark:text-white">Final Assessment</h2>
                    {!quizSubmitted ? (
                      <>
 <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-2">
                          Answer all {quizQuestions.length} questions below. You need {PASS_MARK_PERCENTAGE}% to pass.
                        </p>
                        <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mb-8">
                          {answeredCount} of {quizQuestions.length} answered
                        </p>
                        <div className="space-y-6 text-left">
                            {quizQuestions.map((q, idx) => (
                                <div key={q.id} className="bg-[rgb(var(--surface))] dark:bg-slate-900/50 p-6 rounded-xl border border-[rgb(var(--border))] dark:border-white/5">
                                    <p className="font-medium mb-4 text-[rgb(var(--text-primary))] dark:text-white">{idx + 1}. {q.text}</p>
                                    <div className="space-y-2">
                                        {q.options.map((opt, optIdx) => (
                                            <label key={optIdx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[rgb(var(--surface-elevated))] dark:hover:bg-white/5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={q.id}
                                                    className="w-4 h-4 text-[#D37E91] focus:ring-[#D37E91] bg-[rgb(var(--surface-elevated))] dark:bg-slate-800 border-[rgb(var(--border))] dark:border-slate-600"
                                                    onChange={() => setQuizAnswers(prev => ({...prev, [q.id]: optIdx}))}
                                                    checked={quizAnswers[q.id] === optIdx}
                                                />
                                                <span className="text-sm text-[rgb(var(--text-secondary))] dark:text-theme-secondary">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={handleQuizSubmit}
                                disabled={answeredCount < quizQuestions.length}
                                className="w-full py-3 bg-[#D37E91] hover:bg-[#c06b7e] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition-colors text-white"
                            >
                                Submit Assessment ({answeredCount}/{quizQuestions.length} answered)
                            </button>
                        </div>
                      </>
                    ) : quizScore ? (
                        <div className="text-center space-y-6">
                            <div className={`text-6xl font-bold ${quizScore.passed ? 'text-green-500' : 'text-red-500'}`}>
                              {quizScore.percentage}%
                            </div>
                            <p className="text-lg text-[rgb(var(--text-secondary))] dark:text-theme-secondary">
                              {quizScore.correct} out of {quizScore.total} correct
                            </p>
                            {quizScore.passed ? (
                              <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-sm font-medium">
                                  <CheckCircle size={16} /> Passed
                                </div>
                                <p className="text-sm text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
                                  Congratulations! You have passed the assessment.
                                </p>
                                <button
                                    onClick={handleQuizFinish}
                                    disabled={completing}
                                    className="px-8 py-3 bg-[#D37E91] hover:bg-[#c06b7e] disabled:opacity-60 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 mx-auto"
                                >
                                    {completing ? (
                                      <><Loader2 size={18} className="animate-spin" /> Completing course...</>
                                    ) : (
                                      'Complete Course & View Certificate'
                                    )}
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full text-red-400 text-sm font-medium">
                                  <XCircle size={16} /> Not Passed
                                </div>
                                <p className="text-sm text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
                                  You need {PASS_MARK_PERCENTAGE}% to pass. You scored {quizScore.percentage}%.
                                </p>
                                <button
                                    onClick={handleQuizFinish}
                                    className="px-8 py-3 bg-[rgb(var(--text-primary))] dark:bg-white text-[rgb(var(--background))] dark:text-slate-900 rounded-xl font-bold hover:bg-[rgb(var(--text-secondary))] dark:hover:bg-slate-200 transition-colors mx-auto block"
                                >
                                    View Results
                                </button>
                              </div>
                            )}
                        </div>
                    ) : null}
                 </div>
               </div>
            )}

          </div>
        </div>

        <footer className="h-20 border-t border-[rgb(var(--border))] dark:border-white/10 flex items-center justify-between px-8 bg-[rgb(var(--surface-elevated))] dark:bg-[#0B0D13]">
          <button
            onClick={handlePrev}
            disabled={currentModuleIndex === 0 && currentLessonIndex === 0 && currentSlideIndex === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-[rgb(var(--border))] dark:border-white/10 hover:bg-[rgb(var(--surface))] dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition-colors text-[rgb(var(--text-primary))] dark:text-white"
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <div className="flex gap-2">
             {currentSlide.type !== 'quiz' && (
               <button
                  onClick={handleNext}
                  disabled={isLastSlide && currentSlide.type !== 'quiz'}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#D37E91] hover:bg-[#c06b7e] text-white text-sm font-medium shadow-lg shadow-[#D37E91]/20 transition-all hover:shadow-[#D37E91]/40 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                  Next Slide
                  <ChevronRight size={16} />
              </button>
             )}
          </div>
        </footer>
      </main>
    </div>
  );
}
