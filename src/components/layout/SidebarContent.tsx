"use client";

import { usePathname } from "next/navigation";
import {
  Home,
  CheckSquare,
  Package,
  Factory,
  TrendingUp,
  Wrench,
  Users,
  Building2,
  FileText,
  Shield,
  Target,
  MessageSquare,
  CheckCircle,
  Bell,
  BarChart3,
  Settings,
  CreditCard,
  HelpCircle,
} from '@/components/ui/icons';
import { NavSection } from "./NavSection";
import { NavItem } from "./NavItem";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { usePanelStore } from "@/lib/stores/panel-store";

export function SidebarContent() {
  const pathname = usePathname();
  const { unreadCount } = useUnreadMessageCount();
  const { setMessagingOpen } = usePanelStore();

  return (
    <>
      {/* Overview */}
      <div className="p-4">
        <NavItem
          icon={<Home />}
          label="Overview"
          href="/dashboard"
          active={pathname === "/dashboard"}
        />
      </div>

      {/* Operations Section */}
      <NavSection title="OPERATIONS">
        <NavItem
          icon={<CheckSquare />}
          label="Checkly"
          href="/dashboard/tasks"
          color="#F1E194"
          active={pathname?.startsWith("/dashboard/tasks") || pathname?.startsWith("/dashboard/todays_tasks")}
        />
        <NavItem
          icon={<Package />}
          label="Stockly"
          href="/dashboard/stockly"
          color="#789A99"
          active={pathname?.startsWith("/dashboard/stockly")}
        />
        <NavItem
          icon={<Factory />}
          label="Planly"
          href="/dashboard/planly"
          color="#ACC8A2"
          active={pathname?.startsWith("/dashboard/planly")}
        />
        <NavItem
          icon={<TrendingUp />}
          label="Forecastly"
          href="/dashboard/forecastly"
          color="#7C3AED"
          disabled
          badge="Coming Soon"
        />
      </NavSection>

      {/* Facilities Section */}
      <NavSection title="FACILITIES & ASSETS">
        <NavItem
          icon={<Wrench />}
          label="Assetly"
          href="/dashboard/assets"
          color="#F3E7D9"
          active={pathname?.startsWith("/dashboard/assets")}
        />
      </NavSection>

      {/* People Section */}
      <NavSection title="PEOPLE & CULTURE">
        <NavItem
          icon={<Users />}
          label="Teamly"
          href="/dashboard/people"
          color="#D37E91"
          active={pathname?.startsWith("/dashboard/people")}
        />
      </NavSection>

      {/* Organization Section */}
      <NavSection title="ORGANIZATION">
        <NavItem
          icon={<Building2 />}
          label="Sites"
          href="/dashboard/sites"
          active={pathname?.startsWith("/dashboard/sites")}
        />
        <NavItem
          icon={<FileText />}
          label="Documents"
          href="/dashboard/documents"
          active={pathname?.startsWith("/dashboard/documents")}
        />
        <NavItem
          icon={<Shield />}
          label="Users & Access"
          href="/dashboard/users"
          active={pathname?.startsWith("/dashboard/users")}
        />
        <NavItem
          icon={<Target />}
          label="Business Setup"
          href="/dashboard/business"
          active={pathname?.startsWith("/dashboard/business")}
        />
      </NavSection>

      {/* Workspace Section */}
      <NavSection title="WORKSPACE">
        <NavItem
          icon={<MessageSquare />}
          label="Messages"
          href="/dashboard/messaging"
          badge={unreadCount > 0 ? unreadCount : undefined}
          active={pathname?.startsWith("/dashboard/messaging")}
          onClick={() => setMessagingOpen(true)}
        />
        <NavItem
          icon={<CheckCircle />}
          label="My Tasks"
          href="/dashboard/my_tasks"
          active={pathname?.startsWith("/dashboard/my_tasks")}
        />
        <NavItem
          icon={<Bell />}
          label="Reminders"
          href="/dashboard/reminders"
          active={pathname?.startsWith("/dashboard/reminders")}
        />
        <NavItem
          icon={<BarChart3 />}
          label="Reports"
          href="/dashboard/reports"
          active={pathname?.startsWith("/dashboard/reports")}
        />
      </NavSection>

      {/* Divider */}
      <div className="mx-4 my-2 border-t border-white/[0.06]" />

      {/* Bottom Section */}
      <div className="mt-auto p-4 space-y-1">
        <NavItem
          icon={<Settings />}
          label="Settings"
          href="/dashboard/settings"
          active={pathname?.startsWith("/dashboard/settings")}
        />
        <NavItem
          icon={<CreditCard />}
          label="Billing & Plan"
          href="/dashboard/billing"
          active={pathname?.startsWith("/dashboard/billing")}
        />
        <NavItem
          icon={<HelpCircle />}
          label="Help & Support"
          href="/dashboard/support"
          active={pathname?.startsWith("/dashboard/support")}
        />
      </div>
    </>
  );
}
