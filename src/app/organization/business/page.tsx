"use client";

import { useAuth } from "@/contexts/AuthContext";
import BusinessDetailsTab from "@/components/organisation/BusinessDetailsTab";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";

export default function OrganizationBusinessPage() {
  const { loading: authLoading } = useAuth();

  if (authLoading) return null;

  return (
    <OrgContentWrapper title="Business Details">
      <BusinessDetailsTab />
    </OrgContentWrapper>
  );
}