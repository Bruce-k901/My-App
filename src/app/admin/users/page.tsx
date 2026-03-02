"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  Search, 
  Building2,
  Mail,
  Calendar,
  Loader2,
  Shield,
  User
} from '@/components/ui/icons';

interface PlatformUser {
  id: string;
  full_name: string | null;
  email: string;
  app_role: string;
  last_login: string | null;
  created_at: string;
  company_id: string | null;
  company_name?: string;
  is_platform_admin: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      // Fetch all users
      const { data: usersData, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, app_role, last_login, created_at, company_id, is_platform_admin')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch company names
      const companyIds = [...new Set((usersData || []).map(u => u.company_id).filter(Boolean))];
      let companiesMap: Record<string, string> = {};

      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds);

        if (companies) {
          companiesMap = companies.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});
        }
      }

      // Enrich users with company names
      const enrichedUsers = (usersData || []).map(user => ({
        ...user,
        company_name: user.company_id ? companiesMap[user.company_id] : undefined
      }));

      setUsers(enrichedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.company_name?.toLowerCase().includes(searchLower)
    );
  });

  const getRoleBadgeColor = (role: string, isAdmin: boolean) => {
    if (isAdmin) return 'bg-[#D37E91]/20 text-[#D37E91] border-[#D37E91]/30';
    switch (role?.toLowerCase()) {
      case 'owner': return 'bg-purple-50 text-purple-600 border-purple-200';
      case 'admin': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'manager': return 'bg-green-50 text-green-600 border-green-200';
      default: return 'bg-theme-surface-elevated0/20 text-theme-tertiary border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-theme-primary mb-2">All Users</h1>
          <p className="text-theme-tertiary">View all users across the platform</p>
        </div>
        <div className="text-theme-tertiary text-sm">
          {users.length} total users
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-theme-tertiary w-5 h-5" />
        <input
          type="text"
          placeholder="Search by name, email, or company..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-black/[0.12] rounded-xl text-theme-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40 focus:border-[#D37E91]/40"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-4 text-theme-tertiary font-medium">User</th>
              <th className="text-left p-4 text-theme-tertiary font-medium">Company</th>
              <th className="text-left p-4 text-theme-tertiary font-medium">Role</th>
              <th className="text-left p-4 text-theme-tertiary font-medium">Last Active</th>
              <th className="text-left p-4 text-theme-tertiary font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      {user.is_platform_admin ? (
                        <Shield className="w-5 h-5 text-[#D37E91]" />
                      ) : (
                        <User className="w-5 h-5 text-theme-tertiary" />
                      )}
                    </div>
                    <div>
                      <div className="text-theme-primary font-medium">{user.full_name || 'No name'}</div>
                      <div className="text-theme-tertiary text-sm flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  {user.company_name ? (
                    <div className="flex items-center gap-2 text-theme-secondary">
                      <Building2 className="w-4 h-4 text-theme-tertiary" />
                      {user.company_name}
                    </div>
                  ) : (
                    <span className="text-theme-tertiary">—</span>
                  )}
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.app_role, user.is_platform_admin)}`}>
                    {user.is_platform_admin ? 'Platform Admin' : (user.app_role || 'User')}
                  </span>
                </td>
                <td className="p-4 text-theme-tertiary text-sm">
                  {user.last_login 
                    ? new Date(user.last_login).toLocaleDateString()
                    : 'Never'
                  }
                </td>
                <td className="p-4 text-theme-tertiary text-sm">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-theme-tertiary">
              {searchTerm ? 'No users match your search' : 'No users found'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

