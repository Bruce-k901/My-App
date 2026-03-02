'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Check } from '@/components/ui/icons';

interface VisitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  visit?: any;
}

const EVIDENCE_TYPES = ['droppings', 'gnaw_marks', 'nesting', 'live_sighting', 'dead_specimen'];
const AREA_OPTIONS = ['kitchen', 'dry_store', 'cold_store', 'prep_area', 'front_of_house', 'waste_area', 'external', 'loading_bay', 'office', 'toilets'];
const PEST_TYPES = ['mice', 'rats', 'flies', 'cockroaches', 'ants', 'wasps', 'birds', 'stored_product_insects'];

export default function VisitFormModal({ isOpen, onClose, onSaved, visit }: VisitFormModalProps) {
  const { companyId, siteId, profile } = useAppContext();
  const [saving, setSaving] = useState(false);
  const [contractors, setContractors] = useState<any[]>([]);

  const [form, setForm] = useState({
    contractor_id: '',
    visit_date: new Date().toISOString().split('T')[0],
    visit_type: 'routine' as string,
    technician_name: '',
    visit_duration_minutes: '',
    evidence_found: false,
    evidence_type: [] as string[],
    affected_areas: [] as string[],
    pest_types: [] as string[],
    treatments_applied: '' ,
    chemicals_used: '',
    devices_serviced: '',
    devices_replaced: '',
    baits_replenished: '',
    proofing_required: false,
    proofing_details: '',
    hygiene_issues_noted: '',
    follow_up_required: false,
    follow_up_date: '',
    visit_cost: '',
    materials_cost: '',
    total_cost: '',
    invoice_reference: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen && companyId) {
      fetchContractors();
      if (visit) prefillForm(visit);
      else resetForm();
    }
  }, [isOpen, companyId]);

  function resetForm() {
    setForm({
      contractor_id: '',
      visit_date: new Date().toISOString().split('T')[0],
      visit_type: 'routine',
      technician_name: '',
      visit_duration_minutes: '',
      evidence_found: false,
      evidence_type: [],
      affected_areas: [],
      pest_types: [],
      treatments_applied: '',
      chemicals_used: '',
      devices_serviced: '',
      devices_replaced: '',
      baits_replenished: '',
      proofing_required: false,
      proofing_details: '',
      hygiene_issues_noted: '',
      follow_up_required: false,
      follow_up_date: '',
      visit_cost: '',
      materials_cost: '',
      total_cost: '',
      invoice_reference: '',
      notes: '',
    });
  }

  function prefillForm(v: any) {
    setForm({
      contractor_id: v.contractor_id || '',
      visit_date: v.visit_date || '',
      visit_type: v.visit_type || 'routine',
      technician_name: v.technician_name || '',
      visit_duration_minutes: v.visit_duration_minutes?.toString() || '',
      evidence_found: v.evidence_found || false,
      evidence_type: v.evidence_type || [],
      affected_areas: v.affected_areas || [],
      pest_types: v.pest_types || [],
      treatments_applied: (v.treatments_applied || []).join(', '),
      chemicals_used: v.chemicals_used ? JSON.stringify(v.chemicals_used) : '',
      devices_serviced: v.devices_serviced?.toString() || '',
      devices_replaced: v.devices_replaced?.toString() || '',
      baits_replenished: v.baits_replenished?.toString() || '',
      proofing_required: v.proofing_required || false,
      proofing_details: v.proofing_details || '',
      hygiene_issues_noted: v.hygiene_issues_noted || '',
      follow_up_required: v.follow_up_required || false,
      follow_up_date: v.follow_up_date || '',
      visit_cost: v.visit_cost?.toString() || '',
      materials_cost: v.materials_cost?.toString() || '',
      total_cost: v.total_cost?.toString() || '',
      invoice_reference: v.invoice_reference || '',
      notes: v.notes || '',
    });
  }

  async function fetchContractors() {
    const { data } = await supabase
      .from('contractors')
      .select('id, name')
      .eq('company_id', companyId)
      .ilike('category', '%pest%')
      .eq('is_active', true)
      .order('name');
    setContractors(data || []);
  }

  function toggleArrayField(field: 'evidence_type' | 'affected_areas' | 'pest_types', value: string) {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v: string) => v !== value)
        : [...prev[field], value],
    }));
  }

  async function handleSave() {
    if (!companyId) return;
    if (!form.visit_date) {
      toast.error('Please enter the visit date');
      return;
    }

    setSaving(true);
    try {
      const treatmentsArray = form.treatments_applied
        ? form.treatments_applied.split(',').map(t => t.trim()).filter(Boolean)
        : null;

      let chemicalsJson: any = null;
      if (form.chemicals_used) {
        try {
          chemicalsJson = JSON.parse(form.chemicals_used);
        } catch {
          chemicalsJson = [{ name: form.chemicals_used, quantity: null, coshh_ref: null }];
        }
      }

      const visitData = {
        company_id: companyId,
        site_id: siteId && siteId !== 'all' ? siteId : null,
        contractor_id: form.contractor_id || null,
        visit_date: form.visit_date,
        visit_type: form.visit_type,
        technician_name: form.technician_name || null,
        visit_duration_minutes: form.visit_duration_minutes ? parseInt(form.visit_duration_minutes) : null,
        evidence_found: form.evidence_found,
        evidence_type: form.evidence_type.length > 0 ? form.evidence_type : null,
        affected_areas: form.affected_areas.length > 0 ? form.affected_areas : null,
        pest_types: form.pest_types.length > 0 ? form.pest_types : null,
        treatments_applied: treatmentsArray,
        chemicals_used: chemicalsJson || '[]',
        devices_serviced: form.devices_serviced ? parseInt(form.devices_serviced) : null,
        devices_replaced: form.devices_replaced ? parseInt(form.devices_replaced) : null,
        baits_replenished: form.baits_replenished ? parseInt(form.baits_replenished) : null,
        proofing_required: form.proofing_required,
        proofing_details: form.proofing_details || null,
        hygiene_issues_noted: form.hygiene_issues_noted || null,
        follow_up_required: form.follow_up_required,
        follow_up_date: form.follow_up_date || null,
        visit_cost: form.visit_cost ? parseFloat(form.visit_cost) : null,
        materials_cost: form.materials_cost ? parseFloat(form.materials_cost) : null,
        total_cost: form.total_cost ? parseFloat(form.total_cost) : null,
        invoice_reference: form.invoice_reference || null,
        notes: form.notes || null,
        service_report_file: visit?.service_report_file || null,
        ai_extracted: visit?._aiExtracted ? true : (visit?.ai_extracted || false),
        created_by: profile?.id || null,
      };

      // _aiExtracted means this was pre-filled by AI — always insert as new
      if (visit && !visit._aiExtracted) {
        const { error } = await supabase
          .from('pest_control_visits')
          .update(visitData)
          .eq('id', visit.id);
        if (error) throw error;
        toast.success('Visit updated');
      } else {
        const { error } = await supabase
          .from('pest_control_visits')
          .insert(visitData);
        if (error) throw error;
        toast.success('Visit recorded');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save visit');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full h-10 px-3 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary';
  const labelCls = 'block text-xs font-medium text-theme-secondary mb-1';

  return (
    <Dialog open={isOpen} onOpenChange={() => { if (!saving) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{visit ? 'Edit Visit Record' : 'Log Contractor Visit'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Visit Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Visit Date *</label>
              <input type="date" value={form.visit_date} onChange={e => setForm({ ...form, visit_date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Visit Type</label>
              <select value={form.visit_type} onChange={e => setForm({ ...form, visit_type: e.target.value })} className={inputCls}>
                <option value="routine">Routine</option>
                <option value="reactive">Reactive</option>
                <option value="emergency">Emergency</option>
                <option value="follow_up">Follow-up</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Contractor</label>
              <select value={form.contractor_id} onChange={e => setForm({ ...form, contractor_id: e.target.value })} className={inputCls}>
                <option value="">Select...</option>
                {contractors.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Technician Name</label>
              <input type="text" value={form.technician_name} onChange={e => setForm({ ...form, technician_name: e.target.value })} placeholder="Name of technician" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Duration (minutes)</label>
              <input type="number" value={form.visit_duration_minutes} onChange={e => setForm({ ...form, visit_duration_minutes: e.target.value })} className={inputCls} />
            </div>
          </div>

          {/* Findings */}
          <div>
            <label className="flex items-center gap-2 text-sm text-theme-primary cursor-pointer mb-3">
              <input type="checkbox" checked={form.evidence_found} onChange={e => setForm({ ...form, evidence_found: e.target.checked })} className="rounded border-theme" />
              Evidence of pest activity found
            </label>

            {form.evidence_found && (
              <div className="space-y-3 pl-6 border-l-2 border-amber-500/30">
                <div>
                  <label className={labelCls}>Evidence Type</label>
                  <div className="flex flex-wrap gap-2">
                    {EVIDENCE_TYPES.map(t => (
                      <button key={t} onClick={() => toggleArrayField('evidence_type', t)}
                        className={`px-2.5 py-1 rounded-full text-xs capitalize transition-colors ${
                          form.evidence_type.includes(t)
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-theme-hover text-theme-tertiary border border-theme'
                        }`}>{t.replace(/_/g, ' ')}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Affected Areas</label>
                  <div className="flex flex-wrap gap-2">
                    {AREA_OPTIONS.map(a => (
                      <button key={a} onClick={() => toggleArrayField('affected_areas', a)}
                        className={`px-2.5 py-1 rounded-full text-xs capitalize transition-colors ${
                          form.affected_areas.includes(a)
                            ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                            : 'bg-theme-hover text-theme-tertiary border border-theme'
                        }`}>{a.replace(/_/g, ' ')}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Pest Types Found</label>
                  <div className="flex flex-wrap gap-2">
                    {PEST_TYPES.map(p => (
                      <button key={p} onClick={() => toggleArrayField('pest_types', p)}
                        className={`px-2.5 py-1 rounded-full text-xs capitalize transition-colors ${
                          form.pest_types.includes(p)
                            ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                            : 'bg-theme-hover text-theme-tertiary border border-theme'
                        }`}>{p.replace(/_/g, ' ')}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Treatments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Treatments Applied</label>
              <input type="text" value={form.treatments_applied} onChange={e => setForm({ ...form, treatments_applied: e.target.value })} placeholder="Comma separated" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Chemicals Used</label>
              <input type="text" value={form.chemicals_used} onChange={e => setForm({ ...form, chemicals_used: e.target.value })} placeholder="Chemical names" className={inputCls} />
            </div>
          </div>

          {/* Device Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Devices Serviced</label>
              <input type="number" value={form.devices_serviced} onChange={e => setForm({ ...form, devices_serviced: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Devices Replaced</label>
              <input type="number" value={form.devices_replaced} onChange={e => setForm({ ...form, devices_replaced: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Baits Replenished</label>
              <input type="number" value={form.baits_replenished} onChange={e => setForm({ ...form, baits_replenished: e.target.value })} className={inputCls} />
            </div>
          </div>

          {/* Proofing */}
          <div>
            <label className="flex items-center gap-2 text-sm text-theme-primary cursor-pointer mb-2">
              <input type="checkbox" checked={form.proofing_required} onChange={e => setForm({ ...form, proofing_required: e.target.checked })} className="rounded border-theme" />
              Proofing recommendations made
            </label>
            {form.proofing_required && (
              <textarea value={form.proofing_details} onChange={e => setForm({ ...form, proofing_details: e.target.value })} rows={2} placeholder="Proofing details..." className="w-full px-3 py-2 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary resize-none" />
            )}
          </div>

          {/* Hygiene */}
          <div>
            <label className={labelCls}>Hygiene Issues Noted</label>
            <textarea value={form.hygiene_issues_noted} onChange={e => setForm({ ...form, hygiene_issues_noted: e.target.value })} rows={2} placeholder="Any hygiene concerns..." className="w-full px-3 py-2 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary resize-none" />
          </div>

          {/* Follow-up */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-theme-primary cursor-pointer">
              <input type="checkbox" checked={form.follow_up_required} onChange={e => setForm({ ...form, follow_up_required: e.target.checked })} className="rounded border-theme" />
              Follow-up required
            </label>
            {form.follow_up_required && (
              <div>
                <label className={labelCls}>Follow-up Date</label>
                <input type="date" value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} className={inputCls} />
              </div>
            )}
          </div>

          {/* Costs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Visit Cost (&pound;)</label>
              <input type="number" step="0.01" value={form.visit_cost} onChange={e => setForm({ ...form, visit_cost: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Materials Cost (&pound;)</label>
              <input type="number" step="0.01" value={form.materials_cost} onChange={e => setForm({ ...form, materials_cost: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Total Cost (&pound;)</label>
              <input type="number" step="0.01" value={form.total_cost} onChange={e => setForm({ ...form, total_cost: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Invoice Reference</label>
              <input type="text" value={form.invoice_reference} onChange={e => setForm({ ...form, invoice_reference: e.target.value })} className={inputCls} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes..." className="w-full px-3 py-2 rounded-lg border border-theme bg-transparent text-sm text-theme-primary placeholder:text-theme-tertiary resize-none" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-theme-secondary border border-theme hover:bg-theme-hover transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg text-sm font-medium bg-checkly-dark dark:bg-checkly text-white dark:text-checkly-dark hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Check className="w-4 h-4" />{visit ? 'Update' : 'Save Visit'}</>}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
