"use client";

import Link from "next/link";
import SharedHeaderBase from "./SharedHeaderBase";
import Button from "../ui/Button";

export default function MarketingHeader() {
  return (
    <SharedHeaderBase
      cta={
        <>
          <Link href="/signup">
            <Button variant="primary">Sign up</Button>
          </Link>
          <Link href="/login">
            <Button variant="primary">Login</Button>
          </Link>
        </>
      }
    >
            {/* Center navigation: Checkly Features, Why Checkly, Pricing */}
            <Link href="/checkly-features" className="text-slate-200 hover:text-magenta-400 transition">
              Checkly Features
            </Link>
            <Link href="/why-checkly" className="text-slate-200 hover:text-magenta-400 transition">
              Why Checkly
            </Link>
            <Link href="/pricing" className="text-slate-200 hover:text-magenta-400 transition">
              Pricing
            </Link>
    </SharedHeaderBase>
  );
}