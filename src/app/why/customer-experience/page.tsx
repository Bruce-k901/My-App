"use client";

import { Smile, Thermometer, FileX, ClipboardX, Users, Ban, AlertTriangle } from "lucide-react";
import Link from "next/link";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function CustomerExperiencePage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-16 bg-[#0b0d13]">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <Smile className="w-8 h-8 text-magenta-400 mr-3" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
              Customer Experience
            </h1>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-base">
            In hospitality, experience is everything. A single compliance slip — spoiled stock, a
            missed cleaning record, or a broken fridge — can undo months of great service. Checkly
            keeps you one step ahead.
          </p>
        </div>
      </section>

      {/* PITFALLS */}
      <section className="bg-[#0b0d13] py-12 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">
            Common Pitfalls in Hospitality
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: Thermometer,
                title: "Missed Temperature Checks",
                text: "Fridge or freezer logs go unchecked, risking unsafe storage and food spoilage.",
              },
              {
                icon: FileX,
                title: "Paper-Based Records",
                text: "Manual logbooks get misplaced or illegible — a nightmare during inspections.",
              },
              {
                icon: ClipboardX,
                title: "Inconsistent Cleaning Schedules",
                text: "Missed or late cleaning logs increase contamination risk and inspection failures.",
              },
              {
                icon: Users,
                title: "Untrained Staff",
                text: "Staff forget key safety steps or fail to record checks correctly.",
              },
              {
                icon: Ban,
                title: "Expired Certificates",
                text: "Lapsed hygiene or equipment certificates lead to fines or closure.",
              },
              {
                icon: AlertTriangle,
                title: "Reactive Issue Management",
                text: "Problems only get fixed after complaints — hurting reputation and loyalty.",
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
                title: "Automated Equipment Monitoring",
                text: "Track fridge and freezer temperatures in real time — alerts before stock loss.",
              },
              {
                title: "Digital Cleaning Logs",
                text: "Replace paper checklists with timestamped digital records on any device.",
              },
              {
                title: "Training & Accountability",
                text: "Assign recurring tasks and log completions automatically for inspections.",
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

          <div className="text-center mt-10">
            <h3 className="text-xl font-semibold mb-4 text-white">
              Protect your guests, your staff, and your reputation.
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
