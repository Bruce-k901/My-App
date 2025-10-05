"use client";

import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";
import Link from "next/link";

export default function HomePage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="min-h-[85vh] flex flex-col items-center justify-center text-center px-6 pt-20">
        <h1 className="text-5xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-magenta-500 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(236,72,153,0.4)]">
          Turn Chaos into Clarity
        </h1>
        <p className="text-slate-300 max-w-2xl mx-auto text-lg leading-relaxed mb-8">
          Checkly keeps every kitchen, site, and team compliant, productive, and calm. One place for
          logs, checks, alerts, and reports — so you can focus on great food, not fire drills.
        </p>
        <Link href="/signup" className="btn-glass-cta mt-10">
          Try Checkly Free
        </Link>
      </section>

      {/* PROBLEM SECTION */}
      <section className="py-24 bg-[#0f121c] border-t border-neutral-800 text-center">
        <h2 className="text-3xl font-semibold mb-10 text-white">Have you ever experienced…</h2>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-6">
          <div className="bg-[#141823] rounded-2xl p-6 border border-neutral-800 hover:border-magenta-500/40 transition">
            <p className="text-lg font-semibold text-white mb-2">Last-minute EHO panic?</p>
            <p className="text-slate-400 text-sm">
              Missing records, lost temp logs, and a mad dash to print “evidence” before inspection.
            </p>
          </div>
          <div className="bg-[#141823] rounded-2xl p-6 border border-neutral-800 hover:border-magenta-500/40 transition">
            <p className="text-lg font-semibold text-white mb-2">Reactive maintenance chaos?</p>
            <p className="text-slate-400 text-sm">
              Machines breaking mid-service, no records of last checks, and endless WhatsApp
              threads.
            </p>
          </div>
          <div className="bg-[#141823] rounded-2xl p-6 border border-neutral-800 hover:border-magenta-500/40 transition">
            <p className="text-lg font-semibold text-white mb-2">Too many tools?</p>
            <p className="text-slate-400 text-sm">
              Tasks in one app, fridge temps in another, and reports buried in someone’s inbox.
            </p>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 bg-[#0b0e17] text-center">
        <h3 className="text-2xl font-semibold mb-6 text-white">
          Bring structure, calm, and compliance to your operation.
        </h3>
        <Link href="/signup" className="btn-glass-cta">
          Start Free Trial
        </Link>
      </section>
    </MarketingSubPageLayout>
  );
}
