'use client';

import { useMemo } from 'react';
import { AssetTemperatureInput } from '../../components/AssetTemperatureInput';
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

    console.log('🌡️ [TEMP] Equipment list built from assets Map:', list);
    return list;
  }, [assets, assetTempRanges]);

  if (equipmentList.length === 0) {
    return (
      <div className="p-4 border border-yellow-500/30 bg-yellow-500/10 rounded-lg">
        <p className="text-sm text-yellow-400">
          No equipment configured for this task. Please check the task configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white">Temperature Readings</h3>

      <div className="space-y-2">
        {equipmentList.map(equipment => (
          <AssetTemperatureInput
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
          />
        ))}
      </div>
    </div>
  );
}
