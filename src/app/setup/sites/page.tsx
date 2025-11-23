"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import SetupLayout from "@/components/setup/SetupLayout";
import { useToast } from "@/components/ui/ToastProvider";
import { getTimezones } from "@/lib/timezones";
import TimePicker from "@/components/ui/TimePicker";

export default function SitesSetupPage() {
  return (
    <AppProvider>
      <SitesContent />
    </AppProvider>
  );
}

function SitesContent() {
  const router = useRouter();
  const { companyId, refresh, role, siteId } = useAppContext();
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
        const loaded = data || [];
        setSites(role === "Admin" ? loaded : siteId ? loaded.filter((s: any) => s.id === siteId) : loaded);
      } catch {}
      try {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, email, company_id, site_id, app_role, position_title, boh_foh, last_login, pin_code")
          .eq("company_id", companyId);
        setManagers((profs || []).filter((p: any) => p.app_role === "Manager"));
      } catch {}
      setFormOpen(!sites || sites.length === 0);
    })();
  }, [companyId, role, siteId]);

  if (!companyId) {
    return (
      <SetupLayout>
        <div className="bg-[#14161d] border border-gray-800 rounded-2xl p-6 shadow-sm mt-4 text-center">
          <p className="text-slate-300 text-sm">Create your company first, then add sites.</p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <Link
              href="/setup/company"
              className="bg-gradient-to-r from-magenta-500 to-blue-500 text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition"
            >
              Create Company
            </Link>
            <Link href="#" className="text-gray-400 text-sm hover:text-gray-300 flex items-center space-x-1">
              <span>Finish later</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </SetupLayout>
    );
  }

  const submit = async (e: React.FormEvent, continueNext?: boolean) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      let siteId = editingId;
      const payload: any = {
        id: editingId ?? undefined,
        company_id: companyId,
        name,
        address,
        timezone,
        open_time: openTime,
        close_time: closeTime,
        manager_id: managerId,
        phone,
      };
      const { data: upsertData, error: upsertErr } = await supabase
        .from("sites")
        .upsert([payload], { onConflict: "id" })
        .select("id")
        .single();
      if (upsertErr) throw upsertErr;
      siteId = upsertData?.id ?? siteId;

      if (!editingId) {
        // Trigger edge function to create defaults
        try {
          await supabase.functions.invoke("create_site_defaults", { body: { site_id: siteId, company_id: companyId } });
        } catch {}
        // Patch setup_status on companies
        try {
          await supabase.from("companies").update({ setup_status: "sites_added" }).eq("id", companyId);
        } catch {}
        // Update subscription site count
        try {
          const { updateSubscriptionSiteCount } = await import("@/lib/subscriptions");
          await updateSubscriptionSiteCount(companyId);
        } catch (err) {
          console.error("Failed to update subscription site count:", err);
        }
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
      const loaded = sitesRes || [];
      setSites(role === "Admin" ? loaded : siteId ? loaded.filter((s: any) => s.id === siteId) : loaded);
      await refresh();
      if (continueNext) router.push("/setup/team");
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
      <h2 className="text-xl font-semibold mb-2 text-center">Add your sites</h2>
      <p className="text-slate-300 mb-6 text-center">Each site can have its own checklists, team, and equipment.</p>

      {role === "Admin" && (
        <div className="mb-4">
          <button className="btn-glass" onClick={() => setFormOpen((o) => !o)}>
            {formOpen ? "Hide Form" : "+ Add Site"}
          </button>
        </div>
      )}

      {role === "Admin" && formOpen && (
        <form onSubmit={(e) => submit(e)} className="space-y-3 rounded-lg border border-neutral-800 p-4 bg-[#0f1220]">
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
              <div>
                <label className="block text-xs text-slate-400 mb-1">Opening time</label>
                <TimePicker value={openTime} onChange={(value) => setOpenTime(value)} className="w-full" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Closing time</label>
                <TimePicker value={closeTime} onChange={(value) => setCloseTime(value)} className="w-full" />
              </div>
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
          <div className="flex gap-3">
            <button type="submit" disabled={busy || !name || !address} className="btn-gradient">{editingId ? "Update Site" : "Save"}</button>
            <button type="button" disabled={busy || !name || !address} className="btn-glass" onClick={(e) => submit(e as any, true)}>Save & Continue</button>
          </div>
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
                  <p className="text-xs text-slate-400">{s.address}</p>
                  <p className="text-xs text-slate-400">Status: {s.active === false ? "Inactive" : "Active"} • TZ: {s.timezone} • Open {s.open_time} → Close {s.close_time}</p>
                </div>
                {role === "Admin" && (
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
                        const loaded = sitesRes || [];
                        setSites(role === "Admin" ? loaded : siteId ? loaded.filter((x: any) => x.id === siteId) : loaded);
                      } catch {}
                    }}>Delete</button>
                  </div>
                )}
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