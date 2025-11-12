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

describe("Final module content", () => {
  it("manifest validates", () => {
    const manifest = loadJson("module.json");
    const parsed = safeParseOrThrow(moduleManifestSchema, manifest, "final module manifest");
    expect(parsed.id).toBe("final");
    expect(parsed.pages.length).toBe(3);
  });

  it("pages validate and include quiz", () => {
    const pages = loadJson("pages.json");
    const parsed = safeParseOrThrow(pagesSchema, pages, "final module pages");
    expect(parsed[1]?.type).toBe("quiz_ref");
    expect(parsed.at(-1)?.type).toBe("content");
  });

  it("quiz pool validates", () => {
    const quiz = loadJson("quiz.json");
    const parsed = safeParseOrThrow(quizSchema, quiz, "final module quiz");
    expect(parsed.pool_id).toBe("final");
    expect(parsed.items.length).toBe(15);
  });

  it("outcomes mapping validates", () => {
    const outcomes = loadJson("outcomes.json");
    const parsed = safeParseOrThrow(outcomesMappingSchema, outcomes, "final module outcomes");
    expect(parsed.outcomes.length).toBeGreaterThan(0);
    expect(parsed.mapping?.length).toBeGreaterThan(0);
  });
});
