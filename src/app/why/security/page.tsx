"use client";

import { ShieldCheck, Lock, UserCheck, FileLock2, AlertTriangle, KeyRound } from "lucide-react";
import Link from "next/link";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function SecurityPage() {
  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-16 bg-[#0b0d13]">
        <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-magenta-400 mr-3" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
              Security & Data Protection
            </h1>
          </div>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-base">
            Hospitality moves fast, but your data shouldn’t. Checkly protects your records, staff
            logins, and customer information without slowing down service.
          </p>
        </div>
      </section>

      {/* PITFALLS */}
      <section className="bg-[#0b0d13] py-12 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">Common Security Pitfalls</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: Lock,
                title: "Shared Passwords",
                text: "Multiple team members using the same login means zero accountability and full exposure if credentials leak.",
              },
              {
                icon: FileLock2,
                title: "No Access Off-boarding",
                text: "Staff leave but keep access to systems, reports, or delivery portals long after their final shift.",
              },
              {
                icon: UserCheck,
                title: "Unverified Data Changes",
                text: "Temperature logs, maintenance checks, and compliance records edited without audit trails destroy trust in data.",
              },
              {
                icon: KeyRound,
                title: "Weak Authentication",
                text: "Simple passwords or one-step logins open the door to unauthorised access and costly GDPR headaches.",
              },
              {
                icon: AlertTriangle,
                title: "Unsecured Devices",
                text: "Shared tablets or POS terminals stay logged in — easy for the wrong person to access sensitive data.",
              },
              {
                icon: ShieldCheck,
                title: "Data Stored Everywhere",
                text: "Spreadsheets, phones, and personal drives scatter operational data with no version control or encryption.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="bg-[#141823] rounded-2xl p-5 border border-neutral-800 hover:border-magenta-500/40 hover:bg-[#191c26] transition-all duration-200"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Icon className="w-5 h-5 text-magenta-400 flex-shrink-0" />
                  <p className="text-base font-semibold text-white">{title}</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* BENEFITS + CTA */}
      <section className="bg-[#0b0d13] py-16 text-center border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold mb-10 text-white">How Checkly Helps</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {[
              {
                title: "Role-Based Access Control",
                text: "Only the right people see the right data — assign permissions by role, site, or seniority in seconds.",
              },
              {
                title: "Instant Access Revocation",
                text: "Remove or suspend users immediately when staff leave, with one-click audit logging for traceability.",
              },
              {
                title: "Tamper-Proof Audit Trails",
                text: "Every record is time-stamped and user-linked, preventing edits or deletions that compromise compliance.",
              },
              {
                title: "Secure Cloud Storage",
                text: "Encrypted, version-controlled data stored safely — never lost, never local, always retrievable for audits.",
              },
              {
                title: "Two-Step Verification",
                text: "Protect key admin accounts and sensitive data with optional MFA, adding real security without friction.",
              },
              {
                title: "Compliance-Ready Privacy Controls",
                text: "Built-in GDPR and data retention tools ensure sensitive customer or staff info stays lawful and locked down.",
              },
            ].map(({ title, text }) => (
              <li
                key={title}
                className="bg-[#141823] rounded-2xl p-5 border border-neutral-800 hover:border-magenta-500/40 hover:bg-[#191c26] transition-all duration-200"
              >
                <p className="text-base font-semibold mb-1 text-magenta-400">{title}</p>
                <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>

          {/* CTA AT BOTTOM */}
          <div className="text-center mt-10">
            <h3 className="text-xl font-semibold mb-4 text-white">
              Ready to lock down your operation and protect your data?
            </h3>
            <Link href="/signup" className="btn-glass-cta">
              Get Started
            </Link>
          </div>
        </div>
      </section>
    </MarketingSubPageLayout>
  );
}
