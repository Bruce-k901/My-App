import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Reorder } from "../../uk-l2-food-hygiene/components/Reorder";

describe("Reorder", () => {
  it("detects incorrect order and success after correction", () => {
    const steps = ["Clean", "Disinfect", "Dry"];
    const onDone = vi.fn();

    render(<Reorder steps={steps} prompt="Sequence" onDone={onDone} />);

    fireEvent.click(screen.getByLabelText(/move clean down/i));
    fireEvent.click(screen.getByRole("button", { name: /check order/i }));
    expect(onDone).toHaveBeenLastCalledWith(false);

    fireEvent.click(screen.getByLabelText(/move clean up/i));
    fireEvent.click(screen.getByRole("button", { name: /check order/i }));
    expect(onDone).toHaveBeenLastCalledWith(true);
  });
});
