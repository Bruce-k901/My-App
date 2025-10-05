"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function PricingPage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-16 bg-[#0b0d13]">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-magenta-400 to-blue-500 bg-clip-text text-transparent">
            Less paperwork. More progress.
          </h1>
          <p className="text-gray-300 text-lg mb-8">
            Keep your sites compliant, your teams organised, and your fridges under control. Try
            Checkly free for 14 days — no credit card needed.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
            >
              Start Free Trial
            </Link>
            <Link
              href="/contact"
              className="px-6 py-3 rounded-xl border border-gray-500 text-gray-200 hover:bg-gray-800 transition"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* PRICING GRID */}
      <section className="px-6 py-20 bg-[#0e1016] text-gray-200">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* STARTER */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-md p-8 border border-white/10">
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
            <Link
              href="/signup"
              className="block text-center px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
            >
              Start Free Trial
            </Link>
          </div>

          {/* PRO */}
          <div className="rounded-2xl bg-white/10 backdrop-blur-md p-8 border-2 border-magenta-400 shadow-lg relative">
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
            <Link
              href="/signup"
              className="block text-center px-6 py-3 rounded-xl bg-magenta-500 hover:bg-magenta-600 text-black font-semibold transition"
            >
              Start Free Trial
            </Link>
          </div>

          {/* ENTERPRISE */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-md p-8 border border-white/10">
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
            <Link
              href="/contact"
              className="block text-center px-6 py-3 rounded-xl border border-gray-500 text-gray-200 hover:bg-gray-800 transition"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* ADD-ONS */}
      <section className="px-6 py-20 bg-[#0b0d13] text-gray-200">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8 text-white">Optional Add-ons</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
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
      <section className="flex flex-col items-center justify-center text-center px-6 py-16 bg-[#0e1016]">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
          Ready to take your operation digital?
        </h2>
        <p className="text-gray-400 mb-8 max-w-xl">
          Start with a free 14-day trial or speak to our team about rolling Checkly out across your
          group.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/signup"
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
          >
            Start Free Trial
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 rounded-xl border border-gray-500 text-gray-200 hover:bg-gray-800 transition"
          >
            Contact Sales
          </Link>
        </div>
      </section>
    </MarketingSubPageLayout>
  );
}
