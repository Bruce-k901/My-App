"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const [canGoSites, setCanGoSites] = useState(false);
  const next = () => setStep((s) => Math.min(s + 1, 4));
  const prev = () => setStep((s) => Math.max(s - 1, 0));
  const markDone = (key: string) => setCompleted((c) => ({ ...c, [key]: true }));
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center w-full px-6 py-5 bg-gradient-to-r from-magenta-400/10 to-blue-400/10">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight leading-tight bg-gradient-to-r from-magenta-500 to-blue-500 text-transparent bg-clip-text">
            Welcome — Let’s set up your company
          </h1>
          <p className="text-base text-gray-300 mb-4 max-w-2xl leading-snug">
            A quick guided setup to configure your organisation, sites, people, and assets.
          </p>
          <div className="mt-2 flex items-center justify-center space-x-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-1 w-12 rounded-full ${i <= step ? "bg-magenta-500" : "bg-gray-700"}`} />
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
              onGateSites={(v: boolean) => setCanGoSites(v)}
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
          <button
            onClick={prev}
            disabled={step === 0}
            className="px-3 py-2 rounded-full border border-white/20 bg-transparent text-slate-300 hover:bg-gradient-to-r hover:from-magenta-500 hover:to-blue-500 hover:text-white transition-all duration-300"
          >
            Back
          </button>
          <Link
            href="/setup/sites"
            className={`px-3 py-2 rounded-full border border-white/20 bg-transparent text-slate-300 transition-all duration-300 inline-flex items-center gap-2 ${step === 0 && !canGoSites ? "opacity-50 pointer-events-none" : "hover:bg-gradient-to-r hover:from-magenta-500 hover:to-blue-500 hover:text-white"}`}
            aria-disabled={step === 0 && !canGoSites}
          >
            Sites <ArrowRight className="w-4 h-4" />
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

