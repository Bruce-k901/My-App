import { render, screen, fireEvent } from "@testing-library/react";
import ResetPasswordPage from "@/app/reset-password/page";
import React from "react";

// Mock next/navigation router
vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  };
});

// Capture router for assertions
const useRouter = require("next/navigation").useRouter as () => {
  replace: (url: string) => void;
  push: (url: string) => void;
};

// Mock Supabase client
const updateUser = vi.fn(async () => ({ error: null }));
vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      auth: {
        onAuthStateChange: (cb: (event: string) => void) => {
          // Immediately simulate landing from recovery email
          cb("PASSWORD_RECOVERY");
          return { data: { subscription: { unsubscribe: () => {} } } } as any;
        },
        getSession: async () => ({ data: { session: null } }),
        updateUser,
      },
    },
  };
});

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    updateUser.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders the form", () => {
    render(<ResetPasswordPage />);
    expect(
      screen.getByText(/Set a new password/i)
    ).toBeInTheDocument();
  });

  it("validates mismatched passwords", async () => {
    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByPlaceholderText(/Choose a strong password/i), {
      target: { value: "abc123!" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Re-enter your password/i), {
      target: { value: "different" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Update password/i }));
    expect(
      await screen.findByText(/Passwords do not match/i)
    ).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("updates password and redirects to dashboard", async () => {
    const router = useRouter();
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText(/Choose a strong password/i), {
      target: { value: "NewP@ssw0rd" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Re-enter your password/i), {
      target: { value: "NewP@ssw0rd" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Update password/i }));
    expect(updateUser).toHaveBeenCalledWith({ password: "NewP@ssw0rd" });

    // Success message and auto-redirect
    expect(
      await screen.findByText(/Redirecting to your dashboard…/i)
    ).toBeInTheDocument();

    // Advance timers to trigger redirect
    vi.runAllTimers();
    expect(router.replace).toHaveBeenCalledWith("/dashboard");
  });
});