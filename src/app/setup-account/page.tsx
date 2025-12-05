"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/layouts";
import GlassCard from "@/components/ui/GlassCard";
import { supabase } from "@/lib/supabase";
import { redirectToDashboard } from "@/lib/auth";
import { Eye, EyeOff, Sparkles, Clipboard } from "lucide-react";

function SetupAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [canSetup, setCanSetup] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for invite token in URL
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const urlParams = hash && hash.includes("access_token")
      ? new URLSearchParams(hash.replace("#", ""))
      : undefined;

    const access_token = urlParams?.get("access_token") ?? searchParams?.get("access_token") ?? null;
    const refresh_token = urlParams?.get("refresh_token") ?? searchParams?.get("refresh_token") ?? null;

    if (access_token && refresh_token) {
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ data, error }) => {
          if (error) {
            setError("Invalid invitation link. Please contact your administrator.");
          } else if (data?.session) {
            setCanSetup(true);
          }
        })
        .catch(() => {
          setError("Invalid invitation link. Please contact your administrator.");
        });
    } else {
      // Check if user already has a session
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          setCanSetup(true);
        } else {
          setError("No valid session found. Please use the invitation link from your email.");
        }
      });
    }
  }, [searchParams]);

  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let newPass = "";
    for (let i = 0; i < 14; i++) {
      newPass += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setPassword(newPass);
    setShowPassword(true);
    setGenerated(true);
  };

  const generatePin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit PIN
    setPinCode(pin);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!canSetup) {
      setError("Please use the invitation link from your email to set up your account.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!pinCode || pinCode.length !== 4) {
      setError("Please enter a 4-digit PIN code.");
      return;
    }

    setLoading(true);

    try {
      // Update password
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) {
        setError(passwordError.message);
        setLoading(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Could not retrieve user information.");
        setLoading(false);
        return;
      }

      // Update PIN code in profile
      const { error: pinError } = await supabase
        .from("profiles")
        .update({ pin_code: pinCode })
        .eq("id", user.id);

      if (pinError) {
        console.error("Error updating PIN:", pinError);
        // Don't fail the entire operation - password is set, PIN can be updated later
        setMessage("Password set successfully. PIN update failed - you can set it later in your profile.");
      } else {
        setMessage("Account setup complete! Redirecting to dashboard...");
      }

      // Ensure session is refreshed before redirecting
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error("Error refreshing session:", refreshError);
      }
      
      // Verify profile exists and has company_id before redirecting
      if (refreshedSession?.user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, company_id, email")
          .eq("id", refreshedSession.user.id)
          .maybeSingle();
        
        if (profileError) {
          console.error("Error checking profile after setup:", profileError);
        } else if (profile) {
          console.log("✅ Profile verified after setup:", {
            id: profile.id,
            company_id: profile.company_id,
            email: profile.email
          });
          
          if (!profile.company_id) {
            console.warn("⚠️ Profile exists but has no company_id - user may need to complete onboarding");
          }
        } else {
          console.warn("⚠️ No profile found after setup - user may need to complete onboarding");
        }
      }
      
      // Redirect to dashboard after a short delay
      // Use window.location for a full page reload to ensure session is established
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "An error occurred during account setup.");
      setLoading(false);
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
          Set Up Your Account
        </h1>

        <p className="text-center text-gray-400 mb-8 text-sm">
          Welcome! Please set your password and PIN code to complete your account setup.
        </p>

        {!canSetup && (
          <p className="text-slate-400 text-sm mb-4 text-center">
            Waiting for invitation session… If this page wasn't opened from your email link,
            please check your email and click the invitation link again.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password Section */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Choose a strong password (min 8 characters)"
                className="w-full rounded-xl px-4 py-3 bg-black/25 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3 text-gray-400 hover:text-magenta-400 transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <button
              type="button"
              onClick={generatePassword}
              className="flex items-center gap-2 text-sm text-magenta-400 hover:text-magenta-300 transition mx-auto mt-1"
            >
              <Sparkles size={16} /> Generate secure password
            </button>
            {generated && (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(password)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition mx-auto mt-2"
                aria-label="Copy generated password"
              >
                <Clipboard size={14} /> Copy generated password
              </button>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Re-enter your password"
                className="w-full rounded-xl px-4 py-3 bg-black/25 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-3 text-gray-400 hover:text-magenta-400 transition"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* PIN Code Section */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">PIN Code (4 digits)</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showPin ? "text" : "password"}
                  name="pinCode"
                  value={pinCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setPinCode(value);
                  }}
                  required
                  maxLength={4}
                  minLength={4}
                  placeholder="Enter 4-digit PIN"
                  className="w-full rounded-xl px-4 py-3 bg-black/25 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-4 top-3 text-gray-400 hover:text-magenta-400 transition"
                  aria-label={showPin ? "Hide PIN" : "Show PIN"}
                >
                  {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <button
                type="button"
                onClick={generatePin}
                className="px-4 py-3 rounded-xl bg-transparent border border-magenta-500 text-magenta-500 hover:bg-magenta-500/10 transition"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Your PIN is used for quick access to your account.</p>
          </div>

          <button
            type="submit"
            disabled={loading || !canSetup}
            className="w-full rounded-full py-3 mt-4 font-semibold text-white border border-white/20 bg-transparent hover:bg-gradient-to-r hover:from-magenta-500 hover:to-blue-500 transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(236,72,153,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Setting up account…" : "Complete Setup"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-400 text-center" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 text-sm text-green-400 text-center" role="status">
            {message}
          </p>
        )}

        <div className="text-center mt-6">
          <button
            onClick={() => router.push("/login")}
            className="text-magenta-400 hover:text-magenta-300 text-sm transition-colors"
          >
            Back to login
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">
          By continuing, you agree to our {""}
          <a href="/terms" className="underline underline-offset-4 hover:text-gray-300">Terms</a>
          {" "}and{" "}
          <a href="/privacy" className="underline underline-offset-4 hover:text-gray-300">Privacy Policy</a>.
        </p>
      </GlassCard>
    </AuthLayout>
  );
}

export default function SetupAccountPage() {
  return (
    <Suspense fallback={
      <AuthLayout>
        <GlassCard>
          <div className="text-center py-8">
            <p className="text-gray-400">Loading...</p>
          </div>
        </GlassCard>
      </AuthLayout>
    }>
      <SetupAccountContent />
    </Suspense>
  );
}

