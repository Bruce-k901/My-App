"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Templates", href: "/dashboard/tasks/templates" },
  { label: "Drafts", href: "/dashboard/tasks/drafts" },
  { label: "Scheduled", href: "/dashboard/tasks/scheduled" },
  { label: "Completed", href: "/dashboard/tasks/completed" },
  { label: "Settings", href: "/dashboard/tasks/settings" },
];

export default function TaskSubHeader() {
  const pathname = usePathname();
  const normalize = (p?: string) => {
    if (!p) return "";
    return p.endsWith("/") ? p.slice(0, -1) : p;
  };
  const current = normalize(pathname);
  const defaultToTemplates = current === "/dashboard/tasks"; // first load of Tasks root

  const isActive = (href: string) => {
    const target = normalize(href);
    if (defaultToTemplates && target === "/dashboard/tasks/templates") return true;
    return current.startsWith(target);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = isActive(t.href);
        const base = "px-3 py-1.5 rounded-md text-sm border transition-colors";
        const onClasses = "bg-pink-500/20 border-pink-500/40 text-pink-300 shadow-[0_0_8px_rgba(236,72,153,0.35)]";
        const offClasses = "bg-white/[0.06] border-white/[0.1] text-white hover:bg-white/[0.1]";
        return (
          <Link key={t.href} href={t.href} scroll={false} className={`${base} ${active ? onClasses : offClasses}`}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

