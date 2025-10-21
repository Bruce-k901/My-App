"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import { AuthLayout } from "@/components/layouts";
import { Eye, EyeOff } from "lucide-react";
import { Input, Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { handlePostLogin } from "@/lib/auth";

async function preloadDashboardData() {
  const preloadQueries = [
    supabase.from("sites").select("*"),
    supabase.from("assets").select("*"),
    supabase.from("contractors").select("*"),
    supabase.from("profiles").select("*")
  ];

  try {
    const results = await Promise.all(preloadQueries);
    sessionStorage.setItem("checkly-preload", JSON.stringify(results));
  } catch (err) {
    console.warn("Preload failed", err);
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (signInError) {
        setError(signInError.message || "Login failed. Please check your credentials.");
        return;
      }
      
      // Trigger background preload for dashboard data
      await preloadDashboardData();
      
      // Use the proper post-login flow to handle user setup and routing
      const userId = data?.user?.id;
      if (userId) {
        await handlePostLogin(userId, router);
      } else {
        router.replace("/dashboard");
      }
    } catch (_e) {
      setError("Network issue while logging in. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <GlassCard>
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-6 text-white">
          Log in to Checkly
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-2">Email</label>
            <Input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
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
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Log in
          </Button>
          {error && (
            <p className="mt-3 text-sm text-red-400" role="alert">{error}</p>
          )}
        </form>

        <div className="text-center mt-6">
          <Link href="/forgot-password" className="text-magenta-400 hover:text-magenta-300 text-sm transition-colors">
            Forgotten your password?
          </Link>
        </div>

        <p className="text-center text-white/60 mt-6 text-sm">
          Don’t have an account?{" "}
          <Link href="/signup" className="text-magenta-400 hover:text-magenta-300 transition-colors">
            Sign up
          </Link>
        </p>

        <p className="mt-8 text-center text-xs text-white/40">
          By continuing, you agree to our {""}
          <Link href="/terms" className="underline underline-offset-4 hover:text-gray-300">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-gray-300">Privacy Policy</Link>.
        </p>
      </GlassCard>
    </AuthLayout>
  );
}
