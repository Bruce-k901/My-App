"use client";

import Link from "next/link";
import DarkVeil from "@/components/ui/DarkVeil";
import GlassCard from "@/components/ui/GlassCard";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui";

export default function PricingPage() {
  return (
    <>
      {/* Single DarkVeil Background Container */}
      <div className="relative overflow-hidden">
        {/* Single DarkVeil Background - covers entire page */}
        <div className="absolute inset-0 w-full h-full -z-0">
          <div className="w-full h-full min-h-screen">
            <DarkVeil />
          </div>
        </div>

        {/* HERO */}
        <section className="relative text-center pt-6 pb-8 sm:pb-10 md:pt-8 md:pb-12 min-h-[350px] sm:min-h-[400px] flex flex-col justify-start">
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-6 sm:pt-8">
            <h1 className="hero-title text-3xl sm:text-4xl md:text-6xl font-bold leading-[1.15] bg-gradient-to-r from-magenta-400 to-blue-500 bg-clip-text text-transparent mb-4 sm:mb-6 px-2">
              Less paperwork. More progress.
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-checkly-gray max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
              Keep your sites compliant, your teams organised, and your fridges under control. Try
              Checkly free for 14 days — no credit card needed.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 px-4">
              <Link href="/signup">
                <Button variant="primary">Start Free Trial</Button>
              </Link>
              <Link href="/contact">
                <Button variant="primary">Book a Demo</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* PRICING GRID */}
        <section className="relative px-4 sm:px-6 -mt-12 sm:-mt-16 md:-mt-24 pb-10 sm:pb-14 text-gray-200">
          <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* STARTER */}
          <GlassCard className="max-w-none flex flex-col min-h-[480px] hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)]">
            <h3 className="text-2xl font-semibold text-white mb-2">Starter</h3>
            <p className="text-gray-400 mb-6">For single cafés, restaurants, or bakeries</p>
            <p className="text-4xl font-bold text-blue-400 mb-2">£40</p>
            <p className="text-gray-400 mb-6">per site / month</p>
            <ul className="space-y-2 mb-8">
              {[
                "Digital checklists & task logging",
                "Temperature logging & alerts",
                "Maintenance & PPM tracking",
                "Audit-ready reports",
                "Mobile & desktop access",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-1" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="block text-center mt-auto">
              <Button variant="primary" fullWidth>Start Free Trial</Button>
            </Link>
          </GlassCard>

          {/* PRO */}
          <GlassCard className="max-w-none relative flex flex-col min-h-[480px] hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)]">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-magenta-400 text-black px-3 py-1 rounded-full text-sm font-semibold">
              Most Popular
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">Pro</h3>
            <p className="text-gray-400 mb-6">For multi-site operators & growing groups</p>
            <p className="text-4xl font-bold text-magenta-400 mb-2">£55</p>
            <p className="text-gray-400 mb-6">per site / month</p>
            <ul className="space-y-2 mb-8">
              {[
                "Everything in Starter",
                "Multi-site dashboards",
                "Scheduled reporting",
                "Custom task templates",
                "Corrective action tracking",
                "Supplier & asset register",
                "Role-based permissions",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-1" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="block text-center mt-auto">
              <Button variant="primary" fullWidth>Start Free Trial</Button>
            </Link>
          </GlassCard>

          {/* ENTERPRISE */}
          <GlassCard className="max-w-none flex flex-col min-h-[480px] hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)]">
            <h3 className="text-2xl font-semibold text-white mb-2">Enterprise</h3>
            <p className="text-gray-400 mb-6">For hotels, schools, and multi-venue operators</p>
            <p className="text-4xl font-bold text-blue-400 mb-2">Custom</p>
            <p className="text-gray-400 mb-6">pricing available</p>
            <ul className="space-y-2 mb-8">
              {[
                "Everything in Pro",
                "API & integration access",
                "Custom workflows",
                "SSO & data security",
                "Advanced analytics",
                "Dedicated account manager",
                "SLA & rollout assistance",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-1" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link href="/contact" className="block text-center mt-auto">
              <Button variant="primary" fullWidth>Contact Sales</Button>
            </Link>
          </GlassCard>
          </div>
        </section>

        {/* ADD-ONS */}
        <section className="relative px-4 sm:px-6 py-8 sm:py-12 text-gray-200">
          <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-white px-4">Optional Add-ons</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-left">
            <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-white/10">
              <h4 className="text-lg font-semibold text-magenta-400 mb-2">Smart Sensor Bundles</h4>
              <p className="text-gray-400">
                Plug-and-play temperature probes for fridges, freezers, and prep areas.
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-white/10">
              <h4 className="text-lg font-semibold text-magenta-400 mb-2">
                Maintenance Hardware Kit
              </h4>
              <p className="text-gray-400">QR or NFC tags for fault tracking and PPM checks.</p>
            </div>
            <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-white/10">
              <h4 className="text-lg font-semibold text-magenta-400 mb-2">White-Label Reports</h4>
              <p className="text-gray-400">
                Custom branded reports for audits and EHO inspections.
              </p>
            </div>
          </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative flex flex-col items-center justify-center text-center px-4 sm:px-6 py-8 sm:py-10 pb-10 sm:pb-14">
          <div className="relative z-10 max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-white px-4">
              Ready to take your operation digital?
            </h2>
            <p className="text-gray-400 mb-6 sm:mb-8 max-w-xl mx-auto px-4 text-sm sm:text-base">
              Start with a free 14-day trial or speak to our team about rolling Checkly out across your
              group.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 px-4">
              <Link href="/signup">
                <Button variant="primary">Start Free Trial</Button>
              </Link>
              <Link href="/contact">
                <Button variant="primary">Contact Sales</Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}