import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { moduleManifestSchema } from "../../schemas/module";
import { pagesSchema } from "../../schemas/page";
import { safeParseOrThrow } from "../../schemas/validate";

const baseDir = path.resolve(__dirname);

function loadJson<T>(relative: string): T {
  const file = path.join(baseDir, relative);
  const raw = fs.readFileSync(file, "utf-8");
  return JSON.parse(raw) as T;
}

describe("Certification module content", () => {
  it("manifest validates", () => {
    const manifest = loadJson("module.json");
    const parsed = safeParseOrThrow(moduleManifestSchema, manifest, "certification module manifest");
    expect(parsed.id).toBe("certification");
    expect(parsed.pages.length).toBe(2);
  });

  it("pages validate and include completion", () => {
    const pages = loadJson("pages.json");
    const parsed = safeParseOrThrow(pagesSchema, pages, "certification module pages");
    expect(parsed[0]?.type).toBe("completion");
    expect(parsed[1]?.type).toBe("content");
  });
});
