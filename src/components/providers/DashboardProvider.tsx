"use client";
import { useEffect, useState, createContext, useContext, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { dashboardCache, createCacheKey } from "@/lib/dashboard-cache";

interface DashboardData {
  sites: any[];
  assets: any[];
  contractors: any[];
  profiles: any[];
}

interface DashboardContextType {
  data: DashboardData | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType>({
  data: null,
  loading: true,
  refresh: async () => {},
});

export const useDashboardData = () => useContext(DashboardContext);

const CACHE_KEY_PREFIX = "dashboard-provider";
const CACHE_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export default function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  const loadData = async (forceRefresh = false) => {
    // Prevent concurrent loads
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const cacheKey = createCacheKey(CACHE_KEY_PREFIX, {});
      
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = dashboardCache.get<DashboardData>(cacheKey);
        if (cached) {
          console.log("✅ DashboardProvider: Using cached data");
          setData(cached);
          setLoading(false);
          loadingRef.current = false;
          return;
        }
      }

      console.log("🔄 DashboardProvider: Fetching fresh data...");
      
      // First, check for cached preload data from sessionStorage
      const sessionCached = sessionStorage.getItem("checkly-preload");
      if (sessionCached && !forceRefresh) {
        console.log("✅ DashboardProvider: Using session preload data");
        const parsedData = JSON.parse(sessionCached);
        const dashboardData: DashboardData = {
          sites: parsedData[0]?.data || [],
          assets: parsedData[1]?.data || [],
          contractors: parsedData[2]?.data || [],
          profiles: parsedData[3]?.data || [],
        };
        setData(dashboardData);
        // Cache it for future use
        dashboardCache.set(cacheKey, dashboardData, CACHE_STALE_TIME);
        sessionStorage.removeItem("checkly-preload");
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      // Fetch data with individual timeouts
      const preloadQueries = [
        supabase.from("sites").select("*"),
        supabase.from("assets").select("*"),
        supabase.from("contractors").select("*"),
        supabase.from("profiles").select("*")
      ];

      const results = await Promise.allSettled(
        preloadQueries.map(async (query, index) => {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Query ${index} timeout`)), 5000)
          );
          
          try {
            return await Promise.race([query, timeoutPromise]);
          } catch (error) {
            console.warn(`⚠️ Query ${index} failed:`, error);
            return { data: [], error: error };
          }
        })
      );

      const dashboardData: DashboardData = {
        sites: results[0]?.status === 'fulfilled' ? results[0].value?.data || [] : [],
        assets: results[1]?.status === 'fulfilled' ? results[1].value?.data || [] : [],
        contractors: results[2]?.status === 'fulfilled' ? results[2].value?.data || [] : [],
        profiles: results[3]?.status === 'fulfilled' ? results[3].value?.data || [] : [],
      };
      
      // Cache the data
      dashboardCache.set(cacheKey, dashboardData, CACHE_STALE_TIME);
      
      console.log("✅ DashboardProvider: Data loaded successfully");
      setData(dashboardData);
    } catch (error) {
      console.error("❌ DashboardProvider: Failed to load data:", error);
      setData({
        sites: [],
        assets: [],
        contractors: [],
        profiles: [],
      });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const refresh = async () => {
    await loadData(true);
  };

  useEffect(() => {
    // Add a fallback timeout to ensure loading never gets stuck
    const fallbackTimeout = setTimeout(() => {
      if (loadingRef.current) {
        console.log("⚠️ DashboardProvider: Fallback timeout - showing dashboard anyway");
        setData({
          sites: [],
          assets: [],
          contractors: [],
          profiles: [],
        });
        setLoading(false);
        loadingRef.current = false;
      }
    }, 15000); // 15 second absolute timeout

    loadData().finally(() => {
      clearTimeout(fallbackTimeout);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D37E91] mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard data...</p>
          <p className="text-slate-500 text-sm mt-2">This should only take a moment</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={{ data, loading, refresh }}>
      {children}
    </DashboardContext.Provider>
  );
}