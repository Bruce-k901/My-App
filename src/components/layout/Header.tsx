"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, Search, Sparkles } from "lucide-react";
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
  const { setAiAssistantOpen } = usePanelStore();
  
  // Detect current module from pathname for color accents
  const getModuleColor = () => {
    if (pathname?.startsWith('/dashboard/stockly')) return '#10B981'; // Emerald
    if (pathname?.startsWith('/dashboard/people')) return '#2563EB'; // Blue
    if (pathname?.startsWith('/dashboard/assets') || pathname?.startsWith('/dashboard/ppm')) return '#0284C7'; // Sky blue
    if (pathname?.startsWith('/dashboard/planly')) return '#14B8A6'; // Teal
    if (pathname?.startsWith('/dashboard/forecastly')) return '#7C3AED'; // Purple
    if (pathname?.startsWith('/dashboard/todays_tasks') || pathname?.startsWith('/dashboard/tasks') || 
        pathname?.startsWith('/dashboard/checklists') || pathname?.startsWith('/dashboard/incidents') || 
        pathname?.startsWith('/dashboard/sops') || pathname?.startsWith('/dashboard/risk-assessments')) return '#EC4899'; // Magenta
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
        className="h-16 bg-blue-50 dark:bg-[#1a1a1a] border-b border-blue-200 dark:border-white/[0.06] px-6 flex items-center justify-between fixed top-0 left-0 right-0 z-40"
        style={moduleColor ? {
          borderBottomColor: moduleColor === '#EC4899' ? 'rgba(236, 72, 153, 0.3)' :
                             moduleColor === '#10B981' ? 'rgba(16, 185, 129, 0.3)' :
                             moduleColor === '#2563EB' ? 'rgba(37, 99, 235, 0.3)' :
                             moduleColor === '#0284C7' ? 'rgba(2, 132, 199, 0.3)' :
                             moduleColor === '#14B8A6' ? 'rgba(20, 184, 166, 0.3)' :
                             moduleColor === '#7C3AED' ? 'rgba(124, 58, 237, 0.3)' : undefined
        } : {}}
      >
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={handleMobileMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.06] text-[rgb(var(--text-secondary))] dark:text-white/60 hover:text-[rgb(var(--text-primary))] dark:hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo - Abbreviated (icon only) */}
          <Link href="/dashboard" className="flex items-center">
            <img
              src="/opsly_new_hexstyle_favicon.PNG"
              alt="Opsly"
              className="h-10 w-10 object-contain transition-all duration-200 hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]"
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
        <button className="lg:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/[0.06] text-[rgb(var(--text-secondary))] dark:text-white/60 hover:text-[rgb(var(--text-primary))] dark:hover:text-white transition-colors">
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

          {/* Ask AI Button */}
          <button
            onClick={() => setAiAssistantOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#EC4899]/10 border border-[#EC4899]/50 text-[#EC4899] hover:bg-[#EC4899]/20 hover:shadow-[0_0_12px_rgba(236,72,153,0.5)] transition-all h-10"
            aria-label="Ask AI Assistant"
          >
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium text-sm whitespace-nowrap hidden sm:inline">Ask AI</span>
          </button>

          {/* Burger Menu Button - Desktop only */}
          <button
            ref={burgerMenuButtonRef}
            onClick={() => setIsBurgerMenuOpen(!isBurgerMenuOpen)}
            className={`
              hidden lg:flex items-center justify-center w-10 h-10 rounded-lg transition-all
              ${isBurgerMenuOpen
                ? "bg-black/[0.05] dark:bg-white/[0.08] border border-[#EC4899]"
                : "bg-black/[0.03] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
              }
            `}
            aria-label="Menu"
          >
            <Menu className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-white/60" />
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
