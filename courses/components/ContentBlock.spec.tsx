import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

function ContentBlock({ title }: { title: string }) {
  return <h2>{title}</h2>;
}

describe("ContentBlock", () => {
  it("renders", () => {
    render(<ContentBlock title="Hello" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
