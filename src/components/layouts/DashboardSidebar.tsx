"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Building2,
  Users,
  ClipboardList,
  Box,
  Wrench,
  FileText,
  BarChart3,
  Settings,
  Globe,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { isRoleGuardEnabled } from "@/lib/featureFlags";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Organization", href: "/dashboard/organization", icon: Building2 },
  { label: "Users", href: "/dashboard/users", icon: Users },
  { label: "Tasks", href: "/dashboard/tasks", icon: ClipboardList },
  { label: "Assets", href: "/dashboard/assets", icon: Box },
  { label: "PPM Schedule", href: "/dashboard/ppm", icon: Wrench },
  { label: "SOPs", href: "/dashboard/sops", icon: FileText },
  { label: "EHO Readiness", href: "/dashboard/eho-report", icon: BadgeCheck },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Support", href: "/dashboard/support", icon: Globe },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { role } = useAppContext();
  const filtered = isRoleGuardEnabled()
    ? navItems.filter((item: any) => {
        if (item.roles && Array.isArray(item.roles)) {
          return item.roles.includes(role as any);
        }
        return true;
      })
    : navItems;

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 bg-[#0B0D13] border-r border-white/[0.1] flex flex-col items-center py-6 gap-4 z-40">
      {/* Nav Icons */}
      <nav className="flex flex-col gap-3 items-center">
        {filtered.map(({ label, href, icon: Icon }) => {
          const isDashboard = href === "/dashboard";
          // For items under /dashboard/<segment>, also treat top-level /<segment> as active
          const segment = href.startsWith("/dashboard/") ? href.slice("/dashboard".length) : href; // e.g. "/organization"
          const isActive = isDashboard
            ? pathname === "/dashboard"
            : pathname.startsWith(href) || (!!segment && pathname.startsWith(segment));
          return (
            <div key={href} className="relative group">
              <Link
                href={href}
                className={`flex items-center justify-center w-10 h-10 rounded-xl relative transition-all duration-200 
                  ${
                    isActive
                      ? "bg-white/[0.12] text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.35)] active-glow"
                      : "text-white/70 hover:bg-white/[0.06] hover:text-pink-400 hover:shadow-[0_0_10px_rgba(236,72,153,0.25)]"
                  }`}
              >
                <Icon className="w-5 h-5" />
              </Link>

              {/* Tooltip */}
              <div
                className="absolute left-14 top-1/2 -translate-y-1/2 
                bg-[#14161c]/95 backdrop-blur-sm text-white/90 text-sm rounded-md px-3 py-1.5 
                border border-white/[0.08] shadow-[0_0_14px_rgba(236,72,153,0.25)] opacity-0 
                pointer-events-none group-hover:opacity-100 
                group-hover:pointer-events-auto transition-opacity duration-200 whitespace-nowrap"
              >
                <span
                  className={`text-[0.95rem] font-semibold tracking-wide transition-all duration-150 
                  ${
                    isActive
                      ? "text-white drop-shadow-[0_0_6px_rgba(236,72,153,0.5)]"
                      : "text-white/75 hover:text-white hover:drop-shadow-[0_0_4px_rgba(236,72,153,0.3)]"
                  }`}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}