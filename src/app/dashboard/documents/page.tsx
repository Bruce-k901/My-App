"use client";

import { Suspense } from "react";
import { useAppContext } from "@/context/AppContext";
import DocumentsPoliciesSection from "@/components/organisation/DocumentsPoliciesSection";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";

export default function OrganizationDocumentsPage() {
  // === ALL HOOKS MUST BE CALLED UNCONDITIONALLY ===
  
  // 1. Context hooks
  const { loading: authLoading, companyId } = useAppContext();

  // 2. Early returns ONLY AFTER all hooks
  if (authLoading) return <div className="p-8 text-theme-tertiary">Loading...</div>;

  if (!companyId) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
            Company Setup Required
          </h2>
          <p className="text-theme-secondary mb-4">
            Please complete your company setup to access this page.
          </p>
          <a
            href="/dashboard/business"
            className="inline-block px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-[0_0_12px_rgba(var(--module-fg),0.7)] rounded-lg transition-all duration-200"
          >
            Complete Setup
          </a>
        </div>
      </div>
    );
  }

  return (
    <OrgContentWrapper title="Documents & Policies">
      <Suspense fallback={<div className="text-theme-tertiary text-center py-8">Loading...</div>}>
        <DocumentsPoliciesSection />
      </Suspense>
    </OrgContentWrapper>
  );
}