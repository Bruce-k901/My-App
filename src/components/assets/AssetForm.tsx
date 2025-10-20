'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateAsset } from '@/hooks/useCreateAsset';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { supabase } from '@/lib/supabaseClient';
import CheckboxCustom from '@/components/ui/CheckboxCustom';

export default function AssetForm({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: (asset: any) => void }) {
  const { companyId, siteId } = useAppContext();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    label: '',
    type: '',
    site_id: '',
    model: '',
    serial_number: '',
    date_of_purchase: '',
    warranty_length_years: 1,
    add_to_ppm: false,
    ppm_services_per_year: 2,
    category_id: undefined,
    warranty_callout_info: undefined as string | undefined,
    contractor_id: undefined,
    document_url: undefined,
    document_file: undefined as File | undefined,
  });
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);

  const { createAsset, loading } = useCreateAsset();

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('sites_redundant')
        .select('id, name')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const { data, error } = await createAsset(payload);
      if (error) {
        // Error toast is handled inside useCreateAsset
        return;
      }
      // Success toast: unify with global UX
      showToast({ title: 'Asset saved successfully.', type: 'success' });
      // Optimistically append to list via callback
      const optimistic = {
        id: data,
        label: form.label || null,
        model: form.model || null,
        serial_number: form.serial_number || null,
        warranty_length_years: Number(form.warranty_length_years) || null,
        next_service_due: null,
      };
      onSaved?.(optimistic);
    } catch (err: any) {
      showToast({ title: 'Save failed', description: err?.message || 'Could not save asset', type: 'error' });
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open}>
      <DialogContent style={{ backgroundColor: '#171717', border: '1px solid #404040' }}>
        <DialogHeader>
          <DialogTitle>Add New Asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Assign to Site</label>
            <select
              required
              value={form.site_id || ''}
              onChange={(e) => setForm({ ...form, site_id: e.target.value })}
              className="w-full rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2"
            >
              <option value="">Select a site</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Asset Type</label>
            <select
              required
              value={form.type || ''}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-3 py-2"
            >
              <option value="">Select a type</option>
              <option value="refrigeration">Refrigeration</option>
              <option value="cooking">Cooking Equipment</option>
              <option value="dishwashing">Dishwashing</option>
              <option value="coffee">Coffee Equipment</option>
              <option value="safety">Safety Systems</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Asset Label</label>
            <Input
              placeholder="e.g. Kitchen Fridge 1 (optional)"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Model</label>
              <Input
                placeholder="e.g. Williams H280"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Serial Number</label>
              <Input
                placeholder="Manufacturer serial"
                value={form.serial_number}
                onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Date of Purchase</label>
              <Input
                type="date"
                value={form.date_of_purchase}
                onChange={(e) => setForm({ ...form, date_of_purchase: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Warranty Length (Years)</label>
              <Input
                type="number"
                min="0"
                value={form.warranty_length_years}
                onChange={(e) =>
                  setForm({ ...form, warranty_length_years: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Warranty Callout Info</label>
            <Input
              placeholder="e.g. 0800 111 2221 / support@williams.com"
              value={form.warranty_callout_info || ''}
              onChange={(e) => setForm({ ...form, warranty_callout_info: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-neutral-400">
              <CheckboxCustom
                checked={form.add_to_ppm}
                onChange={(checked: boolean) => setForm({ ...form, add_to_ppm: checked })}
                size={16}
              />
              Add to Planned Preventive Maintenance (PPM) Schedule
            </label>

            {form.add_to_ppm && (
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Services per Year</label>
                <Input
                  type="number"
                  min="1"
                  value={form.ppm_services_per_year}
                  onChange={(e) =>
                    setForm({ ...form, ppm_services_per_year: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-neutral-500 mt-1">
                  e.g. enter 2 for every 6 months, 4 for quarterly, etc.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Upload Manual / Certificate</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setForm({ ...form, document_file: e.target.files?.[0] })}
              className="w-full text-sm text-neutral-300"
            />
          </div>

          <Button type="submit" disabled={loading} fullWidth>
            {loading ? 'Saving...' : 'Save Asset'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}