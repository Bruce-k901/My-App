"use client";

import React, { useState, useEffect } from 'react';
import { Search, FileText, Archive, Edit, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

const CATEGORY_GROUPS = {
  'FOH': {
    label: 'FOH (Front of House)',
    categories: ['Service (FOH)'],
    bgColor: 'bg-blue-500/20',
    iconColor: 'text-blue-400'
  },
  'BOH': {
    label: 'BOH (Back of House)',
    categories: ['Food Prep'],
    bgColor: 'bg-orange-500/20',
    iconColor: 'text-orange-400'
  },
  'Cleaning': {
    label: 'Cleaning & Maintenance',
    categories: ['Cleaning'],
    bgColor: 'bg-teal-500/20',
    iconColor: 'text-teal-400'
  },
  'Opening': {
    label: 'Opening/Closing Procedures',
    categories: ['Opening', 'Closing', 'Opening Procedures', 'Closing Procedures'],
    bgColor: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400'
  },
  'Drinks': {
    label: 'Drinks & Beverages',
    categories: ['Drinks', 'Hot Beverages', 'Cold Beverages'],
    bgColor: 'bg-purple-500/20',
    iconColor: 'text-purple-400'
  }
};

export default function SOPsArchivePage() {
  const router = useRouter();
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({
    FOH: true,
    BOH: true,
    Cleaning: true,
    Opening: true,
    Drinks: true
  });
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Load archived SOPs - show only the original 001 versions
  useEffect(() => {
    const loadSOPs = async () => {
      if (!companyId) return;
      
      try {
        setLoading(true);
        // Get all archived SOPs
        const { data: allArchived, error } = await supabase
          .from('sop_entries')
          .select('*')
          .eq('company_id', companyId)
          .eq('status', 'Archived')
          .order('updated_at', { ascending: false });
        
        if (error) throw error;
        
        // Filter to show only 001 versions (original versions)
        const archived001Versions = (allArchived || []).filter((sop: any) => {
          // Check if ref_code ends with -001 or version_number is 1
          const endsWith001 = sop.ref_code.match(/-001$/);
          const isVersion1 = sop.version_number === 1;
          return endsWith001 || isVersion1;
        });
        
        setSops(archived001Versions);
      } catch (error) {
        console.error('Error loading archived SOPs:', error);
        const errorMessage = error?.message || 'Unknown error occurred';
        showToast({ 
          title: 'Error loading archived SOPs', 
          description: errorMessage, 
          type: 'error' 
        });
      } finally {
        setLoading(false);
      }
    };

    loadSOPs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const handleEditSOP = (sop: any) => {
    // Determine which template to navigate to based on category
    const templateMap: Record<string, string> = {
      'Food Prep': '/dashboard/sops/food-template',
      'Service (FOH)': '/dashboard/sops/service-template',
      'Drinks': '/dashboard/sops/drinks-template',
      'Hot Beverages': '/dashboard/sops/hot-drinks-template',
      'Cold Beverages': '/dashboard/sops/cold-drinks-template',
      'Cleaning': '/dashboard/sops/cleaning-template',
      'Opening': '/dashboard/sops/opening-template',
      'Opening Procedures': '/dashboard/sops/opening-template',
      'Closing': '/dashboard/sops/closing-template',
      'Closing Procedures': '/dashboard/sops/closing-template'
    };

    const templatePath = templateMap[sop.category] || '/dashboard/sops/food-template';
    router.push(`${templatePath}?edit=${sop.id}`);
  };

  const handleRestoreSOP = async (sopId: string) => {
    if (!confirm('Restore this SOP? It will be moved back to active SOPs.')) return;

    try {
      setRestoringId(sopId);
      const { error } = await supabase
        .from('sop_entries')
        .update({ status: 'Draft' })
        .eq('id', sopId)
        .eq('company_id', companyId);

      if (error) throw error;

      // Remove from local state
      setSops(prev => prev.filter(sop => sop.id !== sopId));

      showToast({ 
        title: 'SOP restored', 
        description: 'SOP has been moved back to active SOPs', 
        type: 'success' 
      });
    } catch (error: any) {
      console.error('Error restoring SOP:', error);
      showToast({ 
        title: 'Error restoring SOP', 
        description: error.message || 'Failed to restore SOP', 
        type: 'error' 
      });
    } finally {
      setRestoringId(null);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category as keyof typeof prev]
    }));
  };

  const filteredSOPs = sops.filter(sop => {
    const matchesSearch = sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sop.ref_code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const groupedSOPs = Object.entries(CATEGORY_GROUPS).map(([key, group]) => {
    const groupSOPs = filteredSOPs.filter(sop => group.categories.includes(sop.category));
    return { key, group, sops: groupSOPs };
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-neutral-700/20 to-neutral-600/20 rounded-2xl p-6 border border-neutral-600/30">
        <div className="flex items-center gap-3 mb-2">
          <Archive className="w-6 h-6 text-neutral-400" />
          <h1 className="text-2xl font-semibold text-white">Archived SOPs</h1>
        </div>
        <p className="text-neutral-300 text-sm">View and restore archived SOPs</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search archived SOPs by title or reference code..."
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400"
          />
        </div>
        <button
          onClick={() => router.push('/dashboard/sops/list')}
          className="px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 transition-colors"
        >
          Back to My SOPs
        </button>
      </div>

      {/* SOPs List */}
      {loading ? (
        <div className="text-neutral-400 text-center py-8">Loading archived SOPs...</div>
      ) : filteredSOPs.length === 0 ? (
        <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-neutral-700">
          <Archive size={48} className="text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-400">No archived SOPs found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedSOPs.map(({ key, group, sops: groupSOPs }) => {
            if (groupSOPs.length === 0) return null;
            
            const isExpanded = expandedCategories[key as keyof typeof expandedCategories];
            const Icon = isExpanded ? ChevronUp : ChevronDown;
            
            return (
              <div key={key} className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(key)}
                  className="w-full flex items-center justify-between p-4 hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${group.bgColor}`}>
                      <FileText size={20} className={group.iconColor} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-white">{group.label}</h3>
                      <p className="text-sm text-neutral-400">{groupSOPs.length} SOP{groupSOPs.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <Icon size={20} className="text-neutral-400" />
                </button>

                {/* SOPs List */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {groupSOPs.map((sop: any) => (
                      <div
                        key={sop.id}
                        className="bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-700 rounded-lg p-4 flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-2 rounded-lg bg-neutral-700">
                            <Archive size={20} className="text-neutral-400" />
                          </div>
                          <div className="text-left flex-1">
                            <h4 className="text-white font-medium group-hover:text-magenta-400 transition-colors">
                              {sop.title}
                            </h4>
                            <div className="flex items-center gap-3 text-sm text-neutral-400 mt-1">
                              <span>{sop.ref_code}</span>
                              <span>•</span>
                              <span>{sop.category}</span>
                              <span>•</span>
                              <span className="px-2 py-0.5 rounded-full text-xs bg-neutral-700 text-neutral-400">
                                ARCHIVED
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right text-sm text-neutral-400">
                            <div>Archived {new Date(sop.updated_at).toLocaleDateString()}</div>
                            <div className="text-xs">by {sop.author}</div>
                          </div>
                          <button
                            onClick={() => handleEditSOP(sop)}
                            className="px-3 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/40 rounded-lg text-magenta-400 flex items-center gap-2 transition-colors"
                          >
                            <Edit size={16} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleRestoreSOP(sop.id)}
                            disabled={restoringId === sop.id}
                            className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-400 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {restoringId === sop.id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
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
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

