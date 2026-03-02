"use client";

import { ReportFiltersProvider } from "@/components/reports/hooks/useReportFilters";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <ReportFiltersProvider>{children}</ReportFiltersProvider>;
}
