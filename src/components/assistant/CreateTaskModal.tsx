'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, ClipboardList, Check } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (assigneeProfileId: string, taskName: string, instructions: string, dueDate: string, priority: string) => void;
  initialName?: string;
  initialInstructions?: string;
  companyId: string;
}

function getDefaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  initialName,
  initialInstructions,
  companyId,
}: CreateTaskModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [taskName, setTaskName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTaskName(initialName || '');
      setInstructions(initialInstructions || '');
      setDueDate(getDefaultDueDate());
      setPriority('medium');
      setSelectedProfile(null);
      setSearchTerm('');
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen, initialName, initialInstructions]);

  // Fetch company profiles
  useEffect(() => {
    if (!isOpen || !companyId) return;

    const fetchProfiles = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('company_id', companyId)
        .order('full_name');

      setProfiles(data || []);
      setLoading(false);
    };

    fetchProfiles();
  }, [isOpen, companyId]);

  const filteredProfiles = profiles.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term)
    );
  });

  const handleSubmit = () => {
    if (!selectedProfile || !taskName.trim() || !dueDate) return;
    onSubmit(selectedProfile.id, taskName.trim(), instructions.trim(), dueDate, priority);
  };

  const priorities = [
    { value: 'low', label: 'Low', color: isDark ? 'text-blue-400' : 'text-blue-600' },
    { value: 'medium', label: 'Medium', color: isDark ? 'text-yellow-400' : 'text-yellow-600' },
    { value: 'high', label: 'High', color: isDark ? 'text-orange-400' : 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: isDark ? 'text-red-400' : 'text-red-600' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-md mx-4 max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col ${
        isDark ? 'bg-[#0f1220] border border-[#1e2340]' : 'bg-white border border-gray-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          isDark ? 'border-[#1e2340] bg-[#131729]' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${
              isDark ? 'bg-[#161b2e] border border-[#252b42]' : 'bg-[#D37E91]/10 border border-[#D37E91]/20'
            }`}>
              <ClipboardList className="w-4 h-4 text-[#D37E91]" />
            </div>
            <h3 className={`font-semibold text-sm ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>Create Task</h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/[0.06] text-white/40' : 'hover:bg-gray-100 text-gray-400'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {/* Assignee selector */}
          {selectedProfile ? (
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${
                isDark ? 'text-white/50' : 'text-gray-500'
              }`}>Assigned to</label>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                isDark ? 'bg-[#D37E91]/10 border border-[#D37E91]/30' : 'bg-[#D37E91]/10 border border-[#D37E91]/20'
              }`}>
                <Check className="w-3.5 h-3.5 text-[#D37E91]" />
                <span className={`text-sm font-medium flex-1 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>{selectedProfile.full_name || selectedProfile.email}</span>
                <button
                  onClick={() => setSelectedProfile(null)}
                  className={`p-0.5 rounded transition-colors ${
                    isDark ? 'hover:bg-white/[0.1] text-white/40' : 'hover:bg-gray-200 text-gray-400'
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${
                  isDark ? 'text-white/50' : 'text-gray-500'
                }`}>Assign to</label>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    isDark ? 'text-white/30' : 'text-gray-400'
                  }`} />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search team members..."
                    className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                      isDark
                        ? 'bg-[#161b2e] border-[#252b42] text-white placeholder-white/30 focus:ring-[#303754]'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#D37E91]/40'
                    }`}
                  />
                </div>
              </div>

              <div className={`max-h-[160px] overflow-y-auto rounded-lg border ${
                isDark ? 'border-[#1e2340]' : 'border-gray-200'
              }`}>
                {loading ? (
                  <div className={`p-4 text-center text-sm ${
                    isDark ? 'text-white/40' : 'text-gray-400'
                  }`}>Loading...</div>
                ) : filteredProfiles.length === 0 ? (
                  <div className={`p-4 text-center text-sm ${
                    isDark ? 'text-white/40' : 'text-gray-400'
                  }`}>No team members found</div>
                ) : (
                  filteredProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => setSelectedProfile(profile)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${
                        isDark
                          ? 'hover:bg-white/[0.04] border-b border-[#1e2340] last:border-b-0'
                          : 'hover:bg-gray-50 border-b border-gray-100 last:border-b-0'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                        isDark ? 'bg-[#D37E91]/20 text-[#D37E91]' : 'bg-[#D37E91]/10 text-[#D37E91]'
                      }`}>
                        {(profile.full_name || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-medium truncate ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>{profile.full_name || 'Unknown'}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {/* Task name */}
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${
              isDark ? 'text-white/50' : 'text-gray-500'
            }`}>Task name</label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="What needs to be done?"
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                isDark
                  ? 'bg-[#161b2e] border-[#252b42] text-white placeholder-white/30 focus:ring-[#303754]'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#D37E91]/40'
              }`}
            />
          </div>

          {/* Instructions */}
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${
              isDark ? 'text-white/50' : 'text-gray-500'
            }`}>Instructions (optional)</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Additional details or context..."
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 ${
                isDark
                  ? 'bg-[#161b2e] border-[#252b42] text-white placeholder-white/30 focus:ring-[#303754]'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-[#D37E91]/40'
              }`}
            />
          </div>

          {/* Due date + Priority row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={`block text-xs font-medium mb-1.5 ${
                isDark ? 'text-white/50' : 'text-gray-500'
              }`}>Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                  isDark
                    ? 'bg-[#161b2e] border-[#252b42] text-white focus:ring-[#303754] [color-scheme:dark]'
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-[#D37E91]/40'
                }`}
              />
            </div>
            <div className="flex-1">
              <label className={`block text-xs font-medium mb-1.5 ${
                isDark ? 'text-white/50' : 'text-gray-500'
              }`}>Priority</label>
              <div className="flex gap-1">
                {priorities.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className={`flex-1 px-1.5 py-2 rounded-lg text-xs font-medium transition-colors border ${
                      priority === p.value
                        ? isDark
                          ? `bg-white/[0.08] border-white/20 ${p.color}`
                          : `bg-gray-100 border-gray-300 ${p.color}`
                        : isDark
                          ? 'bg-transparent border-[#252b42] text-white/30 hover:bg-white/[0.04]'
                          : 'bg-transparent border-gray-200 text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-2 px-4 py-3 border-t ${
          isDark ? 'border-[#1e2340]' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDark
                ? 'text-white/50 hover:bg-white/[0.06]'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedProfile || !taskName.trim() || !dueDate}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark
                ? 'bg-[#161b2e] border border-[#252b42] text-[#D37E91] hover:bg-[#1c2238] hover:border-[#303754]'
                : 'bg-transparent border border-[#D37E91] text-[#D37E91] hover:bg-[#D37E91]/10'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
