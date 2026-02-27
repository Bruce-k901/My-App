"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import UserEntityCard from "@/components/users/UserEntityCard";
import AddUserModal from "@/components/users/AddUserModal";
import { Plus, Search, Archive, ChevronLeft, Download } from '@/components/ui/icons';
import { Tooltip } from "@/components/ui/tooltip/Tooltip";
import * as XLSX from "xlsx";

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
  app_role: string | null;
  position_title: string | null;
  site_id: string | null;
  home_site?: string | null;
  phone_number: string | null;
  pin_code: string | null;
  last_login: string | null;
  status?: string | null;
}

interface Site {
  id: string;
  name: string;
}

export default function UsersTab() {
  const { companyId, role, company } = useAppContext();

  const effectiveCompanyId = company?.id || companyId;

  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [editForms, setEditForms] = useState<Record<string, any>>({});
  const [viewArchived, setViewArchived] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!effectiveCompanyId) return;

    try {
      if (viewArchived) {
        const { data, error } = await supabase
          .from("archived_users")
          .select("id, original_id, full_name, email, app_role, position, site_id, archived_at")
          .eq("company_id", effectiveCompanyId)
          .order("archived_at", { ascending: false });

        if (error) {
          console.error("Failed to fetch archived users:", error);
          setUsers([]);
          return;
        }

        const mappedData = (data || []).map(archived => ({
          id: archived.original_id,
          full_name: archived.full_name,
          email: archived.email,
          app_role: archived.app_role,
          position_title: archived.position || null,
          site_id: archived.site_id,
          home_site: archived.site_id,
          phone_number: null,
          pin_code: null,
          last_login: null,
          archived_at: archived.archived_at,
          isArchived: true,
        }));
        setUsers(mappedData);
        return;
      }

      // Use RPC function to bypass RLS and get all company profiles
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_company_profiles', {
        p_company_id: effectiveCompanyId
      });

      let data: any[] = [];
      let error: any = null;

      if (rpcError) {
        console.error("RPC function error:", rpcError);
        // Fallback to direct query (will only work if RLS policy allows)
        const fallbackResult = await supabase
          .from("profiles")
          .select("id, full_name, email, app_role, position_title, site_id, home_site, phone_number, pin_code, last_login, status")
          .eq("company_id", effectiveCompanyId)
          .order("full_name");

        data = fallbackResult.data || [];
        error = fallbackResult.error;
      } else if (rpcData) {
        data = rpcData.map((p: any) => ({
          id: p.profile_id,
          full_name: p.full_name,
          email: p.email,
          app_role: p.app_role,
          position_title: p.position_title,
          site_id: p.home_site,
          home_site: p.home_site,
          phone_number: p.phone_number,
          pin_code: null,
          last_login: null,
          status: p.status,
        }));
      }

      if (error) {
        console.error("Failed to fetch users:", error);
        if (error.code === 'PGRST116' || error.message?.includes('406') || (error as any).status === 406) {
          console.error("RLS is blocking user list query. Check profiles_select_company policy.");
        }
        setUsers([]);
        setLoading(false);
        return;
      }

      if (data) {
        setUsers(data);
      } else {
        setUsers([]);
      }
      setLoading(false);
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
      setLoading(false);
    }
  }, [effectiveCompanyId, viewArchived]);

  const fetchSites = useCallback(async () => {
    if (!effectiveCompanyId) return;

    try {
      const { data, error } = await supabase
        .from("sites")
        .select("id, name")
        .eq("company_id", effectiveCompanyId)
        .order("name");

      if (error) throw error;
      setSites(data || []);
    } catch (error: any) {
      console.error("Failed to fetch sites:", error);
    }
  }, [effectiveCompanyId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchSites()]);
      setLoading(false);
    };

    loadData();
  }, [fetchUsers, fetchSites, viewArchived]);

  const handleUserUpdate = async (userId: string, updates: Partial<User>) => {
    try {
      const dbUpdates: any = { ...updates };

      // CRITICAL: Keep site_id and home_site in sync
      if (dbUpdates.home_site !== undefined) {
        dbUpdates.site_id = dbUpdates.home_site;
      }
      if (dbUpdates.site_id !== undefined && dbUpdates.home_site === undefined) {
        dbUpdates.home_site = dbUpdates.site_id;
      }

      // Handle explicit null values (moving to head office)
      if (dbUpdates.site_id === null || dbUpdates.home_site === null) {
        dbUpdates.site_id = null;
        dbUpdates.home_site = null;
      }

      const { error } = await supabase
        .from("profiles")
        .update(dbUpdates)
        .eq("id", userId);

      if (error) {
        console.error("Failed to update user:", error);
        throw error;
      }

      // Update local state
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, ...updates } : user
      ));

      // Close the expanded card after successful save
      setExpandedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });

      console.log("User updated successfully");
    } catch (error: any) {
      console.error("Failed to update user:", error);
      alert(`Failed to update user: ${error.message || 'Unknown error'}`);
    }
  };

  const handleUserArchive = async (userId: string) => {
    try {
      const { data: userProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (fetchError) throw fetchError;

      const { data: { session } } = await supabase.auth.getSession();
      const archivedBy = session?.user?.id || null;

      const { error: archiveError } = await supabase
        .from("archived_users")
        .insert({
          original_id: userId,
          auth_user_id: userProfile.auth_user_id,
          email: userProfile.email,
          full_name: userProfile.full_name,
          company_id: userProfile.company_id,
          site_id: userProfile.site_id || userProfile.home_site,
          role: userProfile.app_role,
          position: userProfile.position_title,
          boh_foh: userProfile.boh_foh,
          last_login: userProfile.last_login,
          pin_code: userProfile.pin_code,
          phone_number: userProfile.phone_number,
          app_role: userProfile.app_role,
          archived_by: archivedBy,
          archived_at: new Date().toISOString(),
        });

      if (archiveError) throw archiveError;

      const { error: deleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (deleteError) throw deleteError;

      setUsers(prev => prev.filter(user => user.id !== userId));
      console.log("User archived successfully");
    } catch (error: any) {
      console.error("Failed to archive user:", error);
      alert(`Failed to archive user: ${error.message || 'Unknown error'}`);
    }
  };

  const handleUserUnarchive = async (userId: string) => {
    try {
      if (!confirm("Restore this user? They'll be moved back to active users.")) return;

      const { data: archivedUser, error: fetchError } = await supabase
        .from("archived_users")
        .select("*")
        .eq("original_id", userId)
        .order("archived_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      const { error: restoreError } = await supabase
        .from("profiles")
        .insert({
          id: archivedUser.original_id,
          auth_user_id: archivedUser.auth_user_id,
          email: archivedUser.email,
          full_name: archivedUser.full_name,
          company_id: archivedUser.company_id,
          site_id: archivedUser.site_id,
          home_site: archivedUser.site_id,
          app_role: archivedUser.app_role,
          position_title: archivedUser.position || null,
          boh_foh: archivedUser.boh_foh,
          last_login: archivedUser.last_login,
          pin_code: archivedUser.pin_code,
          phone_number: archivedUser.phone_number,
        });

      if (restoreError) throw restoreError;

      const { error: deleteError } = await supabase
        .from("archived_users")
        .delete()
        .eq("id", archivedUser.id);

      if (deleteError) throw deleteError;

      await fetchUsers();
      alert("User restored successfully");
    } catch (error: any) {
      console.error("Failed to unarchive user:", error);
      alert(`Failed to restore user: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDownload = () => {
    try {
      const fields = [
        "full_name",
        "email",
        "app_role",
        "position_title",
        "phone_number",
        "site_id",
      ];

      const activeUsers = viewArchived ? users : users.filter(user => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          user.full_name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.app_role?.toLowerCase().includes(query) ||
          user.position_title?.toLowerCase().includes(query)
        );
      });

      const rows = activeUsers.map((user: User) => {
        const row: Record<string, any> = {};
        for (const f of fields) {
          const value = user[f as keyof User];
          row[f] = value ?? "";
        }
        if (user.site_id) {
          const site = sites.find(s => s.id === user.site_id);
          row["site_name"] = site?.name || "";
        } else {
          row["site_name"] = "";
        }
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows, { header: [...fields, "site_name"] });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Users");
      const xlsxArray = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([xlsxArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users_export${viewArchived ? '_archived' : ''}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error("Export failed:", e?.message || "Unable to export");
      alert(`Export failed: ${e?.message || "Unable to export"}`);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.app_role?.toLowerCase().includes(query) ||
      user.position_title?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-theme-tertiary">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search, toggle, and add button */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-tertiary w-4 h-4" />
          <input
            type="text"
            placeholder={viewArchived ? "Search archived users..." : "Search users..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-theme-primary placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Archive Toggle Button */}
          <Tooltip label={viewArchived ? "Back to Users" : "Archived"} side="top">
            <button
              onClick={async () => {
                const newViewArchived = !viewArchived;
                setViewArchived(newViewArchived);
                setSearchQuery("");
                setLoading(true);
                try {
                  if (newViewArchived) {
                    const { data, error } = await supabase
                      .from("archived_users")
                      .select("id, original_id, full_name, email, app_role, position, site_id, archived_at")
                      .eq("company_id", effectiveCompanyId)
                      .order("archived_at", { ascending: false });

                    if (error) {
                      console.error("Failed to fetch archived users:", error);
                      setUsers([]);
                    } else {
                      const mappedData = (data || []).map(archived => ({
                        id: archived.original_id,
                        full_name: archived.full_name,
                        email: archived.email,
                        app_role: archived.app_role,
                        position_title: archived.position || null,
                        site_id: archived.site_id,
                        home_site: archived.site_id,
                        phone_number: null,
                        pin_code: null,
                        last_login: null,
                        archived_at: archived.archived_at,
                        isArchived: true,
                      }));
                      setUsers(mappedData);
                    }
                  } else {
                    const { data, error } = await supabase
                      .from("profiles")
                      .select("id, full_name, email, app_role, position_title, site_id, home_site, phone_number, pin_code, last_login, status")
                      .eq("company_id", effectiveCompanyId)
                      .order("full_name");

                    if (error) {
                      console.error("Failed to fetch users:", error);
                      setUsers([]);
                    } else {
                      setUsers(data || []);
                    }
                  }
                } finally {
                  setLoading(false);
                }
              }}
              className={`inline-flex items-center justify-center h-11 w-11 rounded-lg border transition-all duration-150 ease-in-out ${
                viewArchived
                  ? "border-[#D37E91] text-[#D37E91] bg-transparent hover:bg-[#D37E91]/10 dark:hover:bg-white/[0.04] hover:shadow-module-glow"
                  : "border-orange-400 text-orange-400 bg-transparent hover:bg-orange-50 dark:hover:bg-white/[0.04] hover:shadow-[0_0_8px_#fb923c]"
              }`}
              aria-label={viewArchived ? "Back to Users" : "View Archived"}
            >
              {viewArchived ? <ChevronLeft className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
            </button>
          </Tooltip>

          {/* Add User Button - hidden when viewing archived */}
          {(role === "Admin" || role === "Manager") && !viewArchived && (
            <Tooltip label="Add User" side="top">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-[#D37E91] text-[#D37E91] bg-transparent hover:bg-[#D37E91]/10 dark:hover:bg-white/[0.04] transition-all duration-150 ease-in-out hover:shadow-module-glow"
                aria-label="Add User"
              >
                <Plus className="h-5 w-5" />
              </button>
            </Tooltip>
          )}

          {/* Download Button */}
          <Tooltip label="Download Users" side="top">
            <button
              onClick={handleDownload}
              className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-gray-300 dark:border-white/[0.12] bg-gray-50 dark:bg-white/[0.06] text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/[0.12] transition-all duration-150 ease-in-out hover:shadow-module-glow"
              aria-label="Download Users"
            >
              <Download className="h-5 w-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Users list */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-theme-tertiary">
            {searchQuery
              ? `No ${viewArchived ? 'archived ' : ''}users found matching your search.`
              : viewArchived
                ? "No archived users found."
                : "No users found."}
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isExpanded = expandedUsers.has(user.id);
            const editForm = editForms[user.id] || user;

            return (
              <UserEntityCard
                key={user.id}
                user={user}
                subtitle={user.app_role || "No role"}
                isExpanded={isExpanded}
                onToggle={() => {
                  const newExpanded = new Set(expandedUsers);
                  if (isExpanded) {
                    newExpanded.delete(user.id);
                  } else {
                    newExpanded.add(user.id);
                    setEditForms(prev => ({ ...prev, [user.id]: { ...user } }));
                  }
                  setExpandedUsers(newExpanded);
                }}
                editForm={editForm}
                onEditFormChange={(updates: any) => {
                  setEditForms(prev => ({
                    ...prev,
                    [user.id]: { ...prev[user.id], ...updates }
                  }));
                }}
                roleOptions={[
                  { label: "Staff", value: "Staff" },
                  { label: "Manager", value: "Manager" },
                  { label: "Admin", value: "Admin" },
                  { label: "Owner", value: "Owner" },
                  { label: "CEO", value: "CEO" },
                  { label: "Managing Director", value: "Managing Director" },
                  { label: "COO", value: "COO" },
                  { label: "CFO", value: "CFO" },
                  { label: "HR Manager", value: "HR Manager" },
                  { label: "Operations Manager", value: "Operations Manager" },
                  { label: "Finance Manager", value: "Finance Manager" },
                  { label: "Regional Manager", value: "Regional Manager" },
                  { label: "Area Manager", value: "Area Manager" }
                ]}
                onRoleChange={(userId: string, newRole: string) => {
                  setEditForms(prev => ({
                    ...prev,
                    [userId]: { ...prev[userId], app_role: newRole }
                  }));
                }}
                onSave={() => handleUserUpdate(user.id, editForm)}
                onCancel={() => {
                  setEditForms(prev => ({ ...prev, [user.id]: { ...user } }));
                }}
                siteOptions={sites.map(site => ({ label: site.name, value: site.id }))}
                onArchive={viewArchived ? undefined : handleUserArchive}
                onUnarchive={viewArchived ? handleUserUnarchive : undefined}
                onSendInvite={async (userId: string, email: string) => {
                  try {
                    const res = await fetch("/api/users/resend-invite", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email, userId }),
                    });

                    const json = await res.json();

                    if (!res.ok) {
                      alert(`Failed to send invite: ${json.error || "Unknown error"}`);
                      return;
                    }

                    alert(`Invitation email sent to ${email}`);
                  } catch (err: any) {
                    console.error("Error sending invite:", err);
                    alert(`Failed to send invite: ${err?.message || "Unknown error"}`);
                  }
                }}
              />
            );
          })
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && companyId && (
        <AddUserModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          companyId={effectiveCompanyId}
          onRefresh={fetchUsers}
        />
      )}
    </div>
  );
}
