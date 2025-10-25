"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewPasswordClient() {
  const router = useRouter();
  const [message, setMessage] = useState("Preparing password reset...");

  useEffect(() => {
    let isMounted = true;

    const handleSessionRecovery = async () => {
      try {
        // Capture session from URL hash (critical for password reset magic links)
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session recovery failed:", error);
          setMessage("Session recovery failed. Please try the reset link again.");
          return;
        }
        
        if (data.session) {
          console.log("Recovered session:", data.session);
          setMessage("Recovery link verified. Redirecting...");
          router.replace("/reset-password");
          return;
        }
      } catch (err) {
        console.error("Session recovery error:", err);
      }
    };

    // Immediately try to recover session from URL
    handleSessionRecovery();

    // Listen for the recovery event and then redirect.
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) return;
      if (event === "PASSWORD_RECOVERY") {
        setMessage("Recovery link verified. Redirecting...");
        router.replace("/reset-password");
      }
    });

    return () => {
      isMounted = false;
      subscription?.subscription?.unsubscribe();
    };
  }, [router]);

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <div style={{ fontSize: 16 }}>{message}</div>
    </div>
  );
}