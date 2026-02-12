'use client';

import { useState } from 'react';
import { AlertTriangle, Clock, Phone } from '@/components/ui/icons';

interface OutOfRangeAction {
  assetId: string;
  assetName: string;
  action: 'monitor' | 'callout' | null;
}

interface OutOfRangeActionModalProps {
  outOfRangeAssets: Array<{
    assetId: string;
    assetName: string;
    temperature: number;
    min: number | null;
    max: number | null;
  }>;
  onComplete: (actions: OutOfRangeAction[]) => void;
  onCancel: () => void;
}

export function OutOfRangeActionModal({
  outOfRangeAssets,
  onComplete,
  onCancel
}: OutOfRangeActionModalProps) {
  const [actions, setActions] = useState<Map<string, 'monitor' | 'callout'>>(new Map());

  const handleActionSelect = (assetId: string, action: 'monitor' | 'callout') => {
    setActions(prev => {
      const newActions = new Map(prev);
      newActions.set(assetId, action);
      return newActions;
    });
  };

  const handleComplete = () => {
    const actionsList: OutOfRangeAction[] = outOfRangeAssets.map(asset => ({
      assetId: asset.assetId,
      assetName: asset.assetName,
      action: actions.get(asset.assetId) || null
    }));
    onComplete(actionsList);
  };

  const allActionsSelected = outOfRangeAssets.every(asset => actions.has(asset.assetId));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/[0.1] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-white/[0.1]">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-semibold text-theme-primary">
              Temperature Out of Range
            </h2>
          </div>
          <p className="text-sm text-theme-tertiary">
            Please select an action for each out-of-range temperature reading
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {outOfRangeAssets.map((asset) => {
            const selectedAction = actions.get(asset.assetId);

            return (
              <div key={asset.assetId} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-theme-primary mb-1">
                    {asset.assetName}
                  </h3>
                  <p className="text-xs text-theme-tertiary">
                    Recorded: <span className="text-red-400 font-medium">{asset.temperature}°C</span> | Expected: {asset.min}°C to {asset.max}°C
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Monitor Option */}
                  <button
                    type="button"
                    onClick={() => handleActionSelect(asset.assetId, 'monitor')}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      selectedAction === 'monitor'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                        : 'bg-white/[0.03] border-white/[0.1] text-theme-tertiary hover:border-white/[0.2]'
                    }`}
                  >
                    <Clock className="w-5 h-5 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Monitor</div>
                      <div className="text-xs opacity-75">Check again later</div>
                    </div>
                  </button>

                  {/* Callout Option */}
                  <button
                    type="button"
                    onClick={() => handleActionSelect(asset.assetId, 'callout')}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      selectedAction === 'callout'
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-white/[0.03] border-white/[0.1] text-theme-tertiary hover:border-white/[0.2]'
                    }`}
                  >
                    <Phone className="w-5 h-5 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Callout</div>
                      <div className="text-xs opacity-75">Immediate action</div>
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/[0.1] flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-theme-tertiary hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={!allActionsSelected}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              allActionsSelected
                ? 'bg-module-fg hover:bg-module-fg/90 text-white'
                : 'bg-gray-700 text-theme-tertiary cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
