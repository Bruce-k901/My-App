import {
  LayoutDashboard,
  Building2,
  Users2,
  ClipboardCheck,
  Package,
  Wrench,
  FileText,
  BarChart3,
  Settings,
  LifeBuoy,
  ShieldCheck,
} from "lucide-react";

export const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Organization", href: "/dashboard/business", icon: Building2 },
  { label: "Users", href: "/dashboard/users", icon: Users2 },
  { label: "Tasks", href: "/dashboard/tasks", icon: ClipboardCheck },
  { label: "Assets", href: "/dashboard/assets", icon: Package },
  { label: "PPM Schedule", href: "/dashboard/ppm", icon: Wrench },
  { label: "SOPs", href: "/dashboard/sops", icon: FileText },
  { label: "EHO Report", href: "/dashboard/eho-report", icon: ShieldCheck },
  { label: "Alerts & Reporting", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Help", href: "/dashboard/help", icon: LifeBuoy },
];

export type NavItem = (typeof navItems)[number];