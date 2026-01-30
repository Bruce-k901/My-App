"use client";

import { useAppContext } from "@/context/AppContext";
import CompanySelector from "@/components/ui/CompanySelector";

// ⚠️ CRITICAL HYDRATION FIX - STATIC STRUCTURE
// Server and client must render the EXACT same HTML structure.
// No conditional rendering based on mount state - causes hydration mismatches.
export default function OrgContentWrapper({ title, actions, search, children, suppressHydrationWarning }: { title: string; actions?: React.ReactNode; search?: React.ReactNode; children: React.ReactNode; suppressHydrationWarning?: boolean }) {
  const { profile } = useAppContext();
  const showCompanySelector = profile && (profile.app_role === 'Admin' || profile.app_role === 'Owner' || profile.app_role === 'Manager');
  
  // CRITICAL: Render same structure on server and client to prevent hydration mismatch
  // Always render the structure, even if content is empty initially
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 px-6 pb-10" suppressHydrationWarning={suppressHydrationWarning ?? true}>
      {/* Title + Actions + Company Selector - Always render structure */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h2>
        <div className="flex flex-wrap items-center gap-3">
          {showCompanySelector && (
            <CompanySelector 
              useGlobalContext={true}
              className="min-w-[200px]"
            />
          )}
          {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </div>
      </div>

      {/* Optional Search Bar - Always render if provided */}
      {search && <div className="max-w-md">{search}</div>}

      {/* Divider (optional for cleaner visual separation) */}
      <div className="h-[1px] w-full bg-slate-200 dark:bg-gray-800/40" />

      {/* Main Content - Always render container */}
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}