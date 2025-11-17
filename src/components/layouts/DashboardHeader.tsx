"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { LogOut, ClipboardCheck, AlertTriangle, Menu, LayoutGrid, ShieldCheck, Settings, BookOpen, UtensilsCrossed, MessageSquare, FileText, Building2, Box, BarChart3, User, Lock, CreditCard, Users, MapPin, Clock, Plug, Calendar, LayoutTemplate, UserX } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { getMenuItemsByRole } from "@/components/layout/navigation";
import { format } from "date-fns";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { ClockInButton } from "@/components/notifications/ClockInButton";

// Menu items removed - now using BurgerMenu component

interface DashboardHeaderProps {
  onMobileMenuClick?: () => void;
}

export default function DashboardHeader({ onMobileMenuClick }: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { company, role } = useAppContext();
  const [isBurgerMenuOpen, setIsBurgerMenuOpen] = useState(false);
  const [isIncidentsMenuOpen, setIsIncidentsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Initialize with a safe value to prevent hydration mismatch
  // Will be updated after mount on the client
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const incidentsHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get unread message count (lightweight - doesn't load all conversations)
  const { unreadCount: unreadMessageCount } = useUnreadMessageCount();
  const incidentsButtonRef = useRef<HTMLButtonElement>(null);
  const incidentsMenuRef = useRef<HTMLDivElement>(null);
  const burgerMenuButtonRef = useRef<HTMLButtonElement>(null);
  const burgerMenuRef = useRef<HTMLDivElement>(null);
  const companyLogo = (company?.logo_url as string | undefined) || "/assets/logo.svg";
  
  // Map role to burger menu role format
  const burgerMenuRole = (role === 'Admin' ? 'admin' : role === 'Manager' ? 'manager' : 'team') as 'admin' | 'manager' | 'team';
  const burgerMenuSections = getMenuItemsByRole(burgerMenuRole);

  // Set mounted flag and initialize time after client-side mount
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
  }, []);

  // Clock tick - only run after mount
  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [mounted]);

  
  // Icon mapping for menu items
  const iconMap: Record<string, any> = {
    dashboard: LayoutGrid,
    organization: Building2,
    sops: FileText,
    tasks: ClipboardCheck,
    assets: Box,
    'eho-readiness': ShieldCheck,
    reports: BarChart3,
    settings: Settings,
    profile: User,
    password: Lock,
    billing: CreditCard,
    signout: LogOut,
    'my-tasks': ClipboardCheck,
    templates: LayoutTemplate,
    compliance: ShieldCheck,
    'todays-checks': Calendar,
    'compliance-reports': BarChart3,
    incidents: AlertTriangle,
    'food-poisoning': UtensilsCrossed,
    contractor: Users,
    sites: MapPin,
    users: Users,
    'business-hours': Clock,
    integrations: Plug,
  };

  // Ensure we're mounted before using portals
  useEffect(() => {
    setMounted(true);
  }, []);

  const incidentsMenuItems = [
    { label: "Incidents", href: "/dashboard/incidents", icon: AlertTriangle },
    { label: "Food Poisoning", href: "/dashboard/incidents/food-poisoning", icon: UtensilsCrossed },
    { label: "Customer Complaints", href: "/dashboard/incidents/customer-complaints", icon: MessageSquare },
    { label: "Staff Sickness", href: "/dashboard/incidents/staff-sickness", icon: UserX },
    { label: "Incident Log", href: "/dashboard/incidents/storage", icon: FileText },
  ];

  // Close menus when route changes
  useEffect(() => {
    setIsBurgerMenuOpen(false);
    setIsIncidentsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (incidentsHoverTimeoutRef.current) {
        clearTimeout(incidentsHoverTimeoutRef.current);
      }
    };
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if click is on a link inside menu - allow it to navigate
      const clickedLink = target.closest('a');
      const isInMenu = target.closest('[data-menu]');
      const isInIncidentsMenu = target.closest('[data-incidents-menu]');
      
      if (clickedLink && (isInMenu || isInIncidentsMenu)) {
        // Link clicked inside menu - allow navigation, menu will close via pathname change
        return;
      }
      
      const isIncidentsButton = incidentsButtonRef.current?.contains(target);
      const isIncidentsMenu = incidentsMenuRef.current?.contains(target);
      const isBurgerMenuButton = burgerMenuButtonRef.current?.contains(target);
      const isBurgerMenu = burgerMenuRef.current?.contains(target);
      
      if (!isIncidentsButton && !isIncidentsMenu) {
        setIsIncidentsMenuOpen(false);
      }
      
      if (!isBurgerMenuButton && !isBurgerMenu) {
        setIsBurgerMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Logout handler for burger menu
  const handleLogout = async () => {
    try {
      console.log("🔄 Logging out...");

      // Sign out from Supabase first
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("❌ Logout error:", error);
      } else {
        console.log("✅ Logged out successfully");
      }

      // Clear any cached data after sign out
      if (typeof window !== 'undefined') {
        try { sessionStorage.clear(); } catch {}
        try { localStorage.clear(); } catch {}
      }

      // Navigate to login
      router.replace("/login");

      // Hard fallback in case router is blocked
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }, 300);
    } catch (error) {
      console.error("❌ Logout failed:", error);
      router.replace("/login");
    }
  };

  return (
    <header className="flex items-center justify-between h-[72px] px-4 sm:px-6 bg-white/[0.05] backdrop-blur-lg border-b border-white/[0.1]">
      {/* Left: Mobile Menu Button + Logo */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* Mobile Menu Button - Only visible on mobile */}
        {onMobileMenuClick && (
          <button
            onClick={onMobileMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
        <Link href="/dashboard" aria-label="Go to dashboard" className="min-w-0 flex-shrink">
          <img
            src={companyLogo}
            alt="Logo"
            className="h-7 sm:h-9 md:h-10 w-auto max-w-full transition-all duration-200 hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.45)] hover:opacity-100 object-contain"
          />
        </Link>
      </div>

      {/* Middle: Actions - Show on all screens, compact on mobile */}
      <div className="flex items-center gap-2 sm:gap-4 mr-2 sm:mr-0">
        {/* Today's Tasks - Main Priority */}
        <Link
          href="/dashboard/checklists"
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-pink-600/20 to-blue-600/20 border border-pink-500/30 text-white hover:from-pink-600/30 hover:to-blue-600/30 transition-all shadow-[0_0_10px_rgba(236,72,153,0.2)] hover:shadow-[0_0_15px_rgba(236,72,153,0.3)] h-9 sm:h-10"
        >
          <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400 flex-shrink-0" />
          <span className="font-semibold text-xs sm:text-sm whitespace-nowrap hidden sm:inline">Today's Tasks</span>
        </Link>

        {/* Incidents Reports - With Dropdown */}
        <div className="relative" ref={incidentsButtonRef}>
          <div
            onClick={() => {
              // Clear any pending timeout
              if (incidentsHoverTimeoutRef.current) {
                clearTimeout(incidentsHoverTimeoutRef.current);
                incidentsHoverTimeoutRef.current = null;
              }
              setIsIncidentsMenuOpen((open) => !open);
            }}
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white/80 hover:text-white hover:bg-white/[0.12] transition-all cursor-pointer h-9 sm:h-10 ${
              isIncidentsMenuOpen || pathname.startsWith('/dashboard/incidents')
                ? 'bg-white/[0.12] text-white border-pink-500/30'
                : ''
            }`}
          >
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400 flex-shrink-0" />
            <span className="font-medium text-xs sm:text-sm whitespace-nowrap hidden sm:inline">Incidents</span>
          </div>

          {/* Dropdown Menu - Matching Sidebar Popup UX */}
          {isIncidentsMenuOpen && (() => {
            const buttonRect = incidentsButtonRef.current?.getBoundingClientRect();
            const buttonTop = buttonRect?.top ?? 0;
            const buttonLeft = buttonRect?.left ?? 0;
            const buttonWidth = buttonRect?.width ?? 0;
            const buttonCenter = buttonLeft + buttonWidth / 2;
            
            const backdrop = mounted ? createPortal(
              <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                style={{ 
                  zIndex: 9998,
                  pointerEvents: 'auto',
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100vw',
                  height: '100vh'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Clear any pending timeout
                  if (incidentsHoverTimeoutRef.current) {
                    clearTimeout(incidentsHoverTimeoutRef.current);
                    incidentsHoverTimeoutRef.current = null;
                  }
                  setIsIncidentsMenuOpen(false);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />,
              document.body
            ) : null;

            return (
              <>
                {backdrop}
                
                {/* Dropdown Menu */}
                {mounted ? createPortal(
                  <div
                    ref={incidentsMenuRef}
                    data-incidents-menu="true"
                    className="fixed"
                    style={{ 
                      zIndex: 9999,
                      top: `${buttonTop + (buttonRect?.height ?? 0) + 8}px`,
                      left: `${buttonCenter}px`,
                      transform: 'translateX(-50%)',
                      pointerEvents: 'auto',
                      position: 'fixed'
                    }}
                    onClick={(e) => {
                      // Prevent backdrop click from closing menu when clicking inside
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                  >
                  <div className="bg-[#0f1119] border border-pink-500/20 border-t-2 border-t-pink-500 rounded-xl backdrop-blur-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] min-w-[240px] py-3" style={{ backgroundColor: 'rgba(15, 17, 25, 0.98)' }}>
                    {/* Section Title */}
                    <div className="px-4 py-2 text-sm font-semibold text-pink-400 border-b border-white/[0.1] mb-2">
                      Incidents
                    </div>

                    {/* Menu Items */}
                    <div className="space-y-1 px-2">
                      {incidentsMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isExactMatch = pathname === item.href;
                        const isChildRoute = pathname.startsWith(item.href + "/");
                        const longerMatchExists = incidentsMenuItems.some((other) =>
                          other.href !== item.href &&
                          other.href.length > item.href.length &&
                          (pathname === other.href || pathname.startsWith(other.href + "/"))
                        );
                        const isActive = (isExactMatch || isChildRoute) && !longerMatchExists;

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Clear any pending timeout
                              if (incidentsHoverTimeoutRef.current) {
                                clearTimeout(incidentsHoverTimeoutRef.current);
                                incidentsHoverTimeoutRef.current = null;
                              }
                              // Close menu immediately on click
                              setIsIncidentsMenuOpen(false);
                            }}
                            className={`
                              block px-4 py-2.5 rounded-lg text-sm transition-colors duration-150 cursor-pointer
                              ${
                                isActive
                                  ? "bg-pink-500/20 text-pink-300 font-medium"
                                  : "text-white/80 hover:text-white hover:bg-white/[0.08]"
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <Icon size={18} className={isActive ? "text-pink-400" : "text-white/60"} />
                              {item.label}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>,
                document.body
                ) : null}
              </>
            );
          })()}
        </div>
      </div>

      {/* Right: Messages, Clock and Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Messages Button - Quick access */}
        <Link
          href="/dashboard/messaging"
          className={`relative flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white/80 hover:text-white hover:bg-white/[0.12] transition-all h-9 sm:h-10 ${
            pathname.startsWith('/dashboard/messaging')
              ? 'bg-white/[0.12] text-white border-pink-500/30'
              : ''
          }`}
        >
          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400 flex-shrink-0" />
          <span className="font-medium text-xs sm:text-sm whitespace-nowrap hidden sm:inline">Messages</span>
          {unreadMessageCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-pink-500 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
              {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
            </span>
          )}
        </Link>

        {/* Clock In Button */}
        <div className="hidden sm:block">
          <ClockInButton />
        </div>

        {/* Clock - Always visible */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.1] h-9 sm:h-10">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400 flex-shrink-0" />
          <div className="font-mono text-xs sm:text-sm text-white whitespace-nowrap">
            {currentTime ? format(currentTime, "HH:mm:ss") : "--:--:--"}
          </div>
        </div>

        {/* Burger Menu - Hidden on mobile (sidebar burger handles navigation) */}
        <div className="relative hidden lg:block">
          <button
            ref={burgerMenuButtonRef}
            onClick={() => setIsBurgerMenuOpen(!isBurgerMenuOpen)}
            className={`
              relative flex items-center justify-center w-10 h-10 rounded-lg bg-white/[0.06] border border-white/[0.1]
              transition-all duration-200
              ${
                isBurgerMenuOpen
                  ? "bg-pink-500/20 text-pink-400 border-pink-500/30"
                  : "text-white/60 hover:text-white hover:bg-white/[0.12]"
              }
            `}
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Dropdown Menu - Matching Incidents Dropdown Style */}
          {isBurgerMenuOpen && (() => {
            const buttonRect = burgerMenuButtonRef.current?.getBoundingClientRect();
            const buttonTop = buttonRect?.top ?? 0;
            const buttonRight = buttonRect?.right ?? 0;
            
            const backdrop = mounted ? createPortal(
              <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                style={{ 
                  zIndex: 9998,
                  pointerEvents: 'auto',
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100vw',
                  height: '100vh'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsBurgerMenuOpen(false);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />,
              document.body
            ) : null;

            return (
              <>
                {backdrop}
                
                {/* Dropdown Menu */}
                {mounted ? createPortal(
                  <div
                    ref={burgerMenuRef}
                    data-burger-menu="true"
                    className="fixed"
                    style={{ 
                      zIndex: 9999,
                      top: `${buttonTop + (buttonRect?.height ?? 0) + 8}px`,
                      right: typeof window !== 'undefined' ? `${window.innerWidth - buttonRight}px` : '24px',
                      pointerEvents: 'auto',
                      position: 'fixed',
                      maxHeight: 'calc(100vh - 100px)',
                      overflowY: 'auto'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                  >
                  <div className="bg-[#0f1119] border border-pink-500/20 border-t-2 border-t-pink-500 rounded-xl backdrop-blur-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] min-w-[280px] max-w-[320px] py-3" style={{ backgroundColor: 'rgba(15, 17, 25, 0.98)' }}>
                    {/* Menu Sections */}
                    {burgerMenuSections.map((section, sectionIndex) => (
                      <div key={section.id}>
                        {/* Section Title */}
                        <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-pink-400 border-b border-white/[0.1] mb-2">
                          {section.label}
                        </div>

                        {/* Menu Items */}
                        <div className="space-y-1 px-2 mb-3">
                          {section.items.map((item) => {
                            const Icon = iconMap[item.id] || FileText;
                            const isExactMatch = pathname === item.path;
                            const isChildRoute = pathname.startsWith(item.path + "/");
                            const longerMatchExists = section.items.some((other) =>
                              other.path !== item.path &&
                              other.path.length > item.path.length &&
                              (pathname === other.path || pathname.startsWith(other.path + "/"))
                            );
                            const isActive = (isExactMatch || isChildRoute) && !longerMatchExists;

                            // Handle signout differently - use button instead of Link
                            if (item.id === 'signout') {
                              return (
                                <button
                                  key={item.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setIsBurgerMenuOpen(false);
                                    handleLogout();
                                  }}
                                  className="w-full block px-4 py-2.5 rounded-lg text-sm transition-colors duration-150 cursor-pointer text-white/80 hover:text-white hover:bg-white/[0.08] text-left"
                                >
                                  <div className="flex items-center gap-3">
                                    <Icon size={18} className="text-white/60" />
                                    {item.label}
                                  </div>
                                </button>
                              );
                            }

                            return (
                              <Link
                                key={item.id}
                                href={item.path}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsBurgerMenuOpen(false);
                                }}
                                className={`
                                  block px-4 py-2.5 rounded-lg text-sm transition-colors duration-150 cursor-pointer
                                  ${
                                    isActive
                                      ? "bg-pink-500/20 text-pink-300 font-medium"
                                      : "text-white/80 hover:text-white hover:bg-white/[0.08]"
                                  }
                                `}
                              >
                                <div className="flex items-center gap-3">
                                  <Icon size={18} className={isActive ? "text-pink-400" : "text-white/60"} />
                                  {item.label}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>,
                document.body
                ) : null}
              </>
            );
          })()}
        </div>
      </div>
    </header>
  );
}