"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
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
      { label: "Documents", href: "/dashboard/documents" },
    ],
  },
  {
    label: "Tasks",
    icon: CheckSquare,
    items: [
      { label: "Compliance", href: "/dashboard/tasks/compliance" },
      { label: "Templates", href: "/dashboard/tasks/templates" },
      { label: "Active", href: "/dashboard/tasks/active" },
      { label: "Completed", href: "/dashboard/tasks/completed" },
    ],
  },
  {
    label: "SOPs",
    icon: FileText,
    items: [
      { label: "My SOPs", href: "/dashboard/sops" },
      { label: "SOP Templates", href: "/dashboard/sops/templates" },
      { label: "My RA's", href: "/dashboard/sops/my-ras" },
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
];

const directLinks: SidebarLink[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { label: "EHO Readiness", href: "/dashboard/eho-report", icon: ShieldCheck },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Support", href: "/dashboard/support", icon: HelpCircle },
];
export default function NewMainSidebar() {
  const pathname = usePathname();
  const { role: contextRole } = useAppContext();
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const roleGuard = isRoleGuardEnabled();
  const role = (
    (contextRole as AppRole) || (roleGuard ? (null as any) : ("Admin" as AppRole))
  ) as AppRole;
  
  // Create refs for each section button
  const orgRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef<HTMLDivElement>(null);
  const sopsRef = useRef<HTMLDivElement>(null);
  const librariesRef = useRef<HTMLDivElement>(null);
  const assetsRef = useRef<HTMLDivElement>(null);
  
  // Map section labels to refs
  const buttonRefs: { [key: string]: React.RefObject<HTMLDivElement> } = {
    "Organization": orgRef,
    "Tasks": tasksRef,
    "SOPs": sopsRef,
    "Libraries": librariesRef,
    "Assets": assetsRef,
  };

  // Handle hover with delay
  const handleHover = (sectionLabel: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovering(true);
    setHoveredSection(sectionLabel);
  };

  const handleLeave = () => {
    setIsHovering(false);
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isHovering) {
        setHoveredSection(null);
      }
    }, 150); // 150ms delay
  };

  // FIX #2: Close popup when route changes
  useEffect(() => {
    setHoveredSection(null);
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
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Main Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-20 bg-[#0B0D13] border-r border-white/[0.1] flex flex-col items-center py-6 gap-2 z-50">
        {/* Dashboard Link at Top */}
        <SidebarDirectLink
          item={directLinks[0]}
          isActive={pathname === "/dashboard"}
          isRestricted={false}
        />

        <div className="w-12 h-px bg-white/[0.1] my-2" />

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

        <div className="w-12 h-px bg-white/[0.1] my-2" />

        {/* Bottom Direct Links */}
        {directLinks.slice(1).map((link) => {
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

      {/* Hover Popups */}
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
        relative group flex items-center justify-center w-14 h-14 rounded-xl
        transition-all duration-200
        ${isRestricted ? "opacity-40 cursor-not-allowed" : ""}
        ${
          isActive && !isRestricted
            ? "bg-pink-500/20 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.4)]"
            : "text-white/60 hover:text-white hover:bg-white/[0.08]"
        }
      `}
    >
      <Icon size={22} />
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
        relative flex items-center justify-center w-14 h-14 rounded-xl
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
      <Icon size={22} />
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
      onMouseEnter={onMouseEnter}
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