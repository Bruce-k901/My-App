"use client";

import { Settings, Loader2 } from '@/components/ui/icons';

export default function ProductionSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Production Settings</h1>
        <p className="text-white/50 text-sm mt-1">
          Configure production timelines and prep schedules (e.g., dough on day 1 for day 3 delivery)
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
        <Settings className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <h3 className="text-white font-medium mb-2">Production Settings</h3>
        <p className="text-white/60 text-sm">
          Production configuration coming soon. Set up prep schedules, lead times, and production timelines.
        </p>
      </div>
    </div>
  );
}

