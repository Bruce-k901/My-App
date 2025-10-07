"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppContextProvider, useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import SetupLayout from "@/components/setup/SetupLayout";
import { useToast } from "@/components/ui/ToastProvider";
import { getTimezones } from "@/lib/timezones";

export default function SitesSetupPage() {
  return (
    <AppContextProvider>
      <SitesContent />
    </AppContextProvider>
  );
}

function SitesContent() {
  const { companyId, refresh } = useAppContext();
  const browserTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
    } catch {
      return "Europe/London";
    }
  }, []);
  const timezones = useMemo(() => getTimezones(), []);
  const [sites, setSites] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState(browserTz);
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [managerId, setManagerId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    (async () => {
      if (!companyId) return;
      try {
        const { data } = await supabase.from("sites").select("*").eq("company_id", companyId);
        setSites(data || []);
      } catch {}
      try {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,email,site_id,company_id,role")
          .eq("company_id", companyId);
        setManagers((profs || []).filter((p: any) => p.role === "manager"));
      } catch {}
      setFormOpen(!sites || sites.length === 0);
    })();
  }, [companyId]);

  if (!companyId) {
    return (
      <SetupLayout stepLabel="Step 2 of 5">
        <div className="text-slate-300">Create your company first, then add sites.</div>
        <Link href="/setup" className="btn-gradient mt-4 inline-block">Create Company</Link>
      </SetupLayout>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      let siteId = editingId;
      if (editingId) {
        const { error: upErr } = await supabase
          .from("sites")
          .update({ name, address, timezone, open_time: openTime, close_time: closeTime, manager_id: managerId, phone })
          .eq("id", editingId);
        if (upErr) throw upErr;
      } else {
        const { data, error } = await supabase
          .from("sites")
          .insert({ company_id: companyId, name, address, timezone, open_time: openTime, close_time: closeTime, manager_id: managerId, phone })
          .select("id")
          .single();
        if (error) throw error;
        siteId = data.id;
        // Trigger edge function to create defaults
        try {
          await supabase.functions.invoke("create_site_defaults", { body: { site_id: siteId, company_id: companyId } });
        } catch {}
        // Patch setup_status on companies
        try {
          await supabase.from("companies").update({ setup_status: "sites_added" }).eq("id", companyId);
        } catch {}
      }

      const successMsg = editingId ? "Site updated." : "Site created — defaults added.";
      setMessage(successMsg);
      showToast(successMsg, "success");
      setEditingId(null);
      setFormOpen(false);
      setName("");
      setAddress("");
      setTimezone(browserTz);
      setOpenTime("08:00");
      setCloseTime("22:00");
      setManagerId(null);
      setPhone("");
      const { data: sitesRes } = await supabase.from("sites").select("*").eq("company_id", companyId);
      setSites(sitesRes || []);
      await refresh();
    } catch (err: any) {
      const errMsg = err?.message ?? "Failed to create site";
      setError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SetupLayout stepLabel="Step 2 of 5">
      <h2 className="text-xl font-semibold mb-2">Add your sites</h2>
      <p className="text-slate-300 mb-6">Each site can have its own checklists, team, and equipment.</p>

      <div className="mb-4">
        <button className="btn-glass" onClick={() => setFormOpen((o) => !o)}>
          {formOpen ? "Hide Form" : "+ Add Site"}
        </button>
      </div>

      {formOpen && (
        <form onSubmit={submit} className="space-y-3 rounded-lg border border-neutral-800 p-4 bg-[#0f1220]">
          <input className="input" placeholder="Site name" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea className="input" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <input list="tz-list" className="input" placeholder="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
              <datalist id="tz-list">
                {[browserTz, ...timezones].filter((v, i, arr) => arr.indexOf(v) === i).map((tz) => (
                  <option key={tz} value={tz} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="input" type="time" placeholder="Opening time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
              <input className="input" type="time" placeholder="Closing time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select className="input" value={managerId ?? ""} onChange={(e) => setManagerId(e.target.value || null)}>
              <option value="">Assign Manager (optional)</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.email}</option>
              ))}
            </select>
            <input className="input" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button disabled={busy || !name || !address} className="btn-gradient">{editingId ? "Update Site" : "Save Site"}</button>
          {message && <p className="text-green-500 text-sm mt-2">{message}</p>}
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </form>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Your Sites</h3>
        {sites.length === 0 ? (
          <p className="text-slate-400 text-sm">No sites yet. Add your first site to continue.</p>
        ) : (
          <div className="space-y-2">
            {sites.map((s) => (
              <div key={s.id} className="rounded border border-neutral-800 p-3 bg-[#0f1220] flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-slate-400">TZ: {s.timezone} • Open {s.open_time} → Close {s.close_time}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-glass" onClick={() => {
                    setEditingId(s.id);
                    setFormOpen(true);
                    setName(s.name || "");
                    setAddress(s.address || "");
                    setTimezone(s.timezone || browserTz);
                    setOpenTime(s.open_time || "08:00");
                    setCloseTime(s.close_time || "22:00");
                    setManagerId(s.manager_id || null);
                    setPhone(s.phone || "");
                  }}>Edit</button>
                  <button className="btn-glass" onClick={async () => {
                    try {
                      await supabase.from("sites").delete().eq("id", s.id);
                      const { data: sitesRes } = await supabase.from("sites").select("*").eq("company_id", companyId);
                      setSites(sitesRes || []);
                    } catch {}
                  }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/setup" className="btn-glass">Back</Link>
        <Link href="/setup/team" className={`btn-gradient ${sites.length === 0 ? "opacity-50 pointer-events-none" : ""}`}>Next → Team</Link>
      </div>
    </SetupLayout>
  );
}