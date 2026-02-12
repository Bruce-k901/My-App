"use client";

import Link from "next/link";
import { useAppContext } from "@/context/AppContext";

export default function SetupBanner() {
  const { requiresSetup, role } = useAppContext();
  if (!requiresSetup) return null;
  return (
    <div className="bg-[#141823] border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-6 py-3 text-sm text-theme-secondary flex items-center justify-between">
        <p>
          You can add sites, invite your team, and import templates from the dashboard.
        </p>
        <Link href="/dashboard" className="btn-gradient text-xs">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}