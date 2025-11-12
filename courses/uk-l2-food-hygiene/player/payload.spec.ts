import { describe, expect, it, vi } from "vitest";
import { buildPayload, sendPayload } from "./payload";

describe("payload", () => {
  it("builds shape", () => {
    const payload = buildPayload({
      courseId: "uk-l2-food-hygiene",
      learner: { full_name: "Test", position: "Chef", home_site: "Dalston" },
      start: "2025-01-01T00:00:00Z",
      scores: { modules: { m1: 80 }, final: { percent: 86, passed: true } },
      moduleMeta: [
        {
          id: "m1",
          title: "Module 1",
          outcomes: {
            outcomes: [{ id: "L2-2.1", statement: "Sample" }],
          },
        },
      ],
    });

    expect(payload.course_id).toBe("uk-l2-food-hygiene");
    expect(payload.scores.final?.passed).toBe(true);
    expect(payload.metadata.modules[0].id).toBe("m1");
  });

  it("posts", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch" as any).mockResolvedValue({ ok: true } as Response);
    await sendPayload("/api/training-matrix/ingest", { course_id: "uk" });
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("throws on non-OK", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch" as any).mockResolvedValue({ ok: false, status: 500 } as Response);
    await expect(sendPayload("/x", {})).rejects.toThrow();
    fetchSpy.mockRestore();
  });
});
