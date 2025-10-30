"use client";

import { useAppContext } from "@/context/AppContext";
import UsersTab from "@/components/organization/UsersTab";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";

export default function OrganizationUsersPage() {
  // === ALL HOOKS MUST BE CALLED UNCONDITIONALLY ===
  
  // 1. Context hooks
  const { loading: authLoading, companyId } = useAppContext();

  // 2. Early returns ONLY AFTER all hooks
  if (authLoading) return <div className="text-slate-400">Loading users…</div>;
  if (!companyId) {
    return (
      <OrgContentWrapper title="Users">
        <div className="rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-3 text-sm text-slate-300">
          No company context detected. Go to Business Details to complete setup.
        </div>
      </OrgContentWrapper>
    );
  }

  return (
    <OrgContentWrapper title="Users">
      <UsersTab />
    </OrgContentWrapper>
  );
}