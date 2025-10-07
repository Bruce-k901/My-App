import { render } from "@testing-library/react";
import React from "react";

describe("Dashboard admin redirect mapping", () => {
  let replaceSpy: any;

  const loadWith = async (contextVal: any) => {
    // Fresh module graph per case
    vi.resetModules();

    replaceSpy = vi.fn();
    vi.mock("next/navigation", () => ({
      useRouter: () => ({ replace: replaceSpy }),
    }));
    vi.mock("@/context/AppContext", () => ({
      useAppContext: () => contextVal,
      AppContextProvider: ({ children }: any) => children,
    }));

    const { DashboardContent } = await import("@/app/dashboard/page");
    render(<DashboardContent />);
  };

  it("routes to /setup when no companyId", async () => {
    await loadWith({ loading: false, role: "admin", companyId: null, company: null });
    expect(replaceSpy).toHaveBeenCalledWith("/setup");
  });

  it("routes new → /setup/sites", async () => {
    await loadWith({ loading: false, role: "admin", companyId: "c1", company: { setup_status: "new" } });
    expect(replaceSpy).toHaveBeenCalledWith("/setup/sites");
  });

  it("routes sites_added → /setup/team", async () => {
    await loadWith({ loading: false, role: "admin", companyId: "c1", company: { setup_status: "sites_added" } });
    expect(replaceSpy).toHaveBeenCalledWith("/setup/team");
  });

  it("routes team_added → /setup/checklists", async () => {
    await loadWith({ loading: false, role: "admin", companyId: "c1", company: { setup_status: "team_added" } });
    expect(replaceSpy).toHaveBeenCalledWith("/setup/checklists");
  });

  it("routes checklists_added → /setup/equipment", async () => {
    await loadWith({ loading: false, role: "admin", companyId: "c1", company: { setup_status: "checklists_added" } });
    expect(replaceSpy).toHaveBeenCalledWith("/setup/equipment");
  });

  it("routes equipment_added → /setup/summary", async () => {
    await loadWith({ loading: false, role: "admin", companyId: "c1", company: { setup_status: "equipment_added" } });
    expect(replaceSpy).toHaveBeenCalledWith("/setup/summary");
  });

  it("does not redirect when active", async () => {
    await loadWith({ loading: false, role: "admin", companyId: "c1", company: { setup_status: "active" } });
    expect(replaceSpy).not.toHaveBeenCalled();
  });
});