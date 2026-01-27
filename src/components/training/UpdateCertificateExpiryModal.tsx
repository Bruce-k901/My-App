'use client';

import { useState } from 'react';
import { X, Calendar, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface UpdateCertificateExpiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainingRecordId: string;
  currentExpiryDate: string | null;
  employeeName: string;
  courseName: string;
  profileId?: string; // For legacy records
  certificateType?: string; // For legacy records
  onSuccess: (newExpiryDate: string) => void;
}

export function UpdateCertificateExpiryModal({
  isOpen,
  onClose,
  trainingRecordId,
  currentExpiryDate,
  employeeName,
  courseName,
  profileId,
  certificateType,
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

    // Don't allow dates in the past
    if (selectedDate < new Date()) {
      toast.error('Expiry date cannot be in the past');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/training/records/${trainingRecordId}/update-expiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiry_date: newExpiryDate,
          profile_id: profileId, // For legacy records
          certificate_type: certificateType, // For legacy records
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update expiry date');
      }

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
      <div className="bg-neutral-800 rounded-lg border border-neutral-700 w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-700">
          <h2 className="text-xl font-semibold text-white">Update Certificate Expiry Date</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-700 rounded-lg transition-colors"
            disabled={saving}
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-neutral-400 mb-1">Employee</p>
            <p className="text-white font-medium">{employeeName}</p>
          </div>

          <div>
            <p className="text-sm text-neutral-400 mb-1">Course</p>
            <p className="text-white font-medium">{courseName}</p>
          </div>

          <div>
            <p className="text-sm text-neutral-400 mb-1">Current Expiry Date</p>
            <p className="text-white">
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
            <label className="block text-sm font-medium text-white mb-2">
              New Expiry Date <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                disabled={saving}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Select a future date for the new certificate expiry
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-700">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !newExpiryDate}
            className="px-4 py-2 bg-[#EC4899] hover:bg-[#EC4899]/80 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
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
