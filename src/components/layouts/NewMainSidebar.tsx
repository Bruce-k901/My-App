"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { isRestricted, type AppRole } from "@/lib/accessControl";
import { isRoleGuardEnabled } from "@/lib/featureFlags";
import { useAppContext } from "@/context/AppContext";
import { COURSES, LIBRARIES } from "@/lib/navigation-constants";
import { usePanelStore } from "@/lib/stores/panel-store";
import {
  LayoutGrid,
  Building2,
  CheckSquare,
  FileText,
  BookOpen,
  Package,
  BarChart3,
  ShieldCheck,
  Settings,
  HelpCircle,
  GraduationCap,
  CalendarDays,
  X,
  AlertTriangle,
  LogOut,
  CreditCard,
  MessageSquare,
  Clock,
  Shield,
  Warehouse,
  FileX,
  Receipt,
  ClipboardList,
  ChefHat,
  Users,
} from '@/components/ui/icons';

// Section with hover popup
interface SidebarSection {
  label: string;
  icon: any;
  items: {
    label: string;
    href: string;
    icon?: any;
  }[];
}

// Direct link (no popup)
interface SidebarLink {
  label: string;
  href: string;
  icon: any;
}

interface NewMainSidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function NewMainSidebar({ isMobileOpen = false, onMobileClose }: NewMainSidebarProps) {
  const pathname = usePathname();
  const { role: contextRole, signOut, profile } = useAppContext();
  const { setMessagingOpen } = usePanelStore();
  
