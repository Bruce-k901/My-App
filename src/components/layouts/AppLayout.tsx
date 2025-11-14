"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/checkly_logo_touching_blocks.svg";
import { LinkButton } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-white">
      <header className="flex items-center justify-between px-10 py-5 bg-gradient-to-b from-[#0b0d13]/95 to-[#0b0d13]/80 backdrop-blur border-b border-neutral-800 shadow-sm">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Image
              src={logo}
              alt="Checkly logo"
              width={468}
              height={144}
              priority
              className="object-contain transition-all duration-200 hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]"
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

      <footer className="bg-[#0b0d13] text-gray-400 text-center text-sm py-6 border-t border-neutral-800">
        <p>© {new Date().getFullYear()} Checkly. All rights reserved.</p>
      </footer>
    </div>
  );
}
