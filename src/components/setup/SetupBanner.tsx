"use client";

import Link from "next/link";
import { useAppContext } from "@/context/AppContext";

export default function SetupBanner() {
  const { requiresSetup, role } = useAppContext();
  if (!requiresSetup) return null;
  return (
    <div className="bg-[#141823] border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-6 py-3 text-sm text-slate-300 flex items-center justify-between">
        <p>
          Getting started checklist available. You can add sites, invite your team, and import templates.
        </p>
        <Link href="/setup" className="btn-gradient text-xs">
          Open Checklist
        </Link>
      </div>
    </div>
  );
}