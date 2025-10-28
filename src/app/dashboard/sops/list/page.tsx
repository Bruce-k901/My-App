"use client";

import React, { useState, useEffect } from 'react';
import { Search, FileText, CheckCircle, AlertCircle, Archive, Edit, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

const CATEGORY_GROUPS = {
  'FOH': {
    label: 'FOH (Front of House)',
    categories: ['Service (FOH)'],
    color: 'blue'
  },
  'BOH': {
    label: 'BOH (Back of House)',
    categories: ['Food Prep'],
    color: 'orange'
  },
  'Cleaning': {
    label: 'Cleaning & Maintenance',
    categories: ['Cleaning'],
    color: 'teal'
  },
  'Opening': {
    label: 'Opening/Closing Procedures',
    categories: ['Opening', 'Closing'],
    color: 'yellow'
  },
  'Drinks': {
    label: 'Drinks & Beverages',
    categories: ['Drinks', 'Hot Beverages', 'Cold Beverages'],
    color: 'purple'
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
  const [expandedCategories, setExpandedCategories] = useState({
    FOH: true,
    BOH: true,
    Cleaning: true,
    Opening: true,
    Drinks: true
  });

  // Load existing SOPs
  useEffect(() => {
    const loadSOPs = async () => {
      if (!companyId) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('sop_entries')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setSops(data || []);
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

  const handleEditSOP = (sop) => {
    // Determine which template to navigate to based on category
    const templateMap = {
      'Food Prep': '/dashboard/sops/food-template',
      'Service (FOH)': '/dashboard/sops/service-template',
      'Drinks': '/dashboard/sops/drinks-template',
      'Hot Beverages': '/dashboard/sops/hot-drinks-template',
      'Cold Beverages': '/dashboard/sops/cold-drinks-template',
      'Cleaning': '/dashboard/sops/cleaning-template',
      'Opening': '/dashboard/sops/opening-template',
      'Closing': '/dashboard/sops/closing-template'
    };

    const templatePath = templateMap[sop.category] || '/dashboard/sops/food-template';
    
    // Navigate with SOP ID and data
    router.push(`${templatePath}?edit=${sop.id}`);
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
          <option value="Archived">Archived</option>
        </select>
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
                    <div className={`p-2 rounded-lg bg-${group.color}-500/20`}>
                      <FileText size={20} className={`text-${group.color}-400`} />
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

