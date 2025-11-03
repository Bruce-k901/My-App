"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import UserEntityCard from "@/components/users/UserEntityCard";
import LazyAddUserModal from "@/components/users/LazyAddUserModal";
import { Plus, Search } from "lucide-react";

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
  app_role: string | null;
  position_title: string | null;
  site_id: string | null;
  phone_number: string | null;
  pin_code: string | null;
  last_login: string | null;
  archived?: boolean;
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

  const fetchUsers = useCallback(async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, app_role, position_title, site_id, phone_number, pin_code, last_login")
        .eq("company_id", companyId)
        .order("full_name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
    }
  }, [companyId]);

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
  }, [fetchUsers, fetchSites]);

  const handleUserUpdate = async (userId: string, updates: Partial<User>) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      ));

      console.log("User updated successfully");
    } catch (error: any) {
      console.error("Failed to update user:", error);
    }
  };

  const handleUserArchive = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ archived: true })
        .eq("id", userId);

      if (error) throw error;

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, archived: true } : user
      ));

      console.log("User archived successfully");
    } catch (error: any) {
      console.error("Failed to archive user:", error);
    }
  };

  const handleUserUnarchive = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ archived: false })
        .eq("id", userId);

      if (error) throw error;

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, archived: false } : user
      ));

      console.log("User unarchived successfully");
    } catch (error: any) {
      console.error("Failed to unarchive user:", error);
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
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {(role === "Admin" || role === "Manager") && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        )}
      </div>

      {/* Users list */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            {searchQuery ? "No users found matching your search." : "No users found."}
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
                onArchive={handleUserArchive}
                onUnarchive={handleUserUnarchive}
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