'use client';

import { AlertTriangle } from '@/components/ui/icons';

interface OutOfRangeAsset {
  assetId: string;
  assetName: string;
  temperature: number;
  min: number | null;
  max: number | null;
}

interface OutOfRangeWarningProps {
  outOfRangeAssets: OutOfRangeAsset[];
}

export function OutOfRangeWarning({ outOfRangeAssets }: OutOfRangeWarningProps) {
  if (outOfRangeAssets.length === 0) return null;

  // Format range text
  const formatRange = (asset: OutOfRangeAsset) => {
    if (asset.min !== null && asset.max !== null) {
      const isInverted = asset.min > asset.max;
      if (isInverted) {
        return `${asset.max}°C to ${asset.min}°C`;
      }
      return `${asset.min}°C to ${asset.max}°C`;
    }
    if (asset.min !== null) return `Min ${asset.min}°C`;
    if (asset.max !== null) return `Max ${asset.max}°C`;
    return 'No range';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-red-400">
        <AlertTriangle className="w-5 h-5" />
        <span className="text-sm font-medium">Temperature Out of Range</span>
      </div>

      {outOfRangeAssets.map((asset) => (
        <div key={asset.assetId} className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-500 mb-1">
                {asset.assetName} - Temperature Out of Range
              </h4>
              <p className="text-xs text-theme-tertiary">
                Recorded: <span className="text-red-400 font-medium">{asset.temperature}°C</span>
                <span className="mx-2">|</span>
                Expected: <span className="text-theme-tertiary">{formatRange(asset)}</span>
              </p>
              <p className="text-xs text-red-400 mt-2">
                Please investigate and take appropriate action
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
