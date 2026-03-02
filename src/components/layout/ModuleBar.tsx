/**
 * @ai-knowledge
 * @title Module Navigation Bar
 * @category Components
 * @subcategory Navigation
 * @tags navigation, modules, header, checkly, stockly, teamly, assetly, planly
 *
 * The ModuleBar is the second header bar that displays application modules.
 *
 * Available Modules:
 * - Checkly (/dashboard/tasks): Task management and checklists
 * - Stockly (/dashboard/stockly): Inventory and stock management
 * - Teamly (/dashboard/people): HR, attendance, scheduling, payroll
 * - Assetly (/dashboard/assets): Asset tracking and maintenance
 * - Planly (/dashboard/planly): Production planning and orders
 *
 * Features:
 * - Active module is highlighted with its brand color (theme-aware)
 * - Dark theme: light module colour for text/border
 * - Light theme: dark module colour for text/border
 * - ClockInButton is positioned on the right side for quick access
 *
 * Styling:
 * - Fixed position below DashboardHeader (top-16, z-30)
 * - 56px height (h-14)
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  Package,
  Factory,
  Wrench,
  Users,
} from '@/components/ui/icons';
import { cn } from "@/lib/utils";
import { ClockInButton } from "@/components/notifications/ClockInButton";
import type { ModuleKey } from "@/config/module-colors";

interface Module {
  name: string;
  href: string;
  icon: React.ElementType;
  moduleKey: ModuleKey;
  disabled?: boolean;
  badge?: string;
  /** Extra path prefixes that belong to this module (for active-state matching) */
  extraPaths?: string[];
}

const modules: Module[] = [
  {
    name: "Checkly",
    href: "/dashboard/tasks",
    icon: CheckSquare,
    moduleKey: "checkly",
    extraPaths: ["/dashboard/todays_tasks", "/dashboard/checklists", "/dashboard/incidents", "/dashboard/sops", "/dashboard/risk-assessments", "/dashboard/logs"],
  },
  {
    name: "Stockly",
    href: "/dashboard/stockly",
    icon: Package,
    moduleKey: "stockly",
    extraPaths: ["/dashboard/reports/stockly"],
  },
  {
    name: "Teamly",
    href: "/dashboard/people",
    icon: Users,
    moduleKey: "teamly",
    extraPaths: ["/dashboard/courses"],
  },
  {
    name: "Assetly",
    href: "/dashboard/assets",
    icon: Wrench,
    moduleKey: "assetly",
    extraPaths: ["/dashboard/ppm"],
  },
  {
    name: "Planly",
    href: "/dashboard/planly",
    icon: Factory,
    moduleKey: "planly",
  },
];

export function ModuleBar() {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "h-14 border-b px-6 flex items-center fixed top-16 left-0 right-0 z-30 print:hidden",
        "bg-[rgb(var(--module-bg-tint))] border-module-fg/[0.18]"
      )}
    >
      <div className="flex-1" />
      <div className="flex items-center gap-2 overflow-x-auto">
        {modules.map((module) => {
          const Icon = module.icon;
          const allPaths = [module.href, ...(module.extraPaths || [])];
          const isActive = allPaths.some(
            (p) => pathname === p || pathname.startsWith(p + "/")
          );

          if (module.disabled) {
            return (
              <div
                key={module.name}
                className="flex items-center gap-2 px-4 py-2 rounded-lg opacity-40 cursor-not-allowed pointer-events-none"
              >
                <Icon className="w-5 h-5 text-module-fg" />
                <span className="text-sm font-medium text-[#999] dark:text-theme-tertiary">
                  {module.name}
                </span>
                {module.badge && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-[#D37E91] text-white rounded-full">
                    {module.badge}
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={module.name}
              href={module.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all relative",
                !isActive && "hover:bg-module-fg/[0.04] group"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-colors",
                  isActive
                    ? "text-module-fg"
                    : "text-[#999] dark:text-theme-secondary group-hover:text-[#666] dark:group-hover:text-theme-primary"
                )}
              />
              <span
                className={cn(
                  "text-sm transition-colors",
                  isActive
                    ? "font-semibold text-module-fg"
                    : "font-medium text-[#999] dark:text-theme-secondary group-hover:text-[#666] dark:group-hover:text-theme-primary"
                )}
              >
                {module.name}
              </span>
              {/* Active bottom border indicator */}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-t-full bg-module-fg" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Clock In Button */}
      <div className="flex-1 flex justify-end">
        <ClockInButton />
      </div>
    </div>
  );
}
