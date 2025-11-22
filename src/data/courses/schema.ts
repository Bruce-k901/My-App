export type SlideType =
    | "text-graphic-split"
    | "video-interactive"
    | "quiz-scenario"
    | "drag-sort"
    | "hotspot-explorer"
    | "scenario-decision"
    | "quiz"
    | "certificate-download";

export interface Slide {
    id: string;
    type: SlideType;
    title: string;
    content?: string; // Markdown supported
    mediaUrl?: string;
    // Specific props for different slide types
    quizData?: {
        // For quiz-scenario (single question)
        question?: string;
        options?: {
            id: string;
            label: string;
            isCorrect: boolean;
            feedback: string;
        }[];
        // For quiz (final assessment)
        questionCount?: number;
        passPercentage?: number;
        randomize?: boolean;
        questionBankId?: string;
    };
    hotspotData?: {
        imageUrl: string;
        hotspots: {
            id: string;
            x: number;
            y: number;
            label: string;
            description: string;
        }[];
    };
    dragSortData?: {
        items: { id: string; label: string; categoryId: string }[];
        categories: { id: string; label: string }[];
    };
    scenarioData?: {
        initialState: string;
        nodes: Record<
            string,
            { text: string; options: { label: string; nextNodeId: string }[] }
        >;
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
    version: string;
    modules: Module[];
    certificateTemplateId?: string;
    refresherYears: number;
}
