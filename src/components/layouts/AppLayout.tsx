"use client";

import React from "react";
import Link from "next/link";
import { LinkButton } from "@/components/ui";
import { OpslyLogo } from "@/components/ui/opsly-logo";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-neutral-950 text-theme-primary">
      <header className="flex items-center justify-between px-10 py-5 bg-white/95 dark:bg-gradient-to-b dark:from-[#0b0d13]/95 dark:to-[#0b0d13]/80 backdrop-blur border-b border-gray-200 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <OpslyLogo 
              variant="horizontal" 
              size="lg" 
              className="text-theme-primary"
            />
          </Link>
        </div>

        <nav className="flex items-center space-x-6">
          <LinkButton href="/" variant="ghost">
            Home
          </LinkButton>
          <LinkButton href="/dashboard" variant="ghost">
            Dashboard
          </LinkButton>
          <Link href="/login" className="btn-glass text-sm px-5 py-2.5">
            Login
          </Link>
          <Link href="/signup" className="btn-glass text-sm px-5 py-2.5">
            Sign Up
          </Link>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-gray-100 dark:bg-[#0b0d13] text-theme-tertiary text-center text-sm py-6 border-t border-gray-200 dark:border-neutral-800">
        <p>© {new Date().getFullYear()} Opsly. All rights reserved.</p>
      </footer>
    </div>
  );
}
