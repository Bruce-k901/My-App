"use client";

import { Activity, ClipboardCheck, Timer, Workflow, Users, TrendingUp } from "lucide-react";
import Link from "next/link";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function ProductivityPage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-10 bg-[#0b0d13]">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <Activity className="w-8 h-8 text-magenta-400 mr-3" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
              Team Productivity
            </h1>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-base">
            Hospitality runs on tempo. Checkly keeps your team in sync, focused, and productive — no
            wasted motion, no repeated mistakes.
          </p>
        </div>
      </section>

      {/* PITFALLS */}
      <section className="bg-[#0b0d13] py-8 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">Common Productivity Pitfalls</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: Workflow,
                title: "Disjointed Routines",
                text: "Each shift works differently — no shared rhythm or accountability. The morning rush always feels like a restart.",
              },
              {
                icon: Timer,
                title: "Reactive Workload Management",
                text: "Teams spend time firefighting instead of following structured routines that prevent issues before they start.",
              },
              {
                icon: ClipboardCheck,
                title: "Forgotten or Duplicated Tasks",
                text: "Staff repeat jobs or miss them entirely because task lists live in WhatsApp or memory instead of a shared system.",
              },
              {
                icon: Users,
                title: "Low Staff Engagement",
                text: "When tasks aren’t clear or progress isn’t visible, morale drops and effort follows.",
              },
              {
                icon: TrendingUp,
                title: "No Visibility on Output",
                text: "Managers can’t see who’s on pace or where the team is slipping until the day’s already lost.",
              },
              {
                icon: Activity,
                title: "Over-Reliance on Individuals",
                text: "Key team members carry all the knowledge — when they’re off, everything slows down.",
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
                title: "Structured Shift Routines",
                text: "Checklists and workflows appear automatically by shift, role, or time of day — no confusion, no drift.",
              },
              {
                title: "Real-Time Task Tracking",
                text: "Every team member sees what’s done, what’s next, and what’s overdue — keeping everyone moving in sync.",
              },
              {
                title: "Automated Reminders & Recurring Tasks",
                text: "Never forget a deep clean, stock count, or maintenance check again. Set once, repeat forever.",
              },
              {
                title: "Performance Visibility",
                text: "Managers can instantly see productivity across teams and sites — who’s consistent, who needs support.",
              },
              {
                title: "Knowledge Shared, Not Hoarded",
                text: "Embed SOPs and process notes into every task so best practice doesn’t vanish when a key person’s off.",
              },
              {
                title: "Reduced Micromanagement",
                text: "Clear ownership and visibility mean fewer check-ins and smoother shifts — teams self-manage with confidence.",
              },
            ].map(({ title, text }) => (
              <li
                key={title}
                className="bg-[#141823] rounded-2xl p-5 border border-neutral-800 hover:border-magenta-500/40 hover:bg-[#191c26] transition-all duration-200"
              >
                <p className="text-base font-semibold mb-1 text-magenta-400">{title}</p>
                <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>

          {/* CTA AT BOTTOM */}
          <div className="text-center mt-10">
            <h3 className="text-xl font-semibold mb-4 text-white">
              Want your team performing like clockwork?
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
