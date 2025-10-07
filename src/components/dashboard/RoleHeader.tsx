"use client";

import Link from "next/link";
import { useAppContext } from "@/context/AppContext";

export default function RoleHeader() {
  const { role } = useAppContext();

  const common = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/tasks", label: "Tasks" },
    { href: "/logs", label: "Logs" },
  ];
  const compliance = [
    { href: "/incidents", label: "Incidents" },
    { href: "/compliance", label: "Compliance" },
  ];
  const admin = [
    { href: "/sites", label: "Sites" },
    { href: "/teams", label: "Teams" },
    { href: "/reports", label: "Reports" },
    { href: "/settings", label: "Settings" },
  ];

  const items = [
    ...common,
    ...(role === "manager" || role === "admin" ? compliance : []),
    ...(role === "admin" ? admin : []),
  ];

  return (
    <header className="border-b border-neutral-800 bg-[#0b0d13]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="font-semibold">
          Checkly
        </Link>
        <nav className="flex gap-4 text-sm text-slate-300">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className="hover:text-white">
              {i.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}