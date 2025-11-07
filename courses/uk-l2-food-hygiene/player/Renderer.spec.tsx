import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Renderer } from "./Renderer";

const noop = () => undefined;

describe("Renderer", () => {
  it("renders content pages and allows progressing", () => {
    const setCanProceed = vi.fn();
    const setTitle = vi.fn();
    const setRightPanel = vi.fn();

    render(
      <Renderer
        page={{ id: "m1_p1", type: "content", title: "Intro", body: "Body copy" }}
        onContinue={noop}
        setCanProceed={setCanProceed}
        setTitle={setTitle}
        setRightPanel={setRightPanel}
      />
    );

    expect(screen.getByRole("heading", { name: "Intro" })).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(button);
    expect(setCanProceed).toHaveBeenCalledWith(true);
  });
});
