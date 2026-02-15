"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import { Plus, Building2, Check, Settings, Users, Link2, ArrowLeft } from '@/components/ui/icons';

type UserCompany = {
  id: string;
  company_id: string;
  app_role: string;
  is_primary: boolean;
  companies: {
    id: string;
    name: string;
    parent_company_id: string | null;
  };
};

type CompanySettings = {
  share_staff: boolean;
  share_sites: boolean;
  share_stock: boolean;
  share_suppliers: boolean;
  share_assets: boolean;
  share_templates: boolean;
};

export default function CompaniesSettingsPage() {
  const router = useRouter();
  const { profile } = useAppContext();
  const [companies, setCompanies] = useState<UserCompany[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [linkToParent, setLinkToParent] = useState(false);
  const [parentCompanyId, setParentCompanyId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Settings state
  const [selectedCompanyForSettings, setSelectedCompanyForSettings] = useState<string | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);

  useEffect(() => {
    loadUserCompanies();
  }, [profile?.id]);

  const loadUserCompanies = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from("user_companies")
        .select(`
          id,
          company_id,
          app_role,
          is_primary,
          companies (
            id,
            name,
            parent_company_id
          )
        `)
        .eq("profile_id", profile.id)
        .order("is_primary", { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (err: any) {
      console.error("Error loading companies:", err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadCompanySettings = async (companyId: string) => {
    setLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("company_id", companyId)
        .single();

      if (error) throw error;

      setSettings({
        share_staff: data.share_staff,
        share_sites: data.share_sites,
        share_stock: data.share_stock,
        share_suppliers: data.share_suppliers,
        share_assets: data.share_assets,
        share_templates: data.share_templates,
      });
    } catch (err: any) {
      console.error("Error loading settings:", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const updateCompanySettings = async (companyId: string, newSettings: Partial<CompanySettings>) => {
    try {
      const { error } = await supabase
        .from("company_settings")
        .update(newSettings)
        .eq("company_id", companyId);

      if (error) throw error;

      setSettings({ ...settings!, ...newSettings });
      setSuccess("Settings updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error updating settings:", err);
      setError(err.message || "Failed to update settings");
    }
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !companyName.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Create the new company
      const { data: newCompany, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: companyName.trim(),
          created_by: profile.id,
          parent_company_id: linkToParent && parentCompanyId ? parentCompanyId : null,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // 2. Link the user to the new company via user_companies
      const { error: linkError } = await supabase
        .from("user_companies")
        .insert({
          profile_id: profile.id,
          company_id: newCompany.id,
          app_role: "Owner",
          is_primary: false,
        });

      if (linkError) throw linkError;

      // 3. Create default settings for the new company
      await supabase
        .from("company_settings")
        .insert({
          company_id: newCompany.id,
          share_staff: true,
          share_sites: false,
          share_stock: true,
          share_suppliers: true,
          share_assets: true,
          share_templates: true,
        });

      setSuccess(`Company "${companyName}" created successfully!`);
      setCompanyName("");
      setLinkToParent(false);
      setParentCompanyId("");

      await loadUserCompanies();
    } catch (err: any) {
      console.error("Error creating company:", err);
      setError(err.message || "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (companyId: string) => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ company_id: companyId })
        .eq("id", profile.id);

      if (error) throw error;

      setSuccess("Primary company updated!");
      await loadUserCompanies();

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error("Error setting primary company:", err);
      setError(err.message || "Failed to set primary company");
    }
  };

  const parentCompanies = companies.filter(uc => {
    const company = Array.isArray(uc.companies) ? uc.companies[0] : uc.companies;
    return company && !company.parent_company_id;
  });

  // Check if user has Owner/Admin role
  const canManageCompanies = profile?.app_role === 'Owner' || profile?.app_role === 'Admin';

  if (!canManageCompanies) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-6 text-red-600 dark:text-red-400">
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p>You must be an Owner or Admin to manage companies.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-[#D37E91]" />
          <h1 className="text-2xl font-bold text-theme-primary">Manage Companies & Brands</h1>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#D37E91] text-[#D37E91] rounded-lg hover:shadow-module-glow transition-all duration-200 ease-in-out"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Global Messages */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Companies List */}
        <div className="space-y-6">
          {/* Current Companies */}
          <div className="bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.12] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-theme-primary mb-4">Your Companies</h2>

            {loadingCompanies ? (
              <p className="text-theme-tertiary">Loading...</p>
            ) : companies.length === 0 ? (
              <p className="text-theme-tertiary">No companies found.</p>
            ) : (
              <div className="space-y-2">
                {companies.map((uc) => {
                  const company = Array.isArray(uc.companies) ? uc.companies[0] : uc.companies;
                  const isParent = company && !company.parent_company_id;

                  return (
                    <div
                      key={uc.id}
                      className="flex items-center justify-between p-4 bg-white dark:bg-white/[0.04] border border-theme rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Building2 className={`w-5 h-5 ${isParent ? 'text-[#D37E91] dark:text-[#D37E91]' : 'text-blue-500 dark:text-blue-400'}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-theme-primary font-medium">{company?.name}</span>
                            {uc.is_primary && (
                              <span className="px-2 py-0.5 bg-[#D37E91]/25 text-[#D37E91] dark:text-[#D37E91] text-xs rounded">
                                Primary
                              </span>
                            )}
                            {company?.parent_company_id && (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded flex items-center gap-1">
                                <Link2 className="w-3 h-3" />
                                Brand
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-theme-tertiary">{uc.app_role}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {(uc.app_role === 'Owner' || uc.app_role === 'Admin') && (
                          <button
                            onClick={() => {
                              setSelectedCompanyForSettings(company.id);
                              loadCompanySettings(company.id);
                            }}
                            className="p-2 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.12] border border-gray-200 dark:border-white/[0.12] text-theme-secondary rounded transition-colors"
                            title="Manage sharing settings"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        )}

                        {!uc.is_primary && (
                          <button
                            onClick={() => handleSetPrimary(company.id)}
                            className="px-3 py-1.5 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.12] border border-gray-200 dark:border-white/[0.12] text-theme-secondary text-sm rounded transition-colors whitespace-nowrap"
                          >
                            Set Primary
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add New Company */}
          <div className="bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.12] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-theme-primary mb-4">Add New Company</h2>

            <form onSubmit={handleAddCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Company/Brand Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Okja UK Ltd"
                  className="w-full px-4 py-2 bg-white dark:bg-white/[0.06] border border-gray-300 dark:border-white/[0.12] rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50"
                  required
                />
              </div>

              {parentCompanies.length > 0 && (
                <div>
                  <label className="flex items-center gap-2 text-sm text-theme-secondary mb-2">
                    <input
                      type="checkbox"
                      checked={linkToParent}
                      onChange={(e) => setLinkToParent(e.target.checked)}
                      className="rounded border-gray-300 dark:border-neutral-600 bg-theme-button text-[#D37E91] focus:ring-[#D37E91]"
                    />
                    Link to parent company (share resources)
                  </label>

                  {linkToParent && (
                    <select
                      value={parentCompanyId}
                      onChange={(e) => setParentCompanyId(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-white/[0.06] border border-gray-300 dark:border-white/[0.12] rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50"
                      required={linkToParent}
                    >
                      <option value="">Select parent company...</option>
                      {parentCompanies.map((uc) => {
                        const company = Array.isArray(uc.companies) ? uc.companies[0] : uc.companies;
                        return (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-[#D37E91] hover:bg-[#D37E91] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full justify-center"
              >
                <Plus className="w-4 h-4" />
                {loading ? "Creating..." : "Add Company"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Resource Sharing Settings */}
        <div className="bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.12] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-theme-primary mb-4">Resource Sharing Settings</h2>

          {!selectedCompanyForSettings ? (
            <div className="text-center py-12">
              <Settings className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-theme-tertiary">
                Select a company from the left to manage its resource sharing settings
              </p>
            </div>
          ) : loadingSettings ? (
            <p className="text-theme-tertiary">Loading settings...</p>
          ) : settings ? (
            <div className="space-y-4">
              <p className="text-sm text-theme-tertiary mb-4">
                Control which resources are shared with linked brands/companies in the same group.
              </p>

              <div className="space-y-3">
                {[
                  { key: 'share_staff', label: 'Staff & Team Members', icon: Users },
                  { key: 'share_sites', label: 'Sites & Locations', icon: Building2 },
                  { key: 'share_stock', label: 'Stock & Inventory', icon: Building2 },
                  { key: 'share_suppliers', label: 'Suppliers & Invoicing', icon: Building2 },
                  { key: 'share_assets', label: 'Assets & Equipment', icon: Building2 },
                  { key: 'share_templates', label: 'Templates & Checklists', icon: Building2 },
                ].map(({ key, label, icon: Icon }) => (
                  <label
                    key={key}
                    className="flex items-center justify-between p-3 bg-white dark:bg-white/[0.04] border border-theme rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
 <Icon className="w-5 h-5 text-theme-tertiary"/>
                      <span className="text-theme-primary">{label}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings[key as keyof CompanySettings]}
                      onChange={(e) => {
                        updateCompanySettings(selectedCompanyForSettings, {
                          [key]: e.target.checked
                        });
                      }}
                      className="rounded border-gray-300 dark:border-neutral-600 bg-theme-button text-[#D37E91] focus:ring-[#D37E91]"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/[0.12]">
                <p className="text-xs text-theme-tertiary">
                  <strong>Note:</strong> Only resources with sharing enabled will be visible across linked brands.
                  Turn off sharing for resources that should remain company-specific.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-6">
        <h3 className="text-theme-primary font-semibold mb-2">How Multi-Company Works</h3>
        <ul className="text-sm text-theme-secondary space-y-2">
          <li>• <strong>Primary Company:</strong> The default company shown when you log in</li>
          <li>• <strong>Switch Companies:</strong> Use the company selector in the header to switch between companies</li>
          <li>• <strong>Parent Companies:</strong> Can have multiple brands linked to them for resource sharing</li>
          <li>• <strong>Linked Brands:</strong> Share selected resources with their parent company (e.g., staff, stock, suppliers)</li>
          <li>• <strong>Resource Control:</strong> Each company can control which resources are shared using the settings panel</li>
        </ul>
      </div>
    </div>
  );
}