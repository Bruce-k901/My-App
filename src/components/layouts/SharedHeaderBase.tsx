"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from '@/components/ui/icons';
import { OpslyLogo } from "@/components/ui/opsly-logo";

interface SharedHeaderBaseProps {
  children?: React.ReactNode; // center nav content
  cta?: React.ReactNode; // right-side CTA buttons
  logoSrc?: string; // optional company logo override
  logoAlt?: string; // optional alt text override
}

export default function SharedHeaderBase({ children, cta, logoSrc, logoAlt }: SharedHeaderBaseProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-b from-[#0a0a0a]/90 via-[#0a0a0a]/60 to-transparent backdrop-blur-sm text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          {/* Logo + Nav (left group) */}
          <div className="flex items-center gap-6 sm:gap-8">
            <Link href="/" className="flex items-center gap-2 sm:gap-3">
              {typeof logoSrc === "string" ? (
                // Use native img for remote URLs to avoid Next Image domain restrictions
                <img
                  src={logoSrc}
                  alt={logoAlt ?? "Company logo"}
                  width={192}
                  height={48}
                  className="h-8 sm:h-10 w-auto object-contain transition-all duration-200"
                  loading="eager"
                />
              ) : (
                <OpslyLogo
                  variant="horizontal"
                  size="sm"
                  className="text-theme-primary"
                />
              )}
            </Link>

            {/* Desktop nav beside logo */}
            <nav className="hidden lg:flex items-center gap-6 text-[15px] font-medium tracking-tight" suppressHydrationWarning>
              {children}
            </nav>
          </div>

          {/* Desktop Right CTAs */}
          <div className="hidden md:flex items-center gap-3">{cta}</div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 text-theme-primary transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-white/10">
            <nav className="flex flex-col gap-3 pt-4">
              <Link
                href="/product"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-white/60 hover:text-white transition-colors py-2"
              >
                Product
              </Link>
              <Link
                href="/pricing"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-white/60 hover:text-white transition-colors py-2"
              >
                Pricing
              </Link>
              <Link
                href="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn-marketing-primary text-center w-full mt-2"
              >
                Get started
              </Link>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn-marketing-secondary text-center w-full"
              >
                Login
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
