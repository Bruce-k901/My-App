"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import SetupHeader from "./SetupHeader";
import { useAppContext } from "@/context/AppContext";
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
  const { company } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    // Retire setup pages: always redirect away.
    // If a company exists, send to dashboard; otherwise send to signup.
    if (company?.id) {
      router.replace("/dashboard");
    } else {
      router.replace("/signup");
    }
  }, [company?.id, router]);
  return (
    <div className="min-h-screen bg-neutral-950 text-theme-primary">
      <header className="px-6 py-3 bg-white dark:bg-[#0f1220]">
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
  );
}
