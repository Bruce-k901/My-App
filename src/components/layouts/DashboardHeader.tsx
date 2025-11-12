"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { LogOut, ClipboardCheck, AlertTriangle, Menu, LayoutGrid, ShieldCheck, Settings, BookOpen, UtensilsCrossed, MessageSquare, FileText } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";

interface MenuItem {
  label: string;
  href: string;
  icon: any;
}

const menuItems: MenuItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Compliance", href: "/dashboard/compliance", icon: ShieldCheck },
  { label: "Libraries", href: "/dashboard/libraries", icon: BookOpen },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { company } = useAppContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isIncidentsMenuOpen, setIsIncidentsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const incidentsHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const incidentsButtonRef = useRef<HTMLDivElement>(null);
  const incidentsMenuRef = useRef<HTMLDivElement>(null);
  const companyLogo = (company?.logo_url as string | undefined) || "/assets/logo.png";

  // Ensure we're mounted before using portals
  useEffect(() => {
    setMounted(true);
  }, []);

  const incidentsMenuItems = [
    { label: "Incidents", href: "/dashboard/incidents", icon: AlertTriangle },
    { label: "Food Poisoning", href: "/dashboard/incidents/food-poisoning", icon: UtensilsCrossed },
    { label: "Customer Complaints", href: "/dashboard/incidents/customer-complaints", icon: MessageSquare },
    { label: "Incident Log", href: "/dashboard/incidents/storage", icon: FileText },
  ];

  // Close menus when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setIsIncidentsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (menuHoverTimeoutRef.current) {
        clearTimeout(menuHoverTimeoutRef.current);
      }
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
      
      const isMenuButton = menuButtonRef.current?.contains(target);
      const isMenu = menuRef.current?.contains(target);
      const isIncidentsButton = incidentsButtonRef.current?.contains(target);
      const isIncidentsMenu = incidentsMenuRef.current?.contains(target);
      
      if (!isMenuButton && !isMenu) {
        setIsMenuOpen(false);
      }
      
      if (!isIncidentsButton && !isIncidentsMenu) {
        setIsIncidentsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent double clicks

    setIsLoggingOut(true);

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
    } finally {
      // In case any UI remains, allow button again after a second
      setTimeout(() => setIsLoggingOut(false), 1000);
    }
  };

  return (
    <header className="flex items-center justify-between h-[72px] px-6 bg-white/[0.05] backdrop-blur-lg border-b border-white/[0.1]">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="Go to home">
          { }
          <img
            src={companyLogo}
            alt="Logo"
            className="h-9 w-auto transition-all duration-200 hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.45)] hover:opacity-100"
          />
        </Link>
      </div>

      {/* Middle: Actions */}
      <div className="flex items-center gap-4">
        {/* Today's Tasks - Main Priority */}
        <Link
          href="/dashboard/checklists"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-pink-600/20 to-blue-600/20 border border-pink-500/30 text-white hover:from-pink-600/30 hover:to-blue-600/30 transition-all shadow-[0_0_10px_rgba(236,72,153,0.2)] hover:shadow-[0_0_15px_rgba(236,72,153,0.3)]"
        >
          <ClipboardCheck className="w-5 h-5 text-pink-400" />
          <span className="font-semibold">Today's Tasks</span>
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white/80 hover:text-white hover:bg-white/[0.12] transition-all cursor-pointer ${
              isIncidentsMenuOpen || pathname.startsWith('/dashboard/incidents')
                ? 'bg-white/[0.12] text-white border-pink-500/30'
                : ''
            }`}
          >
            <AlertTriangle className="w-5 h-5 text-pink-400" />
            <span className="font-medium">Incidents</span>
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

      {/* Right: Menu and Logout */}
      <div className="flex items-center gap-3">
        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
            isLoggingOut 
              ? "text-white/50 cursor-not-allowed bg-white/[0.06]" 
              : "text-white/80 hover:text-white hover:bg-white/[0.12]"
          }`}
        >
          <LogOut className={`w-4 h-4 ${isLoggingOut ? "text-pink-300" : "text-pink-500"}`} />
          <span className="hidden sm:inline">{isLoggingOut ? "Logging out..." : "Logout"}</span>
        </button>

        {/* Burger Menu */}
        <div className="relative">
          <button
            ref={menuButtonRef}
            onClick={() => {
              // Clear any pending timeout
              if (menuHoverTimeoutRef.current) {
                clearTimeout(menuHoverTimeoutRef.current);
                menuHoverTimeoutRef.current = null;
              }
              setIsMenuOpen((open) => !open);
            }}
            className={`
              relative flex items-center justify-center w-10 h-10 rounded-xl
              transition-all duration-200
              ${
                isMenuOpen
                  ? "bg-pink-500/20 text-pink-400"
                  : "text-white/60 hover:text-white hover:bg-white/[0.08]"
              }
            `}
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Dropdown Menu - Matching Sidebar Popup UX */}
          {isMenuOpen && (() => {
            const buttonRect = menuButtonRef.current?.getBoundingClientRect();
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
                  // Clear any pending timeout
                  if (menuHoverTimeoutRef.current) {
                    clearTimeout(menuHoverTimeoutRef.current);
                    menuHoverTimeoutRef.current = null;
                  }
                  setIsMenuOpen(false);
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
                    ref={menuRef}
                    data-menu="true"
                    className="fixed"
                    style={{ 
                      zIndex: 9999,
                      top: `${buttonTop + (buttonRect?.height ?? 0) + 8}px`,
                      right: typeof window !== 'undefined' ? `${window.innerWidth - buttonRight}px` : '24px',
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
                    Menu
                  </div>

                  {/* Menu Items */}
                  <div className="space-y-1 px-2">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      const isExactMatch = pathname === item.href;
                      const isChildRoute = pathname.startsWith(item.href + "/");
                      const longerMatchExists = menuItems.some((other) =>
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
                            setIsMenuOpen(false);
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
    </header>
  );
}