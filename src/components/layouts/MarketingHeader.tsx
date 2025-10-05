"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function PricingPage() {
  const glassButton =
    "btn-glass text-sm px-6 py-3 font-semibold transition hover:shadow-magenta-400/40 hover:shadow-lg hover:-translate-y-1";

  const cardStyle =
    "flex flex-col justify-between rounded-2xl bg-white/5 backdrop-blur-md p-8 border border-white/10 hover:border-magenta-400/40 hover:shadow-magenta-400/30 hover:shadow-lg transition-transform duration-300";

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
            <Link href="/signup" className={glassButton}>
              Start Free Trial
            </Link>
            <Link href="/contact" className={glassButton}>
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* PRICING GRID */}
      <section className="px-6 py-20 bg-[#0e1016] text-gray-200">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* STARTER */}
          <div className={`${cardStyle}`}>
            <div>
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
            </div>
            <div className="mt-auto pt-4">
              <Link href="/signup" className={glassButton}>
                Start Free Trial
              </Link>
            </div>
          </div>

          {/* PRO */}
          <div className={`${cardStyle} border-2 border-magenta-400 relative`}>
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-magenta-400 text-black px-3 py-1 rounded-full text-sm font-semibold">
              Most Popular
            </div>
            <div>
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
            </div>
            <div className="mt-auto pt-4">
              <Link href="/signup" className={glassButton}>
                Start Free Trial
              </Link>
            </div>
          </div>

          {/* ENTERPRISE */}
          <div className={`${cardStyle}`}>
            <div>
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
            </div>
            <div className="mt-auto pt-4">
              <Link href="/contact" className={glassButton}>
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ADD-ONS */}
      <section className="px-6 py-20 bg-[#0b0d13] text-gray-200">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12 text-white">Optional Add-ons</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left justify-center">
            {[
              {
                title: "Smart Sensor Bundles",
                desc: "Plug-and-play temperature probes for fridges, freezers, and prep areas.",
              },
              {
                title: "Maintenance Hardware Kit",
                desc: "QR or NFC tags for fault tracking and PPM checks.",
              },
              {
                title: "White-Label Reports",
                desc: "Custom branded reports for audits and EHO inspections.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white/5 backdrop-blur-md p-8 border border-white/10 hover:border-magenta-400/40 hover:shadow-magenta-400/30 hover:shadow-lg text-center transition"
              >
                <h4 className="text-lg font-semibold text-magenta-400 mb-3">{item.title}</h4>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
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
          <Link href="/signup" className={glassButton}>
            Start Free Trial
          </Link>
          <Link href="/contact" className={glassButton}>
            Contact Sales
          </Link>
        </div>
      </section>
    </MarketingSubPageLayout>
  );
}
