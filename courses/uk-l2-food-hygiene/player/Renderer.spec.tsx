import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Renderer } from "./Renderer";
import { useAttemptStore } from "./useAttemptStore";

vi.mock("../../components/LottiePlayer", () => ({
  __esModule: true,
  default: () => <div data-testid="lottie-mock" />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

beforeEach(() => {
  useAttemptStore.setState((state) => ({
    ...state,
    scores: { modules: {}, final: undefined },
  }));
});

describe("Renderer", () => {
  it("renders content pages and allows progressing", () => {
    const setCanProceed = vi.fn();
    const setTitle = vi.fn();
    const setRightPanel = vi.fn();

    render(
      <Renderer
        page={{ id: "m1_p1", type: "content", title: "Intro", body: "Body copy" }}
        onContinue={vi.fn()}
        setCanProceed={setCanProceed}
        setTitle={setTitle}
        setRightPanel={setRightPanel}
      />
    );

    expect(screen.getByRole("heading", { name: "Intro" })).toBeInTheDocument();
    expect(setCanProceed).toHaveBeenCalledWith(true);
  });

  it("advances on correct single choice answer", () => {
    const setCanProceed = vi.fn();
    const onContinue = vi.fn();

    render(
      <Renderer
        page={{
          id: "m1_q1",
          type: "single_choice",
          stem: "Pick the correct option",
          options: ["Wrong", "Right"],
          answer: 1,
        }}
        onContinue={onContinue}
        setCanProceed={setCanProceed}
        setTitle={() => undefined}
        setRightPanel={() => undefined}
      />
    );

    fireEvent.click(screen.getByLabelText("Wrong"));
    expect(setCanProceed).toHaveBeenLastCalledWith(false);
    expect(onContinue).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Right"));
    expect(setCanProceed).toHaveBeenLastCalledWith(true);
    expect(onContinue).toHaveBeenCalled();
  });

  it("handles branch scenarios", () => {
    const setCanProceed = vi.fn();
    const onContinue = vi.fn();

    render(
      <Renderer
        page={{
          id: "m2_branch",
          type: "branch",
          title: "Scenario",
          stem: "What do you do?",
          options: [
            { label: "Guess", result: "Incorrect" },
            { label: "Check", result: "Correct" },
          ],
          correctIndex: 1,
        }}
        onContinue={onContinue}
        setCanProceed={setCanProceed}
        setTitle={() => undefined}
        setRightPanel={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Guess" }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(setCanProceed).toHaveBeenLastCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(setCanProceed).toHaveBeenLastCalledWith(true);
    expect(onContinue).toHaveBeenCalled();
  });

  it("locks completion page until requirements are met", async () => {
    useAttemptStore.setState((state) => ({
      ...state,
      scores: { modules: { m1: 90 }, final: { percent: 70, passed: false } },
    }));

    const setCanProceed = vi.fn();
    render(
      <Renderer
        page={{
          id: "cert_p1",
          type: "completion",
          title: "Completion",
          body: ["Complete all modules and the final assessment before generating your certificate."],
          requires: { modules: ["m1", "final"], minOverallPercent: 80 },
          actions: { ctaLabel: "Generate certificate" },
        }}
        onContinue={vi.fn()}
        setCanProceed={setCanProceed}
        setTitle={() => undefined}
        setRightPanel={() => undefined}
      />
    );

    expect(screen.getByRole("button", { name: /generate certificate/i })).toBeDisabled();
    expect(setCanProceed).toHaveBeenCalledWith(false);

    await act(async () => {
      useAttemptStore.setState((state) => ({
        ...state,
        scores: { modules: { m1: 90, final: 82 }, final: { percent: 82, passed: true } },
      }));
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /generate certificate/i })).not.toBeDisabled()
    );
    expect(setCanProceed).toHaveBeenCalledWith(true);
  });
});
