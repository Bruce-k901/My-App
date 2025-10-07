"use client";

import Link from "next/link";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";
import {
  Shield,
  ClipboardCheck,
  Thermometer,
  Wrench,
  LayoutDashboard,
  Bell,
  CheckCircle2,
  ListChecks,
  BarChart3,
  FileText,
  AlertTriangle,
} from "lucide-react";

export default function FeaturesPage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-10 bg-[#0b0d13]">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <LayoutDashboard className="w-8 h-8 text-magenta-400 mr-3" />
            <h1 className="pt-1 pb-1 leading-tight text-4xl md:text-5xl font-bold bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
              Features
            </h1>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-base">
            Explore the core capabilities of Checkly and the pitfalls they solve.
          </p>
        </div>
      </section>

      {/* PAIRED PITFALLS ↔ FEATURES */}
      <section className="bg-[#0b0d13] py-10 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-center text-white">
            Common Pitfalls and how Checkly helps
          </h2>

          <div className="flex flex-col space-y-6">
            {[
              {
                pitfall: {
                  icon: AlertTriangle,
                  title: "Inspection Panic",
                  text: "Compliance records scattered and manual exports cause stress before EHO visits.",
                },
                feature: {
                  icon: Shield,
                  title: "EHO-Ready Pack",
                  text: "Automatic compliance export that removes inspection panic.",
                },
              },
              {
                pitfall: {
                  icon: ClipboardCheck,
                  title: "Routines Without Reset/Proof",
                  text: "Paper lists don’t reset and lack logs or timestamps.",
                },
                feature: {
                  icon: ClipboardCheck,
                  title: "Smart Digital Checklists",
                  text: "Resets daily/weekly, logged and time-stamped.",
                },
              },
              {
                pitfall: {
                  icon: AlertTriangle,
                  title: "Forged or Missed Temp Logs",
                  text: "Manual temperature logging can be skipped or falsified.",
                },
                feature: {
                  icon: Thermometer,
                  title: "Temperature Logging with Alerts",
                  text: "Live readings, no forged data.",
                },
              },
              {
                pitfall: {
                  icon: AlertTriangle,
                  title: "Breakdown Roulette",
                  text: "Reactive maintenance leads to unpredictable downtime and costs.",
                },
                feature: {
                  icon: Wrench,
                  title: "Asset Register & PPM Scheduler",
                  text: "Predictable maintenance, no breakdown roulette.",
                },
              },
              {
                pitfall: {
                  icon: AlertTriangle,
                  title: "Untracked Maintenance Issues",
                  text: "Problems lack evidence and stall without an end-to-end process.",
                },
                feature: {
                  icon: Wrench,
                  title: "Maintenance & Fault Reporting",
                  text: "Photo-driven issue tracking with repair lifecycle.",
                },
              },
              {
                pitfall: {
                  icon: LayoutDashboard,
                  title: "Fragmented Multi-Site Visibility",
                  text: "Managers can’t see performance and compliance across locations.",
                },
                feature: {
                  icon: LayoutDashboard,
                  title: "Multi-Site Dashboards",
                  text: "Full visibility across all operations.",
                },
              },
              {
                pitfall: {
                  icon: AlertTriangle,
                  title: "No Early Warnings",
                  text: "Failures are caught too late without proactive notifications.",
                },
                feature: {
                  icon: Bell,
                  title: "Alerts & Escalations",
                  text: "Proactive warnings before something fails.",
                },
              },
              {
                pitfall: {
                  icon: FileText,
                  title: "No Audit Trail",
                  text: "Task completion is disputed or unverifiable.",
                },
                feature: {
                  icon: CheckCircle2,
                  title: "Task Verification & Audit Trail",
                  text: "Indisputable evidence of completion.",
                },
              },
              {
                pitfall: {
                  icon: ListChecks,
                  title: "Inconsistent SOPs",
                  text: "Policies and templates vary by site and team.",
                },
                feature: {
                  icon: ListChecks,
                  title: "Policy & Template Control",
                  text: "Company-wide SOP standardisation.",
                },
              },
              {
                pitfall: {
                  icon: BarChart3,
                  title: "Blind Spots in Trends",
                  text: "Compliance and cost trends aren’t visible for decision-making.",
                },
                feature: {
                  icon: BarChart3,
                  title: "Reporting & Analytics",
                  text: "Data-driven insights into compliance and cost trends.",
                },
              },
            ].map(({ pitfall, feature }) => (
              <div
                key={pitfall.title}
                className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch"
              >
                {/* Left: Pitfall card */}
                <div className="bg-magenta-500/10 rounded-2xl p-5 border border-magenta-500/30 hover:border-magenta-500/50 hover:bg-magenta-500/15 transition-all text-left">
                  <div className="flex items-center space-x-2 mb-2">
                    <pitfall.icon className="w-5 h-5 text-magenta-400" />
                    <p className="text-base font-semibold text-white">{pitfall.title}</p>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{pitfall.text}</p>
                </div>

                {/* Right: Feature card */}
                <div className="bg-green-500/10 rounded-2xl p-5 border border-green-500/30 hover:border-green-500/50 hover:bg-green-500/15 transition-all text-left">
                  <div className="flex items-center space-x-2 mb-2">
                    <feature.icon className="w-5 h-5 text-green-400" />
                    <p className="text-base font-semibold text-green-400">{feature.title}</p>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <h3 className="text-xl font-semibold mb-4 text-white">
              Ready to streamline operations and compliance?
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
