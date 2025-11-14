"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import UserEntityCard from "@/components/users/UserEntityCard";
import LazyAddUserModal from "@/components/users/LazyAddUserModal";
import { Plus, Search, Archive, ChevronLeft } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip/Tooltip";

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
  app_role: string | null;
  position_title: string | null;
  site_id: string | null;
  home_site?: string | null; // Mapped from site_id for UI compatibility
  phone_number: string | null;
  pin_code: string | null;
  last_login: string | null;
  // Training certificate fields
  food_safety_level?: number | null;
  food_safety_expiry_date?: string | null;
  h_and_s_level?: number | null;
  h_and_s_expiry_date?: string | null;
  fire_marshal_trained?: boolean | null;
  fire_marshal_expiry_date?: string | null;
  first_aid_trained?: boolean | null;
  first_aid_expiry_date?: string | null;
  cossh_trained?: boolean | null;
  cossh_expiry_date?: string | null;
}

interface Site {
  id: string;
  name: string;
}

export default function UsersTab() {
  const { companyId, role } = useAppContext();
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [editForms, setEditForms] = useState<Record<string, any>>({});
  const [viewArchived, setViewArchived] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!companyId) return;

    try {
      if (viewArchived) {
        // Fetch archived users - only select columns that exist
        const { data, error } = await supabase
          .from("archived_users")
          .select("id, original_id, full_name, email, app_role, position, site_id, archived_at")
          .eq("company_id", companyId)
          .order("archived_at", { ascending: false });

        if (error) {
          console.error("Failed to fetch archived users:", error);
          setUsers([]);
          return;
        }

        // Map archived users to User format
        const mappedData = (data || []).map(archived => ({
          id: archived.original_id,
          full_name: archived.full_name,
          email: archived.email,
          app_role: archived.app_role,
          position_title: archived.position || null, // Use position field
          site_id: archived.site_id,
          home_site: archived.site_id, // Use site_id as home_site fallback
          phone_number: null, // Not available in archived_users
          pin_code: null, // Not available in archived_users
          last_login: null, // Not available in archived_users
          archived_at: archived.archived_at,
          isArchived: true,
        }));
        setUsers(mappedData);
        return;
      }

      // First try to fetch with all columns including training certificates
      // If migration hasn't been run, fall back to base columns
      let { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, app_role, position_title, site_id, home_site, phone_number, pin_code, last_login, food_safety_level, food_safety_expiry_date, h_and_s_level, h_and_s_expiry_date, fire_marshal_trained, fire_marshal_expiry_date, first_aid_trained, first_aid_expiry_date, cossh_trained, cossh_expiry_date")
        .eq("company_id", companyId)
        .order("full_name");

      // If error suggests missing columns (training certificates), try with base columns only
      if (error && (error.message?.includes('column') || error.code === 'PGRST116' || error.message?.includes('does not exist'))) {
        // Check if it's a training certificate column error
        const isTrainingCertError = error.message?.includes('food_safety') || 
                                  error.message?.includes('h_and_s') || 
                                  error.message?.includes('fire_marshal') || 
                                  error.message?.includes('first_aid') || 
                                  error.message?.includes('cossh');
        
        if (isTrainingCertError) {
          console.warn("Training certificate columns not found, using base columns only. Run migration to enable certificate tracking.");
          const baseResult = await supabase
            .from("profiles")
            .select("id, full_name, email, app_role, position_title, site_id, home_site, phone_number, pin_code, last_login")
            .eq("company_id", companyId)
            .order("full_name");
          
          data = baseResult.data;
          error = baseResult.error;
          
          // Add default values for training certificate fields
          if (data && !error) {
            data = data.map(user => ({
              ...user,
              food_safety_level: null,
              food_safety_expiry_date: null,
              h_and_s_level: null,
              h_and_s_expiry_date: null,
              fire_marshal_trained: false,
              fire_marshal_expiry_date: null,
              first_aid_trained: false,
              first_aid_expiry_date: null,
              cossh_trained: false,
              cossh_expiry_date: null,
            }));
          }
        }
      }

      if (error) {
        console.error("Failed to fetch users:", error);
        setUsers([]);
        return;
      }

      setUsers(data || []);
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
    }
  }, [companyId, viewArchived]);

  const fetchSites = useCallback(async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("sites")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      setSites(data || []);
    } catch (error: any) {
      console.error("Failed to fetch sites:", error);
    }
  }, [companyId]);

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

      // Try to update with all fields
      let { error } = await supabase
        .from("profiles")
        .update(dbUpdates)
        .eq("id", userId);

      // If error suggests missing columns (training certificate columns), 
      // filter them out and try again with base columns only
      if (error && (error.message?.includes('column') || error.code === 'PGRST116')) {
        const isTrainingCertError = error.message?.includes('food_safety') || 
                                  error.message?.includes('h_and_s') || 
                                  error.message?.includes('fire_marshal') || 
                                  error.message?.includes('first_aid') || 
                                  error.message?.includes('cossh');
        
        if (isTrainingCertError) {
          console.warn("Training certificate columns not found. Saving base fields only.");
          const baseFields = ['full_name', 'email', 'app_role', 'position_title', 'site_id', 'home_site', 'phone_number', 'pin_code', 'boh_foh'];
          const filteredUpdates: any = {};
          Object.keys(dbUpdates).forEach(key => {
            if (baseFields.includes(key)) {
              filteredUpdates[key] = dbUpdates[key];
            }
          });
          
          if (Object.keys(filteredUpdates).length > 0) {
            const baseResult = await supabase
              .from("profiles")
              .update(filteredUpdates)
              .eq("id", userId);
            error = baseResult.error;
          }
        }
      }

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
      // Get the user profile first
      const { data: userProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (fetchError) throw fetchError;

      // Get current user for archived_by
      const { data: { session } } = await supabase.auth.getSession();
      const archivedBy = session?.user?.id || null;

      // Insert into archived_users table
      const { error: archiveError } = await supabase
        .from("archived_users")
        .insert({
          original_id: userId,
          auth_user_id: userProfile.auth_user_id,
          email: userProfile.email,
          full_name: userProfile.full_name,
          company_id: userProfile.company_id,
          site_id: userProfile.site_id || userProfile.home_site, // Use site_id or home_site
          role: userProfile.app_role,
          position: userProfile.position_title, // Use position field (not position_title)
          boh_foh: userProfile.boh_foh,
          last_login: userProfile.last_login,
          pin_code: userProfile.pin_code,
          phone_number: userProfile.phone_number,
          app_role: userProfile.app_role,
          archived_by: archivedBy,
          archived_at: new Date().toISOString(),
        });

      if (archiveError) throw archiveError;

      // Delete from profiles table
      const { error: deleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (deleteError) throw deleteError;

      // Remove from local state
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

      // Get the archived user - userId is the original_id when viewing archived
      const { data: archivedUser, error: fetchError } = await supabase
        .from("archived_users")
        .select("*")
        .eq("original_id", userId)
        .order("archived_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      // Restore to profiles table
      const { error: restoreError } = await supabase
        .from("profiles")
        .insert({
          id: archivedUser.original_id,
          auth_user_id: archivedUser.auth_user_id,
          email: archivedUser.email,
          full_name: archivedUser.full_name,
          company_id: archivedUser.company_id,
          site_id: archivedUser.site_id,
          home_site: archivedUser.site_id, // Use site_id as home_site fallback
          app_role: archivedUser.app_role,
          position_title: archivedUser.position || null, // Use position field from archived_users
          boh_foh: archivedUser.boh_foh,
          last_login: archivedUser.last_login,
          pin_code: archivedUser.pin_code,
          phone_number: archivedUser.phone_number,
        });

      if (restoreError) throw restoreError;

      // Delete from archived_users
      const { error: deleteError } = await supabase
        .from("archived_users")
        .delete()
        .eq("id", archivedUser.id);

      if (deleteError) throw deleteError;

      // Refresh users list
      await fetchUsers();

      console.log("User unarchived successfully");
      // Show success message
      alert("User restored successfully");
    } catch (error: any) {
      console.error("Failed to unarchive user:", error);
      alert(`Failed to restore user: ${error.message || 'Unknown error'}`);
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
        <div className="text-slate-400">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search, toggle, and add button */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder={viewArchived ? "Search archived users..." : "Search users..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Archive Toggle Button */}
          <Tooltip label={viewArchived ? "Back to Users" : "Archived"} side="top">
            <button
              onClick={async () => {
                const newViewArchived = !viewArchived;
                setViewArchived(newViewArchived);
                setSearchQuery(""); // Clear search when toggling
                // Explicitly fetch users after state update
                setLoading(true);
                try {
                  if (newViewArchived) {
                    // Fetch archived users - only select columns that exist
                    const { data, error } = await supabase
                      .from("archived_users")
                      .select("id, original_id, full_name, email, app_role, position, site_id, archived_at")
                      .eq("company_id", companyId)
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
                        position_title: archived.position || null, // Use position field
                        site_id: archived.site_id,
                        home_site: archived.site_id, // Use site_id as home_site fallback
                        phone_number: null, // Not available in archived_users
                        pin_code: null, // Not available in archived_users
                        last_login: null, // Not available in archived_users
                        archived_at: archived.archived_at,
                        isArchived: true,
                      }));
                      setUsers(mappedData);
                    }
                  } else {
                    // Fetch active users - inline to avoid stale closure
                    let { data, error } = await supabase
                      .from("profiles")
                      .select("id, full_name, email, app_role, position_title, site_id, home_site, phone_number, pin_code, last_login, food_safety_level, food_safety_expiry_date, h_and_s_level, h_and_s_expiry_date, fire_marshal_trained, fire_marshal_expiry_date, first_aid_trained, first_aid_expiry_date, cossh_trained, cossh_expiry_date")
                      .eq("company_id", companyId)
                      .order("full_name");

                    // Handle training certificate columns fallback
                    if (error && (error.message?.includes('column') || error.code === 'PGRST116' || error.message?.includes('does not exist'))) {
                      const isTrainingCertError = error.message?.includes('food_safety') || 
                                                error.message?.includes('h_and_s') || 
                                                error.message?.includes('fire_marshal') || 
                                                error.message?.includes('first_aid') || 
                                                error.message?.includes('cossh');
                      
                      if (isTrainingCertError) {
                        const baseResult = await supabase
                          .from("profiles")
                          .select("id, full_name, email, app_role, position_title, site_id, home_site, phone_number, pin_code, last_login")
                          .eq("company_id", companyId)
                          .order("full_name");
                        
                        data = baseResult.data;
                        error = baseResult.error;
                        
                        if (data && !error) {
                          data = data.map(user => ({
                            ...user,
                            food_safety_level: null,
                            food_safety_expiry_date: null,
                            h_and_s_level: null,
                            h_and_s_expiry_date: null,
                            fire_marshal_trained: false,
                            fire_marshal_expiry_date: null,
                            first_aid_trained: false,
                            first_aid_expiry_date: null,
                            cossh_trained: false,
                            cossh_expiry_date: null,
                          }));
                        }
                      }
                    }

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
                  ? "border-[#EC4899] text-[#EC4899] bg-transparent hover:bg-white/[0.04] hover:shadow-[0_0_12px_rgba(236,72,153,0.25)]"
                  : "border-orange-400 text-orange-400 bg-transparent hover:bg-white/[0.04] hover:shadow-[0_0_8px_#fb923c]"
              }`}
              aria-label={viewArchived ? "Back to Users" : "View Archived"}
            >
              {viewArchived ? <ChevronLeft className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
            </button>
          </Tooltip>

          {/* Add User Button - hidden when viewing archived */}
          {(role === "Admin" || role === "Manager") && !viewArchived && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          )}
        </div>
      </div>

      {/* Users list */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
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
                  { label: "Admin", value: "Admin" },
                  { label: "Manager", value: "Manager" },
                  { label: "Staff", value: "Staff" }
                ]}
                onRoleChange={(userId: string, role: string) => {
                  setEditForms(prev => ({
                    ...prev,
                    [userId]: { ...prev[userId], app_role: role }
                  }));
                }}
                onSave={() => handleUserUpdate(user.id, editForm)}
                onCancel={() => {
                  setEditForms(prev => ({ ...prev, [user.id]: { ...user } }));
                }}
                showPinEdit={false}
                onPinEditToggle={() => {}}
                onPinGenerate={() => {
                  const newPin = Math.floor(1000 + Math.random() * 9000).toString();
                  setEditForms(prev => ({
                    ...prev,
                    [user.id]: { ...prev[user.id], pin_code: newPin }
                  }));
                }}
                siteOptions={sites.map(site => ({ label: site.name, value: site.id }))}
                onArchive={viewArchived ? undefined : handleUserArchive}
                onUnarchive={viewArchived ? handleUserUnarchive : undefined}
              />
            );
          })
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && companyId && (
        <LazyAddUserModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          companyId={companyId}
          onRefresh={fetchUsers}
        />
      )}
    </div>
  );
}