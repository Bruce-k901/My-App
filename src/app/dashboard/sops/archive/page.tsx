"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Archive, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface ArchivedSOP {
  id: string;
  title: string;
  sop_type: string | null;
  archived_at: string | null;
  archived_by: string | null;
  version_number: number | null;
}

export default function SOPsArchivePage() {
  const { companyId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [sops, setSops] = useState<ArchivedSOP[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (companyId) {
      loadArchivedSOPs();
    }
  }, [companyId]);

  async function loadArchivedSOPs() {
    if (!companyId) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('sop_entries')
        .select('*')
        .eq('company_id', companyId)
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false });

      if (error) throw error;
      setSops(data || []);
    } catch (error: any) {
      console.error('Error loading archived SOPs:', error);
      toast.error(error?.message || 'Failed to load archived SOPs');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(id: string) {
    if (!confirm('Restore this SOP?')) return;
    
    try {
      const { error } = await supabase
        .from('sop_entries')
        .update({ archived_at: null, archived_by: null })
        .eq('id', id);
      
      if (error) throw error;
      await loadArchivedSOPs();
      toast.success('SOP restored');
    } catch (error: any) {
      console.error('Error restoring SOP:', error);
      toast.error(error?.message || 'Failed to restore SOP');
    }
  }

  const filteredSOPs = sops.filter(sop =>
    sop.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#EC4899] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/sops/list"
          className="p-2 rounded-lg bg-[rgb(var(--surface-elevated))] dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-[rgb(var(--text-tertiary))] dark:text-white/60 hover:text-[rgb(var(--text-primary))] dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">Archived SOPs</h1>
          <p className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm mt-1">View and restore archived SOPs</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search archived SOPs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[rgb(var(--surface-elevated))] dark:bg-white/5 border border-[rgb(var(--border))] dark:border-white/10 rounded-lg text-[rgb(var(--text-primary))] dark:text-white placeholder:text-[rgb(var(--text-tertiary))] dark:placeholder:text-white/40 focus:outline-none focus:border-[#EC4899] dark:focus:border-[#EC4899]"
        />
        <Archive className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--text-tertiary))] dark:text-white/40" />
      </div>

      {/* SOP List */}
      {filteredSOPs.length === 0 ? (
        <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl p-12 text-center">
          <Archive className="w-16 h-16 text-[rgb(var(--text-tertiary))] dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white mb-2">
            {sops.length === 0 ? 'No archived SOPs' : 'No matching SOPs'}
          </h3>
          <p className="text-[rgb(var(--text-secondary))] dark:text-white/60">
            {sops.length === 0 
              ? 'Archived SOPs will appear here'
              : 'Try adjusting your search'
            }
          </p>
        </div>
      ) : (
        <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgb(var(--border))] dark:border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Version</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Archived</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSOPs.map((sop) => (
                  <tr key={sop.id} className="border-b border-[rgb(var(--border))] dark:border-white/[0.03] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-[rgb(var(--text-primary))] dark:text-white font-medium">{sop.title}</td>
                    <td className="px-4 py-3 text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm">{sop.sop_type || '-'}</td>
                    <td className="px-4 py-3 text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm">v{sop.version_number || '1.0'}</td>
                    <td className="px-4 py-3 text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm">
                      {sop.archived_at 
                        ? new Date(sop.archived_at).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRestore(sop.id)}
                        className="px-3 py-1.5 bg-[#EC4899]/10 dark:bg-[#EC4899]/10 hover:bg-[#EC4899]/20 dark:hover:bg-[#EC4899]/20 text-[#EC4899] dark:text-[#EC4899] border border-[#EC4899]/30 dark:border-[#EC4899]/30 rounded-lg transition-colors text-sm"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
