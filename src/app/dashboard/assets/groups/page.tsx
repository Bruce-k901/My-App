'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useSiteFilter } from '@/hooks/useSiteFilter';
import { useToast } from '@/components/ui/ToastProvider';
import { usePPMGroups } from '@/hooks/assetly/usePPMGroups';
import { PPMGroup, PPMGroupFormData } from '@/types/ppm';
import { getPPMStatus, formatServiceDate, getFrequencyText, getStatusDisplayText } from '@/utils/ppmHelpers';
import SiteSelector from '@/components/ui/SiteSelector';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import MultiSelect from '@/components/ui/MultiSelect';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import GroupCalloutModal from '@/components/modals/GroupCalloutModal';
import {
  Plus, Pencil, Trash2, X, Loader2,
  Layers, Wrench, Calendar, ChevronDown, ChevronUp,
  Package, PhoneCall,
} from '@/components/ui/icons';

type Contractor = { id: string; name: string };
type AvailableAsset = { id: string; name: string; category: string | null };

const FREQUENCY_OPTIONS = [
  { label: 'Monthly', value: '1' },
  { label: 'Quarterly', value: '3' },
  { label: '6-Monthly', value: '6' },
  { label: 'Annual', value: '12' },
  { label: 'Biennial (2 years)', value: '24' },
];

const emptyForm: PPMGroupFormData = {
  name: '',
  description: '',
  site_id: '',
  ppm_contractor_id: '',
  ppm_contractor_name: '',
  ppm_frequency_months: null,
  next_service_date: '',
  asset_ids: [],
};

