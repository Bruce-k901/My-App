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
import { Save, XCircle, Loader2 } from 'lucide-react';

export default function AssetForm({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: (asset: any) => void }) {
  const { companyId, siteId } = useAppContext();
  const { showToast } = useToast();
  
  // Hydration gate - wait for all data before rendering
  const [sites, setSites] = useState<Array<{ id: string; name: string; region: string }>>([]);
  const [contractors, setContractors] = useState<Array<{ id: string; name: string; region: string; category: string }>>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // React Hook Form setup
  const form = useForm({
    defaultValues: {
      name: '',
      category: '',
      site_id: '',
      model: '',
      serial_number: '',
      brand: '',
      install_date: '',
      warranty_end: '',
      next_service_date: '',
      ppm_frequency_months: 6,
      status: 'Active',
      notes: '',
      ppm_contractor_id: '',
      reactive_contractor_id: '',
      warranty_contractor_id: '',
      document_url: '',
      working_temp_min: '',
      working_temp_max: '',
    }
  });

  const { createAsset, loading } = useCreateAsset();

  // Load sites and contractors when modal opens
  useEffect(() => {
    if (!open) {
      setIsHydrated(false);
      return;
    }

    let mounted = true;
    
    const loadData = async () => {
      try {
        // Load sites
        const { data: sitesData, error: sitesError } = await supabase
          .from('sites')
          .select('id, name, region')
          .eq('company_id', companyId)
          .order('name', { ascending: true });

        if (sitesError) throw sitesError;

        // Load all contractors for new asset
        const { data, error } = await supabase
          .from('contractors')
          .select('id, name, region, category')
          .eq('company_id', companyId)
          .order('name');
        if (error) throw error;

        if (!mounted) return;

        setSites(sitesData || []);
        setContractors(data || []);
        setIsHydrated(true);
      } catch (error) {
        console.error('Failed to load form data:', error);
        if (mounted) {
          setSites([]);
          setContractors([]);
          setIsHydrated(true); // Still show form even if data fails
        }
      }
    };

    loadData();
    return () => { mounted = false; };
  }, [open, companyId]);

  // Reset form for new asset once hydrated
  useEffect(() => {
    if (isHydrated && open) {
      // Reset form for new asset
      form.reset({
        name: '',
        category: '',
        site_id: siteId || '',
        model: '',
        serial_number: '',
        brand: '',
        install_date: '',
        warranty_end: '',
        next_service_date: '',
        ppm_frequency_months: 6,
        status: 'Active',
        notes: '',
        ppm_contractor_id: '',
        reactive_contractor_id: '',
        warranty_contractor_id: '',
        document_url: '',
        working_temp_min: '',
        working_temp_max: '',
      });
    }
  }, [isHydrated, open, siteId]);

  const handleSave = async () => {
    const formData = form.getValues();
    
    try {
      // Convert temperature values to numbers or null
      const temperatureData = {
        working_temp_min: formData.working_temp_min ? parseFloat(formData.working_temp_min) : null,
        working_temp_max: formData.working_temp_max ? parseFloat(formData.working_temp_max) : null,
      };
      
      // Create new asset
      const { data, error } = await createAsset({
        ...formData,
        ...temperatureData,
        company_id: companyId,
      });
      
      if (error) throw error;
      showToast({ title: 'Asset created successfully', type: 'success' });
      onSaved?.(data);
      onClose();
    } catch (error: any) {
      console.error('Save failed:', error);
      showToast({ 
        title: 'Save failed', 
        description: error.message || 'Could not save asset', 
        type: 'error' 
      });
    }
  };

  // Hydration gate - don't render until data is ready
  if (!isHydrated) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-neutral-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading form data...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-hidden"
        style={{ backgroundColor: '#171717', border: '1px solid #404040', minWidth: '900px' }}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-neutral-900 border-b border-neutral-700 p-6 flex justify-between items-center z-10">
          <DialogTitle className="text-xl font-semibold text-white">
            Add New Asset
          </DialogTitle>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="px-4 py-2"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Asset'}
            </Button>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          <form id="asset-form" className="space-y-6">
            {/* Section A: Assignment - Two Columns */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-2">
                Assignment
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Select
                    label="Assign to Site"
                    value={form.watch('site_id') || ''}
                    onValueChange={(val) => form.setValue('site_id', val)}
                    options={sites.map(s => ({ label: s.name, value: s.id }))}
                    placeholder="Select a site"
                    className="w-full"
                  />
                </div>
                <div>
                  <Select
                    label="Asset Category"
                    value={form.watch('category') || ''}
                    onValueChange={(val) => form.setValue('category', val)}
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
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-2">
                Identification
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Asset Name</label>
                  <Input
                    value={form.watch('name') || ''}
                    onChange={(e) => form.setValue('name', e.target.value)}
                    placeholder="Enter asset name"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Brand</label>
                  <Input
                    value={form.watch('brand') || ''}
                    onChange={(e) => form.setValue('brand', e.target.value)}
                    placeholder="Enter brand"
                    className="w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Model</label>
                  <Input
                    value={form.watch('model') || ''}
                    onChange={(e) => form.setValue('model', e.target.value)}
                    placeholder="Enter model"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Serial Number</label>
                  <Input
                    value={form.watch('serial_number') || ''}
                    onChange={(e) => form.setValue('serial_number', e.target.value)}
                    placeholder="Enter serial number"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Section C: Dates - Four Columns */}
            <div className="space-y-4 mt-6">
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-2">
                Important Dates
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Install Date</label>
                  <Input
                    type="date"
                    value={form.watch('install_date') || ''}
                    onChange={(e) => form.setValue('install_date', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Warranty End</label>
                  <Input
                    type="date"
                    value={form.watch('warranty_end') || ''}
                    onChange={(e) => form.setValue('warranty_end', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Next Service Date</label>
                  <Input
                    type="date"
                    value={form.watch('next_service_date') || ''}
                    onChange={(e) => form.setValue('next_service_date', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">PPM Frequency</label>
                  <Tooltip content="Interval between scheduled PPM visits">
                    <Input
                      type="number"
                      min="1"
                      placeholder="every 6 months"
                      value={form.watch('ppm_frequency_months') || ''}
                      onChange={(e) => form.setValue('ppm_frequency_months', parseInt(e.target.value) || 6)}
                      className="w-full"
                    />
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Section D: Contractor Assignments - Two Columns */}
            <div className="space-y-4 mt-6">
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-2">
                Contractor Assignments
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Select
                    label="PPM Contractor"
                    value={form.watch('ppm_contractor_id') || ''}
                    onValueChange={(val) => form.setValue('ppm_contractor_id', val)}
                    options={contractors.map(contractor => ({ 
                      label: `${contractor.name} (${contractor.region})`, 
                      value: contractor.id 
                    }))}
                    placeholder="Select PPM contractor"
                    className="w-full"
                  />
                </div>
                <div>
                  <Select
                    label="Reactive Contractor"
                    value={form.watch('reactive_contractor_id') || ''}
                    onValueChange={(val) => form.setValue('reactive_contractor_id', val)}
                    options={contractors.map(contractor => ({ 
                      label: `${contractor.name} (${contractor.region})`, 
                      value: contractor.id 
                    }))}
                    placeholder="Select reactive contractor"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Section E: Temperature Ranges & Notes */}
            <div className="space-y-4 mt-6">
              <h3 className="text-sm font-medium text-neutral-300 uppercase tracking-wide border-b border-neutral-700 pb-2">
                Temperature & Additional Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">
                    Working Temp Min (°C)
                    <Tooltip content="Minimum acceptable operating temperature. Readings below this will trigger warnings.">
                      <span className="ml-1 text-neutral-500 cursor-help">ℹ️</span>
                    </Tooltip>
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="-?[0-9]*\.?[0-9]*"
                    value={form.watch('working_temp_min') || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow negative numbers, decimals, and empty string
                      if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
                        form.setValue('working_temp_min', value);
                      }
                    }}
                    placeholder="e.g. 0 for fridges, -20 for freezers"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">
                    Working Temp Max (°C)
                    <Tooltip content="Maximum acceptable operating temperature. Readings above this will trigger warnings.">
                      <span className="ml-1 text-neutral-500 cursor-help">ℹ️</span>
                    </Tooltip>
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="-?[0-9]*\.?[0-9]*"
                    value={form.watch('working_temp_max') || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow negative numbers, decimals, and empty string
                      if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
                        form.setValue('working_temp_max', value);
                      }
                    }}
                    placeholder="e.g. 5 for fridges, -18 for freezers"
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Notes</label>
                <textarea
                  value={form.watch('notes') || ''}
                  onChange={(e) => form.setValue('notes', e.target.value)}
                  placeholder="Enter any additional notes..."
                  className="w-full h-24 rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2 resize-none"
                />
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}