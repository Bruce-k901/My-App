"use client";

import {
  Users,
  AlertTriangle,
  ClipboardX,
  Clock3,
  CheckCircle2,
  BarChart3,
  FileText,
  UserCheck,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function TeamManagementPage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-10 bg-[#0b0d13]">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-magenta-400 mr-3" />
            <h1 className="pt-1 pb-1 leading-tight text-4xl md:text-5xl font-bold bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
              Team Management
            </h1>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-base">
            Manage your team with clarity and accountability. Checkly connects every shift, task,
            and role — giving you visibility, structure, and consistency across your operation.
          </p>
        </div>
      </section>

      {/* PITFALLS */}
      <section className="bg-[#0b0d13] py-8 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">
            Common Team Management Pitfalls
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: AlertTriangle,
                title: "No Clear Roles or Ownership",
                text: "Tasks get passed around, nobody knows who’s responsible, and accountability disappears.",
              },
              {
                icon: Clock3,
                title: "Shift Chaos",
                text: "Key tasks or handovers are forgotten during busy transitions — productivity dips every changeover.",
              },
              {
                icon: ClipboardX,
                title: "Untracked Performance",
                text: "Managers have no real visibility on who’s consistent, who needs help, or where training gaps exist.",
              },
              {
                icon: Workflow,
                title: "Communication Gaps",
                text: "Instructions get lost in group chats or scribbled notes, creating avoidable confusion.",
              },
              {
                icon: FileText,
                title: "No Proof of Training or Checks",
                text: "When an incident happens, there’s no evidence of who was trained or when they were signed off.",
              },
              {
                icon: BarChart3,
                title: "Reactive Management",
                text: "Leaders spend all day firefighting because they can’t see problems until it’s too late.",
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
                title: "Role-Based Task Visibility",
                text: "Every team member sees only what’s relevant to them — no clutter, no missed duties.",
              },
              {
                icon: UserCheck,
                title: "Live Staff Tracking",
                text: "Monitor task completion, sign-offs, and performance metrics in real time across all shifts.",
              },
              {
                icon: Workflow,
                title: "Structured Communication",
                text: "Replace messy chat groups with logged notes and updates linked directly to tasks.",
              },
              {
                icon: FileText,
                title: "Training & Competency Logs",
                text: "Track onboarding, sign-offs, and refresher sessions so you’re always audit-ready.",
              },
              {
                icon: BarChart3,
                title: "Performance Insights",
                text: "Identify top performers, spot weak points, and improve productivity through data, not hunches.",
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
              Build a stronger, more accountable team — every shift.
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
