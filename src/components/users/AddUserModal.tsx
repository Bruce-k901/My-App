"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Input, Select } from "@/components/ui";
import { useToast } from "@/components/ui/ToastProvider";
// Eye, EyeOff removed — PIN field hidden for now
import { useAppContext } from "@/context/AppContext";

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  siteId?: string | null;
  selectedSiteId?: string | null;
  onRefresh?: () => Promise<void> | void;
}

export default function AddUserModal({ open, onClose, companyId, siteId, selectedSiteId, onRefresh }: AddUserModalProps) {
  const { profile } = useAppContext();
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

  type OnboardingPack = {
    id: string;
    name: string;
    boh_foh: "FOH" | "BOH" | "BOTH";
    pay_type: "hourly" | "salaried";
    is_active?: boolean | null;
    is_base?: boolean | null;
  };
  const [onboardingPacks, setOnboardingPacks] = useState<OnboardingPack[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);

  const [startOnboarding, setStartOnboarding] = useState(true);
  const [onboardingPackId, setOnboardingPackId] = useState<string>("");
  const [onboardingMessage, setOnboardingMessage] = useState<string>("Please complete these onboarding documents before your first shift.");

  // Load onboarding packs
  useEffect(() => {
    let mounted = true;
    async function loadPacks() {
      if (!open || !companyId) return;
      try {
        setLoadingPacks(true);
        const baseSelect = "id,name,boh_foh,pay_type";
        const selectWithFlags = `${baseSelect},is_active,is_base`;
        let { data, error } = await supabase
          .from("company_onboarding_packs")
          .select(selectWithFlags)
          .eq("company_id", companyId)
          .order("name", { ascending: true });

        // Fallback for older schemas missing is_active/is_base
        if (error && (error as any)?.code === "42703") {
          const retry = await supabase
            .from("company_onboarding_packs")
            .select(baseSelect)
            .eq("company_id", companyId)
            .order("name", { ascending: true });
          data = retry.data as any;
          error = retry.error as any;
        }

        if (error) throw error;
        const list = (data || []) as OnboardingPack[];
        const active = list.filter((p) => (p as any)?.is_active !== false);
        if (!mounted) return;
        setOnboardingPacks(active);
      } catch (e) {
        console.error("Failed to load onboarding packs", e);
        if (mounted) setOnboardingPacks([]);
      } finally {
        if (mounted) setLoadingPacks(false);
      }
    }
    loadPacks();
    return () => {
      mounted = false;
    };
  }, [open, companyId]);

  // Pick a sensible default pack based on BOH/FOH
  useEffect(() => {
    if (!open) return;
    if (onboardingPackId) return;
    if (!onboardingPacks.length) return;
    const target = (form.boh_foh || "FOH") as "FOH" | "BOH";
    const match = onboardingPacks.find((p) => p.boh_foh === target) || onboardingPacks.find((p) => p.boh_foh === "BOTH") || onboardingPacks[0];
    if (match?.id) setOnboardingPackId(match.id);
  }, [open, form.boh_foh, onboardingPacks, onboardingPackId]);

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

      // Optionally start onboarding immediately (so they appear in onboarding page)
      if (startOnboarding && onboardingPackId && json?.id) {
        try {
          let { error: assignErr } = await supabase.from("employee_onboarding_assignments").insert({
            company_id: companyId,
            profile_id: json.id,
            pack_id: onboardingPackId,
            sent_by: profile?.id || null,
            message: onboardingMessage?.trim() || null,
          } as any);

          // Fallback if older schema missing sent_by
          if (assignErr && (assignErr as any)?.code === "42703") {
            const retry = await supabase.from("employee_onboarding_assignments").insert({
              company_id: companyId,
              profile_id: json.id,
              pack_id: onboardingPackId,
              message: onboardingMessage?.trim() || null,
            } as any);
            assignErr = retry.error as any;
          }

          if (assignErr) {
            console.warn("Onboarding assignment failed:", assignErr);
            showToast({
              title: "Onboarding not assigned",
              description: "User was created, but we couldn't assign an onboarding pack. You can assign it from People → Onboarding.",
              type: "warning",
            });
          }
        } catch (assignErr) {
          console.warn("Onboarding assignment exception:", assignErr);
          showToast({
            title: "Onboarding not assigned",
            description: "User was created, but onboarding assignment failed. You can assign it from People → Onboarding.",
            type: "warning",
          });
        }
      }
      
      // Refresh the user list BEFORE closing the modal to ensure the new user appears
      // Add a small delay to ensure database transaction has committed
      if (onRefresh) {
        try {
          console.log("🔄 Refreshing user list after creating user...");
          // Small delay to ensure database transaction has committed
          await new Promise(resolve => setTimeout(resolve, 500));
          await onRefresh();
          console.log("✅ User list refreshed");
        } catch (refreshError) {
          console.error("❌ Failed to refresh user list:", refreshError);
          // Try again after a longer delay
          try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await onRefresh();
            console.log("✅ User list refreshed on retry");
          } catch (retryError) {
            console.error("❌ Retry refresh also failed:", retryError);
            // Don't block the success flow if refresh fails
          }
        }
      }
      
      // Close modal and reset form after successful creation and refresh
      onClose();
      // Reset form to initial state
      setForm({
        full_name: "",
        email: "",
        phone_number: "",
        pin_code: "",
        app_role: "Staff",
        position_title: "",
        boh_foh: "FOH",
        site_id: null,
      });
      setStartOnboarding(true);
      setOnboardingPackId("");
      setOnboardingMessage("Please complete these onboarding documents before your first shift.");
      setSaving(false);
    } catch (err: any) {
      setError(err?.message || "Failed to create user profile.");
      showToast({ title: "Request failed", description: err?.message || "Network or server error.", type: "error" });
      setSaving(false);
      return;
    }
  }

  const updateForm = (updates: Partial<typeof form>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const roleOptions = [
    "Staff",
    "Manager", 
    "Admin",
    "Owner",
    "CEO",
    "Managing Director",
    "COO",
    "CFO",
    "HR Manager",
    "Operations Manager",
    "Finance Manager",
    "Regional Manager",
    "Area Manager"
  ];

  const normRole = (v?: string | null) => {
    if (!v) return null;
    const t = String(v).trim().toLowerCase();
    switch (t) {
      case "staff": return "Staff";
      case "manager": return "Manager";
      case "admin": return "Admin";
      case "owner": return "Owner";
      case "ceo": return "CEO";
      case "managing director": 
      case "md": return "Managing Director";
      case "coo": 
      case "chief operating officer": return "COO";
      case "cfo": 
      case "chief financial officer": return "CFO";
      case "hr manager": return "HR Manager";
      case "operations manager": return "Operations Manager";
      case "finance manager": return "Finance Manager";
      case "regional manager": return "Regional Manager";
      case "area manager": return "Area Manager";
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
      <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 sm:p-6 shadow-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-theme-primary">Add New User</h2>
          <button className="text-gray-500 dark:text-theme-secondary hover:text-gray-700" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            {/* Full Name */}
            <div>
 <label className="text-xs text-gray-500 dark:text-theme-tertiary">Full Name</label>
              <Input
                value={form.full_name}
                onChange={(e) => updateForm({ full_name: e.target.value })}
              />
            </div>

            {/* Email */}
            <div>
 <label className="text-xs text-gray-500 dark:text-theme-tertiary">Email</label>
              <Input
                value={form.email}
                onChange={(e) => updateForm({ email: e.target.value })}
              />
            </div>

            {/* Role */}
            <div>
 <label className="text-xs text-gray-500 dark:text-theme-tertiary">Role</label>
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
 <label className="text-xs text-gray-500 dark:text-theme-tertiary">Position</label>
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
 <label className="text-xs text-gray-500 dark:text-theme-tertiary">BOH/FOH</label>
              <Select
                value={form.boh_foh || ""}
                options={[
                  { label: "BOH", value: "BOH" },
                  { label: "FOH", value: "FOH" },
                ]}
                onValueChange={(val) => {
                  // Store uppercase value to match database constraint
                  // val will be "BOH" or "FOH" (uppercase) from the options
                  setForm({ ...form, boh_foh: val || null });
                }}
                placeholder="Select…"
              />
            </div>

            {/* Mobile */}
            <div>
 <label className="text-xs text-gray-500 dark:text-theme-tertiary">Mobile Number</label>
              <Input
                type="tel"
                value={form.phone_number}
                onChange={(e) => updateForm({ phone_number: e.target.value })}
              />
            </div>

            {/* Home Site */}
            <div>
 <label className="text-xs text-gray-500 dark:text-theme-tertiary">Home Site</label>
              <Select
                value={form.site_id || ""}
                options={sites.map((s) => ({ label: s.name, value: s.id }))}
                onValueChange={(val) => updateForm({ site_id: val })}
                placeholder="Select site…"
              />
            </div>

            {/* Start onboarding */}
            <div className="col-span-2">
              <div className="flex items-center justify-between gap-3">
 <label className="text-xs text-gray-500 dark:text-theme-tertiary">Onboarding</label>
                <label className="flex items-center gap-2 text-xs text-theme-secondary select-none">
                  <input
                    type="checkbox"
                    checked={startOnboarding}
                    onChange={(e) => setStartOnboarding(e.target.checked)}
                    className="accent-[#D37E91]"
                  />
                  Start onboarding now
                </label>
              </div>
              <div className="text-xs text-theme-tertiary mt-1">
                Recommended: assign docs now, then add them to rota once complete.
              </div>
              {startOnboarding && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
 <label className="text-xs text-gray-500 dark:text-theme-tertiary">Onboarding pack</label>
                    <Select
                      value={onboardingPackId}
                      options={onboardingPacks.map((p) => ({
                        label: `${p.name} (${p.boh_foh}/${p.pay_type})`,
                        value: p.id,
                      }))}
                      onValueChange={(v) => setOnboardingPackId(v)}
                      placeholder={loadingPacks ? "Loading packs…" : "Select pack…"}
                      disabled={loadingPacks || onboardingPacks.length === 0}
                    />
                  </div>
                  <div>
 <label className="text-xs text-gray-500 dark:text-theme-tertiary">Message (optional)</label>
                    <Input
                      value={onboardingMessage}
                      onChange={(e) => setOnboardingMessage(e.target.value)}
                      placeholder="e.g. Please complete before your first shift"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="ghost"
              className="border-[#D37E91] text-[#D37E91] hover:bg-[#D37E91]/15"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              className="border-[#D37E91] text-[#D37E91] hover:bg-[#D37E91]/15"
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