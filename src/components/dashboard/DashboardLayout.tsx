"use client";

import React from "react";
import RoleHeader from "./RoleHeader";
import SetupBanner from "@/components/setup/SetupBanner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-white">
      <RoleHeader />
      <SetupBanner />
      <main className="flex-1">{children}</main>
    </div>
  );
}