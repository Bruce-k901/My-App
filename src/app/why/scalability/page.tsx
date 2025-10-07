"use client";

import { Layers, Building2, ClipboardCheck, Workflow, Globe2, TrendingUp } from "lucide-react";
import Link from "next/link";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function ScalabilityPage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-10 bg-[#0b0d13]">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-magenta-400 mr-3" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
              Scalability & Growth
            </h1>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-base">
            As your operation grows, small inefficiencies multiply fast. Checkly helps you scale
            systems, not chaos — so every new site runs as smoothly as your best one.
          </p>
        </div>
      </section>

      {/* PITFALLS */}
      <section className="bg-[#0b0d13] py-8 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">Common Scalability Pitfalls</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: Building2,
                title: "Inconsistent Site Standards",
                text: "Each new site builds its own version of processes — cleaning routines, prep lists, and standards drift fast.",
              },
              {
                icon: ClipboardCheck,
                title: "Manual Onboarding Bottlenecks",
                text: "Every new hire or location needs the same documents, checklists, and training rebuilt from scratch.",
              },
              {
                icon: Workflow,
                title: "Systems That Don’t Scale",
                text: "Spreadsheets and shared drives collapse once there’s more than one kitchen or store to manage.",
              },
              {
                icon: Layers,
                title: "No Central Oversight",
                text: "Leadership has no live view of performance or compliance across all sites — decisions become guesswork.",
              },
              {
                icon: Globe2,
                title: "Hard to Adapt to New Markets",
                text: "When expansion reaches new cities or countries, existing systems can’t flex for local regulations or staff.",
              },
              {
                icon: TrendingUp,
                title: "Data Locked in Silos",
                text: "Information sits in individual inboxes or apps instead of feeding group-level insights and reporting.",
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
                title: "Standardised Operating Framework",
                text: "Roll out identical processes, checklists, and reporting templates across all locations with one click.",
              },
              {
                title: "Group-Level Visibility",
                text: "See live compliance, productivity, and audit data from every site in one dashboard — no waiting for reports.",
              },
              {
                title: "Faster Onboarding & Training",
                text: "New teams get instant access to role-based checklists, SOPs, and training logs right from day one.",
              },
              {
                title: "Version Control for Processes",
                text: "Update a checklist once, and it syncs everywhere. No more outdated PDFs or inconsistent task lists.",
              },
              {
                title: "Multi-Site Flexibility",
                text: "Duplicate or adjust checklists by region, regulation, or kitchen setup while keeping core standards intact.",
              },
              {
                title: "Data That Scales With You",
                text: "Group-level analytics highlight best performers, cost efficiencies, and trends to fuel confident expansion.",
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
              Ready to scale without losing control?
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
