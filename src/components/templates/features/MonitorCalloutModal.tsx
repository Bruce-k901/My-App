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
}

export function MonitorCalloutModal({
  isOpen,
  onClose,
  onConfirm,
  triggerType,
  triggerValue,
  assetName,
  contractorType
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
      return `Temperature reading: ${triggerValue}°C${assetName ? ` for ${assetName}` : ''}`;
    }
    if (triggerType === 'pass_fail' && triggerValue === 'fail') {
      return 'Task marked as FAIL';
    }
    return 'Action triggered';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1d2e] border border-neutral-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            Monitor/Callout Required
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-white/80 text-sm mb-2">{getTriggerMessage()}</p>
          {contractorType && (
            <p className="text-pink-400 text-sm">
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
              className="w-4 h-4 rounded border-neutral-600 bg-[#0f1220] text-pink-500 focus:ring-pink-500"
            />
            <span className="text-white">Monitor - Track this issue for follow-up</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={callout}
              onChange={(e) => setCallout(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-600 bg-[#0f1220] text-pink-500 focus:ring-pink-500"
            />
            <span className="text-white">
              Callout - Request contractor visit
              {contractorType && ` (${contractorType.replace('_', ' ')})`}
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about the issue..."
              className="w-full px-4 py-2 rounded-lg bg-[#0f1220] border border-neutral-800 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 min-h-[100px]"
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
            className="flex-1 bg-pink-600 hover:bg-pink-700"
            disabled={!monitor && !callout}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

