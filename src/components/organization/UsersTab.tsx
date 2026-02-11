"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import UserEntityCard from "@/components/users/UserEntityCard";
// Import directly to avoid caching issues - remove lazy loading temporarily
import AddUserModal from "@/components/users/AddUserModal";
import { Plus, Search, Archive, ChevronLeft, Upload, Download } from '@/components/ui/icons';
import { Tooltip } from "@/components/ui/tooltip/Tooltip";
import Papa from "papaparse";
import * as XLSX from "xlsx";

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
  status?: string | null; // onboarding, active, inactive, on_leave
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
  const { companyId, role, company } = useAppContext();
  
  // Use selected company from context (for multi-company support)
  const effectiveCompanyId = company?.id || companyId;
  
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [editForms, setEditForms] = useState<Record<string, any>>({});
  const [viewArchived, setViewArchived] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUsers = useCallback(async () => {
    if (!effectiveCompanyId) return;

    try {
      if (viewArchived) {
        // Fetch archived users - only select columns that exist
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

      // Use RPC function to bypass RLS and get all company profiles
      // This function is SECURITY DEFINER and explicitly bypasses RLS
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_company_profiles', {
        p_company_id: effectiveCompanyId
      });

      let data: any[] = [];
      let error: any = null;

      if (rpcError) {
        console.error("❌ RPC function error:", rpcError);
        // Fallback to direct query (will only work if RLS policy allows)
        const fallbackResult = await supabase
          .from("profiles")
          .select("id, full_name, email, app_role, position_title, site_id, home_site, phone_number, pin_code, last_login, food_safety_level, food_safety_expiry_date, h_and_s_level, h_and_s_expiry_date, fire_marshal_trained, fire_marshal_expiry_date, first_aid_trained, first_aid_expiry_date, cossh_trained, cossh_expiry_date")
          .eq("company_id", effectiveCompanyId)
          .order("full_name");
        
        data = fallbackResult.data || [];
        error = fallbackResult.error;
      } else if (rpcData) {
        // Map RPC result to expected format
        // RPC returns: profile_id, full_name, email, phone_number, avatar_url, position_title, department, home_site, status, start_date, app_role, company_id
        data = rpcData.map((p: any) => ({
          id: p.profile_id,
          full_name: p.full_name,
          email: p.email,
          app_role: p.app_role,
          position_title: p.position_title,
          site_id: p.home_site,
          home_site: p.home_site,
          phone_number: p.phone_number,
          pin_code: null, // Not returned by RPC function
          last_login: null, // Not returned by RPC function
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
        
        // Try to fetch additional fields for current user (pin_code, last_login, training certs)
        // This will only work for the current user due to RLS
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) {
            const { data: ownProfile } = await supabase
              .from("profiles")
              .select("id, pin_code, last_login, food_safety_level, food_safety_expiry_date, h_and_s_level, h_and_s_expiry_date, fire_marshal_trained, fire_marshal_expiry_date, first_aid_trained, first_aid_expiry_date, cossh_trained, cossh_expiry_date")
              .eq("id", user.id)
              .maybeSingle();
            
            // Merge additional fields if found
            if (ownProfile) {
              const ownIndex = data.findIndex((u: any) => u.id === ownProfile.id);
              if (ownIndex >= 0) {
                data[ownIndex] = {
                  ...data[ownIndex],
                  pin_code: ownProfile.pin_code,
                  last_login: ownProfile.last_login,
                  food_safety_level: ownProfile.food_safety_level,
                  food_safety_expiry_date: ownProfile.food_safety_expiry_date,
                  h_and_s_level: ownProfile.h_and_s_level,
                  h_and_s_expiry_date: ownProfile.h_and_s_expiry_date,
                  fire_marshal_trained: ownProfile.fire_marshal_trained,
                  fire_marshal_expiry_date: ownProfile.fire_marshal_expiry_date,
                  first_aid_trained: ownProfile.first_aid_trained,
                  first_aid_expiry_date: ownProfile.first_aid_expiry_date,
                  cossh_trained: ownProfile.cossh_trained,
                  cossh_expiry_date: ownProfile.cossh_expiry_date,
                };
              }
            }
          }
        } catch (mergeError) {
          console.warn("Could not merge additional profile fields:", mergeError);
          // Continue without additional fields
        }
      }

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
            .eq("company_id", effectiveCompanyId)
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
        console.error("❌ Failed to fetch users:", error);
        const errorMessage = error.message || error.code || "Unknown error";
        console.error("Full error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          status: (error as any).status,
        });
        
        // If it's a 406 error (RLS blocking), log helpful message
        if (error.code === 'PGRST116' || error.message?.includes('406') || (error as any).status === 406) {
          console.error("🚨 RLS is blocking user list query. Check profiles_select_company policy.");
        }
        setUsers([]);
        setLoading(false);
        return;
      }

      if (data) {
        console.log(`✅ Fetched ${data.length} users for company ${effectiveCompanyId}`, {
          userIds: data.map(u => u.id),
          emails: data.map(u => u.email),
        });
        setUsers(data);
      } else {
        console.warn("⚠️ No users data returned (empty array or null)");
        setUsers([]);
      }
      setLoading(false);
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
      const errorMessage = error?.message || "Unknown error";
      console.error("Exception details:", errorMessage);
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
      // If home_site is being updated, also update site_id (for org chart)
      if (dbUpdates.home_site !== undefined) {
        dbUpdates.site_id = dbUpdates.home_site;
      }
      // If site_id is being updated, also update home_site (for consistency)
      if (dbUpdates.site_id !== undefined && dbUpdates.home_site === undefined) {
        dbUpdates.home_site = dbUpdates.site_id;
      }
      
      // Handle explicit null values (moving to head office)
      // This ensures both fields are properly set to null when moving someone to head office
      if (dbUpdates.site_id === null || dbUpdates.home_site === null) {
        dbUpdates.site_id = null;
        dbUpdates.home_site = null;
      }

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
          const baseFields = ['full_name', 'email', 'app_role', 'position_title', 'site_id', 'home_site', 'phone_number', 'pin_code', 'boh_foh', 'status'];
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

  // Download users as CSV/XLSX
  const handleDownload = () => {
    try {
      const fields = [
        "full_name",
        "email",
        "app_role",
        "position_title",
        "phone_number",
        "site_id",
        "food_safety_level",
        "food_safety_expiry_date",
        "h_and_s_level",
        "h_and_s_expiry_date",
        "fire_marshal_trained",
        "fire_marshal_expiry_date",
        "first_aid_trained",
        "first_aid_expiry_date",
        "cossh_trained",
        "cossh_expiry_date"
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
        // Add site name lookup
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

      console.log("Users exported successfully");
    } catch (e: any) {
      console.error("Export failed:", e?.message || "Unable to export");
      alert(`Export failed: ${e?.message || "Unable to export"}`);
    }
  };

  // Upload users from CSV
  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (viewArchived) {
      alert("Cannot upload users while viewing archived users. Please go back to active users first.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        try {
          await handleImport(data as any[]);
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = "";
          setUploading(false);
        }
      },
      error: (err) => {
        console.error("Upload failed:", err.message || "Parsing error");
        alert(`Upload failed: ${err.message || "Parsing error"}`);
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  };

  const handleImport = async (rows: any[]) => {
    try {
      if (!effectiveCompanyId) {
        alert("Upload failed: Company not loaded yet.");
        return;
      }

      // Required fields
      const required = ["email", "full_name"];
      const valid = rows.filter(r => 
        required.every(f => r[f] && String(r[f]).trim() !== "")
      );

      if (valid.length === 0) {
        alert("Upload failed: No valid rows found. Required fields: email, full_name");
        return;
      }

      // Check for existing users by email to avoid duplicates
      const emails = valid.map(r => String(r.email).trim().toLowerCase());
      const { data: existingUsers } = await supabase
        .from("profiles")
        .select("email")
        .eq("company_id", effectiveCompanyId)
        .in("email", emails);

      const existingEmails = new Set(
        (existingUsers || []).map(u => u.email?.toLowerCase()).filter(Boolean)
      );

      const newUsers = valid.filter(r => 
        !existingEmails.has(String(r.email).trim().toLowerCase())
      );

      if (newUsers.length === 0) {
        alert("All users in the file already exist. No new users to import.");
        return;
      }

      if (newUsers.length < valid.length) {
        alert(`Warning: ${valid.length - newUsers.length} user(s) already exist and were skipped.`);
      }

      // Get site names to IDs mapping
      const siteNameMap = new Map(sites.map(s => [s.name.toLowerCase(), s.id]));

      // Prepare payload for new user creation
      // Note: User creation requires auth.signUp, so we'll need to handle this differently
      // For now, we'll just log the users that would be created
      alert(`Found ${newUsers.length} new user(s) to import. User creation requires email invitations - please use the "Add User" button to invite users individually, or contact support for bulk user import.`);
      
      console.log("Users that would be imported:", newUsers);
    } catch (e: any) {
      console.error("Upload failed:", e?.message || "Unexpected error");
      alert(`Upload failed: ${e?.message || "Unexpected error"}`);
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
        <div className="text-gray-500 dark:text-slate-400">Loading users...</div>
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
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      .eq("company_id", effectiveCompanyId)
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
                          .eq("company_id", effectiveCompanyId)
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
                  ? "border-[#D37E91] text-[#D37E91] bg-transparent hover:bg-[#D37E91]/10 dark:hover:bg-white/[0.04] hover:shadow-[0_0_12px_rgba(211,126,145,0.25)]"
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
                className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-[#D37E91] text-[#D37E91] bg-transparent hover:bg-[#D37E91]/10 dark:hover:bg-white/[0.04] transition-all duration-150 ease-in-out hover:shadow-[0_0_12px_rgba(211,126,145,0.25)]"
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
              className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-gray-300 dark:border-white/[0.12] bg-gray-50 dark:bg-white/[0.06] text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-white/[0.12] transition-all duration-150 ease-in-out hover:shadow-[0_0_12px_rgba(211,126,145,0.25)]"
              aria-label="Download Users"
            >
              <Download className="h-5 w-5" />
            </button>
          </Tooltip>

          {/* Upload Button - hidden when viewing archived */}
          {(role === "Admin" || role === "Manager") && !viewArchived && (
            <Tooltip label="Upload Users CSV" side="top">
              <button
                onClick={handleUploadClick}
                disabled={uploading}
                className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-gray-300 dark:border-white/[0.12] bg-gray-50 dark:bg-white/[0.06] text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-white/[0.12] transition-all duration-150 ease-in-out hover:shadow-[0_0_12px_rgba(211,126,145,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Upload Users"
              >
                <Upload className="h-5 w-5" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Hidden file input for CSV upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* Users list */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-slate-400">
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