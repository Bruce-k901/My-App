"use client";

import Link from "next/link";
import DarkVeil from "@/components/ui/DarkVeil";
import {
  Shield,
  ClipboardCheck,
  Thermometer,
  Wrench,
  LayoutDashboard,
  Bell,
  CheckCircle2,
  ListChecks,
  BarChart3,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from '@/components/ui/icons';
import { useState } from "react";

const pitfallFeaturePairs = [
  {
    pitfall: {
      title: "Inspection Panic",
      description: "Compliance records scattered and manual exports cause stress before EHO visits.",
      icon: AlertTriangle,
    },
    feature: {
      title: "EHO-Ready Pack",
      description: "Automatic compliance export that removes inspection panic.",
      icon: Shield,
    },
  },
  {
    pitfall: {
      title: "Routines Without Reset/Proof",
      description: "Paper lists don't reset and lack logs or timestamps.",
      icon: ClipboardCheck,
    },
    feature: {
      title: "Smart Digital Checklists",
      description: "Resets daily/weekly, logged and time-stamped.",
      icon: ClipboardCheck,
    },
  },
  {
    pitfall: {
      title: "Forged or Missed Temp Logs",
      description: "Manual temperature logging can be skipped or falsified.",
      icon: AlertTriangle,
    },
    feature: {
      title: "Temperature Logging with Alerts",
      description: "Live readings, no forged data.",
      icon: Thermometer,
    },
  },
  {
    pitfall: {
      title: "Breakdown Roulette",
      description: "Reactive maintenance leads to unpredictable downtime and costs.",
      icon: AlertTriangle,
    },
    feature: {
      title: "Asset Register & PPM Scheduler",
      description: "Predictable maintenance, no breakdown roulette.",
      icon: Wrench,
    },
  },
  {
    pitfall: {
      title: "Untracked Maintenance Issues",
      description: "Problems lack evidence and stall without an end-to-end process.",
      icon: AlertTriangle,
    },
    feature: {
      title: "Maintenance & Fault Reporting",
      description: "Photo-driven issue tracking with repair lifecycle.",
      icon: Wrench,
    },
  },
  {
    pitfall: {
      title: "Fragmented Multi-Site Visibility",
      description: "Managers can't see performance and compliance across locations.",
      icon: LayoutDashboard,
    },
    feature: {
      title: "Multi-Site Dashboards",
      description: "Full visibility across all operations.",
      icon: LayoutDashboard,
    },
  },
  {
    pitfall: {
      title: "No Early Warnings",
      description: "Failures are caught too late without proactive notifications.",
      icon: AlertTriangle,
    },
    feature: {
      title: "Alerts & Escalations",
      description: "Proactive warnings before something fails.",
      icon: Bell,
    },
  },
  {
    pitfall: {
      title: "No Audit Trail",
      description: "Task completion is disputed or unverifiable.",
      icon: FileText,
    },
    feature: {
      title: "Task Verification & Audit Trail",
      description: "Indisputable evidence of completion.",
      icon: CheckCircle2,
    },
  },
  {
    pitfall: {
      title: "Inconsistent SOPs",
      description: "Policies and templates vary by site and team.",
      icon: ListChecks,
    },
    feature: {
      title: "Policy & Template Control",
      description: "Company-wide SOP standardisation.",
      icon: ListChecks,
    },
  },
  {
    pitfall: {
      title: "Blind Spots in Trends",
      description: "Compliance and cost trends aren't visible for decision-making.",
      icon: BarChart3,
    },
    feature: {
      title: "Reporting & Analytics",
      description: "Data-driven insights into compliance and cost trends.",
      icon: BarChart3,
    },
  },
];

const benefits = [
  {
    title: "Compliance without chaos",
    description: "Logs, checks, and reports in one place. Be inspection-ready without last-minute firefighting.",
  },
  {
    title: "Less reactive, more proactive",
    description: "Automate alerts, track temperature and incidents, and cut noisy WhatsApp threads.",
  },
  {
    title: "Built to scale",
    description: "Start fast, roll out across sites, and keep your head office fully in the loop.",
  },
  {
    title: "Single source of truth",
    description: "One platform for tasks, checks, logs, and incidents so everyone stays aligned.",
  },
  {
    title: "Bulletproof audit trails",
    description: "Time-stamped records and attachments give you defensible proof when it matters.",
  },
  {
    title: "Smart automation & workflows",
    description: "Assign tasks, trigger follow-ups, and auto-escalate issues to the right people.",
  },
  {
    title: "Real-time alerts & escalations",
    description: "Get notified instantly, escalate when unresolved, and reduce noisy back-and-forth.",
  },
  {
    title: "Role-based access",
    description: "Secure permissions for managers, staff, and auditors keep data safe and relevant.",
  },
  {
    title: "Integrations & API",
    description: "Connect to your tools, export data, and automate with a flexible API.",
  },
  {
    title: "Mobile-first for busy teams",
    description: "Easy on phones and tablets so field teams can log and resolve quickly.",
  },
];

const painPoints = [
  "Compliance records scattered everywhere",
  "Manual temperature logs you can't trust",
  "Reactive maintenance costing you money",
  "No visibility across sites",
  "WhatsApp chaos for every issue",
  "Hours wasted on manual exports",
];

const modules = [
  {
    id: "checkly",
    name: "Checkly",
    tagline: "Never miss a check again",
    color: "#F1E194",
    description: "Complete compliance and quality control system with digital checklists, temperature monitoring, and EHO-ready reporting.",
    features: [
      "Digital checklists & task management",
      "Temperature monitoring & alerts",
      "Asset management & PPM",
      "SOPs & risk assessments",
      "EHO readiness reporting",
      "Maintenance & fault reporting",
    ],
  },
  {
    id: "stockly",
    name: "Stockly",
    tagline: "Know what you have, everywhere",
    color: "#789A99",
    description: "Multi-site inventory management with recipe costing, waste tracking, and automated purchasing.",
    features: [
      "Multi-site inventory tracking",
      "Recipe costing & GP analysis",
      "Waste tracking & reporting",
      "Purchase orders & invoicing",
      "Supplier management",
      "Stock level alerts",
    ],
  },
  {
    id: "teamly",
    name: "Teamly",
    tagline: "Your team, organized",
    color: "#D37E91",
    description: "Complete HR and payroll solution with recruitment, scheduling, and performance management.",
    features: [
      "HR & recruitment",
      "Training & certifications",
      "Shift scheduling & rota",
      "Payroll processing",
      "Attendance & time tracking",
      "Performance reviews",
    ],
  },
  {
    id: "planly",
    name: "Planly",
    tagline: "Plan, produce, deliver",
    color: "#ACC8A2",
    description: "Production scheduling and order management for manufacturing and food production businesses.",
    features: [
      "Production scheduling",
      "Order book management",
      "Customer management",
      "Delivery planning",
      "Sales tracking & reporting",
      "Inventory integration",
    ],
  },
  {
    id: "assetly",
    name: "Assetly",
    tagline: "Keep assets running smoothly",
    color: "#F3E7D9",
    description: "Equipment tracking and maintenance management with PPM scheduling and service history.",
    features: [
      "Equipment tracking",
      "Maintenance scheduling",
      "Service history logs",
      "Asset performance metrics",
      "Fault reporting",
      "Spare parts management",
    ],
  },
  {
    id: "msgly",
    name: "Msgly",
    tagline: "Team communication, simplified",
    color: "#CBDDE9",
    description: "Team chat, channels, and task management to replace noisy WhatsApp threads.",
    features: [
      "Team chat & channels",
      "Task assignments",
      "File sharing",
      "Meeting scheduling",
      "Direct messaging",
      "Channel notifications",
    ],
  },
];

function ExpandablePair({ pair, index }: { pair: typeof pitfallFeaturePairs[0]; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/20 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 text-left flex items-center justify-between hover:bg-white/[0.05] transition"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <pair.pitfall.icon className="w-5 h-5 text-white/50" />
            <span className="text-base font-semibold text-theme-primary">{pair.pitfall.title}</span>
          </div>
          <span className="text-theme-tertiary">→</span>
          <div className="flex items-center space-x-2">
            <pair.feature.icon className="w-5 h-5 text-white/70" />
            <span className="text-base font-semibold text-white/70">{pair.feature.title}</span>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-theme-tertiary" />
        ) : (
          <ChevronDown className="w-5 h-5 text-theme-tertiary" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-white/[0.02] p-4 border border-white/10">
            <p className="text-theme-tertiary text-sm leading-relaxed">{pair.pitfall.description}</p>
          </div>
          <div className="rounded-lg bg-white/[0.02] p-4 border border-white/15">
            <p className="text-theme-secondary text-sm leading-relaxed">{pair.feature.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductPage() {
  return (
    <>
      {/* Single DarkVeil Background Container */}
      <div className="relative overflow-hidden">
        {/* Single DarkVeil Background - covers all sections */}
        <div className="absolute inset-0 w-full h-full -z-0">
          <div className="w-full h-full min-h-screen">
            <DarkVeil />
          </div>
        </div>

        {/* HERO */}
        <section className="relative text-center pt-6 pb-8 sm:pb-10 md:pt-8 md:pb-12 min-h-[350px] sm:min-h-[400px] flex flex-col justify-start">
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-6 sm:pt-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold leading-[1.15] text-[#e8e8e8] mb-4 sm:mb-6 px-2">
              One platform. Complete operations. Zero chaos.
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-checkly-gray max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
              From compliance to inventory, people to production—everything your multi-site operation needs.
            </p>
            <div className="flex justify-center gap-3 sm:gap-4 mb-0 px-4">
              <Link href="/signup" className="btn-marketing-primary">
                Get Started
              </Link>
            </div>
          </div>
        </section>

        {/* THE PROBLEM */}
        <section className="relative px-4 sm:px-6 -mt-12 sm:-mt-16 md:-mt-24 pb-10 sm:pb-14 text-gray-200">
          <div className="relative z-10 max-w-7xl mx-auto mb-6 sm:mb-8 px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-theme-primary mb-2">
              The Problem
            </h2>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {painPoints.map((point, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-white/20 hover:shadow-[0_0_10px_rgba(255,255,255,0.08)] transition"
              >
                <p className="text-theme-tertiary text-sm leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </section>

        {/* THE SOLUTION - 6 MODULES */}
        <section className="relative px-4 sm:px-6 pb-10 sm:pb-14 text-gray-200">
          <div className="relative z-10 max-w-7xl mx-auto mb-6 sm:mb-8 px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-theme-primary mb-2">
              The Solution
            </h2>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {modules.map((module) => (
              <div
                key={module.id}
                className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-white/20 hover:shadow-[0_0_10px_rgba(255,255,255,0.08)] transition"
              >
                <h3 className="text-xl font-semibold text-theme-primary mb-2">{module.name}</h3>
                <p className="text-white/70 text-sm mb-3">{module.tagline}</p>
                <p className="text-theme-tertiary text-sm mb-4 leading-relaxed">{module.description}</p>
                <Link href={`#${module.id}`} className="text-white/70 hover:text-white text-sm font-medium">
                  Learn more →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS - Pitfall-Feature Pairs */}
        <section className="relative px-4 sm:px-6 pb-10 sm:pb-14 text-gray-200">
          <div className="relative z-10 max-w-7xl mx-auto mb-6 sm:mb-8 px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-theme-primary mb-2">
              How It Works
            </h2>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto space-y-4">
            {pitfallFeaturePairs.map((pair, idx) => (
              <ExpandablePair key={idx} pair={pair} index={idx} />
            ))}
          </div>
        </section>

        {/* MODULE DEEP-DIVES */}
        {modules.map((module) => (
          <section
            key={module.id}
            id={module.id}
            className="relative px-4 sm:px-6 pb-10 sm:pb-14 text-gray-200 scroll-mt-20"
          >
            <div className="relative z-10 max-w-7xl mx-auto mb-6 sm:mb-8 px-4 sm:px-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-2" style={{ color: module.color }}>
                {module.name}
              </h2>
              <p className="text-center text-white/70 text-sm sm:text-base">{module.tagline}</p>
            </div>
            <div className="relative z-10 max-w-7xl mx-auto">
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 sm:p-8 border border-white/20">
                <p className="text-theme-tertiary mb-6 leading-relaxed">{module.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {module.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: `${module.color}99` }} />
                      <span className="text-sm text-theme-tertiary">{feature}</span>
                    </div>
                  ))}
                </div>
                {/* Screenshot placeholder */}
                <div className="mt-6 aspect-video rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10" />
              </div>
            </div>
          </section>
        ))}

        {/* KEY BENEFITS */}
        <section className="relative px-4 sm:px-6 pb-10 sm:pb-14 text-gray-200">
          <div className="relative z-10 max-w-7xl mx-auto mb-6 sm:mb-8 px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-theme-primary mb-2">
              Key Benefits
            </h2>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {benefits.map((benefit, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-white/20 hover:shadow-[0_0_10px_rgba(255,255,255,0.08)] transition"
              >
                <h3 className="text-xl font-semibold text-theme-primary mb-2">{benefit.title}</h3>
                <p className="text-theme-tertiary text-sm leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative px-4 sm:px-6 pb-10 sm:pb-14 text-gray-200">
          <div className="relative z-10 max-w-7xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-theme-primary mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-theme-tertiary mb-6 max-w-2xl mx-auto">
              Join businesses that replaced fragmented tools with Opsly
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="btn-marketing-primary">
                Start Free Trial
              </Link>
              <Link href="/contact" className="btn-marketing-secondary">
                Book a Demo
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="bg-checkly-dark text-checkly-light py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 flex flex-col md:flex-row justify-between items-center text-sm gap-4">
          <p>© {new Date().getFullYear()} Opsly. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            <Link href="/contact" className="hover:underline">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
