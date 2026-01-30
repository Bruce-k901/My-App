"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { 
  getUserAccessibleSitesClient, 
  getDefaultSiteIdClient, 
  canAccessSiteClient
} from "@/lib/services/site-access-client";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import type { AccessibleSite, UserRole } from "@/lib/services/site-access";

/**
 * Site Context Type
 * Provides site selection state and functions to all components
 */
interface SiteContextType {
  // Current state
  selectedSiteId: string | "all";
  accessibleSites: AccessibleSite[];
  userHomeSite: string | null;
  userRole: UserRole | null;
  loading: boolean;
  
  // Actions
  setSelectedSite: (siteId: string | "all") => void;
  
  // Helpers
  canUserSwitchSites: boolean; // false if user only has 1 site
  getCurrentSiteName: () => string; // Returns name of selected site or "All Sites"
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

/**
 * Site Context Provider
 * 
 * Manages site selection state and provides it to all components.
 * Integrates with AppContext to get the current user.
 */
export function SiteContextProvider({ children }: { children: ReactNode }) {
  const { user, loading: appLoading } = useAppContext();
  
  // State
  const [selectedSiteId, setSelectedSiteIdState] = useState<string | "all">("all");
  const [accessibleSites, setAccessibleSites] = useState<AccessibleSite[]>([]);
  const [userHomeSite, setUserHomeSite] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Mark as mounted to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize site context when user is available
  useEffect(() => {
    async function initializeSiteContext() {
      // Wait for AppContext to finish loading
      if (appLoading) {
        return;
      }

      // If no user, set loading to false and return
      if (!user?.id) {
        setLoading(false);
        setAccessibleSites([]);
        setUserHomeSite(null);
        setUserRole(null);
        setSelectedSiteIdState("all");
        return;
      }

      try {
        setLoading(true);

        // 1. Get accessible sites
        const sites = await getUserAccessibleSitesClient(user.id);
        setAccessibleSites(sites);

        // Get user role and home site from profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("app_role, home_site")
          .eq("id", user.id)
          .single();
        
        if (profileData) {
          setUserRole((profileData.app_role || "Staff") as UserRole);
          if (profileData.home_site) {
            setUserHomeSite(profileData.home_site);
          }
        }

        // Also find home site from accessible sites (as backup)
        const homeSite = sites.find(s => s.is_home);
        if (homeSite && !profileData?.home_site) {
          setUserHomeSite(homeSite.id);
        }

        // 2. Get default site to show
        const defaultSiteId = await getDefaultSiteIdClient(user.id);

        // 3. Check localStorage for last selected site (only if mounted)
        let initialSiteId: string | "all" = defaultSiteId;
        
        if (isMounted) {
          try {
            const storedSiteId = localStorage.getItem("selectedSiteId");
            
            // 4. Validate stored site is still accessible
            if (storedSiteId && storedSiteId !== "all") {
              const canAccess = await canAccessSiteClient(user.id, storedSiteId);
              if (canAccess) {
                initialSiteId = storedSiteId;
              }
            } else if (storedSiteId === "all") {
              // Validate user can access "all" (admin/owner)
              const canAccess = await canAccessSiteClient(user.id, "all");
              if (canAccess) {
                initialSiteId = "all";
              }
            }
          } catch (error) {
            console.warn("Failed to read from localStorage:", error);
          }
        }

        setSelectedSiteIdState(initialSiteId);

        // Persist to localStorage
        if (isMounted) {
          try {
            localStorage.setItem("selectedSiteId", initialSiteId);
          } catch (error) {
            console.warn("Failed to save to localStorage:", error);
          }
        }
      } catch (error) {
        console.error("Error initializing site context:", error);
        // Set defaults on error
        setAccessibleSites([]);
        setUserHomeSite(null);
        setUserRole(null);
        setSelectedSiteIdState("all");
      } finally {
        setLoading(false);
      }
    }

    initializeSiteContext();
  }, [user?.id, appLoading, isMounted]); // Re-run when user changes or app finishes loading

  // Function to change selected site
  const setSelectedSite = useCallback((siteId: string | "all") => {
    setSelectedSiteIdState(siteId);
    
    // Persist to localStorage
    if (isMounted) {
      try {
        localStorage.setItem("selectedSiteId", siteId);
      } catch (error) {
        console.warn("Failed to save to localStorage:", error);
      }
    }
  }, [isMounted]);

  // Computed values
  const canUserSwitchSites = accessibleSites.length > 1 || 
    (userRole === "Admin" || userRole === "Owner" || userRole === "Super Admin");

  const getCurrentSiteName = useCallback((): string => {
    if (selectedSiteId === "all") return "All Sites";
    const site = accessibleSites.find(s => s.id === selectedSiteId);
    return site?.name || "Unknown Site";
  }, [selectedSiteId, accessibleSites]);

  // Context value
  const value: SiteContextType = {
    selectedSiteId,
    accessibleSites,
    userHomeSite,
    userRole,
    loading,
    setSelectedSite,
    canUserSwitchSites,
    getCurrentSiteName,
  };

  return (
    <SiteContext.Provider value={value}>
      {children}
    </SiteContext.Provider>
  );
}

/**
 * Hook to use Site Context
 * 
 * @throws Error if used outside SiteContextProvider
 */
export function useSiteContext() {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error("useSiteContext must be used within SiteContextProvider");
  }
  return context;
}
