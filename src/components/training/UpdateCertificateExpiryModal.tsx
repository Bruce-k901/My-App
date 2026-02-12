'use client';

import { useState } from 'react';
import { X, Calendar, Save } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface UpdateCertificateExpiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainingRecordId: string;
  currentExpiryDate: string | null;
  employeeName: string;
  courseName: string;
  onSuccess: (newExpiryDate: string) => void;
}

export function UpdateCertificateExpiryModal({
  isOpen,
  onClose,
  trainingRecordId,
  currentExpiryDate,
  employeeName,
  courseName,
  onSuccess,
}: UpdateCertificateExpiryModalProps) {
  const [newExpiryDate, setNewExpiryDate] = useState<string>(
    currentExpiryDate ? new Date(currentExpiryDate).toISOString().split('T')[0] : ''
  );
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!newExpiryDate) {
      toast.error('Please select a new expiry date');
      return;
    }

    const selectedDate = new Date(newExpiryDate);
    if (isNaN(selectedDate.getTime())) {
      toast.error('Invalid date');
      return;
    }

    if (selectedDate < new Date()) {
      toast.error('Expiry date cannot be in the past');
      return;
    }

    setSaving(true);

    try {
      // Write directly to training_records - DB trigger syncs to profile fields
      const { error: updateError } = await supabase
        .from('training_records')
        .update({ expiry_date: newExpiryDate })
        .eq('id', trainingRecordId);

      if (updateError) throw updateError;

      toast.success('Certificate expiry date updated');
      onSuccess(newExpiryDate);
      onClose();
    } catch (error: any) {
      console.error('Error updating expiry date:', error);
      toast.error(error.message || 'Failed to update expiry date');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-theme-surface rounded-lg border border-theme w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme">
          <h2 className="text-xl font-semibold text-theme-primary">Update Certificate Expiry Date</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            disabled={saving}
          >
            <X className="w-5 h-5 text-theme-tertiary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-theme-tertiary mb-1">Employee</p>
            <p className="text-theme-primary font-medium">{employeeName}</p>
          </div>

          <div>
            <p className="text-sm text-theme-tertiary mb-1">Course</p>
            <p className="text-theme-primary font-medium">{courseName}</p>
          </div>

          <div>
            <p className="text-sm text-theme-tertiary mb-1">Current Expiry Date</p>
            <p className="text-theme-primary">
              {currentExpiryDate
                ? new Date(currentExpiryDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'Not set'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-primary mb-2">
              New Expiry Date <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={saving}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-tertiary pointer-events-none" />
            </div>
 <p className="text-xs text-gray-500 dark:text-theme-tertiary mt-1">
              Select a future date for the new certificate expiry
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-theme">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-theme-primary rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !newExpiryDate}
            className="px-4 py-2 bg-module-fg hover:bg-module-fg/90 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Update Expiry Date
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
