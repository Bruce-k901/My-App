'use client';

import { useState, useEffect } from 'react';
import { X } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';

const DAYPART_OPTIONS = [
  { value: 'before_open', label: 'Before Open' },
  { value: 'morning', label: 'Morning' },
  { value: 'midday', label: 'Midday' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'close', label: 'Close' },
];

const FREQUENCY_MAP: Record<string, string> = {
  daily: 'daily', weekly: 'weekly', monthly: 'monthly',
  quarterly: 'monthly', 'bi-annually': 'annually', annually: 'annually',
  triggered: 'triggered', once: 'triggered',
};

interface QuickScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  template: {
    id: string;
    name: string;
    frequency: string;
    tags?: string[] | null;
  };
}

export function QuickScheduleModal({ isOpen, onClose, onComplete, template }: QuickScheduleModalProps) {
  const { companyId, profile } = useAppContext();
  const [availableSites, setAvailableSites] = useState<{ id: string; name: string }[]>([]);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [applyToAll, setApplyToAll] = useState(false);
  const [selectedDayparts, setSelectedDayparts] = useState<string[]>(['before_open']);
  const [daypartTimes, setDaypartTimes] = useState<Record<string, string>>({
    before_open: '06:00', morning: '09:00', midday: '12:00', afternoon: '15:00', close: '22:00',
  });
  const [saving, setSaving] = useState(false);

  // Ad-hoc tasks (triggered/once/on demand) don't need dayparts or times
  const siteFreq = FREQUENCY_MAP[template.frequency] || 'triggered';
  const isScheduled = siteFreq !== 'triggered';

  // Load sites
  useEffect(() => {
    if (!isOpen || !companyId) return;
    (async () => {
      const { data: sites } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name');
      if (sites) {
        setAvailableSites(sites);
        // Default to home site
        const homeSiteId = profile?.home_site;
        if (homeSiteId && sites.some(s => s.id === homeSiteId)) {
          setSelectedSites([homeSiteId]);
        }
      }
    })();
  }, [isOpen, companyId, profile?.home_site]);

  // Load pre-assigned sites
  useEffect(() => {
    if (!isOpen || !template.id) return;
    (async () => {
      const { data: assignments } = await supabase
        .from('template_site_assignments')
        .select('site_id')
        .eq('template_id', template.id);
      if (assignments && assignments.length > 0) {
        setSelectedSites(assignments.map(a => a.site_id));
      }
    })();
  }, [isOpen, template.id]);

  const handleApplyToAll = (checked: boolean) => {
    setApplyToAll(checked);
    if (checked) setSelectedSites(availableSites.map(s => s.id));
    else setSelectedSites([]);
  };

  const toggleSite = (siteId: string) => {
    setSelectedSites(prev =>
      prev.includes(siteId) ? prev.filter(s => s !== siteId) : [...prev, siteId]
    );
    setApplyToAll(false);
  };

  const toggleDaypart = (dp: string) => {
    setSelectedDayparts(prev =>
      prev.includes(dp) ? prev.filter(d => d !== dp) : [...prev, dp]
    );
  };

  const handleSave = async () => {
    if (selectedSites.length === 0) {
      toast.error('Select at least one site');
      return;
    }
    if (isScheduled && selectedDayparts.length === 0) {
      toast.error('Select at least one daypart');
      return;
    }

    setSaving(true);
    try {
      // Build daypart_times only for scheduled tasks
      const dpTimes: Record<string, string> = {};
      if (isScheduled) {
        selectedDayparts.forEach(dp => {
          dpTimes[dp] = daypartTimes[dp] || '';
        });
      }

      // Create site_checklists for each site
      for (const siteId of selectedSites) {
        const { error } = await supabase
          .from('site_checklists')
          .insert({
            template_id: template.id,
            company_id: companyId,
            site_id: siteId,
            name: template.name,
            frequency: siteFreq,
            active: true,
            daypart_times: dpTimes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) {
          console.error(`Failed to create site_checklist for site ${siteId}:`, error);
        }
      }

      // Remove trail_import tag
      const updatedTags = (template.tags || []).filter(t => t !== 'trail_import');
      await supabase
        .from('task_templates')
        .update({ tags: updatedTags.length > 0 ? updatedTags : null })
        .eq('id', template.id);

      toast.success(`${isScheduled ? 'Scheduled' : 'Assigned'} for ${selectedSites.length} site${selectedSites.length !== 1 ? 's' : ''}`);
      onComplete();
    } catch (err) {
      console.error('Quick schedule error:', err);
      toast.error('Failed to schedule template');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[rgb(var(--surface-elevated))] border border-black/10 dark:border-white/[0.1] rounded-lg w-full max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
          <div>
            <h3 className="text-sm font-semibold text-theme-primary">Quick Schedule</h3>
            <p className="text-xs text-theme-tertiary mt-0.5 truncate max-w-[300px]">{template.name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-theme-muted rounded transition-colors">
            <X className="w-4 h-4 text-theme-tertiary" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Frequency info */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-theme-tertiary">Frequency:</span>
            <span className="text-xs font-medium text-theme-primary capitalize">{template.frequency.replace(/_/g, ' ')}</span>
            {!isScheduled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-theme-muted text-theme-tertiary">Ad-hoc — no schedule needed</span>
            )}
          </div>

          {/* Sites */}
          <div>
            <label className="block text-xs font-medium text-theme-primary mb-2">
              {isScheduled ? 'Sites to schedule' : 'Sites to assign'}
            </label>
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={e => handleApplyToAll(e.target.checked)}
                className="rounded border-theme text-[#D37E91] focus:ring-[#D37E91]"
              />
              <span className="text-xs text-theme-secondary">Apply to all sites</span>
            </label>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {availableSites.map(site => (
                <label key={site.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                  <input
                    type="checkbox"
                    checked={selectedSites.includes(site.id)}
                    onChange={() => toggleSite(site.id)}
                    className="rounded border-theme text-[#D37E91] focus:ring-[#D37E91]"
                  />
                  <span className="text-xs text-theme-primary">{site.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dayparts — only for scheduled (recurring) tasks */}
          {isScheduled && (
            <>
              <div>
                <label className="block text-xs font-medium text-theme-primary mb-2">Dayparts</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYPART_OPTIONS.map(dp => (
                    <button
                      key={dp.value}
                      onClick={() => toggleDaypart(dp.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        selectedDayparts.includes(dp.value)
                          ? 'bg-[#D37E91]/10 text-[#D37E91] border-[#D37E91]/30'
                          : 'bg-theme-surface text-theme-tertiary border-theme hover:border-theme-hover'
                      }`}
                    >
                      {dp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Times for selected dayparts */}
              {selectedDayparts.length > 0 && (
                <div className="space-y-2">
                  {selectedDayparts.map(dp => {
                    const label = DAYPART_OPTIONS.find(o => o.value === dp)?.label || dp;
                    return (
                      <div key={dp} className="flex items-center gap-3">
                        <span className="text-xs text-theme-secondary w-24">{label}</span>
                        <input
                          type="time"
                          value={daypartTimes[dp] || ''}
                          onChange={e => setDaypartTimes(prev => ({ ...prev, [dp]: e.target.value }))}
                          className="px-2 py-1 bg-theme-surface border border-theme rounded text-xs text-theme-primary focus:outline-none focus:border-[#D37E91]"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-theme">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-theme text-theme-secondary hover:bg-theme-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedSites.length === 0}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#D37E91] hover:bg-[#D37E91]/90 text-white transition-colors disabled:opacity-50"
          >
            {saving ? (isScheduled ? 'Scheduling...' : 'Assigning...') : (isScheduled ? 'Schedule & Activate' : 'Assign & Activate')}
          </button>
        </div>
      </div>
    </div>
  );
}
