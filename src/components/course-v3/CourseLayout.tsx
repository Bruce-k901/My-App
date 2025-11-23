'use client';

import React, { useEffect } from 'react';
import { useCourseStore } from '@/stores/course-store';
import { SlideViewer } from './SlideViewer';
import { ChevronLeft, ChevronRight, CheckCircle, Circle, Lock, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Course } from '@/data/courses/schema';

interface CourseLayoutProps {
  course: Course;
}

export const CourseLayout: React.FC<CourseLayoutProps> = ({ course }) => {
  const {
    course: activeCourse,
    setCourse,
    currentModuleId,
    currentLessonId,
    currentSlideId,
    completedSlideIds,
    completedModuleIds,
    navigateToSlide,
    nextSlide,
    prevSlide,
  } = useCourseStore();

  // Initialize course in store
  useEffect(() => {
    setCourse(course);
  }, [course, setCourse]);

  if (!activeCourse) return <div className="flex h-screen items-center justify-center">Loading course...</div>;

  const currentModule = activeCourse.modules.find((m) => m.id === currentModuleId);
  const currentLesson = currentModule?.lessons.find((l) => l.id === currentLessonId);
  const currentSlide = currentLesson?.slides.find((s) => s.id === currentSlideId);

  // Calculate progress
  // Calculate progress
  const allSlideIds = activeCourse.modules.flatMap(m => m.lessons.flatMap(l => l.slides.map(s => s.id)));
  const totalSlides = allSlideIds.length;
  const validCompletedSlides = completedSlideIds.filter(id => allSlideIds.includes(id));
  const progressPercent = totalSlides > 0 ? Math.round((validCompletedSlides.length / totalSlides) * 100) : 0;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col h-full hidden md:flex">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-slate-900 leading-tight">{activeCourse.title}</h1>
          <div className="mt-4">
            <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
              <span>Course Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {activeCourse.modules.map((module, mIndex) => {
             const isModuleCompleted = completedModuleIds.includes(module.id);
             const isModuleActive = currentModuleId === module.id;
             // Simple logic: Module is locked if previous module is not complete
             // For V1, let's just unlock everything for testing or implement strict logic later
             const isLocked = mIndex > 0 && !completedModuleIds.includes(activeCourse.modules[mIndex - 1].id);

            return (
              <div key={module.id} className="mb-2">
                <div className={cn(
                  "px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors",
                  isModuleActive && "bg-blue-50/50 border-r-2 border-blue-600"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border",
                        isModuleCompleted ? "bg-green-100 text-green-700 border-green-200" : 
                        isModuleActive ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-500 border-gray-200"
                    )}>
                        {isModuleCompleted ? <CheckCircle className="w-4 h-4" /> : mIndex + 1}
                    </div>
                    <span className={cn("font-medium text-sm", isModuleActive ? "text-blue-900" : "text-slate-700")}>
                        {module.title}
                    </span>
                  </div>
                </div>

                {/* Lessons & Slides (Only show if active or previously active could be better, but showing all for now) */}
                {(isModuleActive || !isLocked) && (
                    <div className="pl-12 pr-4 space-y-1 mt-1 mb-3">
                        {module.lessons.map(lesson => (
                            <div key={lesson.id}>
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 mt-2 pl-2">
                                    {lesson.title}
                                </div>
                                {lesson.slides.map(slide => {
                                    const isCompleted = completedSlideIds.includes(slide.id);
                                    const isActive = currentSlideId === slide.id;
                                    
                                    return (
                                        <button
                                            key={slide.id}
                                            onClick={() => navigateToSlide(module.id, lesson.id, slide.id)}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-md text-sm transition-all flex items-center gap-2",
                                                isActive ? "bg-blue-100 text-blue-800 font-medium" : "text-slate-600 hover:bg-gray-100",
                                                isCompleted && !isActive && "text-slate-500"
                                            )}
                                        >
                                            {isCompleted ? (
                                                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                            ) : (
                                                <Circle className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-blue-500" : "text-gray-300")} />
                                            )}
                                            <span className="truncate">{slide.title}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>{currentModule?.title}</span>
                <ChevronRight className="w-4 h-4" />
                <span className="font-medium text-slate-900">{currentLesson?.title}</span>
            </div>
            
            <a 
              href="/dashboard/courses"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2"
            >
              <span className="hidden sm:inline">Save & Exit</span>
              <X className="w-5 h-5" />
            </a>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-gray-50/50">
            <div className="max-w-5xl mx-auto">
                {currentSlide ? (
                    <SlideViewer slide={currentSlide} />
                ) : (
                    <div className="text-center text-gray-500 mt-20">Select a slide to begin</div>
                )}
            </div>
        </div>

        {/* Footer Navigation */}
        <footer className="h-20 bg-white border-t border-gray-200 flex items-center justify-between px-8 shrink-0 z-10">
            <button 
                onClick={prevSlide}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
                <ChevronLeft className="w-5 h-5" />
                Previous
            </button>

            <div className="text-sm text-slate-400 font-medium hidden md:block">
                {currentSlide?.title}
            </div>

            <button 
                onClick={nextSlide}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-lg shadow-slate-900/10 transition-all transform active:scale-95 font-medium"
            >
                Next
                <ChevronRight className="w-5 h-5" />
            </button>
        </footer>
      </main>
    </div>
  );
};
