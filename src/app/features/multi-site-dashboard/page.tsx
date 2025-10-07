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
      <section className="flex flex-col items-center justify-center text-center px-6 py-10 bg-[#0b0d13]">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <Globe2 className="w-8 h-8 text-magenta-400 mr-3" />
            <h1 className="pt-1 pb-1 leading-tight text-4xl md:text-5xl font-bold bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
              Everything your kitchen, store, and head office need in one place
            </h1>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-base">
            Real-time logs, automated alerts, and ready-to-show reports. Less firefighting, more running your business..
          </p>
        </div>
      </section>

      {/* PAIRED PITFALLS + FEATURES */}
      <section className="bg-[#0b0d13] py-10 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-8 text-white text-center">
            What it fixes — and how Checkly helps
          </h2>
          <div className="space-y-6">
            {[
              {
                pitfall: {
                  icon: ClipboardX,
                  title: "Scattered Reporting",
                  text: "Managers compile performance data manually — slow, inconsistent, and error-prone.",
                },
                feature: {
                  icon: CheckCircle2,
                  title: "Group-Wide Dashboards",
                  text: "Live data for every site — maintenance, safety, and task completion in one clean dashboard.",
                },
              },
              {
                pitfall: {
                  icon: BarChart3,
                  title: "No Group Performance Insight",
                  text: "Leadership can’t compare sites or drive improvements across the group.",
                },
                feature: {
                  icon: TrendingUp,
                  title: "Compare Performance at a Glance",
                  text: "Spot top sites and support those falling behind to raise the standard consistently.",
                },
              },
              {
                pitfall: {
                  icon: AlertTriangle,
                  title: "Blind Spots",
                  text: "Compliance slips aren’t visible until something goes wrong.",
                },
                feature: {
                  icon: BarChart3,
                  title: "Visual Metrics & Reports",
                  text: "Turn daily checks into insight — compliance scores, uptime trends, and staff performance.",
                },
              },
              {
                pitfall: {
                  icon: Database,
                  title: "Disconnected Systems",
                  text: "Logs, maintenance, and tasks sit in different tools, impossible to analyse together.",
                },
                feature: {
                  icon: Database,
                  title: "One Source of Truth",
                  text: "Checkly consolidates records so decisions are based on facts, not guesswork.",
                },
              },
              {
                pitfall: {
                  icon: Users,
                  title: "Unclear Accountability",
                  text: "Without central visibility, ownership is fuzzy and outcomes drift.",
                },
                feature: {
                  icon: Users,
                  title: "Clear Accountability",
                  text: "Assign roles and monitor outcomes — everyone knows their part and progress is visible.",
                },
              },
              {
                pitfall: {
                  icon: Building2,
                  title: "Inconsistent Standards",
                  text: "Every site runs slightly differently, jeopardising brand consistency.",
                },
                feature: {
                  icon: TrendingUp,
                  title: "Standardise and Scale",
                  text: "Use dashboards and templates to align sites — works for single locations too.",
                },
              },
            ].map(({ pitfall, feature }) => (
              <div key={pitfall.title} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pitfall (left) */}
                <div className="bg-[#141823] rounded-2xl p-5 border border-neutral-800 hover:border-magenta-500/40 hover:bg-[#191c26] transition-all">
                  <div className="flex items-center space-x-2 mb-2">
                    <pitfall.icon className="w-5 h-5 text-magenta-400" />
                    <p className="text-base font-semibold text-white">{pitfall.title}</p>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{pitfall.text}</p>
                </div>

                {/* Feature (right) */}
                <div className="bg-[#141823] rounded-2xl p-5 border border-neutral-800 hover:border-magenta-500/40 hover:bg-[#191c26] transition-all">
                  <div className="flex items-center space-x-2 mb-2">
                    <feature.icon className="w-5 h-5 text-magenta-400" />
                    <p className="text-base font-semibold text-magenta-400">{feature.title}</p>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
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
