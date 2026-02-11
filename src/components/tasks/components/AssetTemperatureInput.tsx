'use client';

import { useState, useEffect, useRef } from 'react';
import { Thermometer, AlertCircle, Clock, Phone, X } from '@/components/ui/icons';
import { NumericKeyboard } from '@/components/ui/NumericKeyboard';

interface PlacedAction {
  action: 'monitor' | 'callout';
  duration?: number;
  notes?: string;
}

interface AssetTemperatureInputProps {
  assetId: string;
  assetName: string;
  nickname?: string | null;
  value: number | null;
  min: number | null;
  max: number | null;
  onChange: (assetId: string, temperature: number | null) => void;
  disabled?: boolean;
  // Action tracking
  placedAction?: PlacedAction | null;
  onPlaceAction?: (action: 'monitor' | 'callout', options?: { duration?: number; notes?: string }) => void;
  onRemoveAction?: () => void;
}

export function AssetTemperatureInput({
  assetId,
  assetName,
  nickname,
  value,
  min,
  max,
  onChange,
  disabled = false,
  placedAction,
  onPlaceAction,
  onRemoveAction
}: AssetTemperatureInputProps) {
  const [tempValue, setTempValue] = useState<string>(value?.toString() || '');
  const [showActionPicker, setShowActionPicker] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'monitor' | 'callout' | null>(null);
  const [monitorDuration, setMonitorDuration] = useState(60);
  const [calloutNotes, setCalloutNotes] = useState('');

  // Mobile keyboard state
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mobile detection: touch support AND small screen
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(hasTouch && isSmallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync with external value changes
  useEffect(() => {
    setTempValue(value?.toString() || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Allow negative numbers, decimals, and empty string
    if (newValue === '' || newValue === '-' || /^-?\d*\.?\d*$/.test(newValue)) {
      setTempValue(newValue);
      if (newValue === '' || newValue === '-') {
        onChange(assetId, null);
      } else {
        const num = parseFloat(newValue);
        if (!isNaN(num)) {
          onChange(assetId, num);
        }
      }
    }
  };

  // Keyboard handlers for mobile NumericKeyboard
  const handleKeyPress = (key: string) => {
    let newValue = '';
    if (key === '-') {
      // Toggle minus sign
      if (tempValue.startsWith('-')) {
        newValue = tempValue.slice(1);
      } else {
        newValue = '-' + tempValue;
      }
    } else if (key === '.') {
      // Only allow one decimal point
      if (!tempValue.includes('.')) {
        newValue = tempValue + '.';
      } else {
        return; // Don't add if already exists
      }
    } else {
      newValue = tempValue + key;
    }

    // Validate and update
    if (newValue === '' || newValue === '-' || /^-?\d*\.?\d*$/.test(newValue)) {
      setTempValue(newValue);
      if (newValue !== '' && newValue !== '-') {
        const num = parseFloat(newValue);
        if (!isNaN(num)) {
          onChange(assetId, num);
        }
      } else {
        onChange(assetId, null);
      }
    }
    inputRef.current?.focus();
  };

  const handleBackspace = () => {
    if (tempValue.length > 0) {
      const newValue = tempValue.slice(0, -1);
      setTempValue(newValue);
      if (newValue === '' || newValue === '-') {
        onChange(assetId, null);
      } else {
        const num = parseFloat(newValue);
        if (!isNaN(num)) {
          onChange(assetId, num);
        }
      }
    }
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    if (isMobile) {
      setShowKeyboard(true);
    }
  };

  const handleInputBlur = () => {
    // Delay to allow keyboard clicks to register
    setTimeout(() => {
      const keyboardElement = document.querySelector('[data-numeric-keyboard]');
      if (keyboardElement && keyboardElement.contains(document.activeElement)) {
        inputRef.current?.focus();
        return;
      }
      if (document.activeElement !== inputRef.current) {
        setShowKeyboard(false);
      }
    }, 150);
  };

  // Check if current value is out of range
  // Note: Ranges are already corrected in useTaskState, so simple comparison
  const isOutOfRange = value !== null && (
    (min !== null && value < min) ||
    (max !== null && value > max)
  );

  // Format range text
  let rangeText = 'No range set';
  if (min !== null && max !== null) {
    rangeText = `${min}°C to ${max}°C`;
  } else if (min !== null) {
    rangeText = `Min ${min}°C`;
  } else if (max !== null) {
    rangeText = `Max ${max}°C`;
  }

  const displayName = nickname || assetName;
  const showNickname = nickname && nickname !== assetName;

  const handleSelectAction = (action: 'monitor' | 'callout') => {
    setSelectedAction(action);
    setShowActionPicker(true);
  };

  const handlePlaceMonitor = () => {
    onPlaceAction?.('monitor', { duration: monitorDuration });
    setShowActionPicker(false);
    setSelectedAction(null);
    setMonitorDuration(60);
  };

  const handlePlaceCallout = () => {
    onPlaceAction?.('callout', { notes: calloutNotes });
    setShowActionPicker(false);
    setSelectedAction(null);
    setCalloutNotes('');
  };

  const handleCancel = () => {
    setShowActionPicker(false);
    setSelectedAction(null);
  };

  return (
    <div className="space-y-2">
      {/* Temperature Input Row */}
      <div className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
        isOutOfRange
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-white/[0.02] border-white/[0.06]'
      }`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Thermometer className={`w-4 h-4 flex-shrink-0 ${isOutOfRange ? 'text-red-400' : 'text-blue-400'}`} />
            <span className="text-sm font-medium text-white truncate">{displayName}</span>
            {showNickname && (
              <span className="text-xs text-neutral-400">({assetName})</span>
            )}
          </div>
          <span className="text-xs text-neutral-400">{rangeText}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            inputMode={isMobile && showKeyboard ? 'none' : 'decimal'}
            pattern="-?[0-9]*\.?[0-9]*"
            value={tempValue}
            onChange={handleChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            disabled={disabled}
            placeholder="--"
            className={`w-20 px-3 py-2 bg-white/[0.03] border rounded-lg text-white placeholder-neutral-500 focus:outline-none transition-colors text-center ${
              isOutOfRange
                ? 'border-red-500 focus:border-red-500'
                : 'border-white/[0.06] focus:border-blue-500'
            }`}
            style={{ fontSize: isMobile ? '16px' : '14px' }}
          />
          <span className="text-sm text-neutral-400">°C</span>
        </div>

        {isOutOfRange && (
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        )}
      </div>

      {/* Out of Range Actions - Show immediately below input */}
      {isOutOfRange && !disabled && onPlaceAction && (
        <div className="ml-6 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-400 mb-3">
            Temperature out of range - Action required
          </p>

          {/* Placed Action Display */}
          {placedAction && (
            <div className="flex items-center justify-between p-2 bg-white/[0.05] border border-white/[0.1] rounded-lg">
              <div className="flex items-center gap-2">
                {placedAction.action === 'monitor' ? (
                  <>
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-blue-400">
                      Monitor - Check in {placedAction.duration || 60} minutes
                    </span>
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400">
                      Callout Placed
                      {placedAction.notes && ` - ${placedAction.notes}`}
                    </span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={onRemoveAction}
                className="text-neutral-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          {!placedAction && !showActionPicker && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectAction('monitor')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-colors text-xs"
              >
                <Clock className="w-3 h-3" />
                <span>Monitor</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectAction('callout')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors text-xs"
              >
                <Phone className="w-3 h-3" />
                <span>Callout</span>
              </button>
            </div>
          )}

          {/* Monitor Form */}
          {!placedAction && showActionPicker && selectedAction === 'monitor' && (
            <div className="space-y-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">Schedule Monitoring</span>
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Check again in:</label>
                <select
                  value={monitorDuration}
                  onChange={(e) => setMonitorDuration(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-white/[0.03] border border-white/[0.1] rounded text-white text-xs"
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
                  onClick={handlePlaceMonitor}
                  className="flex-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 rounded text-white text-xs font-medium transition-colors"
                >
                  Confirm Monitor
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-2 py-1 text-neutral-400 hover:text-white transition-colors text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Callout Form */}
          {!placedAction && showActionPicker && selectedAction === 'callout' && (
            <div className="space-y-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-red-400" />
                <span className="text-xs font-medium text-red-400">Request Callout</span>
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Notes (Optional):</label>
                <textarea
                  value={calloutNotes}
                  onChange={(e) => setCalloutNotes(e.target.value)}
                  placeholder="Add details about the issue..."
                  rows={2}
                  className="w-full px-2 py-1 bg-white/[0.03] border border-white/[0.1] rounded text-white text-xs resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePlaceCallout}
                  className="flex-1 px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-white text-xs font-medium transition-colors"
                >
                  Confirm Callout
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-2 py-1 text-neutral-400 hover:text-white transition-colors text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile numeric keyboard with minus button for freezer temps */}
      {isMobile && (
        <NumericKeyboard
          onKeyPress={handleKeyPress}
          onBackspace={handleBackspace}
          isVisible={showKeyboard}
        />
      )}
    </div>
  );
}