function CompanyForm({ busy, setBusy, setError, userId, onDone, onGateSites }: any) {
  const router = useRouter();
  const [company, setCompany] = useState({
    name: "",
    legal_name: "",
    vat_number: "",
    phone: "",
    website: "",
    company_number: "",
    country: "United Kingdom",
    contact_email: "",
    industry: "",
  });
  const [existingCompanyId, setExistingCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [savedOnce, setSavedOnce] = useState(false);

  const requiredComplete = [company.name, company.industry, company.country, company.contact_email, company.company_number].every(
    (v) => v && v.trim().length > 0
  );

  useEffect(() => {
    if (typeof onGateSites === "function") {
      onGateSites(savedOnce && requiredComplete);
    }
  }, [savedOnce, requiredComplete, onGateSites]);

  // Pre-populate company info if the user already has one
  useEffect(() => {
    const fetchCompany = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: existingCompany, error } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_id", user.id)
        .single();
      if (existingCompany) {
        console.log("Existing company found:", existingCompany);
        setExistingCompanyId(existingCompany.id);
        setCompany({
          name: existingCompany.name ?? "",
          legal_name: existingCompany.legal_name ?? "",
          vat_number: existingCompany.vat_number ?? "",
          phone: existingCompany.phone ?? "",
          website: existingCompany.website ?? "",
          company_number: existingCompany.company_number ?? "",
          country: existingCompany.country ?? "United Kingdom",
          contact_email: existingCompany.contact_email ?? "",
          industry: existingCompany.industry ?? "",
        });
        setSavedOnce(true);
        setMessage("Loaded existing company.");
      } else if (error && (error as any).code !== "PGRST116") {
        console.error("Error fetching company:", (error as any).message);
      }
      setLoading(false);
    };
    fetchCompany();
     
  }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSubmit(true);
  };
  const doSubmit = async (advance: boolean) => {
    setError(null);
    setFieldError(null);
    setBusy(true);
    try {
      if (!company.name || company.name.trim().length < 2) {
        setFieldError("Please enter your company name (at least 2 characters).");
        return;
      }
      if (!company.industry || company.industry.trim().length < 2) {
        setFieldError("Please select your industry.");
        return;
      }
      if (!company.country || company.country.trim().length < 2) {
        setFieldError("Please select your country.");
        return;
      }
      if (!company.contact_email || company.contact_email.trim().length < 5) {
        setFieldError("Please enter a contact email.");
        return;
      }
      if (!company.company_number || company.company_number.trim().length < 2) {
        setFieldError("Please enter your company number.");
        return;
      }
      // get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("No user logged in");

      // Upsert company for this user (insert or update by primary key)
      const payload: any = {
        id: existingCompanyId || undefined,
        owner_id: user.id,
        name: company.name.trim(),
        legal_name: (company.legal_name || "").trim() || null,
        vat_number: (company.vat_number || "").trim() || null,
        phone: (company.phone || "").trim() || null,
        website: (company.website || "").trim() || null,
        company_number: company.company_number.trim(),
        country: company.country.trim(),
        contact_email: company.contact_email.trim() || user.email,
        industry: company.industry.trim(),
      };

      const { error: upsertError } = await supabase
        .from("companies")
        .upsert(payload, { onConflict: "id" });
      if (upsertError) throw upsertError;
      setMessage("Company saved successfully.");
      setSavedOnce(true);
      if (advance) router.push("/setup/sites");
      else alert("Company saved successfully");
    } catch (err: any) {
      setError(err?.message ?? "Failed to save company");
      alert(`Save failed: ${err?.message}`);
    } finally {
      setBusy(false);
    }
  };
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto pt-16">
        <p className="text-slate-300">Loading…</p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 max-w-5xl mx-auto pt-16">
      {/* Company Name */}
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Company Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Enter company name"
          className="w-full bg-[#0f1119] border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:border-magenta-500 focus:outline-none"
          value={company.name}
          onChange={(e) => setCompany({ ...company, name: e.target.value })}
        />
      </div>

      {/* Industry Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Industry <span className="text-red-500">*</span>
        </label>
        <select
          className="w-full bg-[#0f1119] border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:border-magenta-500 focus:outline-none"
          value={company.industry}
          onChange={(e) => setCompany({ ...company, industry: e.target.value })}
        >
          <option value="" disabled>
            Select industry
          </option>
          <option>Hospitality</option>
          <option>Education</option>
          <option>Healthcare</option>
          <option>Retail</option>
          <option>Manufacturing</option>
          <option>Construction</option>
          <option>Technology</option>
          <option>Finance</option>
          <option>Public Sector</option>
          <option>Other</option>
        </select>
      </div>

      {/* Country Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Country <span className="text-red-500">*</span>
        </label>
        <select
          className="w-full bg-[#0f1119] border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:border-magenta-500 focus:outline-none"
          value={company.country}
          onChange={(e) => setCompany({ ...company, country: e.target.value })}
        >
          <option value="" disabled>
            Select country
          </option>
          <option>United Kingdom</option>
          <option>United States</option>
          <option>Austria</option>
          <option>Belgium</option>
          <option>Bulgaria</option>
          <option>Croatia</option>
          <option>Cyprus</option>
          <option>Czech Republic</option>
          <option>Denmark</option>
          <option>Estonia</option>
          <option>Finland</option>
          <option>France</option>
          <option>Germany</option>
          <option>Greece</option>
          <option>Hungary</option>
          <option>Iceland</option>
          <option>Ireland</option>
          <option>Italy</option>
          <option>Latvia</option>
          <option>Lithuania</option>
          <option>Luxembourg</option>
          <option>Malta</option>
          <option>Netherlands</option>
          <option>Norway</option>
          <option>Poland</option>
          <option>Portugal</option>
          <option>Romania</option>
          <option>Slovakia</option>
          <option>Slovenia</option>
          <option>Spain</option>
          <option>Sweden</option>
          <option>Switzerland</option>
        </select>
      </div>

      {/* Company Number */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Company Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Registered company number"
          className="w-full bg-[#0f1119] border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:border-magenta-500 focus:outline-none"
          value={company.company_number}
          onChange={(e) => setCompany({ ...company, company_number: e.target.value })}
        />
      </div>

      {/* VAT Number */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          VAT Number (optional)
        </label>
        <input
          type="text"
          placeholder="If applicable"
          className="w-full bg-[#0f1119] border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:border-magenta-500 focus:outline-none"
          value={company.vat_number}
          onChange={(e) => setCompany({ ...company, vat_number: e.target.value })}
        />
      </div>

      {/* Contact Email */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Contact Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          placeholder="name@company.com"
          className="w-full bg-[#0f1119] border border-gray-700 rounded-lg px-4 py-3 text-gray-200 focus:border-magenta-500 focus:outline-none"
          value={company.contact_email}
          onChange={(e) => setCompany({ ...company, contact_email: e.target.value })}
        />
      </div>

      {/* Logo Upload */}
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-300 mb-2">Company Logo</label>
        <input
          type="file"
          accept="image/*"
          className="w-full bg-[#0f1119] border border-gray-700 rounded-lg px-4 py-3 text-gray-200 cursor-pointer file:mr-4 file:rounded-md file:border-0 file:bg-magenta-600 file:text-white file:px-4 file:py-2 hover:file:bg-magenta-500 transition"
        />
      </div>

      {/* Messages */}
      {(fieldError || message) && (
        <div className="col-span-2">
          {fieldError && <p className="text-red-400 text-xs">{fieldError}</p>}
          {message && <p className="text-green-500 text-sm">{message}</p>}
        </div>
      )}

      {/* Action Buttons */}
      <div className="col-span-2 flex justify-end space-x-4 mt-10">
        <button
          type="button"
          onClick={() => doSubmit(false)}
          className="glass-button text-white px-8 py-3 rounded-lg font-medium transition disabled:opacity-60"
          disabled={busy || !requiredComplete}
        >
          Save
        </button>
        <button
          type="submit"
          className="glass-button text-white px-8 py-3 rounded-lg font-medium transition disabled:opacity-60"
          disabled={busy || !requiredComplete}
        >
          Save and Continue
        </button>
      </div>
    </form>
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