"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function SetupPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      // Retire setup: redirect authenticated users to dashboard; otherwise to signup
      if (data?.user?.id) router.replace("/dashboard");
      else router.replace("/signup");
    })();
  }, [router, supabase]);

  return null;
}