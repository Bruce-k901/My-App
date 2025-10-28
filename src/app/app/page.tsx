"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { Button } from "@/components/ui";
import GlassCard from "@/components/ui/GlassCard";
import AppHeader from "@/components/layouts/AppHeader";
import { supabase } from "@/lib/supabase";

export default function AppHome() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session) {
        router.replace("/login");
      } else if (mounted) {
        setUserEmail(session.user.email ?? null);
      }
      setChecking(false);
    };
    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
      else setUserEmail(session.user.email ?? null);
    });
    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-white">
      <AppHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="flex flex-col items-center justify-center text-center px-6 py-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-magenta-500 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(236,72,153,0.4)]">
            Welcome back{userEmail ? `, ${userEmail}` : ""}
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed text-base mt-3">
            Your operational hub — quick links to the areas you use most.
          </p>
        </section>

        {/* Quick Actions */}
        <section className="px-6 pb-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { href: "/dashboard", title: "Dashboard", desc: "Overview & live status" },
              { href: "/assets", title: "Assets", desc: "Register & maintenance" },
              { href: "/reports", title: "Reports", desc: "Compliance & analytics" },
              { href: "/settings", title: "Settings", desc: "Teams & preferences" },
            ].map(({ href, title, desc }) => (
              <GlassCard key={href} className="p-5">
                <p className="text-base font-semibold mb-1 text-magenta-400">{title}</p>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">{desc}</p>
                <Link href={href}>
                  <Button variant="primary" className="text-sm">Open {title}</Button>
                </Link>
              </GlassCard>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
