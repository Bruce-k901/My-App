"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import TrayPackingView from '@/components/stockly/production/TrayPackingView';

export default function TrayPackingPage() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const streamParam = searchParams.get('stream') as 'wholesale' | 'kiosk' | null;
  
  // Default to today's date if not provided
  const today = new Date().toISOString().split('T')[0];
  const date = dateParam || today;
  const stream = streamParam || 'wholesale';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tray Packing</h1>
        <p className="text-white/50 text-sm mt-1">
          Physical tray-by-tray production planning
        </p>
      </div>

      {/* Stream Tabs */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2">
        <div className="flex gap-2">
          <a
            href={`/dashboard/stockly/production/tray-packing?date=${date}&stream=wholesale`}
            className={`flex-1 px-4 py-2 rounded-lg transition-all ${
              stream === 'wholesale'
                ? 'bg-[#EC4899]/20 border border-[#EC4899] text-white'
                : 'bg-white/[0.02] border border-white/[0.06] text-white/60 hover:bg-white/[0.05]'
            }`}
          >
            Wholesale
          </a>
          <a
            href={`/dashboard/stockly/production/tray-packing?date=${date}&stream=kiosk`}
            className={`flex-1 px-4 py-2 rounded-lg transition-all ${
              stream === 'kiosk'
                ? 'bg-[#EC4899]/20 border border-[#EC4899] text-white'
                : 'bg-white/[0.02] border border-white/[0.06] text-white/60 hover:bg-white/[0.05]'
            }`}
          >
            Kiosk
          </a>
        </div>
      </div>

      <TrayPackingView date={date} stream={stream} />
    </div>
  );
}

