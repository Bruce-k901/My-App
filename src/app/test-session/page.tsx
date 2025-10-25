"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSessionPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setError(error.message);
        } else {
          setSession(session);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Checking session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Session Test</h1>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-8">
            <h2 className="text-red-400 font-bold mb-2">Error</h2>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {session ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
            <h2 className="text-green-400 font-bold mb-4">✅ Session Found</h2>
            <div className="space-y-2 text-sm">
              <div>Email: {session.user?.email}</div>
              <div>User ID: {session.user?.id}</div>
              <div>Access Token: {session.access_token ? "✅ Present" : "❌ Missing"}</div>
              <div>Refresh Token: {session.refresh_token ? "✅ Present" : "❌ Missing"}</div>
              <div>Expires At: {session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : "Unknown"}</div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
            <h2 className="text-yellow-400 font-bold mb-4">❌ No Session</h2>
            <p className="text-yellow-300">Please log in to continue.</p>
            <a href="/login" className="inline-block mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Go to Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
