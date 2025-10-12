"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

type Contractor = {
  id?: string;
  company_id: string;
  category: string;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  ooh?: string | null;
  address?: string | null;
  contract_start?: string | null;
  contract_expiry?: string | null;
  contract_file?: string | null;
  notes?: string | null;
};

function emptyContractor(companyId: string): Contractor {
  return {
    company_id: companyId,
    category: "",
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    ooh: "",
    address: "",
    contract_start: null,
    contract_expiry: null,
    contract_file: null,
    notes: "",
  };
}

export default function ContractorsTable() {
  const { companyId } = useAppContext();
  const [rows, setRows] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contractor | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!companyId) return;
      try {
        const { data, error } = await supabase
          .from("maintenance_contractors")
          .select("id, company_id, category, name, contact_name, email, phone, ooh, address, contract_start, contract_expiry, notes")
          .eq("company_id", companyId)
          .order("name");
        if (error) throw error;
        const ui = (data || []).map((row: any) => ({
          id: row.id,
          company_id: row.company_id,
          category: row.category || "",
          name: row.name || "",
          contact_name: row.contact_name || "",
          email: row.email || "",
          phone: row.phone || "",
          ooh: row.ooh || "",
          address: row.address || "",
          contract_start: row.contract_start || null,
          contract_expiry: row.contract_expiry || null,
          notes: row.notes || "",
        })) as Contractor[];
        console.log("Loaded contractors (table):", ui);
        setRows(ui);
      } catch (e: any) {
        console.warn("Primary contractor query failed, trying legacy columns:", e?.message);
        try {
          const { data: legacyData, error: legacyError } = await supabase
            .from("maintenance_contractors")
            .select("id, company_id, category, contractor_name, contact_name, email, phone, emergency_phone, address, contract_start, contract_expiry, notes")
            .eq("company_id", companyId)
            .order("contractor_name");
          if (legacyError) throw legacyError;
          const uiLegacy = (legacyData || []).map((row: any) => ({
            id: row.id,
            company_id: row.company_id,
            category: row.category || "",
            name: row.contractor_name || "",
            contact_name: row.contact_name || "",
            email: row.email || "",
            phone: row.phone || "",
            ooh: row.emergency_phone || "",
            address: row.address || "",
            contract_start: row.contract_start || null,
            contract_expiry: row.contract_expiry || null,
            notes: row.notes || "",
          })) as Contractor[];
          console.log("Loaded contractors (legacy table mapping):", uiLegacy);
          setRows(uiLegacy);
        } catch (legacyErr: any) {
          setError(legacyErr?.message || "Failed to load contractors");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId]);

  const openNew = () => {
    if (!companyId) return;
    setEditing(emptyContractor(companyId));
    setModalOpen(true);
  };

  const openEdit = (row: Contractor) => {
    setEditing({ ...row });
    setModalOpen(true);
  };

  const remove = async (row: Contractor) => {
    if (!row.id) return;
    try {
      await supabase.from("maintenance_contractors").delete().eq("id", row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e: any) {
      setError(e?.message || "Failed to delete contractor");
    }
  };

  const save = async () => {
    if (!editing || !companyId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        id: editing.id,
        company_id: companyId,
        category: editing.category,
        name: editing.name,
        contact_name: editing.contact_name || null,
        email: editing.email || null,
        phone: editing.phone || null,
        ooh: editing.ooh || null,
        address: editing.address || null,
        contract_start: editing.contract_start || null,
        contract_expiry: editing.contract_expiry || null,
        notes: editing.notes || null,
      } as any;
      let { data, error } = await supabase.from("maintenance_contractors").upsert(payload).select("*");
      if (error) {
        console.warn("Primary upsert failed, trying legacy payload:", error?.message);
        const legacyPayload = {
          id: editing.id,
          company_id: companyId,
          category: editing.category,
          contractor_name: editing.name,
          contact_name: editing.contact_name || null,
          email: editing.email || null,
          phone: editing.phone || null,
          emergency_phone: editing.ooh || null,
          address: editing.address || null,
          contract_start: editing.contract_start || null,
          contract_expiry: editing.contract_expiry || null,
          notes: editing.notes || null,
        } as any;
        const res2 = await supabase.from("maintenance_contractors").upsert(legacyPayload).select("*");
        data = res2.data;
        error = res2.error as any;
        if (error) throw error;
      }
      const saved = (data?.[0] || payload) as Contractor;
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      setModalOpen(false);
      setEditing(null);
    } catch (e: any) {
      setError(e?.message || "Failed to save contractor");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-slate-400">Loading contractors…</div>;
  return (
    <div className="space-y-3">
      {error && <div className="text-red-400">{error}</div>}
      <div className="flex justify-between items-center">
        <div className="text-slate-200">Maintenance Contractors</div>
        <button
          onClick={openNew}
          className="w-10 h-10 rounded-md bg-pink-500/20 border border-pink-500/40 text-pink-300 hover:bg-pink-500/30 flex items-center justify-center text-2xl font-semibold leading-none"
          aria-label="Add Contractor"
        >
          +
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-300">
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Expiry</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/[0.06]">
                <td className="px-3 py-2 text-white/90">{r.category}</td>
                <td className="px-3 py-2 text-white">{r.name}</td>
                <td className="px-3 py-2 text-slate-300">{r.contact_name || "—"}</td>
                <td className="px-3 py-2 text-slate-300">{r.email || "—"}</td>
                <td className="px-3 py-2 text-slate-300">{r.phone || "—"}</td>
                <td className="px-3 py-2 text-slate-300">{r.contract_expiry || "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(r)}
                      className="px-2 py-1 rounded bg-white/[0.08] border border-white/[0.12] text-white hover:bg-white/[0.14]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(r)}
                      className="px-2 py-1 rounded bg-red-500/80 border border-red-400/40 text-white hover:bg-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-slate-400" colSpan={7}>No contractors added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && editing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-2xl rounded-xl bg-[#0f1220] border border-white/[0.08] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-white font-semibold">{editing.id ? "Edit Contractor" : "Add Contractor"}</div>
              <button onClick={() => setModalOpen(false)} className="text-slate-300 hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-300">Category</span>
                <input className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-300">Name</span>
                <input className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-300">Contact Name</span>
                <input className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white" value={editing.contact_name || ""} onChange={(e) => setEditing({ ...editing, contact_name: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-300">Email</span>
                <input className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-300">Phone</span>
                <input className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white" value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-300">OOH Contact</span>
                <input className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white" value={editing.ooh || ""} onChange={(e) => setEditing({ ...editing, ooh: e.target.value })} />
              </label>
              <label className="md:col-span-2 flex flex-col gap-1">
                <span className="text-sm text-slate-300">Address</span>
                <textarea className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white" rows={2} value={editing.address || ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-300">Contract Start</span>
                <input type="date" className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white" value={editing.contract_start || ""} onChange={(e) => setEditing({ ...editing, contract_start: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-300">Contract Expiry</span>
                <input type="date" className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white" value={editing.contract_expiry || ""} onChange={(e) => setEditing({ ...editing, contract_expiry: e.target.value })} />
              </label>
              <label className="md:col-span-2 flex flex-col gap-1">
                <span className="text-sm text-slate-300">Notes</span>
                <textarea className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white" rows={3} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </label>
            </div>
            <div className="mt-4 flex gap-3 justify-end">
              <button onClick={() => setModalOpen(false)} className="px-3 py-2 rounded bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12]">Cancel</button>
              <button onClick={save} disabled={saving} className="px-3 py-2 rounded bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12]">{saving ? "Saving…" : "Save"}</button>
              <button onClick={save} disabled={saving} className="px-3 py-2 rounded bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12]">{saving ? "Saving…" : "Save & Continue"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}