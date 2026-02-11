'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Filter, Plus, List, Calendar, Layers, Wrench, ChevronDown, ChevronUp, Package } from '@/components/ui/icons';
import PPMCard from './PPMCard';
import PPMDrawer from './PPMDrawer';
import { PPMCalendar } from './PPMCalendar';
import { getPPMStatus, formatServiceDate, getFrequencyText, getStatusDisplayText } from '@/utils/ppmHelpers';
import { usePPMRealtime } from '@/hooks/usePPMRealtime';
import { fetchAllAssets, AssetRecord } from '@/lib/fetchAssets';
import { useAppContext } from '@/context/AppContext';
import { useSiteFilter } from '@/hooks/useSiteFilter';
import { PPMAsset, PPMGroup } from '@/types/ppm';
import { usePPMGroups } from '@/hooks/assetly/usePPMGroups';
import { nullifyUndefined } from '@/lib/utils';
import { generatePPMSchedulesForAllAssets } from '@/lib/ppm/generateSchedules';
import { toast } from 'sonner';

export default function PPMSchedulePage() {
  const searchParams = useSearchParams();
  const assetIdParam = searchParams?.get('asset_id');
  
  const [assets, setAssets] = useState<PPMAsset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<PPMAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedAsset, setSelectedAsset] = useState<PPMAsset | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    site: '',
    contractor: '',
    status: '',
    dateRange: ''
  });
  const [sites, setSites] = useState<string[]>([]);
  const [contractors, setContractors] = useState<string[]>([]);
  const [highlightedAssetId, setHighlightedAssetId] = useState<string | null>(null);
  
  const { profile } = useAppContext();
  const { selectedSiteId, isAllSites } = useSiteFilter();
  const { groups: ppmGroups, loading: groupsLoading, fetchGroups } = usePPMGroups(profile?.company_id, selectedSiteId);
  const [generatingSchedules, setGeneratingSchedules] = useState(false);

  const handleGenerateSchedules = async () => {
    if (!profile?.company_id) {
      toast.error('Company ID not available');
      return;
    }

    setGeneratingSchedules(true);
    try {
      const result = await generatePPMSchedulesForAllAssets(profile.company_id);
      
      if (result.success) {
        toast.success(result.message || `Successfully created ${result.created} PPM schedules`);
        // Refresh the data
        await fetchPPMData();
      } else {
        toast.error(result.message || 'Failed to generate schedules');
        if (result.errors && result.errors.length > 0) {
          console.error('Schedule generation errors:', result.errors);
        }
      }
    } catch (error: any) {
      console.error('Error generating schedules:', error);
      toast.error(`Failed to generate schedules: ${error.message || 'Unknown error'}`);
    } finally {
      setGeneratingSchedules(false);
    }
  };

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const fetchPPMData = useCallback(async () => {
    if (!profile?.company_id) {
      console.log("PPM Debug - No company ID available");
      setLoading(false);
      setAssets([]);
      return;
    }

    try {
      setLoading(true);
      console.log("PPM Debug - Company ID:", profile.company_id);

      // Fetch assets using the new fetchAllAssets function
      // Note: fetchAllAssets doesn't support site filtering yet, so we filter after fetching
      let assetsData = await fetchAllAssets(profile.company_id);
      
      // Apply site filter if not viewing all sites
      if (!isAllSites && selectedSiteId && selectedSiteId !== 'all') {
        assetsData = assetsData.filter(asset => asset.site_id === selectedSiteId);
      }

      console.log("PPM Debug - Assets query result:", assetsData);

      // Transform the data to match our interface
      const transformedAssets: PPMAsset[] = assetsData.map(asset => {
        const cleanAsset = nullifyUndefined(asset);
        return {
          ppm_id: cleanAsset.ppm_id || null,
          id: cleanAsset.id,
          name: cleanAsset.name,
          category_name: cleanAsset.category || null,
          site_id: cleanAsset.site_id,
          site_name: cleanAsset.site_name,
          contractor_id: cleanAsset.contractor_id,
          contractor_name: cleanAsset.contractor_name,
          frequency_months: cleanAsset.frequency_months,
          last_service_date: cleanAsset.last_service_date,
          next_service_date: cleanAsset.next_service_date,
          ppm_status: cleanAsset.ppm_status,
          ppm_notes: cleanAsset.ppm_notes,
        };
      });

      console.log("PPM Debug - Transformed assets:", transformedAssets);
      console.log("PPM Debug - Assets count:", transformedAssets.length);

      setAssets(transformedAssets);

      // Extract unique sites and contractors for filters
      const uniqueSites = Array.from(
        new Set(
          transformedAssets
            .map(asset => asset.site_name)
            .filter((name): name is string => Boolean(name))
        )
      );
      setSites(uniqueSites);

      const uniqueContractors = Array.from(
        new Set(
          transformedAssets
            .map(asset => asset.contractor_name)
            .filter((name): name is string => Boolean(name))
        )
      );
      setContractors(uniqueContractors);

    } catch (error) {
      console.error('Error in fetchPPMData:', error);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id, selectedSiteId, isAllSites]);

  // Debounced version for realtime updates
  const debouncedFetchPPMData = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      fetchPPMData();
    }, 500);
  }, [fetchPPMData]);
  
  usePPMRealtime({
    onPPMUpdate: debouncedFetchPPMData,
    onTaskUpdate: debouncedFetchPPMData,
    companyId: profile?.company_id || ''
  });

  useEffect(() => {
    if (profile?.company_id) {
      fetchPPMData();
      fetchGroups();
    } else {
      setLoading(false);
      setAssets([]);
    }
  }, [profile?.company_id, fetchPPMData, fetchGroups]);

  useEffect(() => {
    filterAssets();
  }, [assets, searchTerm, filters]);

  // Handle query params for navigation from tasks
  useEffect(() => {
    if (assetIdParam && assets.length > 0) {
      const asset = assets.find(a => a.id === assetIdParam);
      if (asset) {
        // Highlight the asset
        setHighlightedAssetId(assetIdParam);
        
        // Open the drawer for this asset
        setSelectedAsset(asset);
        setDrawerOpen(true);
        
        // Scroll to the asset after a short delay (only if in list view)
        if (viewMode === 'list') {
          setTimeout(() => {
            const element = document.getElementById(`ppm-asset-${assetIdParam}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Remove highlight after 5 seconds
              setTimeout(() => {
                setHighlightedAssetId(null);
              }, 5000);
            }
          }, 500);
        }
      }
    }
  }, [assetIdParam, assets, viewMode]);

  const filterAssets = () => {
    let filtered = assets;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.site_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Site filter
    if (filters.site) {
      filtered = filtered.filter(asset => asset.site_name === filters.site);
    }

    // Contractor filter
    if (filters.contractor) {
      filtered = filtered.filter(asset => asset.contractor_name === filters.contractor);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(asset => {
        if (filters.status === 'unscheduled') {
          return !asset.next_service_date;
        }
        const { status } = getPPMStatus(asset.next_service_date ?? null, asset.ppm_status ?? null);
        return status === filters.status;
      });
    }

    // Date range filter
    if (filters.dateRange) {
      const today = new Date();
      filtered = filtered.filter(asset => {
        if (!asset.next_service_date) return false;
        
        const nextServiceDate = new Date(asset.next_service_date);
        const diffTime = nextServiceDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        switch (filters.dateRange) {
          case 'next-7-days':
            return diffDays >= 0 && diffDays <= 7;
          case 'next-30-days':
            return diffDays >= 0 && diffDays <= 30;
          case 'next-90-days':
            return diffDays >= 0 && diffDays <= 90;
          case 'overdue':
            return diffDays < 0;
          default:
            return true;
        }
      });
    }

    setFilteredAssets(filtered);
  };

  const handleCardClick = (asset: PPMAsset) => {
    setSelectedAsset(asset);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedAsset(null);
  };

  const handlePPMUpdate = () => {
    // Refresh data after PPM update
    fetchPPMData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mx-auto"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile?.company_id) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 mb-3 text-gray-400 dark:text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">No company context</p>
        <p className="text-gray-500 dark:text-gray-400">Please sign in or complete setup to view PPM assets.</p>
      </div>
    );
  }

  if (!assets.length && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 mb-3 text-gray-400 dark:text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">No PPM assets found</p>
        <p className="text-gray-500 dark:text-gray-400">No assets are set up for PPM scheduling yet. Add your first asset to get started.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">PPM Schedule</h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors h-[42px]"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>

          {/* Generate Schedules Button */}
          <button
            onClick={handleGenerateSchedules}
            disabled={generatingSchedules}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white rounded-lg transition-all duration-200 h-[42px] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingSchedules ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Generate Schedules
              </>
            )}
          </button>

          {/* Add PPM Button */}
          <button className="flex items-center gap-2 px-4 py-2.5 border border-cyan-600 dark:border-cyan-500 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 rounded-lg transition-all duration-200 h-[42px] whitespace-nowrap">
            <Plus className="w-4 h-4" />
            Add PPM
          </button>

          {/* View Toggle */}
          <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-1 h-[42px]">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-600 dark:border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all duration-200 ${
                viewMode === 'calendar'
                  ? 'bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-600 dark:border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* PPM Groups Section */}
      {ppmGroups.length > 0 && viewMode === 'list' && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-assetly" />
            PPM Groups
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ppmGroups.map(group => {
              const { status, color, borderColor } = getPPMStatus(group.next_service_date, group.ppm_status);
              return (
                <div
                  key={group.id}
                  className={`bg-white dark:bg-white/[0.02] backdrop-blur-md rounded-xl border-2 p-5 transition-all duration-200 shadow-sm dark:shadow-none ${borderColor}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">{group.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{group.site_name}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${color}`}>
                      {getStatusDisplayText(status)}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    {group.ppm_contractor_name && (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <Wrench className="w-3.5 h-3.5" /> {group.ppm_contractor_name}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3.5 h-3.5" /> {getFrequencyText(group.ppm_frequency_months)}
                    </div>
                    {group.next_service_date && (
                      <div className="text-xs text-gray-400">Next: {formatServiceDate(group.next_service_date)}</div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-assetly mt-1">
                      <Package className="w-3 h-3" /> {group.asset_count} asset{group.asset_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => {
            const isHighlighted = highlightedAssetId === asset.id;
            return (
              <div
                key={asset.id}
                id={`ppm-asset-${asset.id}`}
                className={isHighlighted ? 'animate-pulse' : ''}
              >
                <PPMCard
                  asset={asset}
                  onClick={() => handleCardClick(asset)}
                  highlighted={isHighlighted}
                />
              </div>
            );
          })}
          {filteredAssets.length === 0 && !loading && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-500 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No PPM assets found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                {Object.values(filters).some(f => f)
                  ? "No assets match your current filters. Try adjusting your search criteria or clearing filters."
                  : "No assets are set up for PPM scheduling yet. Add your first asset to get started."
                }
              </p>
              {Object.values(filters).some(f => f) && (
                <button
                  onClick={() => setFilters({ site: '', contractor: '', status: '', dateRange: '' })}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white rounded-lg transition-all duration-200"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <PPMCalendar 
          onAssetClick={handleCardClick}
          onRefresh={fetchPPMData}
        />
      )}

      {/* PPM Drawer */}
      <PPMDrawer
        asset={selectedAsset}
        open={drawerOpen}
        onClose={handleDrawerClose}
        onUpdate={handlePPMUpdate}
      />

      {/* Filter Drawer */}
      {showFilters && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/60 z-50 flex items-start justify-end p-6"
          onClick={() => setShowFilters(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-6 space-y-6 mt-16"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter PPM Assets</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Site Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Site</label>
              <select
                value={filters.site}
                onChange={(e) => setFilters(prev => ({ ...prev, site: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">All Sites</option>
                {sites.map(site => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>

            {/* Contractor Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contractor</label>
              <select
                value={filters.contractor}
                onChange={(e) => setFilters(prev => ({ ...prev, contractor: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">All Contractors</option>
                {contractors.map(contractor => (
                  <option key={contractor} value={contractor}>{contractor}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">All Statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="due">Due Soon</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
                <option value="unscheduled">Unscheduled</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">All Dates</option>
                <option value="next-7-days">Next 7 Days</option>
                <option value="next-30-days">Next 30 Days</option>
                <option value="next-90-days">Next 90 Days</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => setFilters({ site: '', contractor: '', status: '', dateRange: '' })}
              className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}