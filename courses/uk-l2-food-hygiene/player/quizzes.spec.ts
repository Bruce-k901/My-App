import { describe, expect, it } from "vitest";
import type { Page } from "../schemas/page";
import { sliceQuiz } from "./quizzes";

describe("sliceQuiz", () => {
  const sample: Page[] = Array.from({ length: 5 }).map((_, index) => ({
    id: `q${index}`,
    type: "single_choice",
    stem: "stem",
    options: ["a", "b"],
    answer: 0,
  }));

  it("returns empty when pool missing", () => {
    expect(sliceQuiz(undefined, 3)).toEqual([]);
  });

  it("respects count and pool size", () => {
    const result = sliceQuiz(sample, 2);
    expect(result).toHaveLength(2);
    const resultLarge = sliceQuiz(sample, 20);
    expect(resultLarge).toHaveLength(5);
  });
});
