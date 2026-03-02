"use client";

import Link from "next/link";
import { AuthLayout } from "@/components/layouts";
import GlassCard from "@/components/ui/GlassCard";
import { Button } from "@/components/ui";

export default function LogoutPage() {
  return (
    <AuthLayout>
      <GlassCard className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-6 bg-gradient-to-r from-magenta-500 to-blue-500 bg-clip-text text-transparent">
          You’ve been logged out
        </h1>

        <p className="text-center text-theme-tertiary mb-8 text-sm">
          You have been signed out successfully.
        </p>

        <Link href="/login">
          <Button variant="primary" fullWidth className="mt-2">Log in again</Button>
        </Link>

        <Link href="/">
          <Button variant="ghost" fullWidth className="mt-4">Back to home</Button>
        </Link>
        <p className="mt-8 text-center text-xs text-theme-tertiary">
          By continuing, you agree to our {""}
          <Link href="/terms" className="underline underline-offset-4 hover:text-theme-tertiary">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-theme-tertiary">Privacy Policy</Link>.
        </p>
      </GlassCard>
    </AuthLayout>
  );
}
