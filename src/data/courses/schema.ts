export type CourseCategory =
    | "food-hygiene"
    | "workplace-safety"
    | "compliance"
    | "people";

export interface Question {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number;
}

export interface Slide {
    id: string;
    type: "text-graphic-split" | "scenario-decision" | "quiz";
    title: string;
    content?: string; // Markdown content
    mediaUrl?: string;
    keyTakeaway?: string; // Bold callout shown at bottom of slide
    scenarioData?: {
        initialState: string;
        nodes: Record<string, {
            text: string;
            options: { label: string; nextNodeId: string }[];
        }>;
    };
}

export interface Lesson {
    id: string;
    title: string;
    slides: Slide[];
}

export interface Module {
    id: string;
    title: string;
    description: string;
    lessons: Lesson[];
}

export interface Course {
    id: string;
    title: string;
    description: string;
    shortDescription?: string;
    version: string;
    refresherYears?: number;
    certificateTemplateId?: string;
    category?: CourseCategory;
    level?: string;
    estimatedMinutes?: number;
    icon?: string;
    heroImage?: string;
    tags?: string[];
    learningOutcomes?: string[];
    prerequisite?: string;
    modules: Module[];
    questionBanks?: Record<string, Question[]>;
}
