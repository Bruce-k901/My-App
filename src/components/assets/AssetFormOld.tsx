'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateAsset } from '@/hooks/useCreateAsset';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { supabase } from '@/lib/supabaseClient';
import Select from '@/components/ui/Select';
import CheckboxCustom from '@/components/ui/CheckboxCustom';
import { Tooltip } from '@/components/ui/tooltip/Tooltip';
import { Save, XCircle, Loader2 } from '@/components/ui/icons';

export default function AssetForm({ open, onClose, onSaved, asset }: { open: boolean; onClose: () => void; onSaved?: (asset: any) => void; asset?: any }) {
  const { companyId, siteId } = useAppContext();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: '',
    category: '',
    site_id: '',
    model: '',
    serial_number: '',
    brand: '',
    install_date: '',
    warranty_end: '',
    next_service_date: '',
    status: 'Active',
    notes: '',
    ppm_contractor_id: '',
    reactive_contractor_id: '',
    warranty_contractor_id: '',
    document_url: '',
    document_file: null as File | null,
  });
  const [initialForm, setInitialForm] = useState(form);
  const [sites, setSites] = useState<Array<{ id: string; name: string; region: string }>>([]);
  const [contractors, setContractors] = useState<Array<{ id: string; name: string; region: string; category: string; type: string }>>([]);
  const [ppmContractors, setPpmContractors] = useState<Array<{ id: string; name: string; region: string; category: string; type: string }>>([]);
  const [reactiveContractors, setReactiveContractors] = useState<Array<{ id: string; name: string; region: string; category: string; type: string }>>([]);
  const [warrantyContractors, setWarrantyContractors] = useState<Array<{ id: string; name: string; region: string; category: string; type: string }>>([]);

  const { createAsset, loading } = useCreateAsset();

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, region')
        .order('name', { ascending: true });
      if (!mounted) return;
      if (error) {
        console.error('Failed to load sites:', error);
      } else {
        setSites(data || []);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open]);

  // Load contractors for the asset
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      try {
        if (asset?.id) {
          // Load contractors for existing asset
          const { data, error } = await supabase.rpc('get_contractors_for_asset', {
            asset_id: asset.id
          });
          if (!mounted) return;
          if (error) {
            console.error('Failed to load contractors:', error);
            setContractors([]);
            setPpmContractors([]);
            setReactiveContractors([]);
            setWarrantyContractors([]);
          } else {
            const contractorsData = data || [];
            setContractors(contractorsData);
            
            // Filter by type for existing assets
            const ppmData = contractorsData.filter(c => c.type === 'ppm');
            const reactiveData = contractorsData.filter(c => c.type === 'reactive');
            const warrantyData = contractorsData.filter(c => c.type === 'warranty');
            
            setPpmContractors(ppmData);
            setReactiveContractors(reactiveData);
            setWarrantyContractors(warrantyData);
          }
        } else {
          // Load all contractors for new asset
          const { data, error } = await supabase
            .from('contractors')
            .select('id, name, region, category, type')
            .eq('company_id', companyId)
            .order('name');
          if (!mounted) return;
          if (error) {
            console.error('Failed to load contractors:', error);
            setContractors([]);
            setPpmContractors([]);
            setReactiveContractors([]);
            setWarrantyContractors([]);
          } else {
            const contractorsData = data || [];
            setContractors(contractorsData);
            
            // Filter by type for new assets
            const ppmData = contractorsData.filter(c => c.type === 'ppm');
            const reactiveData = contractorsData.filter(c => c.type === 'reactive');
            const warrantyData = contractorsData.filter(c => c.type === 'warranty');
            
            setPpmContractors(ppmData);
            setReactiveContractors(reactiveData);
            setWarrantyContractors(warrantyData);
          }
        }
      } catch (err) {
        console.error('Error loading contractors:', err);
        if (mounted) {
          setContractors([]);
          setPpmContractors([]);
          setReactiveContractors([]);
          setWarrantyContractors([]);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open, asset?.id, companyId]);

  // Initialize form with asset data if editing - using React Hook Form reset
  useEffect(() => {
    if (asset && open) {
      const selectedSite = sites.find(s => s.id === asset.site_id);
      setForm({
        name: asset.name || '',
        category: asset.category || '',
        site_id: asset.site_id || '',
        model: asset.model || '',
        serial_number: asset.serial_number || '',
        brand: asset.brand || '',
        install_date: asset.install_date || '',
        warranty_end: asset.warranty_end || '',
        next_service_date: asset.next_service_date || '',
        status: asset.status || 'Active',
        notes: asset.notes || '',
        ppm_contractor_id: asset.ppm_contractor_id || '',
        reactive_contractor_id: asset.reactive_contractor_id || '',
        warranty_contractor_id: asset.warranty_contractor_id || '',
        document_url: asset.document_url || '',
        document_file: null as File | null,
      });
    } else if (open) {
      // Reset form for new asset
      setForm({
        name: '',
        category: '',
        site_id: siteId || '',
        model: '',
        serial_number: '',
        brand: '',
        install_date: '',
        warranty_end: '',
        next_service_date: '',
        status: 'Active',
        notes: '',
        ppm_contractor_id: '',
        reactive_contractor_id: '',
        warranty_contractor_id: '',
        document_url: '',
        document_file: null as File | null,
      });
    }
  }, [asset, open, siteId]);

  // Re-apply form values after async data loads (sites, contractors)
  useEffect(() => {
    if (asset && open && sites.length > 0 && contractors.length > 0) {
      console.log('🔄 Re-initializing form with loaded data:', {
        site_id: asset.site_id,
        category: asset.category,
        ppm_contractor_id: asset.ppm_contractor_id,
        reactive_contractor_id: asset.reactive_contractor_id,
        sites_loaded: sites.length,
        contractors_loaded: contractors.length
      });
      
      // Force a complete form reset to ensure controlled components update
      const selectedSite = sites.find(s => s.id === asset.site_id);
      const formData = {
        name: asset.name || '',
        category: asset.category || '',
        site_id: asset.site_id || '',
        region: selectedSite?.region || '',
        model: asset.model || '',
        serial_number: asset.serial_number || '',
        brand: asset.brand || '',
        install_date: asset.install_date || '',
        warranty_end: asset.warranty_end || '',
        next_service_date: asset.next_service_date || '',
        status: asset.status || 'Active',
        notes: asset.notes || '',
        ppm_contractor_id: asset.ppm_contractor_id || '',
        reactive_contractor_id: asset.reactive_contractor_id || '',
        warranty_contractor_id: asset.warranty_contractor_id || '',
        document_url: asset.document_url || '',
        document_file: null as File | null,
      };
      
      setForm(formData);
    }
  }, [asset, open, sites.length, contractors.length]);


  // Check if form has unsaved changes
  const isFormDirty = () => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  };

  const handleSave = async () => {
    if (!companyId) {
      showToast({ title: 'Missing company', description: 'No company context detected. Please sign in or complete setup.', type: 'error' });
      return;
    }

    let document_url: string | undefined = form.document_url;
    try {
      // Upload manual/certificate if provided
      if (form.document_file) {
        const file = form.document_file;
        const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const path = `certificates/${companyId}/${form.site_id || 'global'}/assets/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
        const { error: uploadErr } = await supabase.storage.from('certificates').upload(path, file, { upsert: true });
        if (!uploadErr) {
          document_url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`;
        } else {
          showToast({ title: 'Upload failed', description: uploadErr.message || 'Could not upload file', type: 'error' });
        }
      }

      const payload = {
        ...form,
        document_url,
        company_id: companyId,
        site_id: form.site_id,
      };

      if (asset?.id) {
        // Update existing asset
        const { error } = await supabase
          .from('assets')
          .update(payload)
          .eq('id', asset.id);
        
        if (error) {
          showToast({ title: 'Update failed', description: error.message || 'Could not update asset', type: 'error' });
          return;
        }
        showToast({ title: 'Asset updated successfully.', type: 'success' });
        
        // Return updated asset data
        const updatedAsset = {
          ...asset,
          ...payload,
        };
        onSaved?.(updatedAsset);
      } else {
        // Create new asset
        const { data, error } = await createAsset(payload);
        if (error) {
          // Error toast is handled inside useCreateAsset
          return;
        }
        showToast({ title: 'Asset created successfully.', type: 'success' });
        
        // Optimistically append to list via callback
        const optimistic = {
          id: data,
          name: form.name || null,
          category: form.category || null,
          model: form.model || null,
          serial_number: form.serial_number || null,
          install_date: form.install_date || null,
          warranty_end: form.warranty_end || null,
          next_service_date: form.next_service_date || null,
          status: form.status || 'Active',
          notes: form.notes || null,
          ppm_contractor_id: form.ppm_contractor_id || null,
        };
        onSaved?.(optimistic);
      }
    } catch (err: any) {
      showToast({ title: 'Save failed', description: err?.message || 'Could not save asset', type: 'error' });
      return;
    }
    onClose();
  };

  const handleCancel = () => {
    if (isFormDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) return;
    }
    onClose();
  };

  return (
    <Dialog open={open}>
      <DialogContent 
        className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: '#171717', border: '1px solid #404040', minWidth: '900px' }}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-neutral-900 border-b border-theme p-6 flex justify-between items-center z-10">
          <DialogTitle className="text-xl font-semibold text-theme-primary">
            {asset?.id ? 'Edit Asset' : 'Add New Asset'}
          </DialogTitle>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="px-4 py-2"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              form="asset-form"
              disabled={loading}
              className="px-4 py-2"
            >
              {loading ? 'Saving...' : (asset?.id ? 'Update Asset' : 'Save Asset')}
            </Button>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="asset-form" onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
            
            {/* Section A: Assignment - Full Width */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-theme-tertiary uppercase tracking-wide border-b border-theme pb-2">
                Assignment
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Select
                    label="Assign to Site"
                    value={form.site_id || ''}
                    onValueChange={(val) => {
                      const selectedSite = sites.find(s => s.id === val);
                      setForm(prev => ({
                        ...prev,
                        site_id: val,
                        region: selectedSite?.region || ''
                      }));
                    }}
                    options={sites.map(s => ({ label: s.name, value: s.id }))}
                    placeholder="Select a site"
                    className="w-full"
                  />
                  {/* Region display */}
                  {form.region && (
                    <div className="text-xs text-theme-tertiary mt-1">
                      Region: {form.region}
                    </div>
                  )}
                  {/* Debug info */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-theme-tertiary mt-1">
                      Debug: form.site_id="{form.site_id}", sites={sites.length}, 
                      selected={sites.find(s => s.id === form.site_id)?.name || 'none'}
                    </div>
                  )}
                </div>
                <div>
                  <Select
                    label="Asset Category"
                    value={form.category || ''}
                    onValueChange={(val) => setForm(prev => ({ ...prev, category: val }))}
                    options={[
                      { label: 'Refrigeration', value: 'refrigeration' },
                      { label: 'Cooking Equipment', value: 'cooking' },
                      { label: 'Dishwashing', value: 'dishwashing' },
                      { label: 'Coffee Equipment', value: 'coffee' },
                      { label: 'Safety Systems', value: 'safety' },
                      { label: 'Other', value: 'other' }
                    ]}
                    placeholder="Select a category"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Section B: Identification - Two Columns */}
            <div className="space-y-4 mt-6">
              <h3 className="text-sm font-medium text-theme-tertiary uppercase tracking-wide border-b border-theme pb-2">
                Identification
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-theme-tertiary mb-1 block">Asset Name</label>
                  <Input
                    placeholder="e.g. Kitchen Fridge 1"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-theme-tertiary mb-1 block">Serial Number</label>
                  <Input
                    placeholder="Manufacturer serial"
                    value={form.serial_number}
                    onChange={(e) => setForm(prev => ({ ...prev, serial_number: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-theme-tertiary mb-1 block">Brand</label>
                  <Input
                    placeholder="e.g. Williams, Hoshizaki"
                    value={form.brand}
                    onChange={(e) => setForm(prev => ({ ...prev, brand: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-theme-tertiary mb-1 block">Model</label>
                  <Input
                    placeholder="e.g. Williams H280"
                    value={form.model}
                    onChange={(e) => setForm(prev => ({ ...prev, model: e.target.value }))}
                    className="placeholder:italic placeholder:text-theme-tertiary"
                  />
                </div>
              </div>
            </div>

            {/* Section C: Lifecycle - Two Columns */}
            <div className="space-y-4 mt-6">
              <h3 className="text-sm font-medium text-theme-tertiary uppercase tracking-wide border-b border-theme pb-2">
                Lifecycle
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-theme-tertiary mb-1 block">Install Date</label>
                  <Input
                    type="date"
                    value={form.install_date}
                    onChange={(e) => setForm(prev => ({ ...prev, install_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-theme-tertiary mb-1 block">Warranty End Date</label>
                  <Input
                    type="date"
                    value={form.warranty_end}
                    onChange={(e) => setForm(prev => ({ ...prev, warranty_end: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-theme-tertiary mb-1 block">Next Service Date</label>
                  <Input
                    type="date"
                    value={form.next_service_date}
                    onChange={(e) => setForm(prev => ({ ...prev, next_service_date: e.target.value }))}
                  />
                  {!form.next_service_date && form.install_date && (
                    <p className="text-xs text-theme-tertiary mt-1">
                      Suggestion: {new Date(new Date(form.install_date).setMonth(new Date(form.install_date).getMonth() + 6)).toISOString().split('T')[0]}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-theme-tertiary mb-1 block">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full rounded bg-neutral-800 border border-theme text-theme-primary text-sm px-3 py-2"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section D: Notes - Full Width */}
            <div className="space-y-4 mt-6">
              <h3 className="text-sm font-medium text-theme-tertiary uppercase tracking-wide border-b border-theme pb-2">
                Notes
              </h3>
              <div>
                <label className="text-sm text-theme-tertiary mb-1 block">Notes</label>
                <textarea
                  placeholder="Additional notes about this asset"
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded bg-neutral-800 border border-theme text-theme-primary text-sm px-3 py-2 min-h-[80px]"
                  rows={3}
                />
              </div>
            </div>

            {/* Section E: Contractor Assignments - Three Columns */}
            <div className="space-y-4 mt-6">
              <h3 className="text-sm font-medium text-theme-tertiary uppercase tracking-wide border-b border-theme pb-2">
                Contractor Assignments
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Select
                    label="PPM Contractor"
                    value={form.ppm_contractor_id || ''}
                    onValueChange={(val) => setForm(prev => ({ ...prev, ppm_contractor_id: val }))}
                    options={ppmContractors.map(contractor => ({ 
                      label: `${contractor.name} (${contractor.region})`, 
                      value: contractor.id 
                    }))}
                    placeholder="Select PPM contractor"
                    className="w-full"
                  />
                   {ppmContractors.length === 0 && (
                     <p className="text-xs text-theme-tertiary mt-1">
                       No PPM contractors available for this asset's region/category
                     </p>
                   )}
                   {/* Debug info */}
                   {process.env.NODE_ENV === 'development' && (
                     <div className="text-xs text-theme-tertiary mt-1">
                       Debug: ppm_contractor_id="{form.ppm_contractor_id}", ppm_contractors={ppmContractors.length},
                       selected={ppmContractors.find(c => c.id === form.ppm_contractor_id)?.name || 'none'}
                     </div>
                   )}
                 </div>
                 <div>
                   <Select
                     label="Reactive Contractor"
                     value={form.reactive_contractor_id || ''}
                     onValueChange={(val) => setForm(prev => ({ ...prev, reactive_contractor_id: val }))}
                     options={reactiveContractors.map(contractor => ({ 
                       label: `${contractor.name} (${contractor.region})`, 
                       value: contractor.id 
                     }))}
                     placeholder="Select reactive contractor"
                     className="w-full"
                   />
                   {reactiveContractors.length === 0 && (
                     <p className="text-xs text-theme-tertiary mt-1">
                       No reactive contractors available for this asset's region/category
                     </p>
                   )}
                 </div>
                 <div>
                   <Select
                     label="Warranty Contractor"
                     value={form.warranty_contractor_id || ''}
                     onValueChange={(val) => setForm(prev => ({ ...prev, warranty_contractor_id: val }))}
                     options={warrantyContractors.map(contractor => ({ 
                       label: `${contractor.name} (${contractor.region})`, 
                       value: contractor.id 
                     }))}
                     placeholder="Select warranty contractor"
                     className="w-full"
                   />
                   {warrantyContractors.length === 0 && (
                     <p className="text-xs text-theme-tertiary mt-1">
                       No warranty contractors available for this asset's region/category
                     </p>
                   )}
                 </div>
               </div>
             </div>

             {/* Document Upload Section */}
             <div className="space-y-4 mt-6">
               <h3 className="text-sm font-medium text-theme-tertiary uppercase tracking-wide border-b border-theme pb-2">
                 Documentation
               </h3>
               <div>
                 <label className="text-sm text-theme-tertiary mb-1 block">Upload Manual / Certificate</label>
                 <input
                   type="file"
                   accept=".pdf,.png,.jpg,.jpeg"
                   onChange={(e) => setForm({ ...form, document_file: e.target.files?.[0] || null })}
                   className="w-full text-sm text-theme-tertiary file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-neutral-700 file:text-theme-tertiary hover:file:bg-neutral-600"
                 />
               </div>
             </div>

             {/* Bottom Save/Cancel Buttons for UX convenience */}
             <div className="flex justify-end gap-3 pt-4 border-t border-theme">
               <Tooltip label="Cancel edit">
                 <Button 
                   type="button" 
                   variant="outline" 
                   onClick={handleCancel}
                   className="border-gray-300 text-theme-tertiary hover:shadow-[0_0_8px_#ffffff] hover:shadow-opacity-50"
                 >
                   <XCircle size={18} />
                 </Button>
               </Tooltip>
               <Tooltip label="Save changes">
                 <Button 
                   type="button"
                   variant="outline" 
                   onClick={handleSave}
                   disabled={loading}
                   className="border-[#ff00cc] text-[#ff00cc] hover:shadow-[0_0_8px_#ff00cc]"
                 >
                   <Save size={18} />
                 </Button>
               </Tooltip>
             </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}