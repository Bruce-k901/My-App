"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Input, Select } from "@/components/ui";
import { useToast } from "@/components/ui/ToastProvider";

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  siteId?: string | null;
  selectedSiteId?: string | null;
  onRefresh?: () => Promise<void> | void;
}

export default function AddUserModal({ open, onClose, companyId, siteId, selectedSiteId, onRefresh }: AddUserModalProps) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    pin_code: "",
    role: "staff",
    position_title: "",
    boh_foh: "FOH",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!companyId) {
      setError("No company context detected. Please sign in or complete setup.");
      showToast({ title: "Missing company", description: "No company context detected.", type: "error" });
      return;
    }
    // Simplified: require email for now
    if (!form.email) {
      setError("Email address is required for now.");
      showToast({ title: "Missing email", description: "Please enter an email to invite.", type: "error" });
      return;
    }

    if (saving) return;
    setSaving(true);

    // Duplicate guard by email within the same company
    try {
      const emailLower = form.email.toLowerCase();
      const { data: existing, error: checkErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("company_id", companyId)
        .eq("email", emailLower)
        .limit(1);
      if (checkErr) {
        throw checkErr;
      }
      if (existing && existing.length > 0) {
        setError("A user with this email already exists.");
        showToast({ title: "Duplicate email", description: "This email is already in use.", type: "warning" });
        setSaving(false);
        return;
      }
    } catch (err: any) {
      setError(err?.message || "Failed to validate existing users.");
      showToast({ title: "Validation failed", description: err?.message || "Could not check duplicates.", type: "error" });
      setSaving(false);
      return;
    }

    // Invite and create user profile via server endpoint (handles existing Auth users)
    try {
      const payload = {
        email: form.email,
        full_name: form.full_name,
        phone_number: form.phone_number,
        pin_code: form.pin_code,
        company_id: companyId,
        site_id: selectedSiteId ?? siteId ?? null,
        role: form.role,
        position_title: form.position_title,
        boh_foh: form.boh_foh,
      };
      console.log("Submitting payload:", payload);

      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const rawBody = await res.clone().text().catch(() => "");
      const ct = res.headers.get("content-type") || "";
      console.log("Create response:", { status: res.status, ok: res.ok, contentType: ct, rawBody });
      let json: any = null;
      const contentType = ct;
      if (contentType.includes("application/json")) {
        json = await res.json().catch(() => null);
        if (json) console.log("Create response JSON:", json);
      } else {
        const text = await res.text().catch(() => "");
        if (!res.ok) json = { error: text || "Request failed" };
      }
      if (!res.ok || json?.error) {
        const code = json?.code;
        const msg = json?.error || "Failed to create user profile.";
        setError(msg);
        const desc =
          code === "profile_exists"
            ? "A profile for this email already exists in the company."
            : code === "auth_exists_no_id"
            ? "Auth user exists but ID could not be resolved."
            : code === "missing_admin_env"
            ? "Server missing Supabase Service Role configuration. Add SUPABASE_SERVICE_ROLE_KEY."
            : code === "invalid_admin_key"
            ? "Configured admin key is not a Service Role key."
            : msg;
        showToast({ title: "Create user failed", description: desc, type: "error" });
        setSaving(false);
        return;
      }
      showToast({ title: "User invited", description: `Profile created and invite sent to ${form.email}.`, type: "success" });
    } catch (err: any) {
      setError(err?.message || "Failed to create user profile.");
      showToast({ title: "Request failed", description: err?.message || "Network or server error.", type: "error" });
      setSaving(false);
      return;
    }

    onClose();
    if (onRefresh) await onRefresh();
    setSaving(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Add New User</h2>
          <button className="text-slate-300 hover:text-white" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Full Name</label>
            <Input
              value={form.full_name}
              onChange={(e: any) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e: any) => setForm({ ...form, email: e.target.value })}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Phone Number</label>
            <Input
              type="tel"
              value={form.phone_number}
              onChange={(e: any) => setForm({ ...form, phone_number: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">4-Digit Code</label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={4}
                pattern={"\\d{4}"}
                value={form.pin_code}
                onChange={(e: any) => setForm({ ...form, pin_code: e.target.value })}
                className="flex-1"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setForm({ ...form, pin_code: String(Math.floor(1000 + Math.random() * 9000)) })}
              >
                Generate
              </Button>
            </div>
          </div>
          <Select
            label="Role"
            value={form.role}
            onValueChange={(v: string) => setForm({ ...form, role: v })}
            options={["staff", "manager", "admin", "owner"]}
          />
          <div>
            <label className="block text-xs text-slate-400 mb-1">Position</label>
            <Input
              value={form.position_title}
              onChange={(e: any) => setForm({ ...form, position_title: e.target.value })}
            />
          </div>
          <Select
            label="Area"
            value={form.boh_foh}
            onValueChange={(v: string) => setForm({ ...form, boh_foh: v })}
            options={["BOH", "FOH"]}
          />
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <Button type="submit" variant="primary" className="w-full" loading={saving} disabled={saving}>
            Save User
          </Button>
        </form>
      </div>
    </div>
  );
}