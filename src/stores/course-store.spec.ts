import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCourseStore } from "./course-store";
import { Course } from "@/data/courses/schema";

// Mock Course Data
const mockCourse: Course = {
    id: "test-course",
    title: "Test Course",
    description: "Test Description",
    version: "1.0",
    refresherYears: 3,
    modules: [
        {
            id: "m1",
            title: "Module 1",
            description: "Desc 1",
            lessons: [
                {
                    id: "l1",
                    title: "Lesson 1",
                    slides: [
                        {
                            id: "s1",
                            type: "text-graphic-split",
                            title: "Slide 1",
                        },
                        {
                            id: "s2",
                            type: "text-graphic-split",
                            title: "Slide 2",
                        },
                    ],
                },
            ],
        },
        {
            id: "m2",
            title: "Module 2",
            description: "Desc 2",
            lessons: [
                {
                    id: "l2",
                    title: "Lesson 2",
                    slides: [
                        {
                            id: "s3",
                            type: "text-graphic-split",
                            title: "Slide 3",
                        },
                    ],
                },
            ],
        },
    ],
};

describe("useCourseStore", () => {
    beforeEach(() => {
        useCourseStore.getState().resetProgress();
        useCourseStore.getState().setCourse(mockCourse);
    });

    it("should initialize with the first slide", () => {
        const state = useCourseStore.getState();
        expect(state.currentModuleId).toBe("m1");
        expect(state.currentLessonId).toBe("l1");
        expect(state.currentSlideId).toBe("s1");
    });

    it("should navigate to the next slide", () => {
        useCourseStore.getState().nextSlide();
        const state = useCourseStore.getState();
        expect(state.currentSlideId).toBe("s2");
    });

    it("should navigate across modules", () => {
        // Move to last slide of module 1
        useCourseStore.getState().navigateToSlide("m1", "l1", "s2");

        // Next should go to first slide of module 2
        useCourseStore.getState().nextSlide();

        const state = useCourseStore.getState();
        expect(state.currentModuleId).toBe("m2");
        expect(state.currentSlideId).toBe("s3");
    });

    it("should mark slides as complete", () => {
        useCourseStore.getState().markSlideComplete("s1");
        const state = useCourseStore.getState();
        expect(state.completedSlideIds).toContain("s1");
    });

    it("should mark module as complete when all slides are done", () => {
        useCourseStore.getState().markSlideComplete("s1");
        useCourseStore.getState().markSlideComplete("s2");

        const state = useCourseStore.getState();
        expect(state.completedModuleIds).toContain("m1");
    });
});
