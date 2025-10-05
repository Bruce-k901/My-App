"use client";

import { Gauge, Timer, ClipboardCheck, Cpu, Workflow, TrendingUp } from "lucide-react";
import Link from "next/link";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function PerformancePage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-16 bg-[#0b0d13]">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <Gauge className="w-8 h-8 text-magenta-400 mr-3" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
              Performance & Efficiency
            </h1>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-base">
            In hospitality, seconds matter. Checkly keeps every shift running at full speed —
            accurate, accountable, and effortlessly repeatable.
          </p>
        </div>
      </section>

      {/* PITFALLS */}
      <section className="bg-[#0b0d13] py-12 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">Common Performance Pitfalls</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: Timer,
                title: "Slow Service and Prep Delays",
                text: "Orders back up because key checks or preps weren’t done on time. Every minute lost means colder food and angry guests.",
              },
              {
                icon: Cpu,
                title: "Manual Systems That Don’t Scale",
                text: "Spreadsheets, whiteboards, and WhatsApp updates can’t keep pace once the team grows or volume spikes.",
              },
              {
                icon: ClipboardCheck,
                title: "Rework and Waste",
                text: "Errors in recipes, prep counts, or stock logging lead to overproduction, spoilage, and profit down the drain.",
              },
              {
                icon: Workflow,
                title: "Unclear Task Ownership",
                text: "Everyone assumes someone else did it. The fryer isn’t filtered, the display isn’t restocked, and standards slip.",
              },
              {
                icon: TrendingUp,
                title: "No Performance Data",
                text: "Managers can’t measure turnaround times, task completion rates, or downtime — so improvement is guesswork.",
              },
              {
                icon: Cpu,
                title: "Reactive Problem Solving",
                text: "Teams firefight daily issues instead of preventing them, wasting time and energy that should go into service.",
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
      <section className="bg-[#0b0d13] py-16 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">How Checkly Helps</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {[
              {
                title: "Shift-Speed Task Automation",
                text: "Assign, repeat, and track daily tasks automatically so no prep, clean, or close-down step is ever missed again.",
              },
              {
                title: "Live Ops Dashboards",
                text: "Real-time visibility across all teams — see what’s done, what’s delayed, and who’s on it right now.",
              },
              {
                title: "Recipe and Production Accuracy",
                text: "Embed SOPs and counts directly into tasks so batches, trays, and bakes hit spec every single time.",
              },
              {
                title: "Data-Driven Improvements",
                text: "Track completion rates and bottlenecks to benchmark performance and reward efficiency, not firefighting.",
              },
              {
                title: "Cross-Site Benchmarking",
                text: "Compare site productivity and consistency side-by-side — highlight best performers and raise the baseline.",
              },
              {
                title: "Fewer Meetings, More Doing",
                text: "Checkly replaces endless WhatsApp updates with clear task data and instant accountability.",
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
              Ready to boost speed and accuracy across every shift?
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
