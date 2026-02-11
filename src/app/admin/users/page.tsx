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
      case 'owner': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'admin': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'manager': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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
          <h1 className="text-3xl font-bold text-white mb-2">All Users</h1>
          <p className="text-white/60">View all users across the platform</p>
        </div>
        <div className="text-white/40 text-sm">
          {users.length} total users
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by name, email, or company..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40 focus:border-[#D37E91]/40"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left p-4 text-white/60 font-medium">User</th>
              <th className="text-left p-4 text-white/60 font-medium">Company</th>
              <th className="text-left p-4 text-white/60 font-medium">Role</th>
              <th className="text-left p-4 text-white/60 font-medium">Last Active</th>
              <th className="text-left p-4 text-white/60 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/[0.1] flex items-center justify-center">
                      {user.is_platform_admin ? (
                        <Shield className="w-5 h-5 text-[#D37E91]" />
                      ) : (
                        <User className="w-5 h-5 text-white/60" />
                      )}
                    </div>
                    <div>
                      <div className="text-white font-medium">{user.full_name || 'No name'}</div>
                      <div className="text-white/40 text-sm flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  {user.company_name ? (
                    <div className="flex items-center gap-2 text-white/80">
                      <Building2 className="w-4 h-4 text-white/40" />
                      {user.company_name}
                    </div>
                  ) : (
                    <span className="text-white/40">—</span>
                  )}
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.app_role, user.is_platform_admin)}`}>
                    {user.is_platform_admin ? 'Platform Admin' : (user.app_role || 'User')}
                  </span>
                </td>
                <td className="p-4 text-white/60 text-sm">
                  {user.last_login 
                    ? new Date(user.last_login).toLocaleDateString()
                    : 'Never'
                  }
                </td>
                <td className="p-4 text-white/60 text-sm">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">
              {searchTerm ? 'No users match your search' : 'No users found'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

