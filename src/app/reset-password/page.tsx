"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/layouts";
import { Card } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { handlePostLogin } from "@/lib/auth";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [canReset, setCanReset] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // When landing from the recovery email, Supabase will emit PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setCanReset(true);
    });

    // Also check for a valid session; some environments set session immediately
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) setCanReset(true);
    })();

    return () => sub?.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!canReset) {
      setError("Recovery link not detected. Please open the link from your email again.");
      return;
    }
    if (!password || !confirm) {
      setError("Please enter and confirm your new password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage("Password updated successfully. Redirecting…");
      // Establish a fresh session flow and route using post-login logic
      setTimeout(async () => {
        const { data } = await supabase.auth.getUser();
        const userId = data?.user?.id;
        if (userId) await handlePostLogin(userId, router);
        else router.replace("/dashboard");
      }, 1200);
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

      <Card className="w-full max-w-md bg-[#111319]/80 backdrop-blur-lg border border-white/10 shadow-lg p-8 rounded-2xl">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-6 bg-gradient-to-r from-magenta-400 to-blue-500 bg-clip-text text-transparent">
          Set a new password
        </h1>

        <p className="text-center text-gray-400 mb-8 text-sm">
          Enter a new password to complete your account recovery.
        </p>

        {!canReset && (
          <p className="text-slate-400 text-sm mb-4">
            Waiting for recovery session… If this page wasn’t opened from your email link,
            return to the email and click the reset link again.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">New password</label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Choose a strong password"
              className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Confirm password</label>
            <input
              type="password"
              name="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Re-enter your password"
              className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-magenta-400/60 focus:border-transparent transition-all duration-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full py-3 mt-4 font-semibold text-white border border-white/20 bg-transparent hover:bg-gradient-to-r hover:from-magenta-500 hover:to-blue-500 transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(236,72,153,0.4)]"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 text-sm text-green-400" role="status">
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
      </Card>
    </AuthLayout>
  );
}