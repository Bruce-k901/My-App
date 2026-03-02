'use client';

import { useState, useEffect } from 'react';
import { X, Building2, Package } from '@/components/ui/icons';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { FABRIC_CATEGORIES, PRIORITY_CONFIG, WO_TYPE_CONFIG } from '@/types/rm';
import type { WOPriority, WOType, WOTargetType, BuildingAsset } from '@/types/rm';
import type { WorkOrderFormData } from '@/hooks/assetly/useWorkOrders';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: WorkOrderFormData) => Promise<void>;
  prefillBuildingAsset?: BuildingAsset | null;
}

export default function WorkOrderModal({ open, onClose, onSave, prefillBuildingAsset }: Props) {
  const { companyId } = useAppContext();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  // Reference data
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [contractors, setContractors] = useState<{ id: string; name: string }[]>([]);
  const [equipmentAssets, setEquipmentAssets] = useState<{ id: string; name: string; site_id: string }[]>([]);
  const [buildingAssets, setBuildingAssets] = useState<{ id: string; name: string; site_id: string }[]>([]);

  // Form state
  const [targetType, setTargetType] = useState<WOTargetType>('building_fabric');
  const [siteId, setSiteId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [buildingAssetId, setBuildingAssetId] = useState('');
  const [woType, setWoType] = useState<WOType>('reactive');
  const [priority, setPriority] = useState<WOPriority>('P3');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<string>('');

  // Load reference data
  useEffect(() => {
    if (!companyId || !open) return;

    Promise.all([
      supabase.from('sites').select('id, name').eq('company_id', companyId).order('name'),
      supabase.from('contractors').select('id, name').eq('company_id', companyId).order('name'),
      supabase.from('assets').select('id, name, site_id').eq('company_id', companyId).eq('archived', false).order('name'),
      supabase.from('building_assets').select('id, name, site_id').eq('company_id', companyId).eq('status', 'active').order('name'),
    ]).then(([sitesRes, contractorsRes, equipRes, buildingRes]) => {
      setSites(sitesRes.data || []);
      setContractors(contractorsRes.data || []);
      setEquipmentAssets(equipRes.data || []);
      setBuildingAssets(buildingRes.data || []);
    });
  }, [companyId, open]);

  // Prefill from building asset
  useEffect(() => {
    if (prefillBuildingAsset && open) {
      setTargetType('building_fabric');
      setSiteId(prefillBuildingAsset.site_id);
      setBuildingAssetId(prefillBuildingAsset.id);
      setStep(2);
    } else if (open) {
      resetForm();
    }
  }, [prefillBuildingAsset, open]);

  const resetForm = () => {
    setStep(1);
    setTargetType('building_fabric');
    setSiteId('');
    setAssetId('');
    setBuildingAssetId('');
    setWoType('reactive');
    setPriority('P3');
    setTitle('');
    setDescription('');
    setContractorId('');
    setScheduledDate('');
    setEstimatedCost('');
  };

  const handleSubmit = async () => {
    if (!title || !siteId) return;

    setSaving(true);
    try {
      await onSave({
        site_id: siteId,
        target_type: targetType,
        asset_id: targetType === 'equipment' ? assetId || undefined : undefined,
        building_asset_id: targetType === 'building_fabric' ? buildingAssetId || undefined : undefined,
        wo_type: woType,
        priority,
        title,
        description: description || undefined,
        assigned_to_contractor_id: contractorId || undefined,
        scheduled_date: scheduledDate || undefined,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : undefined,
      });
      resetForm();
      onClose();
    } catch (err) {
      console.error('Error creating work order:', err);
    } finally {
      setSaving(false);
    }
  };

  // Filter assets by selected site
  const filteredEquipment = siteId ? equipmentAssets.filter(a => a.site_id === siteId) : equipmentAssets;
  const filteredBuilding = siteId ? buildingAssets.filter(a => a.site_id === siteId) : buildingAssets;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-theme-surface border border-theme rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme sticky top-0 bg-theme-surface rounded-t-xl z-10">
          <h2 className="text-lg font-semibold text-theme-primary">New Work Order</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-theme-hover transition-colors">
            <X className="w-5 h-5 text-theme-secondary" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Step 1: Target */}
          {step === 1 && (
            <>
              <p className="text-sm text-theme-secondary font-medium">What needs attention?</p>

              {/* Target type */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetType('building_fabric')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    targetType === 'building_fabric'
                      ? 'border-assetly-dark dark:border-assetly bg-assetly-dark/5 dark:bg-assetly/5'
                      : 'border-theme hover:bg-theme-hover'
                  }`}
                >
                  <Building2 className={`w-8 h-8 ${targetType === 'building_fabric' ? 'text-assetly-dark dark:text-assetly' : 'text-theme-tertiary'}`} />
                  <span className="text-sm font-medium text-theme-primary">Building Fabric</span>
                  <span className="text-xs text-theme-tertiary text-center">Roof, walls, plumbing, electrical, etc.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('equipment')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    targetType === 'equipment'
                      ? 'border-assetly-dark dark:border-assetly bg-assetly-dark/5 dark:bg-assetly/5'
                      : 'border-theme hover:bg-theme-hover'
                  }`}
                >
                  <Package className={`w-8 h-8 ${targetType === 'equipment' ? 'text-assetly-dark dark:text-assetly' : 'text-theme-tertiary'}`} />
                  <span className="text-sm font-medium text-theme-primary">Equipment</span>
                  <span className="text-xs text-theme-tertiary text-center">Fridges, ovens, coffee machines, etc.</span>
                </button>
              </div>

              {/* Site */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">Site *</label>
                <select
                  value={siteId}
                  onChange={e => { setSiteId(e.target.value); setAssetId(''); setBuildingAssetId(''); }}
                  className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
                  required
                >
                  <option value="">Select site...</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Asset selection */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">
                  {targetType === 'building_fabric' ? 'Building Asset *' : 'Equipment Asset *'}
                </label>
                {targetType === 'building_fabric' ? (
                  <select
                    value={buildingAssetId}
                    onChange={e => setBuildingAssetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
                    required
                  >
                    <option value="">Select building asset...</option>
                    {filteredBuilding.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                ) : (
                  <select
                    value={assetId}
                    onChange={e => setAssetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
                    required
                  >
                    <option value="">Select equipment...</option>
                    {filteredEquipment.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!siteId || (targetType === 'building_fabric' ? !buildingAssetId : !assetId)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-assetly-dark dark:bg-assetly text-white dark:text-black disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {/* Step 2: Classification & Details */}
          {step === 2 && (
            <>
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">Work Order Type *</label>
                <select
                  value={woType}
                  onChange={e => setWoType(e.target.value as WOType)}
                  className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
                >
                  {Object.entries(WO_TYPE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label} — {config.description}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">Priority *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(PRIORITY_CONFIG) as [WOPriority, typeof PRIORITY_CONFIG[WOPriority]][]).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPriority(key)}
                      className={`flex flex-col items-center p-2 rounded-lg text-xs font-medium transition-colors border ${
                        priority === key
                          ? `${config.bgColour} ${config.colour} border-current`
                          : 'border-theme text-theme-tertiary hover:bg-theme-hover'
                      }`}
                    >
                      <span className="font-bold">{key}</span>
                      <span className="mt-0.5">{config.label}</span>
                      <span className="text-[10px] opacity-70">{config.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Brief description of the issue..."
                  className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Detailed description, location, severity..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30 resize-none"
                />
              </div>

              {/* Contractor */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">Assign Contractor</label>
                <select
                  value={contractorId}
                  onChange={e => setContractorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
                >
                  <option value="">Not assigned</option>
                  {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Scheduled date & cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1">Estimated Cost (£)</label>
                  <input
                    type="number"
                    value={estimatedCost}
                    onChange={e => setEstimatedCost(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg text-sm text-theme-secondary hover:bg-theme-hover transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving || !title}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-assetly-dark dark:bg-assetly text-white dark:text-black disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Creating...' : 'Create Work Order'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
