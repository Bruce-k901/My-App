'use client';

import { useState } from 'react';
import { AlertTriangle, Clock, Phone, X } from '@/components/ui/icons';

interface OutOfRangeAction {
  action: 'monitor' | 'callout';
  duration?: number;
  notes?: string;
}

interface OutOfRangeActionsSectionProps {
  outOfRangeAssets: Array<{
    assetId: string;
    assetName: string;
    temperature: number;
    min: number | null;
    max: number | null;
  }>;
  placedActions: Map<string, OutOfRangeAction>;
  onPlaceAction: (assetId: string, action: 'monitor' | 'callout', options?: { duration?: number; notes?: string }) => void;
  onRemoveAction: (assetId: string) => void;
}

export function OutOfRangeActionsSection({
  outOfRangeAssets,
  placedActions,
  onPlaceAction,
  onRemoveAction
}: OutOfRangeActionsSectionProps) {
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [monitorDuration, setMonitorDuration] = useState(60);
  const [calloutNotes, setCalloutNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState<'monitor' | 'callout' | null>(null);

  const handlePlaceMonitor = (assetId: string) => {
    onPlaceAction(assetId, 'monitor', { duration: monitorDuration });
    setExpandedAssetId(null);
    setSelectedAction(null);
    setMonitorDuration(60);
  };

  const handlePlaceCallout = (assetId: string) => {
    onPlaceAction(assetId, 'callout', { notes: calloutNotes });
    setExpandedAssetId(null);
    setSelectedAction(null);
    setCalloutNotes('');
  };

  const handleSelectAction = (assetId: string, action: 'monitor' | 'callout') => {
    setExpandedAssetId(assetId);
    setSelectedAction(action);
  };

  if (outOfRangeAssets.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <h3 className="text-sm font-medium text-red-500">Temperature Out of Range - Action Required</h3>
      </div>

      {outOfRangeAssets.map((asset) => {
        const hasAction = placedActions.has(asset.assetId);
        const action = placedActions.get(asset.assetId);
        const isExpanded = expandedAssetId === asset.assetId;

        return (
          <div key={asset.assetId} className="bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-4">
            {/* Asset Info */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-theme-primary mb-1">
                  {asset.assetName}
                </h4>
                <p className="text-xs text-theme-tertiary">
                  Recorded: <span className="text-red-600 dark:text-red-400 font-medium">{asset.temperature}°C</span>
                  {' | '}
                  Expected: {asset.min}°C to {asset.max}°C
                </p>
              </div>
            </div>

            {/* Placed Action Display */}
            {hasAction && (
              <div className="flex items-center justify-between p-3 bg-theme-button border border-theme rounded-lg">
                <div className="flex items-center gap-2">
                  {action?.action === 'monitor' ? (
                    <>
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm text-blue-600 dark:text-blue-400">
                        Monitor - Check in {action.duration || 60} minutes
                      </span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm text-red-600 dark:text-red-400">
                        Callout Placed
                        {action?.notes && ` - ${action.notes}`}
                      </span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveAction(asset.assetId)}
                  className="text-theme-tertiary hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Action Buttons */}
            {!hasAction && !isExpanded && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectAction(asset.assetId, 'monitor')}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/50 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Monitor</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAction(asset.assetId, 'callout')}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-medium">Callout</span>
                </button>
              </div>
            )}

            {/* Expanded Monitor Form */}
            {!hasAction && isExpanded && selectedAction === 'monitor' && (
              <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Schedule Monitoring</span>
                </div>
                <div>
                  <label className="text-xs text-theme-tertiary mb-1 block">Check again in:</label>
                  <select
                    value={monitorDuration}
                    onChange={(e) => setMonitorDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={240}>4 hours</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handlePlaceMonitor(asset.assetId)}
                    className="flex-1 px-3 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    Confirm Monitor
                  </button>
                  <button
                    type="button"
                    onClick={() => { setExpandedAssetId(null); setSelectedAction(null); }}
                    className="px-3 py-2 text-theme-tertiary hover:text-theme-primary transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Expanded Callout Form */}
            {!hasAction && isExpanded && selectedAction === 'callout' && (
              <div className="space-y-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">Request Callout</span>
                </div>
                <div>
                  <label className="text-xs text-theme-tertiary mb-1 block">Notes (Optional):</label>
                  <textarea
                    value={calloutNotes}
                    onChange={(e) => setCalloutNotes(e.target.value)}
                    placeholder="Add details about the issue..."
                    rows={2}
                    className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handlePlaceCallout(asset.assetId)}
                    className="flex-1 px-3 py-2 bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    Confirm Callout
                  </button>
                  <button
                    type="button"
                    onClick={() => { setExpandedAssetId(null); setSelectedAction(null); }}
                    className="px-3 py-2 text-theme-tertiary hover:text-theme-primary transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Summary */}
      {outOfRangeAssets.length > 0 && (
        <p className="text-xs text-theme-tertiary">
          {placedActions.size} of {outOfRangeAssets.length} actions placed
          {placedActions.size < outOfRangeAssets.length && (
            <span className="text-red-600 dark:text-red-400"> - All actions required to complete task</span>
          )}
        </p>
      )}
    </div>
  );
}
