"use client";

import { useAppContext } from "@/context/AppContext";
import DocumentsPoliciesSection from "@/components/organisation/DocumentsPoliciesSection";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";

export default function OrganizationDocumentsPage() {
  // === ALL HOOKS MUST BE CALLED UNCONDITIONALLY ===
  
  // 1. Context hooks
  const { loading: authLoading, companyId } = useAppContext();

  // 2. Early returns ONLY AFTER all hooks
  if (authLoading) return <div className="p-8 text-white">Loading...</div>;

  if (!companyId) {
    return (
      <div className="p-8">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">
            Company Setup Required
          </h2>
          <p className="text-white/80 mb-4">
            Please complete your company setup to access this page.
          </p>
          <a 
            href="/dashboard/business" 
            className="inline-block px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg"
          >
            Complete Setup
          </a>
        </div>
      </div>
    );
  }

  return (
    <OrgContentWrapper title="Documents & Policies">
      <DocumentsPoliciesSection />
    </OrgContentWrapper>
  );
}