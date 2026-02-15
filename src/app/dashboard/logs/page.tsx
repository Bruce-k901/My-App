"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, Thermometer, Calendar, FileText } from "@/components/ui/icons";

const logTabs = [
  {
    key: "temperature",
    label: "Temperature Logs",
    href: "/dashboard/logs/temperature",
    icon: Thermometer,
    description: "Monitor temperature readings and compliance",
  },
  {
    key: "attendance",
    label: "Attendance Register",
    href: "/dashboard/logs/attendance",
    icon: Calendar,
    description: "View clock-in and clock-out records",
  },
  // Future tabs can be added here:
  // {
  //   key: "probe-calibrations",
  //   label: "Probe Calibrations",
  //   href: "/dashboard/logs/probe-calibrations",
  //   icon: FileText,
  //   description: "Temperature probe calibration records",
  // },
];

export default function LogsHubPage() {
  const pathname = usePathname();
  const router = useRouter();

  // Determine active tab based on current path
  const activeTab = logTabs.find((tab) => pathname.startsWith(tab.href))?.key || "temperature";

  return (
    <div className="min-h-screen bg-[rgb(var(--surface-elevated))]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8 text-module-fg" />
            <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary">Logs</h1>
          </div>
          <p className="text-theme-tertiary text-sm sm:text-base">
            Central hub for all monitoring and compliance logs
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 mb-6">
          <div className="flex flex-wrap gap-2">
            {logTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-transparent text-module-fg border border-module-fg shadow-[0_0_12px_rgba(var(--module-fg),0.7)]"
                      : "bg-transparent border border-white/[0.1] text-theme-secondary hover:border-white/[0.2] hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {logTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:border-module-fg/[0.30] hover:shadow-[0_0_12px_rgba(var(--module-fg),0.2)] transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-module-fg/[0.10] rounded-lg group-hover:bg-module-fg/[0.20] transition-colors">
                    <Icon className="w-5 h-5 text-module-fg" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-theme-primary mb-1">{tab.label}</h3>
                <p className="text-theme-tertiary text-sm">{tab.description}</p>
                <div className="mt-4 text-module-fg text-sm font-medium group-hover:underline">
                  View logs →
                </div>
              </Link>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-module-fg flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-theme-primary mb-2">About Logs</h3>
              <p className="text-theme-tertiary text-sm leading-relaxed">
                The Logs section provides a centralized view of all monitoring activities across your
                organization. Use the tabs above to navigate between different log types, or click on
                the cards to access specific log views. All logs are automatically updated in real-time
                and can be exported for compliance reporting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

