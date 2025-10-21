"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

export type SiteOption = { id: string; name: string };

interface InviteFormProps {
  companyId: string;
  sites: SiteOption[];
  onInvited: (profile: any) => void;
}

export default function TeamInviteForm({ companyId, sites, onInvited }: InviteFormProps) {
  const { showToast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Staff");
  const [siteId, setSiteId] = useState<string>(sites?.[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ [k: string]: string | null }>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      const currentErrors: { [k: string]: string | null } = {};
      if (!companyId) currentErrors.companyId = "Missing company.";
      if (!firstName || firstName.trim().length < 1) currentErrors.firstName = "Enter first name.";
      if (!lastName || lastName.trim().length < 1) currentErrors.lastName = "Enter last name.";
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) currentErrors.email = "Enter a valid email.";
      if (!role) currentErrors.role = "Select role.";
      if (!siteId) currentErrors.siteId = "Select a site.";
      setErrors(currentErrors);
      if (Object.values(currentErrors).some(Boolean)) {
        return;
      }

      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, companyId, siteId, first_name: firstName, last_name: lastName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to send invite");

      // Fetch the upserted profile record to reflect in UI
      const { data: profileRes } = await supabase
        .from("profiles")
        .select("id, email, full_name, company_id, site_id, app_role, position_title, boh_foh, last_login, pin_code")
        .eq("company_id", companyId)
        .eq("email", email)
        .limit(1);

      showToast({ title: "Invite sent", description: `Invite sent to ${email}` });
      if (profileRes && profileRes[0]) {
        onInvited(profileRes[0]);
      }
      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("Staff");
      setSiteId(sites?.[0]?.id ?? "");
    } catch (err: any) {
      showToast({ title: "Invite failed", description: err?.message ?? "Failed to invite user", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">First name</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="input"
            placeholder="Jane"
          />
          {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Last name</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" placeholder="Doe" />
          {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="jane@company.com" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
            <option value="Staff">Staff</option>
            <option value="Manager">Manager</option>
            <option value="Admin">Admin</option>
          </select>
          {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Assigned Site</label>
        <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="input">
          <option value="">Select a site</option>
          {sites?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {errors.siteId && <p className="text-red-500 text-xs mt-1">{errors.siteId}</p>}
      </div>
      <button disabled={busy || !companyId} className="btn-gradient">
        {busy ? "Sending invite..." : "Invite user"}
      </button>
    </form>
  );
}