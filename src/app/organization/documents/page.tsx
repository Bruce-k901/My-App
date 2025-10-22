"use client";

import { useAuth } from "@/contexts/AuthContext";
import DocumentsPoliciesSection from "@/components/organisation/DocumentsPoliciesSection";
import EntityPageLayout from "@/components/layouts/EntityPageLayout";

export default function OrganizationDocumentsPage() {
  const { loading: authLoading } = useAuth();

  if (authLoading) return null;

  return (
    <EntityPageLayout title="Documents/Policies" searchPlaceholder="Search">
      <DocumentsPoliciesSection />
    </EntityPageLayout>
  );
}