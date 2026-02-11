"use client";

import { MapPin, Loader2 } from '@/components/ui/icons';

export default function DeliverySchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Delivery Schedule</h1>
        <p className="text-white/50 text-sm mt-1">
          Plan and optimize delivery routes and drops
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
        <MapPin className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <h3 className="text-white font-medium mb-2">Delivery Drops Schedule</h3>
        <p className="text-white/60 text-sm">
          Delivery schedule optimization coming soon. View routes, optimize delivery sequences, and manage drop times.
        </p>
      </div>
    </div>
  );
}

