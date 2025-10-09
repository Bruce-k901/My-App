"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import SiteList from "@/components/sites/SiteList";
import SiteForm from "@/components/sites/SiteForm";

type Site = {
  id?: string;
  name: string;
  nickname?: string;
  address?: string;
  active: boolean;
  company_id?: string;
};

export default function SitesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes?.user?.id) throw new Error("No authenticated user");
      const uid = userRes.user.id;
      setUserId(uid);

      const { data: company, error: cErr } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", uid)
        .single();
      if (cErr || !company?.id) throw new Error("Company not found for owner");
      setCompanyId(company.id);

      const { data: siteRows, error: sErr } = await supabase
        .from("sites")
        .select("id, name, nickname, address, active, company_id")
        .eq("company_id", company.id)
        .order("name", { ascending: true });
      if (sErr) throw sErr;
      setSites(siteRows || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load sites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onAddNew = useCallback(() => {
    setEditing(null);
    setShowForm(true);
  }, []);

  const onEdit = useCallback((site: Site) => {
    setEditing(site);
    setShowForm(true);
  }, []);

  const onSaved = useCallback(() => {
    setShowForm(false);
    setEditing(null);
    fetchAll();
  }, [fetchAll]);

  const onCancel = useCallback(() => {
    setShowForm(false);
    setEditing(null);
  }, []);

  const onDelete = useCallback(async (site: Site) => {
    if (!site?.id) return;
    try {
      await supabase.from("sites").delete().eq("id", site.id);
      fetchAll();
    } catch (e) {
      // swallow error for now; could attach toast
    }
  }, [fetchAll]);

  const headerRight = useMemo(() => (
    <button
      onClick={onAddNew}
      className="px-4 py-2 rounded-md text-white border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-lg"
    >
      Add Site
    </button>
  ), [onAddNew]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Sites</h1>
        {headerRight}
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      {showForm && companyId && (
        <SiteForm site={editing || undefined} companyId={companyId} onSaved={onSaved} onCancel={onCancel} />
      )}

      {loading ? (
        <p className="text-slate-300">Loading sites...</p>
      ) : (
        <SiteList sites={sites} onEdit={onEdit} onDelete={onDelete} />
      )}
    </div>
  );
}