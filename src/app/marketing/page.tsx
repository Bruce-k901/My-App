"use client";

import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/checkly_logo_touching_blocks.png";

export default function MarketingPage() {
  return (
    <div className="bg-checkly-light text-checkly-dark min-h-screen flex flex-col">
      {/* HEADER */}
      <header className="w-full border-b border-gray-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3">
            <Image src={logo} alt="Logo" width={160} height={40} />
            <span className="text-xl font-bold text-checkly-blue">MyApp</span>
          </div>

          {/* Nav + CTAs */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="#features" className="hover:text-checkly-blue">
              Features
            </Link>
            <Link href="#pricing" className="hover:text-checkly-blue">
              Pricing
            </Link>
            <Link href="#about" className="hover:text-checkly-blue">
              About
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-checkly-magenta text-white hover:opacity-90"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-checkly-blue text-white hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6">
          Turn <span className="text-checkly-blue">Chaos</span> into Clarity
        </h1>
        <p className="text-lg md:text-xl text-checkly-gray max-w-2xl mb-8">
          A system built for calm productivity. Components that make your interface effortless, your
          workflow precise, and your users happy.
        </p>
        <div className="flex gap-4">
          <Link
            href="/signup"
            className="px-6 py-3 rounded-lg text-lg font-semibold bg-checkly-blue text-white hover:opacity-90"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg text-lg font-semibold bg-checkly-magenta text-white hover:opacity-90"
          >
            Login
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-white py-16 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-3">Modular Components</h3>
            <p className="text-checkly-gray">
              Build faster with consistent, reusable elements that stay in sync across every page.
            </p>
          </div>
          <div className="p-6 rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-3">Zero Friction</h3>
            <p className="text-checkly-gray">
              Your UI works straight out of the box. No endless config tweaks or rebuild loops.
            </p>
          </div>
          <div className="p-6 rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-xl font-semibold mb-3">Built to Scale</h3>
            <p className="text-checkly-gray">
              Expand easily. The same system that powers your MVP can handle your growth.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-checkly-dark text-checkly-light py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm">
          <p>© {new Date().getFullYear()} MyApp. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            <Link href="/contact" className="hover:underline">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
