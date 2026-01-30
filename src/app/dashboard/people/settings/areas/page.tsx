'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui';
import { MapPin, Building2, Plus, Edit2, Trash2, X, Building, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Region {
  id: string;
  name: string;
  manager_id?: string;
  manager_name?: string;
  areas?: Area[];
  sites?: Site[];  // Sites directly assigned to region (no area)
}

interface Area {
  id: string;
  name: string;
  region_id: string;
  manager_id?: string;
  manager_name?: string;
  sites?: Site[];
}

interface Site {
  id: string;
  name: string;
  area_id?: string;
}

interface Profile {
  id: string;
  full_name: string;
  app_role: string;
}

export default function AreasAndRegionsPage() {
  const { profile } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<Region[]>([]);
  const [managers, setManagers] = useState<Profile[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  
  // Modal states
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showSiteAssignModal, setShowSiteAssignModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [assignmentType, setAssignmentType] = useState<'region' | 'area'>('area');

  // Form states
  const [regionName, setRegionName] = useState('');
  const [regionManagerId, setRegionManagerId] = useState('');
  const [areaName, setAreaName] = useState('');
  const [areaManagerId, setAreaManagerId] = useState('');

  useEffect(() => {
    if (profile?.company_id) {
      loadData();
    }
  }, [profile]);

  async function loadData() {
    try {
      setLoading(true);

      // Load managers
      const { data: managersData, error: managersError } = await supabase
        .from('profiles')
        .select('id, full_name, app_role')
        .eq('company_id', profile!.company_id)
        .in('app_role', ['Manager', 'Area Manager', 'Regional Manager', 'Admin', 'Owner']);

      if (managersError) throw managersError;

      setManagers(managersData || []);

      // Load regions with their areas
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('id, name, regional_manager_id, manager_id')
        .eq('company_id', profile!.company_id)
        .order('name');

      if (regionsError) throw regionsError;

      // Load areas
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('id, name, region_id, area_manager_id, manager_id')
        .eq('company_id', profile!.company_id)
        .order('name');

      if (areasError) throw areasError;

      // Load sites
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('id, name, area_id')
        .eq('company_id', profile!.company_id)
        .order('name');

      if (sitesError) throw sitesError;

      setSites(sitesData || []);

      // Fetch all manager profiles
      const managerIds = [
        ...(regionsData || []).map(r => r.regional_manager_id),
        ...(areasData || []).map(a => a.area_manager_id),
      ].filter(Boolean);

      const { data: managersProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', managerIds);

      const managersMap = new Map(
        (managersProfiles || []).map(m => [m.id, m.full_name])
      );

      // Combine regions with their areas and sites
      const regionsWithAreas = (regionsData || []).map(region => {
        const regionAreas = (areasData || []).filter(area => area.region_id === region.id);
        
        // Sites directly assigned to region (area_id is null but site belongs to region via areas)
        // For now, we'll find unassigned sites (no area_id)
        const unassignedSites = (sitesData || [])
          .filter(site => !site.area_id)
          .map(site => ({
            id: site.id,
            name: site.name,
            area_id: site.area_id,
          }));

        return {
          id: region.id,
          name: region.name,
          manager_id: region.regional_manager_id,
          manager_name: region.regional_manager_id ? managersMap.get(region.regional_manager_id) : undefined,
          sites: unassignedSites,
          areas: regionAreas.map(area => {
            const areaSites = (sitesData || [])
              .filter(site => site.area_id === area.id)
              .map(site => ({
                id: site.id,
                name: site.name,
                area_id: site.area_id,
              }));
            
            return {
              id: area.id,
              name: area.name,
              region_id: area.region_id,
              manager_id: area.area_manager_id,
              manager_name: area.area_manager_id ? managersMap.get(area.area_manager_id) : undefined,
              sites: areaSites,
            };
          }),
        };
      });

      setRegions(regionsWithAreas);
    } catch (error: any) {
      console.error('Error loading data:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      if (error?.message) {
        toast.error(`Failed to load: ${error.message}`);
      } else {
        toast.error('Failed to load regions and areas');
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveRegion() {
    if (!regionName.trim()) {
      toast.error('Region name is required');
      return;
    }

    try {
      if (editingRegion) {
        // Update existing region
        const { error } = await supabase
          .from('regions')
          .update({
            name: regionName,
            regional_manager_id: regionManagerId || null,
            manager_id: regionManagerId || null, // Sync to manager_id for compatibility
          })
          .eq('id', editingRegion.id);

        if (error) throw error;
        toast.success('Region updated successfully');
      } else {
        // Create new region
        const { error } = await supabase
          .from('regions')
          .insert({
            name: regionName,
            regional_manager_id: regionManagerId || null,
            manager_id: regionManagerId || null, // Sync to manager_id for compatibility
            company_id: profile!.company_id,
          });

        if (error) throw error;
        toast.success('Region created successfully');
      }

      setShowRegionModal(false);
      setEditingRegion(null);
      setRegionName('');
      setRegionManagerId('');
      loadData();
    } catch (error) {
      console.error('Error saving region:', error);
      toast.error('Failed to save region');
    }
  }

  async function deleteRegion(regionId: string) {
    if (!confirm('Are you sure you want to delete this region? All associated areas will also be deleted.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('regions')
        .delete()
        .eq('id', regionId);

      if (error) throw error;
      toast.success('Region deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting region:', error);
      toast.error('Failed to delete region');
    }
  }

  async function saveArea() {
    if (!areaName.trim()) {
      toast.error('Area name is required');
      return;
    }

    if (!selectedRegionId && !editingArea) {
      toast.error('Please select a region');
      return;
    }

    try {
      if (editingArea) {
        // Update existing area
        const { error } = await supabase
          .from('areas')
          .update({
            name: areaName,
            area_manager_id: areaManagerId || null,
            manager_id: areaManagerId || null, // Sync to manager_id for compatibility
          })
          .eq('id', editingArea.id);

        if (error) throw error;
        toast.success('Area updated successfully');
      } else {
        // Create new area
        const { error } = await supabase
          .from('areas')
          .insert({
            name: areaName,
            region_id: selectedRegionId,
            area_manager_id: areaManagerId || null,
            manager_id: areaManagerId || null, // Sync to manager_id for compatibility
            company_id: profile!.company_id,
          });

        if (error) throw error;
        toast.success('Area created successfully');
      }

      setShowAreaModal(false);
      setEditingArea(null);
      setAreaName('');
      setAreaManagerId('');
      setSelectedRegionId('');
      loadData();
    } catch (error) {
      console.error('Error saving area:', error);
      toast.error('Failed to save area');
    }
  }

  async function deleteArea(areaId: string) {
    if (!confirm('Are you sure you want to delete this area?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('areas')
        .delete()
        .eq('id', areaId);

      if (error) throw error;
      toast.success('Area deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting area:', error);
      toast.error('Failed to delete area');
    }
  }

  function openEditRegion(region: Region) {
    setEditingRegion(region);
    setRegionName(region.name);
    // Check both manager_id and regional_manager_id for compatibility
    setRegionManagerId(region.regional_manager_id || region.manager_id || '');
    setShowRegionModal(true);
  }

  function openEditArea(area: Area) {
    setEditingArea(area);
    setAreaName(area.name);
    // Check both manager_id and area_manager_id for compatibility
    setAreaManagerId(area.area_manager_id || area.manager_id || '');
    setShowAreaModal(true);
  }

  function openAddArea(regionId: string) {
    setSelectedRegionId(regionId);
    setShowAreaModal(true);
  }

  function openAssignSitesToRegion(regionId: string) {
    setSelectedRegionId(regionId);
    setSelectedAreaId('');
    setAssignmentType('region');
    setShowSiteAssignModal(true);
  }

  function openAssignSitesToArea(regionId: string, areaId: string) {
    setSelectedRegionId(regionId);
    setSelectedAreaId(areaId);
    setAssignmentType('area');
    setShowSiteAssignModal(true);
  }

  async function assignSites() {
    if (selectedSiteIds.length === 0) {
      toast.error('Please select at least one site');
      return;
    }

    try {
      if (assignmentType === 'area') {
        // Assign sites to area
        if (!selectedAreaId) {
          toast.error('Please select an area');
          return;
        }

        const { error } = await supabase
          .from('sites')
          .update({ area_id: selectedAreaId })
          .in('id', selectedSiteIds);

        if (error) throw error;
        toast.success('Sites assigned to area successfully');
      } else {
        // Assign sites directly to region (set area_id to null)
        // Note: Sites without area_id will show under the region
        const { error } = await supabase
          .from('sites')
          .update({ area_id: null })
          .in('id', selectedSiteIds);

        if (error) throw error;
        toast.success('Sites assigned to region successfully');
      }

      setShowSiteAssignModal(false);
      setSelectedSiteIds([]);
      setSelectedRegionId('');
      setSelectedAreaId('');
      loadData();
    } catch (error) {
      console.error('Error assigning sites:', error);
      toast.error('Failed to assign sites');
    }
  }

  function toggleSiteSelection(siteId: string) {
    setSelectedSiteIds(prev =>
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#EC4899] mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading regions and areas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/people/settings"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Areas & Regions</h1>
            <p className="text-neutral-400">
              Organize your company by geographical regions and areas
            </p>
          </div>
          <Button onClick={() => setShowRegionModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Region
          </Button>
        </div>
      </div>

      {/* Regions List */}
      <div className="space-y-4">
        {regions.map((region) => (
          <div key={region.id} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6">
            {/* Region Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{region.name}</h3>
                  {region.manager_name && (
                    <p className="text-sm text-blue-300">
                      Regional Manager: {region.manager_name}
                    </p>
                  )}
                  <p className="text-xs text-neutral-400 mt-1">
                    {region.areas?.length || 0} area(s)
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditRegion(region)}
                  className="p-2 text-neutral-400 hover:text-white transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteRegion(region.id)}
                  className="p-2 text-neutral-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Areas */}
            {region.areas && region.areas.length > 0 ? (
              <div className="space-y-2 mb-3">
                {region.areas.map((area) => (
                  <div key={area.id} className="bg-white/[0.02] rounded-lg border border-white/[0.04] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-green-400" />
                        <div>
                          <p className="text-sm font-medium text-white">{area.name}</p>
                          {area.manager_name && (
                            <p className="text-xs text-green-300">
                              Area Manager: {area.manager_name}
                            </p>
                          )}
                          <p className="text-xs text-neutral-500">
                            {area.sites?.length || 0} site(s)
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openAssignSitesToArea(region.id, area.id)}
                          className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                        >
                          <Plus className="w-3 h-3 inline mr-1" />
                          Sites
                        </button>
                        <button
                          onClick={() => openEditArea(area)}
                          className="p-1 text-neutral-400 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteArea(area.id)}
                          className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Sites in this area */}
                    {area.sites && area.sites.length > 0 && (
                      <div className="ml-7 space-y-1 mt-2">
                        {area.sites.map((site) => (
                          <div
                            key={site.id}
                            className="flex items-center gap-2 p-2 bg-white/[0.02] rounded text-xs"
                          >
                            <Building className="w-3 h-3 text-purple-400" />
                            <span className="text-white">{site.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500 mb-3">No areas in this region yet</p>
            )}

            {/* Sites directly under region (no area) */}
            {region.sites && region.sites.length > 0 && (
              <div className="mb-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-xs text-purple-300 font-medium mb-2">
                  Sites assigned directly to region:
                </p>
                <div className="space-y-1">
                  {region.sites.map((site) => (
                    <div
                      key={site.id}
                      className="flex items-center gap-2 p-2 bg-white/[0.02] rounded text-xs"
                    >
                      <Building className="w-3 h-3 text-purple-400" />
                      <span className="text-white">{site.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => openAddArea(region.id)}
                className="flex-1"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Area
              </Button>
              <Button
                onClick={() => openAssignSitesToRegion(region.id)}
                className="flex-1"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Assign Sites
              </Button>
            </div>
          </div>
        ))}

        {regions.length === 0 && (
          <div className="text-center py-12 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            <MapPin className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
            <p className="text-neutral-400 mb-4">No regions defined yet</p>
            <Button onClick={() => setShowRegionModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Region
            </Button>
          </div>
        )}
      </div>

      {/* Region Modal */}
      {showRegionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B0D13] border border-white/[0.06] rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                {editingRegion ? 'Edit Region' : 'Add Region'}
              </h2>
              <button
                onClick={() => {
                  setShowRegionModal(false);
                  setEditingRegion(null);
                  setRegionName('');
                  setRegionManagerId('');
                }}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Region Name *
                </label>
                <input
                  type="text"
                  value={regionName}
                  onChange={(e) => setRegionName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white"
                  placeholder="e.g., North Region"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Regional Manager (Optional)
                </label>
                <select
                  value={regionManagerId}
                  onChange={(e) => setRegionManagerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white"
                >
                  <option value="">No manager assigned</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.full_name} ({manager.app_role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={saveRegion} className="flex-1">
                  {editingRegion ? 'Update Region' : 'Create Region'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRegionModal(false);
                    setEditingRegion(null);
                    setRegionName('');
                    setRegionManagerId('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Area Modal */}
      {showAreaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B0D13] border border-white/[0.06] rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                {editingArea ? 'Edit Area' : 'Add Area'}
              </h2>
              <button
                onClick={() => {
                  setShowAreaModal(false);
                  setEditingArea(null);
                  setAreaName('');
                  setAreaManagerId('');
                  setSelectedRegionId('');
                }}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {!editingArea && (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Region *
                  </label>
                  <select
                    value={selectedRegionId}
                    onChange={(e) => setSelectedRegionId(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white"
                  >
                    <option value="">Select a region</option>
                    {regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Area Name *
                </label>
                <input
                  type="text"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white"
                  placeholder="e.g., Manchester Area"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Area Manager (Optional)
                </label>
                <select
                  value={areaManagerId}
                  onChange={(e) => setAreaManagerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white"
                >
                  <option value="">No manager assigned</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.full_name} ({manager.app_role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={saveArea} className="flex-1">
                  {editingArea ? 'Update Area' : 'Create Area'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAreaModal(false);
                    setEditingArea(null);
                    setAreaName('');
                    setAreaManagerId('');
                    setSelectedRegionId('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Site Assignment Modal */}
      {showSiteAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B0D13] border border-white/[0.06] rounded-lg max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                Assign Sites {assignmentType === 'area' ? 'to Area' : 'to Region'}
              </h2>
              <button
                onClick={() => {
                  setShowSiteAssignModal(false);
                  setSelectedSiteIds([]);
                  setSelectedRegionId('');
                  setSelectedAreaId('');
                }}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-300">
                  {assignmentType === 'area' 
                    ? 'Select sites to assign to this area. Sites will be grouped under the area for better organization.'
                    : 'Select sites to assign directly to this region (without an area). Use this for smaller businesses or flat structures.'}
                </p>
              </div>

              {assignmentType === 'area' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Area *
                  </label>
                  <select
                    value={selectedAreaId}
                    onChange={(e) => setSelectedAreaId(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white"
                  >
                    <option value="">Select an area</option>
                    {regions
                      .find(r => r.id === selectedRegionId)
                      ?.areas?.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Select Sites *
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-white/[0.06] rounded-lg p-2">
                  {sites.length === 0 ? (
                    <p className="text-sm text-neutral-500 text-center py-4">
                      No sites available
                    </p>
                  ) : (
                    sites.map((site) => (
                      <label
                        key={site.id}
                        className="flex items-center gap-3 p-2 hover:bg-white/[0.03] rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSiteIds.includes(site.id)}
                          onChange={() => toggleSiteSelection(site.id)}
                          className="w-4 h-4"
                        />
                        <Building className="w-4 h-4 text-purple-400" />
                        <div className="flex-1">
                          <p className="text-sm text-white">{site.name}</p>
                        </div>
                        {site.area_id && (
                          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                            Assigned
                          </span>
                        )}
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  {selectedSiteIds.length} site(s) selected
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={assignSites} className="flex-1" disabled={selectedSiteIds.length === 0}>
                  Assign {selectedSiteIds.length} Site(s)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSiteAssignModal(false);
                    setSelectedSiteIds([]);
                    setSelectedRegionId('');
                    setSelectedAreaId('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

