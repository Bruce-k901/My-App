import { describe, expect, it } from "vitest";
import { moduleSchema, pagesSchema } from "../../schemas/zod";
import moduleJson from "./module.json" assert { type: "json" };
import pagesJson from "./pages.json" assert { type: "json" };

describe("schemas", () => {
  it("valid module", () => {
    expect(() => moduleSchema.parse(moduleJson)).not.toThrow();
  });

  it("rejects missing page id", () => {
    const broken = structuredClone(pagesJson);
    broken[0].id = "";
    expect(() => pagesSchema.parse(broken)).toThrow();
  });
});
