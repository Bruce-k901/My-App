"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewPasswordClient() {
  const router = useRouter();
  const [message, setMessage] = useState("Preparing password reset...");

  useEffect(() => {
    let isMounted = true;

    // If a session is already present, proceed directly.
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (data.session) {
        router.replace("/reset-password");
      }
    });

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