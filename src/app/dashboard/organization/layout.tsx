import React from "react";
import OrgPageTransition from "@/components/organization/OrgPageTransition";

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col w-full">
      <main>
        <OrgPageTransition>{children}</OrgPageTransition>
      </main>
    </div>
  );
}