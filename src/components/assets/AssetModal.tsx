'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { supabase } from '@/lib/supabase';
import { 
  XCircle, 
  CheckCircle, 
  Archive, 
  ClipboardList 
} from 'lucide-react';
import { Database } from '@/lib/database.types';
import AssetLogsDrawer from './AssetLogsDrawer';

type Asset = Database['public']['Tables']['assets']['Row'];
type AssetInsert = Database['public']['Tables']['assets']['Insert'];
type AssetUpdate = Database['public']['Tables']['assets']['Update'];

interface AssetModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (asset: Asset) => void;
  asset?: Asset | null;
}

interface FormData {
  name: string;
  category: string;
  site_id: string;
  brand: string;
  model: string;
  serial_number: string;
  install_date: string;
  warranty_end: string;
  last_service_date: string;
  ppm_frequency_months: number;
  next_service_date: string;
  ppm_contractor_id: string;
  reactive_contractor_id: string;
  warranty_contractor_id: string;
  notes: string;
}

export default function AssetModal({ open, onClose, onSaved, asset }: AssetModalProps) {
  const { companyId, siteId } = useAppContext();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);
  const [contractors, setContractors] = useState<Array<{ id: string; name: string; region: string; category: string }>>([]);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  
  const [form, setForm] = useState<FormData>({
    name: '',
    category: '',
    site_id: '',
    brand: '',
    model: '',
    serial_number: '',
    install_date: '',
    warranty_end: '',
    last_service_date: '',
    ppm_frequency_months: 6,
    next_service_date: '',
    ppm_contractor_id: '',
    reactive_contractor_id: '',
    warranty_contractor_id: '',
    notes: '',
  });

  // Load sites and contractors on mount
  useEffect(() => {
    if (!open) return;
    
    const loadData = async () => {
      try {
        // Load sites
        const { data: sitesData, error: sitesError } = await supabase
          .from('sites')
          .select('id, name')
          .eq('company_id', companyId)
          .order('name', { ascending: true });
        
        if (sitesError) throw sitesError;
        setSites(sitesData || []);

        // Load contractors
        const { data: contractorsData, error: contractorsError } = await supabase
          .from('contractors')
          .select('id, name, region, category')
          .eq('company_id', companyId)
          .order('name', { ascending: true });
        
        if (contractorsError) throw contractorsError;
        setContractors(contractorsData || []);
      } catch (error) {
        console.error('Error loading data:', error);
        showToast({ title: 'Error', description: 'Failed to load form data', type: 'error' });
      }
    };

    loadData();
  }, [open, companyId, showToast]);

  // Initialize form with asset data or defaults
  useEffect(() => {
    if (asset && open) {
      setForm({
        name: asset.name || '',
        category: asset.category || '',
        site_id: asset.site_id || '',
        brand: asset.brand || '',
        model: asset.model || '',
        serial_number: asset.serial_number || '',
        install_date: asset.install_date || '',
        warranty_end: asset.warranty_end || '',
        last_service_date: asset.last_service_date || '',
        ppm_frequency_months: asset.ppm_frequency_months || 6,
        next_service_date: asset.next_service_date || '',
        ppm_contractor_id: asset.ppm_contractor_id || '',
        reactive_contractor_id: asset.reactive_contractor_id || '',
        warranty_contractor_id: asset.warranty_contractor_id || '',
        notes: asset.notes || '',
      });
    } else if (open) {
      // Reset form for new asset
      setForm({
        name: '',
        category: '',
        site_id: siteId || '',
        brand: '',
        model: '',
        serial_number: '',
        install_date: '',
        warranty_end: '',
        last_service_date: '',
        ppm_frequency_months: 6,
        next_service_date: '',
        ppm_contractor_id: '',
        reactive_contractor_id: '',
        warranty_contractor_id: '',
        notes: '',
      });
    }
  }, [asset, open, siteId]);

  // Re-initialize form when data loads (fixes dropdown pre-population)
  useEffect(() => {
    if (asset && open && sites.length > 0 && contractors.length > 0) {
      console.log('🔄 Re-initializing form with loaded data:', {
        site_id: asset.site_id,
        ppm_contractor_id: asset.ppm_contractor_id,
        reactive_contractor_id: asset.reactive_contractor_id,
        warranty_contractor_id: asset.warranty_contractor_id,
        sitesCount: sites.length,
        contractorsCount: contractors.length
      });
      
      // Re-set the form to ensure dropdowns are properly populated
      setForm(prev => ({
        ...prev,
        site_id: asset.site_id || prev.site_id,
        ppm_contractor_id: asset.ppm_contractor_id || prev.ppm_contractor_id,
        reactive_contractor_id: asset.reactive_contractor_id || prev.reactive_contractor_id,
        warranty_contractor_id: asset.warranty_contractor_id || prev.warranty_contractor_id,
      }));
    }
  }, [asset, open, sites.length, contractors.length]);

  const handleInputChange = useCallback((field: keyof FormData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!companyId) {
      showToast({ title: 'Error', description: 'No company context', type: 'error' });
      return;
    }

    if (!form.name || !form.category || !form.site_id) {
      showToast({ title: 'Validation Error', description: 'Name, category, and site are required', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const assetData: AssetInsert = {
        company_id: companyId,
        site_id: form.site_id,
        name: form.name,
        category: form.category,
        brand: form.brand || null,
        model: form.model || null,
        serial_number: form.serial_number || null,
        install_date: form.install_date || null,
        warranty_end: form.warranty_end || null,
        last_service_date: form.last_service_date || null,
        ppm_frequency_months: form.ppm_frequency_months || null,
        next_service_date: form.next_service_date || null,
        ppm_contractor_id: form.ppm_contractor_id || null,
        reactive_contractor_id: form.reactive_contractor_id || null,
        warranty_contractor_id: form.warranty_contractor_id || null,
        notes: form.notes || null,
        status: 'Active',
        archived: false,
      };

      if (asset?.id) {
        // Update existing asset
        const { data, error } = await supabase
          .from('assets')
          .update(assetData)
          .eq('id', asset.id)
          .select()
          .single();
        
        if (error) throw error;
        showToast({ title: 'Success', description: 'Asset updated successfully', type: 'success' });
        onSaved?.(data);
      } else {
        // Create new asset
        const { data, error } = await supabase
          .from('assets')
          .insert(assetData)
          .select()
          .single();
        
        if (error) throw error;
        showToast({ title: 'Success', description: 'Asset created successfully', type: 'success' });
        onSaved?.(data);
      }
      
      onClose();
    } catch (error: any) {
      console.error('Save error:', error);
      showToast({ title: 'Error', description: error.message || 'Failed to save asset', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [form, companyId, asset, showToast, onSaved, onClose]);

  const handleArchive = useCallback(async () => {
    if (!asset?.id) return;
    
    const confirmed = window.confirm('Are you sure you want to archive this asset? This action cannot be undone.');
    if (!confirmed) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('assets')
        .update({ 
          archived: true, 
          archived_at: new Date().toISOString() 
        })
        .eq('id', asset.id);
      
      if (error) throw error;
      showToast({ title: 'Success', description: 'Asset archived successfully', type: 'success' });
      onClose();
    } catch (error: any) {
      console.error('Archive error:', error);
      showToast({ title: 'Error', description: error.message || 'Failed to archive asset', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [asset, showToast, onClose]);

  const openAssetLog = useCallback((assetId: string) => {
    setShowLogsDrawer(true);
  }, []);

  return (
    <Dialog open={open}>
      <DialogContent 
        className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0 sm:p-0"
        style={{ backgroundColor: '#171717', border: '1px solid #404040' }}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between sticky top-0 bg-black/60 backdrop-blur-lg z-10 px-3 sm:px-4 py-3 rounded-t-2xl">
          <h2 className="text-base sm:text-lg font-semibold text-white">
            {asset?.id ? 'Edit Asset' : 'Add New Asset'}
          </h2>
          <div className="flex gap-2 sm:gap-3">
            {asset?.id && (
              <Button
                className="min-h-[44px] min-w-[44px] p-2 rounded-xl border border-[#00E0FF] text-[#00E0FF] bg-black/30 hover:shadow-[0_0_10px_#00E0FF] active:bg-black/50 touch-manipulation"
                onClick={() => openAssetLog(asset.id)}
                title="View Logs"
              >
                <ClipboardList size={18}/>
              </Button>
            )}
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Assignment Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-2">
                Assignment
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Site</label>
                  <select
                    required
                    value={form.site_id}
                    onChange={(e) => handleInputChange('site_id', e.target.value)}
                    className="w-full min-h-[44px] rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2.5 touch-manipulation"
                  >
                    <option value="">Select a site</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Category</label>
                  <select
                    required
                    value={form.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full min-h-[44px] rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2.5 touch-manipulation"
                  >
                    <option value="">Select a category</option>
                    <option value="refrigeration">Refrigeration</option>
                    <option value="cooking">Cooking Equipment</option>
                    <option value="dishwashing">Dishwashing</option>
                    <option value="coffee">Coffee Equipment</option>
                    <option value="safety">Safety Systems</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Identification Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-2">
                Identification
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Name</label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full min-h-[44px] rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2.5 touch-manipulation"
                    placeholder="e.g. Kitchen Fridge 1"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Brand</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    className="w-full rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2"
                    placeholder="e.g. Williams, Hoshizaki"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Model</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    className="w-full rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2"
                    placeholder="e.g. Williams H280"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Serial Number</label>
                  <input
                    type="text"
                    value={form.serial_number}
                    onChange={(e) => handleInputChange('serial_number', e.target.value)}
                    className="w-full rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2"
                    placeholder="Manufacturer serial"
                  />
                </div>
              </div>
            </div>

            {/* Lifecycle Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-2">
                Lifecycle
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Install Date</label>
                  <input
                    type="date"
                    value={form.install_date}
                    onChange={(e) => handleInputChange('install_date', e.target.value)}
                    className="w-full rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Warranty End</label>
                  <input
                    type="date"
                    value={form.warranty_end}
                    onChange={(e) => handleInputChange('warranty_end', e.target.value)}
                    className="w-full rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* PPM Schedule Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-2">
                PPM Schedule
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Last Service Date</label>
                  <input
                    type="date"
                    value={form.last_service_date}
                    onChange={(e) => handleInputChange('last_service_date', e.target.value)}
                    className="w-full rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Frequency (Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={form.ppm_frequency_months}
                    onChange={(e) => handleInputChange('ppm_frequency_months', parseInt(e.target.value) || 6)}
                    className="w-full rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Next Service Date</label>
                  <input
                    type="date"
                    value={form.next_service_date}
                    onChange={(e) => handleInputChange('next_service_date', e.target.value)}
                    className="w-full rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* Contractor Assignments */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-2">
                PPM Contractor
              </h3>
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">PPM Contractor</label>
                <select
                  value={form.ppm_contractor_id}
                  onChange={(e) => handleInputChange('ppm_contractor_id', e.target.value)}
                  className="w-full rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2"
                >
                  <option value="">Select PPM contractor</option>
                  {contractors.map((contractor) => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name} ({contractor.region})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-2">
                Reactive Contractor
              </h3>
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Reactive Contractor</label>
                <select
                  value={form.reactive_contractor_id}
                  onChange={(e) => handleInputChange('reactive_contractor_id', e.target.value)}
                  className="w-full rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2"
                >
                  <option value="">Select reactive contractor</option>
                  {contractors.map((contractor) => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name} ({contractor.region})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-2">
                Warranty Contractor
              </h3>
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Warranty Contractor</label>
                <select
                  value={form.warranty_contractor_id}
                  onChange={(e) => handleInputChange('warranty_contractor_id', e.target.value)}
                  className="w-full rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2"
                >
                  <option value="">Select warranty contractor</option>
                  {contractors.map((contractor) => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name} ({contractor.region})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-2">
                Notes / Docs
              </h3>
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2 min-h-[80px]"
                  rows={3}
                  placeholder="Additional notes about this asset"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 sticky bottom-0 bg-black/60 backdrop-blur-lg z-10 px-3 sm:px-4 py-3 rounded-b-2xl border-t border-neutral-700">
          <Button
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl border border-[#E0E0E0] text-[#E0E0E0] bg-black/30 backdrop-blur-md transition-all hover:shadow-[0_0_10px_#E0E0E0] active:bg-black/50 touch-manipulation"
            onClick={onClose}
            title="Cancel edit"
          >
            <XCircle size={18} />
          </Button>
          
          <Button
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl border border-[#FF00CC] text-[#FF00CC] bg-black/30 backdrop-blur-md transition-all hover:shadow-[0_0_10px_#FF00CC] active:bg-black/50 touch-manipulation"
            onClick={handleSave}
            disabled={loading}
            title="Save changes"
          >
            <CheckCircle size={18} />
          </Button>
          
          {asset?.id && (
            <Button
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl border border-[#FF7A00] text-[#FF7A00] bg-black/30 backdrop-blur-md transition-all hover:shadow-[0_0_10px_#FF7A00] active:bg-black/50 touch-manipulation"
              onClick={handleArchive}
              disabled={loading}
              title="Archive asset"
            >
              <Archive size={18} />
            </Button>
          )}
        </div>
      </DialogContent>
      
      {/* Asset Logs Drawer */}
      <AssetLogsDrawer
        asset={asset}
        open={showLogsDrawer}
        onClose={() => setShowLogsDrawer(false)}
      />
    </Dialog>
  );
}
