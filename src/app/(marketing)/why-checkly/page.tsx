"use client";

import Link from "next/link";
import DarkVeil from "@/components/ui/DarkVeil";

export default function WhyCheckly() {
  return (
    <>
      {/* Single DarkVeil Background Container */}
      <div className="relative overflow-hidden">
        {/* Single DarkVeil Background - covers both sections */}
        <div className="absolute inset-0 w-full h-full -z-0">
          <div className="w-full h-full min-h-screen">
            <DarkVeil />
          </div>
        </div>
        
        {/* HERO */}
        <section className="relative text-center pt-6 pb-8 sm:pb-10 md:pt-8 md:pb-12 min-h-[350px] sm:min-h-[400px] flex flex-col justify-start">
          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-6 sm:pt-8">
            <h1 className="hero-title text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold leading-[1.4] bg-gradient-to-r from-magenta-400 to-blue-500 bg-clip-text text-transparent mb-8 sm:mb-12 pb-3 overflow-visible px-2">
              Because running a food business shouldn't feel like firefighting
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-checkly-gray max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed pt-2 px-4">
              From missed checks to broken fridges, we've seen the chaos. Here's how Checkly turns it into calm.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-0 px-4">
              <Link href="/signup" className="btn-glass-cta">
                Get Started
              </Link>
              <Link href="/login" className="btn-glass-cta">
                Login
              </Link>
            </div>
          </div>
        </section>

        {/* WHY SECTION - Cards overlay the background */}
        <section id="why" className="relative px-4 sm:px-6 -mt-12 sm:-mt-16 md:-mt-24 pb-10 sm:pb-14 text-gray-200">
          <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {/* 1 */}
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Compliance without chaos</h3>
            <p className="text-gray-300">Logs, checks, and reports in one place. Be inspection-ready without last-minute firefighting.</p>
          </div>
          {/* 2 */}
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Less reactive, more proactive</h3>
            <p className="text-gray-300">Automate alerts, track temperature and incidents, and cut noisy WhatsApp threads.</p>
          </div>
          {/* 3 */}
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Built to scale</h3>
            <p className="text-gray-300">Start fast, roll out across sites, and keep your head office fully in the loop.</p>
          </div>
          {/* 4 */}
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-blue-400/50 hover:shadow-[0_0_18px_rgba(59,130,246,0.25)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Single source of truth</h3>
            <p className="text-gray-300">One platform for tasks, checks, logs, and incidents so everyone stays aligned.</p>
          </div>
          {/* 5 */}
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-blue-400/50 hover:shadow-[0_0_18px_rgba(59,130,246,0.25)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Bulletproof audit trails</h3>
            <p className="text-gray-300">Time-stamped records and attachments give you defensible proof when it matters.</p>
          </div>
          {/* 6 */}
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Smart automation & workflows</h3>
            <p className="text-gray-300">Assign tasks, trigger follow-ups, and auto-escalate issues to the right people.</p>
          </div>
          {/* 7 */}
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Real-time alerts & escalations</h3>
            <p className="text-gray-300">Get notified instantly, escalate when unresolved, and reduce noisy back-and-forth.</p>
          </div>
          {/* 8 */}
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-blue-400/50 hover:shadow-[0_0_18px_rgba(59,130,246,0.25)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Role-based access</h3>
            <p className="text-gray-300">Secure permissions for managers, staff, and auditors keep data safe and relevant.</p>
          </div>
          {/* 9 */}
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-blue-400/50 hover:shadow-[0_0_18px_rgba(59,130,246,0.25)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Integrations & API</h3>
            <p className="text-gray-300">Connect to your tools, export data, and automate with a flexible API.</p>
          </div>
          {/* 10 */}
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-md p-6 border border-white/20 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Mobile-first for busy teams</h3>
            <p className="text-gray-300">Easy on phones and tablets so field teams can log and resolve quickly.</p>
          </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="bg-checkly-dark text-checkly-light py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 flex flex-col md:flex-row justify-between items-center text-sm gap-4">
          <p>© {new Date().getFullYear()} Checkly. All rights reserved.</p>
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