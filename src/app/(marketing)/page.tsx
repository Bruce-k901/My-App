"use client";

import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";
import Link from "next/link";

export default function HomePage() {
  return (
    <MarketingSubPageLayout>
      <section className="min-h-[85vh] flex flex-col items-center justify-center text-center px-6 pt-12">
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
    </MarketingSubPageLayout>
  );
}
