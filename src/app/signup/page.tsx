"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";
import { Button, Input } from "@/components/ui";
import GlassCard from "@/components/ui/GlassCard";
import { Eye, EyeOff, RefreshCw } from "@/components/ui/icons";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  // Form state - confirmEmail is REQUIRED and must always be present
  // DO NOT remove confirmEmail or make it optional
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    company: "",
    email: "",
    confirmEmail: "", // REQUIRED: Users must confirm email at signup
    password: "",
    role: "Owner" as "Owner" | "Admin" | "Manager",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [pendingSignupData, setPendingSignupData] = useState<{ company: string; role: string; email: string } | null>(null);

  function generatePassword() {
    // Ensure password meets Supabase requirements:
    // - Minimum 8 characters
    // - Must have lowercase, uppercase, letters, and digits
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";
    const all = lowercase + uppercase + digits;
    
    // Guarantee at least one of each required type
    let password = 
      lowercase[Math.floor(Math.random() * lowercase.length)] +
      uppercase[Math.floor(Math.random() * uppercase.length)] +
      digits[Math.floor(Math.random() * digits.length)];
    
    // Fill the rest randomly (minimum 8 total, so 5 more)
    for (let i = 0; i < 5; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }
    
    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    setForm({ ...form, password });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // CRITICAL: Email confirmation validation
    // Both fields are REQUIRED - this prevents typos and ensures email accuracy
    if (!form.email || !form.confirmEmail) {
      setError("Please enter both email address and confirmation email.");
      setLoading(false);
      return;
    }

    // Validate that emails match (case-insensitive)
    if (form.email.trim().toLowerCase() !== form.confirmEmail.trim().toLowerCase()) {
      setError("Email addresses do not match. Please check and try again.");
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    // Check if user is already logged in - if so, just create the company via API
    // Use getSession() instead of getUser() to avoid 403 errors when not authenticated
    const { data: { session } } = await supabase.auth.getSession();
    const existingUser = session?.user;
    
    if (existingUser) {
      // User is already logged in - create the company using the server-side API
      try {
        const response = await fetch("/api/company/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.company,
            industry: "Hospitality",
            user_id: existingUser.id,
            contact_email: form.email,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          setError(data?.error || "Failed to create company");
          setLoading(false);
          return;
        }

        // Go straight to business details page
        router.push("/dashboard/business");
        return;
      } catch (err: any) {
        setError(err?.message || "Failed to create company");
        setLoading(false);
        return;
      }
    }

    // New user signup
    // Set redirect URL to our callback handler that will complete signup
    const redirectUrl = `${window.location.origin}/auth/callback?next=/dashboard/business`;
    
    const { data: signUpRes, error: signupError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          full_name: `${form.firstName} ${form.lastName}`.trim(),
          app_role: form.role,
          company_name: form.company,
        },
      },
    });

    if (signupError) {
      // Check for rate limiting (429 error)
      if (signupError.message.includes('429') || signupError.message.includes('Too Many Requests') || signupError.message.includes('rate limit')) {
        setError("Too many signup attempts. Please wait a moment and try again. If you're testing, wait about 20 seconds between attempts.");
      } 
      // Check if error is due to user already existing
      else if (signupError.message.includes('already registered') || signupError.message.includes('already exists')) {
        setError("This email is already registered. Please log in instead, or use a different email.");
      } 
      // Generic error
      else {
        setError(signupError.message || "Failed to create account. Please try again.");
      }
      setLoading(false);
      return;
    }

    // Check if email confirmation is required (no session means user needs to confirm email)
    const needsEmailConfirmation = !signUpRes.session;
    
    if (needsEmailConfirmation) {
      // Email confirmation is required - show message to check email
      setPendingSignupData({
        company: form.company,
        role: form.role,
        email: form.email,
      });
      setEmailSent(true);
      setLoading(false);
      return;
    }

    // User is already confirmed (shouldn't happen with enable_confirmations=true, but handle it)
    const userId = signUpRes.user?.id;
    
    if (userId) {
      // Create company + trial + link profile using the server-side API (service role)
      const response = await fetch("/api/company/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.company,
          industry: "Hospitality",
          user_id: userId,
          contact_email: form.email,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || "Failed to create company");
        setLoading(false);
        return;
      }

      // After successful signup + company/profile creation,
      // send the user to the business details page.
      router.push("/dashboard/business");
    }
  }

  // Show email confirmation success screen
  if (emailSent && pendingSignupData) {
    return (
      <MarketingSubPageLayout>
        <main className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 py-6 sm:py-10">
          <GlassCard className="py-6 sm:py-8 px-4 sm:px-6 w-full max-w-md mx-auto text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-white">Check Your Email</h1>
              <p className="text-white/80 text-sm sm:text-base">
                We've sent a confirmation email to <strong className="text-white">{pendingSignupData.email}</strong>
              </p>
              <p className="text-white/60 text-xs sm:text-sm">
                Please click the confirmation link in the email to complete your account setup. Once confirmed, you'll be automatically signed in and can continue setting up your company.
              </p>
              <div className="pt-4 space-y-3">
                <p className="text-white/50 text-xs">
                  Didn't receive the email? Check your spam folder or{" "}
                  <button
                    onClick={() => {
                      setEmailSent(false);
                      setPendingSignupData(null);
                    }}
                    className="text-[#D37E91] hover:text-[#D37E91]/80 underline"
                  >
                    try again
                  </button>
                </p>
                <Link href="/login" className="block">
                  <Button variant="primary" fullWidth>
                    Go to Login
                  </Button>
                </Link>
              </div>
            </div>
          </GlassCard>
        </main>
      </MarketingSubPageLayout>
    );
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
              <label className="block text-white/60 text-sm mb-2">Your Role</label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value as "Owner" | "Admin" | "Manager",
                  })
                }
                className="w-full rounded-md bg-black/40 border border-white/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
              >
                <option value="Owner">Owner</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
              </select>
            </div>

            {/* 
              CRITICAL: Both email fields MUST always be visible.
              DO NOT conditionally hide either field.
              This ensures users always confirm their email address at signup.
              See: tests/signup-email-fields.test.tsx
            */}
            <div>
              <label htmlFor="signup-email" className="block text-white/60 text-sm mb-2">
                Email Address <span className="text-red-400">*</span>
              </label>
              <Input
                id="signup-email"
                placeholder="you@example.com"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="signup-confirm-email" className="block text-white/60 text-sm mb-2">
                Confirm Email Address <span className="text-red-400">*</span>
              </label>
              <Input
                id="signup-confirm-email"
                placeholder="Repeat your email address"
                type="email"
                value={form.confirmEmail}
                onChange={(e) => setForm({ ...form, confirmEmail: e.target.value })}
                required
                className="w-full"
                autoComplete="email"
              />
              {form.confirmEmail && form.email && form.email.toLowerCase() !== form.confirmEmail.toLowerCase() && (
                <p className="text-xs text-red-400 mt-1">Email addresses do not match</p>
              )}
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
