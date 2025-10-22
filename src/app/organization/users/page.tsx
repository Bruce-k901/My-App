"use client";

import { useAuth } from "@/contexts/AuthContext";
import UsersTab from "@/components/organisation/UsersTab";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";

export default function OrganizationUsersPage() {
  const { loading: authLoading } = useAuth();

  if (authLoading) return null;

  return (
    <OrgContentWrapper title="Users">
      <UsersTab />
    </OrgContentWrapper>
  );
}