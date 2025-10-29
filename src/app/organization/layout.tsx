import React from "react";
import { HeaderLayout } from "@/components/layout/HeaderLayout";

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  return (
    <HeaderLayout userRole="admin">
      {/* Page content - no more sub-header */}
      <div className="px-6 py-6 max-w-7xl mx-auto">
        {children}
      </div>
    </HeaderLayout>
  );
}