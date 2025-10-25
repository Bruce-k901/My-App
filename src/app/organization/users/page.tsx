"use client";

import { useAppContext } from "@/context/AppContext";
import UsersTab from "@/components/organization/UsersTab";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";

export default function OrganizationUsersPage() {
  // === ALL HOOKS MUST BE CALLED UNCONDITIONALLY ===
  
  // 1. Context hooks
  const { loading: authLoading } = useAppContext();

  // 2. Early returns ONLY AFTER all hooks
  if (authLoading) return null;

  return (
    <OrgContentWrapper title="Users">
      <UsersTab />
    </OrgContentWrapper>
  );
}