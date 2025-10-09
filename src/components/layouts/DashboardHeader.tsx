"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, BarChart3, LogOut, Building2 } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";

export default function DashboardHeader() {
  const router = useRouter();
  const { company } = useAppContext();
  const companyLogo = (company?.logo_url as string | undefined) || "/assets/logo.png";

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    router.replace("/login");
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
        className="flex items-center gap-2 px-3 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/[0.12] transition-all"
      >
        <LogOut className="w-4 h-4 text-pink-500" />
        <span>Logout</span>
      </button>
    </header>
  );
}