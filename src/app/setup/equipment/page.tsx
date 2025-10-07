"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SetupLayout from "@/components/setup/SetupLayout";
import { AppContextProvider, useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { mapCsvRows, EQUIPMENT_HEADER_MAP } from "@/lib/csv";

type Site = { id: string; name: string };

type Asset = {
  id?: string;
  company_id: string;
  site_id: string;
  name: string;
  type: string;
  serial_no?: string | null;
  service_interval: number;
  last_service_date?: string | null;
  supplier?: string | null;
  warranty_expiry?: string | null;
  certificate_url?: string | null;
  next_due?: string | null; // from maintenance_logs
  status?: string | null; // from maintenance_logs
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d?: string | Date | null) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}

function dueColor(nextDue?: string | null) {
  if (!nextDue) return "#6b7280"; // gray
  const nd = new Date(nextDue).getTime();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (nd < now) return "#ef4444"; // red
  if (nd < now + sevenDays) return "#f59e0b"; // amber
  return "#22c55e"; // green
}

function EquipmentContent() {
  const router = useRouter();
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  const [sites, setSites] = useState<Site[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);

  const canFinish = useMemo(() => {
    if (sites.length === 0) return false;
    // Require at least one asset per site
    const bySite = new Map<string, number>();
    for (const s of sites) bySite.set(s.id, 0);
    for (const a of assets) bySite.set(a.site_id, (bySite.get(a.site_id) || 0) + 1);
    for (const s of sites) {
      if ((bySite.get(s.id) || 0) < 1) return false;
    }
    return true;
  }, [sites, assets]);

  async function load() {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data: siteRows, error: siteErr } = await supabase
        .from("sites")
        .select("id, name")
        .eq("company_id", companyId);
      if (siteErr) throw siteErr;
      const siteIds = (siteRows ?? []).map((s: any) => s.id);
      setSites(siteRows ?? []);

      let assetRows: Asset[] = [];
      if (siteIds.length > 0) {
        const { data: aRows, error: aErr } = await supabase
          .from("assets")
          .select("id, company_id, site_id, name, type, serial_no, service_interval, last_service_date, supplier, warranty_expiry, certificate_url")
          .in("site_id", siteIds);
        if (aErr) throw aErr;
        assetRows = (aRows ?? []) as any;

        const assetIds = assetRows.map((a) => a.id).filter(Boolean);
        if (assetIds.length > 0) {
          const { data: logs, error: logErr } = await supabase
            .from("maintenance_logs")
            .select("asset_id, next_due, status")
            .in("asset_id", assetIds);
          if (logErr) throw logErr;
          const byAsset = new Map<string, { next_due: string; status: string | null }>();
          for (const l of logs ?? []) {
            // Prefer scheduled status for display
            const key = String(l.asset_id);
            const existing = byAsset.get(key);
            if (!existing || (l.status === "scheduled" && existing.status !== "scheduled")) {
              byAsset.set(key, { next_due: l.next_due, status: l.status ?? null });
            }
          }
          assetRows = assetRows.map((a) => ({ ...a, next_due: byAsset.get(String(a.id))?.next_due ?? null, status: byAsset.get(String(a.id))?.status ?? null }));
        }
      }
      setAssets(assetRows);
    } catch (e: any) {
      showToast({ title: "Load failed", description: e?.message || "Failed to load equipment", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function finishSetup() {
    if (!companyId || !canFinish) return;
    try {
      const { error } = await supabase
        .from("companies")
        .update({ setup_status: "active" })
        .eq("id", companyId);
      if (error) throw error;
      showToast({ title: "Setup complete", description: "You’re all set — redirecting to dashboard.", type: "success" });
      router.push("/dashboard");
    } catch (e: any) {
      showToast({ title: "Could not finish", description: e?.message || "Failed to finalize setup", type: "error" });
    }
  }

  return (
    <SetupLayout stepLabel="Step 5 of 5">
      <div style={{ marginBottom: 12 }}>
        <p className="text-slate-300 text-sm">List all equipment that needs maintenance, service or temperature checks.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <EquipmentForm companyId={companyId!} sites={sites} onAdded={load} />
          <CSVImporter companyId={companyId!} sites={sites} onAdded={load} />
        </div>
      </div>

      <EquipmentList companyId={companyId!} sites={sites} assets={assets} onChanged={load} loading={loading} />

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
        <button onClick={() => router.push("/setup/checklists")} style={{ padding: "8px 14px", borderRadius: 8, background: "#e5e7eb", color: "#111827" }}>Back</button>
        <button onClick={finishSetup} disabled={!canFinish} style={{ padding: "8px 14px", borderRadius: 8, background: !canFinish ? "#9ca3af" : "#2563eb", color: "white", opacity: !canFinish ? 0.7 : 1 }}>Finish Setup</button>
      </div>
    </SetupLayout>
  );
}

function EquipmentForm({ companyId, sites, onAdded }: { companyId: string; sites: Site[]; onAdded: () => void }) {
  const { showToast } = useToast();
  const [siteId, setSiteId] = useState<string>(sites[0]?.id || "");
  const [name, setName] = useState("");
  const [type, setType] = useState("Fridge");
  const [serialNo, setSerialNo] = useState("");
  const [serviceInterval, setServiceInterval] = useState<number>(180);
  const [lastServiceDate, setLastServiceDate] = useState<string>("");
  const [supplier, setSupplier] = useState("");
  const [warrantyExpiry, setWarrantyExpiry] = useState<string>("");
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sites.length && !siteId) setSiteId(sites[0].id);
  }, [sites, siteId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !siteId || !name || !type || !serviceInterval) {
      showToast({ title: "Missing fields", description: "Please fill required fields.", type: "error" });
      return;
    }
    setSaving(true);
    try {
      const { data: newAsset, error } = await supabase
        .from("assets")
        .insert({
          company_id: companyId,
          site_id: siteId,
          name,
          type,
          serial_no: serialNo || null,
          service_interval: serviceInterval,
          last_service_date: lastServiceDate || null,
          supplier: supplier || null,
          warranty_expiry: warrantyExpiry || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Upload certificate after insert, using assetId in the path, and update asset with public URL
      if (certificateFile && newAsset?.id) {
        const filePath = `certificates/${companyId}/${siteId}/${newAsset.id}/${certificateFile.name}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("certificates")
          .upload(filePath, certificateFile, { upsert: true });
        if (!uploadErr) {
          const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${filePath}`;
          await supabase.from("assets").update({ certificate_url: publicUrl }).eq("id", newAsset.id);
        }
      }

      const baseDate = lastServiceDate ? new Date(lastServiceDate) : new Date();
      const nextDue = addDays(baseDate, serviceInterval);
      const { error: logErr } = await supabase.from("maintenance_logs").insert({
        company_id: companyId,
        site_id: siteId,
        asset_id: newAsset.id,
        next_due: formatDate(nextDue),
        status: "scheduled",
      });
      if (logErr) throw logErr;

      showToast({ title: "Equipment added", description: `First service scheduled for ${formatDate(nextDue)}.`, type: "success" });
      setName("");
      setSerialNo("");
      setSupplier("");
      setWarrantyExpiry("");
      setCertificateFile(null);
      onAdded();
    } catch (e: any) {
      showToast({ title: "Add failed", description: e?.message || "Failed to add equipment", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
      <select value={siteId} onChange={(e) => setSiteId(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #1f2937" }}>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Equipment Name" style={{ padding: 8, borderRadius: 8, border: "1px solid #1f2937", width: 220 }} />
      <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #1f2937" }}>
        {["Fridge", "Freezer", "Oven", "Dishwasher", "Mixer", "Grill", "Fryer"].map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <input value={serialNo} onChange={(e) => setSerialNo(e.target.value)} placeholder="Serial Number" style={{ padding: 8, borderRadius: 8, border: "1px solid #1f2937" }} />
      <input type="number" value={serviceInterval} onChange={(e) => setServiceInterval(Number(e.target.value))} placeholder="Service Interval (days)" style={{ padding: 8, borderRadius: 8, border: "1px solid #1f2937", width: 180 }} />
      <input type="date" value={lastServiceDate} onChange={(e) => setLastServiceDate(e.target.value)} placeholder="Last Service Date" style={{ padding: 8, borderRadius: 8, border: "1px solid #1f2937" }} />
      <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier" style={{ padding: 8, borderRadius: 8, border: "1px solid #1f2937" }} />
      <input type="date" value={warrantyExpiry} onChange={(e) => setWarrantyExpiry(e.target.value)} placeholder="Warranty Expiry" style={{ padding: 8, borderRadius: 8, border: "1px solid #1f2937" }} />
      <input type="file" onChange={(e) => setCertificateFile(e.target.files?.[0] || null)} />
      <button type="submit" disabled={saving} style={{ padding: "8px 14px", borderRadius: 8, background: saving ? "#9ca3af" : "#2563eb", color: "white" }}>Add Equipment</button>
    </form>
  );
}

function CSVImporter({ companyId, sites, onAdded }: { companyId: string; sites: Site[]; onAdded: () => void }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const rows = await mapCsvRows(text, EQUIPMENT_HEADER_MAP);
      // Map site name to id
      const nameToId = new Map(sites.map((s) => [s.name.toLowerCase(), s.id]));
      const payload = rows.map((r: any) => ({
        company_id: companyId,
        site_id: nameToId.get(String(r.site_id ?? r.site).toLowerCase()),
        name: r.name,
        type: r.type,
        serial_no: r.serial || null,
        service_interval: Number(r.service_interval_days ?? r.service_interval ?? 180),
        last_service_date: r.last_service_date ? String(r.last_service_date) : null,
        supplier: r.supplier || null,
        warranty_expiry: r.warranty_expiry ? String(r.warranty_expiry) : null,
      })).filter((p: any) => p.site_id && p.name && p.type);

      if (payload.length === 0) {
        showToast({ title: "No rows", description: "No valid equipment rows found.", type: "error" });
        return;
      }

      const { data: inserted, error } = await supabase.from("assets").insert(payload).select();
      if (error) throw error;

      for (const a of inserted ?? []) {
        const baseDate = a.last_service_date ? new Date(a.last_service_date) : new Date();
        const nextDue = addDays(baseDate, a.service_interval);
        const { error: logErr } = await supabase.from("maintenance_logs").insert({
          company_id: companyId,
          site_id: a.site_id,
          asset_id: a.id,
          next_due: formatDate(nextDue),
          status: "scheduled",
        });
        if (logErr) throw logErr;
      }

      showToast({ title: "Imported", description: `Added ${inserted?.length ?? 0} assets and scheduled services.`, type: "success" });
      onAdded();
    } catch (e: any) {
      showToast({ title: "Import failed", description: e?.message || "Failed to import CSV", type: "error" });
    } finally {
      setBusy(false);
      e.target.value = ""; // reset
    }
  }

  return (
    <div>
      <label style={{ fontSize: 12, color: "#9ca3af" }}>Import from spreadsheet</label>
      <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={busy} />
    </div>
  );
}

function EquipmentList({ companyId, sites, assets, onChanged, loading }: { companyId: string; sites: Site[]; assets: Asset[]; onChanged: () => void; loading: boolean }) {
  const { showToast } = useToast();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<Asset>>>({});

  function setDraft(id: string, patch: Partial<Asset>) {
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] || {}), ...patch } }));
  }

  async function saveRow(a: Asset) {
    if (!a.id) return;
    const id = String(a.id);
    const patch = drafts[id] || {};
    if (Object.keys(patch).length === 0) return;
    setSavingId(id);
    try {
      const { error } = await supabase.from("assets").update(patch).eq("id", id).eq("company_id", companyId);
      if (error) throw error;

      // If service interval or last service changed, update next_due
      const interval = patch.service_interval ?? a.service_interval;
      const baseDate = (patch.last_service_date as any) ?? a.last_service_date ?? null;
      if (interval && baseDate) {
        const nextDue = formatDate(addDays(new Date(baseDate as string), Number(interval)));
        const { data: existing, error: fetchErr } = await supabase
          .from("maintenance_logs")
          .select("id")
          .eq("asset_id", id)
          .eq("status", "scheduled")
          .limit(1)
          .single();
        if (!fetchErr && existing?.id) {
          await supabase.from("maintenance_logs").update({ next_due: nextDue }).eq("id", existing.id);
        } else {
          await supabase.from("maintenance_logs").insert({ company_id: companyId, site_id: a.site_id, asset_id: id, next_due: nextDue, status: "scheduled" });
        }
      }

      showToast({ title: "Updated", description: "Equipment updated", type: "success" });
      setDrafts((d) => ({ ...d, [id]: {} }));
      onChanged();
    } catch (e: any) {
      showToast({ title: "Update failed", description: e?.message || "Failed to update equipment", type: "error" });
    } finally {
      setSavingId(null);
    }
  }

  async function deleteRow(a: Asset) {
    if (!a.id) return;
    if (!confirm(`Delete equipment "${a.name}"?`)) return;
    try {
      await supabase.from("maintenance_logs").delete().eq("asset_id", a.id).eq("company_id", companyId);
      const { error } = await supabase.from("assets").delete().eq("id", a.id).eq("company_id", companyId);
      if (error) throw error;
      showToast({ title: "Deleted", description: "Equipment deleted", type: "success" });
      onChanged();
    } catch (e: any) {
      showToast({ title: "Delete failed", description: e?.message || "Failed to delete equipment", type: "error" });
    }
  }

  const siteById = useMemo(() => new Map(sites.map((s) => [s.id, s.name])), [sites]);

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ fontWeight: 600 }}>Equipment</h3>
        {loading && <span style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</span>}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#0f1220" }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Type</th>
              <th style={{ padding: 8 }}>Site</th>
              <th style={{ padding: 8 }}>Next Service</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => {
              const id = String(a.id);
              const d = drafts[id] || {};
              const next = d.last_service_date || a.last_service_date ? formatDate(addDays(new Date(String(d.last_service_date || a.last_service_date)), Number(d.service_interval ?? a.service_interval))) : a.next_due;
              return (
                <tr key={id} style={{ borderTop: "1px solid #1f2937" }}>
                  <td style={{ padding: 8 }}>
                    <input defaultValue={a.name} onChange={(e) => setDraft(id, { name: e.target.value })} style={{ padding: 6, borderRadius: 6, border: "1px solid #1f2937", width: 220 }} />
                  </td>
                  <td style={{ padding: 8 }}>
                    <select defaultValue={a.type} onChange={(e) => setDraft(id, { type: e.target.value })} style={{ padding: 6, borderRadius: 6, border: "1px solid #1f2937" }}>
                      {["Fridge", "Freezer", "Oven", "Dishwasher", "Mixer", "Grill", "Fryer"].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: 8 }}>
                    <select defaultValue={a.site_id} onChange={(e) => setDraft(id, { site_id: e.target.value as any })} style={{ padding: 6, borderRadius: 6, border: "1px solid #1f2937" }}>
                      {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: 8 }}>
                    <span style={{ padding: "4px 8px", borderRadius: 9999, background: dueColor(next), color: "white", fontSize: 12 }}>{next ? formatDate(next) : "—"}</span>
                  </td>
                  <td style={{ padding: 8 }}>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>{a.status ?? "scheduled"}</span>
                  </td>
                  <td style={{ padding: 8, display: "flex", gap: 8 }}>
                    <button onClick={() => saveRow(a)} disabled={savingId === id} style={{ padding: "6px 10px", borderRadius: 8, background: savingId === id ? "#9ca3af" : "#2563eb", color: "white" }}>Save</button>
                    <button onClick={() => deleteRow(a)} style={{ padding: "6px 10px", borderRadius: 8, background: "#ef4444", color: "white" }}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {assets.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: "#9ca3af", textAlign: "center" }}>No equipment yet. Add items or import via CSV.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EquipmentPage() {
  return (
    <AppContextProvider>
      <SetupLayout stepLabel="Step 5 of 5">
        <EquipmentContent />
      </SetupLayout>
    </AppContextProvider>
  );
}