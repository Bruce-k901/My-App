import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Course, Lesson, Module, Slide } from "@/data/courses/schema";

interface CourseState {
    course: Course | null;
    currentModuleId: string | null;
    currentLessonId: string | null;
    currentSlideId: string | null;
    completedSlideIds: string[];
    completedModuleIds: string[];

    // Actions
    setCourse: (course: Course) => void;
    navigateToSlide: (
        moduleId: string,
        lessonId: string,
        slideId: string,
    ) => void;
    markSlideComplete: (slideId: string) => void;
    nextSlide: () => void;
    prevSlide: () => void;
    resetProgress: () => void;
}

export const useCourseStore = create<CourseState>()(
    persist(
        (set, get) => ({
            course: null,
            currentModuleId: null,
            currentLessonId: null,
            currentSlideId: null,
            completedSlideIds: [],
            completedModuleIds: [],

            setCourse: (course) => {
                const state = get();
                if (!state.course || state.course.id !== course.id) {
                    const firstModule = course.modules[0];
                    const firstLesson = firstModule?.lessons[0];
                    const firstSlide = firstLesson?.slides[0];

                    set({
                        course,
                        currentModuleId: firstModule?.id || null,
                        currentLessonId: firstLesson?.id || null,
                        currentSlideId: firstSlide?.id || null,
                    });
                } else {
                    set({ course });
                }
            },

            navigateToSlide: (moduleId, lessonId, slideId) => {
                set({
                    currentModuleId: moduleId,
                    currentLessonId: lessonId,
                    currentSlideId: slideId,
                });
            },

            markSlideComplete: (slideId) => {
                const { completedSlideIds, course, currentModuleId } = get();
                if (!completedSlideIds.includes(slideId)) {
                    const newCompleted = [...completedSlideIds, slideId];
                    set({ completedSlideIds: newCompleted });

                    // Check if module is complete
                    if (course && currentModuleId) {
                        const module = course.modules.find((m) =>
                            m.id === currentModuleId
                        );
                        if (module) {
                            const allSlides = module.lessons.flatMap((l) =>
                                l.slides
                            );
                            const allComplete = allSlides.every((s) =>
                                newCompleted.includes(s.id)
                            );
                            if (allComplete) {
                                set((state) => ({
                                    completedModuleIds: [
                                        ...state.completedModuleIds,
                                        currentModuleId,
                                    ],
                                }));
                            }
                        }
                    }
                }
            },

            nextSlide: () => {
                const {
                    course,
                    currentModuleId,
                    currentLessonId,
                    currentSlideId,
                } = get();
                if (
                    !course || !currentModuleId || !currentLessonId ||
                    !currentSlideId
                ) return;

                const allSlides: { mId: string; lId: string; s: Slide }[] = [];
                course.modules.forEach((m) => {
                    m.lessons.forEach((l) => {
                        l.slides.forEach((s) => {
                            allSlides.push({ mId: m.id, lId: l.id, s });
                        });
                    });
                });

                const currentIndex = allSlides.findIndex((item) =>
                    item.s.id === currentSlideId
                );
                if (
                    currentIndex !== -1 && currentIndex < allSlides.length - 1
                ) {
                    const next = allSlides[currentIndex + 1];
                    set({
                        currentModuleId: next.mId,
                        currentLessonId: next.lId,
                        currentSlideId: next.s.id,
                    });
                }
            },

            prevSlide: () => {
                const { course, currentSlideId } = get();
                if (!course || !currentSlideId) return;

                const allSlides: { mId: string; lId: string; s: Slide }[] = [];
                course.modules.forEach((m) => {
                    m.lessons.forEach((l) => {
                        l.slides.forEach((s) => {
                            allSlides.push({ mId: m.id, lId: l.id, s });
                        });
                    });
                });

                const currentIndex = allSlides.findIndex((item) =>
                    item.s.id === currentSlideId
                );
                if (currentIndex > 0) {
                    const prev = allSlides[currentIndex - 1];
                    set({
                        currentModuleId: prev.mId,
                        currentLessonId: prev.lId,
                        currentSlideId: prev.s.id,
                    });
                }
            },

            resetProgress: () => {
                set({ completedSlideIds: [], completedModuleIds: [] });
            },
        }),
        {
            name: "course-storage-v3",
            partialize: (state) => ({
                completedSlideIds: state.completedSlideIds,
                completedModuleIds: state.completedModuleIds,
                currentModuleId: state.currentModuleId,
                currentLessonId: state.currentLessonId,
                currentSlideId: state.currentSlideId,
            }),
        },
    ),
);
