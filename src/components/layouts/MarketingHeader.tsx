"use client";

import Link from "next/link";
import SharedHeaderBase from "./SharedHeaderBase";

export default function MarketingHeader() {
  return (
    <SharedHeaderBase
      cta={
        <>
          <Link href="/signup" className="btn-glass-cta">
            Sign up
          </Link>
          <Link href="/login" className="btn-glass-cta">
            Login
          </Link>
        </>
      }
    >
      {/* Center navigation: Features, Why Checkly, Pricing */}
      <Link
        href="/features/multi-site-dashboard"
        className="text-slate-200 hover:text-magenta-400 transition"
      >
        Features
      </Link>
      <Link href="/pricing" className="text-slate-200 hover:text-magenta-400 transition">
        Pricing
      </Link>
    </SharedHeaderBase>
  );
}