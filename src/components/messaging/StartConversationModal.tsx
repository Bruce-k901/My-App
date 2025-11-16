"use client";

import { useState, useEffect } from 'react';
import { X, User, Users, Building2, Search } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

interface StartConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function StartConversationModal({
  isOpen,
  onClose,
  onConversationCreated,
}: StartConversationModalProps) {
  const { createConversation } = useConversations({ autoLoad: false });
  const { companyId, siteId } = useAppContext();
  const [conversationType, setConversationType] = useState<'direct' | 'group'>('direct');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Fetch users from the same company
  useEffect(() => {
    if (!isOpen || !companyId) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        let query = supabase
          .from('profiles')
          .select('id, full_name, email')
          .neq('id', currentUser.id);

        if (companyId) {
          query = query.eq('company_id', companyId);
        }

        const { data, error } = await query.order('full_name');

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, companyId]);

  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  const handleUserToggle = (userId: string) => {
    if (conversationType === 'direct') {
      setSelectedUsers([userId]);
    } else {
      setSelectedUsers((prev) =>
        prev.includes(userId)
          ? prev.filter((id) => id !== userId)
          : [...prev, userId]
      );
    }
  };

  // Debug: Log button state
  const isButtonDisabled = 
    creating ||
    selectedUsers.length === 0 ||
    (conversationType === 'group' && !groupName.trim());

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('Modal state:', {
        selectedUsers,
        selectedUsersLength: selectedUsers.length,
        conversationType,
        groupName: groupName.trim(),
        isButtonDisabled,
        usersCount: users.length,
      });
    }
  }, [isOpen, selectedUsers, conversationType, groupName, isButtonDisabled, users.length]);

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;
    if (conversationType === 'group' && !groupName.trim()) return;

    setCreating(true);
    try {
      const conversation = await createConversation(
        conversationType,
        selectedUsers,
        conversationType === 'group' ? groupName.trim() : undefined
      );

      if (conversation) {
        onConversationCreated(conversation.id);
        handleClose();
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setConversationType('direct');
    setSelectedUsers([]);
    setGroupName('');
    setSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#141823] border border-white/[0.1] rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.1]">
          <h2 className="text-xl font-semibold text-white">Start a Conversation</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/[0.1] text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Conversation Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-white/80">Conversation Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setConversationType('direct');
                  setSelectedUsers([]);
                }}
                className={`p-4 rounded-lg border transition-all ${
                  conversationType === 'direct'
                    ? 'border-pink-500 bg-pink-500/10'
                    : 'border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.08]'
                }`}
              >
                <User className={`w-6 h-6 mx-auto mb-2 ${conversationType === 'direct' ? 'text-pink-400' : 'text-white/60'}`} />
                <div className={`text-sm font-medium ${conversationType === 'direct' ? 'text-white' : 'text-white/60'}`}>
                  Direct Message
                </div>
              </button>
              <button
                onClick={() => {
                  setConversationType('group');
                  setSelectedUsers([]);
                }}
                className={`p-4 rounded-lg border transition-all ${
                  conversationType === 'group'
                    ? 'border-pink-500 bg-pink-500/10'
                    : 'border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.08]'
                }`}
              >
                <Users className={`w-6 h-6 mx-auto mb-2 ${conversationType === 'group' ? 'text-pink-400' : 'text-white/60'}`} />
                <div className={`text-sm font-medium ${conversationType === 'group' ? 'text-white' : 'text-white/60'}`}>
                  Group Chat
                </div>
              </button>
            </div>
          </div>

          {/* Group Name Input */}
          {conversationType === 'group' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name..."
                className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
              />
            </div>
          )}

          {/* User Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">
              {conversationType === 'direct' ? 'Select User' : 'Select Users'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
              />
            </div>
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Selected</label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((userId) => {
                  const user = users.find((u) => u.id === userId);
                  return (
                    <div
                      key={userId}
                      className="flex items-center gap-2 px-3 py-1.5 bg-pink-500/20 border border-pink-500/30 rounded-lg"
                    >
                      <span className="text-sm text-white">
                        {user?.full_name || user?.email || 'Unknown'}
                      </span>
                      <button
                        onClick={() => handleUserToggle(userId)}
                        className="text-pink-400 hover:text-pink-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* User List */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Available Users</label>
            {loading ? (
              <div className="text-center py-8 text-white/60 text-sm">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-white/60 text-sm">
                {searchTerm ? 'No users found' : 'No users available'}
              </div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUsers.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        console.log('Toggling user:', user.id, 'Current selected:', selectedUsers);
                        handleUserToggle(user.id);
                      }}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-pink-500/20 border border-pink-500/30'
                          : 'bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-pink-500/30' : 'bg-white/[0.1]'
                        }`}>
                          <User className={`w-5 h-5 ${isSelected ? 'text-pink-400' : 'text-white/60'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {user.full_name || 'No name'}
                          </div>
                          {user.email && (
                            <div className="text-xs text-white/60 truncate">{user.email}</div>
                          )}
                        </div>
                        {isSelected && (
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/[0.1]">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isButtonDisabled}
            className="px-4 py-2 bg-pink-500 text-white text-sm font-medium rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={
              isButtonDisabled
                ? `Disabled: ${creating ? 'Creating...' : selectedUsers.length === 0 ? 'Select at least one user' : conversationType === 'group' && !groupName.trim() ? 'Enter group name' : 'Unknown'}`
                : 'Start conversation'
            }
          >
            {creating ? 'Creating...' : 'Start Conversation'}
          </button>
        </div>
      </div>
    </div>
  );
}

