import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";
import Link from "next/link";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-20 md:py-16 sm:py-10">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-magenta-500 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(236,72,153,0.4)]">
          Turn Chaos into Clarity
        </h1>
        <p className="text-slate-300 max-w-2xl mx-auto text-lg leading-relaxed mb-4">
          Checkly keeps every kitchen, site, and team compliant, productive, and calm. One place for
          logs, checks, alerts, and reports — so you can focus on great food, not fire drills.
        </p>
        <Link href="/signup" className="btn-glass-cta mt-8">
          Try Checkly Free
        </Link>
      </section>

      {/* PROBLEM SECTION */}
      <section className="py-12 bg-[#0f121c] border-t border-neutral-800 text-center">
        <h2 className="text-3xl font-semibold mb-8 text-white">Have you ever experienced…</h2>
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-12 px-6">
          {[
            {
              title: "Last-minute EHO panic?",
              text:
                "Missing records, lost temp logs, and a mad dash to print “evidence.”",
            },
            {
              title: "Reactive maintenance chaos?",
              text:
                "Machines breaking mid-service, no check history, endless WhatsApp threads.",
            },
            {
              title: "Too many tools?",
              text:
                "Tasks in one app, fridge temps in another, reports buried in someone’s inbox.",
            },
            {
              title: "Staff turnover headaches?",
              text: "New starters guessing SOPs or skipping key checks.",
            },
            {
              title: "Equipment downtime surprises?",
              text: "A fridge dies overnight, nobody knew it was failing.",
            },
            {
              title: "Missed audits or inspections?",
              text: "Paper trails lost, dates forgotten, stress levels up.",
            },
            {
              title: "Temperature log gaps?",
              text: "No one remembers to check the freezers when it matters.",
            },
            {
              title: "Rota and accountability confusion?",
              text: "Tasks done, not logged — or logged, not done.",
            },
            {
              title: "Multi-site blind spots?",
              text: "One site aces compliance, another is on fire.",
            },
            {
              title: "Data scattered everywhere?",
              text:
                "Excel sheets, screenshots, notes, and post-its pretending to be a system.",
            },
          ].map(({ title, text }) => (
            <div
              key={title}
              className="flex flex-col items-center justify-center text-center p-4 md:p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm min-h-[200px] hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] transition-all duration-300"
            >
              <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-8 bg-[#0b0e17] text-center">
        <h3 className="text-2xl font-semibold mb-4 text-white">
          Bring structure, calm, and compliance to your operation.
        </h3>
        <Link href="/signup">
          <Button variant="primary">Start Free Trial</Button>
        </Link>
      </section>
    </MarketingSubPageLayout>
  );
}
