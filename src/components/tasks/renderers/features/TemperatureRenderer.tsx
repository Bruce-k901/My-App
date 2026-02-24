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

  // Keyboard handlers routed to focused input
  const handleKeyPress = useCallback((key: string) => {
    if (!focusedAssetId) return;
    const handle = inputRefs.current.get(focusedAssetId);
    handle?.handleKeyPress(key);
  }, [focusedAssetId]);

  const handleBackspace = useCallback(() => {
    if (!focusedAssetId) return;
    const handle = inputRefs.current.get(focusedAssetId);
    handle?.handleBackspace();
  }, [focusedAssetId]);

  // Enter advances to next sensor
  const handleEnter = useCallback(() => {
    if (!focusedAssetId) return;
    const currentIndex = equipmentList.findIndex(e => e.assetId === focusedAssetId);
    if (currentIndex < equipmentList.length - 1) {
      const nextAssetId = equipmentList[currentIndex + 1].assetId;
      const nextHandle = inputRefs.current.get(nextAssetId);
      nextHandle?.focus();
      setFocusedAssetId(nextAssetId);
    } else {
      // Last sensor — dismiss keyboard
      const handle = inputRefs.current.get(focusedAssetId);
      handle?.blur();
      setShowKeyboard(false);
      setFocusedAssetId(null);
    }
  }, [focusedAssetId, equipmentList]);

  const handleDismiss = useCallback(() => {
    if (focusedAssetId) {
      const handle = inputRefs.current.get(focusedAssetId);
      handle?.blur();
    }
    setShowKeyboard(false);
    setFocusedAssetId(null);
  }, [focusedAssetId]);

  const handleInputFocus = useCallback((assetId: string) => {
    setFocusedAssetId(assetId);
    if (isMobile) setShowKeyboard(true);
  }, [isMobile]);

  const handleInputBlur = useCallback((assetId: string) => {
    // Only hide if this asset is still the focused one (another input hasn't taken focus)
    setTimeout(() => {
      const keyboardElement = document.querySelector('[data-numeric-keyboard]');
      if (keyboardElement && keyboardElement.contains(document.activeElement)) return;
      setFocusedAssetId(prev => {
        if (prev === assetId) {
          setShowKeyboard(false);
          return null;
        }
        return prev;
      });
    }, 150);
  }, []);

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
