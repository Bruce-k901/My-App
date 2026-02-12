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
  ArrowRight,
} from '@/components/ui/icons';

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
    color: "text-checkly",
    description: "Complete compliance and quality control system with digital checklists, temperature monitoring, and EHO-ready reporting.",
  },
  {
    id: "stockly",
    name: "Stockly",
    tagline: "Know what you have, everywhere",
    color: "text-stockly",
    description: "Multi-site inventory management with recipe costing, waste tracking, and automated purchasing.",
  },
  {
    id: "teamly",
    name: "Teamly",
    tagline: "Your team, organized",
    color: "text-teamly",
    description: "Complete HR and payroll solution with recruitment, scheduling, and performance management.",
  },
  {
    id: "planly",
    name: "Planly",
    tagline: "Plan, produce, deliver",
    color: "text-planly",
    description: "Production scheduling and order management for manufacturing and food production businesses.",
  },
  {
    id: "assetly",
    name: "Assetly",
    tagline: "Keep assets running smoothly",
    color: "text-assetly",
    description: "Equipment tracking and maintenance management with PPM scheduling and service history.",
  },
  {
    id: "msgly",
    name: "Msgly",
    tagline: "Team communication, simplified",
    color: "text-msgly",
    description: "Team chat, channels, and task management to replace noisy WhatsApp threads.",
  },
];

const howItWorks = [
  {
    problem: "Inspection Panic",
    solution: "EHO-Ready Pack",
    detail: "Automatic compliance export replaces last-minute scrambling before EHO visits.",
    problemIcon: FileText,
    solutionIcon: Shield,
  },
  {
    problem: "Routines Without Proof",
    solution: "Smart Digital Checklists",
    detail: "Resets daily, logged and time-stamped. No more disputed completions.",
    problemIcon: ClipboardCheck,
    solutionIcon: ClipboardCheck,
  },
  {
    problem: "Forged or Missed Temp Logs",
    solution: "Temperature Logging with Alerts",
    detail: "Live readings with breach alerts. No more manual logs you can't trust.",
    problemIcon: Thermometer,
    solutionIcon: Thermometer,
  },
  {
    problem: "Breakdown Roulette",
    solution: "Asset Register & PPM Scheduler",
    detail: "Predictable maintenance replaces expensive reactive call-outs.",
    problemIcon: Wrench,
    solutionIcon: Wrench,
  },
  {
    problem: "Fragmented Visibility",
    solution: "Multi-Site Dashboards",
    detail: "Full performance and compliance visibility across every location from one login.",
    problemIcon: LayoutDashboard,
    solutionIcon: LayoutDashboard,
  },
  {
    problem: "No Early Warnings",
    solution: "Alerts & Escalations",
    detail: "Proactive notifications before something fails. Auto-escalate when unresolved.",
    problemIcon: Bell,
    solutionIcon: Bell,
  },
  {
    problem: "No Audit Trail",
    solution: "Task Verification & Evidence",
    detail: "Time-stamped records and photo evidence give you defensible proof.",
    problemIcon: FileText,
    solutionIcon: CheckCircle2,
  },
  {
    problem: "Inconsistent SOPs",
    solution: "Policy & Template Control",
    detail: "Company-wide SOP standardisation. One version of truth across all sites.",
    problemIcon: ListChecks,
    solutionIcon: ListChecks,
  },
  {
    problem: "Blind Spots in Trends",
    solution: "Reporting & Analytics",
    detail: "Data-driven insights into compliance, cost, and performance trends.",
    problemIcon: BarChart3,
    solutionIcon: BarChart3,
  },
];

export default function ProductPage() {
  return (
    <>
      {/* HERO with DarkVeil */}
      <section className="relative text-center pt-6 pb-16 sm:pb-20 md:pt-8 md:pb-24 min-h-[350px] sm:min-h-[400px] flex flex-col justify-start overflow-hidden">
        <div className="absolute inset-0 w-full h-full -z-0">
          <div className="w-full h-full">
            <DarkVeil />
          </div>
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light leading-[1.15] text-[#e8e8e8] mb-4 sm:mb-6">
            One platform.{' '}
            <span className="font-normal">Complete operations.</span>
          </h1>
          <p className="text-base sm:text-lg text-theme-tertiary max-w-2xl mx-auto mb-8">
            From compliance to inventory, people to production — everything your multi-site operation needs.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/signup" className="btn-marketing-primary text-sm sm:text-base">
              Start Free Trial
            </Link>
            <Link href="/contact" className="btn-marketing-secondary text-sm sm:text-base">
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/30 to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-theme-primary mb-3">
              Sound Familiar?
            </h2>
          </div>
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {painPoints.map((point, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition-all duration-300"
              >
                <p className="text-theme-tertiary text-sm leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SIX MODULES */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-theme-primary mb-3">
              Six Modules.{' '}
              <span className="text-[#e8e8e8]">One Platform.</span>
            </h2>
            <p className="text-theme-tertiary text-sm sm:text-base max-w-2xl mx-auto">
              Each module works on its own. Together, they replace your entire ops stack.
            </p>
          </div>
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {modules.map((mod) => (
              <div
                key={mod.id}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                <div className="relative p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-white/10 transition-all duration-300 h-full">
                  <h3 className={`text-lg font-medium ${mod.color} mb-1`}>{mod.name}</h3>
                  <p className="text-white/50 text-xs mb-3">{mod.tagline}</p>
                  <p className="text-theme-tertiary text-sm leading-relaxed">{mod.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - Flat pairs */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/30 to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-theme-primary mb-3">
              How It{' '}
              <span className="text-[#e8e8e8]">Works</span>
            </h2>
            <p className="text-theme-tertiary text-sm sm:text-base max-w-2xl mx-auto">
              Every common operational headache has a built-in answer
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {howItWorks.map((item, idx) => {
              const SolutionIcon = item.solutionIcon;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <SolutionIcon className="w-5 h-5 text-white/30" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-white/40 text-sm line-through decoration-white/20">{item.problem}</span>
                      <ArrowRight className="w-3 h-3 text-white/20 flex-shrink-0" />
                      <span className="text-theme-primary text-sm font-medium">{item.solution}</span>
                    </div>
                    <p className="text-theme-tertiary text-xs sm:text-sm leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 sm:py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900/95 to-black" />
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full filter blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full filter blur-3xl" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-theme-primary mb-4 sm:mb-6">
              Ready to Simplify Your{' '}
              <span className="text-[#e8e8e8]">Operations</span>?
            </h2>
            <p className="text-theme-tertiary text-base sm:text-lg mb-8 sm:mb-12">
              Join businesses that replaced fragmented tools with Opsly
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/contact" className="btn-marketing-secondary text-sm sm:text-base">
                Book a Demo
              </Link>
              <Link href="/signup" className="btn-marketing-primary text-sm sm:text-base">
                Start Free Trial
              </Link>
            </div>
            <div className="mt-8 sm:mt-12 flex items-center justify-center gap-2 text-xs sm:text-sm text-theme-tertiary">
              <CheckCircle2 className="w-4 h-4" />
              <span>No credit card required</span>
              <span className="text-theme-secondary">·</span>
              <span>14-day free trial</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
