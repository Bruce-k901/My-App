"use client";

import {
  Thermometer,
  AlertTriangle,
  ClipboardX,
  FileText,
  CheckCircle2,
  BarChart3,
  Bell,
} from "lucide-react";
import Link from "next/link";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function TemperatureLoggingPage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-16 bg-[#0b0d13]">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <Thermometer className="w-8 h-8 text-magenta-400 mr-3" />
            <h1 className="pt-1 pb-1 leading-tight text-4xl md:text-5xl font-bold bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
              Temperature Logging
            </h1>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-base">
            Replace paper logs with automated, verifiable temperature checks. Checkly keeps your
            chillers compliant, your records accurate, and your team alert before problems cost
            product or customers.
          </p>
        </div>
      </section>

      {/* PITFALLS */}
      <section className="bg-[#0b0d13] py-12 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">Common Temperature Pitfalls</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: AlertTriangle,
                title: "Missed Daily Checks",
                text: "Busy shifts skip fridge or freezer readings until it’s too late to save the stock.",
              },
              {
                icon: ClipboardX,
                title: "Paper Log Errors",
                text: "Handwritten temperatures get rounded, lost, or back-filled — useless for compliance.",
              },
              {
                icon: Bell,
                title: "No Live Alerts",
                text: "Equipment fails overnight with no notification — food waste and downtime follow.",
              },
              {
                icon: FileText,
                title: "Unverified Data",
                text: "No timestamp or staff name means logs can’t be trusted during EHO inspections.",
              },
              {
                icon: BarChart3,
                title: "No Performance Insight",
                text: "Temperature drift patterns go unseen, hiding failing equipment until breakdown.",
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
      <section className="bg-[#0b0d13] py-16 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">How Checkly Helps</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {[
              {
                icon: CheckCircle2,
                title: "Digital Temperature Logs",
                text: "Every reading auto-timestamps and syncs — no paper, no guessing, fully compliant.",
              },
              {
                icon: Bell,
                title: "Instant Alerts",
                text: "Notifications for out-of-range readings keep products safe and downtime minimal.",
              },
              {
                icon: BarChart3,
                title: "Performance Tracking",
                text: "Identify failing units early and plan maintenance before costly spoilage.",
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
              Keep food safe and fridges compliant — every shift.
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
