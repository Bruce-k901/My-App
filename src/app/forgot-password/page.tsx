"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // You can adjust this to the route that will handle updating the password
      // after the recovery link is clicked.
      redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMessage("If an account exists for that email, we’ve sent a reset link.");
    }
  };

  return (
    <MarketingSubPageLayout>
      <section className="flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-md">
          <Card className="bg-[#141823] border-neutral-800 text-white shadow-[0_0_20px_rgba(236,72,153,0.18)] p-6">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]">
                Reset your password
              </h1>
              <p className="text-slate-300 text-sm mt-2">
                Enter your work email and we’ll send a secure reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="w-full rounded-xl px-4 py-3 bg-[#191c26] border border-neutral-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full py-3 font-semibold text-white border border-neutral-800 bg-[#191c26] hover:bg-gradient-to-r hover:from-magenta-500 hover:to-blue-500 transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(236,72,153,0.35)]"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            {message && <p className="mt-4 text-center text-sm text-green-400">{message}</p>}
            {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}

            <div className="text-center mt-6">
              <Link
                href="/login"
                className="text-magenta-400 hover:text-magenta-300 text-sm transition-colors"
              >
                Back to login
              </Link>
              <div className="mt-2">
                <Link
                  href="/"
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                >
                  Back to home
                </Link>
              </div>
              <p className="text-slate-500 text-xs mt-4">
                Didn’t receive the email? Check your spam folder.
              </p>
            </div>
          </Card>
        </div>
      </section>
    </MarketingSubPageLayout>
  );
}
