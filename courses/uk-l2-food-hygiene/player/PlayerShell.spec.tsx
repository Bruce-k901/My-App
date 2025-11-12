import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerShell, type ModuleBundle } from "./PlayerShell";
import type { CourseManifest } from "../schemas/course";
import { useAttemptStore } from "./useAttemptStore";
import { LAST_PAYLOAD_STORAGE_KEY, sendPayload } from "./payload";

type PayloadModule = typeof import("./payload");

vi.mock("next/navigation", () => {
  const push = vi.fn();
  const replace = vi.fn();
  const refresh = vi.fn();
  const back = vi.fn();
  const forward = vi.fn();
  const prefetch = vi.fn();

  return {
    useRouter: () => ({
      push,
      replace,
      refresh,
      back,
      forward,
      prefetch,
    }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
  };
});

vi.mock("./payload", async () => {
  const actual = await vi.importActual<PayloadModule>("./payload");
  return {
    ...actual,
    sendPayload: vi.fn().mockResolvedValue(true),
  } satisfies Partial<PayloadModule>;
});

describe("PlayerShell", () => {
  beforeEach(() => {
    useAttemptStore.getState().reset();
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("submits payload with passing final score", async () => {
    const course: CourseManifest = {
      course_id: "uk-l2-food-hygiene",
      title: "Food Hygiene",
      version: "2.0.0",
      pass_mark_percent: 70,
      modules: [{ id: "m1", title: "Module 1" }],
    };

    const moduleBundle: ModuleBundle = {
      manifest: {
        id: "m1",
        title: "Module 1",
        pages: ["m1_content", "m1_quiz", "m1_recap"],
        quiz: { pool: "m1", count: 1, pass_mark_percent: 70 },
      },
      pages: [
        { id: "m1_content", type: "content", title: "Intro", body: "Welcome" },
        { id: "m1_quiz", type: "quiz_ref", pool: "m1", count: 1 },
        { id: "m1_recap", type: "recap", bullets: ["Done"] },
      ],
      pools: {
        m1: [
          {
            id: "m1_q1",
            type: "single_choice",
            stem: "Pick correct",
            options: ["Wrong", "Right"],
            answer: 1,
          },
        ],
      },
    };

    render(<PlayerShell course={course} modules={[moduleBundle]} />);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Test Learner" } });
    fireEvent.change(screen.getByLabelText(/position/i), { target: { value: "Chef" } });
    fireEvent.change(screen.getByLabelText(/home site/i), { target: { value: "Dalston" } });
    fireEvent.click(screen.getByRole("button", { name: /start module/i }));

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    fireEvent.click(screen.getByRole("button", { name: /start quiz/i }));
    fireEvent.click(screen.getByLabelText("Right"));
    fireEvent.click(screen.getByRole("button", { name: /finish quiz/i }));

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(sendPayload).toHaveBeenCalled();
    });

    const payloadArg = vi.mocked(sendPayload).mock.calls.at(-1)?.[1] as any;
    expect(payloadArg?.scores?.final?.passed).toBe(true);
    expect(payloadArg?.metadata?.modules?.[0]?.id).toBe("m1");

    const stored = localStorage.getItem(LAST_PAYLOAD_STORAGE_KEY);
    expect(stored).toBeTruthy();
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed?.learner?.full_name).toBe("Test Learner");
    }
  });
});