export default function PPMGroupsPage() {
  const { companyId, profile } = useAppContext();
  const { selectedSiteId, isAllSites } = useSiteFilter();
  const { showToast } = useToast();
  const { groups, loading, fetchGroups, createGroup, updateGroup, deleteGroup, fetchAvailableAssets } = usePPMGroups(companyId, selectedSiteId);

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PPMGroupFormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [calloutGroupId, setCalloutGroupId] = useState<string | null>(null);

  // Lookups
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [availableAssets, setAvailableAssets] = useState<AvailableAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  // Load contractors
  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('contractors')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setContractors(data || []));
  }, [companyId]);

  // Load available assets when site changes in form
  useEffect(() => {
    if (!form.site_id) { setAvailableAssets([]); return; }
    setLoadingAssets(true);
    fetchAvailableAssets(form.site_id)
      .then(assets => {
        // If editing, also include assets already in this group
        if (editingId) {
          const group = groups.find(g => g.id === editingId);
          if (group) {
            const existingIds = new Set(group.assets.map(a => a.asset_id));
            const existingAssets: AvailableAsset[] = group.assets.map(a => ({
              id: a.asset_id,
              name: a.asset_name,
              category: a.asset_category,
            }));
            const merged = [...existingAssets, ...assets.filter((a: AvailableAsset) => !existingIds.has(a.id))];
            setAvailableAssets(merged);
          } else {
            setAvailableAssets(assets);
          }
        } else {
          setAvailableAssets(assets);
        }
      })
      .catch(err => { console.error('Failed to fetch available assets:', err); setAvailableAssets([]); })
      .finally(() => setLoadingAssets(false));
  }, [form.site_id, editingId]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setIsCreating(false);
    setEditingId(null);
  };

  const startEditing = (group: PPMGroup) => {
    setEditingId(group.id);
    setIsCreating(false);
    setForm({
      name: group.name,
      description: group.description || '',
      site_id: group.site_id,
      ppm_contractor_id: group.ppm_contractor_id || '',
      ppm_contractor_name: group.ppm_contractor_name || '',
      ppm_frequency_months: group.ppm_frequency_months,
      next_service_date: group.next_service_date || '',
      asset_ids: group.assets.map(a => a.asset_id),
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Group name is required', 'error'); return; }
    if (!form.site_id) { showToast('Please select a site', 'error'); return; }
    if (form.asset_ids.length === 0) { showToast('Please select at least one asset', 'error'); return; }

    try {
      setSaving(true);
      if (editingId) {
        await updateGroup(editingId, form);
        showToast('Group updated', 'success');
      } else {
        await createGroup(form, profile?.id || '');
        showToast('Group created', 'success');
      }
      resetForm();
    } catch (err: any) {
      console.error('Error saving PPM group:', err);
      showToast(err.message || 'Failed to save group', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteGroup(deleteId);
      showToast('Group deleted', 'success');
      setDeleteId(null);
      if (expandedId === deleteId) setExpandedId(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete group', 'error');
    }
  };

  const handleContractorChange = (contractorId: string) => {
    const c = contractors.find(c => c.id === contractorId);
    setForm(f => ({
      ...f,
      ppm_contractor_id: contractorId,
      ppm_contractor_name: c?.name || '',
    }));
  };

  const deleteGroupName = groups.find(g => g.id === deleteId)?.name || '';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary flex items-center gap-3">
            <Layers className="w-7 h-7 text-assetly" />
            PPM Asset Groups
          </h1>
          <p className="text-sm text-theme-tertiary mt-1">
            Group assets at the same site so a contractor services them all in one PPM visit
          </p>
        </div>
        {!isCreating && !editingId && (
          <button
            onClick={() => { setIsCreating(true); setEditingId(null); setForm({ ...emptyForm }); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-assetly text-white hover:bg-assetly/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Group
          </button>
        )}
      </div>

      {/* Create / Edit Form */}
      {(isCreating || editingId) && (
 <div className="bg-theme-surface ] border border-theme rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-theme-primary">
            {editingId ? 'Edit Group' : 'New PPM Group'}
          </h2>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Group Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Main Kitchen Refrigeration"
 className="w-full rounded-lg border border-gray-300 dark:border-white/[0.15] bg-theme-surface ] px-3 py-2 text-sm text-theme-primary placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-assetly/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional notes about this group"
 className="w-full rounded-lg border border-gray-300 dark:border-white/[0.15] bg-theme-surface ] px-3 py-2 text-sm text-theme-primary placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-assetly/50"
            />
          </div>

          {/* Site + Contractor row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Site *</label>
              {editingId ? (
                <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/[0.03] text-sm text-theme-secondary border border-theme">
                  {groups.find(g => g.id === editingId)?.site_name || 'Unknown site'}
                </div>
              ) : (
                <SiteSelector
                  value={form.site_id || null}
                  onChange={siteId => setForm(f => ({ ...f, site_id: siteId || '', asset_ids: [] }))}
                  placeholder="Select site..."
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">PPM Contractor</label>
              <SearchableSelect
                value={form.ppm_contractor_id}
                onValueChange={handleContractorChange}
                options={contractors.map(c => ({ label: c.name, value: c.id }))}
                placeholder="Select contractor..."
              />
            </div>
          </div>

          {/* Frequency + Next Service Date row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">PPM Frequency</label>
              <SearchableSelect
                value={form.ppm_frequency_months?.toString() || ''}
                onValueChange={v => setForm(f => ({ ...f, ppm_frequency_months: v ? parseInt(v) : null }))}
                options={FREQUENCY_OPTIONS}
                placeholder="Select frequency..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Next Service Date</label>
              <input
                type="date"
                value={form.next_service_date}
                onChange={e => setForm(f => ({ ...f, next_service_date: e.target.value }))}
 className="w-full rounded-lg border border-gray-300 dark:border-white/[0.15] bg-theme-surface ] px-3 py-2 text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-assetly/50"
              />
            </div>
          </div>

          {/* Assets — z-20 so dropdown renders above action buttons below */}
          <div className="relative z-20">
            <label className="block text-sm font-medium text-theme-secondary mb-1">
              Assets * {loadingAssets && <Loader2 className="w-3 h-3 inline animate-spin ml-1" />}
            </label>
            {!form.site_id ? (
              <p className="text-sm text-theme-tertiary italic">Select a site first to see available assets</p>
            ) : (
              <MultiSelect
                value={form.asset_ids}
                options={availableAssets.map(a => ({ label: `${a.name}${a.category ? ` (${a.category})` : ''}`, value: a.id }))}
                onChange={ids => setForm(f => ({ ...f, asset_ids: ids }))}
                placeholder="Select assets to group..."
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-assetly text-white hover:bg-assetly/90 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingId ? 'Save Changes' : 'Create Group'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/[0.15] text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-assetly" />
        </div>
      )}

      {/* Empty State */}
      {!loading && groups.length === 0 && !isCreating && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Layers className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-theme-secondary mb-2">No PPM Groups Yet</h3>
          <p className="text-sm text-theme-tertiary mb-6 max-w-md">
            Group assets at the same site so your contractor can service them all in a single PPM visit.
          </p>
          <button
            onClick={() => { setIsCreating(true); setForm({ ...emptyForm }); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-assetly text-white hover:bg-assetly/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Your First Group
          </button>
        </div>
      )}

      {/* Group Cards */}
      {!loading && groups.length > 0 && (
        <div className="space-y-3">
          {groups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              expanded={expandedId === group.id}
              onToggle={() => setExpandedId(expandedId === group.id ? null : group.id)}
              onEdit={() => startEditing(group)}
              onDelete={() => setDeleteId(group.id)}
              onCallout={() => setCalloutGroupId(group.id)}
              isEditing={editingId === group.id}
            />
          ))}
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete PPM Group"
        description={`Are you sure you want to delete "${deleteGroupName}"? The assets in this group will be unlinked and return to individual PPM scheduling.`}
        confirmText="Delete Group"
        variant="destructive"
      />

      {/* Group Callout Modal */}
      {calloutGroupId && (() => {
        const calloutGroup = groups.find(g => g.id === calloutGroupId);
        return calloutGroup ? (
          <GroupCalloutModal
            open={true}
            onClose={() => setCalloutGroupId(null)}
            group={calloutGroup}
            onSuccess={fetchGroups}
          />
        ) : null;
      })()}
    </div>
  );
}

function GroupCard({
  group,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onCallout,
  isEditing,
}: {
  group: PPMGroup;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCallout: () => void;
  isEditing: boolean;
}) {
  const { status, color, borderColor } = getPPMStatus(group.next_service_date, group.ppm_status);
  const statusText = getStatusDisplayText(status);
  const frequencyText = getFrequencyText(group.ppm_frequency_months);

  return (
    <div className={`bg-white dark:bg-white/[0.02] rounded-xl border-2 transition-all duration-200 ${isEditing ? 'opacity-40 pointer-events-none' : ''} ${borderColor}`}>
      {/* Collapsed row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        <Layers className="w-5 h-5 text-assetly flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-theme-primary truncate">
            {group.name}
          </h3>
          <p className="text-xs text-theme-tertiary mt-0.5">
            {group.site_name || 'No site'} &middot; {group.asset_count} asset{group.asset_count !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Info chips */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          {group.ppm_contractor_name && (
            <span className="flex items-center gap-1 text-xs text-theme-tertiary">
              <Wrench className="w-3.5 h-3.5" />
              {group.ppm_contractor_name}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-theme-tertiary">
            <Calendar className="w-3.5 h-3.5" />
            {frequencyText}
          </span>
          {group.next_service_date && (
            <span className="text-xs text-theme-tertiary">
              Next: {formatServiceDate(group.next_service_date)}
            </span>
          )}
        </div>

        {/* Status badge */}
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${color}`}>
          {statusText}
        </span>

        {expanded ? (
          <ChevronUp className="w-4 h-4 text-theme-tertiary flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-theme-tertiary flex-shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-theme px-5 py-4 space-y-4">
          {/* Description */}
          {group.description && (
            <p className="text-sm text-theme-secondary">{group.description}</p>
          )}

          {/* Mobile info (hidden on desktop, shown here) */}
          <div className="md:hidden space-y-2 text-sm text-theme-secondary">
            {group.ppm_contractor_name && (
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4" /> {group.ppm_contractor_name}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" /> {frequencyText}
            </div>
            {group.next_service_date && (
              <div>Next service: {formatServiceDate(group.next_service_date)}</div>
            )}
            {group.last_service_date && (
              <div>Last service: {formatServiceDate(group.last_service_date)}</div>
            )}
          </div>

          {/* Assets list */}
          <div>
            <h4 className="text-sm font-medium text-theme-secondary mb-2">
              Grouped Assets ({group.asset_count})
            </h4>
            {group.assets.length === 0 ? (
              <p className="text-sm text-theme-tertiary italic">No assets in this group</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.assets.map(asset => (
                  <div
                    key={asset.asset_id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-theme text-sm"
                  >
                    <Package className="w-4 h-4 text-assetly/70 flex-shrink-0" />
                    <span className="text-theme-primary truncate">{asset.asset_name}</span>
                    {asset.asset_category && (
                      <span className="text-theme-tertiary text-xs ml-auto flex-shrink-0">
                        {asset.asset_category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-theme">
            <button
              onClick={onCallout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-assetly bg-assetly/10 hover:bg-assetly/20 transition-colors font-medium"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Create PPM Callout
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
