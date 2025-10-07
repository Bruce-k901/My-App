"use client";

import { Smile, Users, Gauge, ClipboardCheck, Bell, Clock4 } from "lucide-react";
import Link from "next/link";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function CustomerExperiencePage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-10 bg-[#0b0d13]">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <Smile className="w-8 h-8 text-magenta-400 mr-3" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
              Customer Experience
            </h1>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-base">
            In hospitality, guest satisfaction lives or dies by consistency. Checkly helps teams
            deliver the same flawless service every day, without firefighting or forgotten details.
          </p>
        </div>
      </section>

      {/* PITFALLS */}
      <section className="bg-[#0b0d13] py-8 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">
            Common Customer Experience Pitfalls
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: Users,
                title: "Inconsistent Service Standards",
                text: "Customers get a different experience depending on who’s on shift — the brand promise dissolves overnight.",
              },
              {
                icon: ClipboardCheck,
                title: "Missed Front-of-House Checks",
                text: "Dirty tables, empty napkin holders, or forgotten condiment stations kill first impressions fast.",
              },
              {
                icon: Bell,
                title: "Slow Issue Resolution",
                text: "Guest complaints or delivery errors vanish in group chats, never logged or tracked to closure.",
              },
              {
                icon: Gauge,
                title: "Unmeasured Wait Times",
                text: "Orders take longer when things get busy, but no one tracks bottlenecks until reviews go south.",
              },
              {
                icon: Clock4,
                title: "Poor Handover Between Shifts",
                text: "Key tasks get missed during busy transitions — what one shift assumes was done, the next one forgets.",
              },
              {
                icon: Users,
                title: "Lack of Visibility for Managers",
                text: "Leads and GMs can’t see real-time service data, so problems only surface after the customer complains.",
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
                title: "Live Service Checklists",
                text: "FOH and BOH teams complete visual checks in real time — clean counters, stocked displays, reset tables, no guesswork.",
              },
              {
                title: "Smart Task Scheduling",
                text: "Tasks appear automatically by time of day or shift role, keeping focus where it matters — before customers notice issues.",
              },
              {
                title: "Customer Feedback Loop",
                text: "Capture service incidents or guest feedback straight into Checkly and track corrective actions to closure.",
              },
              {
                title: "Performance Dashboards",
                text: "Instant visibility into service times, missed tasks, and satisfaction scores across all sites.",
              },
              {
                title: "Shift Handover Visibility",
                text: "Automatic end-of-shift summaries show what’s completed and what’s pending, so standards never drop.",
              },
              {
                title: "Consistency Across Locations",
                text: "Templates and live monitoring guarantee each store delivers the same quality — from Dalston to Dubai.",
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
              Want every customer to walk away impressed?
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
