'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, Archive, AlertTriangle, MapPin, Calendar, Wrench, User } from '@/components/ui/icons';
import { FABRIC_CATEGORIES, CONDITION_RATINGS, ALL_SUBCATEGORIES } from '@/types/rm';
import type { BuildingAsset } from '@/types/rm';

interface Props {
  asset: BuildingAsset;
  onEdit: (asset: BuildingAsset) => void;
  onArchive: (assetId: string) => void;
  onRaiseWorkOrder: (asset: BuildingAsset) => void;
}

export default function BuildingAssetCard({ asset, onEdit, onArchive, onRaiseWorkOrder }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const subcategoryLabel = ALL_SUBCATEGORIES.find(s => s.value === asset.fabric_subcategory)?.label || asset.fabric_subcategory;
  const categoryLabel = FABRIC_CATEGORIES[asset.fabric_category]?.label || asset.fabric_category;
  const conditionConfig = asset.condition_rating ? CONDITION_RATINGS.find(c => c.value === asset.condition_rating) : null;

  const isOverdueInspection = asset.next_inspection_date && new Date(asset.next_inspection_date) < new Date();

  // Calculate remaining life
  const remainingLife = asset.install_year && asset.expected_life_years
    ? asset.install_year + asset.expected_life_years - new Date().getFullYear()
    : null;

  return (
    <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden transition-all">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-theme-hover/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Condition indicator */}
          {conditionConfig ? (
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${conditionConfig.bgColour.replace('bg-', 'bg-').replace('/30', '')}`}
              style={{ backgroundColor: conditionConfig.value <= 2 ? '#EF4444' : conditionConfig.value === 3 ? '#F59E0B' : conditionConfig.value === 4 ? '#3B82F6' : '#10B981' }}
            />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gray-300 dark:bg-gray-600" />
          )}

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-theme-primary truncate">{asset.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-theme-tertiary">{subcategoryLabel}</span>
              {asset.site_name && (
                <>
                  <span className="text-xs text-theme-tertiary">·</span>
                  <span className="text-xs text-theme-tertiary">{asset.site_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Condition badge */}
          {conditionConfig && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conditionConfig.bgColour} ${conditionConfig.colour}`}>
              {conditionConfig.label}
            </span>
          )}

          {/* Overdue inspection warning */}
          {isOverdueInspection && (
            <span className="text-amber-500" title="Inspection overdue">
              <AlertTriangle className="w-4 h-4" />
            </span>
          )}

          {isExpanded ? <ChevronUp className="w-4 h-4 text-theme-tertiary" /> : <ChevronDown className="w-4 h-4 text-theme-tertiary" />}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-theme space-y-3">
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2 text-theme-tertiary">
              <span className="font-medium text-theme-secondary">Category:</span>
              {categoryLabel}
            </div>
            {asset.location_description && (
              <div className="flex items-center gap-2 text-theme-tertiary">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                {asset.location_description}
              </div>
            )}
            {asset.install_year && (
              <div className="text-theme-tertiary">
                <span className="font-medium text-theme-secondary">Installed:</span> {asset.install_year}
              </div>
            )}
            {asset.expected_life_years && (
              <div className="text-theme-tertiary">
                <span className="font-medium text-theme-secondary">Expected Life:</span> {asset.expected_life_years} years
                {remainingLife !== null && (
                  <span className={remainingLife <= 0 ? ' text-red-500' : remainingLife <= 5 ? ' text-amber-500' : ''}>
                    {' '}({remainingLife <= 0 ? 'past end of life' : `${remainingLife}yr remaining`})
                  </span>
                )}
              </div>
            )}
            {asset.area_or_quantity && (
              <div className="text-theme-tertiary">
                <span className="font-medium text-theme-secondary">Size/Qty:</span> {asset.area_or_quantity}
              </div>
            )}
            {asset.next_inspection_date && (
              <div className={`flex items-center gap-2 ${isOverdueInspection ? 'text-amber-500' : 'text-theme-tertiary'}`}>
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                Next inspection: {new Date(asset.next_inspection_date).toLocaleDateString('en-GB')}
                {isOverdueInspection && <span className="text-xs font-medium">(Overdue)</span>}
              </div>
            )}
            {asset.maintenance_contractor_name && (
              <div className="flex items-center gap-2 text-theme-tertiary">
                <Wrench className="w-3.5 h-3.5 flex-shrink-0" />
                {asset.maintenance_contractor_name}
              </div>
            )}
            {asset.emergency_contractor_name && (
              <div className="flex items-center gap-2 text-theme-tertiary">
                <User className="w-3.5 h-3.5 flex-shrink-0" />
                Emergency: {asset.emergency_contractor_name}
              </div>
            )}
          </div>

          {/* Condition notes */}
          {asset.condition_notes && (
            <div className="text-sm text-theme-tertiary bg-theme-muted rounded-lg p-2.5">
              {asset.condition_notes}
            </div>
          )}

          {/* Notes */}
          {asset.notes && (
            <div className="text-sm text-theme-tertiary italic">{asset.notes}</div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onRaiseWorkOrder(asset)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-assetly-dark dark:bg-assetly text-white dark:text-black hover:opacity-90 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Raise Work Order
            </button>
            <button
              onClick={() => onEdit(asset)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-theme-secondary hover:bg-theme-hover transition-colors border border-theme"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => onArchive(asset.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-theme"
            >
              <Archive className="w-3.5 h-3.5" />
              Archive
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
