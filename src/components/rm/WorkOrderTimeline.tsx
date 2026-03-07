'use client';

import { WO_STATUS_CONFIG } from '@/types/rm';
import type { WOTimelineEntry } from '@/types/rm';

interface Props {
  timeline: WOTimelineEntry[];
}

export default function WorkOrderTimeline({ timeline }: Props) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="space-y-0">
      {timeline.map((entry, i) => {
        const toConfig = entry.to ? WO_STATUS_CONFIG[entry.to as keyof typeof WO_STATUS_CONFIG] : null;
        const date = entry.at ? new Date(entry.at) : null;

        return (
          <div key={i} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                toConfig ? 'bg-current ' + toConfig.colour : 'bg-gray-400 dark:bg-gray-500'
              }`} />
              {i < timeline.length - 1 && (
                <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 my-1" />
              )}
            </div>

            {/* Content */}
            <div className="pb-3 min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-theme-primary">
                  {entry.action === 'created' ? 'Created' :
                   entry.action === 'status_changed' && toConfig ? toConfig.label :
                   entry.action}
                </span>
                {entry.from && entry.to && entry.action === 'status_changed' && (
                  <span className="text-xs text-theme-tertiary">
                    from {WO_STATUS_CONFIG[entry.from as keyof typeof WO_STATUS_CONFIG]?.label || entry.from}
                  </span>
                )}
              </div>
              {date && (
                <p className="text-xs text-theme-tertiary mt-0.5">
                  {date.toLocaleDateString('en-GB')} at {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {entry.notes && (
                <p className="text-xs text-theme-tertiary mt-0.5">{entry.notes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
