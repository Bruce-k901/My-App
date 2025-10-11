import BusinessDetailsTab from "@/components/organisation/BusinessDetailsTab";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";

export default function OrganizationBusinessPage() {
  return (
    <OrgContentWrapper title="Business Details">
      <BusinessDetailsTab />
    </OrgContentWrapper>
  );
}