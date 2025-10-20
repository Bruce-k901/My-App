import DocumentsPoliciesSection from "@/components/organisation/DocumentsPoliciesSection";
import EntityPageLayout from "@/components/layouts/EntityPageLayout";

export default function OrganizationDocumentsPage() {
  return (
    <EntityPageLayout title="Documents/Policies" searchPlaceholder="Search">
      <DocumentsPoliciesSection />
    </EntityPageLayout>
  );
}