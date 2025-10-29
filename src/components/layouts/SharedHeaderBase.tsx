"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/checkly_logo_touching_blocks.png";

interface SharedHeaderBaseProps {
  children?: React.ReactNode; // center nav content
  cta?: React.ReactNode; // right-side CTA buttons
  logoSrc?: string; // optional company logo override
  logoAlt?: string; // optional alt text override
}

export default function SharedHeaderBase({ children, cta, logoSrc, logoAlt }: SharedHeaderBaseProps) {
  return (
    <header className="sticky top-0 z-50 bg-[#0b0e17]/95 backdrop-blur border-b border-slate-800 text-white shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
      <div className="max-w-7xl mx-auto grid grid-cols-[auto_1fr_auto] items-center px-10 py-5">
        {/* Logo (left) */}
        <Link href="/" className="flex items-center gap-3">
          {typeof logoSrc === "string" ? (
            // Use native img for remote URLs to avoid Next Image domain restrictions
            <img
              src={logoSrc}
              alt={logoAlt ?? "Company logo"}
              width={192}
              height={48}
              className="object-contain transition-all duration-200 hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]"
              loading="eager"
            />
          ) : (
            <Image
              src={logo as any}
              alt={logoAlt ?? "Checkly logo"}
              width={192}
              height={48}
              priority
              className="object-contain transition-all duration-200 hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]"
            />
          )}
        </Link>

        {/* Center nav (injected) */}
        <nav className="justify-self-center flex items-center gap-10 text-[15px] font-medium tracking-tight">
          {children}
        </nav>

        {/* Right CTAs */}
        <div className="justify-self-end flex items-center gap-3">{cta}</div>
      </div>
    </header>
  );
}
