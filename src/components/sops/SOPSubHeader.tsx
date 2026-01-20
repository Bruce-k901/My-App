"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Templates", href: "/dashboard/sops/templates" },
  { label: "SOPs", href: "/dashboard/sops/list" },
  { label: "Libraries", href: "/dashboard/sops/libraries" },
  { label: "Risk Assessments", href: "/dashboard/sops/risk-assessments" },
  { label: "COSHH Data", href: "/dashboard/sops/coshh" },
];

export default function SOPSubHeader() {
  const pathname = usePathname();
  const normalize = (p?: string) => {
    if (!p) return "";
    return p.endsWith("/") ? p.slice(0, -1) : p;
  };
  const current = normalize(pathname);
  const defaultToTemplates = current === "/dashboard/sops"; // first load of SOPs root

  const isActive = (href: string) => {
    const target = normalize(href);
    if (defaultToTemplates && target === "/dashboard/sops/templates") return true;
    return current.startsWith(target);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = isActive(t.href);
        const base = "px-3 py-1.5 rounded-md text-sm border transition-colors";
        const onClasses = "bg-[#EC4899]/20 dark:bg-pink-500/20 border-[#EC4899]/40 dark:border-pink-500/40 text-[#EC4899] dark:text-pink-300 shadow-[0_0_8px_rgba(236,72,153,0.35)] dark:shadow-[0_0_8px_rgba(236,72,153,0.35)]";
        const offClasses = "bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.06] border-[rgb(var(--border))] dark:border-white/[0.1] text-[rgb(var(--text-secondary))] dark:text-white hover:bg-gray-50 dark:hover:bg-white/[0.1]";
        return (
          <Link key={t.href} href={t.href} scroll={false} className={`${base} ${active ? onClasses : offClasses}`}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

