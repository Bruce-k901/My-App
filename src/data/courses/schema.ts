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
    version: string;
    refresherYears?: number;
    certificateTemplateId?: string;
    modules: Module[];
    questionBanks?: Record<string, Question[]>;
}
