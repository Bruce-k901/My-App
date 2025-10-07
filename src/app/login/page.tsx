"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    setLoading(false);
    if (error) alert(error.message);
    else router.push("/dashboard");
  };

  return (
    <MarketingSubPageLayout>
      <section className="flex items-center justify-center px-6 py-10 bg-[#0b0d13]">
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

        <div className="w-full max-w-md">
          <Card className="bg-[#141823]/90 backdrop-blur border border-neutral-800 shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-8 rounded-2xl">
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-6 bg-gradient-to-r from-magenta-400 to-blue-500 bg-clip-text text-transparent">
              Log in to Checkly
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl px-4 py-3 bg-[#191c26] border border-neutral-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Password</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Password"
                  className="w-full rounded-xl px-4 py-3 bg-[#191c26] border border-neutral-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full py-3 mt-4 font-semibold text-white border border-neutral-800 bg-[#191c26] hover:bg-gradient-to-r hover:from-magenta-500 hover:to-blue-500 transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(236,72,153,0.35)]"
              >
                {loading ? "Logging in..." : "Log in"}
              </button>
            </form>

            <div className="text-center mt-6">
              <Link
                href="/forgot-password"
                className="text-magenta-400 hover:text-magenta-300 text-sm transition-colors"
              >
                Forgotten your password?
              </Link>
            </div>

            <p className="text-center text-slate-400 mt-6 text-sm">
              Don’t have an account?{" "}
              <Link
                href="/signup"
                className="text-magenta-400 hover:text-magenta-300 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </Card>
        </div>
      </section>
    </MarketingSubPageLayout>
  );
}
