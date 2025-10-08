"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

export default function NewPasswordPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    // Support both hash fragment tokens and query params
    const params = hash && hash.includes("access_token")
      ? new URLSearchParams(hash.replace("#", ""))
      : searchParams;

    const access_token = params?.get("access_token");
    const refresh_token = params?.get("refresh_token");

    if (access_token && refresh_token) {
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(() => setLoading(false))
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else window.location.href = "/login";
  };

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <form onSubmit={handleReset} className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Set your new password</h1>
      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-3 rounded-lg bg-white/10 mb-3"
      />
      <button
        type="submit"
        className="w-full py-2 rounded-lg bg-gradient-to-r from-magenta-500 to-blue-500 text-white"
      >
        Update Password
      </button>
      {error && <p className="text-red-400 mt-2">{error}</p>}
    </form>
  );
}