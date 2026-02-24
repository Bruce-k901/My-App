"use client";

import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { Calendar, Plus, CheckCircle, AlertTriangle, Trash2, X } from '@/components/ui/icons';
import { useInspectionSchedules } from '@/hooks/assetly/useInspectionSchedules';
import { supabase } from '@/lib/supabase';
import type { BuildingInspectionSchedule } from '@/types/rm';

export default function InspectionsPage() {
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  const { schedules, loading, fetchSchedules, createSchedule, deleteSchedule, markCompleted } = useInspectionSchedules(companyId);

  const [showForm, setShowForm] = useState(false);
  const [buildingAssets, setBuildingAssets] = useState<{ id: string; name: string }[]>([]);
  const [contractors, setContractors] = useState<{ id: string; name: string }[]>([]);

  // Form state
  const [formAssetId, setFormAssetId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFrequency, setFormFrequency] = useState<number>(12);
  const [formNextDue, setFormNextDue] = useState('');
  const [formContractorId, setFormContractorId] = useState('');
  const [formAutoCreate, setFormAutoCreate] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    if (!companyId || !showForm) return;
    Promise.all([
      supabase.from('building_assets').select('id, name').eq('company_id', companyId).eq('status', 'active').order('name'),
      supabase.from('contractors').select('id, name').eq('company_id', companyId).order('name'),
    ]).then(([assetsRes, contRes]) => {
      setBuildingAssets(assetsRes.data || []);
      setContractors(contRes.data || []);
    });
  }, [companyId, showForm]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAssetId || !formFrequency) return;
    setSaving(true);
    try {
      await createSchedule({
        building_asset_id: formAssetId,
        description: formDescription || undefined,
        frequency_months: formFrequency,
        next_due_date: formNextDue || undefined,
        assigned_contractor_id: formContractorId || undefined,
        auto_create_wo: formAutoCreate,
      });
      showToast('Inspection schedule created', 'success');
      setShowForm(false);
      setFormAssetId('');
      setFormDescription('');
      setFormFrequency(12);
      setFormNextDue('');
      setFormContractorId('');
      setFormAutoCreate(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkCompleted = async (id: string) => {
    await markCompleted(id);
    showToast('Inspection marked as completed', 'success');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this inspection schedule?')) return;
    await deleteSchedule(id);
    showToast('Schedule deleted', 'success');
  };

  const today = new Date();
  const overdue = schedules.filter(s => s.next_due_date && new Date(s.next_due_date) < today);
  const upcoming = schedules.filter(s => {
    if (!s.next_due_date) return false;
    const due = new Date(s.next_due_date);
    const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return due >= today && due <= thirtyDays;
  });
  const later = schedules.filter(s => {
    if (!s.next_due_date) return true;
    const due = new Date(s.next_due_date);
    return due > new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  });

  const renderSchedule = (schedule: BuildingInspectionSchedule) => {
    const isOverdue = schedule.next_due_date && new Date(schedule.next_due_date) < today;
    const freq = schedule.frequency_months >= 12
      ? `${schedule.frequency_months / 12} year${schedule.frequency_months > 12 ? 'ly' : ''}`
      : `${schedule.frequency_months} month${schedule.frequency_months > 1 ? 's' : ''}`;

    return (
      <div key={schedule.id} className="bg-theme-surface border border-theme rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-theme-primary">{schedule.building_asset_name}</h4>
          {schedule.description && <p className="text-xs text-theme-tertiary mt-0.5">{schedule.description}</p>}
          <div className="flex items-center gap-3 mt-1 text-xs text-theme-tertiary">
            <span>Every {freq}</span>
            {schedule.next_due_date && (
              <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                Due: {new Date(schedule.next_due_date).toLocaleDateString('en-GB')}
                {isOverdue && ' (Overdue)'}
              </span>
            )}
            {schedule.contractor_name && <span>Contractor: {schedule.contractor_name}</span>}
            {schedule.last_completed_date && (
              <span>Last: {new Date(schedule.last_completed_date).toLocaleDateString('en-GB')}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <button
            onClick={() => handleMarkCompleted(schedule.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 border border-theme transition-colors"
            title="Mark completed"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Done
          </button>
          <button
            onClick={() => handleDelete(schedule.id)}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-theme-primary flex items-center gap-2">
            <Calendar className="w-6 h-6 text-assetly-dark dark:text-assetly" />
            Inspection Schedule
          </h1>
          <p className="text-sm text-theme-tertiary mt-1">Planned inspections for building fabric assets</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-assetly-dark dark:bg-assetly text-white dark:text-black hover:opacity-90 transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          Add Schedule
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-theme-surface border border-theme rounded-xl p-3">
          <p className="text-xs text-theme-tertiary">Total Schedules</p>
          <p className="text-2xl font-bold text-theme-primary">{schedules.length}</p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-3">
          <p className="text-xs text-theme-tertiary">Overdue</p>
          <p className={`text-2xl font-bold ${overdue.length > 0 ? 'text-red-500' : 'text-theme-primary'}`}>{overdue.length}</p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-3">
          <p className="text-xs text-theme-tertiary">Due This Month</p>
          <p className={`text-2xl font-bold ${upcoming.length > 0 ? 'text-amber-500' : 'text-theme-primary'}`}>{upcoming.length}</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-assetly-dark dark:border-assetly" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-theme-tertiary mx-auto mb-3" />
          <h3 className="text-lg font-medium text-theme-primary mb-1">No inspection schedules</h3>
          <p className="text-sm text-theme-tertiary mb-4">Create schedules to track recurring building inspections.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-assetly-dark dark:bg-assetly text-white dark:text-black"
          >
            Add Schedule
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-red-500 flex items-center gap-1.5 mb-3">
                <AlertTriangle className="w-4 h-4" /> Overdue ({overdue.length})
              </h2>
              <div className="space-y-2">{overdue.map(renderSchedule)}</div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-500 mb-3">Due This Month ({upcoming.length})</h2>
              <div className="space-y-2">{upcoming.map(renderSchedule)}</div>
            </div>
          )}
          {later.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-theme-secondary mb-3">Upcoming ({later.length})</h2>
              <div className="space-y-2">{later.map(renderSchedule)}</div>
            </div>
          )}
        </div>
      )}

      {/* Add schedule modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-theme-surface border border-theme rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
              <h2 className="text-lg font-semibold text-theme-primary">New Inspection Schedule</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-theme-hover">
                <X className="w-5 h-5 text-theme-secondary" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">Building Asset *</label>
                <select
                  value={formAssetId}
                  onChange={e => setFormAssetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm"
                  required
                >
                  <option value="">Select asset...</option>
                  {buildingAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="e.g. Annual roof inspection"
                  className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1">Frequency *</label>
                  <select
                    value={formFrequency}
                    onChange={e => setFormFrequency(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm"
                  >
                    <option value={1}>Monthly</option>
                    <option value={3}>Quarterly</option>
                    <option value={6}>6 Monthly</option>
                    <option value={12}>Annual</option>
                    <option value={24}>Biennial</option>
                    <option value={60}>5 Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1">Next Due Date</label>
                  <input
                    type="date"
                    value={formNextDue}
                    onChange={e => setFormNextDue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">Contractor</label>
                <select
                  value={formContractorId}
                  onChange={e => setFormContractorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm"
                >
                  <option value="">None</option>
                  {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formAutoCreate}
                  onChange={e => setFormAutoCreate(e.target.checked)}
                  className="rounded border-theme"
                />
                <span className="text-sm text-theme-secondary">Auto-create work order when due</span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-theme-secondary hover:bg-theme-hover">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formAssetId}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-assetly-dark dark:bg-assetly text-white dark:text-black disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
