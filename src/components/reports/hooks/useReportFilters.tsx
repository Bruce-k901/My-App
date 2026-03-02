"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { format, subDays } from "date-fns";

interface ReportFiltersState {
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  quickRange: "week" | "month" | "quarter" | "custom";
  setQuickRange: (range: "week" | "month" | "quarter" | "custom") => void;
  siteId: string | null;
  setSiteId: (id: string | null) => void;
}

const ReportFiltersContext = createContext<ReportFiltersState | null>(null);

function getDateRange(range: "week" | "month" | "quarter" | "custom") {
  const now = new Date();
  switch (range) {
    case "week":
      return { start: format(subDays(now, 7), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
    case "month":
      return { start: format(subDays(now, 30), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
    case "quarter":
      return { start: format(subDays(now, 90), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
    default:
      return { start: format(subDays(now, 30), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
  }
}

export function ReportFiltersProvider({ children }: { children: ReactNode }) {
  const [quickRange, setQuickRangeState] = useState<"week" | "month" | "quarter" | "custom">("month");
  const [dateRange, setDateRangeState] = useState(getDateRange("month"));
  const [siteId, setSiteId] = useState<string | null>(null);

  const setQuickRange = (range: "week" | "month" | "quarter" | "custom") => {
    setQuickRangeState(range);
    if (range !== "custom") {
      setDateRangeState(getDateRange(range));
    }
  };

  const setDateRange = (range: { start: string; end: string }) => {
    setDateRangeState(range);
    setQuickRangeState("custom");
  };

  return (
    <ReportFiltersContext.Provider value={{ dateRange, setDateRange, quickRange, setQuickRange, siteId, setSiteId }}>
      {children}
    </ReportFiltersContext.Provider>
  );
}

export function useReportFilters() {
  const ctx = useContext(ReportFiltersContext);
  if (!ctx) throw new Error("useReportFilters must be used within ReportFiltersProvider");
  return ctx;
}
