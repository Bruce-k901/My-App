"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, Search, Calendar, Bell } from '@/components/ui/icons';
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ContextSwitcher } from "./ContextSwitcher";
import { SiteFilter } from "./SiteFilter";
import { SearchBar } from "./SearchBar";
import { ThemeToggle } from "./ThemeToggle";
import { MessageButton } from "./MessageButton";
import { ProfileDropdown } from "./ProfileDropdown";
import { ModuleBar } from "./ModuleBar";
import { BurgerMenu } from "./BurgerMenu";
import { useAppContext } from "@/context/AppContext";
import { useSiteContext } from "@/contexts/SiteContext";
import { usePanelStore } from "@/lib/stores/panel-store";
import { MODULE_HEX, type ModuleKey } from "@/config/module-colors";
import { useTheme } from "@/hooks/useTheme";

interface HeaderProps {
  onMobileMenuClick?: () => void;
  isMobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

export function Header({
  onMobileMenuClick,
  isMobileMenuOpen: externalIsMobileMenuOpen,
  onMobileMenuClose
}: HeaderProps) {
  const { role, profile, user, signOut } = useAppContext();
  const siteContext = useSiteContext();
  const pathname = usePathname();
  const { setAiAssistantOpen, setCalendarOpen, setSearchOpen, setMessagingOpen } = usePanelStore();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Detect current module from pathname for color accents
  const getModuleColor = (): string | null => {
    const pick = (key: ModuleKey) => isDark ? MODULE_HEX[key].light : MODULE_HEX[key].dark;
    if (pathname?.startsWith('/dashboard/stockly')) return pick('stockly');
    if (pathname?.startsWith('/dashboard/people')) return pick('teamly');
    if (pathname?.startsWith('/dashboard/assets') || pathname?.startsWith('/dashboard/ppm')) return pick('assetly');
    if (pathname?.startsWith('/dashboard/planly')) return pick('planly');
    if (pathname?.startsWith('/dashboard/forecastly')) return '#7C3AED'; // Forecastly
    if (pathname?.startsWith('/dashboard/todays_tasks') || pathname?.startsWith('/dashboard/tasks') ||
        pathname?.startsWith('/dashboard/checklists') || pathname?.startsWith('/dashboard/incidents') ||
        pathname?.startsWith('/dashboard/sops') || pathname?.startsWith('/dashboard/risk-assessments')) return pick('checkly');
    // Burger menu pages - Navy blue
    if (pathname?.startsWith('/dashboard/sites') ||
        pathname?.startsWith('/dashboard/users') ||
        pathname?.startsWith('/settings/companies') ||
        pathname?.startsWith('/dashboard/business') ||
        pathname?.startsWith('/dashboard/documents') ||
        pathname?.startsWith('/dashboard/reports') ||
        pathname?.startsWith('/dashboard/eho-report') ||
        pathname?.startsWith('/dashboard/archive') ||
        pathname?.startsWith('/dashboard/settings') ||
        pathname?.startsWith('/dashboard/billing') ||
        pathname?.startsWith('/dashboard/profile')) return '#1E40AF'; // Navy blue
    return null; // Default - no module color
  };

  const moduleColor = getModuleColor();
  
  const [isBurgerMenuOpen, setIsBurgerMenuOpen] = useState(false);
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const burgerMenuButtonRef = useRef<HTMLButtonElement>(null);

  // Use external state if provided, otherwise use internal state
  const isMobileMenuOpen = externalIsMobileMenuOpen !== undefined 
    ? externalIsMobileMenuOpen 
    : internalMobileMenuOpen;

  const setIsMobileMenuOpen = onMobileMenuClose 
    ? (open: boolean) => {
        if (!open) {
          onMobileMenuClose();
        }
      }
    : setInternalMobileMenuOpen;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Map role to burger menu role format
  const burgerMenuRole = (role === 'Admin' ? 'admin' : role === 'Manager' ? 'manager' : 'team') as 'admin' | 'manager' | 'team';

  // Handle mobile menu click - open mobile burger menu
  const handleMobileMenuClick = () => {
    if (onMobileMenuClick) {
      onMobileMenuClick();
    } else {
      setIsMobileMenuOpen(true);
    }
  };

  // Get user info for mobile menu
  const userName = profile?.full_name || 
    (profile?.first_name && profile?.last_name 
      ? `${profile.first_name} ${profile.last_name}` 
      : profile?.email?.split('@')[0] || 'User');
  const userEmail = profile?.email || user?.email || '';
  const userRole = role || 'Team';

  return (
    <>
      <header
        className={cn(
          "h-16 border-b px-6 flex items-center justify-between fixed top-0 left-0 right-0 z-40 print:hidden",
          "bg-[rgb(var(--module-bg-tint))] border-module-fg/[0.18]"
        )}
      >
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={handleMobileMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.06] text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo - Abbreviated (icon only) */}
          <Link href="/dashboard" className="flex items-center">
            <img
              src="/new_logos_opsly/opsly-mark.svg"
              alt="Opsly"
              className="h-10 w-10 object-contain transition-all duration-200 hover:drop-shadow-[0_0_12px_rgba(211,126,145,0.5)]"
              loading="eager"
            />
          </Link>

          {/* Business Context Switcher - Desktop only */}
          <div className="hidden lg:block">
            <ContextSwitcher />
          </div>

          {/* Site Filter - Desktop only */}
          <div className="hidden lg:block">
            <SiteFilter />
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-8 hidden lg:block">
          <SearchBar />
        </div>

        {/* Mobile Search Icon */}
        <button
          onClick={() => setSearchOpen(true)}
          className="lg:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/[0.06] text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle - Desktop only */}
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>

          {/* Messages */}
          <MessageButton />

          {/* Notifications Bell - Desktop only */}
          <button
            onClick={() => setMessagingOpen(true)}
            className="hidden lg:flex items-center justify-center w-10 h-10 rounded-lg bg-module-fg/10 border border-module-fg/30 hover:bg-module-fg/15 hover:shadow-module-glow transition-all relative group"
            aria-label="Notifications"
            style={{ 
              color: moduleColor || 'rgb(var(--text-secondary))'
            }}
          >
            <Bell className="w-5 h-5" />
            {/* Notification Badge - uncomment when connected to data */}
            {/* <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span> */}
          </button>

          {/* Calendar Button */}
          <button
            onClick={() => setCalendarOpen(true)}
            className="hidden lg:flex items-center justify-center w-10 h-10 rounded-lg bg-module-fg/10 border border-module-fg/30 text-teal-500 hover:bg-module-fg/10 hover:shadow-module-glow transition-all"
            aria-label="Open Calendar"
          >
            <Calendar className="w-4 h-4" />
          </button>

          {/* Ask Opsly Button */}
          <button
            onClick={() => setAiAssistantOpen(true)}
            className="flex items-center px-3 py-2 rounded-lg bg-[#D37E91]/10 border border-[#D37E91]/50 text-[#D37E91] hover:bg-[#D37E91]/20 hover:shadow-module-glow transition-all h-10"
            aria-label="Ask Opsly"
          >
            <span className="font-medium text-sm whitespace-nowrap">Ask Opsly</span>
          </button>

          {/* Burger Menu Button - Desktop only */}
          <button
            ref={burgerMenuButtonRef}
            onClick={() => setIsBurgerMenuOpen(!isBurgerMenuOpen)}
            className={`
              hidden lg:flex items-center justify-center w-10 h-10 rounded-lg transition-all
              ${isBurgerMenuOpen
                ? "bg-black/[0.05] dark:bg-white/[0.08] border border-[#D37E91]"
                : "bg-black/[0.03] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
              }
            `}
            aria-label="Menu"
          >
            <Menu className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary" />
          </button>

          {/* Profile - Hidden on mobile, shown in burger menu */}
          <div className="hidden lg:block">
            <ProfileDropdown />
          </div>
        </div>
      </header>

      {/* Module Bar - Second header bar */}
      <ModuleBar />

      {/* Burger Menu - Desktop only */}
      {mounted && (
        <BurgerMenu
          isOpen={isBurgerMenuOpen}
          onClose={() => setIsBurgerMenuOpen(false)}
          userRole={burgerMenuRole}
        />
      )}

    </>
  );
}
