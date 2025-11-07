import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { moduleManifestSchema } from "../../schemas/module";
import { pagesSchema } from "../../schemas/page";
import { safeParseOrThrow } from "../../schemas/validate";

const baseDir = path.resolve(__dirname);

function loadJson<T>(relative: string): T {
  const file = path.join(baseDir, relative);
  const raw = fs.readFileSync(file, "utf-8");
  return JSON.parse(raw) as T;
}

describe("Module m1 content", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });

  it("module manifest passes schema validation", () => {
    const moduleManifest = loadJson("module.json");
    const parsed = safeParseOrThrow(moduleManifestSchema, moduleManifest, "module m1 manifest");
    expect(parsed.id).toBe("m1");
    expect(parsed.pages.length).toBeGreaterThan(0);
  });

  it("pages validate and quiz precedes completion", () => {
    const pages = loadJson("pages.json");
    const parsed = safeParseOrThrow(pagesSchema, pages, "module m1 pages");
    const quizIndex = parsed.findIndex((page) => page.id === "m1_quiz_ref");
    const completionIndex = parsed.findIndex((page) => page.id === "m1_complete");
    expect(quizIndex).toBeGreaterThan(-1);
    expect(completionIndex).toBeGreaterThan(quizIndex);
  });
});
