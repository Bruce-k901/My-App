"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Building2, Check } from '@/components/ui/icons';
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { createPortal } from "react-dom";

interface Company {
  id: string;
  name: string;
}

export function ContextSwitcher() {
  const { company, profile, setCompany, setSelectedSite } = useAppContext();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Load companies based on user role
    const loadCompanies = async () => {
      if (!profile?.id) {
        setLoading(false);
        return;
      }

      try {
        // Platform admins can see ALL companies
        if (profile.is_platform_admin) {
          console.log('🏢 [ContextSwitcher] Platform admin detected, loading all companies');
          const { data, error } = await supabase
            .from("companies")
            .select("id, name")
            .order("name");

          if (!error && data) {
            setCompanies(data);
            console.log('🏢 [ContextSwitcher] Loaded', data.length, 'companies for platform admin');
          }
        } else {
          // Regular users: load from their profile company
          // Future: could expand to user_companies table for multi-company access
          if (profile.company_id) {
            const { data, error } = await supabase
              .from("companies")
              .select("id, name")
              .eq("id", profile.company_id)
              .single();

            if (!error && data) {
              setCompanies([data]);
              console.log('🏢 [ContextSwitcher] Loaded company for user:', data.name);
            }
          }
        }
      } catch (error) {
        console.error("Error loading companies:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, [profile?.id, profile?.is_platform_admin, profile?.company_id]);

  const handleSelectCompany = (selectedCompany: Company) => {
    console.log('🏢 [ContextSwitcher] Selecting company:', selectedCompany.name);

    // Update the company in context
    setCompany(selectedCompany);

    // Clear the selected site when switching companies (site won't belong to new company)
    setSelectedSite(null);

    // Store selected company in localStorage for persistence
    localStorage.setItem("selectedCompanyId", selectedCompany.id);
    localStorage.removeItem("selectedSiteId"); // Clear site selection

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

  // Don't render until mounted to prevent hydration mismatch
  // This component depends on client-side state (profile, companies) that may differ from server
  if (!mounted) {
    return null;
  }

  // Don't show if user only has access to one company (unless they're platform admin)
  if (!loading && companies.length <= 1 && !profile?.is_platform_admin) {
    return null;
  }

  const displayText = company?.name || "Select Company";
  const buttonRect = buttonRef.current?.getBoundingClientRect();

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          h-10 px-4 rounded-lg border flex items-center gap-2 min-w-[180px]
          transition-all
          ${isOpen
            ? "bg-black/[0.05] dark:bg-white/[0.08] border-[#D37E91]"
            : "bg-black/[0.03] dark:bg-white/[0.03] border-[rgb(var(--border))] dark:border-white/[0.06] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
          }
        `}
        disabled={loading}
        suppressHydrationWarning
      >
        <Building2 className="w-4 h-4 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary" />
        <span className="text-[rgb(var(--text-primary))] dark:text-white font-medium flex-1 text-left truncate" suppressHydrationWarning>
          {loading ? "Loading..." : displayText}
        </span>
        <ChevronDown className={`w-4 h-4 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
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
          {/* Company Options */}
          {companies.map((comp) => (
            <button
              key={comp.id}
              onClick={() => handleSelectCompany(comp)}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors text-left"
            >
              <Building2 className="w-4 h-4 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary" />
              <span className="flex-1 text-[rgb(var(--text-primary))] dark:text-white">{comp.name}</span>
              {company?.id === comp.id && <Check className="w-4 h-4 text-[#D37E91]" />}
            </button>
          ))}

          {companies.length === 0 && !loading && (
            <div className="px-4 py-2 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm">
              No companies available
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
