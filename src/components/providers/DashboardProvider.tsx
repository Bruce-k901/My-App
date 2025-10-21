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
        // First, check for cached preload data
        const cached = sessionStorage.getItem("checkly-preload");
        if (cached) {
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

        // Fallback: fetch data if no preload cache
        const preloadQueries = [
          supabase.from("sites").select("*"),
          supabase.from("assets").select("*"),
          supabase.from("contractors").select("*"),
          supabase.from("profiles").select("*")
        ];

        const results = await Promise.all(preloadQueries);
        const dashboardData: DashboardData = {
          sites: results[0]?.data || [],
          assets: results[1]?.data || [],
          contractors: results[2]?.data || [],
          profiles: results[3]?.data || [],
        };
        setData(dashboardData);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        // Set empty data to prevent infinite loading
        setData({
          sites: [],
          assets: [],
          contractors: [],
          profiles: [],
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-slate-400">Loading fast data...</p>
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={{ data, loading }}>
      {children}
    </DashboardContext.Provider>
  );
}