"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
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
      { label: "My Tasks", href: "/dashboard/tasks" },
      { label: "Task Templates", href: "/dashboard/tasks/templates" },
      { label: "Compliance Templates", href: "/dashboard/tasks/compliance-templates" },
      { label: "Drafts", href: "/dashboard/tasks/drafts" },
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
      { label: "All Libraries", href: "/dashboard/sops/libraries" },
      { label: "Create Library", href: "/dashboard/libraries/create" },
      { label: "Library Templates", href: "/dashboard/libraries/templates" },
      // All created libraries
      { label: "Ingredients Library", href: "/dashboard/sops/libraries/ingredients" },
      { label: "PPE Library", href: "/dashboard/sops/libraries/ppe" },
      { label: "Chemicals Library", href: "/dashboard/sops/libraries/chemicals" },
      { label: "Drinks Library", href: "/dashboard/sops/libraries/drinks" },
      { label: "Disposables Library", href: "/dashboard/sops/libraries/disposables" },
      { label: "Glassware Library", href: "/dashboard/sops/libraries/glassware" },
      { label: "Packaging Library", href: "/dashboard/sops/libraries/packaging" },
      { label: "Serving Equipment", href: "/dashboard/sops/libraries/serving-equipment" },
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
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
        />

        <div className="w-12 h-px bg-white/[0.1] my-2" />

        {/* Hover Sections */}
        {sections.map((section) => (
          <SidebarSectionItem
            key={section.label}
            section={section}
            isHovered={hoveredSection === section.label}
            onHover={() => handleHover(section.label)}
            onLeave={handleLeave}
            pathname={pathname}
            buttonRef={buttonRefs[section.label]}
          />
        ))}

        <div className="w-12 h-px bg-white/[0.1] my-2" />

        {/* Bottom Direct Links */}
        {directLinks.slice(1).map((link) => (
          <SidebarDirectLink
            key={link.href}
            item={link}
            isActive={pathname.startsWith(link.href)}
          />
        ))}
      </aside>

      {/* Hover Popups */}
      {sections.map((section) => (
        <SidebarPopup
          key={section.label}
          section={section}
          isVisible={hoveredSection === section.label}
          onMouseEnter={() => handleHover(section.label)}
          onMouseLeave={handleLeave}
          pathname={pathname}
          buttonRef={buttonRefs[section.label]}
        />
      ))}
    </>
  );
}

// Direct Link Component
function SidebarDirectLink({
  item,
  isActive,
}: {
  item: SidebarLink;
  isActive: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`
        relative group flex items-center justify-center w-14 h-14 rounded-xl
        transition-all duration-200
        ${
          isActive
            ? "bg-pink-500/20 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.4)]"
            : "text-white/60 hover:text-white hover:bg-white/[0.08]"
        }
      `}
    >
      <Icon size={22} />
      
      {/* Tooltip */}
      <div className="absolute left-full ml-4 px-3 py-2 bg-[#1a1c24] border border-white/[0.1] rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
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
  buttonRef,
}: {
  section: SidebarSection;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  pathname: string;
  buttonRef: React.RefObject<HTMLDivElement>;
}) {
  const Icon = section.icon;

  const isAnyChildActive = section.items.some((item) =>
    pathname.startsWith(item.href)
  );

  return (
    <div
      ref={buttonRef}
      className={`
        relative flex items-center justify-center w-14 h-14 rounded-xl
        transition-all duration-200 cursor-pointer
        ${
          isAnyChildActive || isHovered
            ? "bg-pink-500/20 text-pink-400"
            : "text-white/60 hover:text-white hover:bg-white/[0.08]"
        }
      `}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <Icon size={22} />
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
}: {
  section: SidebarSection;
  isVisible: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  pathname: string;
  buttonRef: React.RefObject<HTMLDivElement>;
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
            // FIX #1: More precise active state matching
            const isExactMatch = pathname === item.href;
            const isChildRoute = pathname.startsWith(item.href + "/") && 
              !section.items.some(other => 
                other.href !== item.href && pathname.startsWith(other.href)
              );
            
            const isActive = isExactMatch || isChildRoute;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  block px-4 py-2.5 rounded-lg text-sm transition-all duration-150
                  ${
                    isActive
                      ? "bg-pink-500/20 text-pink-300 font-medium"
                      : "text-white/80 hover:text-white hover:bg-white/[0.08] hover:pl-5"
                  }
                `}
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