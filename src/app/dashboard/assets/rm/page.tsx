"use client";

import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useSiteFilter } from '@/hooks/useSiteFilter';
import { useToast } from '@/components/ui/ToastProvider';
import { Plus, Search, Building2, Filter } from '@/components/ui/icons';
import { useBuildingAssets } from '@/hooks/assetly/useBuildingAssets';
import { FABRIC_CATEGORIES, CONDITION_RATINGS } from '@/types/rm';
import type { BuildingAsset, FabricCategory } from '@/types/rm';
import BuildingAssetForm from '@/components/rm/BuildingAssetForm';
import BuildingAssetCard from '@/components/rm/BuildingAssetCard';
import WorkOrderModal from '@/components/rm/WorkOrderModal';

export default function BuildingRegisterPage() {
  const { companyId, profile } = useAppContext();
  const { isAllSites, selectedSiteId } = useSiteFilter();
  const { showToast } = useToast();
  const siteId = isAllSites ? null : selectedSiteId;

  const { assets, loading, fetchAssets, createAsset, updateAsset, archiveAsset } = useBuildingAssets(companyId, siteId);

  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<BuildingAsset | null>(null);
  const [woModalOpen, setWoModalOpen] = useState(false);
  const [woTargetAsset, setWoTargetAsset] = useState<BuildingAsset | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FabricCategory | 'all'>('all');
  const [conditionFilter, setConditionFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleSave = async (data: Parameters<typeof createAsset>[0]) => {
    if (editingAsset) {
      await updateAsset(editingAsset.id, data);
      showToast('Building asset updated', 'success');
    } else {
      await createAsset(data, profile?.id || '');
      showToast('Building asset added', 'success');
    }
    setEditingAsset(null);
  };

  const handleArchive = async (assetId: string) => {
    if (!confirm('Archive this building asset?')) return;
    await archiveAsset(assetId);
    showToast('Building asset archived', 'success');
  };

  const handleRaiseWorkOrder = (asset: BuildingAsset) => {
    setWoTargetAsset(asset);
    setWoModalOpen(true);
  };

  // Filter
  const filtered = assets.filter(a => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) &&
        !a.fabric_subcategory.toLowerCase().includes(search.toLowerCase()) &&
        !(a.location_description || '').toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (categoryFilter !== 'all' && a.fabric_category !== categoryFilter) return false;
    if (conditionFilter !== 'all' && a.condition_rating !== conditionFilter) return false;
    return true;
  });

  // Group by category
  const grouped = filtered.reduce<Record<string, BuildingAsset[]>>((acc, asset) => {
    const cat = asset.fabric_category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(asset);
    return acc;
  }, {});

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-theme-primary flex items-center gap-2">
            <Building2 className="w-6 h-6 text-assetly-dark dark:text-assetly" />
            Building Register
          </h1>
          <p className="text-sm text-theme-tertiary mt-1">
            Manage building fabric assets — roof, walls, plumbing, electrical, and more
          </p>
        </div>
        <button
          onClick={() => { setEditingAsset(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-assetly-dark dark:bg-assetly text-white dark:text-black hover:opacity-90 transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          Add Building Asset
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-tertiary" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, type, or location..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as FabricCategory | 'all')}
          className="px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm"
        >
          <option value="all">All Categories</option>
          {Object.entries(FABRIC_CATEGORIES).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <select
          value={conditionFilter}
          onChange={e => setConditionFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          className="px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm"
        >
          <option value="all">All Conditions</option>
          {CONDITION_RATINGS.map(cr => (
            <option key={cr.value} value={cr.value}>{cr.value}. {cr.label}</option>
          ))}
        </select>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 text-sm">
        <span className="text-theme-tertiary">{filtered.length} asset{filtered.length !== 1 ? 's' : ''}</span>
        {assets.filter(a => a.condition_rating && a.condition_rating <= 2).length > 0 && (
          <span className="text-red-500 font-medium">
            {assets.filter(a => a.condition_rating && a.condition_rating <= 2).length} in poor/critical condition
          </span>
        )}
        {assets.filter(a => a.next_inspection_date && new Date(a.next_inspection_date) < new Date()).length > 0 && (
          <span className="text-amber-500 font-medium">
            {assets.filter(a => a.next_inspection_date && new Date(a.next_inspection_date) < new Date()).length} overdue inspection{assets.filter(a => a.next_inspection_date && new Date(a.next_inspection_date) < new Date()).length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-assetly-dark dark:border-assetly" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-theme-tertiary mx-auto mb-3" />
          <h3 className="text-lg font-medium text-theme-primary mb-1">
            {assets.length === 0 ? 'No building assets yet' : 'No matching assets'}
          </h3>
          <p className="text-sm text-theme-tertiary mb-4">
            {assets.length === 0 ? 'Add your first building component to get started.' : 'Try adjusting your search or filters.'}
          </p>
          {assets.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-assetly-dark dark:bg-assetly text-white dark:text-black"
            >
              Add Building Asset
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, catAssets]) => (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-theme-secondary uppercase tracking-wider mb-3">
                {FABRIC_CATEGORIES[cat as FabricCategory]?.label || cat}
                <span className="text-theme-tertiary font-normal ml-2">({catAssets.length})</span>
              </h2>
              <div className="space-y-2">
                {catAssets.map(asset => (
                  <BuildingAssetCard
                    key={asset.id}
                    asset={asset}
                    onEdit={(a) => { setEditingAsset(a); setShowForm(true); }}
                    onArchive={handleArchive}
                    onRaiseWorkOrder={handleRaiseWorkOrder}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      <BuildingAssetForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingAsset(null); }}
        onSave={handleSave}
        editingAsset={editingAsset}
      />

      {/* Work Order modal */}
      <WorkOrderModal
        open={woModalOpen}
        onClose={() => { setWoModalOpen(false); setWoTargetAsset(null); }}
        onSave={async (data) => {
          const { useWorkOrders } = await import('@/hooks/assetly/useWorkOrders');
          // Direct insert for quick creation from building register
          const { supabase } = await import('@/lib/supabase');
          const { error } = await supabase.from('work_orders').insert({
            company_id: companyId,
            ...data,
            reported_by: profile?.id,
            wo_number: '',
            timeline: [{ action: 'created', by: profile?.id, at: new Date().toISOString() }],
          });
          if (error) throw error;
          showToast('Work order created', 'success');
        }}
        prefillBuildingAsset={woTargetAsset}
      />
    </div>
  );
}
