"use client";

import SharedHeaderBase from "./SharedHeaderBase";
import Link from "next/link";

export default function AppHeader() {
  return (
    <SharedHeaderBase>
      <Link href="/dashboard" className="text-slate-200 hover:text-magenta-400 transition">
        Dashboard
      </Link>
      <Link href="/assets" className="text-slate-200 hover:text-magenta-400 transition">
        Assets
      </Link>
      <Link href="/reports" className="text-slate-200 hover:text-magenta-400 transition">
        Reports
      </Link>
      <Link href="/settings" className="text-slate-200 hover:text-magenta-400 transition">
        Settings
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <Link href="/account" className="btn-gradient text-sm font-semibold">
          Account
        </Link>
        <Link href="/logout" className="text-slate-400 hover:text-white text-sm">
          Logout
        </Link>
      </div>
    </SharedHeaderBase>
  );
}
