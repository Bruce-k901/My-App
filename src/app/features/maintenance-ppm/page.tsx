"use client";

import {
  Wrench,
  AlertTriangle,
  FileText,
  Activity,
  ClipboardX,
  Users,
  Clock3,
  BarChart3,
  CheckCircle2,
  Database,
} from "lucide-react";
import Link from "next/link";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function MaintenancePPMPage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-10 bg-[#0b0d13]">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <Wrench className="w-8 h-8 text-magenta-400 mr-3" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
              Maintenance & PPM
            </h1>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-base">
            Keep every asset reliable and ready. Checkly automates preventive maintenance, logs
            every inspection, and alerts you before downtime becomes disaster — so your team can
            focus on service, not repair.
          </p>
        </div>
      </section>

      {/* PITFALLS */}
      <section className="bg-[#0b0d13] py-8 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">Common Maintenance Pitfalls</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: AlertTriangle,
                title: "Reactive Maintenance",
                text: "Repairs only happen after breakdowns, leading to lost service hours and emergency costs.",
              },
              {
                icon: FileText,
                title: "Untracked Service History",
                text: "Paper logs and scattered records make it impossible to see when assets were last maintained.",
              },
              {
                icon: Clock3,
                title: "Missed Service Intervals",
                text: "Without automated reminders, scheduled checks slip through the cracks.",
              },
              {
                icon: Activity,
                title: "No Uptime Metrics",
                text: "Teams can’t measure performance or reliability — meaning recurring issues stay invisible.",
              },
              {
                icon: ClipboardX,
                title: "Lack of Accountability",
                text: "There’s no clear record of who performed maintenance or when it was verified.",
              },
              {
                icon: Users,
                title: "Cost Overruns",
                text: "Manual processes create inefficiency — over-servicing some assets and neglecting others.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="bg-[#141823] rounded-2xl p-5 border border-neutral-800 hover:border-magenta-500/40 hover:bg-[#191c26] transition-all duration-200"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Icon className="w-5 h-5 text-magenta-400 flex-shrink-0" />
                  <p className="text-base font-semibold text-white">{title}</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* BENEFITS + CTA */}
      <section className="bg-[#0b0d13] py-10 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">How Checkly Helps</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {[
              {
                icon: CheckCircle2,
                title: "Automated PPM Scheduling",
                text: "Prevent downtime with recurring, trackable maintenance cycles for all key assets.",
              },
              {
                icon: Database,
                title: "Centralised Maintenance Log",
                text: "Every inspection and repair is stored in one place for full traceability.",
              },
              {
                icon: BarChart3,
                title: "Uptime & Cost Insights",
                text: "Analyse performance over time to plan budgets and predict failures before they occur.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="bg-[#141823] rounded-2xl p-5 border border-neutral-800 hover:border-magenta-500/40 hover:bg-[#191c26] transition-all duration-200"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Icon className="w-5 h-5 text-magenta-400 flex-shrink-0" />
                  <p className="text-base font-semibold text-magenta-400">{title}</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="text-center mt-10">
            <h3 className="text-xl font-semibold mb-4 text-white">
              Keep assets reliable and downtime minimal.
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
