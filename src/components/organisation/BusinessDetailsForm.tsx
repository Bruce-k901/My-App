"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  name?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  [key: string]: any;
};

export default function BusinessDetailsForm({ onSaved }: { onSaved?: () => void }) {
  const { companyId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!companyId) return;
      try {
        // Always use API route to bypass RLS
        let data = null;
        let error = null;
        
        try {
          const response = await fetch(`/api/company/get?id=${companyId}`);
          if (response.ok) {
            data = await response.json();
            error = null;
          } else {
            error = new Error(`Failed to fetch company: ${response.status}`);
          }
        } catch (apiError) {
          console.error('API route error:', apiError);
          error = apiError;
        }
        
        if (error) throw error;
        setCompany((data || null) as Company | null);
      } catch (e: any) {
        setError(e?.message || "Failed to load company details");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId]);

  const save = async () => {
    if (!company || !companyId) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<Company> = {
        name: company.name ?? null,
        contact_name: company.contact_name ?? null,
        email: company.email ?? null,
        phone: company.phone ?? null,
        address: company.address ?? null,
      };
      // Update via API route to bypass RLS
      const response = await fetch("/api/company/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: companyId,
          ...payload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update company");
      }
      if (onSaved) onSaved();
    } catch (e: any) {
      setError(e?.message || "Failed to save company details");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-slate-400">Loading business details…</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!company) return <div className="text-slate-400">No company record found.</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-300">Company Name</span>
          <input
            className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
            value={company.name || ""}
            onChange={(e) => setCompany({ ...company, name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-300">Contact Name</span>
          <input
            className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
            value={company.contact_name || ""}
            onChange={(e) => setCompany({ ...company, contact_name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-300">Email</span>
          <input
            className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
            value={company.email || ""}
            onChange={(e) => setCompany({ ...company, email: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-300">Phone</span>
          <input
            className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
            value={company.phone || ""}
            onChange={(e) => setCompany({ ...company, phone: e.target.value })}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-300">Address</span>
        <textarea
          className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
          rows={3}
          value={company.address || ""}
          onChange={(e) => setCompany({ ...company, address: e.target.value })}
        />
      </label>

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12]"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={async () => { await save(); }}
          disabled={saving}
          className="px-4 py-2 rounded bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12]"
        >
          {saving ? "Saving…" : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}