  // Build dynamic sections with courses and libraries - memoized to prevent hydration issues
  const sections: SidebarSection[] = useMemo(() => [
  {
    label: "Organization",
    icon: Building2,
    items: [
      { label: "Setup Guide", href: "/dashboard/organization/onboarding" }, // Always visible - no restrictions
      { label: "Business Details", href: "/dashboard/business" },
      { label: "Users", href: "/dashboard/users" },
      { label: "Sites", href: "/dashboard/sites" },
      { label: "Emergency Contacts", href: "/dashboard/organization/emergency-contacts" },
      { label: "Training Matrix", href: "/dashboard/training" },
      { label: "Documents", href: "/dashboard/documents" },
    ],
  },
  {
    label: "Tasks",
    icon: CheckSquare,
    items: [
      { label: "Compliance", href: "/dashboard/tasks/compliance" },
      { label: "My Templates", href: "/dashboard/my_templates" },
      { label: "My Tasks", href: "/dashboard/my_tasks" },
      { label: "Today's Tasks", href: "/dashboard/todays_tasks" },
      { label: "Completed", href: "/dashboard/tasks/completed" },
    ],
  },
  {
    label: "SOPs",
    icon: FileText,
    items: [
      { label: "My SOPs", href: "/dashboard/sops/list" },
      { label: "Archived SOPs", href: "/dashboard/sops/archive" },
      { label: "SOP Templates", href: "/dashboard/sops/templates" },
      { label: "My RA's", href: "/dashboard/risk-assessments" },
      { label: "Archived RAs", href: "/dashboard/risk-assessments/archive" },
      { label: "RA Templates", href: "/dashboard/sops/ra-templates" },
      { label: "COSHH Data", href: "/dashboard/sops/coshh" },
    ],
  },
  {
    label: "Libraries",
    icon: BookOpen,
    items: [
      { label: "All Libraries", href: "/dashboard/libraries" },
      { label: "Create Library", href: "/dashboard/libraries/create" },
      { label: "Library Templates", href: "/dashboard/libraries/templates" },
      // Dynamically generated from LIBRARIES constant
      ...LIBRARIES.map(lib => ({
        label: lib.name,
        href: lib.href,
      })),
    ],
  },
  {
    label: "Assets",
    icon: Package,
    items: [
      { label: "Assets", href: "/dashboard/assets" },
      { label: "Contractors", href: "/dashboard/assets/contractors" },
      { label: "PPM Schedule", href: "/dashboard/ppm" },
      { label: "Callout Logs", href: "/dashboard/assets/callout-logs" },
    ],
  },
  {
    label: "Courses",
    icon: GraduationCap,
    items: [
      { label: "All Courses", href: "/dashboard/courses" },
      // Dynamically generated from COURSES constant
      ...COURSES.map(course => ({
        label: course.title,
        href: course.href,
      })),
    ],
  },
  {
    label: "Logs",
    icon: Clock,
    items: [
      { label: "All Logs", href: "/dashboard/logs" },
      { label: "Temperature Logs", href: "/dashboard/logs/temperature" },
      { label: "Attendance Register", href: "/dashboard/logs/attendance" },
    ],
  },
  {
    label: "People",
    icon: Users,
    items: [
      { label: "Directory", href: "/dashboard/people/directory" },
      { label: "Attendance", href: "/dashboard/people/attendance" },
      { label: "Leave", href: "/dashboard/people/leave" },
      { label: "Schedule", href: "/dashboard/people/schedule" },
      { label: "Onboarding: People", href: "/dashboard/people/onboarding" },
      { label: "Onboarding: Docs", href: "/dashboard/people/onboarding/company-docs" },
      { label: "Onboarding: Packs", href: "/dashboard/people/onboarding/packs" },
      { label: "Onboarding: My Docs", href: "/dashboard/people/onboarding/my-docs" },
      { label: "Training", href: "/dashboard/people/training" },
      { label: "Performance", href: "/dashboard/people/reviews" },
      { label: "Payroll", href: "/dashboard/people/payroll" },
    ],
  },
  {
    label: "Stockly",
    icon: Warehouse,
    items: [
      { label: "Dashboard", href: "/dashboard/stockly" },
      { label: "Recipes", href: "/dashboard/stockly/recipes" },
      { label: "Stock Items", href: "/dashboard/stockly/stock-items" },
      { label: "Deliveries", href: "/dashboard/stockly/deliveries" },
      { label: "Suppliers", href: "/dashboard/stockly/suppliers" },
      { label: "Storage Areas", href: "/dashboard/stockly/storage-areas" },
      { label: "Stock Counts", href: "/dashboard/stockly/stock-counts", icon: ClipboardList },
      { label: "Sales", href: "/dashboard/stockly/sales", icon: Receipt },
      { label: "Credit Notes", href: "/dashboard/stockly/credit-notes" },
      { label: "Reports", href: "/dashboard/stockly/reports", icon: BarChart3 },
      { label: "Ingredients", href: "/dashboard/stockly/libraries/ingredients" },
      { label: "PPE", href: "/dashboard/stockly/libraries/ppe" },
      { label: "Chemicals", href: "/dashboard/stockly/libraries/chemicals" },
      { label: "Disposables", href: "/dashboard/stockly/libraries/disposables" },
      { label: "First Aid", href: "/dashboard/stockly/libraries/first-aid" },
      { label: "Packaging", href: "/dashboard/stockly/libraries/packaging" },
    ],
  },
], []);

const directLinks: SidebarLink[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Messages", href: "/dashboard/messaging", icon: MessageSquare },
  { label: "Manager Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { label: "EHO Readiness", href: "/dashboard/eho-report", icon: ShieldCheck },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Support", href: "/dashboard/support", icon: HelpCircle },
];

  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Use ref to track actual hovering state for timeout closures
  const isHoveringRef = useRef(false);
  const roleGuard = isRoleGuardEnabled();
  const role = (
    (contextRole as AppRole) || (roleGuard ? (null as any) : ("Admin" as AppRole))
  ) as AppRole;

