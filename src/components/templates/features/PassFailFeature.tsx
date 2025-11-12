'use client';

import { useState } from 'react';
import { MonitorCalloutModal } from './MonitorCalloutModal';

interface PassFailFeatureProps {
  status: '' | 'pass' | 'fail';
  onChange: (status: '' | 'pass' | 'fail') => void;
  onMonitorCallout?: (monitor: boolean, callout: boolean, notes?: string) => void;
  contractorType?: string;
}

export function PassFailFeature({
  status,
  onChange,
  onMonitorCallout,
  contractorType
}: PassFailFeatureProps) {
  const [showMonitorCallout, setShowMonitorCallout] = useState(false);

  const handleStatusChange = (newStatus: 'pass' | 'fail') => {
    onChange(newStatus);
    
    // If status is 'fail', trigger monitor/callout modal
    if (newStatus === 'fail') {
      setShowMonitorCallout(true);
    }
  };

  const handleMonitorCalloutConfirm = (monitor: boolean, callout: boolean, notes?: string) => {
    if (onMonitorCallout) {
      onMonitorCallout(monitor, callout, notes);
    }
    setShowMonitorCallout(false);
  };

  return (
    <>
      <div className="border-t border-white/10 pt-6">
        <h2 className="text-lg font-semibold text-white mb-4">Pass/Fail Assessment</h2>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => handleStatusChange('pass')}
            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
              status === 'pass'
                ? 'bg-green-500/20 border-green-500 text-green-400'
                : 'bg-[#0f1220] border-neutral-800 text-white hover:border-green-500/50'
            }`}
          >
            Pass
          </button>
          <button
            type="button"
            onClick={() => handleStatusChange('fail')}
            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
              status === 'fail'
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : 'bg-[#0f1220] border-neutral-800 text-white hover:border-red-500/50'
            }`}
          >
            Fail
          </button>
        </div>
      </div>

      <MonitorCalloutModal
        isOpen={showMonitorCallout}
        onClose={() => setShowMonitorCallout(false)}
        onConfirm={handleMonitorCalloutConfirm}
        triggerType="pass_fail"
        triggerValue={status}
        contractorType={contractorType}
      />
    </>
  );
}

