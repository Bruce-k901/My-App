"use client";

import {
  Globe2,
  Building2,
  BarChart3,
  ClipboardX,
  AlertTriangle,
  Users,
  CheckCircle2,
  Database,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function MultiSiteDashboardPage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-16 bg-[#0b0d13]">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <Globe2 className="w-8 h-8 text-magenta-400 mr-3" />
            <h1 className="pt-1 pb-1 leading-tight text-4xl md:text-5xl font-bold bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
              Multi-Site Dashboards
            </h1>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-base">
            Manage every site from one screen. Checkly brings all your kitchens, cafés, and outlets
            together — live data, performance trends, and compliance status in real time, without
            endless spreadsheets.
          </p>
        </div>
      </section>

      {/* PITFALLS */}
      <section className="bg-[#0b0d13] py-12 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">Common Multi-Site Pitfalls</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: Building2,
                title: "Inconsistent Standards",
                text: "Every site runs slightly differently, making it impossible to track brand or service consistency.",
              },
              {
                icon: ClipboardX,
                title: "Scattered Reporting",
                text: "Managers compile performance data manually across sites — slow, inconsistent, and error-prone.",
              },
              {
                icon: AlertTriangle,
                title: "Blind Spots",
                text: "Head office can’t see where compliance is slipping until something goes wrong.",
              },
              {
                icon: Users,
                title: "Unclear Accountability",
                text: "No central visibility means head chefs and site managers avoid ownership when targets aren’t met.",
              },
              {
                icon: Database,
                title: "Disconnected Systems",
                text: "Temperature logs, maintenance, and tasks sit in different tools — impossible to analyse together.",
              },
              {
                icon: BarChart3,
                title: "No Group Performance Insight",
                text: "Without consolidated dashboards, leadership can’t compare sites or drive improvements group-wide.",
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
                title: "Group-Wide Dashboards",
                text: "View live data from every site — maintenance, safety, and task completion in one clean dashboard.",
              },
              {
                icon: TrendingUp,
                title: "Compare Performance at a Glance",
                text: "See which sites excel and where support is needed, helping you raise the group standard consistently.",
              },
              {
                icon: BarChart3,
                title: "Visual Metrics & Reports",
                text: "Turn daily checks into actionable insight — compliance scores, uptime trends, and staff performance.",
              },
              {
                icon: Database,
                title: "All Data, One Source of Truth",
                text: "Eliminate fragmented systems. Checkly consolidates every record so decisions are based on facts, not guesswork.",
              },
              {
                icon: Users,
                title: "Clear Accountability",
                text: "Assign roles and monitor outcomes across sites — everyone knows their part and progress is visible.",
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
              Run every site like your best site.
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
