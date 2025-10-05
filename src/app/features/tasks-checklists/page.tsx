"use client";

import {
  ClipboardCheck,
  AlertTriangle,
  Clock3,
  Users,
  CheckCircle2,
  BarChart3,
  FileText,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function TasksChecklistsPage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-16 bg-[#0b0d13]">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <ClipboardCheck className="w-8 h-8 text-magenta-400 mr-3" />
            <h1 className="pt-1 pb-1 leading-tight text-4xl md:text-5xl font-bold bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
              Tasks & Checklists
            </h1>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-base">
            Keep every shift on track. Checkly replaces paper checklists with live, accountable task
            management — so nothing’s missed, rushed, or done twice.
          </p>
        </div>
      </section>

      {/* PITFALLS */}
      <section className="bg-[#0b0d13] py-12 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">Common Task Pitfalls</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: AlertTriangle,
                title: "Missed Daily Tasks",
                text: "Closing or prep routines slip when teams rely on memory instead of structured checklists.",
              },
              {
                icon: Clock3,
                title: "Inconsistent Timing",
                text: "Tasks are completed at random, leaving service areas unready during peak hours.",
              },
              {
                icon: FileText,
                title: "Paper Checklists Go Missing",
                text: "Paper sheets get lost or ignored — no proof, no accountability, and no visibility for managers.",
              },
              {
                icon: Workflow,
                title: "Duplicate Effort",
                text: "Two people do the same job, another does none. Manual tracking kills efficiency.",
              },
              {
                icon: Users,
                title: "No Ownership",
                text: "Without clear task assignments, everyone assumes someone else is handling it.",
              },
              {
                icon: BarChart3,
                title: "No Insight on Completion",
                text: "Managers can’t see what’s done or overdue — every shift feels like starting from scratch.",
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
                title: "Live Digital Checklists",
                text: "Replace paper lists with live tasks — ticked off, timestamped, and visible to every manager.",
              },
              {
                icon: Clock3,
                title: "Scheduled Workflows",
                text: "Automate daily, weekly, and shift-based tasks so routines run like clockwork.",
              },
              {
                icon: Users,
                title: "Clear Ownership",
                text: "Assign tasks by role or individual, ensuring every action has a name behind it.",
              },
              {
                icon: BarChart3,
                title: "Progress Visibility",
                text: "Managers track completion in real time and step in before standards slip.",
              },
              {
                icon: FileText,
                title: "Audit-Ready History",
                text: "Every task is logged with proof — great for EHOs, training, and accountability.",
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
              Every shift, every task, done right and on time.
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
