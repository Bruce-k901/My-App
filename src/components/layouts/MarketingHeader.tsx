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
            {/* Center navigation: Product, Pricing */}
            <Link key="product" href="/product" className="text-slate-200 hover:text-magenta-400 transition" prefetch={false} suppressHydrationWarning>
              Product
            </Link>
            <Link key="pricing" href="/pricing" className="text-slate-200 hover:text-magenta-400 transition" prefetch={false} suppressHydrationWarning>
              Pricing
            </Link>
    </SharedHeaderBase>
  );
}