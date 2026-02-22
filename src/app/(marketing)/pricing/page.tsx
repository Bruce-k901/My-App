"use client";

import Link from "next/link";
import DarkVeil from "@/components/ui/DarkVeil";
import GlassCard from "@/components/ui/GlassCard";
import {
  CheckCircle2,
  ClipboardCheck,
  Package,
  Users,
  Factory,
  Wrench,
  MessageSquare,
  HelpCircle,
  ChevronDown,
} from "@/components/ui/icons";
import { useState } from "react";

const modules = [
  {
    name: "Checkly",
    tagline: "Compliance & Quality Control",
    icon: ClipboardCheck,
    color: "#F1E194",
    features: [
      "Digital checklists & task logging",
      "Temperature monitoring & alerts",
      "Audit-ready compliance reports",
      "Corrective action tracking",
    ],
  },
  {
    name: "Stockly",
    tagline: "Inventory & Purchasing",
    icon: Package,
    color: "#789A99",
    features: [
      "Real-time stock levels",
      "AI-powered invoice processing",
      "Supplier management",
      "Purchase order automation",
    ],
  },
  {
    name: "Teamly",
    tagline: "People & Payroll",
    icon: Users,
    color: "#D37E91",
    features: [
      "Staff scheduling & rotas",
      "Time & attendance tracking",
      "Holiday & absence management",
      "Payroll integration ready",
    ],
  },
  {
    name: "Planly",
    tagline: "Production & Orders",
    icon: Factory,
    color: "#ACC8A2",
    features: [
      "Production planning",
      "Customer order management",
      "Recipe scaling",
      "Batch tracking",
    ],
  },
  {
    name: "Assetly",
    tagline: "Asset Management",
    icon: Wrench,
    color: "#F3E7D9",
    features: [
      "Equipment tracking",
      "PPM scheduling",
      "Fault reporting",
      "Maintenance history",
    ],
  },
  {
    name: "Msgly",
    tagline: "Team Communication",
    icon: MessageSquare,
    color: "#CBDDE9",
    features: [
      "In-app messaging",
      "Task notifications",
      "Team announcements",
      "Shift handover notes",
    ],
  },
];

