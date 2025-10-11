import React from "react";
import OrgSubHeader from "@/components/organization/OrgSubHeader";
import OrgPageTransition from "@/components/organization/OrgPageTransition";

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col w-full">
      <div className="sticky top-0 z-10 bg-[#0b0f1a] py-4 px-6 border-b border-gray-800/40">
        <OrgSubHeader />
      </div>
      <main>
        <OrgPageTransition>{children}</OrgPageTransition>
      </main>
    </div>
  );
}