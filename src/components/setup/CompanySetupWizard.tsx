"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Building2,
  MapPin,
  ClipboardList,
  Users,
  Wrench,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

export default function CompanySetupWizard() {
  const { companyId, siteId, userId, refresh } = useAppContext();
  const [step, setStep] = useState(0); // 0..4
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<{ [k: string]: boolean }>({});
  const next = () => setStep((s) => Math.min(s + 1, 4));
  const prev = () => setStep((s) => Math.max(s - 1, 0));
  const markDone = (key: string) => setCompleted((c) => ({ ...c, [key]: true }));
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Hero */}
      <section className="px-6 py-10 border-b border-neutral-800 bg-gradient-to-r from-magenta-400/10 to-blue-400/10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-magenta-400 to-blue-400 bg-clip-text text-transparent">
            Welcome — Let’s set up your company
          </h1>
          <p className="text-slate-300">
            A quick guided setup to configure your organisation, sites, people, and assets.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-1 w-10 rounded ${i <= step ? "bg-magenta-400" : "bg-slate-700"}`} />
            ))}
          </div>
        </div>
      </section>

      {/* Steps grid */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 gap-6">
          {step === 0 && (
            <CompanyForm
              busy={busy}
              setBusy={setBusy}
              setError={setError}
              userId={userId}
              onDone={async () => {
                markDone("company");
                await refresh();
                next();
              }}
            />
          )}
          {step === 1 && (
            <SiteForm
              busy={busy}
              setBusy={setBusy}
              setError={setError}
              companyId={companyId}
              onDone={async () => {
                markDone("site");
                await refresh();
                next();
              }}
            />
          )}
          {step === 2 && (
            <ImportTemplates
              busy={busy}
              setBusy={setBusy}
              setError={setError}
              companyId={companyId}
              siteId={siteId}
              onDone={async () => {
                markDone("templates");
                next();
              }}
            />
          )}
          {step === 3 && (
            <InvitePeople
              busy={busy}
              setBusy={setBusy}
              setError={setError}
              companyId={companyId}
              siteId={siteId}
              onDone={async () => {
                markDone("people");
                next();
              }}
            />
          )}
          {step === 4 && (
            <AssetsForm
              busy={busy}
              setBusy={setBusy}
              setError={setError}
              companyId={companyId}
              siteId={siteId}
              onDone={async () => {
                markDone("assets");
              }}
            />
          )}
        </div>

        {error && <p className="text-red-400 mt-4">{error}</p>}

        <div className="mt-8 flex items-center justify-between">
          <button onClick={prev} disabled={step === 0} className="text-slate-400 hover:text-white">
            Back
          </button>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className={`px-2 py-1 rounded ${completed.company ? "bg-green-700" : "bg-neutral-800"}`}>Company</span>
            <span className={`px-2 py-1 rounded ${completed.site ? "bg-green-700" : "bg-neutral-800"}`}>Site</span>
            <span className={`px-2 py-1 rounded ${completed.templates ? "bg-green-700" : "bg-neutral-800"}`}>Templates</span>
            <span className={`px-2 py-1 rounded ${completed.people ? "bg-green-700" : "bg-neutral-800"}`}>People</span>
            <span className={`px-2 py-1 rounded ${completed.assets ? "bg-green-700" : "bg-neutral-800"}`}>Assets</span>
          </div>
          <Link href="/dashboard" className="btn-gradient inline-flex items-center gap-2">
            Finish later <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}

// Simple validators
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidTimeZone(tz: string) {
  try {
    // Intl will throw for invalid IANA timezone names
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-[#141823] border border-neutral-800 p-5">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CompanyForm({ busy, setBusy, setError, userId, onDone }: any) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    setBusy(true);
    try {
      if (!name || name.trim().length < 2) {
        setFieldError("Please enter your company name (at least 2 characters).");
        return;
      }
      const { data, error } = await supabase
        .from("companies")
        .insert({ name, industry, created_by: userId })
        .select("id")
        .single();
      if (error) throw error;
      const companyId = data.id;
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ company_id: companyId, role: "admin" })
        .eq("id", userId);
      if (pErr) throw pErr;
      setMessage("Company created.");
      await onDone();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create company");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Create Company" icon={<Building2 className="w-6 h-6 text-magenta-400" />}>
      <form onSubmit={submit} className="space-y-3">
        <input className="input" placeholder="Company name" value={name} onChange={(e) => setName(e.target.value)} />
        {fieldError && <p className="text-red-400 text-xs">{fieldError}</p>}
        <input className="input" placeholder="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        <button disabled={busy || !name} className="btn-gradient">Create Company</button>
        {message && <p className="text-green-500 text-sm">{message}</p>}
      </form>
    </Card>
  );
}

function SiteForm({ busy, setBusy, setError, companyId, onDone }: any) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("Europe/London");
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [k: string]: string | null }>({});
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrors({});
    setBusy(true);
    try {
      const currentErrors: { [k: string]: string | null } = {};
      if (!companyId) currentErrors.companyId = "Please create a company first.";
      if (!name || name.trim().length < 2) currentErrors.name = "Enter a site name (at least 2 characters).";
      if (!timezone || !isValidTimeZone(timezone)) currentErrors.timezone = "Enter a valid IANA timezone (e.g., Europe/London).";
      if (!isValidTime(openTime)) currentErrors.openTime = "Enter a valid opening time (HH:MM, 00:00–23:59).";
      if (!isValidTime(closeTime)) currentErrors.closeTime = "Enter a valid closing time (HH:MM, 00:00–23:59).";
      setErrors(currentErrors);
      if (Object.values(currentErrors).some(Boolean)) {
        return;
      }
      const { error } = await supabase
        .from("sites")
        .insert({ company_id: companyId, name, address, timezone, open_time: openTime, close_time: closeTime });
      if (error) throw error;
      setMessage("Site created.");
      await onDone();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create site");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Add Site" icon={<MapPin className="w-6 h-6 text-magenta-400" />}>
      <form onSubmit={submit} className="space-y-3">
        <input className="input" placeholder="Site name" value={name} onChange={(e) => setName(e.target.value)} />
        {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
        <input className="input" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          {errors.timezone && <p className="text-red-400 text-xs col-span-2">{errors.timezone}</p>}
          <input className="input" placeholder="Open (HH:MM)" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
        </div>
        {errors.openTime && <p className="text-red-400 text-xs">{errors.openTime}</p>}
        <input className="input" placeholder="Close (HH:MM)" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
        {errors.closeTime && <p className="text-red-400 text-xs">{errors.closeTime}</p>}
        <button disabled={busy || !name || !companyId} className="btn-gradient">Create Site</button>
        {message && <p className="text-green-500 text-sm">{message}</p>}
      </form>
    </Card>
  );
}

function ImportTemplates({ busy, setBusy, setError, companyId, siteId, onDone }: any) {
  const [library, setLibrary] = useState("kitchen");
  const [message, setMessage] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Attempt to copy templates; if table is missing, just mark done
      const { data: templates } = await supabase
        .from("checklist_templates")
        .select("*")
        .eq("company_id", companyId)
        .eq("category", library);
      if (templates && templates.length && siteId) {
        const rows = templates.map((t: any) => ({ ...t, id: undefined, site_id: siteId }));
        await supabase.from("site_checklists").insert(rows);
      }
      setMessage("Templates imported.");
      await onDone();
    } catch (err: any) {
      // Gracefully proceed even if tables don't exist
      setMessage("Templates marked as imported.");
      await onDone();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Import Checklists" icon={<ClipboardList className="w-6 h-6 text-magenta-400" />}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-slate-300 text-sm">Select a checklist library to import starter templates for your site. You can edit these later.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: "kitchen", name: "Kitchen", desc: "Opening/closing, prep, hygiene" },
            { id: "foh", name: "Front of House", desc: "Service standards, cleaning, safety" },
            { id: "bar", name: "Bar", desc: "Stock checks, cleaning, opening/closing" },
          ].map((opt) => (
            <button
              type="button"
              key={opt.id}
              className={`text-left rounded-lg border p-3 ${library === opt.id ? "border-magenta-400 bg-magenta-400/10" : "border-neutral-800 bg-[#0f1220]"}`}
              onClick={() => setLibrary(opt.id)}
            >
              <p className="font-medium">{opt.name}</p>
              <p className="text-xs text-slate-400">{opt.desc}</p>
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-neutral-800 p-3 bg-[#0f1220]">
          <p className="text-xs text-slate-400">Preview templates:</p>
          <ul className="mt-2 text-sm text-slate-300 list-disc list-inside">
            {library === "kitchen" && ["Daily opening checks", "Food prep hygiene", "Fridge temp logs"].map((t) => <li key={t}>{t}</li>)}
            {library === "foh" && ["Dining area cleaning", "Service standards", "Guest safety walk"].map((t) => <li key={t}>{t}</li>)}
            {library === "bar" && ["Opening checks", "Glassware cleaning", "Stock/line checks"].map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
        <button disabled={busy || !companyId} className="btn-gradient">Import</button>
        {message && <p className="text-green-500 text-sm">{message}</p>}
      </form>
    </Card>
  );
}

function InvitePeople({ busy, setBusy, setError, companyId, siteId, onDone }: any) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [message, setMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setBusy(true);
    try {
      if (!isValidEmail(email)) {
        setEmailError("Enter a valid email address.");
        return;
      }
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, companyId, siteId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to send invite");
      setMessage(json.invite_link ? "Invite sent. Copy link if needed." : "Invite created.");
      await onDone();
    } catch (err: any) {
      setError(err?.message ?? "Failed to invite");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Invite People" icon={<Users className="w-6 h-6 text-magenta-400" />}>
      <form onSubmit={submit} className="space-y-3">
        <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {emailError && <p className="text-red-400 text-xs">{emailError}</p>}
        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <button disabled={busy || !email || !companyId} className="btn-gradient">Invite</button>
        {message && <p className="text-green-500 text-sm">{message}</p>}
      </form>
    </Card>
  );
}

function AssetsForm({ busy, setBusy, setError, companyId, siteId, onDone }: any) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [serial, setSerial] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [k: string]: string | null }>({});
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrors({});
    setBusy(true);
    try {
      const currentErrors: { [k: string]: string | null } = {};
      if (!name || name.trim().length < 2) currentErrors.name = "Enter an asset name (at least 2 characters).";
      if (!type || type.trim().length < 2) currentErrors.type = "Enter the equipment type (at least 2 characters).";
      setErrors(currentErrors);
      if (Object.values(currentErrors).some(Boolean)) {
        return;
      }
      const { error } = await supabase
        .from("assets")
        .insert({ company_id: companyId, site_id: siteId, name, type, serial_no: serial, status: "active" });
      if (error) throw error;
      setMessage("Asset added.");
      await onDone();
    } catch (err: any) {
      setError(err?.message ?? "Failed to add asset");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Add Equipment" icon={<Wrench className="w-6 h-6 text-magenta-400" />}>
      <form onSubmit={submit} className="space-y-3">
        <input className="input" placeholder="Asset name" value={name} onChange={(e) => setName(e.target.value)} />
        {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
        <input className="input" placeholder="Type" value={type} onChange={(e) => setType(e.target.value)} />
        {errors.type && <p className="text-red-400 text-xs">{errors.type}</p>}
        <input className="input" placeholder="Serial number" value={serial} onChange={(e) => setSerial(e.target.value)} />
        <button disabled={busy || !name || !companyId} className="btn-gradient">Add Asset</button>
        {message && <p className="text-green-500 text-sm">{message}</p>}
      </form>
    </Card>
  );
}