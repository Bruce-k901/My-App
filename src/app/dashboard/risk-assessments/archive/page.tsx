"use client";

import React, { useState, useEffect } from 'react';
import { Search, FileText, Shield, Edit, RotateCcw, Archive } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import BackButton from '@/components/ui/BackButton';

export default function ArchivedRAsPage() {
  const router = useRouter();
  const { companyId } = useAppContext();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [ras, setRAs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Load archived RAs - show only the original 001 versions
  useEffect(() => {
    const loadRAs = async () => {
      if (!companyId) return;
      
      try {
        setLoading(true);
        // Get all archived RAs
        const { data: allArchived, error } = await supabase
          .from('risk_assessments')
          .select('*')
          .eq('company_id', companyId)
          .eq('status', 'Archived')
          .order('updated_at', { ascending: false });
        
        if (error) throw error;
        
        // Filter to show only 001 versions (original versions)
        const archived001Versions = (allArchived || []).filter((ra: any) => {
          // Check if ref_code ends with -001 or version_number is 1 (if column exists)
          const endsWith001 = ra.ref_code.match(/-001$/);
          const isVersion1 = ra.version_number === 1 || ra.version_number === undefined;
          return endsWith001 || isVersion1;
        });
        
        setRAs(archived001Versions);
      } catch (error) {
        console.error('Error loading archived RAs:', error);
        const errorMessage = error?.message || 'Unknown error occurred';
        showToast({ 
          title: 'Error loading archived RAs', 
          description: errorMessage, 
          type: 'error' 
        });
      } finally {
        setLoading(false);
      }
    };

    loadRAs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const handleEditRA = (ra: any) => {
    const templatePath = ra.template_type === 'coshh' 
      ? '/dashboard/risk-assessments/coshh-template'
      : '/dashboard/risk-assessments/general-template';
    router.push(`${templatePath}?edit=${ra.id}`);
  };

  const handleRestoreRA = async (raId: string) => {
    if (!confirm('Restore this Risk Assessment? It will be moved back to active RAs.')) return;

    try {
      setRestoringId(raId);
      const { error } = await supabase
        .from('risk_assessments')
        .update({ status: 'Draft' })
        .eq('id', raId)
        .eq('company_id', companyId);

      if (error) throw error;

      // Remove from local state
      setRAs(prev => prev.filter(ra => ra.id !== raId));

      showToast({ 
        title: 'RA restored', 
        description: 'RA has been moved back to active RAs', 
        type: 'success' 
      });
    } catch (error: any) {
      console.error('Error restoring RA:', error);
      showToast({ 
        title: 'Error restoring RA', 
        description: error.message || 'Failed to restore RA', 
        type: 'error' 
      });
    } finally {
      setRestoringId(null);
    }
  };

  const filteredRAs = ras.filter((ra: any) => {
    const matchesSearch = ra.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ra.ref_code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      'Published': { icon: Archive, color: 'green', bg: 'bg-green-50 dark:bg-green-500/20', text: 'text-green-700 dark:text-green-400' },
      'Draft': { icon: FileText, color: 'yellow', bg: 'bg-yellow-50 dark:bg-yellow-500/20', text: 'text-yellow-700 dark:text-yellow-400' },
      'Archived': { icon: Archive, color: 'gray', bg: 'bg-gray-100 dark:bg-neutral-700', text: 'text-gray-600 dark:text-neutral-400' }
    };
    return badges[status] || badges['Draft'];
  };

  return (
    <div className="space-y-6">
      <BackButton href="/dashboard/risk-assessments" label="Back to Risk Assessments" />

      <div className="bg-white dark:bg-gradient-to-r dark:from-neutral-700/20 dark:to-neutral-800/20 rounded-2xl p-6 border border-gray-200 dark:border-neutral-700/30">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Archived Risk Assessments</h1>
        <p className="text-gray-600 dark:text-neutral-300 text-sm">View and restore Risk Assessments that have been archived.</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-neutral-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search archived RAs by title or reference code..."
            className="w-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-400"
          />
        </div>
      </div>

      {/* RAs List */}
      {loading ? (
        <div className="text-gray-600 dark:text-neutral-400 text-center py-8">Loading archived RAs...</div>
      ) : filteredRAs.length === 0 ? (
        <div className="bg-white dark:bg-neutral-800/50 rounded-xl p-8 text-center border border-gray-200 dark:border-neutral-700">
          <Archive size={48} className="text-gray-400 dark:text-neutral-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-neutral-400">No archived RAs found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRAs.map((ra: any) => {
            const statusBadge = getStatusBadge(ra.status);
            const StatusIcon = statusBadge.icon;

            return (
              <div
                key={ra.id}
                className="bg-white dark:bg-neutral-900/50 hover:bg-gray-50 dark:hover:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-2 rounded-lg ${statusBadge.bg}`}>
                    {ra.template_type === 'coshh' ? (
                      <Shield size={20} className={statusBadge.text} />
                    ) : (
                      <FileText size={20} className={statusBadge.text} />
                    )}
                  </div>
                  <div className="text-left flex-1">
                    <h4 className="text-gray-900 dark:text-white font-medium group-hover:text-[#EC4899] dark:group-hover:text-magenta-400 transition-colors">
                      {ra.title}
                    </h4>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-neutral-400 mt-1">
                      <span>{ra.ref_code}</span>
                      <span>•</span>
                      <span className="capitalize">{ra.template_type}</span>
                      <span>•</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge.bg} ${statusBadge.text}`}>
                        {ra.status}
                      </span>
                      {ra.review_date && (
                        <>
                          <span>•</span>
                          <span>Review due: {new Date(ra.review_date).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right text-sm text-gray-600 dark:text-neutral-400">
                    <div>Created {new Date(ra.created_at).toLocaleDateString()}</div>
                    <div className="text-xs">by {ra.assessor_name}</div>
                  </div>
                  <button
                    onClick={() => handleEditRA(ra)}
                    className="px-3 py-2 bg-[#EC4899]/20 hover:bg-[#EC4899]/30 border border-[#EC4899]/40 rounded-lg text-[#EC4899] flex items-center gap-2 transition-colors"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleRestoreRA(ra.id)}
                    disabled={restoringId === ra.id}
                    className="px-3 py-2 bg-green-50 dark:bg-green-500/20 hover:bg-green-100 dark:hover:bg-green-500/30 border border-green-200 dark:border-green-500/40 rounded-lg text-green-700 dark:text-green-400 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Restore RA"
                  >
                    {restoringId === ra.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-green-600 dark:border-green-300 border-t-transparent rounded-full animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <RotateCcw size={16} />
                        Restore
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

