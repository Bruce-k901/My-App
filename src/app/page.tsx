"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";
import Link from "next/link";
import { Button } from "@/components/ui";
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
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [showMarketing, setShowMarketing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hasCheckedRef = React.useRef(false);

  // Ensure we're on client-side before checking session
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run after component is mounted (client-side)
    if (!mounted) return;
    
    // Prevent multiple checks
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    
    // Safety timeout: if check takes too long, show marketing page
    const safetyTimeout = setTimeout(() => {
      console.warn("Session check taking too long, showing marketing page");
      setShowMarketing(true);
      setChecking(false);
    }, 3000);
    
    async function checkSession() {
      try {
        // Add timeout to prevent hanging
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );
        
        const { data } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        clearTimeout(safetyTimeout);
        
      if (data?.session) {
        console.log("Session exists, redirecting to dashboard");
        router.replace("/dashboard");
          // Don't set checking to false if redirecting - let the redirect happen
          return;
      } else {
          setShowMarketing(true);
          setChecking(false);
        }
      } catch (error) {
        clearTimeout(safetyTimeout);
        console.error("Error checking session:", error);
        // On error, show marketing page (user can still navigate)
        setShowMarketing(true);
        setChecking(false);
      }
    }
    checkSession();
    
    return () => {
      clearTimeout(safetyTimeout);
    };
  }, [router, mounted]);

  // Show loading state only briefly, then show marketing page as fallback
  if (checking && !showMarketing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-white">Checking authentication...</div>
      </div>
    );
  }

  // If we're redirecting, show a brief message
  if (!showMarketing && !checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-white">Redirecting...</div>
      </div>
    );
  }

  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 sm:px-6 py-12 sm:py-16 md:py-20 overflow-hidden min-h-[500px] sm:min-h-[600px]">
        {/* DarkVeil Background */}
        <div className="absolute inset-0 w-full h-full -z-0">
          <div className="w-full h-[500px] sm:h-[600px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <DarkVeil />
          </div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Animated CHECKLY Tiles - Sliding in from sides with magnetic snap */}
          <div className="flex justify-center mb-6 sm:mb-8 flex-wrap gap-1 sm:gap-2">
            <div className="tile-animate-left text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold w-12 h-14 sm:w-16 sm:h-20 md:w-20 md:h-24 lg:w-24 lg:h-28 flex justify-center items-center border-[2px] sm:border-[3px] rounded-lg sm:rounded-xl border-[#0074f0]" style={{ animationDelay: '0.1s' }}>c</div>
            <div className="tile-animate-right text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold w-12 h-14 sm:w-16 sm:h-20 md:w-20 md:h-24 lg:w-24 lg:h-28 flex justify-center items-center border-[2px] sm:border-[3px] rounded-lg sm:rounded-xl border-[#ff2fad]" style={{ animationDelay: '0.2s' }}>h</div>
            <div className="tile-animate-left text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold w-12 h-14 sm:w-16 sm:h-20 md:w-20 md:h-24 lg:w-24 lg:h-28 flex justify-center items-center border-[2px] sm:border-[3px] rounded-lg sm:rounded-xl border-[#ffd600]" style={{ animationDelay: '0.3s' }}>e</div>
            <div className="tile-animate-right text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold w-12 h-14 sm:w-16 sm:h-20 md:w-20 md:h-24 lg:w-24 lg:h-28 flex justify-center items-center border-[2px] sm:border-[3px] rounded-lg sm:rounded-xl border-white" style={{ animationDelay: '0.4s' }}>c</div>
            <div className="tile-animate-left text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold w-12 h-14 sm:w-16 sm:h-20 md:w-20 md:h-24 lg:w-24 lg:h-28 flex justify-center items-center border-[2px] sm:border-[3px] rounded-lg sm:rounded-xl border-[#00c851]" style={{ animationDelay: '0.5s' }}>✓</div>
            <div className="tile-animate-right text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold w-12 h-14 sm:w-16 sm:h-20 md:w-20 md:h-24 lg:w-24 lg:h-28 flex justify-center items-center border-[2px] sm:border-[3px] rounded-lg sm:rounded-xl border-[#0074f0]" style={{ animationDelay: '0.6s' }}>l</div>
            <div className="tile-animate-left text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold w-12 h-14 sm:w-16 sm:h-20 md:w-20 md:h-24 lg:w-24 lg:h-28 flex justify-center items-center border-[2px] sm:border-[3px] rounded-lg sm:rounded-xl border-[#ff3d00]" style={{ animationDelay: '0.7s' }}>y</div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 px-2 bg-gradient-to-r from-magenta-500 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(236,72,153,0.4)]">
            Turn Chaos into Clarity
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed mb-6 sm:mb-8 px-4">
            Checkly keeps every kitchen, site, and team compliant, productive, and calm. One place for
            logs, checks, alerts, and reports — so you can focus on great food, not fire drills.
          </p>
          <Link href="/signup" className="btn-glass-cta mt-4 sm:mt-8 inline-block">
            Try Checkly Free
          </Link>
        </div>
      </section>

      {/* CTA SECTION (condensed) - Desktop only */}
      <section className="hidden md:block py-8 sm:py-12 bg-[#0b0e17] text-center px-4 sm:px-6">
        <h3 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-white px-4">
          Bring structure, calm, and compliance to your operation.
        </h3>
        <Link href="/signup">
          <Button variant="primary">Start Free Trial</Button>
        </Link>
      </section>

      {/* MOBILE-ONLY: Combined Features & Why Sections */}
      <div className="block md:hidden">
        {/* Single DarkVeil Background Container for mobile sections */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 w-full h-full -z-0">
            <div className="w-full h-full min-h-screen">
              <DarkVeil />
            </div>
          </div>

          {/* WHY CHECKLY SECTION - Mobile Only */}
          <section className="relative text-center pt-8 pb-6 text-gray-200">
            <div className="relative z-10 max-w-7xl mx-auto px-4">
              <h2 className="text-2xl font-bold leading-[1.4] bg-gradient-to-r from-magenta-400 to-blue-500 bg-clip-text text-transparent mb-4">
                Because running a food business shouldn't feel like firefighting
              </h2>
              <p className="text-base text-checkly-gray max-w-2xl mx-auto mb-6 leading-relaxed">
                From missed checks to broken fridges, we've seen the chaos. Here's how Checkly turns it into calm.
              </p>
            </div>
          </section>

          {/* WHY CARDS - Mobile Only */}
          <section className="relative px-4 -mt-6 pb-8 text-gray-200">
            <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 gap-4">
              {[
                { title: "Compliance without chaos", desc: "Logs, checks, and reports in one place. Be inspection-ready without last-minute firefighting." },
                { title: "Less reactive, more proactive", desc: "Automate alerts, track temperature and incidents, and cut noisy WhatsApp threads." },
                { title: "Built to scale", desc: "Start fast, roll out across sites, and keep your head office fully in the loop." },
                { title: "Single source of truth", desc: "One platform for tasks, checks, logs, and incidents so everyone stays aligned." },
                { title: "Bulletproof audit trails", desc: "Time-stamped records and attachments give you defensible proof when it matters." },
                { title: "Smart automation & workflows", desc: "Assign tasks, trigger follow-ups, and auto-escalate issues to the right people." },
                { title: "Real-time alerts & escalations", desc: "Get notified instantly, escalate when unresolved, and reduce noisy back-and-forth." },
                { title: "Role-based access", desc: "Secure permissions for managers, staff, and auditors keep data safe and relevant." },
                { title: "Integrations & API", desc: "Connect to your tools, export data, and automate with a flexible API." },
                { title: "Mobile-first for busy teams", desc: "Easy on phones and tablets so field teams can log and resolve quickly." },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-5 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-300 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FEATURES SECTION - Mobile Only */}
          <section className="relative px-4 pb-8 text-gray-200">
            <div className="relative z-10 max-w-7xl mx-auto mb-6">
              <h2 className="text-2xl font-bold text-center text-white mb-2">
                What it fixes — and how Checkly helps
              </h2>
            </div>
            <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 gap-4">
              {/* Feature Pair 1 */}
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-5 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-magenta-400" />
                  <p className="text-sm font-semibold text-white">Inspection Panic</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">Compliance records scattered and manual exports cause stress before EHO visits.</p>
                <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                  <Shield className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-semibold text-green-400">EHO-Ready Pack</p>
                    <p className="text-slate-400 text-sm">Automatic compliance export that removes inspection panic.</p>
                  </div>
                </div>
              </div>

              {/* Feature Pair 2 */}
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-5 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <ClipboardCheck className="w-5 h-5 text-magenta-400" />
                  <p className="text-sm font-semibold text-white">Routines Without Reset/Proof</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">Paper lists don't reset and lack logs or timestamps.</p>
                <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                  <ClipboardCheck className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-semibold text-green-400">Smart Digital Checklists</p>
                    <p className="text-slate-400 text-sm">Resets daily/weekly, logged and time-stamped.</p>
                  </div>
                </div>
              </div>

              {/* Feature Pair 3 */}
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-5 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-magenta-400" />
                  <p className="text-sm font-semibold text-white">Forged or Missed Temp Logs</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">Manual temperature logging can be skipped or falsified.</p>
                <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                  <Thermometer className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-semibold text-green-400">Temperature Logging with Alerts</p>
                    <p className="text-slate-400 text-sm">Live readings, no forged data.</p>
                  </div>
                </div>
              </div>

              {/* Feature Pair 4 */}
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-5 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-magenta-400" />
                  <p className="text-sm font-semibold text-white">Breakdown Roulette</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">Reactive maintenance leads to unpredictable downtime and costs.</p>
                <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                  <Wrench className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-semibold text-green-400">Asset Register & PPM Scheduler</p>
                    <p className="text-slate-400 text-sm">Predictable maintenance, no breakdown roulette.</p>
                  </div>
                </div>
              </div>

              {/* Feature Pair 5 */}
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-5 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-magenta-400" />
                  <p className="text-sm font-semibold text-white">Untracked Maintenance Issues</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">Problems lack evidence and stall without an end-to-end process.</p>
                <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                  <Wrench className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-semibold text-green-400">Maintenance & Fault Reporting</p>
                    <p className="text-slate-400 text-sm">Photo-driven issue tracking with repair lifecycle.</p>
                  </div>
                </div>
              </div>

              {/* Feature Pair 6 */}
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-5 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <LayoutDashboard className="w-5 h-5 text-magenta-400" />
                  <p className="text-sm font-semibold text-white">Fragmented Multi-Site Visibility</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">Managers can't see performance and compliance across locations.</p>
                <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                  <LayoutDashboard className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-semibold text-green-400">Multi-Site Dashboards</p>
                    <p className="text-slate-400 text-sm">Full visibility across all operations.</p>
                  </div>
                </div>
              </div>

              {/* Feature Pair 7 */}
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-5 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-magenta-400" />
                  <p className="text-sm font-semibold text-white">No Early Warnings</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">Failures are caught too late without proactive notifications.</p>
                <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                  <Bell className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-semibold text-green-400">Alerts & Escalations</p>
                    <p className="text-slate-400 text-sm">Proactive warnings before something fails.</p>
                  </div>
                </div>
              </div>

              {/* Feature Pair 8 */}
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-5 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-5 h-5 text-magenta-400" />
                  <p className="text-sm font-semibold text-white">No Audit Trail</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">Task completion is disputed or unverifiable.</p>
                <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-semibold text-green-400">Task Verification & Audit Trail</p>
                    <p className="text-slate-400 text-sm">Indisputable evidence of completion.</p>
                  </div>
                </div>
              </div>

              {/* Feature Pair 9 */}
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-5 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <ListChecks className="w-5 h-5 text-magenta-400" />
                  <p className="text-sm font-semibold text-white">Inconsistent SOPs</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">Policies and templates vary by site and team.</p>
                <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                  <ListChecks className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-semibold text-green-400">Policy & Template Control</p>
                    <p className="text-slate-400 text-sm">Company-wide SOP standardisation.</p>
                  </div>
                </div>
              </div>

              {/* Feature Pair 10 */}
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-5 border border-white/20">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-magenta-400" />
                  <p className="text-sm font-semibold text-white">Blind Spots in Trends</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">Compliance and cost trends aren't visible for decision-making.</p>
                <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
                  <BarChart3 className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-semibold text-green-400">Reporting & Analytics</p>
                    <p className="text-slate-400 text-sm">Data-driven insights into compliance and cost trends.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* MOBILE CTA SECTION */}
          <section className="relative flex flex-col items-center justify-center text-center px-4 py-10 pb-12">
            <div className="relative z-10 max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-4 text-white">
                Ready to take your operation digital?
              </h2>
              <p className="text-gray-400 mb-6 max-w-xl mx-auto text-sm">
                Start with a free 14-day trial or speak to our team about rolling Checkly out across your group.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/signup">
                  <Button variant="primary" className="w-full">Start Free Trial</Button>
                </Link>
                <Link href="/contact">
                  <Button variant="primary" className="w-full">Contact Sales</Button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </MarketingSubPageLayout>
  );
}
