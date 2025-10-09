"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewPasswordClient({
  searchParams,
}: {
  searchParams?: { access_token?: string; refresh_token?: string };
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const params = useSearchParams();

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    // Support both hash fragment tokens and query params passed from Server Component
    const urlParams = hash && hash.includes("access_token")
      ? new URLSearchParams(hash.replace("#", ""))
      : undefined;

    const access_token =
      urlParams?.get("access_token") ??
      params?.get("access_token") ??
      searchParams?.access_token ??
      null;
    const refresh_token =
      urlParams?.get("refresh_token") ??
      params?.get("refresh_token") ??
      searchParams?.refresh_token ??
      null;

    if (access_token && refresh_token) {
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(() => setLoading(false))
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [params, searchParams]);

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