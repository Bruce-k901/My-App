'use client';

import { useState, useEffect } from 'react';
import { X } from '@/components/ui/icons';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { FABRIC_CATEGORIES, CONDITION_RATINGS } from '@/types/rm';
import type { FabricCategory, FabricSubcategory, BuildingAsset } from '@/types/rm';
import type { BuildingAssetFormData } from '@/hooks/assetly/useBuildingAssets';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: BuildingAssetFormData) => Promise<void>;
  editingAsset?: BuildingAsset | null;
}

export default function BuildingAssetForm({ open, onClose, onSave, editingAsset }: Props) {
  const { companyId } = useAppContext();
  const [saving, setSaving] = useState(false);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [contractors, setContractors] = useState<{ id: string; name: string }[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [siteId, setSiteId] = useState('');
  const [fabricCategory, setFabricCategory] = useState<FabricCategory>('structural');
  const [fabricSubcategory, setFabricSubcategory] = useState<string>('');
  const [locationDescription, setLocationDescription] = useState('');
  const [conditionRating, setConditionRating] = useState<number | undefined>();
  const [conditionNotes, setConditionNotes] = useState('');
  const [installYear, setInstallYear] = useState<number | undefined>();
  const [expectedLifeYears, setExpectedLifeYears] = useState<number | undefined>();
  const [areaOrQuantity, setAreaOrQuantity] = useState('');
  const [inspectionFrequencyMonths, setInspectionFrequencyMonths] = useState<number | undefined>();
  const [nextInspectionDate, setNextInspectionDate] = useState('');
  const [maintenanceContractorId, setMaintenanceContractorId] = useState('');
  const [emergencyContractorId, setEmergencyContractorId] = useState('');
  const [notes, setNotes] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (editingAsset) {
      setName(editingAsset.name);
      setSiteId(editingAsset.site_id);
      setFabricCategory(editingAsset.fabric_category);
      setFabricSubcategory(editingAsset.fabric_subcategory);
      setLocationDescription(editingAsset.location_description || '');
      setConditionRating(editingAsset.condition_rating || undefined);
      setConditionNotes(editingAsset.condition_notes || '');
      setInstallYear(editingAsset.install_year || undefined);
      setExpectedLifeYears(editingAsset.expected_life_years || undefined);
      setAreaOrQuantity(editingAsset.area_or_quantity || '');
      setInspectionFrequencyMonths(editingAsset.inspection_frequency_months || undefined);
      setNextInspectionDate(editingAsset.next_inspection_date || '');
      setMaintenanceContractorId(editingAsset.maintenance_contractor_id || '');
      setEmergencyContractorId(editingAsset.emergency_contractor_id || '');
      setNotes(editingAsset.notes || '');
    } else {
      resetForm();
    }
  }, [editingAsset, open]);

  // Load sites and contractors
  useEffect(() => {
    if (!companyId || !open) return;
    supabase.from('sites').select('id, name').eq('company_id', companyId).order('name')
      .then(({ data }) => setSites(data || []));
    supabase.from('contractors').select('id, name').eq('company_id', companyId).order('name')
      .then(({ data }) => setContractors(data || []));
  }, [companyId, open]);

  const resetForm = () => {
    setName('');
    setSiteId('');
    setFabricCategory('structural');
    setFabricSubcategory('');
    setLocationDescription('');
    setConditionRating(undefined);
    setConditionNotes('');
    setInstallYear(undefined);
    setExpectedLifeYears(undefined);
    setAreaOrQuantity('');
    setInspectionFrequencyMonths(undefined);
    setNextInspectionDate('');
    setMaintenanceContractorId('');
    setEmergencyContractorId('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !siteId || !fabricCategory || !fabricSubcategory) return;

    setSaving(true);
    try {
      await onSave({
        name,
        site_id: siteId,
        fabric_category: fabricCategory,
        fabric_subcategory: fabricSubcategory as FabricSubcategory,
        location_description: locationDescription || undefined,
        condition_rating: conditionRating,
        condition_notes: conditionNotes || undefined,
        install_year: installYear,
        expected_life_years: expectedLifeYears,
        area_or_quantity: areaOrQuantity || undefined,
        inspection_frequency_months: inspectionFrequencyMonths,
        next_inspection_date: nextInspectionDate || undefined,
        maintenance_contractor_id: maintenanceContractorId || undefined,
        emergency_contractor_id: emergencyContractorId || undefined,
        notes: notes || undefined,
      });
      resetForm();
      onClose();
    } catch (err) {
      console.error('Error saving building asset:', err);
    } finally {
      setSaving(false);
    }
  };

  const subcategories = FABRIC_CATEGORIES[fabricCategory]?.subcategories || [];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-theme-surface border border-theme rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme sticky top-0 bg-theme-surface rounded-t-xl z-10">
          <h2 className="text-lg font-semibold text-theme-primary">
            {editingAsset ? 'Edit Building Asset' : 'Add Building Asset'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-theme-hover transition-colors">
            <X className="w-5 h-5 text-theme-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Main Building Roof"
              className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
              required
            />
          </div>

          {/* Site */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Site *</label>
            <select
              value={siteId}
              onChange={e => setSiteId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
              required
            >
              <option value="">Select site...</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Category *</label>
              <select
                value={fabricCategory}
                onChange={e => { setFabricCategory(e.target.value as FabricCategory); setFabricSubcategory(''); }}
                className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
              >
                {Object.entries(FABRIC_CATEGORIES).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Subcategory *</label>
              <select
                value={fabricSubcategory}
                onChange={e => setFabricSubcategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
                required
              >
                <option value="">Select...</option>
                {subcategories.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Location Description</label>
            <input
              type="text"
              value={locationDescription}
              onChange={e => setLocationDescription(e.target.value)}
              placeholder="e.g. North wing, 2nd floor"
              className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
            />
          </div>

          {/* Condition Rating */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Condition Rating</label>
            <div className="flex gap-2">
              {CONDITION_RATINGS.map(cr => (
                <button
                  key={cr.value}
                  type="button"
                  onClick={() => setConditionRating(conditionRating === cr.value ? undefined : cr.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${
                    conditionRating === cr.value
                      ? `${cr.bgColour} ${cr.colour} border-current`
                      : 'border-theme text-theme-tertiary hover:bg-theme-hover'
                  }`}
                >
                  {cr.value}. {cr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Condition Notes */}
          {conditionRating && conditionRating <= 3 && (
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Condition Notes</label>
              <textarea
                value={conditionNotes}
                onChange={e => setConditionNotes(e.target.value)}
                placeholder="Describe the current condition..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30 resize-none"
              />
            </div>
          )}

          {/* Lifecycle */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Install Year</label>
              <input
                type="number"
                value={installYear || ''}
                onChange={e => setInstallYear(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="2020"
                min={1900}
                max={2100}
                className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Expected Life (yrs)</label>
              <input
                type="number"
                value={expectedLifeYears || ''}
                onChange={e => setExpectedLifeYears(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="25"
                min={1}
                className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Area / Quantity</label>
              <input
                type="text"
                value={areaOrQuantity}
                onChange={e => setAreaOrQuantity(e.target.value)}
                placeholder="250 sqm"
                className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
              />
            </div>
          </div>

          {/* Inspection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Inspection Frequency</label>
              <select
                value={inspectionFrequencyMonths || ''}
                onChange={e => setInspectionFrequencyMonths(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
              >
                <option value="">Not set</option>
                <option value="1">Monthly</option>
                <option value="3">Quarterly</option>
                <option value="6">6 Monthly</option>
                <option value="12">Annual</option>
                <option value="24">Biennial</option>
                <option value="60">5 Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Next Inspection</label>
              <input
                type="date"
                value={nextInspectionDate}
                onChange={e => setNextInspectionDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
              />
            </div>
          </div>

          {/* Contractors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Maintenance Contractor</label>
              <select
                value={maintenanceContractorId}
                onChange={e => setMaintenanceContractorId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
              >
                <option value="">None</option>
                {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Emergency Contractor</label>
              <select
                value={emergencyContractorId}
                onChange={e => setEmergencyContractorId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
              >
                <option value="">None</option>
                {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-theme-secondary hover:bg-theme-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name || !siteId || !fabricSubcategory}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-assetly-dark dark:bg-assetly text-white dark:text-black disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : editingAsset ? 'Update' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
