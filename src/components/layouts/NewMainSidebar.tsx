"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { isRestricted, type AppRole } from "@/lib/accessControl";
import { isRoleGuardEnabled } from "@/lib/featureFlags";
import { useAppContext } from "@/context/AppContext";
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
} from "lucide-react";

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

const sections: SidebarSection[] = [
  {
    label: "Organization",
    icon: Building2,
    items: [
      { label: "Business Details", href: "/dashboard/business" },
      { label: "Sites", href: "/dashboard/sites" },
      { label: "Users", href: "/dashboard/users" },
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
      // All created libraries
      { label: "Ingredients Library", href: "/dashboard/libraries/ingredients" },
      { label: "PPE Library", href: "/dashboard/libraries/ppe" },
      { label: "Chemicals Library", href: "/dashboard/libraries/chemicals" },
      { label: "Drinks Library", href: "/dashboard/libraries/drinks" },
      { label: "First Aid Supplies", href: "/dashboard/libraries/first-aid" },
      { label: "Disposables Library", href: "/dashboard/libraries/disposables" },
      { label: "Glassware Library", href: "/dashboard/libraries/glassware" },
      { label: "Packaging Library", href: "/dashboard/libraries/packaging" },
      { label: "Serving Equipment", href: "/dashboard/libraries/serving-equipment" },
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
      { label: "Food Safety", href: "/dashboard/courses/food-safety" },
      { label: "Health & Safety", href: "/dashboard/courses/health-and-safety" },
    ],
  },
  {
    label: "Logs",
    icon: Clock,
    items: [
      { label: "Attendance Register", href: "/dashboard/logs/attendance" },
      { label: "Temperature Logs", href: "/logs/temperature" },
    ],
  },
];

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
interface NewMainSidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function NewMainSidebar({ isMobileOpen = false, onMobileClose }: NewMainSidebarProps) {
  const pathname = usePathname();
  const { role: contextRole, signOut } = useAppContext();
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
  
