"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function SetupHeader() {
  const pathname = usePathname();
  const steps = [
    { label: "Companies", href: "/setup" },
    { label: "Sites", href: "/setup/sites" },
    { label: "Templates", href: "/setup/checklists" },
    { label: "People", href: "/setup/team" },
    { label: "Assets", href: "/setup/equipment" },
  ];
  return (
    <div className="flex items-center justify-between">
      <Link href="/setup" className="flex items-center">
        <Image src="/assets/logo.png" alt="Checkly" width={168} height={168} />
      </Link>
      <nav className="hidden md:flex items-center gap-2">
        {steps.map((s) => {
          const active = pathname === s.href || (s.href !== "/setup" && pathname?.startsWith(s.href));
          return (
            <Link
              key={s.href}
              href={s.href}
              className={`text-sm px-3 py-1 rounded-full border border-white/20 transition-all duration-300 ${
                active
                  ? "bg-gradient-to-r from-magenta-500 to-blue-500 text-white shadow-[0_0_18px_rgba(236,72,153,0.35)]"
                  : "bg-transparent text-slate-300 hover:bg-gradient-to-r hover:from-magenta-500 hover:to-blue-500 hover:text-white"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}