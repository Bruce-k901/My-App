"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Input, Select } from "@/components/ui";
import { useToast } from "@/components/ui/ToastProvider";
import { Eye, EyeOff } from "lucide-react";

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
    app_role: "Staff",
    position_title: "",
    boh_foh: "FOH",
    site_id: null as string | null,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  type Site = { id: string; name: string };
  const [sites, setSites] = useState<Site[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);

  // Load sites for the company and optionally preselect
  // If only one site exists, preselect it automatically
  // Also, if a site is passed from context, honor it as default
  React.useEffect(() => {
    let mounted = true;
    async function loadSites() {
      if (!open || !companyId) return;
      try {
        setLoadingSites(true);
        const { data, error } = await supabase
          .from("sites")
          .select("id,name")
          .eq("company_id", companyId);
        if (error) throw error;
        const list = (data || []) as Site[];
        if (!mounted) return;
        setSites(list);
        // Determine default selection
        const incoming = selectedSiteId ?? siteId ?? null;
        if (incoming && !form.site_id) {
          setForm((f) => ({ ...f, site_id: incoming }));
        } else if (list.length === 1 && !form.site_id) {
          setForm((f) => ({ ...f, site_id: list[0].id }));
        }
      } catch (e) {
        console.error("Failed to load sites", e);
      } finally {
        if (mounted) setLoadingSites(false);
      }
    }
    loadSites();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, companyId]);

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
        site_id: form.site_id ?? selectedSiteId ?? siteId ?? null,
        app_role: normRole(form.app_role) || form.app_role,
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

  const updateForm = (updates: Partial<typeof form>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const [showPin, setShowPin] = useState(false);

  const roleOptions = ["Staff", "Manager", "Admin", "Owner"];

  const normRole = (v?: string | null) => {
    if (!v) return null;
    const t = String(v).trim().toLowerCase();
    switch (t) {
      case "staff": return "Staff";
      case "manager": return "Manager";
      case "admin": return "Admin";
      case "owner": return "Owner";
      default: return null;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div 
        className="absolute inset-0 bg-black/60" 
        onClick={(e) => {
          // Only close if clicking directly on the backdrop, not on any dropdown content
          if (e.target === e.currentTarget) {
            onClose();
          }
        }} 
      />
      <div className="relative w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 p-4 sm:p-6 shadow-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Add New User</h2>
          <button className="text-slate-300 hover:text-white" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            {/* Full Name */}
            <div>
              <label className="text-xs text-neutral-400">Full Name</label>
              <Input
                value={form.full_name}
                onChange={(e) => updateForm({ full_name: e.target.value })}
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs text-neutral-400">Email</label>
              <Input
                value={form.email}
                onChange={(e) => updateForm({ email: e.target.value })}
              />
            </div>

            {/* Role */}
            <div>
              <label className="text-xs text-neutral-400">Role</label>
              <Select
                value={form.app_role}
                options={roleOptions}
                onValueChange={(val) => {
                  console.log("Role select fired:", val);
                  updateForm({ app_role: val });
                }}
                placeholder="Select role…"
              />
            </div>

            {/* Position */}
            <div>
              <label className="text-xs text-neutral-400">Position</label>
              <Select
                value={form.position_title}
                options={[
                  { label: "General Manager", value: "General Manager" },
                  { label: "Assistant Manager", value: "Assistant Manager" },
                  { label: "Head Chef", value: "Head Chef" },
                  { label: "Sous Chef", value: "Sous Chef" },
                  { label: "Staff", value: "Staff" },
                  { label: "Owner", value: "Owner" },
                  { label: "Admin", value: "Admin" },
                  { label: "Head Office", value: "Head Office" },
                ]}
                onValueChange={(val) => updateForm({ position_title: val })}
                placeholder="Select position…"
              />
            </div>

            {/* BOH/FOH */}
            <div>
              <label className="text-xs text-neutral-400">BOH/FOH</label>
              <Select
                value={form.boh_foh ? form.boh_foh.toUpperCase() : ""}
                options={["BOH", "FOH"]}
                onValueChange={(val) => {
                  setForm({ ...form, boh_foh: val.toLowerCase() });
                }}
                placeholder="Select…"
              />
            </div>

            {/* Mobile */}
            <div>
              <label className="text-xs text-neutral-400">Mobile Number</label>
              <Input
                type="tel"
                value={form.phone_number}
                onChange={(e) => updateForm({ phone_number: e.target.value })}
              />
            </div>

            {/* Home Site */}
            <div>
              <label className="text-xs text-neutral-400">Home Site</label>
              <Select
                value={form.site_id || ""}
                options={sites.map((s) => ({ label: s.name, value: s.id }))}
                onValueChange={(val) => updateForm({ site_id: val })}
                placeholder="Select site…"
              />
            </div>

            {/* PIN Code */}
            <div>
              <label className="text-xs text-neutral-400">PIN Code</label>
              <div className="flex gap-2 mt-1 items-center">
                <div className="relative flex-1">
                  <Input
                    className="pr-10"
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={form.pin_code}
                    onChange={(e) => {
                      const sanitized = String(e.target.value).replace(/\D/g, "").slice(0, 4);
                      updateForm({ pin_code: sanitized });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-pink-400"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="border-pink-500 text-pink-500 hover:bg-pink-500/10"
                  onClick={() => {
                    const code = Math.floor(1000 + Math.random() * 9000).toString();
                    updateForm({ pin_code: code });
                  }}
                >
                  Generate
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="ghost"
              className="border-pink-500 text-pink-500 hover:bg-pink-500/10"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              className="border-pink-500 text-pink-500 hover:bg-pink-500/10"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-400 mt-2">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}