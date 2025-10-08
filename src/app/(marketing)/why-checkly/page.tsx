import Link from "next/link";

export default function WhyCheckly() {
  return (
    <>
      {/* HERO */}
      <section className="section text-center">
        <div className="max-w-7xl mx-auto px-10">
          <h1 className="hero-title text-4xl md:text-6xl font-bold leading-[1.15] bg-gradient-to-r from-magenta-400 to-blue-500 bg-clip-text text-transparent mb-6">
            Because running a food business shouldn’t feel like firefighting
          </h1>
          <p className="text-lg md:text-xl text-checkly-gray max-w-2xl mx-auto mb-8">
            From missed checks to broken fridges, we’ve seen the chaos. Here’s how Checkly turns it into calm.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/signup" className="btn-glass-cta">
              Get Started
            </Link>
            <Link href="/login" className="btn-glass-cta">
              Login
            </Link>
          </div>
        </div>
      </section>

      {/* WHY SECTION */}
      <section id="why" className="px-6 py-14 bg-[#0e1016] text-gray-200 border-t border-white/10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* 1 */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-white/10 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Compliance without chaos</h3>
            <p className="text-gray-400">Logs, checks, and reports in one place. Be inspection-ready without last-minute firefighting.</p>
          </div>
          {/* 2 */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-white/10 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Less reactive, more proactive</h3>
            <p className="text-gray-400">Automate alerts, track temperature and incidents, and cut noisy WhatsApp threads.</p>
          </div>
          {/* 3 */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-white/10 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Built to scale</h3>
            <p className="text-gray-400">Start fast, roll out across sites, and keep your head office fully in the loop.</p>
          </div>
          {/* 4 */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-white/10 hover:border-blue-400/50 hover:shadow-[0_0_18px_rgba(59,130,246,0.25)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Single source of truth</h3>
            <p className="text-gray-400">One platform for tasks, checks, logs, and incidents so everyone stays aligned.</p>
          </div>
          {/* 5 */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-white/10 hover:border-blue-400/50 hover:shadow-[0_0_18px_rgba(59,130,246,0.25)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Bulletproof audit trails</h3>
            <p className="text-gray-400">Time-stamped records and attachments give you defensible proof when it matters.</p>
          </div>
          {/* 6 */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-white/10 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Smart automation & workflows</h3>
            <p className="text-gray-400">Assign tasks, trigger follow-ups, and auto-escalate issues to the right people.</p>
          </div>
          {/* 7 */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-white/10 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Real-time alerts & escalations</h3>
            <p className="text-gray-400">Get notified instantly, escalate when unresolved, and reduce noisy back-and-forth.</p>
          </div>
          {/* 8 */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-white/10 hover:border-blue-400/50 hover:shadow-[0_0_18px_rgba(59,130,246,0.25)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Role-based access</h3>
            <p className="text-gray-400">Secure permissions for managers, staff, and auditors keep data safe and relevant.</p>
          </div>
          {/* 9 */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-white/10 hover:border-blue-400/50 hover:shadow-[0_0_18px_rgba(59,130,246,0.25)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Integrations & API</h3>
            <p className="text-gray-400">Connect to your tools, export data, and automate with a flexible API.</p>
          </div>
          {/* 10 */}
          <div className="rounded-2xl bg-white/5 backdrop-blur-md p-6 border border-white/10 hover:border-magenta-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] transition">
            <h3 className="text-xl font-semibold text-white mb-2">Mobile-first for busy teams</h3>
            <p className="text-gray-400">Easy on phones and tablets so field teams can log and resolve quickly.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-checkly-dark text-checkly-light py-4">
        <div className="max-w-7xl mx-auto px-10 flex flex-col md:flex-row justify-between items-center text-sm">
          <p>© {new Date().getFullYear()} MyApp. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
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