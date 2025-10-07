import { render, screen } from "@testing-library/react";
import React from "react";
import SetupBanner from "@/components/setup/SetupBanner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

// Helper to mock the app context hook
function mockContext(val: any) {
  vi.mock("@/context/AppContext", () => ({
    useAppContext: () => val,
  }));
}

describe("SetupBanner visibility", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("shows when requiresSetup is true", async () => {
    mockContext({ requiresSetup: true, role: "admin" });
    render(<SetupBanner />);
    expect(
      await screen.findByText(/Company setup incomplete/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go to Setup/i })).toHaveAttribute("href", "/setup");
  });

  it("hides when requiresSetup is false", async () => {
    mockContext({ requiresSetup: false, role: "admin" });
    render(<SetupBanner />);
    expect(screen.queryByText(/Company setup incomplete/i)).toBeNull();
  });
});

describe("Dashboard layout renders banner", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("includes banner when setup required", async () => {
    mockContext({ requiresSetup: true, role: "admin" });
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );
    expect(
      await screen.findByText(/Company setup incomplete/i)
    ).toBeInTheDocument();
  });

  it("omits banner when setup complete", async () => {
    mockContext({ requiresSetup: false, role: "admin" });
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );
    expect(screen.queryByText(/Company setup incomplete/i)).toBeNull();
  });
});