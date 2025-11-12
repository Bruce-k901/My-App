import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DragDrop } from "../../uk-l2-food-hygiene/components/DragDrop";

describe("DragDrop", () => {
  it("requires correct matches before passing", () => {
    const pairs: [string, string][] = [
      ["Raw chicken", "Raw"],
      ["Cooked beef", "Ready"],
    ];
    const onDone = vi.fn();

    render(<DragDrop pairs={pairs} prompt="Sort foods" onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: /check matches/i }));
    expect(onDone).toHaveBeenLastCalledWith(false);

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "Raw" } });
    fireEvent.change(selects[1], { target: { value: "Ready" } });

    fireEvent.click(screen.getByRole("button", { name: /check matches/i }));
    expect(onDone).toHaveBeenLastCalledWith(true);
  });
});
