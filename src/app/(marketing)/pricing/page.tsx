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
      <div className="relative overflow-hidden bg-[#0B0D13]">
        {/* Single DarkVeil Background - covers viewport, container bg covers overflow */}
        <div className="fixed inset-0 w-full h-full -z-0 pointer-events-none">
          <DarkVeil />
        </div>

        {/* HERO */}
        <section className="relative text-center pt-6 pb-8 sm:pb-10 md:pt-8 md:pb-12 min-h-[350px] sm:min-h-[400px] flex flex-col justify-start">
          <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 md:px-10 pt-6 sm:pt-8">
            <h1 className="hero-title text-3xl sm:text-4xl md:text-6xl font-bold leading-[1.15] bg-gradient-to-r from-magenta-400 to-blue-500 bg-clip-text text-transparent mb-4 sm:mb-6">
              Less paperwork. More progress.
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-checkly-gray max-w-2xl mx-auto mb-6 sm:mb-8 px-2 sm:px-4">
              Keep your sites compliant, your teams organised, and your fridges under control. Try
              Opsly free for 14 days — no credit card needed.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 px-2 sm:px-4 mb-4 sm:mb-0">
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
        <section className="relative px-3 sm:px-6 mt-8 sm:-mt-16 md:-mt-24 pb-10 sm:pb-14 text-gray-200">
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

        {/* SMART TEMPERATURE SENSORS - OPTIONAL ADD-ON */}
        <section className="relative px-3 sm:px-6 py-12 sm:py-16 md:py-20 text-gray-200">
          <div className="relative z-10 max-w-7xl mx-auto">
            {/* Visual Separator with Background */}
            <div className="relative mb-12 sm:mb-16 md:mb-20">
              {/* Background gradient for visual separation */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent -mx-4 sm:-mx-8 md:-mx-12"></div>
              
              {/* Divider */}
              <div className="text-center mb-10 sm:mb-12 relative">
                <div className="inline-block px-6 py-3 bg-gradient-to-r from-[#EC4899]/20 to-blue-500/20 rounded-full border-2 border-[#EC4899]/30 mb-8 shadow-lg">
                  <span className="text-base sm:text-lg font-semibold text-white">Optional Add-ons</span>
                </div>
              </div>

              <div className="text-center mb-12 sm:mb-16 relative">
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white px-2 sm:px-4 bg-gradient-to-r from-magenta-400 to-blue-500 bg-clip-text text-transparent">
                  Smart Temperature Sensors
                </h2>
                <p className="text-base sm:text-lg text-[#EC4899] mb-4 px-2 sm:px-4 font-medium">Optional Add-on</p>
                <p className="text-base sm:text-lg text-gray-300 max-w-4xl mx-auto px-2 sm:px-4 mb-6 leading-relaxed">
                  Plug-and-play temperature monitoring for fridges, freezers, and prep areas. Automatic logging, instant breach alerts, and EHO-ready compliance reports. Stop worrying about stock losses.
                </p>
                {/* How It Works - Combined */}
                <div className="mt-8 max-w-3xl mx-auto px-2 sm:px-4">
                  <div className="bg-gradient-to-r from-[#EC4899]/10 to-blue-500/10 rounded-xl p-6 border border-[#EC4899]/20 mb-6">
                    <p className="text-base font-semibold text-white mb-2 text-center">How It Works:</p>
                    <p className="text-sm text-gray-300 text-center">
                      Choose <strong className="text-white">one hardware pack</strong> (physical sensors) + <strong className="text-white">one software tier</strong> (monitoring features). The hardware pack is a one-time purchase, and the software tier is billed monthly per site.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SENSOR HARDWARE PACKS - One-time purchase */}
            <div className="mb-16 sm:mb-20">
              <div className="text-center mb-6">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Step 1: Choose Your Hardware Pack</h3>
                <p className="text-gray-400 text-sm sm:text-base">One-time purchase • Free replacement for faulty units within warranty period</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 mb-8">
                {/* Starter Pack */}
                <GlassCard className="flex flex-col min-h-[400px] sm:min-h-[450px]">
                  <div className="mb-6">
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-3">Starter</h3>
                    <p className="text-4xl sm:text-5xl font-bold text-blue-400 mb-2">£250</p>
                    <p className="text-base text-gray-400">one-time</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-3">What's included:</p>
                    <ul className="space-y-2 mb-4">
                      {[
                        "2 wireless temperature sensors",
                        "Monitors 1 fridge + 1 freezer",
                        "WiFi connected, no wiring needed",
                        "5-minute reading intervals",
                        "Setup guide included",
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-gray-400">
                        Best for: Single fridge + freezer
                      </p>
                    </div>
                  </div>
                </GlassCard>

                {/* Standard Pack */}
                <GlassCard className="flex flex-col relative border-magenta-400/50 min-h-[400px] sm:min-h-[450px]">
                  <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-magenta-400 text-black px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                    Most Popular
                  </div>
                  <div className="mb-6">
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-3">Standard</h3>
                    <p className="text-4xl sm:text-5xl font-bold text-magenta-400 mb-2">£575</p>
                    <p className="text-base text-gray-400">one-time</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-3">What's included:</p>
                    <ul className="space-y-2 mb-4">
                      {[
                        "5 wireless temperature sensors",
                        "Cover walk-in chiller, display fridges, freezer",
                        "WiFi connected, no wiring needed",
                        "5-minute reading intervals",
                        "Setup guide + phone support",
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-gray-400">
                        Best for: Small kitchen setup
                      </p>
                    </div>
                  </div>
                </GlassCard>

                {/* Professional Pack */}
                <GlassCard className="flex flex-col min-h-[400px] sm:min-h-[450px]">
                  <div className="mb-6">
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-3">Professional</h3>
                    <p className="text-4xl sm:text-5xl font-bold text-blue-400 mb-2">£1,000</p>
                    <p className="text-base text-gray-400">one-time</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-3">What's included:</p>
                    <ul className="space-y-2 mb-4">
                      {[
                        "10 wireless temperature sensors",
                        "Full kitchen & storage coverage",
                        "WiFi connected, no wiring needed",
                        "5-minute reading intervals",
                        "On-site setup assistance available",
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-gray-400">
                        Best for: Full kitchen coverage
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>

            {/* Connecting Arrow/Divider */}
            <div className="flex items-center justify-center mb-12 sm:mb-16">
              <div className="flex items-center gap-4">
                <div className="h-px bg-gradient-to-r from-transparent via-[#EC4899]/40 to-[#EC4899]/40 w-24 sm:w-32"></div>
                <div className="bg-[#EC4899]/20 border border-[#EC4899]/40 rounded-full px-4 py-2">
                  <span className="text-sm font-semibold text-white">+</span>
                </div>
                <div className="h-px bg-gradient-to-l from-transparent via-[#EC4899]/40 to-[#EC4899]/40 w-24 sm:w-32"></div>
              </div>
            </div>

            {/* MONITORING SOFTWARE TIERS - Monthly per site */}
            <div className="mb-12 sm:mb-16">
              <div className="text-center mb-6">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Step 2: Choose Your Software Tier</h3>
                <p className="text-gray-400 text-sm sm:text-base">Monthly per site • Cancel anytime • Works with any hardware pack</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
                {/* Essential */}
                <GlassCard className="flex flex-col min-h-[400px] sm:min-h-[450px]">
                  <div className="mb-6">
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-3">Essential</h3>
                    <p className="text-4xl sm:text-5xl font-bold text-blue-400 mb-2">£25</p>
                    <p className="text-base text-gray-400">per site / month</p>
                  </div>
                  <div className="flex-1">
                    <ul className="space-y-2 mb-4">
                      {[
                        "Live temperature dashboard",
                        "Automatic hourly logging",
                        "Daily compliance report",
                        "EHO-ready PDF export",
                        "Basic email alerts",
                        "30-day data history",
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-gray-400">
                        Best for: Small cafés, bakeries, or single-site operators who need basic compliance coverage.
                      </p>
                    </div>
                  </div>
                </GlassCard>

                {/* Professional */}
                <GlassCard className="flex flex-col relative border-magenta-400/50 min-h-[400px] sm:min-h-[450px]">
                  <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-magenta-400 text-black px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                    Most Popular
                  </div>
                  <div className="mb-6">
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-3">Professional</h3>
                    <p className="text-4xl sm:text-5xl font-bold text-magenta-400 mb-2">£35</p>
                    <p className="text-base text-gray-400">per site / month</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-3">Everything in Essential, plus:</p>
                    <ul className="space-y-2 mb-4">
                      {[
                        "SMS + push notifications",
                        "Multi-threshold alarms (warning + critical)",
                        "24hr breach tracking & timeline",
                        "Analytics (patterns, slow cooling, warm spots)",
                        "Hardware warranty replacement",
                        "90-day data history",
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-gray-400">
                        Best for: Busy kitchens with 3+ units who can't afford stock losses. Most popular choice.
                      </p>
                    </div>
                  </div>
                </GlassCard>

                {/* Business */}
                <GlassCard className="flex flex-col min-h-[400px] sm:min-h-[450px]">
                  <div className="mb-6">
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-3">Business</h3>
                    <p className="text-4xl sm:text-5xl font-bold text-blue-400 mb-2">£55</p>
                    <p className="text-base text-gray-400">per site / month</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-3">Everything in Professional, plus:</p>
                    <ul className="space-y-2 mb-4">
                      {[
                        "Predictive failure warnings",
                        "Automatic engineer callout integration",
                        "24/7 response escalation",
                        "Multi-site group dashboard",
                        "Weekly health reports",
                        "Unlimited data history",
                        "Priority hardware replacement",
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-gray-400">
                        Best for: Restaurant groups, hotels, dark kitchens, and operators who need total peace of mind.
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        </section>

        {/* ASSET TAGS - OPTIONAL ADD-ON */}
        <section className="relative px-3 sm:px-6 py-12 sm:py-16 md:py-20 text-gray-200">
          <div className="relative z-10 max-w-7xl mx-auto">
            {/* Visual Separator with Background */}
            <div className="relative mb-12 sm:mb-16 md:mb-20">
              {/* Background gradient for visual separation */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent -mx-4 sm:-mx-8 md:-mx-12"></div>
              
              {/* Divider */}
              <div className="text-center mb-10 sm:mb-12 relative">
                <div className="inline-block px-6 py-3 bg-gradient-to-r from-[#EC4899]/20 to-blue-500/20 rounded-full border-2 border-[#EC4899]/30 mb-8 shadow-lg">
                  <span className="text-base sm:text-lg font-semibold text-white">Optional Add-ons</span>
                </div>
              </div>

              <div className="text-center mb-12 sm:mb-16 relative">
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white px-2 sm:px-4 bg-gradient-to-r from-magenta-400 to-blue-500 bg-clip-text text-transparent">
                  Asset Tags
                </h2>
                <p className="text-base sm:text-lg text-[#EC4899] mb-4 px-2 sm:px-4 font-medium">Optional Add-on</p>
                <p className="text-base sm:text-lg text-gray-300 max-w-4xl mx-auto px-2 sm:px-4 mb-6 leading-relaxed">
                  Give your equipment a digital passport. Physical tags that staff and contractors scan to access service history, report faults, and log maintenance visits. No more chasing paperwork or forgotten serial numbers.
                </p>
                {/* How It Works - Combined */}
                <div className="mt-8 max-w-3xl mx-auto px-2 sm:px-4">
                  <div className="bg-gradient-to-r from-[#EC4899]/10 to-blue-500/10 rounded-xl p-6 border border-[#EC4899]/20 mb-6">
                    <p className="text-base font-semibold text-white mb-2 text-center">How It Works:</p>
                    <p className="text-sm text-gray-300 text-center mb-4">
                      Choose <strong className="text-white">one tag pack</strong> (physical tags) + <strong className="text-white">one software tier</strong> (scanning features). The tag pack is a one-time purchase, and the software tier is billed monthly per site.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left">
                      <div className="bg-white/8 rounded-lg p-3 border border-white/20">
                        <p className="text-xs sm:text-sm font-semibold text-white mb-1">1. Choose</p>
                        <p className="text-xs text-gray-300">Select tag pack & software tier</p>
                      </div>
                      <div className="bg-white/8 rounded-lg p-3 border border-white/20">
                        <p className="text-xs sm:text-sm font-semibold text-white mb-1">2. Ship</p>
                        <p className="text-xs text-gray-300">We send tags with setup guide</p>
                      </div>
                      <div className="bg-white/8 rounded-lg p-3 border border-white/20">
                        <p className="text-xs sm:text-sm font-semibold text-white mb-1">3. Link</p>
                        <p className="text-xs text-gray-300">Connect tags to assets in Opsly</p>
                      </div>
                      <div className="bg-white/8 rounded-lg p-3 border border-white/20">
                        <p className="text-xs sm:text-sm font-semibold text-white mb-1">4. Scan</p>
                        <p className="text-xs text-gray-300">Staff & contractors access everything</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TAG PACKS - One-time purchase */}
            <div className="mb-16 sm:mb-20">
              <div className="text-center mb-6">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Step 1: Choose Your Tag Pack</h3>
                <p className="text-gray-400 text-sm sm:text-base">One-time purchase • Free replacement tags included</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-8">
                {/* Starter */}
                <GlassCard className="flex flex-col min-h-[400px] sm:min-h-[450px]">
                  <div className="mb-6">
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-3">Starter</h3>
                    <p className="text-4xl sm:text-5xl font-bold text-blue-400 mb-2">£25</p>
                    <p className="text-base text-gray-400">one-time</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-3">What's included:</p>
                    <ul className="space-y-2 mb-4">
                      {[
                        "20 durable QR stickers",
                        "Waterproof polyester material",
                        "Setup guide included",
                        "Free replacement tags",
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </GlassCard>

                {/* Professional */}
                <GlassCard className="flex flex-col relative border-magenta-400/50 min-h-[400px] sm:min-h-[450px]">
                  <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-magenta-400 text-black px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                    Most Popular
                  </div>
                  <div className="mb-6">
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-3">Professional</h3>
                    <p className="text-4xl sm:text-5xl font-bold text-magenta-400 mb-2">£50</p>
                    <p className="text-base text-gray-400">one-time</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-3">What's included:</p>
                    <ul className="space-y-2 mb-4">
                      {[
                        "20 NFC tags (tap to scan)",
                        "Works on metal surfaces",
                        "Better durability for high-use areas",
                        "Free replacement tags",
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </GlassCard>

                {/* Premium */}
                <GlassCard className="flex flex-col min-h-[400px] sm:min-h-[450px]">
                  <div className="mb-6">
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-3">Premium</h3>
                    <p className="text-4xl sm:text-5xl font-bold text-blue-400 mb-2">£100</p>
                    <p className="text-base text-gray-400">one-time</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-3">What's included:</p>
                    <ul className="space-y-2 mb-4">
                      {[
                        "20 industrial-grade tags",
                        "Chemical & heat resistant",
                        "Screwable or adhesive mounting",
                        "Lifetime free replacements",
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
            </div>

            {/* Connecting Arrow/Divider */}
            <div className="flex items-center justify-center mb-12 sm:mb-16">
              <div className="flex items-center gap-4">
                <div className="h-px bg-gradient-to-r from-transparent via-[#EC4899]/40 to-[#EC4899]/40 w-24 sm:w-32"></div>
                <div className="bg-[#EC4899]/20 border border-[#EC4899]/40 rounded-full px-4 py-2">
                  <span className="text-sm font-semibold text-white">+</span>
                </div>
                <div className="h-px bg-gradient-to-l from-transparent via-[#EC4899]/40 to-[#EC4899]/40 w-24 sm:w-32"></div>
              </div>
            </div>

            {/* SOFTWARE TIERS - Monthly per site */}
            <div className="mb-12 sm:mb-16">
              <div className="text-center mb-6">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Step 2: Choose Your Software Tier</h3>
                <p className="text-gray-400 text-sm sm:text-base">Monthly per site • Cancel anytime • Works with any tag pack</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
                {/* Essential */}
                <GlassCard className="flex flex-col min-h-[400px] sm:min-h-[450px]">
                  <div className="mb-6">
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-3">Essential</h3>
                    <p className="text-4xl sm:text-5xl font-bold text-blue-400 mb-2">£5</p>
                    <p className="text-base text-gray-400">per site / month</p>
                  </div>
                  <div className="flex-1">
                    <ul className="space-y-2 mb-4">
                      {[
                        "Scan to view asset details",
                        "Service history timeline",
                        "One-tap fault reporting",
                        "Photo evidence upload",
                        "Basic troubleshooting access",
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </GlassCard>

                {/* Professional */}
                <GlassCard className="flex flex-col relative border-magenta-400/50 min-h-[400px] sm:min-h-[450px]">
                  <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-magenta-400 text-black px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                    Most Popular
                  </div>
                  <div className="mb-6">
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-3">Professional</h3>
                    <p className="text-4xl sm:text-5xl font-bold text-magenta-400 mb-2">£10</p>
                    <p className="text-base text-gray-400">per site / month</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-3">Everything in Essential, plus:</p>
                    <ul className="space-y-2 mb-4">
                      {[
                        "Scheduled scan tasks (e.g., monthly equipment audits)",
                        "Contractor check-in portal",
                        "Service reminder alerts",
                        "PPM schedule integration",
                        "Supplier & warranty info display",
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </GlassCard>

                {/* Business */}
                <GlassCard className="flex flex-col min-h-[400px] sm:min-h-[450px]">
                  <div className="mb-6">
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-3">Business</h3>
                    <p className="text-4xl sm:text-5xl font-bold text-blue-400 mb-2">£20</p>
                    <p className="text-base text-gray-400">per site / month</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-3">Everything in Professional, plus:</p>
                    <ul className="space-y-2 mb-4">
                      {[
                        "Full audit trail exports (PDF/CSV)",
                        "Multi-site tag dashboard",
                        "API access for integrations",
                        "Priority support",
                        "Custom branding on scan pages",
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
        <section className="relative px-3 sm:px-6 py-8 sm:py-12 text-gray-200">
          <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-white px-2 sm:px-4">Other Optional Add-ons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 text-left">
            <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-white/10">
              <h4 className="text-lg font-semibold text-magenta-400 mb-2">Personalized Onboarding</h4>
              <p className="text-gray-400 mb-3">
                Opsly team handles your complete onboarding, including site setup, template configuration, and staff training.
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
        <section className="relative flex flex-col items-center justify-center text-center px-3 sm:px-6 py-8 sm:py-10 pb-10 sm:pb-14">
          <div className="relative z-10 max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-white px-2 sm:px-4">
              Ready to take your operation digital?
            </h2>
            <p className="text-gray-400 mb-6 sm:mb-8 max-w-xl mx-auto px-2 sm:px-4 text-sm sm:text-base">
              Start with a free 14-day trial or speak to our team about rolling Opsly out across your
              group.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 px-2 sm:px-4">
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