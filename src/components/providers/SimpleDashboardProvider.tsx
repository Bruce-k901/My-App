"use client";
import { useEffect, useState, createContext, useContext } from "react";

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

export default function SimpleDashboardProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔄 SimpleDashboardProvider: Starting...");
    
    // Simulate a quick load with empty data
    const timer = setTimeout(() => {
      console.log("✅ SimpleDashboardProvider: Loading complete with empty data");
      setData({
        sites: [],
        assets: [],
        contractors: [],
        profiles: [],
      });
      setLoading(false);
    }, 1000); // 1 second delay to show loading

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D37E91] mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
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
