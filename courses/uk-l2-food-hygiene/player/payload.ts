export type LearnerInfo = {
  full_name: string;
  position: string;
  home_site: string;
};

export type PayloadScores = {
  modules: Record<string, number>;
  final?: { percent: number; passed: boolean };
};

export type ModuleOutcomeDefinition = {
  id: string;
  statement: string;
};

export type ModuleOutcomeMapping = {
  page_id?: string;
  quiz_id?: string;
  outcome_id: string;
};

export type ModuleOutcomeBundle = {
  outcomes: ModuleOutcomeDefinition[];
  mapping?: ModuleOutcomeMapping[];
};

export type ModuleBlueprintCoverage = {
  topic: string;
  min: number;
  max: number;
};

export type ModuleBlueprint = {
  course_id: string;
  module_id: string;
  pool: string;
  target_count: number;
  coverage: ModuleBlueprintCoverage[];
  difficulty_split?: Partial<{
    easy: number;
    medium: number;
    hard: number;
  }>;
};

export type ModuleMeta = {
  id: string;
  title: string;
  outcomes?: ModuleOutcomeBundle;
  blueprint?: ModuleBlueprint;
  content?: unknown;
};

export type BuildPayloadArgs = {
  courseId: string;
  learner: LearnerInfo;
  start: string;
  scores: PayloadScores;
  userAgent?: string;
  moduleMeta?: ModuleMeta[];
};

export const LAST_PAYLOAD_STORAGE_KEY = "selfstudy:l2-food-hygiene:last-payload";

export function buildPayload({ courseId, learner, start, scores, userAgent = "client", moduleMeta = [] }: BuildPayloadArgs) {
  return {
    course_id: courseId,
    learner,
    attempt: {
      started_at: start,
      completed_at: new Date().toISOString(),
      duration_sec: 0,
    },
    scores,
    metadata: {
      modules: moduleMeta,
    },
    audit: {
      user_agent: userAgent,
      ip_hash: "test",
    },
  };
}

export async function sendPayload(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`payload post failed (${response.status})`);
  }

  return true;
}
