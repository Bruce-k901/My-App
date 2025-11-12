import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { moduleManifestSchema } from "../../schemas/module";
import { pagesSchema } from "../../schemas/page";
import { quizFileSchema } from "../../schemas/quiz";
import { outcomesSchema } from "../../schemas/outcomes";
import { blueprintSchema } from "../../schemas/blueprint";
import { safeParseOrThrow } from "../../schemas/validate";

const baseDir = path.resolve(__dirname);

function loadJson<T>(relative: string): T {
  const file = path.join(baseDir, relative);
  const raw = fs.readFileSync(file, "utf-8");
  return JSON.parse(raw) as T;
}

describe("Module m2 content", () => {
  it("module manifest validates", () => {
    const moduleManifest = loadJson("module.json");
    const parsed = safeParseOrThrow(moduleManifestSchema, moduleManifest, "module m2 manifest");
    expect(parsed.id).toBe("m2");
    expect(parsed.pages.length).toBeGreaterThan(0);
  });

  it("pages validate and include branch scenario", () => {
    const pages = loadJson("pages.json");
    const parsed = safeParseOrThrow(pagesSchema, pages, "module m2 pages");
    expect(parsed.some((page) => page.type === "branch")).toBe(true);
    expect(parsed.find((page) => page.id === "m2_quiz_ref")?.type).toBe("quiz_ref");
  });

  it("quiz pool validates", () => {
    const quizFile = loadJson("quiz.json");
    const parsed = safeParseOrThrow(quizFileSchema, quizFile, "module m2 quiz");
    expect(parsed.items.length).toBeGreaterThan(0);
  });

  it("outcomes mapping validates", () => {
    const outcomes = loadJson("outcomes.json");
    const parsed = safeParseOrThrow(outcomesSchema, outcomes, "module m2 outcomes");
    expect(parsed.outcomes.length).toBeGreaterThan(0);
  });

  it("assessment blueprint validates", () => {
    const blueprint = loadJson("blueprint.json");
    const parsed = safeParseOrThrow(blueprintSchema, blueprint, "module m2 blueprint");
    expect(parsed.target_count).toBeGreaterThan(0);
  });
});
