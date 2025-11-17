"use client";

import { useState } from "react";
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
  GraduationCap,
  CalendarDays,
  Clock,
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { isRoleGuardEnabled } from "@/lib/featureFlags";
import ClockInOut from "@/components/attendance/ClockInOut";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  
  // Organization Section
  { label: "Business Details", href: "/dashboard/business", icon: Building2, section: "organization" },
  { label: "Sites", href: "/dashboard/sites", icon: MapPin, section: "organization" },
  { label: "Users", href: "/dashboard/users", icon: Users, section: "organization" },
  { label: "Training Matrix", href: "/dashboard/training", icon: GraduationCap, section: "organization" },
  { label: "Manager Calendar", href: "/dashboard/calendar", icon: CalendarDays, section: "organization" },
  { label: "Contractors", href: "/dashboard/assets/contractors", icon: UserCog, section: "organization" },
  { label: "Documents", href: "/dashboard/documents", icon: FileCheck, section: "organization" },
  
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
  
  // Logs Section
  { label: "Attendance Register", href: "/dashboard/logs/attendance", icon: Clock, section: "logs" },
  { label: "Temperature Logs", href: "/logs/temperature", icon: BarChart3, section: "logs" },
  
  // Other Main Items
  { label: "EHO Readiness", href: "/dashboard/eho-report", icon: BadgeCheck },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Support", href: "/dashboard/support", icon: Globe },
];

export function MainSidebar({ isMinimized, onToggleMinimize, currentPage }: MainSidebarProps) {
  const pathname = usePathname();
  const { role } = useAppContext();
  const [isHovered, setIsHovered] = useState(false);
  
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
    // Handle items without sections (like Dashboard, EHO Readiness, etc.)
    const itemSection = item.section || undefined;
    
    if (itemSection !== currentSection) {
      // Save previous group if it has items
      if (currentGroup.length > 0) {
        groupedItems.push({ section: currentSection, items: currentGroup });
      }
      // Start new group
      currentGroup = [item];
      currentSection = itemSection;
    } else {
      // Add to current group
      currentGroup.push(item);
    }
  });
  
  // Don't forget the last group
  if (currentGroup.length > 0) {
    groupedItems.push({ section: currentSection, items: currentGroup });
  }
  
  // Debug: Log grouped items to console (remove in production)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('Sidebar grouped items:', groupedItems.map(g => ({ section: g.section, count: g.items.length })));
  }

  const sidebarWidth = isHovered ? 'w-64' : 'w-16';

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen ${sidebarWidth} bg-[#0B0D13] border-r border-white/[0.1] flex flex-col py-6 gap-2 z-40 overflow-y-auto no-scrollbar transition-all duration-300`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Clock In/Out Component - Show full component when expanded, icon when collapsed */}
      {isHovered ? (
        <div className="px-2 mb-2">
          <ClockInOut />
        </div>
      ) : (
        <div className="px-2 mb-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/70 hover:text-pink-400 hover:bg-white/[0.08] transition-all duration-200 cursor-pointer group relative">
            <Clock className="w-5 h-5" />
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-[#14161c]/95 backdrop-blur-sm text-white/90 text-sm rounded-md border border-white/[0.08] shadow-[0_0_14px_rgba(236,72,153,0.25)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              Clock In/Out
            </div>
          </div>
        </div>
      )}
      
      {/* Nav Items */}
      <nav className="flex flex-col gap-1 px-2 w-full">
        {groupedItems.map((group, groupIdx) => (
          <div key={groupIdx} className="w-full">
            {/* Add subtle divider between sections */}
            {groupIdx > 0 && (
              <div className={`h-px bg-white/[0.05] my-3 ${isHovered ? 'w-full' : 'w-8 mx-auto'}`} />
            )}
            
            {/* Section header (only show when hovered/expanded) */}
            {isHovered && group.section && (
              <div className="px-3 py-2 mb-1">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                  {group.section}
                </span>
              </div>
            )}
            
            {group.items.map(({ label, href, icon: Icon }) => {
              const active = isActive(href);
              return (
                <div key={href} className="relative group">
                  <Link
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
                    {isHovered && (
                      <span className="text-sm font-medium truncate opacity-100 transition-opacity duration-200">
                        {label}
                      </span>
                    )}
                  </Link>
                  
                  {/* Tooltip for collapsed state */}
                  {!isHovered && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-[#14161c]/95 backdrop-blur-sm text-white/90 text-sm rounded-md border border-white/[0.08] shadow-[0_0_14px_rgba(236,72,153,0.25)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      {label}
                    </div>
                  )}
                </div>
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