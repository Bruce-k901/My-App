"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Business Details", href: "/dashboard/business" },
  { label: "Sites", href: "/dashboard/sites" },
  { label: "Users", href: "/dashboard/users" },
  { label: "Emergency Contacts", href: "/dashboard/organization/emergency-contacts" },
  { label: "Contractors", href: "/dashboard/assets/contractors" },
  { label: "Documents/Policies", href: "/dashboard/documents" },
];

export default function OrgSubHeader() {
  const pathname = usePathname();
  const normalize = (p?: string) => {
    if (!p) return "";
    return p.endsWith("/") ? p.slice(0, -1) : p;
  };
  const current = normalize(pathname);
  const defaultToBusiness = current === "/organization" || current === "/dashboard/organization"; // first load of org root

  const isActive = (href: string) => {
    const target = normalize(href);
    if (defaultToBusiness && target === "/dashboard/business") return true;
    return current.startsWith(target);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = isActive(t.href);
        const base = "px-3 py-1.5 rounded-md text-sm border transition-colors";
        const onClasses = "bg-[#D37E91]/25 border-[#D37E91]/40 text-[#D37E91] shadow-[0_0_8px_rgba(211, 126, 145,0.35)]";
        const offClasses = "bg-white/[0.06] border-white/[0.1] text-theme-primary hover:bg-white/[0.1]";
        return (
          <Link key={t.href} href={t.href} scroll={false} className={`${base} ${active ? onClasses : offClasses}`}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}