'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';
import { PPMGroup } from '@/types/ppm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Layers, Package, Loader2, Wrench, Calendar } from '@/components/ui/icons';
import { formatServiceDate, getFrequencyText } from '@/utils/ppmHelpers';

interface GroupCalloutModalProps {
  open: boolean;
  onClose: () => void;
  group: PPMGroup;
  onSuccess?: () => void;
}

export default function GroupCalloutModal({ open, onClose, group, onSuccess }: GroupCalloutModalProps) {
  const { profile } = useAppContext();
  const { showToast } = useToast();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!profile?.id) {
      showToast('User not authenticated', 'error');
      return;
    }

    try {
      setSaving(true);

      const calloutData = {
        company_id: group.company_id,
        asset_id: null,
        ppm_group_id: group.id,
        site_id: group.site_id,
        contractor_id: group.ppm_contractor_id,
        created_by: profile.id,
        callout_type: 'ppm',
        priority: 'low',
        status: 'open',
        fault_description: null,
        notes: notes.trim() || `PPM service for group: ${group.name} (${group.asset_count} assets)`,
        attachments: [],
        troubleshooting_complete: false,
      };

      const { error } = await supabase
        .from('callouts')
        .insert(calloutData)
        .select()
        .single();

      if (error) throw error;

      showToast('PPM callout created for group', 'success');
      setNotes('');
      onClose();
      onSuccess?.();
    } catch (err: any) {
      console.error('Error creating group callout:', err);
      showToast(err.message || 'Failed to create callout', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-assetly" />
            Create PPM Callout for Group
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Group info */}
          <div className="bg-gray-50 dark:bg-white/[0.03] rounded-lg p-4 border border-gray-200 dark:border-white/[0.08] space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">{group.name}</h3>
            {group.ppm_contractor_name && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Wrench className="w-3.5 h-3.5" />
                {group.ppm_contractor_name}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              {getFrequencyText(group.ppm_frequency_months)}
              {group.next_service_date && ` · Next: ${formatServiceDate(group.next_service_date)}`}
            </div>
          </div>

          {/* Assets in group */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assets to be serviced ({group.asset_count})
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {group.assets.map(asset => (
                <div key={asset.asset_id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 py-1">
                  <Package className="w-3.5 h-3.5 text-assetly/70 flex-shrink-0" />
                  <span>{asset.asset_name}</span>
                  {asset.asset_category && (
                    <span className="text-gray-400 text-xs ml-auto">{asset.asset_category}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={`PPM service for group: ${group.name} (${group.asset_count} assets)`}
              className="w-full rounded-lg border border-gray-300 dark:border-white/[0.15] bg-white dark:bg-white/[0.05] px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-assetly/50"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/[0.15] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-assetly text-white hover:bg-assetly/90 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Callout
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
