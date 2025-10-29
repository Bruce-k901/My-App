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
  BadgeCheck,
  MapPin,
  UserCog,
  FileCheck,
  Briefcase,
  LayoutTemplate,
  Library,
  ShieldCheck,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Copy,
  Trash2,
  Archive,
  CheckSquare,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { isRoleGuardEnabled } from "@/lib/featureFlags";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  
  // Organization Section
  { label: "Business Details", href: "/dashboard/organization/business-details", icon: Building2, section: "organization" },
  { label: "Sites", href: "/dashboard/organization/sites", icon: MapPin, section: "organization" },
  { label: "Users", href: "/dashboard/organization/users", icon: Users, section: "organization" },
  { label: "Contractors", href: "/dashboard/organization/contractors", icon: UserCog, section: "organization" },
  { label: "Documents", href: "/dashboard/organization/documents", icon: FileCheck, section: "organization" },
  
  // Tasks Section
  { label: "My Tasks", href: "/dashboard/tasks", icon: ClipboardList, section: "tasks" },
  { label: "Scheduled Tasks", href: "/dashboard/tasks/scheduled", icon: Calendar, section: "tasks" },
  { label: "Completed Tasks", href: "/dashboard/tasks/completed", icon: CheckCircle, section: "tasks" },
  { label: "Task Templates", href: "/dashboard/tasks/templates", icon: LayoutTemplate, section: "tasks" },
  { label: "Compliance Templates", href: "/dashboard/compliance-templates", icon: ShieldCheck, section: "tasks" },
  { label: "Task Settings", href: "/dashboard/tasks/settings", icon: Settings, section: "tasks" },
  
  // SOPs Section
  { label: "My SOPs", href: "/dashboard/sops/list", icon: FileText, section: "sops" },
  { label: "SOP Templates", href: "/dashboard/sops/templates", icon: LayoutTemplate, section: "sops" },
  { label: "Risk Assessments", href: "/dashboard/sops/risk-assessments", icon: AlertTriangle, section: "sops" },
  { label: "RA Templates", href: "/dashboard/risk-assessments", icon: Copy, section: "sops" },
  { label: "COSHH Data", href: "/dashboard/coshh-data", icon: Trash2, section: "sops" },
  { label: "SOP Libraries", href: "/dashboard/sops/libraries", icon: Library, section: "sops" },
  
  // Assets Section
  { label: "Assets", href: "/dashboard/assets", icon: Box, section: "assets" },
  { label: "PPM Schedule", href: "/dashboard/ppm", icon: Wrench, section: "assets" },
  { label: "Callout Logs", href: "/dashboard/organization", icon: FileText, section: "assets" },
  { label: "Archived Assets", href: "/dashboard/archived-assets", icon: Archive, section: "assets" },
  
  // Checklists Section
  { label: "Daily Checklists", href: "/dashboard/checklists", icon: CheckSquare, section: "checklists" },
  { label: "Checklist Templates", href: "/dashboard/checklists/templates", icon: LayoutTemplate, section: "checklists" },
  
  // Other Main Items
  { label: "EHO Readiness", href: "/dashboard/eho-report", icon: BadgeCheck },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Support", href: "/dashboard/support", icon: Globe },
];

export function MainSidebar({ isMinimized, onToggleMinimize, currentPage }: MainSidebarProps) {
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

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  // Group items by section for visual separation
  const groupedItems: { section?: string; items: typeof navItems }[] = [];
  let currentGroup: typeof navItems = [];
  let currentSection: string | undefined = undefined;

  filtered.forEach((item) => {
    if (item.section !== currentSection) {
      if (currentGroup.length > 0) {
        groupedItems.push({ section: currentSection, items: currentGroup });
      }
      currentGroup = [item];
      currentSection = item.section;
    } else {
      currentGroup.push(item);
    }
  });
  
  if (currentGroup.length > 0) {
    groupedItems.push({ section: currentSection, items: currentGroup });
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0B0D13] border-r border-white/[0.1] flex flex-col py-6 gap-2 z-40 overflow-y-auto no-scrollbar">
      {/* Nav Items with Labels */}
      <nav className="flex flex-col gap-1 px-4 w-full">
        {groupedItems.map((group, groupIdx) => (
          <div key={groupIdx} className="w-full">
            {/* Add subtle divider between sections */}
            {groupIdx > 0 && (
              <div className="w-full h-px bg-white/[0.05] my-3" />
            )}
            
            {group.items.map(({ label, href, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl relative transition-all duration-200 
                    ${
                      active
                        ? "text-pink-400 bg-white/[0.12] shadow-[0_0_12px_rgba(236,72,153,0.35)]"
                        : "text-white/70 hover:text-pink-400 hover:bg-white/[0.08] hover:shadow-[0_0_10px_rgba(236,72,153,0.25)]"
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

interface MainSidebarProps {
  isMinimized: boolean
  onToggleMinimize: () => void
  currentPage: string
}