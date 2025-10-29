"use client";

import { useAppContext } from "@/context/AppContext";
import DocumentsPoliciesSection from "@/components/organisation/DocumentsPoliciesSection";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";

export default function OrganizationDocumentsPage() {
  // === ALL HOOKS MUST BE CALLED UNCONDITIONALLY ===
  
  // 1. Context hooks
  const { loading: authLoading } = useAppContext();

  // 2. Early returns ONLY AFTER all hooks
  if (authLoading) return null;

  return (
    <OrgContentWrapper title="Documents & Policies">
      <DocumentsPoliciesSection />
    </OrgContentWrapper>
  );
}