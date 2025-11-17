"use client";

import React, { useState, useEffect } from 'react';
import { Search, FileText, CheckCircle, AlertCircle, Archive, Edit, Eye, ChevronDown, ChevronUp, FileBox } from 'lucide-react';
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
    categories: ['Opening', 'Closing', 'Opening Procedures', 'Closing Procedures'], // Support both old and new category names
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

export default function SOPsListPage() {
  const router = useRouter();
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState({
    FOH: true,
    BOH: true,
    Cleaning: true,
    Opening: true,
    Drinks: true
  });

  // Load existing SOPs - only show latest version of each SOP
  useEffect(() => {
    const loadSOPs = async () => {
      if (!companyId) return;
      
      try {
        setLoading(true);
        // Get all SOPs (excluding archived)
        const { data: allSOPs, error } = await supabase
          .from('sop_entries')
          .select('*')
          .eq('company_id', companyId)
          .neq('status', 'Archived')
          .order('ref_code', { ascending: true })
          .order('version_number', { ascending: false });
        
        if (error) throw error;
        
        // Filter to get only the latest version of each SOP base
        // Since ref_code increments (PREP-BESH-001 -> PREP-BESH-002), we group by base pattern
        const latestVersions = new Map();
        (allSOPs || []).forEach((sop: any) => {
          // Extract base pattern from ref_code (e.g., PREP-BESH-001 -> PREP-BESH)
          const refCode = sop.ref_code;
          const baseMatch = refCode.match(/^(.+)-\d+$/);
          const basePattern = baseMatch ? baseMatch[1] : refCode;
          
          if (!latestVersions.has(basePattern)) {
            latestVersions.set(basePattern, sop);
          } else {
            const existing = latestVersions.get(basePattern);
            // Keep the one with higher version_number (or higher ref_code number if version_number is same)
            const existingVersion = existing.version_number || 1;
            const currentVersion = sop.version_number || 1;
            
            if (currentVersion > existingVersion) {
              latestVersions.set(basePattern, sop);
            } else if (currentVersion === existingVersion) {
              // If version numbers are equal, compare ref_code numbers
              const existingNum = parseInt(existing.ref_code.match(/-(\d+)$/)?.[1] || '0', 10);
              const currentNum = parseInt(refCode.match(/-(\d+)$/)?.[1] || '0', 10);
              if (currentNum > existingNum) {
                latestVersions.set(basePattern, sop);
              }
            }
          }
        });
        
        // Convert map to array and sort by created_at
        const latestSOPs = Array.from(latestVersions.values()).sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setSops(latestSOPs);
      } catch (error) {
        console.error('Error loading SOPs:', error);
        const errorMessage = error?.message || 'Unknown error occurred';
        showToast({ 
          title: 'Error loading SOPs', 
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
    // Support both old and new category names for backward compatibility
    const templateMap: Record<string, string> = {
      'Food Prep': '/dashboard/sops/food-template',
      'Service (FOH)': '/dashboard/sops/service-template',
      'Drinks': '/dashboard/sops/drinks-template',
      'Hot Beverages': '/dashboard/sops/hot-drinks-template',
      'Cold Beverages': '/dashboard/sops/cold-drinks-template',
      'Cleaning': '/dashboard/sops/cleaning-template',
      'Opening': '/dashboard/sops/opening-template',
      'Opening Procedures': '/dashboard/sops/opening-template', // Support old category name
      'Closing': '/dashboard/sops/closing-template',
      'Closing Procedures': '/dashboard/sops/closing-template' // Support old category name
    };

    const templatePath = templateMap[sop.category] || '/dashboard/sops/food-template';
    
    // Navigate with SOP ID and data
    router.push(`${templatePath}?edit=${sop.id}`);
  };

  const handleArchiveSOP = async (sopId: string) => {
    if (!confirm('Archive this SOP? The original version (001) will be moved to archived SOPs.')) return;

    try {
      setArchivingId(sopId);
      
      // Find the current SOP to get its ref_code base
      const { data: currentSOP, error: fetchError } = await supabase
        .from('sop_entries')
        .select('ref_code, parent_id')
        .eq('id', sopId)
        .eq('company_id', companyId)
        .single();

      if (fetchError) throw fetchError;
      if (!currentSOP) throw new Error('SOP not found');

      // Extract base pattern from ref_code (e.g., PREP-BESH-002 -> PREP-BESH)
      const refCode = currentSOP.ref_code;
      const baseMatch = refCode.match(/^(.+)-\d+$/);
      const basePattern = baseMatch ? baseMatch[1] : refCode;

      // Find the original 001 version (version_number = 1 or ref_code ends with -001)
      const { data: originalVersion, error: findError } = await supabase
        .from('sop_entries')
        .select('id')
        .eq('company_id', companyId)
        .like('ref_code', `${basePattern}-001`)
        .eq('version_number', 1)
        .maybeSingle();

      if (findError) throw findError;

      // Archive the original 001 version if found, otherwise archive current
      const versionToArchive = originalVersion?.id || sopId;

      const { error } = await supabase
        .from('sop_entries')
        .update({ status: 'Archived' })
        .eq('id', versionToArchive)
        .eq('company_id', companyId);

      if (error) throw error;

      // Remove from local state (remove all versions of this SOP base)
      setSops(prev => prev.filter(sop => {
        const sopBaseMatch = sop.ref_code.match(/^(.+)-\d+$/);
        const sopBasePattern = sopBaseMatch ? sopBaseMatch[1] : sop.ref_code;
        return sopBasePattern !== basePattern;
      }));

      showToast({
        title: 'SOP archived',
        description: 'Original version (001) has been moved to archived SOPs',
        type: 'success'
      });
    } catch (error: any) {
      console.error('Error archiving SOP:', error);
      showToast({
        title: 'Error archiving SOP',
        description: error.message || 'Failed to archive SOP',
        type: 'error'
      });
    } finally {
      setArchivingId(null);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const filteredSOPs = sops.filter(sop => {
    const matchesSearch = sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sop.ref_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || sop.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const groupedSOPs = Object.entries(CATEGORY_GROUPS).map(([key, group]) => {
    const groupSOPs = filteredSOPs.filter(sop => group.categories.includes(sop.category));
    return { key, group, sops: groupSOPs };
  });

  const getStatusBadge = (status) => {
    const badges = {
      'Published': { icon: CheckCircle, color: 'green', bg: 'bg-green-500/20', text: 'text-green-400' },
      'Draft': { icon: AlertCircle, color: 'yellow', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
      'Archived': { icon: Archive, color: 'gray', bg: 'bg-neutral-700', text: 'text-neutral-400' }
    };
    return badges[status] || badges['Draft'];
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SOPs by title or reference code..."
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Status</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
        </select>
        <button
          onClick={() => router.push('/dashboard/sops/archive')}
          className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded-lg text-neutral-300 flex items-center gap-2 transition-colors"
        >
          <Archive size={16} />
          Archived SOPs
        </button>
      </div>

      {/* SOPs List */}
      {loading ? (
        <div className="text-neutral-400 text-center py-8">Loading SOPs...</div>
      ) : filteredSOPs.length === 0 ? (
        <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-neutral-700">
          <FileText size={48} className="text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-400">No SOPs found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedSOPs.map(({ key, group, sops: groupSOPs }) => {
            if (groupSOPs.length === 0) return null;
            
            const isExpanded = expandedCategories[key];
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
                    {groupSOPs.map((sop) => {
                      const statusBadge = getStatusBadge(sop.status);
                      const StatusIcon = statusBadge.icon;
                      
                      return (
                        <div
                          key={sop.id}
                          className="bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-700 rounded-lg p-4 flex items-center justify-between group transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`p-2 rounded-lg ${statusBadge.bg}`}>
                              <StatusIcon size={20} className={statusBadge.text} />
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
                                <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge.bg} ${statusBadge.text}`}>
                                  {sop.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right text-sm text-neutral-400">
                              <div>Created {new Date(sop.created_at).toLocaleDateString()}</div>
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
                              onClick={() => handleArchiveSOP(sop.id)}
                              disabled={archivingId === sop.id}
                              className="flex items-center justify-center h-9 w-9 rounded-lg border border-orange-500 text-orange-500 bg-transparent hover:bg-white/[0.04] hover:shadow-[0_0_12px_rgba(249,115,22,0.25)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                              title="Archive SOP"
                            >
                              {archivingId === sop.id ? (
                                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <FileBox size={18} />
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
          })}
        </div>
      )}
    </div>
  );
}

