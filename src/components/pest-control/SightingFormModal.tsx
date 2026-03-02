'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Loader2, Check, Bug, AlertTriangle, MapPin, Clock, Calendar } from '@/components/ui/icons';

interface SightingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  sighting?: any;
}

const PEST_TYPES = [
  { value: 'mice', label: 'Mice' },
  { value: 'rats', label: 'Rats' },
  { value: 'flies', label: 'Flies' },
  { value: 'cockroaches', label: 'Cockroaches' },
  { value: 'ants', label: 'Ants' },
  { value: 'wasps', label: 'Wasps' },
  { value: 'birds', label: 'Birds' },
  { value: 'stored_product_insects', label: 'Stored Product Insects' },
  { value: 'other', label: 'Other' },
];

const EVIDENCE_TYPES = [
  { value: 'live_sighting', label: 'Live Sighting' },
  { value: 'dead_specimen', label: 'Dead Specimen' },
  { value: 'droppings', label: 'Droppings' },
  { value: 'gnaw_marks', label: 'Gnaw Marks' },
  { value: 'nesting_material', label: 'Nesting Material' },
  { value: 'tracks', label: 'Tracks' },
  { value: 'smell', label: 'Smell' },
];

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-emerald-500', bg: 'bg-emerald-500' },
  { value: 'medium', label: 'Medium', color: 'text-amber-500', bg: 'bg-amber-500' },
  { value: 'high', label: 'High', color: 'text-orange-500', bg: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'text-red-500', bg: 'bg-red-500' },
];

const QUANTITY_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: '2-5', label: '2-5' },
  { value: 'infestation', label: 'Infestation (5+)' },
];

