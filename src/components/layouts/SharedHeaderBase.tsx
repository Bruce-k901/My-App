"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/checkly_logo_touching_blocks.png";

interface SharedHeaderBaseProps {
  children?: React.ReactNode;
}

export default function SharedHeaderBase({ children }: SharedHeaderBaseProps) {
  return (
    <header className="sticky top-0 z-50 bg-[#0b0e17]/95 backdrop-blur border-b border-slate-800 text-white shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-10 py-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src={logo}
            alt="Checkly logo"
            width={160}
            height={40}
            priority
            className="object-contain"
          />
        </Link>

        {/* Injected nav (varies by header) */}
        <nav className="flex items-center space-x-10 text-[15px] font-medium tracking-tight">
          {children}
        </nav>
      </div>
    </header>
  );
}
