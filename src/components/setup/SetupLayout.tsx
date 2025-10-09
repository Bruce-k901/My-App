"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import SetupHeader from "./SetupHeader";
import { useAppContext } from "@/context/AppContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { useRouter } from "next/navigation";

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
    <div className="w-full h-[6px] rounded">
      <div className="h-[6px] bg-gradient-to-r from-magenta-400 to-blue-400 rounded" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function SetupLayout({ children, stepLabel, activeStep }: { children: React.ReactNode; stepLabel?: string; activeStep?: string }) {
  const { company, role } = useAppContext();
  const router = useRouter();

  // Auto-redirect: if a company exists and at least one site is present,
  // send the user straight to the dashboard to continue managing.
  useEffect(() => {
    if (!company?.id) return;
    // Send users straight to the dashboard once a company exists
    router.replace("/dashboard");
  }, [company?.id, router]);
  return (
    <ToastProvider>
      <div className="min-h-screen bg-neutral-950 text-white">
        <header className="px-6 py-3 bg-[#0f1220]">
          <div className="max-w-5xl mx-auto">
            <SetupHeader />
          </div>
        </header>
        <main className="px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <div className="mb-3 flex flex-col items-center text-center">
              {company?.name && (
                <h1 className="text-2xl font-semibold">{company.name}</h1>
              )}
              <div className="mt-3 w-full max-w-md">
                <ProgressBar status={company?.setup_status} />
              </div>
            </div>
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
