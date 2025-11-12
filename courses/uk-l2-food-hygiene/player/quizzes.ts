import type { Page } from "../schemas/page";

export type QuizPools = Record<string, Page[]>;

export function sliceQuiz(pool: Page[] | undefined, count: number): Page[] {
  if (!pool || pool.length === 0) {
    return [];
  }
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, pool.length));
}
