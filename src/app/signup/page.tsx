"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";
import { Button, Input } from "@/components/ui";
import GlassCard from "@/components/ui/GlassCard";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { createTrialSubscription } from "@/lib/subscriptions";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    company: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function generatePassword() {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    const password = Array.from({ length: 12 }, () => charset[Math.floor(Math.random() * charset.length)]).join("");
    setForm({ ...form, password });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: signUpRes, error: signupError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { first_name: form.firstName, last_name: form.lastName } },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    const userId = signUpRes.user?.id;
    let companyId: string | null = null;
    
    if (!userId) {
      // In email-confirmation mode, the user record may be unavailable immediately.
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user?.id) {
        setError("Account created. Please verify your email to continue.");
        setLoading(false);
        return;
      }
      
      try {
        const { data: companyData, error: companyErr } = await supabase
          .from("companies")
          .insert([{ name: form.company, user_id: userRes.user.id }])
          .select("id")
          .single();
        
        if (companyErr) {
          setError(companyErr.message || "Failed to create company");
          setLoading(false);
          return;
        }
        
        companyId = companyData?.id || null;
      } catch (err: any) {
        setError(err?.message || "Failed to create company");
        setLoading(false);
        return;
      }
    } else {
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .insert([{ name: form.company, user_id: userId }])
        .select("id")
        .single();
      
      if (companyError) {
        setError(companyError.message);
        setLoading(false);
        return;
      }
      
      companyId = companyData?.id || null;
    }

    // Create 60-day trial subscription for the new company
    if (companyId) {
      try {
        await createTrialSubscription(companyId, "starter");
      } catch (subError: any) {
        // Log but don't fail - subscription creation is not critical for signup
        console.error("Failed to create trial subscription:", subError);
      }
    }

    router.push("/dashboard");
  }

  return (
    <MarketingSubPageLayout>
      <main className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 py-6 sm:py-10">
        <GlassCard className="py-6 sm:py-8 px-4 sm:px-6 w-full max-w-md mx-auto">
          <form onSubmit={handleSignup} className="w-full space-y-4 sm:space-y-5">
            <h1 className="text-2xl sm:text-3xl font-semibold text-center mb-4 sm:mb-6 text-white">Create Your Account</h1>

            {error && <p className="text-xs sm:text-sm text-red-400 text-center mb-3">{error}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-white/60 text-sm mb-2">First Name</label>
                <Input
                  placeholder="First Name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-2">Last Name</label>
                <Input
                  placeholder="Last Name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">Company Name</label>
              <Input
                placeholder="Company Name"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">Admin Email</label>
              <Input
                placeholder="you@example.com"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">Password</label>
              <div className="relative">
                <Input
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="pr-20 sm:pr-24 w-full"
                />
                <button
                  type="button"
                  className="absolute right-10 sm:right-12 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-1"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Eye size={16} className="sm:w-[18px] sm:h-[18px]" />}
                </button>
                <button
                  type="button"
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-1"
                  onClick={generatePassword}
                  aria-label="Generate password"
                >
                  <RefreshCw size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" fullWidth loading={loading} className="mt-2">
              Sign Up
            </Button>
          </form>
        </GlassCard>
      </main>
    </MarketingSubPageLayout>
  );
}
