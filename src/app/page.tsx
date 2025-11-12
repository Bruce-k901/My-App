"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";
import Link from "next/link";
import { Button } from "@/components/ui";
import DarkVeil from "@/components/ui/DarkVeil";

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [showMarketing, setShowMarketing] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        console.log("Session exists, redirecting to dashboard");
        router.replace("/dashboard");
      } else {
        setShowMarketing(true);
      }
      setChecking(false);
    }
    checkSession();
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Checking authentication...</div>
      </div>
    );
  }

  if (!showMarketing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Redirecting...</div>
      </div>
    );
  }

  return (
    <MarketingSubPageLayout>
      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-20 md:py-16 sm:py-10 overflow-hidden min-h-[600px]">
        {/* DarkVeil Background */}
        <div className="absolute inset-0 w-full h-full -z-0">
          <div className="w-full h-[600px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <DarkVeil />
          </div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Animated CHECKLY Tiles - Sliding in from sides with magnetic snap */}
          <div className="flex justify-center mb-8">
            <div className="tile-animate-left text-white text-5xl md:text-6xl font-bold w-20 h-24 md:w-24 md:h-28 flex justify-center items-center border-[3px] rounded-xl border-[#0074f0]" style={{ animationDelay: '0.1s' }}>c</div>
            <div className="tile-animate-right text-white text-5xl md:text-6xl font-bold w-20 h-24 md:w-24 md:h-28 flex justify-center items-center border-[3px] rounded-xl border-[#ff2fad]" style={{ animationDelay: '0.2s' }}>h</div>
            <div className="tile-animate-left text-white text-5xl md:text-6xl font-bold w-20 h-24 md:w-24 md:h-28 flex justify-center items-center border-[3px] rounded-xl border-[#ffd600]" style={{ animationDelay: '0.3s' }}>e</div>
            <div className="tile-animate-right text-white text-5xl md:text-6xl font-bold w-20 h-24 md:w-24 md:h-28 flex justify-center items-center border-[3px] rounded-xl border-white" style={{ animationDelay: '0.4s' }}>c</div>
            <div className="tile-animate-left text-white text-5xl md:text-6xl font-bold w-20 h-24 md:w-24 md:h-28 flex justify-center items-center border-[3px] rounded-xl border-[#00c851]" style={{ animationDelay: '0.5s' }}>✓</div>
            <div className="tile-animate-right text-white text-5xl md:text-6xl font-bold w-20 h-24 md:w-24 md:h-28 flex justify-center items-center border-[3px] rounded-xl border-[#0074f0]" style={{ animationDelay: '0.6s' }}>l</div>
            <div className="tile-animate-left text-white text-5xl md:text-6xl font-bold w-20 h-24 md:w-24 md:h-28 flex justify-center items-center border-[3px] rounded-xl border-[#ff3d00]" style={{ animationDelay: '0.7s' }}>y</div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-magenta-500 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(236,72,153,0.4)]">
            Turn Chaos into Clarity
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto text-lg leading-relaxed mb-4">
            Checkly keeps every kitchen, site, and team compliant, productive, and calm. One place for
            logs, checks, alerts, and reports — so you can focus on great food, not fire drills.
          </p>
          <Link href="/signup" className="btn-glass-cta mt-8">
            Try Checkly Free
          </Link>
        </div>
      </section>

      {/* CTA SECTION (condensed) */}
      <section className="py-8 bg-[#0b0e17] text-center">
        <h3 className="text-2xl font-semibold mb-4 text-white">
          Bring structure, calm, and compliance to your operation.
        </h3>
        <Link href="/signup">
          <Button variant="primary">Start Free Trial</Button>
        </Link>
      </section>
    </MarketingSubPageLayout>
  );
}
