'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';

type Site = {
  id: string;
  name: string;
};

type Contractor = {
  id: string;
  name: string;
};

type AssetFormData = {
  name: string;
  category: string;
  site_id: string;
  contractor_id: string;
  serial_number: string;
  install_date: string;
  warranty_expiry: string;
  purchase_date: string;
  frequency_months: number | null;
  notes: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  asset?: any;
};

export default function AssetFormModal({ isOpen, onClose, onSuccess, asset }: Props) {
  const { companyId } = useAppContext();
  const [form, setForm] = useState<AssetFormData>({
    name: '',
    category: '',
    site_id: '',
    contractor_id: '',
    serial_number: '',
    install_date: '',
    warranty_expiry: '',
    purchase_date: '',
    frequency_months: null,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);

  // Load sites and contractors when modal opens
  useEffect(() => {
    if (!isOpen || !companyId) return;

    const loadData = async () => {
      try {
        // Load sites
        const { data: sitesData, error: sitesError } = await supabase
          .from('sites')
          .select('id, name')
          .eq('company_id', companyId)
          .order('name');

        if (sitesError) throw sitesError;
        setSites(sitesData || []);

        // Load contractors
        const { data: contractorsData, error: contractorsError } = await supabase
          .from('contractors')
          .select('id, name')
          .eq('company_id', companyId)
          .order('name');

        if (contractorsError) throw contractorsError;
        setContractors(contractorsData || []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [isOpen, companyId]);

  // Initialize form when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (asset?.id) {
      // Edit mode - populate with existing asset data
      setForm({
        name: asset.name || '',
        category: asset.category || '',
        site_id: asset.site_id || '',
        contractor_id: asset.contractor_id || '',
        serial_number: asset.serial_number || '',
        install_date: asset.install_date || '',
        warranty_expiry: asset.warranty_expiry || '',
        purchase_date: asset.purchase_date || '',
        frequency_months: asset.frequency_months || null,
        notes: asset.notes || '',
      });
    } else {
      // Add mode - reset form
      setForm({
        name: '',
        category: '',
        site_id: '',
        contractor_id: '',
        serial_number: '',
        install_date: '',
        warranty_expiry: '',
        purchase_date: '',
        frequency_months: null,
        notes: '',
      });
    }
  }, [isOpen, asset]);

  // Auto-populate warranty_expiry when install_date changes
  useEffect(() => {
    if (form.install_date) {
      const installDate = new Date(form.install_date);
      const warrantyExpiry = new Date(installDate);
      warrantyExpiry.setFullYear(installDate.getFullYear() + 1);
      
      setForm(prev => ({
        ...prev,
        warranty_expiry: warrantyExpiry.toISOString().split('T')[0]
      }));
    }
  }, [form.install_date]);

  // Auto-populate next_service_date when frequency_months changes
  // Note: This would typically update the next_service_date field, but since it's calculated
  // from last_service_date + frequency_months, we'll handle this in the backend

  const handleInputChange = (field: keyof AssetFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const showToast = (msg: string) => alert(msg);

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Please enter an asset name');
      return;
    }

    if (!companyId) {
      showToast('Company context missing — please refresh or reselect company.');
      return;
    }

    setLoading(true);

    try {
      const assetData = {
        company_id: companyId,
        name: form.name.trim(),
        category: form.category?.trim() || null,
        site_id: form.site_id || null,
        contractor_id: form.contractor_id || null,
        serial_number: form.serial_number?.trim() || null,
        install_date: form.install_date || null,
        warranty_expiry: form.warranty_expiry || null,
        purchase_date: form.purchase_date || null,
        frequency_months: form.frequency_months,
        notes: form.notes?.trim() || null,
      };

      if (asset?.id) {
        // Update existing asset
        const { error } = await supabase
          .from('assets')
          .update(assetData)
          .eq('id', asset.id);

        if (error) throw error;
        showToast('Asset updated successfully');
      } else {
        // Create new asset
        const { error } = await supabase
          .from('assets')
          .insert(assetData);

        if (error) throw error;
        showToast('Asset created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving asset:', error);
      showToast(`Failed to save asset: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-neutral-900 border border-white/10 rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-white mb-6">
          {asset ? 'Edit Asset' : 'Add Asset'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LEFT COLUMN */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300">Asset Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
                placeholder="Enter asset name..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
                placeholder="e.g., HVAC, Electrical, Plumbing..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">Site</label>
              <select
                value={form.site_id}
                onChange={(e) => handleInputChange('site_id', e.target.value)}
                className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
              >
                <option value="">Select site...</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">Contractor</label>
              <select
                value={form.contractor_id}
                onChange={(e) => handleInputChange('contractor_id', e.target.value)}
                className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
              >
                <option value="">Select contractor...</option>
                {contractors.map(contractor => (
                  <option key={contractor.id} value={contractor.id}>
                    {contractor.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">Serial Number</label>
              <input
                type="text"
                value={form.serial_number}
                onChange={(e) => handleInputChange('serial_number', e.target.value)}
                className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
                placeholder="Enter serial number..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">Install Date</label>
              <input
                type="date"
                value={form.install_date}
                onChange={(e) => handleInputChange('install_date', e.target.value)}
                className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300">Warranty Expiry</label>
              <input
                type="date"
                value={form.warranty_expiry}
                onChange={(e) => handleInputChange('warranty_expiry', e.target.value)}
                className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
              />
              <p className="text-xs text-gray-400 mt-1">Auto-calculated from install date + 1 year</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">Purchase Date</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => handleInputChange('purchase_date', e.target.value)}
                className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">Frequency (months)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={form.frequency_months || ''}
                onChange={(e) => handleInputChange('frequency_months', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
                placeholder="e.g., 6, 12, 24..."
              />
              <p className="text-xs text-gray-400 mt-1">PPM service frequency in months</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">Notes</label>
              <textarea
                rows={5}
                value={form.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-white"
                placeholder="Additional notes about this asset..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button 
            variant="ghost" 
            className="border border-white/[0.1] hover:border-white/[0.25] hover:bg-white/[0.07]" 
            onClick={onClose} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Asset'}
          </Button>
        </div>
      </div>
    </div>
  );
}