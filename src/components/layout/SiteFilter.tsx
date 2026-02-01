"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, MapPin, Check } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { createPortal } from "react-dom";

interface Site {
  id: string;
  name: string;
}

export function SiteFilter() {
  const { company, setSelectedSite, profile, selectedSiteId: contextSelectedSiteId } = useAppContext();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if user is staff - staff should not see site selector
  const userRole = profile?.app_role?.toLowerCase() || 'staff';
  const isStaff = userRole === 'staff';
  const homeSiteId = profile?.home_site || profile?.site_id;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync local state with context state
  useEffect(() => {
    setSelectedSiteId(contextSelectedSiteId);
  }, [contextSelectedSiteId]);

  useEffect(() => {
    // Load sites for the selected company
    // Staff: only load their home site
    // Managers/Admins/Owners/Platform Admins: load all sites for selected company
    const loadSites = async () => {
      if (!company?.id) {
        setSites([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      console.log('🏢 [SiteFilter] Loading sites for company:', company.id, company.name);

      try {
        if (isStaff && homeSiteId) {
          // Staff: only load their home site
          const { data, error } = await supabase
            .from("sites")
            .select("id, name")
            .eq("id", homeSiteId)
            .single();

          if (!error && data) {
            setSites([data]);
            // Auto-select home site for staff
            setSelectedSiteId(homeSiteId);
            setSelectedSite(homeSiteId);
          }
        } else {
          // Managers/Admins/Owners/Platform Admins: load all sites for selected company
          const { data, error } = await supabase
            .from("sites")
            .select("id, name")
            .eq("company_id", company.id)
            .order("name");

          if (!error && data) {
            setSites(data);
            console.log('🏢 [SiteFilter] Loaded', data.length, 'sites for company', company.name);

            // If the currently selected site doesn't belong to this company, clear it
            if (selectedSiteId) {
              const siteExistsInCompany = data.some(s => s.id === selectedSiteId);
              if (!siteExistsInCompany) {
                console.log('🏢 [SiteFilter] Selected site not in new company, clearing selection');
                setSelectedSiteId(null);
                setSelectedSite(null);
                localStorage.removeItem("selectedSiteId");
              }
            }
          } else if (error) {
            console.error("Error loading sites:", error);
            setSites([]);
          }
        }
      } catch (error) {
        console.error("Error loading sites:", error);
        setSites([]);
      } finally {
        setLoading(false);
      }
    };

    loadSites();
  }, [company?.id, isStaff, homeSiteId]);

  // Load selected site from localStorage on mount - only after mount to prevent hydration mismatch
  useEffect(() => {
    if (!mounted || !sites.length) return;

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedSiteId");
      if (stored && sites.length > 0) {
        const site = sites.find((s) => s.id === stored);
        if (site) {
          console.log('🏢 [SiteFilter] Loading stored site from localStorage:', stored);
          setSelectedSiteId(stored);
          // Also update AppContext
          setSelectedSite(stored);
        }
      }
    }
  }, [sites, mounted, setSelectedSite]);

  const handleSiteSelect = (siteId: string | null) => {
    console.log('🏢 [SiteFilter] handleSiteSelect called with siteId:', siteId);
    setSelectedSiteId(siteId);
    // Update AppContext so other components can react to the change
    setSelectedSite(siteId);
    if (siteId) {
      localStorage.setItem("selectedSiteId", siteId);
    } else {
      localStorage.removeItem("selectedSiteId");
    }
    setIsOpen(false);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const displayText = selectedSite ? selectedSite.name : "All Sites";

  const buttonRect = buttonRef.current?.getBoundingClientRect();

  // Don't show if no company is selected
  if (!company?.id) {
    return null;
  }

  // For staff, just show their home site name (read-only, no dropdown)
  if (isStaff && homeSiteId && selectedSite) {
    return (
      <div className="h-10 px-4 rounded-lg border flex items-center gap-2 min-w-[200px] bg-black/[0.03] dark:bg-white/[0.03] border-[rgb(var(--border))] dark:border-white/[0.06]">
        <MapPin className="w-4 h-4 text-[rgb(var(--text-secondary))] dark:text-white/60" />
        <span className="text-[rgb(var(--text-primary))] dark:text-white font-medium flex-1 text-left">{selectedSite.name}</span>
      </div>
    );
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          h-10 px-4 rounded-lg border flex items-center gap-2 min-w-[200px]
          transition-all
          ${isOpen
            ? "bg-black/[0.05] dark:bg-white/[0.08] border-[#EC4899]"
            : "bg-black/[0.03] dark:bg-white/[0.03] border-[rgb(var(--border))] dark:border-white/[0.06] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
          }
        `}
        disabled={loading}
        suppressHydrationWarning
      >
        <MapPin className="w-4 h-4 text-[rgb(var(--text-secondary))] dark:text-white/60" />
        <span className="text-[rgb(var(--text-primary))] dark:text-white font-medium flex-1 text-left truncate" suppressHydrationWarning>
          {loading ? "Loading..." : displayText}
        </span>
        <ChevronDown className={`w-4 h-4 text-[rgb(var(--text-secondary))] dark:text-white/60 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && mounted && buttonRect && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-[rgb(var(--surface-elevated))] dark:bg-[#1a1a1a] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-lg shadow-lg min-w-[240px] max-h-[400px] overflow-y-auto py-2 z-50"
          style={{
            top: `${buttonRect.bottom + 8}px`,
            left: `${buttonRect.left}px`,
          }}
        >
          {/* All Sites Option */}
          <button
            onClick={() => handleSiteSelect(null)}
            className="w-full px-4 py-2 flex items-center gap-3 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors text-left"
          >
            <span className="flex-1 text-[rgb(var(--text-primary))] dark:text-white font-medium">All Sites</span>
            {!selectedSiteId && <Check className="w-4 h-4 text-[#EC4899]" />}
          </button>

          {/* Divider */}
          <div className="h-px bg-[rgb(var(--border))] dark:bg-white/[0.06] my-1" />

          {/* Site Options */}
          {sites.map((site) => (
            <button
              key={site.id}
              onClick={() => handleSiteSelect(site.id)}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors text-left"
            >
              <MapPin className="w-4 h-4 text-[rgb(var(--text-secondary))] dark:text-white/60" />
              <span className="flex-1 text-[rgb(var(--text-primary))] dark:text-white">{site.name}</span>
              {selectedSiteId === site.id && <Check className="w-4 h-4 text-[#EC4899]" />}
            </button>
          ))}

          {sites.length === 0 && !loading && (
            <div className="px-4 py-2 text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm">
              No sites available
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
