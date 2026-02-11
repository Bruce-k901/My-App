"use client";

import { useState } from "react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { AuthLayout } from "@/components/layouts";
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
      // Direct recovery to the token-handling page that re-establishes session
      redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/new-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMessage("If an account exists for that email, we’ve sent a reset link.");
    }
  };

  return (
    <AuthLayout>
      {/* Autofill fix for dark mode */}
      <style jsx global>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          box-shadow: 0 0 0px 1000px rgba(17, 19, 25, 0.8) inset !important;
          -webkit-text-fill-color: #fff !important;
          caret-color: #fff !important;
          transition: background-color 9999s ease-in-out 0s;
        }
      `}</style>

      <GlassCard>
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-6 bg-gradient-to-r from-magenta-500 to-blue-500 bg-clip-text text-transparent">
          Reset your password
        </h1>

        <p className="text-center text-gray-400 mb-8 text-sm">
          Enter your work email and we’ll send a secure reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              className="w-full rounded-xl px-4 py-3 bg-black/25 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full py-3 font-semibold text-white border border-white/20 bg-transparent hover:bg-gradient-to-r hover:from-magenta-500 hover:to-blue-500 transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(211, 126, 145,0.4)]"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-green-400" role="status">{message}</p>
        )}
        {error && (
          <p className="mt-4 text-center text-sm text-red-400" role="alert">{error}</p>
        )}

        <div className="text-center mt-6">
          <Link href="/login" className="text-magenta-400 hover:text-magenta-300 text-sm transition-colors">
            Back to login
          </Link>
          <p className="text-slate-500 text-xs mt-4">
            Didn’t receive the email? Check your spam folder.
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">
          By continuing, you agree to our {""}
          <Link href="/terms" className="underline underline-offset-4 hover:text-gray-300">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-gray-300">Privacy Policy</Link>.
        </p>
      </GlassCard>
    </AuthLayout>
  );
}