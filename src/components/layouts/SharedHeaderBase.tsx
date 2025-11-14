"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui";
import logo from "@/assets/checkly_logo_touching_blocks.png";

interface SharedHeaderBaseProps {
  children?: React.ReactNode; // center nav content
  cta?: React.ReactNode; // right-side CTA buttons
  logoSrc?: string; // optional company logo override
  logoAlt?: string; // optional alt text override
}

export default function SharedHeaderBase({ children, cta, logoSrc, logoAlt }: SharedHeaderBaseProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#0b0e17]/95 backdrop-blur border-b border-slate-800 text-white shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          {/* Logo (left) */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            {typeof logoSrc === "string" ? (
              // Use native img for remote URLs to avoid Next Image domain restrictions
              <img
                src={logoSrc}
                alt={logoAlt ?? "Company logo"}
                width={192}
                height={48}
                className="h-8 sm:h-10 w-auto object-contain transition-all duration-200 hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]"
                loading="eager"
              />
            ) : (
              <Image
                src={logo as any}
                alt={logoAlt ?? "Checkly logo"}
                width={192}
                height={48}
                priority
                className="h-8 sm:h-10 w-auto object-contain transition-all duration-200 hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]"
              />
            )}
          </Link>

          {/* Desktop Center nav */}
          <nav className="hidden lg:flex items-center gap-8 xl:gap-10 text-[15px] font-medium tracking-tight">
            {children}
          </nav>

          {/* Desktop Right CTAs */}
          <div className="hidden md:flex items-center gap-3">{cta}</div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-slate-800">
            {/* Mobile Menu - Only Pricing, Sign Up, Login */}
            <nav className="flex flex-col gap-3 pt-4">
              <Link
                href="/pricing"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-slate-200 hover:text-magenta-400 transition py-2 px-2 rounded-lg hover:bg-white/10"
              >
                Pricing
              </Link>
              <Link
                href="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block"
              >
                <Button variant="primary" className="w-full">Sign up</Button>
              </Link>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block"
              >
                <Button variant="primary" className="w-full">Login</Button>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
