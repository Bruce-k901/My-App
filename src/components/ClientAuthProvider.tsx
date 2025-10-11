"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ClientAuthProvider() {
  useEffect(() => {
    function setCookie(name: string, value: string, maxAgeSeconds?: number) {
      const parts = [
        `${name}=${value}`,
        "path=/",
        "SameSite=Lax",
      ];
      if (typeof maxAgeSeconds === "number" && maxAgeSeconds > 0) {
        parts.push(`Max-Age=${Math.floor(maxAgeSeconds)}`);
      }
      document.cookie = parts.join("; ");
    }

    function clearCookie(name: string) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        try {
          localStorage.setItem("supabase-auth-token", JSON.stringify(session));
          // Align with middleware: set a non-sensitive presence cookie
          const nowSec = Math.floor(Date.now() / 1000);
          const expSec = session.expires_at ?? nowSec + 60 * 60; // fallback 1h
          const ttl = Math.max(expSec - nowSec, 5);
          setCookie("supabase-auth-token", "1", ttl);
        } catch {}
      } else {
        try {
          localStorage.removeItem("supabase-auth-token");
          clearCookie("supabase-auth-token");
        } catch {}
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}