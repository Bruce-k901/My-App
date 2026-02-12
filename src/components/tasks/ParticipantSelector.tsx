"use client";

import React, { useState, useEffect } from 'react';
import { X, User, Search } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';

interface ParticipantSelectorProps {
  selectedParticipants: string[];
  onChange: (participants: string[], participantNames?: string[]) => void;
  currentUserId: string;
  companyId: string;
  required?: boolean;
  label?: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role?: string;
  department?: string | null;
  site_id?: string | null;
  sites?: {
    name: string | null;
  } | null;
}

export default function ParticipantSelector({
  selectedParticipants,
  onChange,
  currentUserId,
  companyId,
  required = false,
  label = 'Participants'
}: ParticipantSelectorProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch company users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!companyId) return;
      
      setLoading(true);
      try {
        // Try RPC function first (bypasses RLS)
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_company_profiles', {
          p_company_id: companyId
        });

        if (rpcData && !rpcError) {
          // Map RPC result to UserProfile format
          const mappedUsers = rpcData.map((profile: any) => ({
            id: profile.profile_id,
            full_name: profile.full_name,
            email: profile.email,
            avatar_url: profile.avatar_url,
            role: profile.app_role,
            department: profile.department,
            site_id: profile.home_site,
          }));
          setUsers(mappedUsers);
        } else {
          // Fallback to direct query
          const { data, error } = await supabase
            .from('profiles')
            .select(`
              id,
              full_name,
              email,
              avatar_url,
              app_role,
              department,
              site_id,
              sites:site_id(name)
            `)
            .eq('company_id', companyId)
            .order('full_name');
          
          if (error) throw error;
          setUsers(data || []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [companyId]);

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const name = user.full_name?.toLowerCase() || '';
    const email = user.email?.toLowerCase() || '';
    return name.includes(searchLower) || email.includes(searchLower);
  });

  const selectedUsers = users.filter(u => selectedParticipants.includes(u.id));
  const availableUsers = filteredUsers.filter(u => !selectedParticipants.includes(u.id));

  const handleToggle = (userId: string) => {
    if (selectedParticipants.includes(userId)) {
      // Can't remove current user if they're the only participant
      if (userId === currentUserId && selectedParticipants.length === 1 && required) {
        return;
      }
      const newParticipants = selectedParticipants.filter(id => id !== userId);
      const newNames = users.filter(u => newParticipants.includes(u.id)).map(u => u.full_name || u.email);
      onChange(newParticipants, newNames);
    } else {
      const newParticipants = [...selectedParticipants, userId];
      const newNames = users.filter(u => newParticipants.includes(u.id)).map(u => u.full_name || u.email);
      onChange(newParticipants, newNames);
    }
  };

  const handleRemove = (userId: string) => {
    if (userId === currentUserId && selectedParticipants.length === 1 && required) {
      return;
    }
    const newParticipants = selectedParticipants.filter(id => id !== userId);
    const newNames = users.filter(u => newParticipants.includes(u.id)).map(u => u.full_name || u.email);
    onChange(newParticipants, newNames);
  };

  const canAssignToUser = (targetUserId: string): boolean => {
    // Can always assign to yourself
    if (targetUserId === currentUserId) return true;
    
    // For now, allow all assignments. Permission checks can be added based on role
    // This would check userProfile.role against manager roles
    return true;
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-theme-secondary">
        {label} {required && <span className="text-[#D37E91]">*</span>}
      </label>

      {/* Selected Participants */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedUsers.map((user) => {
            const isCurrentUser = user.id === currentUserId;
            const canRemove = !(isCurrentUser && selectedParticipants.length === 1 && required);
            
            return (
              <div
                key={user.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                  isCurrentUser
                    ? 'bg-gray-100 dark:bg-white/[0.03] border border-theme'
                    : 'bg-[#D37E91]/10 dark:bg-[#D37E91]/20 border border-[#D37E91]/30 dark:border-[#D37E91]/30'
                }`}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || user.email}
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center">
                    <User className="w-3 h-3 text-theme-secondary" />
                  </div>
                )}
                <span className="text-sm text-theme-primary">
                  {user.full_name || user.email}
                  {isCurrentUser && <span className="text-theme-tertiary ml-1">(You)</span>}
                </span>
                {canRemove && (
                  <button
                    onClick={() => handleRemove(user.id)}
                    className="text-theme-tertiary hover:text-theme-secondary transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-left text-sm text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors flex items-center justify-between"
        >
          <span>Add participants...</span>
          <Search className="w-4 h-4" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-1 bg-theme-surface border border-theme rounded-lg shadow-xl max-h-60 overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b border-theme">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-tertiary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              {/* User List */}
              <div className="overflow-y-auto max-h-48">
                {loading ? (
                  <div className="p-4 text-center text-theme-tertiary text-sm">Loading...</div>
                ) : availableUsers.length === 0 ? (
                  <div className="p-4 text-center text-theme-tertiary text-sm">
                    {searchQuery ? 'No users found' : 'All users selected'}
                  </div>
                ) : (
                  availableUsers.map((user) => {
                    const canSelect = canAssignToUser(user.id);
                    
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          if (canSelect) {
                            handleToggle(user.id);
                          }
                        }}
                        disabled={!canSelect}
                        className={`w-full px-4 py-2 text-left hover:bg-theme-surface-elevated dark:hover:bg-white/[0.03] transition-colors flex items-center gap-3 ${
                          !canSelect ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name || user.email}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-theme-secondary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-theme-primary truncate">
                            {user.full_name || user.email}
                          </div>
                          {user.department && (
                            <div className="text-xs text-theme-tertiary truncate">
                              {user.department}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {selectedParticipants.length === 0 && required && (
        <p className="text-xs text-[#D37E91]">At least one participant is required</p>
      )}
    </div>
  );
}
