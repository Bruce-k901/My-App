'use client';

import { useState } from 'react';
import { X, UserCheck, Calendar } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';

interface SicknessRecord {
  id: string;
  staff_member_name: string;
  illness_onset_date: string;
  symptoms: string;
  exclusion_period_start: string;
  exclusion_period_end?: string | null;
  medical_clearance_required: boolean;
  medical_clearance_received: boolean;
}

interface ReturnToWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  record: SicknessRecord;
}

export function ReturnToWorkModal({ isOpen, onClose, onComplete, record }: ReturnToWorkModalProps) {
  const { profile } = useAppContext();
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    return_to_work_date: today,
    rtw_gp_consulted: false,
    rtw_fit_note_provided: false,
    rtw_fit_for_full_duties: true,
    rtw_adjustments_needed: false,
    rtw_adjustments_details: '',
    rtw_follow_up_required: false,
    rtw_follow_up_date: '',
    rtw_notes: '',
  });

  // Calculate days absent
  const onsetDate = new Date(record.illness_onset_date);
  const returnDate = form.return_to_work_date ? new Date(form.return_to_work_date) : new Date();
  const daysAbsent = Math.max(0, Math.ceil((returnDate.getTime() - onsetDate.getTime()) / (1000 * 60 * 60 * 24)));

  const handleSave = async () => {
    if (!form.return_to_work_date) {
      toast.error('Please enter a return to work date');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('staff_sickness_records')
        .update({
          return_to_work_date: form.return_to_work_date,
          rtw_conducted_by: profile?.id || null,
          rtw_conducted_date: today,
          rtw_gp_consulted: form.rtw_gp_consulted,
          rtw_fit_note_provided: form.rtw_gp_consulted ? form.rtw_fit_note_provided : false,
          rtw_fit_for_full_duties: form.rtw_fit_for_full_duties,
          rtw_adjustments_needed: form.rtw_adjustments_needed,
          rtw_adjustments_details: form.rtw_adjustments_needed ? form.rtw_adjustments_details : null,
          rtw_follow_up_required: form.rtw_follow_up_required,
          rtw_follow_up_date: form.rtw_follow_up_required && form.rtw_follow_up_date ? form.rtw_follow_up_date : null,
          rtw_notes: form.rtw_notes || null,
          medical_clearance_received: record.medical_clearance_required ? true : record.medical_clearance_received,
          status: 'cleared',
          exclusion_period_end: record.exclusion_period_end || form.return_to_work_date,
        })
        .eq('id', record.id);

      if (error) throw error;

      toast.success('Return to work interview completed');
      onComplete();
    } catch (err: any) {
      console.error('Error saving RTW:', err);
      toast.error(err.message || 'Failed to save return to work interview');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[rgb(var(--surface-elevated))] border border-black/10 dark:border-white/[0.1] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/10 dark:border-white/[0.1] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 dark:bg-green-500/10 rounded-lg">
              <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-theme-primary">Return to Work Interview</h2>
              <p className="text-sm text-theme-secondary">{record.staff_member_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-theme-tertiary hover:text-theme-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Absence Summary */}
          <div className="bg-black/[0.03] dark:bg-white/[0.04] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-theme-primary mb-2">Absence Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-theme-tertiary">Illness Onset</span>
                <p className="text-theme-primary font-medium">{new Date(record.illness_onset_date).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-theme-tertiary">Exclusion Start</span>
                <p className="text-theme-primary font-medium">{new Date(record.exclusion_period_start).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-theme-tertiary">Days Absent</span>
                <p className="text-theme-primary font-medium">{daysAbsent} day{daysAbsent !== 1 ? 's' : ''}</p>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <span className="text-theme-tertiary">Symptoms</span>
                <p className="text-theme-primary">{record.symptoms}</p>
              </div>
            </div>

            {record.medical_clearance_required && !record.medical_clearance_received && (
              <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-amber-600 dark:text-amber-400 text-xs font-medium">
                Note: Medical clearance was required but not yet received. Completing this RTW will mark clearance as received.
              </div>
            )}
          </div>

          {/* Return Date */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">Return to Work Date *</label>
            <input
              type="date"
              value={form.return_to_work_date}
              onChange={(e) => setForm({ ...form, return_to_work_date: e.target.value })}
              className="w-full px-4 py-2 bg-black/[0.04] dark:bg-white/[0.06] border border-black/15 dark:border-white/[0.1] rounded-lg text-theme-primary focus:outline-none focus:border-green-500"
              required
            />
          </div>

          {/* GP Consulted */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rtw_gp_consulted"
                checked={form.rtw_gp_consulted}
                onChange={(e) => setForm({ ...form, rtw_gp_consulted: e.target.checked, rtw_fit_note_provided: false })}
                className="w-4 h-4 rounded border-black/20 dark:border-white/[0.2] bg-black/[0.04] dark:bg-white/[0.06] accent-green-600"
              />
              <label htmlFor="rtw_gp_consulted" className="text-sm text-theme-primary">GP / Doctor was consulted</label>
            </div>

            {form.rtw_gp_consulted && (
              <div className="flex items-center gap-2 ml-6">
                <input
                  type="checkbox"
                  id="rtw_fit_note_provided"
                  checked={form.rtw_fit_note_provided}
                  onChange={(e) => setForm({ ...form, rtw_fit_note_provided: e.target.checked })}
                  className="w-4 h-4 rounded border-black/20 dark:border-white/[0.2] bg-black/[0.04] dark:bg-white/[0.06] accent-green-600"
                />
                <label htmlFor="rtw_fit_note_provided" className="text-sm text-theme-secondary">Fit note provided</label>
              </div>
            )}
          </div>

          {/* Fit for Full Duties */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">Fit to return to full duties?</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, rtw_fit_for_full_duties: true })}
                className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  form.rtw_fit_for_full_duties
                    ? 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'border-black/15 dark:border-white/[0.1] text-theme-secondary hover:border-green-500/50'
                }`}
              >
                Yes — Full duties
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, rtw_fit_for_full_duties: false, rtw_adjustments_needed: true })}
                className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  !form.rtw_fit_for_full_duties
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'border-black/15 dark:border-white/[0.1] text-theme-secondary hover:border-amber-500/50'
                }`}
              >
                No — Restricted duties
              </button>
            </div>
          </div>

          {/* Adjustments */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rtw_adjustments_needed"
                checked={form.rtw_adjustments_needed}
                onChange={(e) => setForm({ ...form, rtw_adjustments_needed: e.target.checked })}
                className="w-4 h-4 rounded border-black/20 dark:border-white/[0.2] bg-black/[0.04] dark:bg-white/[0.06] accent-green-600"
              />
              <label htmlFor="rtw_adjustments_needed" className="text-sm text-theme-primary">Workplace adjustments or restrictions needed</label>
            </div>

            {form.rtw_adjustments_needed && (
              <textarea
                value={form.rtw_adjustments_details}
                onChange={(e) => setForm({ ...form, rtw_adjustments_details: e.target.value })}
                placeholder="Describe adjustments, restricted duties, or temporary arrangements..."
                rows={3}
                className="w-full px-4 py-2 bg-black/[0.04] dark:bg-white/[0.06] border border-black/15 dark:border-white/[0.1] rounded-lg text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:border-green-500 text-sm"
              />
            )}
          </div>

          {/* Follow-up */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rtw_follow_up_required"
                checked={form.rtw_follow_up_required}
                onChange={(e) => setForm({ ...form, rtw_follow_up_required: e.target.checked })}
                className="w-4 h-4 rounded border-black/20 dark:border-white/[0.2] bg-black/[0.04] dark:bg-white/[0.06] accent-green-600"
              />
              <label htmlFor="rtw_follow_up_required" className="text-sm text-theme-primary">Follow-up review required</label>
            </div>

            {form.rtw_follow_up_required && (
              <div className="ml-6">
                <label className="block text-xs text-theme-tertiary mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={form.rtw_follow_up_date}
                  onChange={(e) => setForm({ ...form, rtw_follow_up_date: e.target.value })}
                  className="w-full px-4 py-2 bg-black/[0.04] dark:bg-white/[0.06] border border-black/15 dark:border-white/[0.1] rounded-lg text-theme-primary focus:outline-none focus:border-green-500 text-sm"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">Interview Notes</label>
            <textarea
              value={form.rtw_notes}
              onChange={(e) => setForm({ ...form, rtw_notes: e.target.value })}
              placeholder="Any additional notes from the return to work interview..."
              rows={3}
              className="w-full px-4 py-2 bg-black/[0.04] dark:bg-white/[0.06] border border-black/15 dark:border-white/[0.1] rounded-lg text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:border-green-500 text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/10 dark:border-white/[0.1] flex gap-3 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || !form.return_to_work_date}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {saving ? 'Saving...' : 'Complete Return to Work'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-theme-primary rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
