"use client";

import {
  Bell,
  AlertTriangle,
  ClipboardX,
  FileText,
  CheckCircle2,
  BarChart3,
  Database,
  Activity,
} from "lucide-react";
import Link from "next/link";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function AlertsReportingPage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-10 bg-[#0b0d13]">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-magenta-400 mr-3" />
            <h1 className="pt-1 pb-1 leading-tight text-4xl md:text-5xl font-bold bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
              Alerts & Reporting
            </h1>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-base">
            Stay ahead of issues before they turn into downtime, complaints, or waste. Checkly gives
            real-time alerts and clear, actionable reports so your team can fix problems fast and
            prove performance with ease.
          </p>
        </div>
      </section>

      {/* PITFALLS */}
      <section className="bg-[#0b0d13] py-8 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">
            Common Alert & Reporting Pitfalls
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: AlertTriangle,
                title: "No Early Warnings",
                text: "Equipment or safety issues go unnoticed until service stops or the EHO finds them first.",
              },
              {
                icon: ClipboardX,
                title: "Missed Notifications",
                text: "Important updates drown in WhatsApp chats or emails — no visibility, no accountability.",
              },
              {
                icon: FileText,
                title: "Manual Report Chaos",
                text: "Managers waste hours compiling reports from spreadsheets that never match site reality.",
              },
              {
                icon: Database,
                title: "Scattered Data",
                text: "Checks, incidents, and logs live in different systems, making trend analysis impossible.",
              },
              {
                icon: Activity,
                title: "No Root Cause Tracking",
                text: "Teams fix surface issues but can’t see what’s repeatedly breaking or why.",
              },
              {
                icon: BarChart3,
                title: "No Big-Picture Insight",
                text: "Without visual reporting, operators can’t measure performance or justify improvements.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="bg-[#141823] rounded-2xl p-5 border border-neutral-800 hover:border-magenta-500/40 hover:bg-[#191c26] transition-all"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Icon className="w-5 h-5 text-magenta-400" />
                  <p className="text-base font-semibold text-white">{title}</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="bg-[#0b0d13] py-10 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">How Checkly Helps</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {[
              {
                icon: CheckCircle2,
                title: "Instant Alerts",
                text: "Automatic notifications for missed checks, failed readings, or overdue tasks keep everyone accountable.",
              },
              {
                icon: Bell,
                title: "Smart Escalation Rules",
                text: "Route alerts to the right person or site manager — no noise, no delay, no confusion.",
              },
              {
                icon: BarChart3,
                title: "Visual Performance Reports",
                text: "Track trends in compliance, maintenance, and efficiency with clean, shareable dashboards.",
              },
              {
                icon: FileText,
                title: "Audit-Ready Exports",
                text: "Generate branded, time-stamped reports for any site or period — ready for EHOs or investors.",
              },
              {
                icon: Database,
                title: "Centralised Data",
                text: "All sites, tasks, and alerts live in one secure system — no more chasing spreadsheets.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="bg-[#141823] rounded-2xl p-5 border border-neutral-800 hover:border-magenta-500/40 hover:bg-[#191c26] transition-all"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Icon className="w-5 h-5 text-magenta-400" />
                  <p className="text-base font-semibold text-magenta-400">{title}</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>
          <div className="text-center mt-10">
            <h3 className="text-xl font-semibold mb-4 text-white">
              Know what’s happening — and prove you’ve fixed it.
            </h3>
            <Link href="/signup" className="btn-glass-cta">
              Get Started
            </Link>
          </div>
        </div>
      </section>
    </MarketingSubPageLayout>
  );
}
