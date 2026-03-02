"use client";

import Link from "next/link";
import SharedHeaderBase from "./SharedHeaderBase";

export default function MarketingHeader() {
  return (
    <SharedHeaderBase
      cta={
        <>
          <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">
            Login
          </Link>
          <Link href="/signup" className="btn-marketing-primary !px-5 !py-2 text-sm">
            Get started
          </Link>
        </>
      }
    >
      <Link key="product" href="/product" className="text-white/50 hover:text-white transition-colors" prefetch={false} suppressHydrationWarning>
        Product
      </Link>
      <Link key="pricing" href="/pricing" className="text-white/50 hover:text-white transition-colors" prefetch={false} suppressHydrationWarning>
        Pricing
      </Link>
    </SharedHeaderBase>
  );
}
