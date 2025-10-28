"use client";

import { useAppContext } from "@/context/AppContext";
import BusinessDetailsTab from "@/components/organisation/BusinessDetailsTab";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";

export default function OrganizationBusinessPage() {
  // === ALL HOOKS MUST BE CALLED UNCONDITIONALLY ===
  
  // 1. Context hooks
  const { loading: authLoading } = useAppContext();

  // 2. Early returns ONLY AFTER all hooks
  if (authLoading) return null;

  return (
    <OrgContentWrapper title="">
      <BusinessDetailsTab />
    </OrgContentWrapper>
  );
}