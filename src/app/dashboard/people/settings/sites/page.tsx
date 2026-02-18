'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import SiteFormNew from '@/components/sites/SiteFormNew';
import SiteToolbar from '@/components/sites/SiteToolbar';
import SiteCard from '@/components/sites/SiteCard';
import { Button } from '@/components/ui/Button';
import { Building2, ArrowLeft, Download, Plus, Upload } from '@/components/ui/icons';
import Link from 'next/link';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface Site {
  id: string;
  name: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postcode?: string | null;
  gm_user_id?: string | null;
  gm_name?: string | null;
  gm_phone?: string | null;
  gm_email?: string | null;
  region?: string | null;
  status?: string | null;
  company_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  operating_schedule?: any;
  planned_closures?: Array<{
    id: string;
    is_active: boolean;
    closure_start: string;
    closure_end: string;
    notes: string | null;
  }>;
  gm_profile?: {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string | null;
  } | null;
}

export default function SettingsSitesPage() {
  const { loading: ctxLoading, profile, companyId } = useAppContext();
  
  // State hooks
  const [sites, setSites] = useState<Site[]>([]);
  const [gmList, setGmList] = useState<Array<{id: string, full_name: string, email: string, phone?: string | null}>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [activeSite, setActiveSite] = useState<Site | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loadingImport, setLoadingImport] = useState(false);

  const fetchGMList = useCallback(async () => {
    if (!companyId) return;

    try {
      // Fetch all GMs for the company from profiles table
      const { data: gmsData, error: gmsError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone_number')
        .eq('company_id', companyId)
        .eq('app_role', 'Manager')
        .order('full_name');

      if (gmsError) {
        console.error('Error fetching GM list:', gmsError);
        return;
      }

      // Transform the data to match expected format
      const transformedGMs = (gmsData || []).map(gm => ({
        id: gm.id,
        full_name: gm.full_name,
        email: gm.email,
        phone: gm.phone_number
      }));

      setGmList(transformedGMs);
    } catch (err: any) {
      console.error('Error in fetchGMList:', err);
    }
  }, [companyId]);

  const fetchSites = useCallback(async () => {
    if (!companyId) {
      console.warn('⚠️ Cannot fetch sites: no companyId in context');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📡 Fetching sites for company:', companyId);
      
      // First, fetch sites with planned closures (no GM profile join)
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select(`
          id,
          name,
          address_line1,
          address_line2,
          city,
          postcode,
          gm_user_id,
          region,
          status,
          company_id,
          created_at,
          updated_at,
          operating_schedule,
          planned_closures:site_closures (
            id,
            is_active,
            closure_start,
            closure_end,
            notes
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (sitesError) {
        console.error('❌ Error fetching sites:', sitesError);
        const errorMessage = sitesError.message || sitesError.code || 'Failed to load sites';
        setError(`Failed to load sites: ${errorMessage}`);
        setSites([]);
        setLoading(false);
        return;
      }
      
      console.log('✅ Sites fetched:', sitesData?.length || 0);
      
      if (!sitesData) {
        setSites([]);
        setLoading(false);
        return;
      }

      // Then fetch GM data separately from gm_index
      const gmIds = sitesData?.map(s => s.gm_user_id).filter(Boolean) || [];
      let gmMap = new Map();

      if (gmIds.length > 0) {
        const { data: gmData, error: gmError } = await supabase
          .from('gm_index')
          .select('id, full_name, email, phone')
          .in('id', gmIds);

        if (!gmError && gmData) {
          gmMap = new Map(gmData.map(gm => [gm.id, gm]));
        }
      }

      // Enrich sites with GM data
      const enrichedSites = sitesData.map(site => ({
        ...site,
        gm_profile: site.gm_user_id ? gmMap.get(site.gm_user_id) || null : null,
        gm_name: site.gm_user_id ? gmMap.get(site.gm_user_id)?.full_name || null : null,
        gm_email: site.gm_user_id ? gmMap.get(site.gm_user_id)?.email || null : null,
        gm_phone: site.gm_user_id ? gmMap.get(site.gm_user_id)?.phone || null : null,
      }));

      setSites(enrichedSites);
    } catch (err: any) {
      console.error('Error fetching sites:', err);
      setError(err?.message || 'Failed to load sites');
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Load data on mount
  useEffect(() => {
    if (ctxLoading) return;

    if (companyId) {
      fetchSites();
      fetchGMList();
    } else {
      setError('No company context detected. Please sign in or complete setup.');
    }
  }, [ctxLoading, companyId, fetchSites, fetchGMList]);

  const handleImportFromSites = async () => {
    if (!companyId) {
      toast.error('No company ID found');
      return;
    }

    setLoadingImport(true);
    try {
      // Fetch all sites from the main sites page
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('*')
        .eq('company_id', companyId);

      if (sitesError) {
        throw sitesError;
      }

      // Refresh the list (sites are already in the database, just refresh)
      await fetchSites();
      toast.success(`Loaded ${sitesData?.length || 0} sites`);
    } catch (error: any) {
      console.error('Error importing sites:', error);
      toast.error(`Failed to import: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingImport(false);
    }
  };

  const handleSaved = async () => {
    setFormOpen(false);
    setEditing(null);
    setActiveSite(null);
    await fetchSites();
    await fetchGMList();
  };

  // Filter sites based on search term
  const filteredSites = sites.filter(site => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      site.name?.toLowerCase().includes(searchLower) ||
      site.address_line1?.toLowerCase().includes(searchLower) ||
      site.city?.toLowerCase().includes(searchLower) ||
      site.postcode?.toLowerCase().includes(searchLower) ||
      site.gm_name?.toLowerCase().includes(searchLower)
    );
  });

  if (ctxLoading) {
    return <div className="text-theme-tertiary">Loading context...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/people/settings"
          className="inline-flex items-center gap-2 text-sm text-theme-primary/60 hover:text-theme-primary mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-theme-primary mb-2 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Sites
            </h1>
            <p className="text-theme-tertiary">
              Manage your company locations and site-specific settings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleImportFromSites}
              disabled={loadingImport}
              loading={loadingImport}
              variant="outline"
              className="border-module-fg text-module-fg hover:bg-module-fg/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Refresh from Sites
            </Button>
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-md border border-module-fg text-module-fg hover:bg-module-fg/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:focus-visible:ring-blue-400/40"
              title="Add Site"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                try {
                  const fields = [
                    "name",
                    "address_line1",
                    "address_line2",
                    "city",
                    "postcode",
                    "gm_user_id",
                    "region","status","days_open","opening_time_from",
                    "opening_time_to","closing_time_from","closing_time_to"
                  ];

                  const rows = (sites || []).map((site: any) => {
                    const row: Record<string, any> = {};
                    for (const f of fields) {
                      row[f] = f === "days_open" && site?.days_open
                        ? JSON.stringify(site.days_open)
                        : site?.[f] ?? "";
                    }
                    return row;
                  });

                  const ws = XLSX.utils.json_to_sheet(rows, { header: fields });
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Sites");
                  const xlsxArray = XLSX.write(wb, { bookType: "xlsx", type: "array" });
                  const blob = new Blob([xlsxArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "sites_export.xlsx";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success('Sites exported successfully');
                } catch (e: any) {
                  console.error("Export failed:", e?.message || "Unable to export");
                  toast.error('Failed to export sites');
                }
              }}
              className="flex items-center justify-center w-10 h-10 rounded-md border border-white/12 bg-gray-100 dark:bg-white/[0.04] text-theme-secondary hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300/20 dark:focus-visible:ring-white/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
              title="Download CSV"
            >
              <Download className="w-5 h-5" />
            </button>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              id="site-upload-input"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: async ({ data }: any) => {
                      try {
                        if (!companyId) {
                          toast.error('No company ID found');
                          return;
                        }

                        const normalised = data.map((r: any) => ({ ...r, site_name: r.site_name || r.name || "" }));
                        const required = ["site_name","city"];
                        const valid = normalised.filter((r: any) => required.every(f => r[f] && String(r[f]).trim() !== ""));

                        const keyFor = (r: any) => (r.site_name && String(r.site_name).trim()) || (r.name && String(r.name).trim());
                        const deduped = Array.from(new Map(valid.map((r: any) => [keyFor(r), r])).values());
                        if (deduped.length === 0) {
                          toast.error('No valid rows found');
                          return;
                        }

                        const payload = deduped.map((r: any) => ({
                          name: r.site_name,
                          address_line1: r.address_line1 || "",
                          address_line2: r.address_line2 || "",
                          city: r.city,
                          postcode: r.postcode || "",
                          gm_user_id: r.gm_user_id || "",
                          region: r.region || "",
                          status: r.status?.trim() || "active",
                          days_open: typeof r.days_open === "string" ? JSON.parse(r.days_open || "null") : r.days_open || null,
                          opening_time_from: r.opening_time_from || null,
                          opening_time_to: r.opening_time_to || null,
                          yearly_closures: r.yearly_closures || null,
                          company_id: companyId,
                        }));

                        const { error } = await supabase.from("sites").insert(payload);
                        if (error) {
                          throw error;
                        }
                        toast.success(`Successfully imported ${deduped.length} sites`);
                        await fetchSites();
                      } catch (err: any) {
                        console.error("Upload failed:", err);
                        toast.error(`Upload failed: ${err.message || 'Unknown error'}`);
                      } finally {
                        if (e.target) (e.target as HTMLInputElement).value = "";
                      }
                    },
                    error: (err: any) => {
                      console.error("Upload failed:", err.message || "Parsing error");
                      toast.error('Failed to parse CSV file');
                    },
                  });
                } catch (err: any) {
                  toast.error('Failed to process file');
                }
              }}
            />
            <button
              onClick={() => document.getElementById('site-upload-input')?.click()}
              className="flex items-center justify-center w-10 h-10 rounded-md border border-white/12 bg-gray-100 dark:bg-white/[0.04] text-theme-secondary hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300/20 dark:focus-visible:ring-white/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
              title="Upload CSV"
            >
              <Upload className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search sites..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full px-4 py-2 bg-theme-surface ] border border-theme rounded-lg text-theme-primary placeholder-neutral-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl bg-gray-50 dark:bg-white/[0.06] border border-theme px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-theme-tertiary text-center py-8">Loading sites…</div>
      ) : filteredSites.length === 0 ? (
        <div className="text-center py-12">
          {searchTerm ? (
            <p className="text-theme-tertiary">No sites found matching "{searchTerm}".</p>
          ) : (
            <>
              <p className="text-theme-tertiary mb-4">No sites yet. Add one to get started.</p>
              <Button
                onClick={() => setFormOpen(true)}
                variant="secondary"
              >
                Add First Site
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {filteredSites.map((site) => (
            <SiteCard 
              key={site.id} 
              site={site} 
              onEdit={(site) => setActiveSite(site as Site)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Site Form */}
      {formOpen && (
        <SiteFormNew
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
          initial={editing || null}
          companyId={companyId || ''}
          gmList={gmList}
        />
      )}

      {/* Edit Site Form (when clicking edit on a card) */}
      {activeSite && (
        <SiteFormNew
          open={true}
          initial={activeSite}
          onClose={() => setActiveSite(null)}
          onSaved={() => {
            setActiveSite(null);
            fetchSites();
            fetchGMList();
          }}
          companyId={companyId || ''}
          gmList={gmList}
        />
      )}
    </div>
  );
}

