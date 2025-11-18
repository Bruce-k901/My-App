"use client";

import Link from "next/link";
import DarkVeil from "@/components/ui/DarkVeil";
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

export default function ChecklyFeaturesPage() {
  return (
    <>
      {/* Single DarkVeil Background Container */}
      <div className="relative overflow-hidden">
        {/* Single DarkVeil Background - covers both sections */}
        <div className="absolute inset-0 w-full h-full -z-0">
          <div className="w-full h-full min-h-screen">
            <DarkVeil />
          </div>
        </div>
        
        {/* HERO */}
        <section className="relative text-center pt-6 pb-8 sm:pb-10 md:pt-8 md:pb-12 min-h-[350px] sm:min-h-[400px] flex flex-col justify-start">
          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-6 sm:pt-8">
            <h1 className="hero-title text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold leading-[1.15] bg-gradient-to-r from-magenta-400 to-blue-500 bg-clip-text text-transparent mb-4 sm:mb-6 px-2">
              Everything your kitchen, store, and head office need in one place
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-checkly-gray max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
              Real-time logs, automated alerts, and ready-to-show reports. Less firefighting, more running your business..
            </p>
            <div className="flex justify-center gap-3 sm:gap-4 mb-0 px-4">
              <Link href="/signup" className="btn-glass-cta">
                Get Started
              </Link>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION - Cards overlay the background */}
        <section id="features" className="relative px-4 sm:px-6 -mt-12 sm:-mt-16 md:-mt-24 pb-10 sm:pb-14 text-gray-200">
          <div className="relative z-10 max-w-7xl mx-auto mb-6 sm:mb-8 px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-white mb-2">
              What it fixes — and how Checkly helps
            </h2>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Pitfall-Feature Pair 1 */}
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-magenta-400" />
                <p className="text-base font-semibold text-white">Inspection Panic</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Compliance records scattered and manual exports cause stress before EHO visits.</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-green-400/50 hover:shadow-[0_0_18px_rgba(34,197,94,0.25)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-5 h-5 text-green-400" />
                <p className="text-base font-semibold text-green-400">EHO-Ready Pack</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Automatic compliance export that removes inspection panic.</p>
            </div>

            {/* Pitfall-Feature Pair 2 */}
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <ClipboardCheck className="w-5 h-5 text-magenta-400" />
                <p className="text-base font-semibold text-white">Routines Without Reset/Proof</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Paper lists don't reset and lack logs or timestamps.</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-green-400/50 hover:shadow-[0_0_18px_rgba(34,197,94,0.25)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <ClipboardCheck className="w-5 h-5 text-green-400" />
                <p className="text-base font-semibold text-green-400">Smart Digital Checklists</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Resets daily/weekly, logged and time-stamped.</p>
            </div>

            {/* Pitfall-Feature Pair 3 */}
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-magenta-400" />
                <p className="text-base font-semibold text-white">Forged or Missed Temp Logs</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Manual temperature logging can be skipped or falsified.</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-green-400/50 hover:shadow-[0_0_18px_rgba(34,197,94,0.25)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <Thermometer className="w-5 h-5 text-green-400" />
                <p className="text-base font-semibold text-green-400">Temperature Logging with Alerts</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Live readings, no forged data.</p>
            </div>

            {/* Pitfall-Feature Pair 4 */}
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-magenta-400" />
                <p className="text-base font-semibold text-white">Breakdown Roulette</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Reactive maintenance leads to unpredictable downtime and costs.</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-green-400/50 hover:shadow-[0_0_18px_rgba(34,197,94,0.25)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <Wrench className="w-5 h-5 text-green-400" />
                <p className="text-base font-semibold text-green-400">Asset Register & PPM Scheduler</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Predictable maintenance, no breakdown roulette.</p>
            </div>

            {/* Pitfall-Feature Pair 5 */}
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-magenta-400" />
                <p className="text-base font-semibold text-white">Untracked Maintenance Issues</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Problems lack evidence and stall without an end-to-end process.</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-green-400/50 hover:shadow-[0_0_18px_rgba(34,197,94,0.25)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <Wrench className="w-5 h-5 text-green-400" />
                <p className="text-base font-semibold text-green-400">Maintenance & Fault Reporting</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Photo-driven issue tracking with repair lifecycle.</p>
            </div>

            {/* Pitfall-Feature Pair 6 */}
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <LayoutDashboard className="w-5 h-5 text-magenta-400" />
                <p className="text-base font-semibold text-white">Fragmented Multi-Site Visibility</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Managers can't see performance and compliance across locations.</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-green-400/50 hover:shadow-[0_0_18px_rgba(34,197,94,0.25)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <LayoutDashboard className="w-5 h-5 text-green-400" />
                <p className="text-base font-semibold text-green-400">Multi-Site Dashboards</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Full visibility across all operations.</p>
            </div>

            {/* Pitfall-Feature Pair 7 */}
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-magenta-400" />
                <p className="text-base font-semibold text-white">No Early Warnings</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Failures are caught too late without proactive notifications.</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-green-400/50 hover:shadow-[0_0_18px_rgba(34,197,94,0.25)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <Bell className="w-5 h-5 text-green-400" />
                <p className="text-base font-semibold text-green-400">Alerts & Escalations</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Proactive warnings before something fails.</p>
            </div>

            {/* Pitfall-Feature Pair 8 */}
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="w-5 h-5 text-magenta-400" />
                <p className="text-base font-semibold text-white">No Audit Trail</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Task completion is disputed or unverifiable.</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-green-400/50 hover:shadow-[0_0_18px_rgba(34,197,94,0.25)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <p className="text-base font-semibold text-green-400">Task Verification & Audit Trail</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Indisputable evidence of completion.</p>
            </div>

            {/* Pitfall-Feature Pair 9 */}
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <ListChecks className="w-5 h-5 text-magenta-400" />
                <p className="text-base font-semibold text-white">Inconsistent SOPs</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Policies and templates vary by site and team.</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-green-400/50 hover:shadow-[0_0_18px_rgba(34,197,94,0.25)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <ListChecks className="w-5 h-5 text-green-400" />
                <p className="text-base font-semibold text-green-400">Policy & Template Control</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Company-wide SOP standardisation.</p>
            </div>

            {/* Pitfall-Feature Pair 10 */}
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="w-5 h-5 text-magenta-400" />
                <p className="text-base font-semibold text-white">Blind Spots in Trends</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Compliance and cost trends aren't visible for decision-making.</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-green-400/50 hover:shadow-[0_0_18px_rgba(34,197,94,0.25)] transition">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="w-5 h-5 text-green-400" />
                <p className="text-base font-semibold text-green-400">Reporting & Analytics</p>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Data-driven insights into compliance and cost trends.</p>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="bg-checkly-dark text-checkly-light py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 flex flex-col md:flex-row justify-between items-center text-sm gap-4">
          <p>© {new Date().getFullYear()} Checkly. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            <Link href="/contact" className="hover:underline">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

