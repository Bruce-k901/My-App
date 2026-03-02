'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { AssetTemperatureInput, type AssetTemperatureInputHandle } from '../../components/AssetTemperatureInput';
import { NumericKeyboard } from '@/components/ui/NumericKeyboard';
import type { Asset } from '@/types/task-completion.types';

interface PlacedAction {
  action: 'monitor' | 'callout';
  duration?: number;
  notes?: string;
}

interface TemperatureRendererProps {
  assets: Map<string, Asset>;
  assetTempRanges: Map<string, { min: number | null; max: number | null }>;
  temperatures: Record<string, number | null>;
  onTemperatureChange: (assetId: string, temp: number | null) => void;
  // Action props
  placedActions?: Map<string, PlacedAction>;
  onPlaceAction?: (assetId: string, action: 'monitor' | 'callout', options?: { duration?: number; notes?: string }) => void;
  onRemoveAction?: (assetId: string) => void;
}

export function TemperatureRenderer({
  assets,
  assetTempRanges,
  temperatures,
  onTemperatureChange,
  placedActions,
  onPlaceAction,
  onRemoveAction
}: TemperatureRendererProps) {
  // Single shared keyboard state
  const [focusedAssetId, setFocusedAssetId] = useState<string | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRefs = useRef<Map<string, AssetTemperatureInputHandle>>(new Map());

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

  // Build equipment list directly from assets Map
  const equipmentList = useMemo(() => {
    const list: Array<{
      assetId: string;
      assetName: string;
      nickname?: string | null;
      min: number | null;
      max: number | null;
    }> = [];

    assets.forEach((asset, assetId) => {
      const range = assetTempRanges.get(assetId) || { min: null, max: null };

      list.push({
        assetId,
        assetName: asset.name,
        nickname: asset.nickname || null,
        min: range.min,
        max: range.max
      });
    });

    return list;
  }, [assets, assetTempRanges]);

  // Keyboard handlers routed to active input
  const handleKeyPress = useCallback((key: string) => {
    if (!focusedAssetId) return;
    inputRefs.current.get(focusedAssetId)?.handleKeyPress(key);
  }, [focusedAssetId]);

  const handleBackspace = useCallback(() => {
    if (!focusedAssetId) return;
    inputRefs.current.get(focusedAssetId)?.handleBackspace();
  }, [focusedAssetId]);

  // Enter advances to next sensor (state-only, no DOM focus)
  const handleEnter = useCallback(() => {
    if (!focusedAssetId) return;
    const currentIndex = equipmentList.findIndex(e => e.assetId === focusedAssetId);
    if (currentIndex < equipmentList.length - 1) {
      setFocusedAssetId(equipmentList[currentIndex + 1].assetId);
    } else {
      // Last sensor — dismiss keyboard
      setShowKeyboard(false);
      setFocusedAssetId(null);
    }
  }, [focusedAssetId, equipmentList]);

  const handleDismiss = useCallback(() => {
    setShowKeyboard(false);
    setFocusedAssetId(null);
  }, []);

  const handleInputFocus = useCallback((assetId: string) => {
    setFocusedAssetId(assetId);
    if (isMobile) setShowKeyboard(true);
  }, [isMobile]);

  const handleInputBlur = useCallback((_assetId: string) => {
    // On mobile, outside-click handler manages dismissal
    if (!isMobile) {
      setFocusedAssetId(null);
      setShowKeyboard(false);
    }
  }, [isMobile]);

  // Outside-click dismissal for mobile keyboard
  useEffect(() => {
    if (!isMobile || !showKeyboard) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const keyboard = document.querySelector('[data-numeric-keyboard]');

      // Ignore clicks on the keyboard itself
      if (keyboard?.contains(target)) return;

      // Check if clicked on a temperature input (let onFocus handle switching)
      const clickedInput = target.closest('[data-temp-input]');
      if (clickedInput) return;

      // Clicked outside — dismiss keyboard
      setShowKeyboard(false);
      setFocusedAssetId(null);
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMobile, showKeyboard]);

  // Ref callback for each input
  const setInputRef = useCallback((assetId: string) => (handle: AssetTemperatureInputHandle | null) => {
    if (handle) {
      inputRefs.current.set(assetId, handle);
    } else {
      inputRefs.current.delete(assetId);
    }
  }, []);

  if (equipmentList.length === 0) {
    return (
      <div className="p-4 border border-yellow-200 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg">
        <p className="text-sm text-yellow-700 dark:text-yellow-400">
          No equipment configured for this task. Please check the task configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-theme-primary">Temperature Readings</h3>

      <div className="space-y-2">
        {equipmentList.map(equipment => (
          <AssetTemperatureInput
            ref={setInputRef(equipment.assetId)}
            key={equipment.assetId}
            assetId={equipment.assetId}
            assetName={equipment.assetName}
            nickname={equipment.nickname}
            value={temperatures[equipment.assetId] ?? null}
            min={equipment.min}
            max={equipment.max}
            onChange={onTemperatureChange}
            placedAction={placedActions?.get(equipment.assetId)}
            onPlaceAction={onPlaceAction ? (action, options) => onPlaceAction(equipment.assetId, action, options) : undefined}
            onRemoveAction={onRemoveAction ? () => onRemoveAction(equipment.assetId) : undefined}
            isKeyboardTarget={focusedAssetId === equipment.assetId && showKeyboard}
            onInputFocus={handleInputFocus}
            onInputBlur={handleInputBlur}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* Single shared numeric keyboard for all temperature inputs */}
      {isMobile && (
        <NumericKeyboard
          onKeyPress={handleKeyPress}
          onBackspace={handleBackspace}
          onEnter={handleEnter}
          onDismiss={handleDismiss}
          isVisible={showKeyboard}
        />
      )}
    </div>
  );
}