export default function SightingFormModal({ isOpen, onClose, onSaved, sighting }: SightingFormModalProps) {
  const { companyId, siteId, profile } = useAppContext();
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    sighting_date: today,
    sighting_time: '',
    pest_type: '',
    evidence_type: '',
    location_area: '',
    location_details: '',
    severity: 'low',
    quantity_estimate: 'single',
    immediate_action_taken: '',
    contractor_notified: false,
    notes: '',
  });

  // Pre-fill when editing
  useEffect(() => {
    if (sighting) {
      setForm({
        sighting_date: sighting.sighting_date || today,
        sighting_time: sighting.sighting_time || '',
        pest_type: sighting.pest_type || '',
        evidence_type: sighting.evidence_type || '',
        location_area: sighting.location_area || '',
        location_details: sighting.location_details || '',
        severity: sighting.severity || 'low',
        quantity_estimate: sighting.quantity_estimate || 'single',
        immediate_action_taken: sighting.immediate_action_taken || '',
        contractor_notified: sighting.contractor_notified || false,
        notes: sighting.notes || '',
      });
    } else {
      setForm({
        sighting_date: today,
        sighting_time: '',
        pest_type: '',
        evidence_type: '',
        location_area: '',
        location_details: '',
        severity: 'low',
        quantity_estimate: 'single',
        immediate_action_taken: '',
        contractor_notified: false,
        notes: '',
      });
    }
  }, [sighting, isOpen]);

  // Auto-check contractor_notified for high/critical severity
  useEffect(() => {
    if (form.severity === 'high' || form.severity === 'critical') {
      setForm(prev => ({ ...prev, contractor_notified: true }));
    }
  }, [form.severity]);

  function updateField(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!companyId) return;

    // Validate required fields
    if (!form.sighting_date) {
      toast.error('Please enter a sighting date');
      return;
    }
    if (!form.pest_type) {
      toast.error('Please select a pest type');
      return;
    }
    if (!form.location_area.trim()) {
      toast.error('Please enter the location area');
      return;
    }

    setSaving(true);
    try {
      const record: any = {
        company_id: companyId,
        site_id: siteId && siteId !== 'all' ? siteId : null,
        sighting_date: form.sighting_date,
        sighting_time: form.sighting_time || null,
        pest_type: form.pest_type,
        evidence_type: form.evidence_type || null,
        location_area: form.location_area.trim(),
        location_details: form.location_details.trim() || null,
        severity: form.severity,
        quantity_estimate: form.quantity_estimate || null,
        immediate_action_taken: form.immediate_action_taken.trim() || null,
        contractor_notified: form.contractor_notified,
        notes: form.notes.trim() || null,
      };

      let sightingId: string | null = null;

      if (sighting) {
        // Update existing
        const { error } = await supabase
          .from('pest_sightings')
          .update(record)
          .eq('id', sighting.id);
        if (error) throw error;
        sightingId = sighting.id;
        toast.success('Sighting updated');
      } else {
        // Insert new
        record.reported_by = profile?.id || null;
        record.reported_by_name = profile?.full_name || null;
        const { data: inserted, error } = await supabase
          .from('pest_sightings')
          .insert(record)
          .select('id')
          .single();
        if (error) throw error;
        sightingId = inserted?.id || null;
        toast.success('Pest sighting logged');
      }

      // Auto-notify contractor if checkbox is checked
      if (form.contractor_notified && sightingId) {
        try {
          const res = await fetch('/api/pest-control/notify-contractor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sightingId, companyId, siteId }),
          });
          const result = await res.json();
          if (res.ok && !result.skipped) {
            toast.success(`Contractor notified: ${result.contractorName}`);
          } else if (res.ok && result.skipped) {
            toast.info('Email not configured — sighting marked as notified');
          }
        } catch {
          toast.error('Sighting saved but failed to notify contractor');
        }
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error saving sighting:', err);
      toast.error(err.message || 'Failed to save sighting');
    } finally {
      setSaving(false);
    }
  }

  const currentSeverity = SEVERITY_OPTIONS.find(s => s.value === form.severity);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-checkly-dark dark:text-checkly" />
              <DialogTitle>{sighting ? 'Edit Pest Sighting' : 'Log Pest Sighting'}</DialogTitle>
            </div>
            <button onClick={onClose} className="text-theme-tertiary hover:text-theme-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Date & Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Date *</span>
              </label>
              <input
                type="date"
                value={form.sighting_date}
                onChange={e => updateField('sighting_date', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Time</span>
              </label>
              <input
                type="time"
                value={form.sighting_time}
                onChange={e => updateField('sighting_time', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary"
              />
            </div>
          </div>

          {/* Pest Type & Evidence */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Pest Type *</label>
              <select
                value={form.pest_type}
                onChange={e => updateField('pest_type', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary"
              >
                <option value="">Select...</option>
                {PEST_TYPES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Evidence Type</label>
              <select
                value={form.evidence_type}
                onChange={e => updateField('evidence_type', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary"
              >
                <option value="">Select...</option>
                {EVIDENCE_TYPES.map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Location Area *</span>
            </label>
            <input
              type="text"
              value={form.location_area}
              onChange={e => updateField('location_area', e.target.value)}
              placeholder="e.g. Kitchen, Dry Store, Loading Bay"
              className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">Location Details</label>
            <input
              type="text"
              value={form.location_details}
              onChange={e => updateField('location_details', e.target.value)}
              placeholder="e.g. Behind walk-in fridge, near external door"
              className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary"
            />
          </div>

          {/* Severity & Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Severity
                  {currentSeverity && (
                    <span className={`inline-block w-2 h-2 rounded-full ${currentSeverity.bg}`} />
                  )}
                </span>
              </label>
              <select
                value={form.severity}
                onChange={e => updateField('severity', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary"
              >
                {SEVERITY_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Quantity Estimate</label>
              <select
                value={form.quantity_estimate}
                onChange={e => updateField('quantity_estimate', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary"
              >
                {QUANTITY_OPTIONS.map(q => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Immediate Action */}
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">Immediate Action Taken</label>
            <textarea
              value={form.immediate_action_taken}
              onChange={e => updateField('immediate_action_taken', e.target.value)}
              rows={2}
              placeholder="e.g. Area cleaned, traps checked, food items removed..."
              className="w-full px-3 py-2 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary resize-none"
            />
          </div>

          {/* Contractor Notified */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="contractor_notified"
              checked={form.contractor_notified}
              onChange={e => updateField('contractor_notified', e.target.checked)}
              className="rounded border-theme"
            />
            <label htmlFor="contractor_notified" className="text-sm text-theme-primary cursor-pointer">
              Contractor notified
            </label>
            {(form.severity === 'high' || form.severity === 'critical') && (
              <span className="text-xs text-amber-500 ml-1">(recommended for {form.severity} severity)</span>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => updateField('notes', e.target.value)}
              rows={2}
              placeholder="Any additional details..."
              className="w-full px-3 py-2 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-theme">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-theme-secondary border border-theme hover:bg-theme-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg text-sm font-medium bg-checkly-dark dark:bg-checkly text-white dark:text-checkly-dark hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {sighting ? 'Update Sighting' : 'Log Sighting'}
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
