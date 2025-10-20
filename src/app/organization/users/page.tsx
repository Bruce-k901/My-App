"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import EntityPageLayout, { IconButton } from "@/components/layouts/EntityPageLayout";
import UserEntityCard from "@/components/users/UserEntityCard";
import { ListContainer } from "@/components/ui/ListContainer";
import { Button, Input, Card, CardContent, Select } from "@/components/ui";
import { MapPin, Eye, EyeOff, Archive, ChevronLeft, Plus, Upload, Download } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { roleHierarchy } from "@/lib/roles";
import { useToast } from "@/components/ui/ToastProvider";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  company_id: string | null;
  site_id: string | null;
  home_site_id: string | null; // Fixed: use home_site_id as the actual column name
  app_role: string | null;
  position_title: string | null;
  boh_foh: string | null;
  last_login: string | null;
  pin_code: string | null;
  phone_number: string | null;
};

type Site = { id: string; name: string };

export default function OrganizationUsersPage() {
  const { showToast } = useToast();
  const { companyId: ctxCompanyId } = useAppContext();

  const [companyId, setCompanyId] = useState<string | null>(ctxCompanyId ?? null);
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [archivedUsers, setArchivedUsers] = useState<any[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [query, setQuery] = useState("");
  const [viewArchived, setViewArchived] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [showAddUser, setShowAddUser] = useState(false);
  const [creating, setCreating] = useState(false);

  const [editForm, setEditForm] = useState<{
    full_name: string;
    email: string;
    app_role: string;
    position_title: string;
    site_name: string;
    pin_code: string;
    boh_foh: string;
    phone_number: string;
  } | null>(null);

  const [newUser, setNewUser] = useState<{
    full_name: string;
    email: string;
    app_role: string;
    position_title: string;
    site_name: string;
    pin_code: string;
    boh_foh: string;
    phone_number: string;
  }>({
    full_name: "",
    email: "",
    app_role: "",
    position_title: "",
    site_name: "",
    pin_code: "",
    boh_foh: "",
    phone_number: "",
  });

  const [showPinAdd, setShowPinAdd] = useState(false);
  const [showPinEdit, setShowPinEdit] = useState(false);

  // keep companyId in sync with context, but try a fallback if context is late
  useEffect(() => {
    if (ctxCompanyId) {
      setCompanyId(ctxCompanyId);
      return;
    }
    if (!companyId) {
      supabase.from("profiles").select("company_id").limit(1).then(({ data }) => {
        if (data?.[0]?.company_id) setCompanyId(data[0].company_id);
      });
    }
  }, [ctxCompanyId]); // eslint-disable-line

  const siteNameById = useMemo(
    () => Object.fromEntries(sites.map((s) => [s.id, s.name])),
    [sites]
  );
  const roleOptions = useMemo(
    () => Array.from(new Set([...(Object.keys(roleHierarchy) || []), "Admin"])).map(role => ({
      label: role,
      value: role
    })),
    []
  );
  const positionOptions = [
    { label: "General Manager", value: "general_manager" },
    { label: "Assistant Manager", value: "assistant_manager" },
    { label: "Head Chef", value: "head_chef" },
    { label: "Sous Chef", value: "sous_chef" },
    { label: "Staff", value: "staff" },
    { label: "Owner", value: "owner" },
    { label: "Admin", value: "admin" },
    { label: "Head Office", value: "head_office" },
  ];
  const bohFohOptions = ["BOH", "FOH"];

  const normBohFoh = (v?: string | null) => {
    if (!v) return null;
    const t = String(v).trim().toUpperCase();
    return t === "BOH" || t === "FOH" ? t : null;
  };

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

  const loadUsers = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [{ data: pData, error: pErr }, { data: sData, error: sErr }, { data: aData, error: aErr }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id,email,full_name,company_id,site_id,home_site_id,app_role,position_title,boh_foh,last_login,pin_code,phone_number"
          )
          .eq("company_id", companyId),
        supabase.from("sites").select("id,name").eq("company_id", companyId),
        supabase
          .from("archived_users")
          .select("id, full_name, email, role, app_role, boh_foh, position, archived_at")
          .eq("company_id", companyId)
          .order("archived_at", { ascending: false }),
      ]);
      if (pErr) throw pErr;
      if (sErr) throw sErr;
      if (aErr) throw aErr;
      setProfiles(pData ?? []);
      setSites(sData ?? []);
      setArchivedUsers(aData ?? []);
    } catch (e: any) {
      showToast({
        title: "Failed to load users",
        description: e?.message || "Please try again shortly.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) loadUsers();
  }, [companyId]); // eslint-disable-line

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const vals = [
        p.full_name ?? "",
        p.email ?? "",
        p.app_role ?? "",
        p.position_title ?? "",
        siteNameById[p.home_site_id ?? p.site_id ?? ""] ?? "",
      ].map((x) => x.toLowerCase());
      return vals.some((v) => v.includes(q));
    });
  }, [profiles, query, siteNameById]);

  const openEditor = (row: ProfileRow) => {
    setExpandedId(row.id);
    setShowPinEdit(false);
    setEditForm({
      full_name: row.full_name ?? "",
      email: row.email ?? "",
      app_role: row.app_role ?? "",
      position_title: row.position_title ?? "",
      home_site: row.home_site_id ?? row.site_id ?? "", // Use UUID directly for dropdown
      pin_code: row.pin_code ?? "",
      boh_foh: normBohFoh(row.boh_foh) ?? "",
      phone_number: row.phone_number ?? "",
    });
  };

  const handleSave = async (userId: string) => {
    if (!editForm) return;
    try {
      setSavingId(userId);

      const payload = { 
        full_name: editForm.full_name?.trim() || null, 
        email: editForm.email?.trim() || null, 
        phone_number: editForm.phone_number?.trim() || null, 
        app_role: editForm.app_role,                // "Owner" | "Admin" | "Manager" | "Staff" 
        position_title: editForm.position_title || null, 
        home_site_id: editForm.home_site || null,   // UUID from dropdown 
        pin_code: editForm.pin_code || null,        // PIN code
      }; 
      
      const { data, error } = await supabase 
        .from("profiles") 
        .update(payload) 
        .eq("id", userId) 
        .select() 
        .single(); 
      
      console.log("SAVE payload:", payload); 
      if (error) console.error("SAVE error:", error);

      if (error) throw error;

      showToast({ title: "User updated", type: "success" });
      setExpandedId(null);
      setEditForm(null);
      await loadUsers(); // refresh so minimised cards reflect latest
    } catch (e: any) {
      showToast({
        title: "Update failed",
        description: e?.message || "Please check fields and try again.",
        type: "error",
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    console.log("handleRoleChange called:", { userId, newRole });
    
    // Normalize the role value before processing
    const normalizedRole = normRole(newRole) || newRole;
    
    // update UI immediately
    setProfiles(prev =>
      prev.map(u =>
        u.id === userId ? { ...u, app_role: normalizedRole } : u
      )
    );

    // persist to Supabase
    const { data, error } = await supabase
      .from("profiles")
      .update({ app_role: normalizedRole })
      .eq("id", userId)
      .select();

    console.log("Supabase update result:", { data, error });

    if (error) {
      console.error("Role update error:", error);
      showToast({ title: error.message, type: "error" });
    } else {
      console.log("Role updated successfully:", data);
      showToast({ title: "Role updated", type: "success" });
    }
  };

  const handleCreateUser = async () => {
    if (!companyId) {
      showToast({ title: "No company context", type: "error" });
      return;
    }
    try {
      setCreating(true);

      const missing = !newUser.full_name?.trim() || !newUser.email?.trim();
      if (missing) {
        showToast({ title: "Name and email are required", type: "error" });
        return;
      }

      const homeId =
        newUser.site_name
          ? sites.find((s) => s.name.toLowerCase() === newUser.site_name.toLowerCase())?.id ?? null
          : null;

      const { error } = await supabase.from("profiles").insert({
        full_name: newUser.full_name || null,
        email: newUser.email || null,
        role: normRole(newUser.app_role) || newUser.app_role || null,
        position_title: newUser.position_title || null,
        home_site_id: homeId,
        site_id: homeId, // sync on create too
        boh_foh: normBohFoh(newUser.boh_foh),
        pin_code: newUser.pin_code || null,
        phone_number: newUser.phone_number || null,
        company_id: companyId,
      });

      if (error) throw error;

      showToast({ title: "User created", type: "success" });
      setShowAddUser(false);
      setNewUser({
        full_name: "",
        email: "",
        app_role: "",
        position_title: "",
        site_name: "",
        boh_foh: "",
        pin_code: "",
        phone_number: "",
      });
      await loadUsers();
    } catch (e: any) {
      showToast({
        title: "Create failed",
        description: e?.message || "Please check fields and try again.",
        type: "error",
      });
    } finally {
      setCreating(false);
    }
  };

  // Archive User Functions
  const archiveUser = async (userId: string) => {
    const { data: user, error: fetchError } = await supabase
      .from("profiles")
      .select("id, auth_user_id, full_name, email, position_title, role, app_role, boh_foh, company_id, site_id")
      .eq("id", userId)
      .single();

    if (fetchError || !user) throw fetchError || new Error("User not found");

    const { error: insertError } = await supabase
      .from("archived_users")
      .insert({
        original_id: user.id,
        auth_user_id: user.auth_user_id,
        full_name: user.full_name,
        email: user.email,
        position: user.position_title, // match destination column name
        role: user.role || user.app_role,
        app_role: user.app_role || user.role,
        boh_foh: user.boh_foh,
        company_id: user.company_id,
        site_id: user.site_id,
      });

    if (insertError) throw insertError;

    await supabase.from("profiles").delete().eq("id", userId);
  };

  const unarchiveUser = async (archivedId: string) => {
    const { data, error: fetchError } = await supabase
      .from("archived_users")
      .select("auth_user_id, full_name, email, position, role, app_role, boh_foh, company_id, site_id, original_id")
      .eq("id", archivedId)
      .single();

    if (fetchError || !data) throw fetchError || new Error("Archived user not found");

    const { error: restoreError } = await supabase.from("profiles").insert({
      auth_user_id: data.auth_user_id,
      full_name: data.full_name,
      email: data.email,
      position_title: data.position, // back into position_title
      role: data.role,
      app_role: data.app_role,
      boh_foh: data.boh_foh,
      company_id: data.company_id,
      site_id: data.site_id,
    });

    if (restoreError) throw restoreError;

    await supabase.from("archived_users").delete().eq("id", archivedId);
  };

  const handleArchive = async (userId: string) => {
    if (!confirm("Archive this user? They'll be moved to the archive portal.")) return;
    
    try {
      await archiveUser(userId);
      showToast({ title: "User archived", type: "success" });
      await loadUsers(); // refresh users list
    } catch (error: any) {
      showToast({ 
        title: "Archive failed", 
        description: error?.message || "Failed to archive user",
        type: "error" 
      });
    }
  };

  const handleUploadCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          showToast({ title: "Invalid CSV", description: "File must have headers and at least one data row", type: "error" });
          return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1);
        
        // Expected headers: Name, Email, Role, Position, Home Site, Phone
        const requiredHeaders = ['name', 'email'];
        const headerMap = headers.reduce((acc, header, index) => {
          const normalized = header.toLowerCase().replace(/[^a-z]/g, '');
          acc[normalized] = index;
          return acc;
        }, {} as Record<string, number>);
        
        const missingRequired = requiredHeaders.filter(h => !(h in headerMap));
        if (missingRequired.length > 0) {
          showToast({ 
            title: "Invalid CSV format", 
            description: `Missing required columns: ${missingRequired.join(', ')}`, 
            type: "error" 
          });
          return;
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const row of rows) {
          const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
          
          const userData = {
            email: values[headerMap.email] || '',
            full_name: values[headerMap.name] || '',
            app_role: values[headerMap.role] || '',
            position_title: values[headerMap.position] || '',
            phone_number: values[headerMap.phone] || '',
            company_id: companyId,
            site_id: null, // Will be set based on site name if provided
            boh_foh: null,
            pin_code: null,
          };
          
          if (!userData.full_name || !userData.email) {
            errorCount++;
            continue;
          }
          
          try {
            // Use the proper user creation API instead of direct profile insertion
            const res = await fetch("/api/users/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify(userData),
            });
            
            if (!res.ok) {
              const errorData = await res.json().catch(() => ({ error: "Failed to create user" }));
              console.error(`Failed to create user ${userData.email}:`, errorData);
              errorCount++;
            } else {
              successCount++;
            }
          } catch (error) {
            console.error(`Error creating user ${userData.email}:`, error);
            errorCount++;
          }
        }
        
        showToast({ 
          title: "Upload complete", 
          description: `${successCount} users added${errorCount > 0 ? `, ${errorCount} failed` : ''}`, 
          type: successCount > 0 ? "success" : "error" 
        });
        
        if (successCount > 0) {
          await loadUsers();
        }
      } catch (e: any) {
        showToast({ 
          title: "Upload failed", 
          description: e?.message || "Please check your CSV format", 
          type: "error" 
        });
      }
    };
    input.click();
  };

  const handleDownloadCSV = () => {
    if (!filtered?.length) return;
    const headers = ["Name", "Email", "Role", "Position", "Home Site", "Last Login"];
    const rows = filtered.map((u) => [
      u.full_name || "",
      u.email || "",
      u.app_role || "",
      u.position_title || "",
      siteNameById[u.home_site_id ?? u.site_id ?? ""] || "",
      u.last_login ? new Date(u.last_login).toISOString() : "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <EntityPageLayout
      title={viewArchived ? "Archived Users" : "Users"}
      searchPlaceholder="Search users..."
      onSearch={setQuery}
      onAdd={viewArchived ? undefined : () => setShowAddUser(true)}
      onUpload={viewArchived ? undefined : handleUploadCSV}
      onDownload={viewArchived ? undefined : handleDownloadCSV}
      customActions={
        <Tooltip.Provider delayDuration={100}>
          <Tooltip.Root key={viewArchived ? "chevron" : "archive"}>
            <Tooltip.Trigger asChild>
              <IconButton
                ariaLabel={viewArchived ? "Back to Users" : "View Archived"}
                onClick={() => setViewArchived(!viewArchived)}
                variant={viewArchived ? "magentaOutline" : "orangeOutline"}
              >
                {viewArchived ? <ChevronLeft className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
              </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="top"
                align="center"
                sideOffset={6}
                className={`text-xs px-2 py-1 rounded-md border shadow-[0_0_10px] bg-[#0f0f12] transition z-50 ${
                  viewArchived
                    ? "border-[#EC4899] text-[#EC4899] shadow-[0_0_10px_rgba(236,72,153,0.7)]"
                    : "border-orange-400 text-orange-400 shadow-[0_0_6px_#fb923c]"
                }`}
              >
                {viewArchived ? "Back to Users" : "Archived"}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      }
    >
      {!companyId ? (
        <p className="text-slate-400">Waiting for company context…</p>
      ) : loading ? (
        <p className="text-slate-400">Loading users…</p>
      ) : (
        <ListContainer>
          {showAddUser && (
            <Card className="rounded-xl border border-neutral-800 bg-neutral-900">
              <CardContent className="p-4 overflow-visible relative z-auto">
                <div className="grid grid-cols-2 gap-3 overflow-visible relative z-auto">
                  <div>
                    <label className="text-xs text-neutral-400">Full Name</label>
                    <Input
                      value={newUser.full_name}
                      onChange={(e) => setNewUser((u) => ({ ...u, full_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400">Email</label>
                    <Input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400">Role</label>
                    <Select
                      value={newUser.app_role}
                      options={roleOptions}
                      onValueChange={(val: string) => setNewUser((u) => ({ ...u, app_role: val }))}
                      placeholder="Select role…"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400">Position</label>
                    <Select
                      value={newUser.position_title}
                      options={positionOptions.map((o) => o.value)}
                      onValueChange={(val: string) =>
                        setNewUser((u) => ({ ...u, position_title: val }))
                      }
                      placeholder="Select position…"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400">BOH/FOH</label>
                    <Select
                      value={normBohFoh(newUser.boh_foh) ?? ""}
                      options={bohFohOptions}
                      onValueChange={(val: string) => {
                        setNewUser((u) => ({ ...u, boh_foh: val }));
                      }}
                      placeholder="Select…"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400">Mobile Number</label>
                    <Input
                      type="tel"
                      value={newUser.phone_number}
                      onChange={(e) => setNewUser((u) => ({ ...u, phone_number: e.target.value }))}
                      autoComplete="tel"
                    />
                  </div>
                  {/* PIN Code */}
                  <div>
                    <label className="text-xs text-neutral-400">PIN Code</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="relative flex-1">
                         <Input
                           className="pr-10 bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus-visible:ring-1 focus-visible:ring-pink-500 focus-visible:border-pink-500"
                           type={showPinAdd ? "text" : "password"}
                           inputMode="numeric"
                           pattern="[0-9]*"
                           maxLength={4}
                           value={newUser.pin_code}
                           onChange={(e) => {
                             const sanitized = String(e.target.value).replace(/\D/g, "").slice(0, 4);
                             setNewUser((u) => ({ ...u, pin_code: sanitized }));
                           }}
                           autoComplete="off"
                         />
                         <button
                           type="button"
                           onClick={() => setShowPinAdd((v) => !v)}
                           className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-pink-400 transition"
                           aria-label={showPinAdd ? "Hide PIN" : "Show PIN"}
                         >
                           {showPinAdd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                         </button>
                       </div>
                      <Button
                        type="button"
                        onClick={() =>
                          setNewUser((u) => ({
                            ...u,
                            pin_code: String(1000 + Math.floor(Math.random() * 9000)),
                          }))
                        }
                        className="border border-pink-500 text-pink-400 bg-transparent hover:bg-pink-500/10 hover:shadow-[0_0_14px_rgba(236,72,153,0.4)] transition-all duration-150"
                      >
                        Generate
                      </Button>
                    </div>
                  </div>
                  {/* Home Site */}
                  <div>
                    <label className="text-xs text-neutral-400">Home Site</label>
                    <Select
                      value={newUser.site_name}
                      options={sites.map((s) => s.name)}
                      onValueChange={(val: string) => setNewUser((u) => ({ ...u, site_name: val }))}
                      placeholder="Select site…"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button onClick={() => setShowAddUser(false)} className="border border-pink-500 text-pink-400 bg-transparent hover:bg-pink-500/10 hover:shadow-[0_0_14px_rgba(236,72,153,0.4)] transition-all duration-150">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} disabled={creating} className="border border-pink-500 text-pink-400 bg-transparent hover:bg-pink-500/10 hover:shadow-[0_0_14px_rgba(236,72,153,0.4)] transition-all duration-150">
                    {creating ? "Saving…" : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {viewArchived ? (
             // Archived Users View
             archivedUsers.length === 0 ? (
               <p className="text-slate-400">No archived users found.</p>
             ) : (
               archivedUsers.map((user) => (
                 <div key={user.id} className="border border-neutral-700 bg-neutral-900/60 rounded-xl p-4 text-neutral-300 hover:border-orange-500 hover:shadow-[0_0_12px_rgba(249,115,22,0.6)] transition-all duration-200">
                   <div className="flex justify-between items-center">
                     <span className="font-semibold">{user.full_name || user.email || "—"}</span>
                     <span className="text-xs text-neutral-500">
                       Archived {new Date(user.archived_at).toLocaleDateString()}
                     </span>
                   </div>
                   <p className="text-sm text-neutral-400 mt-1">
                     {user.position || user.position_title || "—"} • {user.app_role || user.role || "—"}
                   </p>
                   <p className="text-sm text-neutral-400">{user.email}</p>
                   <button
                     onClick={async () => {
                       if (!confirm("Restore this user? They'll be moved back to active users.")) return;
                       try {
                         await unarchiveUser(user.id);
                         showToast({ title: "User restored", type: "success" });
                         await loadUsers();
                       } catch (error: any) {
                         showToast({ 
                           title: "Restore failed", 
                           description: error?.message || "Failed to restore user",
                           type: "error" 
                         });
                       }
                     }}
                     className="mt-3 px-3 py-2 border border-pink-500 text-pink-400 rounded-md hover:bg-pink-500 hover:text-white transition"
                   >
                     Restore User
                   </button>
                 </div>
               ))
             )
           ) : (
             // Active Users View
             filtered.length === 0 ? (
               <p className="text-slate-400">No users found.</p>
             ) : (
               filtered.map((p) => {
                 const homeName = siteNameById[p.home_site_id ?? p.site_id ?? ""] || "Unassigned";
                 const subtitle = [
                   p.email,
                   p.phone_number,
                   homeName
                 ].filter(Boolean).join(" • ");
                 
                 return (
                   <UserEntityCard
                     key={p.id}
                     user={p}
                     subtitle={subtitle}
                     isExpanded={expandedId === p.id}
                     onToggle={() => expandedId === p.id ? setExpandedId(null) : openEditor(p)}
                     editForm={editForm}
                     onEditFormChange={(updates) => setEditForm((f: any) => ({ ...f, ...updates }))}
                     roleOptions={roleOptions}
                     onRoleChange={handleRoleChange}
                     onSave={() => handleSave(p.id)}
                     onCancel={() => { setExpandedId(null); setEditForm(null); }}
                     showPinEdit={showPinEdit}
                     onPinEditToggle={() => setShowPinEdit((v) => !v)}
                     onPinGenerate={() => {
                       const code = Math.floor(1000 + Math.random() * 9000).toString();
                       setEditForm((f: any) => ({ ...f, pin_code: code }));
                     }}
                     siteOptions={sites.map((s) => ({ label: s.name, value: s.id }))}
                     onArchive={handleArchive}
                     onUnarchive={() => {}} // Add unarchive handler if needed
                   />
                 );
               })
             )
           )}
        </ListContainer>
      )}
    </EntityPageLayout>
  );
}