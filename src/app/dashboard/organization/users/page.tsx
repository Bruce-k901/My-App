"use client";

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Filter, UserPlus, Edit, Trash2, Shield, Mail, Phone, MapPin } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  site_id?: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

export default function UsersPage() {
  const { profile } = useAppContext();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  useEffect(() => {
    if (profile?.company_id) {
      loadUsers();
    }
  }, [profile?.company_id]);

  const loadUsers = async () => {
    if (!profile?.company_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.first_name && user.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (user.last_name && user.last_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const roles = [...new Set(users.map(user => user.role))];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'manager': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'team': return 'text-green-400 bg-green-500/10 border-green-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const handleEditUser = (userId: string) => {
    console.log('Editing user:', userId);
    // TODO: Implement edit user functionality
  };

  const handleDeleteUser = (userId: string) => {
    console.log('Deleting user:', userId);
    // TODO: Implement delete user functionality
  };

  const handleInviteUser = () => {
    console.log('Inviting new user');
    // TODO: Implement invite user functionality
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-magenta-600/20 to-blue-600/20 rounded-2xl p-6 border border-magenta-500/30">
        <h1 className="text-2xl font-semibold mb-2">Users</h1>
        <p className="text-neutral-300 text-sm">Manage team members and their access permissions</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/40"
          />
        </div>
        
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500/40"
        >
          <option value="all">All Roles</option>
          {roles.map(role => (
            <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
          ))}
        </select>

        <button 
          onClick={handleInviteUser}
          className="flex items-center gap-2 px-4 py-2 bg-pink-500/20 border border-pink-500/40 rounded-lg text-pink-300 hover:bg-pink-500/30 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No users found</h3>
            <p className="text-gray-400">Invite your first team member to get started</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                      {user.first_name ? user.first_name[0] : user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">
                        {user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}` 
                          : user.email
                        }
                      </h3>
                      <p className="text-gray-400 text-sm">{user.email}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                    {!user.is_active && (
                      <span className="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
                        Inactive
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-400 mb-3">
                    {user.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    {user.site_id && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>Site ID: {user.site_id}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {user.last_login && (
                    <p className="text-xs text-gray-500">
                      Last login: {new Date(user.last_login).toLocaleDateString()}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditUser(user.id)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Edit User"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete User"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
