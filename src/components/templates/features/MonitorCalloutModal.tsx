'use client';

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface MonitorCalloutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (monitor: boolean, callout: boolean, notes?: string) => void;
  triggerType: 'temperature' | 'pass_fail' | 'manual';
  triggerValue?: string | number; // For temperature: actual temp, for pass_fail: 'pass' or 'fail'
  assetName?: string;
  contractorType?: string;
  tempRange?: { min?: number; max?: number };
}

export function MonitorCalloutModal({
  isOpen,
  onClose,
  onConfirm,
  triggerType,
  triggerValue,
  assetName,
  contractorType,
  tempRange
}: MonitorCalloutModalProps) {
  const [monitor, setMonitor] = useState(false);
  const [callout, setCallout] = useState(false);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(monitor, callout, notes);
    // Reset form
    setMonitor(false);
    setCallout(false);
    setNotes('');
    onClose();
  };

  const getTriggerMessage = () => {
    if (triggerType === 'temperature' && typeof triggerValue === 'number') {
      let message = `Temperature reading: ${triggerValue}°C${assetName ? ` for ${assetName}` : ''}`;
      if (tempRange && (tempRange.min !== undefined || tempRange.max !== undefined)) {
        const rangeStr = `${tempRange.min !== undefined ? tempRange.min : 'no min'}°C – ${tempRange.max !== undefined ? tempRange.max : 'no max'}°C`;
        const isOutOfRange = (tempRange.min !== undefined && triggerValue < tempRange.min) || 
                            (tempRange.max !== undefined && triggerValue > tempRange.max);
        message += ` (Range: ${rangeStr})`;
        if (isOutOfRange) {
          message += ' - OUT OF RANGE';
        }
      }
      return message;
    }
    if (triggerType === 'pass_fail' && triggerValue === 'fail') {
      return 'Task marked as FAIL';
    }
    return 'Action triggered';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-neutral-800 rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
            Monitor/Callout Required
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-900 dark:text-white/80 text-sm mb-2">{getTriggerMessage()}</p>
          {contractorType && (
            <p className="text-pink-600 dark:text-pink-400 text-sm">
              Contractor Type: {contractorType.replace('_', ' ')}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={monitor}
              onChange={(e) => setMonitor(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 bg-white dark:bg-white/[0.05] text-pink-500 focus:ring-pink-500"
            />
            <span className="text-gray-900 dark:text-white">Monitor - Track this issue for follow-up</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={callout}
              onChange={(e) => setCallout(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 bg-white dark:bg-white/[0.05] text-pink-500 focus:ring-pink-500"
            />
            <span className="text-gray-900 dark:text-white">
              Callout - Request contractor visit
              {contractorType && ` (${contractorType.replace('_', ' ')})`}
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about the issue..."
              className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-pink-500 hover:bg-pink-600 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200"
            disabled={!monitor && !callout}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

