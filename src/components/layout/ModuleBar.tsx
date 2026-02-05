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
 * - Forecastly (/dashboard/forecastly): Sales forecasting (Coming Soon)
 *
 * Features:
 * - Active module is highlighted with its brand color
 * - Disabled modules show "Coming Soon" badge
 * - ClockInButton is positioned on the right side for quick access
 *
 * Styling:
 * - Fixed position below DashboardHeader (top-16, z-30)
 * - 56px height (h-14)
 * - Light blue background in light mode, dark gray in dark mode
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  Package,
  Factory,
  TrendingUp,
  Wrench,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ClockInButton } from "@/components/notifications/ClockInButton";

interface Module {
  name: string;
  href: string;
  icon: React.ElementType;
  color: string;
  disabled?: boolean;
  badge?: string;
}

const modules: Module[] = [
  {
    name: "Checkly",
    href: "/dashboard/tasks",
    icon: CheckSquare,
    color: "#EC4899",
  },
  {
    name: "Stockly",
    href: "/dashboard/stockly",
    icon: Package,
    color: "#10B981",
  },
  {
    name: "Teamly",
    href: "/dashboard/people",
    icon: Users,
    color: "#2563EB",
  },
  {
    name: "Assetly",
    href: "/dashboard/assets",
    icon: Wrench,
    color: "#0284C7",
  },
  {
    name: "Planly",
    href: "/dashboard/planly",
    icon: Factory,
    color: "#14B8A6",
  },
  {
    name: "Forecastly",
    href: "/dashboard/forecastly",
    icon: TrendingUp,
    color: "#7C3AED",
    disabled: true,
    badge: "Coming Soon",
  },
];

export function ModuleBar() {
  const pathname = usePathname();

  return (
    <div className="h-14 bg-blue-50 dark:bg-[#1a1a1a] border-b border-[rgb(var(--border))] dark:border-white/[0.06] px-6 flex items-center justify-between fixed top-16 left-0 right-0 z-30 print:hidden">
      <div className="flex items-center gap-2 overflow-x-auto">
        {modules.map((module) => {
          const Icon = module.icon;
          const isActive =
            pathname === module.href || pathname.startsWith(module.href + "/");

          if (module.disabled) {
            return (
              <div
                key={module.name}
                className="flex items-center gap-2 px-4 py-2 rounded-lg opacity-40 cursor-not-allowed pointer-events-none"
              >
                <Icon className="w-5 h-5" style={{ color: module.color }} />
                <span className="text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))] dark:text-white/80">
                  {module.name}
                </span>
                {module.badge && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-[#EC4899] text-[rgb(var(--text-primary))] dark:text-white rounded-full">
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
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                isActive
                  ? "bg-black/[0.06] dark:bg-white/[0.06]"
                  : "hover:bg-black/[0.03] dark:bg-white/[0.03]"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5",
                  !isActive && "text-[rgb(var(--text-secondary))] dark:text-white/60"
                )}
                style={{ 
                  color: isActive ? module.color : undefined
                }}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  !isActive && "text-[rgb(var(--text-secondary))] dark:text-white/80"
                )}
                style={isActive ? { color: module.color } : undefined}
              >
                {module.name}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Clock In Button */}
      <div className="flex-shrink-0 ml-4">
        <ClockInButton />
      </div>
    </div>
  );
}
