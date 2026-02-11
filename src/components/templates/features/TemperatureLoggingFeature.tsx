'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Trash2 } from '@/components/ui/icons';
import { MonitorCalloutModal } from './MonitorCalloutModal';
import { TemperatureInput } from '@/components/ui';

interface TemperatureLoggingFeatureProps {
  temperatures: Array<{ assetId?: string; equipment?: string; nickname?: string; temp?: number; temp_min?: number; temp_max?: number; _tempMinInput?: string; _tempMaxInput?: string }>;
  selectedAssets: string[];
  assets: Array<{ id: string; name: string; category?: string; site_name?: string }>;
  onChange: (temperatures: Array<{ assetId?: string; equipment?: string; nickname?: string; temp?: number; temp_min?: number; temp_max?: number; _tempMinInput?: string; _tempMaxInput?: string }>) => void;
  onMonitorCallout?: (monitor: boolean, callout: boolean, notes?: string, assetId?: string, temp?: number, tempRange?: { min?: number; max?: number }) => void;
  contractorType?: string;
  warnThreshold?: number;
  failThreshold?: number;
  isTemplateMode?: boolean; // When true, hides temperature reading field (only show min/max ranges)
}

export function TemperatureLoggingFeature({
  temperatures,
  selectedAssets,
  assets,
  onChange,
  onMonitorCallout,
  contractorType,
  warnThreshold,
  failThreshold,
  isTemplateMode = false
}: TemperatureLoggingFeatureProps) {
  const [monitorCalloutModal, setMonitorCalloutModal] = useState<{
    isOpen: boolean;
    assetId?: string;
    assetName?: string;
    temp?: number;
    tempRange?: { min?: number; max?: number };
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
            temp: undefined as number | undefined,
            temp_min: undefined as number | undefined,
            temp_max: undefined as number | undefined
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

    // Check if temp is outside the defined range
    // Handle inverted ranges for freezers (where min > max, e.g., min: -18, max: -20)
    const tempRange = {
      min: newTemps[index].temp_min,
      max: newTemps[index].temp_max
    };
    
    if (temp !== undefined && (tempRange.min !== undefined || tempRange.max !== undefined)) {
      const isInvertedRange = tempRange.min !== undefined && tempRange.max !== undefined && tempRange.min > tempRange.max
      let isOutOfRange = false
      
      if (isInvertedRange) {
        // Inverted range (freezer): actual range is max (colder) to min (warmer)
        // Temperature is out of range if: temp < max (too cold) OR temp > min (too warm)
        isOutOfRange = (tempRange.max !== undefined && temp < tempRange.max) || 
                      (tempRange.min !== undefined && temp > tempRange.min)
      } else {
        // Normal range (fridge): range is min (colder) to max (warmer)
        isOutOfRange = (tempRange.min !== undefined && temp < tempRange.min) || 
                      (tempRange.max !== undefined && temp > tempRange.max)
      }
      
      if (isOutOfRange) {
        const assetId = newTemps[index].assetId;
        const assetName = newTemps[index].equipment || assets.find(a => a.id === assetId)?.name;
        setMonitorCalloutModal({
          isOpen: true,
          assetId,
          assetName,
          temp,
          tempRange
        });
      }
    }

    // Also check thresholds and trigger monitor/callout if needed
    if (temp !== undefined && (warnThreshold || failThreshold)) {
      const assetId = newTemps[index].assetId;
      const assetName = newTemps[index].equipment || assets.find(a => a.id === assetId)?.name;
      
      if (failThreshold && temp > failThreshold) {
        // Trigger monitor/callout modal for fail threshold
        setMonitorCalloutModal({
          isOpen: true,
          assetId,
          assetName,
          temp,
          tempRange
        });
      } else if (warnThreshold && temp > warnThreshold && onMonitorCallout) {
        // Auto-trigger monitor for warn threshold
        onMonitorCallout(true, false, `Temperature ${temp}°C exceeds warning threshold of ${warnThreshold}°C`, assetId, temp, tempRange);
      }
    }
  };

  const handleTempRangeChange = (index: number, field: 'temp_min' | 'temp_max', value: string) => {
    const newTemps = [...temperatures];
    const inputField = field === 'temp_min' ? '_tempMinInput' : '_tempMaxInput';
    
    // Always store the raw input value for display (allows typing negative numbers like "-18")
    // This preserves the "-" while the user is typing
    newTemps[index] = { ...newTemps[index], [inputField]: value };
    
    // Parse and store the numeric value
    if (value === '') {
      // Empty - clear both input and numeric value
      newTemps[index] = { ...newTemps[index], [field]: undefined, [inputField]: undefined };
    } else if (value === '-') {
      // Just minus sign - keep the input string but don't store numeric value yet
      // This allows user to continue typing after "-"
      newTemps[index] = { ...newTemps[index], [field]: undefined };
    } else {
      // Try to parse the value - parseFloat handles negative numbers correctly
      const parsedValue = parseFloat(value);
      if (!isNaN(parsedValue) && isFinite(parsedValue)) {
        // Valid number (including negative) - store the parsed numeric value
        newTemps[index] = { ...newTemps[index], [field]: parsedValue };
      }
      // If invalid (e.g., "-." or incomplete), keep the input string but don't update numeric value
    }
    onChange(newTemps);
  };

  const handleMonitorCalloutConfirm = (monitor: boolean, callout: boolean, notes?: string) => {
    if (onMonitorCallout && monitorCalloutModal.assetId !== undefined) {
      onMonitorCallout(monitor, callout, notes, monitorCalloutModal.assetId, monitorCalloutModal.temp, monitorCalloutModal.tempRange);
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
          temp: undefined as number | undefined,
          temp_min: undefined as number | undefined,
          temp_max: undefined as number | undefined
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
      <div className="border-t border-gray-200 dark:border-white/10 pt-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Temperature Logs</h2>
        <p className="text-sm text-gray-600 dark:text-white/60 mb-4">
          {isTemplateMode 
            ? "Temperature logs are automatically populated from selected assets. Set min/max ranges to define acceptable temperature ranges for each asset."
            : "Temperature logs are automatically populated from selected assets. Set min/max ranges to trigger callouts when readings are out of range."
          }
        </p>
        
        {temperatures.length > 0 && (
          <div className="mb-3">
            <div className={`grid grid-cols-1 gap-3 ${isTemplateMode ? 'md:grid-cols-4' : 'md:grid-cols-5'}`}>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Equipment Name
              </label>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Nickname
              </label>
              {!isTemplateMode && (
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Temperature
                </label>
              )}
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Temperature Range
              </label>
              <div></div> {/* Empty cell for Remove button column */}
            </div>
          </div>
        )}
        
        {temperatures.length === 0 && selectedAssets.length === 0 && (
          <div className="mb-4 p-4 rounded-lg border border-gray-200 dark:border-white/[0.1] bg-gray-50 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-600 dark:text-white/60">
              {isTemplateMode 
                ? "Select assets in the Asset Selection section above to create temperature logs. Temperature logs will be automatically populated from selected assets."
                : "No temperature logs configured. Select assets to add temperature logs."
              }
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          {temperatures.map((temp, index) => {
            const asset = assets.find(a => a.id === temp.assetId);
            const tempValue = temp.temp;
            const tempMin = temp.temp_min;
            const tempMax = temp.temp_max;
            // Use stored input value if available (for negative number typing), otherwise use parsed value
            // This allows users to type "-" and continue typing numbers for negative temperatures
            const tempMinDisplay = temp._tempMinInput !== undefined 
              ? temp._tempMinInput 
              : (tempMin !== undefined ? String(tempMin) : '');
            const tempMaxDisplay = temp._tempMaxInput !== undefined 
              ? temp._tempMaxInput 
              : (tempMax !== undefined ? String(tempMax) : '');
            
            // Check if current temp is outside the defined range
            const isOutOfRange = tempValue !== undefined && 
              ((tempMin !== undefined && tempValue < tempMin) || (tempMax !== undefined && tempValue > tempMax));
            
            const isWarning = warnThreshold && tempValue !== undefined && tempValue > warnThreshold;
            const isFail = failThreshold && tempValue !== undefined && tempValue > failThreshold || isOutOfRange;
            
            return (
              <div 
                key={index} 
                className={`p-4 rounded-lg border ${
                  isFail ? 'bg-red-50 dark:bg-red-500/10 border-red-500/50' :
                  isWarning ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-500/50' :
                  'bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06]'
                }`}
              >
                <div className={`grid grid-cols-1 gap-3 ${isTemplateMode ? 'md:grid-cols-[2.6fr_1.5fr_2fr_auto]' : 'md:grid-cols-[2.6fr_1.5fr_1.5fr_2fr_auto]'} items-center`}>
                  <div className="min-w-0">
                    <input
                      type="text"
                      value={temp.equipment || asset?.name || ''}
                      onChange={(e) => {
                        const newTemps = [...temperatures];
                        newTemps[index] = { ...temp, equipment: e.target.value };
                        onChange(newTemps);
                      }}
                      placeholder="Equipment name"
                      className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
                      readOnly={!!asset}
                      title={temp.equipment || asset?.name || ''}
                    />
                  </div>
                  <div className="min-w-0">
                    <input
                      type="text"
                      value={temp.nickname || ''}
                      onChange={(e) => {
                        const newTemps = [...temperatures];
                        newTemps[index] = { ...temp, nickname: e.target.value };
                        onChange(newTemps);
                      }}
                      placeholder="e.g., FR1"
                      className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
                    />
                  </div>
                  {!isTemplateMode && (
                    <div className="relative min-w-0">
                      <TemperatureInput
                        value={temp.temp || ''}
                        onChange={(value) => {
                          handleTempChange(index, value === '' || value === '-' ? undefined : parseFloat(value));
                        }}
                        placeholder="Temperature (°C)"
                        fontSize="14px"
                        className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91] ${
                          isFail ? 'border-red-500' :
                          isWarning ? 'border-yellow-500' :
                          'border-gray-300 dark:border-white/[0.1]'
                        }`}
                        style={{ fontSize: '14px' }}
                      />
                      {isFail && (
                        <span className="absolute right-2 top-2 text-xs text-red-500">⚠️</span>
                      )}
                      {isWarning && !isFail && (
                        <span className="absolute right-2 top-2 text-xs text-yellow-500">⚠️</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <TemperatureInput
                        value={tempMinDisplay}
                        onChange={(value) => {
                          handleTempRangeChange(index, 'temp_min', value);
                        }}
                        placeholder="Min"
                        fontSize="14px"
                        className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
                        style={{ fontSize: '14px', fontFamily: 'inherit' }}
                      />
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 text-sm font-medium px-1">–</span>
                    <div className="flex-1 min-w-0">
                      <TemperatureInput
                        value={tempMaxDisplay}
                        onChange={(value) => {
                          handleTempRangeChange(index, 'temp_max', value);
                        }}
                        placeholder="Max"
                        fontSize="14px"
                        className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
                        style={{ fontSize: '14px', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const newTemps = temperatures.filter((_, i) => i !== index);
                        onChange(newTemps);
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                      aria-label="Remove temperature log"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {(tempMin !== undefined || tempMax !== undefined) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-gray-200 dark:border-white/[0.1]">
                    Range: {tempMin !== undefined ? `${tempMin}°C` : 'no min'} – {tempMax !== undefined ? `${tempMax}°C` : 'no max'}
                  </p>
                )}
              </div>
            );
          })}
          
          {temperatures.length === 0 && selectedAssets.length > 0 && (
            <p className="text-sm text-gray-600 dark:text-white/60">
              Click "Auto-populate from Assets" to create temperature logs for selected assets.
            </p>
          )}
          
          {selectedAssets.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={autoPopulateFromAssets}
                className="text-sm px-4 py-2 bg-[#D37E91]/10 dark:bg-[#D37E91]/25 text-[#D37E91] dark:text-[#D37E91] hover:bg-[#D37E91]/10 dark:hover:bg-[#D37E91]/35 rounded-lg border border-[#D37E91] dark:border-[#D37E91]/30 font-medium transition-colors"
              >
                + Auto-populate from Assets
              </button>
            </div>
          )}
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
        tempRange={monitorCalloutModal.tempRange}
      />
    </>
  );
}

