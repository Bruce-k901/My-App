"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar, BarChart3, LogOut, Building2, ClipboardCheck } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";

export default function DashboardHeader() {
  const router = useRouter();
  const { company } = useAppContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const companyLogo = (company?.logo_url as string | undefined) || "/assets/logo.png";

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent double clicks

    setIsLoggingOut(true);

    try {
      console.log("🔄 Logging out...");

      // Sign out from Supabase first
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("❌ Logout error:", error);
      } else {
        console.log("✅ Logged out successfully");
      }

      // Clear any cached data after sign out
      if (typeof window !== 'undefined') {
        try { sessionStorage.clear(); } catch {}
        try { localStorage.clear(); } catch {}
      }

      // Navigate to login
      router.replace("/login");

      // Hard fallback in case router is blocked
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }, 300);
    } catch (error) {
      console.error("❌ Logout failed:", error);
      router.replace("/login");
    } finally {
      // In case any UI remains, allow button again after a second
      setTimeout(() => setIsLoggingOut(false), 1000);
    }
  };

  return (
    <header className="flex items-center justify-between h-[72px] px-6 bg-white/[0.05] backdrop-blur-lg border-b border-white/[0.1]">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="Go to home">
          { }
          <img
            src={companyLogo}
            alt="Logo"
            className="h-9 w-auto transition-all duration-200 hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.45)] hover:opacity-100"
          />
        </Link>
      </div>

      {/* Middle: Actions */}
      <div className="flex items-center gap-4">
        {/* Today's Tasks - Main Priority */}
        <Link
          href="/dashboard/checklists"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-pink-600/20 to-blue-600/20 border border-pink-500/30 text-white hover:from-pink-600/30 hover:to-blue-600/30 transition-all shadow-[0_0_10px_rgba(236,72,153,0.2)] hover:shadow-[0_0_15px_rgba(236,72,153,0.3)]"
        >
          <ClipboardCheck className="w-5 h-5 text-pink-400" />
          <span className="font-semibold">Today's Tasks</span>
        </Link>

        {/* Site Switcher */}
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/[0.06] border border-white/[0.1] text-white/80 hover:text-white hover:bg-white/[0.12] transition-all"
        >
          <Building2 className="w-4 h-4 text-pink-500" />
          <span>Sites</span>
        </button>

        {/* Reports */}
        <Link
          href="/dashboard/reports"
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/[0.06] border border-white/[0.1] text-white/80 hover:text-white hover:bg-white/[0.12] transition-all"
        >
          <BarChart3 className="w-4 h-4 text-pink-500" />
          <span>Performance</span>
        </Link>

        {/* Calendar */}
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/[0.06] border border-white/[0.1] text-white/80 hover:text-white hover:bg-white/[0.12] transition-all"
        >
          <Calendar className="w-4 h-4 text-pink-500" />
          <span>Calendar</span>
        </button>
      </div>

      {/* Right: Logout */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
          isLoggingOut 
            ? "text-white/50 cursor-not-allowed bg-white/[0.06]" 
            : "text-white/80 hover:text-white hover:bg-white/[0.12]"
        }`}
      >
        <LogOut className={`w-4 h-4 ${isLoggingOut ? "text-pink-300" : "text-pink-500"}`} />
        <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
      </button>
    </header>
  );
}