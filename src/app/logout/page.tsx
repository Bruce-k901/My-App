"use client";

import Link from "next/link";
import { AuthLayout } from "@/components/layouts";
import { Card } from "@/components/ui";

export default function LogoutPage() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-md bg-[#111319]/80 backdrop-blur-lg border border-white/10 shadow-lg p-8 rounded-2xl text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-6 bg-gradient-to-r from-magenta-400 to-blue-500 bg-clip-text text-transparent">
          You’ve been logged out
        </h1>

        <p className="text-center text-gray-400 mb-8 text-sm">
          You have been signed out successfully.
        </p>

        <Link
          href="/login"
          className="w-full inline-block rounded-full py-3 mt-2 font-semibold text-white border border-white/20 bg-transparent hover:bg-gradient-to-r hover:from-magenta-500 hover:to-blue-500 transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(236,72,153,0.4)]"
        >
          Log in again
        </Link>

        <Link
          href="/"
          className="w-full inline-block rounded-full py-3 mt-4 font-semibold text-white border border-white/20 bg-transparent hover:bg-white/10 transition-all duration-300"
        >
          Back to home
        </Link>
      </Card>
    </AuthLayout>
  );
}
