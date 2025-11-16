'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MonitorCalloutModal } from './MonitorCalloutModal';

interface TemperatureLoggingFeatureProps {
  temperatures: Array<{ assetId?: string; equipment?: string; nickname?: string; temp?: number }>;
  selectedAssets: string[];
  assets: Array<{ id: string; name: string; category?: string; site_name?: string }>;
  onChange: (temperatures: Array<{ assetId?: string; equipment?: string; nickname?: string; temp?: number }>) => void;
  onMonitorCallout?: (monitor: boolean, callout: boolean, notes?: string, assetId?: string, temp?: number) => void;
  contractorType?: string;
  warnThreshold?: number;
  failThreshold?: number;
}

export function TemperatureLoggingFeature({
  temperatures,
  selectedAssets,
  assets,
  onChange,
  onMonitorCallout,
  contractorType,
  warnThreshold,
  failThreshold
}: TemperatureLoggingFeatureProps) {
  const [monitorCalloutModal, setMonitorCalloutModal] = useState<{
    isOpen: boolean;
    assetId?: string;
    assetName?: string;
    temp?: number;
  }>({ isOpen: false });

  // Auto-populate temperatures from selected assets when assets change
  useEffect(() => {
    if (selectedAssets.length > 0 && temperatures.length === 0) {
      const newTemps = selectedAssets
        .filter(assetId => !temperatures.some(t => t.assetId === assetId))
        .map(assetId => {
          const asset = assets.find(a => a.id === assetId);
          return {
            assetId: assetId,
            equipment: asset?.name || '',
            nickname: '',
            temp: undefined as number | undefined
          };
        });
      
      if (newTemps.length > 0) {
        onChange([...temperatures, ...newTemps]);
      }
    }
  }, [selectedAssets, assets, temperatures, onChange]);

  const handleTempChange = (index: number, temp: number | undefined) => {
    const newTemps = [...temperatures];
    newTemps[index] = { ...newTemps[index], temp };
    onChange(newTemps);

    // Check thresholds and trigger monitor/callout if needed
    if (temp !== undefined && (warnThreshold || failThreshold)) {
      const assetId = newTemps[index].assetId;
      const assetName = newTemps[index].equipment || assets.find(a => a.id === assetId)?.name;
      
      if (failThreshold && temp > failThreshold) {
        // Trigger monitor/callout modal for fail threshold
        setMonitorCalloutModal({
          isOpen: true,
          assetId,
          assetName,
          temp
        });
      } else if (warnThreshold && temp > warnThreshold && onMonitorCallout) {
        // Auto-trigger monitor for warn threshold
        onMonitorCallout(true, false, `Temperature ${temp}°C exceeds warning threshold of ${warnThreshold}°C`, assetId, temp);
      }
    }
  };

  const handleMonitorCalloutConfirm = (monitor: boolean, callout: boolean, notes?: string) => {
    if (onMonitorCallout && monitorCalloutModal.assetId !== undefined) {
      onMonitorCallout(monitor, callout, notes, monitorCalloutModal.assetId, monitorCalloutModal.temp);
    }
    setMonitorCalloutModal({ isOpen: false });
  };

  const autoPopulateFromAssets = () => {
    const newTemps = selectedAssets
      .filter(assetId => !temperatures.some(t => t.assetId === assetId))
      .map(assetId => {
        const asset = assets.find(a => a.id === assetId);
        return {
          assetId: assetId,
          equipment: asset?.name || '',
          nickname: '',
          temp: undefined as number | undefined
        };
      });
    
    if (newTemps.length > 0) {
      onChange([...temperatures, ...newTemps]);
      toast.success(`Added ${newTemps.length} temperature log(s) from selected assets`);
    } else {
      toast.info('All selected assets already have temperature logs');
    }
  };

  return (
    <>
      <div className="border-t border-white/10 pt-6">
        <h2 className="text-lg font-semibold text-white mb-4">Temperature Logs</h2>
        <p className="text-sm text-white/60 mb-4">
          Temperature logs are automatically populated from selected assets. You can add a nickname for each asset.
        </p>
        
        <div className="space-y-3">
          {temperatures.map((temp, index) => {
            const asset = assets.find(a => a.id === temp.assetId);
            const tempValue = temp.temp;
            const isWarning = warnThreshold && tempValue !== undefined && tempValue > warnThreshold;
            const isFail = failThreshold && tempValue !== undefined && tempValue > failThreshold;
            
            return (
              <div 
                key={index} 
                className={`grid grid-cols-4 gap-2 p-3 rounded-lg ${
                  isFail ? 'bg-red-500/10 border border-red-500/50' :
                  isWarning ? 'bg-yellow-500/10 border border-yellow-500/50' :
                  'bg-white/[0.03] border border-white/[0.06]'
                }`}
              >
                <input
                  type="text"
                  value={temp.equipment || asset?.name || ''}
                  onChange={(e) => {
                    const newTemps = [...temperatures];
                    newTemps[index] = { ...temp, equipment: e.target.value };
                    onChange(newTemps);
                  }}
                  placeholder="Equipment name"
                  className="px-4 py-2 rounded-lg bg-[#0f1220] border border-neutral-800 text-white"
                  readOnly={!!asset}
                />
                <input
                  type="text"
                  value={temp.nickname || ''}
                  onChange={(e) => {
                    const newTemps = [...temperatures];
                    newTemps[index] = { ...temp, nickname: e.target.value };
                    onChange(newTemps);
                  }}
                  placeholder="Nickname (e.g., 1, 2, 3)"
                  className="px-4 py-2 rounded-lg bg-[#0f1220] border border-neutral-800 text-white"
                />
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="-?[0-9]*\.?[0-9]*"
                    value={temp.temp || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow negative numbers, decimals, and empty string
                      if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
                        handleTempChange(index, value === '' || value === '-' ? undefined : parseFloat(value));
                      }
                    }}
                    placeholder="Temperature (°C)"
                    className={`px-4 py-2 rounded-lg bg-[#0f1220] border text-white w-full ${
                      isFail ? 'border-red-500' :
                      isWarning ? 'border-yellow-500' :
                      'border-neutral-800'
                    }`}
                  />
                  {isFail && (
                    <span className="absolute right-2 top-2 text-xs text-red-400">⚠️</span>
                  )}
                  {isWarning && !isFail && (
                    <span className="absolute right-2 top-2 text-xs text-yellow-400">⚠️</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newTemps = temperatures.filter((_, i) => i !== index);
                    onChange(newTemps);
                  }}
                  className="px-3 text-red-400 hover:bg-red-500/10 rounded"
                >
                  Remove
                </button>
              </div>
            );
          })}
          
          {temperatures.length === 0 && selectedAssets.length > 0 && (
            <p className="text-sm text-white/60">
              Click "Auto-populate from Assets" to create temperature logs for selected assets.
            </p>
          )}
          
          <div className="flex gap-2">
            {selectedAssets.length > 0 && (
              <button
                type="button"
                onClick={autoPopulateFromAssets}
                className="text-sm px-4 py-2 bg-pink-600/20 text-pink-400 hover:bg-pink-600/30 rounded-lg border border-pink-500/30"
              >
                + Auto-populate from Assets
              </button>
            )}
            <button
              type="button"
              onClick={() => onChange([...temperatures, { equipment: '', nickname: '', temp: undefined }])}
              className="text-sm px-4 py-2 text-pink-400 hover:text-pink-300"
            >
              + Add Manual Temperature Reading
            </button>
          </div>
        </div>
      </div>

      <MonitorCalloutModal
        isOpen={monitorCalloutModal.isOpen}
        onClose={() => setMonitorCalloutModal({ isOpen: false })}
        onConfirm={handleMonitorCalloutConfirm}
        triggerType="temperature"
        triggerValue={monitorCalloutModal.temp}
        assetName={monitorCalloutModal.assetName}
        contractorType={contractorType}
      />
    </>
  );
}

