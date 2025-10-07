"use client";

import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/checkly_logo_touching_blocks.png";

export default function AppHome() {
  return (
    <div className="bg-checkly-light text-checkly-dark min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src={logo} alt="Logo" width={140} height={40} priority />
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/" className="text-checkly-gray hover:text-checkly-blue transition">
              Home
            </Link>
            <Link href="#help" className="text-checkly-gray hover:text-checkly-blue transition">
              Help
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="max-w-md w-full bg-white shadow-md rounded-2xl p-8 border border-gray-100">
          <h1 className="text-2xl font-heading font-semibold text-center mb-6">Welcome back</h1>
          <form className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-checkly-blue"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-checkly-blue"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-checkly-blue text-white font-semibold hover:opacity-90 transition"
            >
              Sign In
            </button>
          </form>
          <p className="text-center text-sm text-checkly-gray mt-4">
            Don’t have an account?{" "}
            <Link href="/signup" className="text-checkly-magenta hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-sm text-checkly-gray py-4 border-t border-gray-200">
        © {new Date().getFullYear()} MyApp. All rights reserved.
      </footer>
    </div>
  );
}
