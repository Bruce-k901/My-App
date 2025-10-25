"use client";
import { useEffect, useState, createContext, useContext } from "react";
import { supabase } from "@/lib/supabase";

interface DashboardData {
  sites: any[];
  assets: any[];
  contractors: any[];
  profiles: any[];
}

interface DashboardContextType {
  data: DashboardData | null;
  loading: boolean;
}

const DashboardContext = createContext<DashboardContextType>({
  data: null,
  loading: true,
});

export const useDashboardData = () => useContext(DashboardContext);

export default function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("🔄 DashboardProvider: Loading data...");
        
        // First, check for cached preload data
        const cached = sessionStorage.getItem("checkly-preload");
        if (cached) {
          console.log("✅ DashboardProvider: Using cached data");
          const parsedData = JSON.parse(cached);
          const dashboardData: DashboardData = {
            sites: parsedData[0]?.data || [],
            assets: parsedData[1]?.data || [],
            contractors: parsedData[2]?.data || [],
            profiles: parsedData[3]?.data || [],
          };
          setData(dashboardData);
          sessionStorage.removeItem("checkly-preload");
          setLoading(false);
          return;
        }

        console.log("🔄 DashboardProvider: Fetching fresh data...");
        
        // Fallback: fetch data if no preload cache with individual timeouts
        const preloadQueries = [
          supabase.from("sites").select("*"),
          supabase.from("assets").select("*"),
          supabase.from("contractors").select("*"),
          supabase.from("profiles").select("*")
        ];

        // Add individual timeouts to prevent infinite loading
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
        
        console.log("✅ DashboardProvider: Data loaded successfully");
        setData(dashboardData);
      } catch (error) {
        console.error("❌ DashboardProvider: Failed to load data:", error);
        // Set empty data to prevent infinite loading
        setData({
          sites: [],
          assets: [],
          contractors: [],
          profiles: [],
        });
      } finally {
        console.log("✅ DashboardProvider: Loading complete");
        setLoading(false);
      }
    };

    // Add a fallback timeout to ensure loading never gets stuck
    const fallbackTimeout = setTimeout(() => {
      console.log("⚠️ DashboardProvider: Fallback timeout - showing dashboard anyway");
      setData({
        sites: [],
        assets: [],
        contractors: [],
        profiles: [],
      });
      setLoading(false);
    }, 15000); // 15 second absolute timeout

    loadData().finally(() => {
      clearTimeout(fallbackTimeout);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard data...</p>
          <p className="text-slate-500 text-sm mt-2">This should only take a moment</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={{ data, loading }}>
      {children}
    </DashboardContext.Provider>
  );
}