"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

type Company = {
  id: string;
  name: string;
};

type CompanySelectorProps = {
  value?: string | null;
  onChange?: (companyId: string | null) => void;
  placeholder?: string;
  className?: string;
  onCompaniesLoaded?: () => void;
  useGlobalContext?: boolean; // If true, uses AppContext's selectedCompanyId and setCompany
};

export default function CompanySelector({ 
  value, 
  onChange, 
  placeholder = "Select Company",
  className = "",
  onCompaniesLoaded,
  useGlobalContext = false
}: CompanySelectorProps) {
  const { profile, companyId: contextCompanyId, setCompany, company } = useAppContext();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Use global context if enabled
  const effectiveValue = useGlobalContext ? (contextCompanyId || company?.id) : value;
  const effectiveOnChange = useGlobalContext 
    ? (companyId: string | null) => {
        if (companyId) {
          const selectedCompany = companies.find(c => c.id === companyId);
          if (selectedCompany) {
            // Update profiles.company_id (this will trigger sync)
            supabase
              .from("profiles")
              .update({ company_id: companyId })
              .eq("id", profile?.id)
              .then(() => {
                setCompany({ id: selectedCompany.id, name: selectedCompany.name });
                // Reload page to update all contexts
                window.location.reload();
              });
          }
        } else {
          setCompany(null);
        }
        if (onChange) onChange(companyId);
      }
    : onChange || (() => {});

  useEffect(() => {
    const loadCompanies = async () => {
      if (!profile?.id) {
        setLoading(false);
        return;
      }

      try {
        // Query companies via user_companies junction table
          const { data: userCompanies, error: companiesError } = await supabase
            .from("user_companies")
            .select(`
              company_id,
              app_role,
              is_primary,
              companies (
                id,
                name
              )
            `)
            .eq("profile_id", profile.id)
            .order("is_primary", { ascending: false });

        // Check if error is due to table not existing (404 or relation error)
        const isTableNotFound = companiesError && (
          companiesError.code === 'PGRST116' ||
          companiesError.code === '42P01' || // relation does not exist
          companiesError.message?.includes('404') ||
          companiesError.message?.includes('relation') ||
          companiesError.message?.includes('does not exist') ||
          (companiesError as any)?.status === 404
        );
        
        // Silently handle table not found (migration not run yet)
        if (isTableNotFound) {
          console.debug('⚠️ [CompanySelector] user_companies table not found, falling back to profile.company_id');
        }

        if (companiesError && !isTableNotFound) {
          console.error("Error loading user companies:", companiesError);
          // Fallback to profile.company_id
          if (profile.company_id) {
            const { data: companyData } = await supabase
              .from("companies")
              .select("id, name")
              .eq("id", profile.company_id)
              .single();
            
            if (companyData) {
              setCompanies([companyData]);
            }
          }
        } else if (userCompanies && userCompanies.length > 0) {
          const companiesList = userCompanies
            .map((uc: any) => {
              const company = Array.isArray(uc.companies) ? uc.companies[0] : uc.companies;
              return company ? { id: company.id, name: company.name } : null;
            })
            .filter(Boolean) as Company[];
          
          setCompanies(companiesList);
          console.log('🏢 [CompanySelector] Companies loaded:', companiesList.length, 'companies');
        } else {
          // Fallback to profile.company_id if no user_companies entries
          if (profile.company_id) {
            const { data: companyData } = await supabase
              .from("companies")
              .select("id, name")
              .eq("id", profile.company_id)
              .single();
            
            if (companyData) {
              setCompanies([companyData]);
            }
          }
        }

        if (onCompaniesLoaded) {
          onCompaniesLoaded();
        }
      } catch (error) {
        console.error("Error loading companies:", error);
        // Fallback to profile.company_id on error
        if (profile.company_id) {
          try {
            const { data: companyData } = await supabase
              .from("companies")
              .select("id, name")
              .eq("id", profile.company_id)
              .single();
            
            if (companyData) {
              setCompanies([companyData]);
            }
          } catch (fallbackError) {
            console.error("Fallback company load failed:", fallbackError);
          }
        }
      } finally {
        setLoading(false);
        if (onCompaniesLoaded) {
          onCompaniesLoaded();
        }
      }
    };

    loadCompanies();
  }, [profile?.id]);

  // Don't show selector if user only has access to one company
  if (!loading && companies.length <= 1) {
    return null;
  }

  return (
    <select
      value={effectiveValue || ""}
      onChange={(e) => effectiveOnChange(e.target.value || null)}
      className={`
        h-10 px-3 rounded-lg border border-white/[0.12] bg-white/[0.06] text-white
        focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50
        hover:bg-white/[0.08] transition-colors
        ${className}
      `}
      disabled={loading}
    >
      <option value="">{loading ? "Loading..." : placeholder}</option>
      {companies.map((company) => (
        <option key={company.id} value={company.id} className="bg-gray-800 text-white">
          {company.name}
        </option>
      ))}
    </select>
  );
}
