'use client';

import React from 'react';
import { Calendar, MapPin, User, Wrench } from '@/components/ui/icons';
import { getPPMStatus, formatServiceDate, getFrequencyText, getStatusDisplayText } from '@/utils/ppmHelpers';
import { PPMAsset } from '@/types/ppm';
import { nullifyUndefined } from '@/lib/utils';

interface PPMCardProps {
  asset: PPMAsset;
  onClick: () => void;
  highlighted?: boolean;
}

export default function PPMCard({ asset, onClick, highlighted = false }: PPMCardProps) {
  const cleanAsset = nullifyUndefined(asset);
  const { status, color, borderColor } = getPPMStatus(cleanAsset.next_service_date, cleanAsset.ppm_status);
  const frequencyText = getFrequencyText(cleanAsset.frequency_months);
  const statusDisplayText = getStatusDisplayText(status);

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-white/[0.02] backdrop-blur-md rounded-xl border-2 p-6 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all duration-200 cursor-pointer group shadow-sm dark:shadow-none ${
        highlighted
          ? 'border-blue-500/60 bg-blue-50 dark:bg-blue-500/10 shadow-lg shadow-blue-200 dark:shadow-blue-500/20'
          : borderColor
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
            {cleanAsset.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{cleanAsset.category_name || 'Unknown Category'}</p>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${color}`}
        >
          {statusDisplayText}
        </span>
      </div>

      {/* Asset Details */}
      <div className="space-y-3">
        {/* Site */}
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-gray-600 dark:text-gray-300 truncate">
            {cleanAsset.site_name || (
              <span className="text-gray-400 dark:text-gray-500 italic">No site linked</span>
            )}
          </span>
        </div>

        {/* Contractor */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-gray-600 dark:text-gray-300 truncate">
            {cleanAsset.contractor_name || (
              <span className="text-gray-400 dark:text-gray-500 italic">Unassigned</span>
            )}
          </span>
        </div>

        {/* Frequency */}
        <div className="flex items-center gap-2 text-sm">
          <Wrench className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-gray-600 dark:text-gray-300">{frequencyText}</span>
        </div>
      </div>

      {/* Service Dates */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.08]">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-1">Last Service</p>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300 text-xs">
                {cleanAsset.last_service_date ? formatServiceDate(cleanAsset.last_service_date) : 'Never serviced'}
              </span>
            </div>
          </div>

          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-1">Next Service</p>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className={`text-xs ${color}`}>
                {formatServiceDate(cleanAsset.next_service_date)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}