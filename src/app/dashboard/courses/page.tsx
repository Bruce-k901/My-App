import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";
import CoursesPageClient from "./CoursesPageClient";

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function CoursesPage() {
  return (
    <OrgContentWrapper title="Courses">
      <CoursesPageClient />
    </OrgContentWrapper>
  );
}