const faqs = [
  {
    question: "What happens after the 60-day trial?",
    answer:
      "You'll receive a monthly invoice for £300 per site. No automatic payments are set up — we invoice manually via email. You can continue using Opsly without interruption.",
  },
  {
    question: "Is there a contract or minimum commitment?",
    answer:
      "No long-term contracts. We ask for 60 days written notice if you decide to cancel, which gives us time to help with data exports and transition.",
  },
  {
    question: "Can I add more sites later?",
    answer:
      "Absolutely. You can add sites at any time and your monthly invoice will adjust accordingly. Each site is £300/month with full access to all modules.",
  },
  {
    question: "What's the cancellation policy?",
    answer:
      "We require 60 days written notice to cancel. During this period, you can request a full data export. There are no cancellation fees.",
  },
  {
    question: "Do you offer discounts for multiple sites?",
    answer:
      "We offer flexible pricing for multi-site operators. Get in touch with our team to discuss your specific needs and we'll work out the best arrangement.",
  },
  {
    question: "What's included in the onboarding package?",
    answer:
      "Our £750 per site onboarding includes 2 days of on-site setup, staff training, complete data migration, bulk imports (products, suppliers, staff, recipes), and dedicated support throughout the process.",
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <div className="relative overflow-hidden bg-[#0B0D13]">
        {/* Background */}
        <div className="fixed inset-0 w-full h-full -z-0 pointer-events-none">
          <DarkVeil />
        </div>

        {/* HERO */}
        <section className="relative text-center pt-8 pb-12 sm:pt-12 sm:pb-16 md:pt-16 md:pb-20 min-h-[450px] sm:min-h-[500px] flex flex-col justify-center">
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 md:px-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.15] text-[#e8e8e8] mb-6">
              One platform. One price.
              <br />
              Everything you need.
            </h1>
            <p className="text-lg sm:text-xl text-theme-tertiary max-w-3xl mx-auto mb-4 px-2">
              Replace spreadsheets, paper checklists, and disconnected tools
              with a single platform that runs your entire operation.
            </p>
            <p className="text-base text-theme-tertiary max-w-2xl mx-auto mb-8 px-2">
              No hidden fees. No per-user charges. No feature gates.
            </p>

            {/* Price Hero */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-8 sm:p-10 max-w-lg mx-auto mb-8">
              <p className="text-5xl sm:text-6xl md:text-7xl font-bold text-theme-primary mb-2">
                £300
              </p>
              <p className="text-xl text-theme-tertiary mb-1">per site / month</p>
              <p className="text-sm text-theme-tertiary mb-6">
                That's less than £10/day for complete operations management
              </p>
              <Link href="/signup" className="block btn-marketing-primary w-full text-center text-lg">
                Start Your 60-Day Free Trial
              </Link>
              <p className="text-xs text-theme-tertiary mt-3">
                No credit card required • Full access to everything
              </p>
            </div>
          </div>
        </section>

        {/* WHAT'S INCLUDED */}
        <section className="relative px-4 sm:px-6 py-12 sm:py-16 text-gray-200">
          <div className="relative z-10 max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-14">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-theme-primary mb-4">
                Six modules. One subscription.
              </h2>
              <p className="text-theme-tertiary max-w-2xl mx-auto">
                Every Opsly subscription includes full access to all modules.
                No upsells, no tier restrictions — just everything you need to
                run your operation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <GlassCard
                    key={module.name}
                    className="flex flex-col hover:border-white/20"
                    style={{
                      boxShadow: 'none',
                      transition: 'border-color 0.3s, box-shadow 0.3s',
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 15px ${module.color}15`;
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${module.color}12` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: module.color }} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold" style={{ color: module.color }}>
                          {module.name}
                        </h3>
                        <p className="text-sm text-theme-tertiary">{module.tagline}</p>
                      </div>
                    </div>
                    <ul className="space-y-2 flex-1">
                      {module.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: `${module.color}99` }} />
                          <span className="text-sm text-theme-tertiary">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </section>

        {/* VALUE COMPARISON */}
        <section className="relative px-4 sm:px-6 py-12 sm:py-16 text-gray-200">
          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 sm:p-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-theme-primary text-center mb-6">
                Think of it as a fractional ops director
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center p-6 bg-white/5 rounded-xl">
                  <p className="text-4xl font-bold text-[#e8e8e8] mb-2">
                    £300
                  </p>
                  <p className="text-theme-tertiary mb-1">per month with Opsly</p>
                  <p className="text-sm text-theme-tertiary">
                    Full operations platform
                  </p>
                </div>
                <div className="text-center p-6 bg-white/5 rounded-xl">
                  <p className="text-4xl font-bold text-theme-tertiary mb-2">
                    £2,000+
                  </p>
                  <p className="text-theme-tertiary mb-1">Part-time ops manager</p>
                  <p className="text-sm text-theme-tertiary">
                    Still needs tools to work with
                  </p>
                </div>
              </div>
              <p className="text-center text-theme-tertiary mt-6 text-sm">
                Opsly replaces 3–4 separate subscriptions (compliance software,
                inventory system, scheduling tool, task management) with one
                integrated platform.
              </p>
            </div>
          </div>
        </section>

        {/* ONBOARDING */}
        <section className="relative px-4 sm:px-6 py-12 sm:py-16 text-gray-200">
          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-block px-4 py-2 bg-white/[0.05] rounded-full border border-white/20 mb-4">
                <span className="text-sm font-medium text-theme-primary">
                  Optional Add-on
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-theme-primary mb-4">
                Personalized Onboarding
              </h2>
              <p className="text-theme-tertiary max-w-2xl mx-auto">
                Let us handle the heavy lifting. Our team will set everything up
                for you and train your staff on-site.
              </p>
            </div>

            <GlassCard className="max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <p className="text-4xl font-bold text-theme-primary mb-1">£750</p>
                <p className="text-theme-tertiary">per site (one-time)</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  "Complete site setup & configuration",
                  "Bulk data import (products, suppliers, staff, recipes)",
                  "Template & checklist configuration",
                  "2-day on-site staff training",
                  "Custom workflow setup",
                  "Dedicated onboarding specialist",
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-white/50 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-theme-tertiary">{feature}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </section>

        {/* FAQ */}
        <section className="relative px-4 sm:px-6 py-12 sm:py-16 text-gray-200">
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-theme-primary text-center mb-10">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <span className="font-medium text-theme-primary pr-4">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-theme-tertiary flex-shrink-0 transition-transform ${
                        openFaq === index ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openFaq === index && (
                    <div className="px-5 pb-5 pt-0">
                      <p className="text-theme-tertiary text-sm">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative flex flex-col items-center justify-center text-center px-4 sm:px-6 py-12 sm:py-16 pb-16 sm:pb-20">
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-theme-primary">
              Ready to streamline your operations?
            </h2>
            <p className="text-theme-tertiary mb-8 max-w-xl mx-auto">
              Start your 60-day free trial today. No credit card required, no
              strings attached. Just full access to everything Opsly has to
              offer.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
              <Link href="/signup" className="btn-marketing-primary text-lg">
                Start Your 60-Day Free Trial
              </Link>
              <Link href="/contact" className="btn-marketing-secondary text-lg">
                Questions? Get in Touch
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
