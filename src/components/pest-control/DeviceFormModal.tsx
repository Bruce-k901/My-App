'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Bug, MapPin, Wrench, Calendar, Loader2 } from '@/components/ui/icons';

interface DeviceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  device?: any;
}

const DEVICE_TYPES = [
  { value: 'mouse_trap', label: 'Mouse Trap' },
  { value: 'rat_trap', label: 'Rat Trap' },
  { value: 'bait_station', label: 'Bait Station' },
  { value: 'insectocutor', label: 'Insectocutor' },
  { value: 'fly_screen', label: 'Fly Screen' },
  { value: 'bird_deterrent', label: 'Bird Deterrent' },
  { value: 'pheromone_trap', label: 'Pheromone Trap' },
];

const FLOOR_LEVELS = [
  { value: 'basement', label: 'Basement' },
  { value: 'ground', label: 'Ground' },
  { value: 'first', label: 'First' },
  { value: 'second', label: 'Second' },
  { value: 'external', label: 'External' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'removed', label: 'Removed' },
  { value: 'needs_replacement', label: 'Needs Replacement' },
];

const inputClass = 'w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelClass = 'block text-xs font-medium text-theme-secondary mb-1';
const selectClass = 'w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500';

export default function DeviceFormModal({ isOpen, onClose, onSaved, device }: DeviceFormModalProps) {
  const { companyId, siteId, profile } = useAppContext();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    device_number: '',
    device_type: 'mouse_trap',
    device_name: '',
    location_area: '',
    location_description: '',
    floor_level: 'ground',
    manufacturer: '',
    model: '',
    bait_type: '',
    installation_date: '',
    status: 'active',
    notes: '',
  });

  // Pre-fill form when editing an existing device
  useEffect(() => {
    if (device) {
      setForm({
        device_number: device.device_number || '',
        device_type: device.device_type || 'mouse_trap',
        device_name: device.device_name || '',
        location_area: device.location_area || '',
        location_description: device.location_description || '',
        floor_level: device.floor_level || 'ground',
        manufacturer: device.manufacturer || '',
        model: device.model || '',
        bait_type: device.bait_type || '',
        installation_date: device.installation_date || '',
        status: device.status || 'active',
        notes: device.notes || '',
      });
    } else {
      setForm({
        device_number: '',
        device_type: 'mouse_trap',
        device_name: '',
        location_area: '',
        location_description: '',
        floor_level: 'ground',
        manufacturer: '',
        model: '',
        bait_type: '',
        installation_date: '',
        status: 'active',
        notes: '',
      });
    }
  }, [device, isOpen]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.device_number.trim()) {
      toast.error('Device number is required');
      return;
    }
    if (!form.location_area.trim()) {
      toast.error('Location area is required');
      return;
    }
    if (!companyId) {
      toast.error('No company selected');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        company_id: companyId,
        site_id: siteId && siteId !== 'all' ? siteId : null,
        device_number: form.device_number.trim(),
        device_type: form.device_type,
        device_name: form.device_name.trim() || null,
        location_area: form.location_area.trim(),
        location_description: form.location_description.trim() || null,
        floor_level: form.floor_level,
        manufacturer: form.manufacturer.trim() || null,
        model: form.model.trim() || null,
        bait_type: form.device_type === 'bait_station' ? (form.bait_type.trim() || null) : null,
        installation_date: form.installation_date || null,
        status: form.status,
        notes: form.notes.trim() || null,
        updated_by: profile?.id || null,
      };

      if (device) {
        // Update existing device
        const { error } = await supabase
          .from('pest_control_devices')
          .update(payload)
          .eq('id', device.id);

        if (error) throw error;
        toast.success('Device updated successfully');
      } else {
        // Insert new device
        payload.created_by = profile?.id || null;
        const { error } = await supabase
          .from('pest_control_devices')
          .insert(payload);

        if (error) throw error;
        toast.success('Device added successfully');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error saving device:', err);
      toast.error(err.message || 'Failed to save device');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-checkly dark:text-checkly" />
            {device ? 'Edit Device' : 'Add Device'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Row 1: Device Number + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Device Number *</label>
              <input
                type="text"
                value={form.device_number}
                onChange={(e) => updateField('device_number', e.target.value)}
                placeholder="e.g. M01, RT03"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Device Type</label>
              <select
                value={form.device_type}
                onChange={(e) => updateField('device_type', e.target.value)}
                className={selectClass}
              >
                {DEVICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Device Name */}
          <div>
            <label className={labelClass}>Device Name</label>
            <input
              type="text"
              value={form.device_name}
              onChange={(e) => updateField('device_name', e.target.value)}
              placeholder="Optional friendly name"
              className={inputClass}
            />
          </div>

          {/* Row 2: Location Area + Floor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Location Area *</label>
              <input
                type="text"
                value={form.location_area}
                onChange={(e) => updateField('location_area', e.target.value)}
                placeholder="e.g. Kitchen, Dry Store, External"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Floor Level</label>
              <select
                value={form.floor_level}
                onChange={(e) => updateField('floor_level', e.target.value)}
                className={selectClass}
              >
                {FLOOR_LEVELS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location Description */}
          <div>
            <label className={labelClass}>Location Description</label>
            <input
              type="text"
              value={form.location_description}
              onChange={(e) => updateField('location_description', e.target.value)}
              placeholder="e.g. Behind walk-in fridge, near fire exit"
              className={inputClass}
            />
          </div>

          {/* Row 3: Manufacturer + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Manufacturer</label>
              <input
                type="text"
                value={form.manufacturer}
                onChange={(e) => updateField('manufacturer', e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Model</label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => updateField('model', e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </div>
          </div>

          {/* Bait Type - only shown for bait_station */}
          {form.device_type === 'bait_station' && (
            <div>
              <label className={labelClass}>Bait Type</label>
              <input
                type="text"
                value={form.bait_type}
                onChange={(e) => updateField('bait_type', e.target.value)}
                placeholder="e.g. Brodifacoum block, non-toxic monitoring"
                className={inputClass}
              />
            </div>
          )}

          {/* Row 4: Installation Date + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Installation Date</label>
              <input
                type="date"
                value={form.installation_date}
                onChange={(e) => updateField('installation_date', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                className={selectClass}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-theme-secondary border border-theme hover:bg-theme-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-lg text-sm font-medium bg-checkly-dark dark:bg-checkly text-white dark:text-checkly-dark disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {device ? 'Update Device' : 'Add Device'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
