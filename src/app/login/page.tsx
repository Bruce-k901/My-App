"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { AuthLayout } from "@/components/layouts";
import { Eye, EyeOff } from "lucide-react";
import { Input, Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";

// Optimized preload - only essential data, non-blocking
function preloadEssentialData() {
  // Don't await - let this run in background
  Promise.all([
    supabase.from("sites").select("id, name, address").limit(10),
    supabase.from("assets").select("id, name, site_id").limit(20)
  ]).then(results => {
    sessionStorage.setItem("checkly-preload", JSON.stringify(results));
  }).catch(err => {
    console.warn("Background preload failed", err);
  });
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Note: We redirect only after an explicit successful sign-in to avoid loops

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMountedRef.current) return;
    
    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInError) throw signInError;

      console.log("✅ Sign in successful, waiting for session cookie...");

      // Wait for session cookie to be readable before navigating to avoid ping-pong
      // Main login page always goes to main dashboard (/dashboard)
      // Customer login is separate at /customer/login
      for (let i = 0; i < 10; i++) {
        if (!isMountedRef.current) return; // Component unmounted, stop processing
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          window.location.href = "/dashboard";
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      // Fallback navigate anyway
      if (isMountedRef.current) {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        console.error("Login error:", err);
        setError(err.message || "Failed to sign in");
        setLoading(false);
      }
    }
  };

  return (
    <AuthLayout>
      <GlassCard className="mx-4 sm:mx-6 md:mx-auto">
        <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-center text-white">
          Log in to Opsly
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-white/60 text-sm mb-2">Email</label>
            <Input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-2">Password</label>
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                required
                placeholder="Password"
                className="pr-12 w-full"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} className="sm:w-5 sm:h-5" /> : <Eye size={18} className="sm:w-5 sm:h-5" />}
              </button>
            </div>
          </div>

          <Button type="submit" variant="primary" fullWidth loading={loading} disabled={loading} className="mt-6">
            {loading ? "Signing in..." : "Log in"}
          </Button>
          {error && (
            <p className="mt-3 text-xs sm:text-sm text-red-400 text-center" role="alert">{error}</p>
          )}
        </form>

        <div className="text-center mt-5 sm:mt-6">
          <Link href="/forgot-password" className="text-magenta-400 hover:text-magenta-300 text-xs sm:text-sm transition-colors">
            Forgotten your password?
          </Link>
        </div>

        <p className="text-center text-white/60 mt-5 sm:mt-6 text-xs sm:text-sm">
          Don't have an account?{" "}
          <Link href="/signup" className="text-magenta-400 hover:text-magenta-300 transition-colors">
            Sign up
          </Link>
        </p>

        <p className="mt-6 sm:mt-8 text-center text-[10px] sm:text-xs text-white/40 leading-relaxed px-2">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-gray-300">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-gray-300">Privacy Policy</Link>.
        </p>
      </GlassCard>
    </AuthLayout>
  );
}
