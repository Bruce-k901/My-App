"use client";

import Link from "next/link";
import { OpslyLogo } from "@/components/ui/opsly-logo";

export default function AuthLogoHeader() {
  return (
    <header className="sticky top-0 z-50 bg-[#0b0e17]/95 backdrop-blur border-b border-slate-800 text-white shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
      <div className="max-w-7xl mx-auto flex items-center justify-center px-4 sm:px-6 md:px-10 py-3 sm:py-4 md:py-5">
        <Link href="/" className="flex items-center">
          <OpslyLogo 
            variant="horizontal" 
            size="lg" 
            className="text-theme-primary"
          />
        </Link>
      </div>
    </header>
  );
}