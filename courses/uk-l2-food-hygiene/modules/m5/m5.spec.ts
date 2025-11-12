import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { moduleManifestSchema } from "../../schemas/module";
import { pagesSchema } from "../../schemas/page";
import { quizSchema } from "../../schemas/quiz";
import { outcomesMappingSchema } from "../../schemas/outcomes";
import { safeParseOrThrow } from "../../schemas/validate";

const baseDir = path.resolve(__dirname);

function loadJson<T>(relative: string): T {
  const file = path.join(baseDir, relative);
  const raw = fs.readFileSync(file, "utf-8");
  return JSON.parse(raw) as T;
}

describe("Module m5 content", () => {
  it("module manifest validates", () => {
    const manifest = loadJson("module.json");
    const parsed = safeParseOrThrow(moduleManifestSchema, manifest, "module m5 manifest");
    expect(parsed.id).toBe("m5");
    expect(parsed.pages.length).toBe(9);
  });

  it("pages validate and include hotspot/branch", () => {
    const pages = loadJson("pages.json");
    const parsed = safeParseOrThrow(pagesSchema, pages, "module m5 pages");
    expect(parsed.some((page) => page.type === "hotspot")).toBe(true);
    expect(parsed.some((page) => page.type === "branch")).toBe(true);
    expect(parsed.at(-1)?.type).toBe("quiz_ref");
  });

  it("quiz pool validates", () => {
    const quiz = loadJson("quiz.json");
    const parsed = safeParseOrThrow(quizSchema, quiz, "module m5 quiz");
    expect(parsed.pool_id).toBe("m5");
    expect(parsed.items.length).toBe(6);
  });

  it("outcomes mapping validates", () => {
    const outcomes = loadJson("outcomes.json");
    const parsed = safeParseOrThrow(outcomesMappingSchema, outcomes, "module m5 outcomes");
    expect(parsed.outcomes.length).toBeGreaterThan(0);
    expect(parsed.mapping?.length).toBeGreaterThan(0);
  });
});
