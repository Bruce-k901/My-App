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
            <p className="text-gray-400 mb-6">per month (flat rate for 2+ sites)</p>
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

        {/* SMART SENSOR BUNDLES - EXPANDED SECTION */}
        <section className="relative px-4 sm:px-6 py-8 sm:py-12 text-gray-200">
          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-white px-4">
                Smart Sensor Bundles
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto px-4">
                Plug-and-play temperature monitoring for fridges, freezers, and prep areas. 
                Stop worrying about compliance and start preventing stock losses.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-8">
              {/* Tier 1 - Basic */}
              <GlassCard className="flex flex-col">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-white mb-2">Basic</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    For operators who want the bare minimum. "We'll sort the rest later."
                  </p>
                  <p className="text-3xl font-bold text-blue-400 mb-1">£35</p>
                  <p className="text-sm text-gray-400">per site / month</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white mb-3">What you get:</p>
                  <ul className="space-y-2 mb-4">
                    {[
                      "Automatic hourly temperature logs",
                      "Data stored in Checkly",
                      "Daily compliance report",
                      "EHO-ready export",
                      "Basic alerting (email only)",
                    ].map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-500 italic">
                      Best for: Small cafés, bakeries trying to look compliant, or owners who say "we'll worry about it when something breaks."
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Tier 2 - Pro */}
              <GlassCard className="flex flex-col relative border-magenta-400/50">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-magenta-400 text-black px-3 py-1 rounded-full text-xs font-semibold">
                  Most Popular
                </div>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-white mb-2">Pro</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    The adult tier. Most people pick this one.
                  </p>
                  <p className="text-3xl font-bold text-magenta-400 mb-1">£60</p>
                  <p className="text-sm text-gray-400">per site / month</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white mb-3">Everything in Basic plus:</p>
                  <ul className="space-y-2 mb-4">
                    {[
                      "SMS + push alerts",
                      "Multi-threshold alarms",
                      "24hr breach tracking",
                      "Analytics (patterns, slow cooling, warm spots)",
                      "Replacement hardware warranty",
                      "Annual probe replacement",
                    ].map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-500 italic">
                      Best for: Anyone with more than 3 fridges and a pulse. Stops £800 stock losses.
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Tier 3 - Observatory */}
              <GlassCard className="flex flex-col">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-white mb-2">Observatory</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    "We look after everything and you never think about compliance again."
                  </p>
                  <p className="text-3xl font-bold text-blue-400 mb-1">£95–£120</p>
                  <p className="text-sm text-gray-400">per site / month</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white mb-3">Everything in Pro plus:</p>
                  <ul className="space-y-2 mb-4">
                    {[
                      "Live monitoring dashboard",
                      "Weekly health report",
                      "Predictive failure warnings",
                      "Engineer callout automation",
                      "24/7 response escalation",
                      "Multi-site group analytics",
                      "Priority hardware replacement",
                      "Multi-unit discount",
                    ].map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-500 italic">
                      Best for: Restaurant groups, hotels, dark kitchens, and anyone who loses their mind if a fridge goes above 8°C.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* MAINTENANCE HARDWARE KIT - EXPANDED SECTION */}
        <section className="relative px-4 sm:px-6 py-8 sm:py-12 text-gray-200">
          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-white px-4">
                Maintenance Hardware Kit
              </h2>
              <p className="text-gray-400 max-w-3xl mx-auto px-4 mb-4">
                Give every asset a digital passport. Small physical tags (QR, NFC, or both) that staff scan 
                to instantly access PPM schedules, fault history, callouts, instruction sheets, warranty details, 
                and sensor feeds. No more chasing paperwork or forgotten serial numbers.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-8">
              {/* Basic */}
              <GlassCard className="flex flex-col">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-white mb-2">Basic</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    QR tags only. Perfect for getting started.
                  </p>
                  <p className="text-3xl font-bold text-blue-400 mb-1">£35</p>
                  <p className="text-sm text-gray-400">per site (one-time)</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white mb-3">What's included:</p>
                  <ul className="space-y-2 mb-4">
                    {[
                      "QR asset tags",
                      "Setup guide",
                      "Contractor scan instructions",
                      "Replacement tag pack",
                    ].map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </GlassCard>

              {/* Pro */}
              <GlassCard className="flex flex-col relative border-magenta-400/50">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-magenta-400 text-black px-3 py-1 rounded-full text-xs font-semibold">
                  Most Popular
                </div>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-white mb-2">Pro</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    QR + NFC tags. Better durability, contractors can tap with phone.
                  </p>
                  <p className="text-3xl font-bold text-magenta-400 mb-1">£75</p>
                  <p className="text-sm text-gray-400">per site (one-time)</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white mb-3">Everything in Basic plus:</p>
                  <ul className="space-y-2 mb-4">
                    {[
                      "NFC tags (tap to scan)",
                      "Waterproof fridge-safe variants",
                      "Better durability",
                      "Faster contractor check-ins",
                    ].map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </GlassCard>

              {/* Observatory */}
              <GlassCard className="flex flex-col">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-white mb-2">Observatory</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Premium metal tags. Multi-site bundles available.
                  </p>
                  <p className="text-3xl font-bold text-blue-400 mb-1">£125–£150</p>
                  <p className="text-sm text-gray-400">per site (one-time)</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white mb-3">Everything in Pro plus:</p>
                  <ul className="space-y-2 mb-4">
                    {[
                      "Laser-etched metal tags",
                      "Premium branding",
                      "Multi-site pack bundles",
                      "Replacement tags free for life",
                    ].map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </GlassCard>
            </div>

            {/* What the tags do */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-magenta-400 mb-3">Fault Reporting</h4>
                <p className="text-sm text-gray-300">
                  Staff tap or scan the tag, pick the fault type, upload photos or notes. Immediately creates a callout. No chasing people, no forgotten reports.
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-magenta-400 mb-3">PPM Check-in</h4>
                <p className="text-sm text-gray-300">
                  Contractor scans the tag on arrival. Checkly logs the visit, they sign off tasks on their phone. Auto-populates your PPM log.
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-magenta-400 mb-3">Daily Checks</h4>
                <p className="text-sm text-gray-300">
                  Kitchen team scans for asset-specific checks (temps, visual checks, filter checks, cleaning tasks). Perfect for compliance and EHO visits.
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-magenta-400 mb-3">Asset History</h4>
                <p className="text-sm text-gray-300">
                  Every scan opens a timeline: install date, repairs, photos, notes, costs, supplier performance, warranty claims. Multi-site groups love this.
                </p>
              </div>
            </div>

            {/* What staff see when scanning */}
            <div className="mt-8 bg-white/5 rounded-xl p-6 border border-white/10">
              <h4 className="text-lg font-semibold text-white mb-4">What staff see when they scan:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  "PPM schedule",
                  "Fault history",
                  "Live callouts",
                  "Instruction sheets",
                  "Troubleshooting steps",
                  "Warranty details",
                  "Serial number & supplier",
                  "Sensor feed (if linked)",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* OTHER ADD-ONS */}
        <section className="relative px-4 sm:px-6 py-8 sm:py-12 text-gray-200">
          <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-white px-4">Other Optional Add-ons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 text-left">
            <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-white/10">
              <h4 className="text-lg font-semibold text-magenta-400 mb-2">Personalized Onboarding</h4>
              <p className="text-gray-400 mb-3">
                Checkly team handles your complete onboarding, including site setup, template configuration, and staff training.
              </p>
              <p className="text-xl font-bold text-white">£200</p>
              <p className="text-sm text-gray-400">per site (one-time)</p>
            </div>
            <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-white/10">
              <h4 className="text-lg font-semibold text-magenta-400 mb-2">White-Label Reports</h4>
              <p className="text-gray-400 mb-3">
                Custom branded reports for audits and EHO inspections with your company logo and branding.
              </p>
              <p className="text-xl font-bold text-white">£50</p>
              <p className="text-sm text-gray-400">per month</p>
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