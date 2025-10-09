"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";
import { Button, Input } from "@/components/ui";
import GlassCard from "@/components/ui/GlassCard";
import { Eye, EyeOff, RefreshCw } from "lucide-react";

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
    if (!userId) {
      // In email-confirmation mode, the user record may be unavailable immediately.
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user?.id) {
        setError("Account created. Please verify your email to continue.");
        setLoading(false);
        return;
      }
      
      try {
        await supabase.from("companies").insert([{ name: form.company, user_id: userRes.user.id }]);
      } catch (err: any) {
        setError(err?.message || "Failed to create company");
        setLoading(false);
        return;
      }
    } else {
      const { error: companyError } = await supabase.from("companies").insert([{ name: form.company, user_id: userId }]);
      if (companyError) {
        setError(companyError.message);
        setLoading(false);
        return;
      }
    }

    router.push("/dashboard");
  }

  return (
    <MarketingSubPageLayout>
      <main className="flex flex-col items-center justify-center min-h-screen px-6 py-10">
        <GlassCard variant="dark" className="py-8 px-6">
          <form onSubmit={handleSignup} className="w-full max-w-[460px] space-y-4">
            <h1 className="text-3xl font-semibold text-center mb-4">Create Your Account</h1>

            {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-white/60 text-sm mb-2">First Name</label>
                <Input
                  placeholder="First Name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-2">Last Name</label>
                <Input
                  placeholder="Last Name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
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
                  className="pr-20"
                />
                <button
                  type="button"
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  onClick={generatePassword}
                  aria-label="Generate password"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" fullWidth loading={loading}>
              Sign Up
            </Button>
          </form>
        </GlassCard>
      </main>
    </MarketingSubPageLayout>
  );
}