  // Map section labels to refs
  const buttonRefs: { [key: string]: React.RefObject<HTMLDivElement> } = {
    "Organization": orgRef,
    "Tasks": tasksRef,
    "SOPs": sopsRef,
    "Libraries": librariesRef,
    "Assets": assetsRef,
    "Courses": coursesRef,
    "Logs": logsRef,
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
      
      // Check if click is on a link inside popup - allow it to navigate
      const clickedLink = target.closest('a');
      const isInPopup = target.closest('[data-popup]');
      
      if (clickedLink && isInPopup) {
        // Link clicked inside popup - allow navigation, popup will close via pathname change
        return;
      }
      
      const isSidebar = target.closest('aside');
      const isPopup = target.closest('[data-popup]');
      
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
    />,
    document.body
  ) : null;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileBackdrop}

      {/* Main Sidebar - Hidden on mobile, visible on desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-20 bg-[#0B0D13] border-r border-white/[0.1] flex-col items-center py-3 gap-1 z-50 overflow-y-auto overflow-x-hidden">
        {/* Dashboard Link at Top */}
        <SidebarDirectLink
          item={directLinks[0]}
          isActive={pathname === "/dashboard"}
          isRestricted={false}
        />

        <div className="w-12 h-px bg-white/[0.1] my-1" />

        {/* Hover Sections */}
        {sections.map((section) => {
          const sectionRestricted = roleGuard ? isRestricted(role, section.label) : false;
          return (
            <SidebarSectionItem
              key={section.label}
              section={section}
              allSections={sections}
              isHovered={hoveredSection === section.label}
              onHover={() => !sectionRestricted && handleHover(section.label)}
              onLeave={handleLeave}
              pathname={pathname}
              buttonRef={buttonRefs[section.label]}
              isRestricted={sectionRestricted}
              role={role}
            />
          );
        })}

        {/* Manager Calendar - Right after sections */}
        <div className="w-12 h-px bg-white/[0.1] my-1" />
        <SidebarDirectLink
          item={directLinks[1]}
          isActive={pathname.startsWith(directLinks[1].href)}
          isRestricted={false}
        />

        <div className="w-12 h-px bg-white/[0.1] my-1" />

        {/* Bottom Direct Links */}
        {directLinks.slice(2).map((link) => {
          const linkRestricted = roleGuard ? isRestricted(role, link.label) : false;
          return (
            <SidebarDirectLink
              key={link.href}
              item={link}
              isActive={pathname.startsWith(link.href)}
              isRestricted={linkRestricted}
            />
          );
        })}
      </aside>

      {/* Hover Popups - Desktop only */}
      {sections.map((section) => {
        const sectionRestricted = roleGuard ? isRestricted(role, section.label) : false;
        return (
          <SidebarPopup
            key={section.label}
            section={section}
            isVisible={hoveredSection === section.label && !sectionRestricted}
            onMouseEnter={() => !sectionRestricted && handleHover(section.label)}
            onMouseLeave={handleLeave}
            pathname={pathname}
            buttonRef={buttonRefs[section.label]}
            role={role}
          />
        );
      })}

      {/* Mobile Drawer Sidebar */}
      {mounted && isMobileOpen ? createPortal(
        <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0B0D13] border-r border-white/[0.1] flex flex-col z-50 lg:hidden overflow-y-auto overflow-x-hidden">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/[0.1]">
            <h2 className="text-lg font-semibold text-white">Menu</h2>
            <button
              onClick={onMobileClose}
              className="p-2 rounded-lg hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Menu Content */}
          <div className="flex-1 p-4 space-y-6">
            {/* Quick Actions - Today's Tasks, Incidents & Attendance */}
            <div className="space-y-2">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-pink-400">
                Quick Actions
              </div>
              <Link
                href="/dashboard/todays_tasks"
                onClick={onMobileClose}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer
                  ${
                    pathname === "/dashboard/todays_tasks" || pathname.startsWith("/dashboard/todays_tasks")
                      ? "bg-pink-500/20 text-pink-300 font-medium"
                      : "text-white/80 hover:text-white hover:bg-white/[0.08]"
                  }
                `}
              >
                <CheckSquare size={20} />
                <span>Today's Tasks</span>
              </Link>
              <Link
                href="/dashboard/incidents"
                onClick={onMobileClose}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer
                  ${
                    pathname === "/dashboard/incidents" || pathname.startsWith("/dashboard/incidents")
                      ? "bg-pink-500/20 text-pink-300 font-medium"
                      : "text-white/80 hover:text-white hover:bg-white/[0.08]"
                  }
                `}
              >
                <AlertTriangle size={20} />
                <span>Incidents</span>
              </Link>
              <Link
                href="/dashboard/logs/attendance"
                onClick={onMobileClose}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer
                  ${
                    pathname === "/dashboard/logs/attendance" || pathname.startsWith("/dashboard/logs/attendance")
                      ? "bg-pink-500/20 text-pink-300 font-medium"
                      : "text-white/80 hover:text-white hover:bg-white/[0.08]"
                  }
                `}
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
              const sectionRestricted = roleGuard ? isRestricted(role, section.label) : false;
              if (sectionRestricted) return null;

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
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-pink-400">
                    {section.label}
                  </div>
                  {itemsToShow.map((item) => {
                    const itemRestricted = isRestricted(role, item.label);
                    const isExactMatch = pathname === item.href;
                    const isChildRoute = pathname.startsWith(item.href + "/");
                    const longerMatchExists = section.items.some((other) =>
                      other.href !== item.href &&
                      other.href.length > item.href.length &&
                      (pathname === other.href || pathname.startsWith(other.href + "/"))
                    );
                    const isActive = !itemRestricted && (isExactMatch || isChildRoute) && !longerMatchExists;

                    return (
                      <Link
                        key={item.href}
                        href={itemRestricted ? "#" : item.href}
                        onClick={(e) => {
                          if (itemRestricted) {
                            e.preventDefault();
                          } else {
                            onMobileClose?.();
                          }
                        }}
                        className={`
                          block px-4 py-2.5 rounded-lg text-sm transition-colors
                          ${itemRestricted ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                          ${
                            isActive
                              ? "bg-pink-500/20 text-pink-300 font-medium"
                              : "text-white/80 hover:text-white hover:bg-white/[0.08]"
                          }
                        `}
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
              const linkRestricted = roleGuard ? isRestricted(role, link.label) : false;
              return (
                <MobileSidebarLink
                  key={link.href}
                  item={link}
                  isActive={pathname.startsWith(link.href)}
                  isRestricted={linkRestricted}
                  onClick={onMobileClose}
                />
              );
            })}

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
}: {
  item: SidebarLink;
  isActive: boolean;
  isRestricted: boolean;
}) {
  const Icon = item.icon;

  const handleClick = (e: React.MouseEvent) => {
    if (isRestricted) {
      e.preventDefault();
    }
  };

  return (
    <Link
      href={isRestricted ? "#" : item.href}
      onClick={handleClick}
      className={`
        relative group flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0
        transition-all duration-200
        ${isRestricted ? "opacity-40 cursor-not-allowed" : ""}
        ${
          isActive && !isRestricted
            ? "bg-pink-500/20 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.4)]"
            : "text-white/60 hover:text-white hover:bg-white/[0.08]"
        }
      `}
    >
      <Icon size={18} />
      {isRestricted && (
        <div className="absolute top-1 right-1 text-white/40">
          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1a5 5 0 0 0-5 5v4H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V12a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v4H9V6a3 3 0 0 1 3-3z"/>
          </svg>
        </div>
      )}
      <div className="absolute left-full ml-4 px-3 py-2 bg-[#1a1c24] border border-white/[0.1] rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {item.label}
        {isRestricted && <span className="block text-xs text-red-400 mt-1">🔒 Restricted</span>}
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

  return (
    <div
      ref={buttonRef}
      className={`
        relative flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0
        transition-all duration-200 ${isRestricted ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        ${
          (isActive || isHovered) && !isRestricted
            ? "bg-pink-500/20 text-pink-400"
            : "text-white/60 hover:text-white hover:bg-white/[0.08]"
        }
      `}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <Icon size={18} />
      {isRestricted && (
        <div className="absolute top-1 right-1 text-white/40">
          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1a5 5 0 0 0-5 5v4H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V12a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v4H9V6a3 3 0 0 1 3-3z"/>
          </svg>
        </div>
      )}
    </div>
  );
}

// Mobile Sidebar Link Component
function MobileSidebarLink({
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

  const handleClick = (e: React.MouseEvent) => {
    if (isRestricted) {
      e.preventDefault();
    } else {
      onClick?.();
    }
  };

  return (
    <Link
      href={isRestricted ? "#" : item.href}
      onClick={handleClick}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors
        ${isRestricted ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        ${
          isActive && !isRestricted
            ? "bg-pink-500/20 text-pink-300 font-medium"
            : "text-white/80 hover:text-white hover:bg-white/[0.08]"
        }
      `}
    >
      <Icon size={18} />
      <span>{item.label}</span>
      {isRestricted && (
        <span className="ml-auto text-white/30 text-xs">🔒</span>
      )}
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
      <div className="pointer-events-auto bg-[#0f1119]/98 border border-pink-500/20 border-l-2 border-l-pink-500 rounded-r-xl backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.4)] min-w-[240px] py-3 animate-slideIn">
        {/* Section Title */}
        <div className="px-4 py-2 text-sm font-semibold text-pink-400 border-b border-white/[0.1] mb-2">
          {section.label}
        </div>

        {/* Items */}
        <div className="space-y-1 px-2">
          {section.items.map((item) => {
            const itemRestricted = isRestricted(role, item.label);
            const isExactMatch = pathname === item.href;
            const isChildRoute = pathname.startsWith(item.href + "/");
            const longerMatchExists = section.items.some((other) =>
              other.href !== item.href &&
              other.href.length > item.href.length &&
              (pathname === other.href || pathname.startsWith(other.href + "/"))
            );
            const isActive = !itemRestricted && (isExactMatch || isChildRoute) && !longerMatchExists;

            return (
              <Link
                key={item.href}
                href={itemRestricted ? "#" : item.href}
                onClick={(e) => { if (itemRestricted) e.preventDefault(); e.stopPropagation(); }}
                className={`
                  block px-4 py-2.5 rounded-lg text-sm transition-all duration-150
                  ${itemRestricted ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                  ${
                    isActive
                      ? "bg-pink-500/20 text-pink-300 font-medium"
                      : "text-white/80 hover:text-white hover:bg-white/[0.08] hover:pl-5"
                  }
                `}
              >
                {item.label}
                {itemRestricted && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 text-xs">🔒</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}