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
  const { company } = useAppContext();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentView, setCurrentView] = useState<"business" | "site">("business");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Load current view from localStorage only after mount
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("currentView");
      if (stored === "site" || stored === "business") {
        setCurrentView(stored);
      }
    }
  }, []);

  useEffect(() => {
    // Load sites for the company
    const loadSites = async () => {
      if (!company?.id) return;

      try {
        const { data, error } = await supabase
          .from("sites")
          .select("id, name")
          .eq("company_id", company.id)
          .order("name");

        if (!error && data) {
          setSites(data);
        }
      } catch (error) {
        console.error("Error loading sites:", error);
      }
    };

    loadSites();
  }, [company?.id]);

  // Load selected site from localStorage - only after mount to prevent hydration mismatch
  useEffect(() => {
    if (!mounted) return;
    
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedSiteId");
      if (stored && sites.length > 0) {
        const site = sites.find((s) => s.id === stored);
        if (site) {
          setSelectedSiteId(stored);
        }
      }
    }
  }, [sites, mounted]);

  const handleSiteSelect = (siteId: string | null) => {
    setSelectedSiteId(siteId);
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

  // Only show when in business view - use CSS class to hide instead of inline style to avoid hydration mismatch
  const shouldShow = mounted && currentView === "business";

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          h-10 px-4 rounded-lg border flex items-center gap-2 min-w-[200px]
          transition-all
          ${!shouldShow ? "opacity-0 pointer-events-none invisible" : "visible"}
          ${isOpen
            ? "bg-black/[0.05] dark:bg-white/[0.08] border-[#EC4899]"
            : "bg-black/[0.03] dark:bg-white/[0.03] border-[rgb(var(--border))] dark:border-white/[0.06] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
          }
        `}
        suppressHydrationWarning
      >
        <span className="text-[rgb(var(--text-primary))] dark:text-white font-medium flex-1 text-left" suppressHydrationWarning>{displayText}</span>
        <ChevronDown className={`w-4 h-4 text-[rgb(var(--text-secondary))] dark:text-white/60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && mounted && buttonRect && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-[rgb(var(--surface-elevated))] dark:bg-[#1a1a1a] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-lg shadow-lg min-w-[240px] py-2 z-50"
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
        </div>,
        document.body
      )}
    </>
  );
}
