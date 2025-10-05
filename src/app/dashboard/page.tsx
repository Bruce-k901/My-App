"use client";

import {
  LayoutDashboard,
  Eye,
  BarChart3,
  ClipboardList,
  TrendingUp,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import Link from "next/link";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function DashboardPage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-16 bg-[#0b0d13]">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <LayoutDashboard className="w-8 h-8 text-magenta-400 mr-3" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
              Dashboard (Basic)
            </h1>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-base">
            The heart of Checkly — your all-in-one view for daily operations. Track compliance,
            monitor performance, and stay alert to issues in real time. Simple, clear, and always up
            to date.
          </p>
        </div>
      </section>

      {/* PITFALLS */}
      <section className="bg-[#0b0d13] py-12 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">Common Visibility Pitfalls</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: ClipboardList,
                title: "Scattered Task Tracking",
                text: "Daily checks, PPMs, and compliance logs live in separate systems — creating blind spots and confusion.",
              },
              {
                icon: Eye,
                title: "No Live Oversight",
                text: "Managers rely on end-of-day reports instead of seeing what’s happening right now.",
              },
              {
                icon: AlertTriangle,
                title: "Missed Alerts",
                text: "Without real-time notifications, issues escalate before anyone even knows they exist.",
              },
              {
                icon: FileText,
                title: "Manual Reporting",
                text: "Staff waste time compiling spreadsheets when the data should already be visible.",
              },
              {
                icon: BarChart3,
                title: "Disconnected Data",
                text: "Performance, maintenance, and compliance insights are siloed — impossible to connect without manual work.",
              },
              {
                icon: Gauge,
                title: "No Clear Benchmarks",
                text: "Without metrics and trendlines, there’s no way to measure improvement or risk across teams.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="bg-[#141823] rounded-2xl p-5 border border-neutral-800 hover:border-magenta-500/40 hover:bg-[#191c26] transition-all duration-200"
              >
                <Icon className="w-6 h-6 text-magenta-400 mb-3" />
                <p className="text-base font-semibold mb-1 text-white">{title}</p>
                <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* BENEFITS + CTA */}
      <section className="bg-[#0b0d13] py-16 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">How the Dashboard Helps</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {[
              {
                icon: CheckCircle2,
                title: "Real-Time Visibility",
                text: "See every task, alert, and update as it happens — no refresh or report needed.",
              },
              {
                icon: TrendingUp,
                title: "Actionable Insights",
                text: "Turn daily data into decisions with automatic summaries and clear performance metrics.",
              },
              {
                icon: Gauge,
                title: "Simple, Scalable Setup",
                text: "Start small with one site, then expand effortlessly as your operations grow.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="bg-[#141823] rounded-2xl p-5 border border-neutral-800 hover:border-magenta-500/40 hover:bg-[#191c26] transition-all duration-200"
              >
                <Icon className="w-6 h-6 text-magenta-400 mb-3" />
                <p className="text-base font-semibold mb-1 text-magenta-400">{title}</p>
                <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="text-center mt-10">
            <h3 className="text-xl font-semibold mb-4 text-white">See everything. Miss nothing.</h3>
            <Link href="/signup" className="btn-glass-cta">
              Try the Basic Dashboard
            </Link>
          </div>
        </div>
      </section>
    </MarketingSubPageLayout>
  );
}
