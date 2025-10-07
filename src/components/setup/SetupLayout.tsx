"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";
import { ToastProvider } from "@/components/ui/ToastProvider";

function ProgressBar({ status }: { status: string | null | undefined }) {
  const order = [
    "new",
    "company_created",
    "sites_added",
    "sites_defaults_created",
    "team_added",
    "checklists_validated",
    "checklists_added",
    "equipment_validated",
    "equipment_added",
    "summary_reviewed",
    "active",
  ];
  const index = status ? order.indexOf(status) : 0;
  const pct = index < 0 ? 0 : (index / (order.length - 1)) * 100;
  return (
    <div className="w-full h-2 bg-neutral-800 rounded">
      <div className="h-2 bg-gradient-to-r from-magenta-400 to-blue-400 rounded" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function SetupLayout({ children, stepLabel }: { children: React.ReactNode; stepLabel?: string }) {
  const { company } = useAppContext();
  return (
    <ToastProvider>
      <div className="min-h-screen bg-neutral-950 text-white">
        <header className="px-6 py-6 border-b border-neutral-800 bg-[#0f1220]">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">{company?.name ?? "Company Setup"}</h1>
                {stepLabel && <p className="text-xs text-slate-400 mt-1">{stepLabel}</p>}
              </div>
            </div>
            <div className="mt-4">
              <ProgressBar status={company?.setup_status} />
            </div>
          </div>
        </header>
        <main className="px-6 py-8">
          <div className="max-w-5xl mx-auto">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}