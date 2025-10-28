import React from "react";
import { HeaderLayout } from "@/components/layout/HeaderLayout";
import OrgPageTransition from "@/components/organization/OrgPageTransition";

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  return (
    <HeaderLayout userRole="admin">
      {/* Page content */}
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <OrgPageTransition>{children}</OrgPageTransition>
      </div>
    </HeaderLayout>
  );
}