  // Handle mobile close on route change
  useEffect(() => {
    if (isMobileOpen && onMobileClose) {
      onMobileClose();
    }
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Create refs for each section button
  const orgRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef<HTMLDivElement>(null);
  const sopsRef = useRef<HTMLDivElement>(null);
  const librariesRef = useRef<HTMLDivElement>(null);
  const assetsRef = useRef<HTMLDivElement>(null);
  const coursesRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  const peopleRef = useRef<HTMLDivElement>(null);
  const stocklyRef = useRef<HTMLDivElement>(null);
  
  // Map section labels to refs
  const buttonRefs: { [key: string]: React.RefObject<HTMLDivElement> } = {
    "Organization": orgRef,
    "Tasks": tasksRef,
    "SOPs": sopsRef,
    "Libraries": librariesRef,
    "Assets": assetsRef,
    "Courses": coursesRef,
    "Logs": logsRef,
    "People": peopleRef,
    "Stockly": stocklyRef,
  };

  // Handle hover with delay
  const handleHover = (sectionLabel: string) => {
    // Clear any existing timeout (including scroll timeout)
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    isHoveringRef.current = true;
    setIsHovering(true);
    setHoveredSection(sectionLabel);
  };

  const handleLeave = () => {
    isHoveringRef.current = false;
    setIsHovering(false);
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Close after delay if still not hovering
    hoverTimeoutRef.current = setTimeout(() => {
      // Check ref (not state) to get current value
      if (!isHoveringRef.current) {
        setHoveredSection(null);
      }
    }, 150); // 150ms delay
  };

  // FIX #2: Close popup when route changes
  useEffect(() => {
    setHoveredSection(null);
    isHoveringRef.current = false;
    setIsHovering(false);
    // Clear any pending timeouts
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, [pathname]);

  // FIX #2: Close popup on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if click is on ANY link - always allow navigation, don't interfere
      const clickedLink = target.closest('a');
      if (clickedLink) {
        // Link clicked - allow navigation, don't interfere
        // Popup will close via pathname change effect
        return;
      }
      
      const isSidebar = target.closest('aside');
      const isPopup = target.closest('[data-popup]');
      
      // Only close popup if clicking outside both sidebar and popup
      if (!isSidebar && !isPopup) {
        setHoveredSection(null);
        isHoveringRef.current = false;
        setIsHovering(false);
        // Clear any pending timeouts
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Close popup on scroll (after 2 seconds) - but not if user is hovering
  useEffect(() => {
    const handleScroll = () => {
      if (hoveredSection && !isHoveringRef.current) {
        // Clear any existing scroll timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        // Close after 2 seconds if user has scrolled and is not hovering
        hoverTimeoutRef.current = setTimeout(() => {
          // Double-check user is still not hovering before closing (use ref)
          if (!isHoveringRef.current) {
            setHoveredSection(null);
            setIsHovering(false);
            isHoveringRef.current = false;
          }
        }, 2000);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [hoveredSection]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      isHoveringRef.current = false;
    };
  }, []);

  // Mobile drawer backdrop
  const mobileBackdrop = mounted && isMobileOpen ? createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
      onClick={onMobileClose}
      style={{ zIndex: 40 }}
      suppressHydrationWarning
    />,
    document.body
  ) : null;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileBackdrop}

      {/* Main Sidebar - Hidden on mobile, visible on desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-20 bg-[rgb(var(--surface))] dark:bg-[#110F0D] border-r border-[rgb(var(--border))] dark:border-white/[0.1] flex-col items-center py-4 gap-2 z-50 overflow-y-auto overflow-x-hidden checkly-sidebar-scrollbar" suppressHydrationWarning>
        {/* Checkly Logo - Show when on Checkly pages */}
        {(pathname === "/dashboard" || pathname.startsWith("/dashboard/tasks") || pathname.startsWith("/dashboard/checklists") || pathname.startsWith("/dashboard/sops") || pathname.startsWith("/dashboard/incidents") || pathname.startsWith("/dashboard/assets") || pathname.startsWith("/dashboard/logs") || pathname.startsWith("/dashboard/compliance") || pathname.startsWith("/dashboard/eho-report") || pathname.startsWith("/dashboard/libraries") || pathname.startsWith("/dashboard/courses") || pathname.startsWith("/dashboard/ppm") || pathname.startsWith("/dashboard/todays_tasks")) && (
          <Link
            href="/dashboard"
            className="mb-2 p-2 hover:opacity-80 transition-opacity"
            title="Checkly"
          >
            <img
              src="/new_module_logos/checkly_light.svg"
              alt="Checkly"
              className="h-8 w-auto dark:hidden"
            />
            <img
              src="/new_module_logos/checkly_dark.svg"
              alt="Checkly"
              className="h-8 w-auto hidden dark:block"
            />
          </Link>
        )}
        
        {/* Dashboard Link at Top */}
        <SidebarDirectLink
          item={directLinks[0]}
          isActive={pathname === "/dashboard"}
          isRestricted={false}
        />

        <div className="w-12 h-px bg-[rgb(var(--border))] dark:bg-white/[0.1] my-1" />

        {/* Hover Sections */}
        {sections.map((section) => {
          // Remove restrictions - show all sections
          return (
            <SidebarSectionItem
              key={section.label}
              section={section}
              allSections={sections}
              isHovered={hoveredSection === section.label}
              onHover={() => handleHover(section.label)}
              onLeave={handleLeave}
              pathname={pathname}
              buttonRef={buttonRefs[section.label]}
              isRestricted={false}
              role={role}
            />
          );
        })}

        {/* Messages - Opens panel directly */}
        <div className="w-12 h-px bg-[rgb(var(--border))] dark:bg-white/[0.1] my-1" />
        <SidebarDirectLink
          item={directLinks[1]}
          isActive={false}
          isRestricted={false}
          onClick={() => setMessagingOpen(true)}
        />

        <div className="w-12 h-px bg-[rgb(var(--border))] dark:bg-white/[0.1] my-1" />

        {/* Bottom Direct Links */}
        {directLinks.slice(2).map((link) => {
          // Remove restrictions - show all links
          return (
            <SidebarDirectLink
              key={link.href}
              item={link}
              isActive={pathname.startsWith(link.href)}
              isRestricted={false}
            />
          );
        })}

        {/* Admin Portal Link - Only for platform admins */}
        {profile?.is_platform_admin && (
          <>
            <div className="w-12 h-px bg-[rgb(var(--border))] dark:bg-white/[0.1] my-1" />
            <SidebarDirectLink
              item={{ label: "Admin Portal", href: "/admin", icon: Shield }}
              isActive={pathname.startsWith("/admin")}
              isRestricted={false}
            />
          </>
        )}
      </aside>

      {/* Hover Popups - Desktop only */}
      {sections.map((section) => {
        // Remove restrictions - show all popups
        return (
          <SidebarPopup
            key={section.label}
            section={section}
            isVisible={hoveredSection === section.label}
            onMouseEnter={() => handleHover(section.label)}
            onMouseLeave={handleLeave}
            pathname={pathname}
            buttonRef={buttonRefs[section.label]}
            role={role}
          />
        );
      })}

      {/* Mobile Drawer Sidebar */}
      {mounted && isMobileOpen ? createPortal(
        <aside className="fixed left-0 top-0 h-screen w-64 bg-[#110F0D] border-r border-white/[0.1] flex flex-col z-50 lg:hidden overflow-y-auto overflow-x-hidden" suppressHydrationWarning>
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/[0.1]">
            <h2 className="text-lg font-semibold text-theme-primary">Menu</h2>
            <button
              onClick={onMobileClose}
              className="p-2 rounded-lg hover:bg-white/[0.08] text-theme-tertiary hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Menu Content */}
          <div className="flex-1 p-4 space-y-6">
            {/* Quick Actions - Today's Tasks, Incidents & Attendance */}
            <div className="space-y-2">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-module-fg">
                Quick Actions
              </div>
              <Link
                href="/dashboard/todays_tasks"
                onClick={onMobileClose}
                className={
                  pathname === "/dashboard/todays_tasks" || pathname.startsWith("/dashboard/todays_tasks")
                    ? "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer bg-module-fg/25 text-module-fg font-medium"
                    : "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer text-theme-secondary hover:text-white hover:bg-white/[0.08]"
                }
              >
                <CheckSquare size={20} />
                <span>Today's Tasks</span>
              </Link>
              <Link
                href="/dashboard/incidents"
                onClick={onMobileClose}
                className={
                  pathname === "/dashboard/incidents" || pathname.startsWith("/dashboard/incidents")
                    ? "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer bg-module-fg/25 text-module-fg font-medium"
                    : "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer text-theme-secondary hover:text-white hover:bg-white/[0.08]"
                }
              >
                <AlertTriangle size={20} />
                <span>Incidents</span>
              </Link>
              <Link
                href="/dashboard/logs/attendance"
                onClick={onMobileClose}
                className={
                  pathname === "/dashboard/logs/attendance" || pathname.startsWith("/dashboard/logs/attendance")
                    ? "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer bg-module-fg/25 text-module-fg font-medium"
                    : "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer text-theme-secondary hover:text-white hover:bg-white/[0.08]"
                }
              >
                <Clock size={20} />
                <span>Attendance</span>
              </Link>
            </div>

            <div className="h-px bg-white/[0.1] my-4" />

            {/* Dashboard Link */}
            <MobileSidebarLink
              item={directLinks[0]}
              isActive={pathname === "/dashboard"}
              isRestricted={false}
              onClick={onMobileClose}
            />

            <div className="h-px bg-white/[0.1] my-4" />

            {/* Sections */}
            {sections.map((section) => {
              // Remove restrictions - show all sections

              // Find if any item in this section is active
              const hasActiveItem = section.items.some((item) => 
                pathname === item.href || pathname.startsWith(item.href + "/")
              );

              // For Libraries section on mobile, only show "All Libraries" button
              const isLibrariesSection = section.label === "Libraries";
              const itemsToShow = isLibrariesSection 
                ? section.items.filter(item => item.label === "All Libraries")
                : section.items;

              return (
                <div key={section.label} className="space-y-2">
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-module-fg">
                    {section.label}
                  </div>
                  {itemsToShow.map((item) => {
                    const isExactMatch = pathname === item.href;
                    const isChildRoute = pathname.startsWith(item.href + "/");
                    const longerMatchExists = section.items.some((other) =>
                      other.href !== item.href &&
                      other.href.length > item.href.length &&
                      (pathname === other.href || pathname.startsWith(other.href + "/"))
                    );
                    const isActive = (isExactMatch || isChildRoute) && !longerMatchExists;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          onMobileClose?.();
                        }}
                        className={
                          isActive
                            ? "block px-4 py-2.5 rounded-lg text-sm transition-colors cursor-pointer bg-module-fg/25 text-module-fg font-medium"
                            : "block px-4 py-2.5 rounded-lg text-sm transition-colors cursor-pointer text-theme-secondary hover:text-white hover:bg-white/[0.08]"
                        }
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              );
            })}

            <div className="h-px bg-white/[0.1] my-4" />

            {/* Bottom Direct Links */}
            {directLinks.slice(1).map((link) => {
              // Remove restrictions - show all links
              const isMessaging = link.href === '/dashboard/messaging';
              return (
                <MobileSidebarLink
                  key={link.href}
                  item={link}
                  isActive={!isMessaging && pathname.startsWith(link.href)}
                  isRestricted={false}
                  preventNavigation={isMessaging}
                  onClick={() => {
                    if (isMessaging) {
                      setMessagingOpen(true);
                    }
                    onMobileClose?.();
                  }}
                />
              );
            })}

            {/* Admin Portal Link - Only for platform admins */}
            {profile?.is_platform_admin && (
              <>
                <div className="h-px bg-white/[0.1] my-4" />
                <MobileSidebarLink
                  item={{ label: "Admin Portal", href: "/admin", icon: Shield }}
                  isActive={pathname.startsWith("/admin")}
                  isRestricted={false}
                  onClick={onMobileClose}
                />
              </>
            )}

            <div className="h-px bg-white/[0.1] my-4" />

            {/* Logout Button */}
            <button
              onClick={async () => {
                onMobileClose?.();
                try {
                  await signOut();
                } catch (error) {
                  console.error('Logout error:', error);
                  // Fallback: redirect to login
                  window.location.href = '/login';
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </aside>,
        document.body
      ) : null}
    </>
  );
}

// Direct Link Component
function SidebarDirectLink({
  item,
  isActive,
  isRestricted,
  onClick,
}: {
  item: SidebarLink;
  isActive: boolean;
  isRestricted: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  // Use static className to prevent hydration mismatches
  // CRITICAL: Must use static string, not template literal, to prevent hydration mismatch
  const staticClassName = isActive
    ? "relative group flex items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 transition-all duration-200 cursor-pointer bg-module-fg/20 text-module-fg shadow-[0_0_12px_rgb(var(--module-fg)/0.4)] border border-module-fg/30"
    : "relative group flex items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 transition-all duration-200 cursor-pointer text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] hover:bg-module-fg/[0.08] hover:shadow-[0_0_8px_rgb(var(--module-fg)/0.2)]";

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={staticClassName}
        title={item.label}
      >
        <Icon size={20} />
        <div className="absolute left-full ml-3 px-3 py-2 bg-[rgb(var(--surface-elevated))] dark:bg-[#1e1a17] border border-[rgb(var(--border))] dark:border-white/[0.1] rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg text-[rgb(var(--text-primary))] dark:text-white">
          {item.label}
        </div>
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      className={staticClassName}
      title={item.label}
    >
      <Icon size={20} />
      <div className="absolute left-full ml-3 px-3 py-2 bg-[rgb(var(--surface-elevated))] dark:bg-[#1e1a17] border border-[rgb(var(--border))] dark:border-white/[0.1] rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg text-[rgb(var(--text-primary))] dark:text-white">
        {item.label}
      </div>
    </Link>
  );
}

// Section Item (triggers popup on hover)
function SidebarSectionItem({
  section,
  isHovered,
  onHover,
  onLeave,
  pathname,
  allSections,
  isRestricted,
  role,
  buttonRef,
}: {
  section: SidebarSection;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  pathname: string;
  allSections: SidebarSection[];
  isRestricted: boolean;
  role: AppRole;
  buttonRef: React.RefObject<HTMLDivElement>;
}) {
  const Icon = section.icon;

  // Find the section with the longest matching route (most specific match)
  let bestMatch = "";
  let bestMatchSection = "";

  allSections.forEach((sect) => {
    if (isRestricted) return;
    sect.items.forEach((item) => {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        if (item.href.length > bestMatch.length) {
          bestMatch = item.href;
          bestMatchSection = sect.label;
        }
      }
    });
  });

  // Only highlight if this section owns the best match
  const isActive = bestMatchSection === section.label;

  const handleClick = () => {
    // Toggle popup on click if not already hovered
    if (!isHovered) {
      onHover();
    }
  };

  // Use static className to prevent hydration mismatch
  const buttonClassName = (isActive || isHovered)
    ? "relative flex items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 transition-all duration-200 cursor-pointer bg-module-fg/20 text-module-fg border border-module-fg/30 shadow-[0_0_12px_rgb(var(--module-fg)/0.4)]"
    : "relative flex items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 transition-all duration-200 cursor-pointer text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] hover:bg-module-fg/[0.08] hover:shadow-[0_0_8px_rgb(var(--module-fg)/0.2)]";
  
  return (
    <div
      ref={buttonRef}
      className={buttonClassName}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={handleClick}
      title={section.label}
    >
      <Icon size={20} />
    </div>
  );
}

// Mobile Sidebar Link Component
function MobileSidebarLink({
  item,
  isActive,
  isRestricted,
  onClick,
  preventNavigation,
}: {
  item: SidebarLink;
  isActive: boolean;
  isRestricted: boolean;
  onClick?: () => void;
  preventNavigation?: boolean;
}) {
  const Icon = item.icon;

  // Use static className to prevent hydration mismatch
  const linkClassName = isActive
    ? "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer bg-module-fg/25 text-module-fg font-medium"
    : "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer text-theme-secondary hover:text-white hover:bg-white/[0.08]";

  if (preventNavigation) {
    return (
      <button
        onClick={() => onClick?.()}
        className={linkClassName + " w-full text-left"}
      >
        <Icon size={18} />
        <span>{item.label}</span>
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={() => onClick?.()}
      className={linkClassName}
    >
      <Icon size={18} />
      <span>{item.label}</span>
    </Link>
  );
}

// Popup Panel
function SidebarPopup({
  section,
  isVisible,
  onMouseEnter,
  onMouseLeave,
  pathname,
  buttonRef,
  role,
}: {
  section: SidebarSection;
  isVisible: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  pathname: string;
  buttonRef: React.RefObject<HTMLDivElement>;
  role: AppRole;
}) {
  if (!isVisible) return null;

  // Get button position
  const buttonTop = buttonRef.current?.getBoundingClientRect().top ?? 0;

  return (
      <div
        data-popup="true"
        className="fixed left-20 pointer-events-none z-50"
        style={{ top: `${buttonTop}px` }}
        onMouseEnter={() => {
          // Cancel any scroll timeout when user hovers over popup
          onMouseEnter();
        }}
        onMouseLeave={onMouseLeave}
      >
      <div className="pointer-events-auto bg-[rgb(var(--surface-elevated))] dark:bg-[#151210]/98 border border-module-fg/30 dark:border-module-fg/20 border-l-2 border-l-module-fg rounded-r-xl backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.4)] min-w-[260px] py-3 animate-slideIn">
        {/* Section Title */}
        <div className="px-5 py-3 text-sm font-semibold text-module-fg border-b border-[rgb(var(--border))] dark:border-white/[0.1] mb-2 flex items-center gap-2">
          <section.icon size={16} />
          <span>{section.label}</span>
        </div>

        {/* Items */}
        <div className="space-y-1 px-3">
          {section.items.map((item) => {
            const isExactMatch = pathname === item.href;
            const isChildRoute = pathname.startsWith(item.href + "/");
            const longerMatchExists = section.items.some((other) =>
              other.href !== item.href &&
              other.href.length > item.href.length &&
              (pathname === other.href || pathname.startsWith(other.href + "/"))
            );
            const isActive = (isExactMatch || isChildRoute) && !longerMatchExists;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "block px-4 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer bg-module-fg/20 text-module-fg font-medium border-l-2 border-l-module-fg"
                    : "block px-4 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer text-[rgb(var(--text-secondary))] dark:text-theme-secondary hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface))] dark:hover:bg-white/[0.08] hover:pl-5"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}