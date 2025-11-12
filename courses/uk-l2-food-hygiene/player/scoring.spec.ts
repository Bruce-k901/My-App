import { describe, expect, it } from "vitest";
import { scoreMulti, scoreSingle } from "./scoring";

describe("scoring", () => {
  it("scores single choice", () => {
    expect(scoreSingle(2, 2)).toBe(1);
    expect(scoreSingle(1, 2)).toBe(0);
  });

  it("scores multi choice unordered", () => {
    expect(scoreMulti([1, 3], [3, 1])).toBe(1);
    expect(scoreMulti([1, 3], [1])).toBe(0);
    expect(scoreMulti([1, 3], [1, 2, 3])).toBe(0);
  });
});
