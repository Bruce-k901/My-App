'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface StaffForecastWidgetProps {
  siteId: string;
  companyId: string;
}

type BusynessLevel = 'quiet' | 'normal' | 'busy';

const LEVEL_CONFIG: Record<BusynessLevel, { label: string; emoji: string; className: string; description: string }> = {
  quiet: {
    label: 'Quiet Day',
    emoji: '🌿',
    className: 'text-emerald-400',
    description: 'Below average expected covers',
  },
  normal: {
    label: 'Normal Day',
    emoji: '☀️',
    className: 'text-forecastly-dark dark:text-forecastly',
    description: 'Average covers expected',
  },
  busy: {
    label: 'Busy Day',
    emoji: '🔥',
    className: 'text-amber-400',
    description: 'Above average expected covers',
  },
};

export default function StaffForecastWidget({ siteId, companyId }: StaffForecastWidgetProps) {
  const [level, setLevel] = useState<BusynessLevel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteId || !companyId) return;

    async function load() {
      setLoading(true);

      // Find the current week's forecast
      const today = new Date();
      const day = today.getDay();
      const mondayDiff = day === 0 ? -6 : 1 - day;
      const monday = new Date(today);
      monday.setDate(monday.getDate() + mondayDiff);
      const mondayStr = monday.toISOString().split('T')[0];

      const { data: forecast } = await supabase
        .from('forecastly_forecasts')
        .select('final_forecast')
        .eq('site_id', siteId)
        .eq('week_commencing', mondayStr)
        .single();

      if (!forecast?.final_forecast) {
        setLevel(null);
        setLoading(false);
        return;
      }

      const days = forecast.final_forecast as { total_sales: number; lunch_covers: number; dinner_covers: number }[];
      const todayIndex = (day === 0 ? 6 : day - 1); // Mon=0, Sun=6
      const todayForecast = days[todayIndex];

      if (!todayForecast) {
        setLevel(null);
        setLoading(false);
        return;
      }

      // Compare today's forecast to weekly average
      const weeklyAvg = days.reduce((s, d) => s + (d.total_sales || 0), 0) / 7;
      const todayTotal = todayForecast.total_sales || 0;

      if (todayTotal < weeklyAvg * 0.8) {
        setLevel('quiet');
      } else if (todayTotal > weeklyAvg * 1.2) {
        setLevel('busy');
      } else {
        setLevel('normal');
      }

      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, [siteId, companyId]);

  if (loading) {
    return <div className="h-16 rounded bg-white/[0.03] animate-pulse" />;
  }

  if (!level) {
    return (
      <div className="text-center py-3">
        <p className="text-xs text-theme-tertiary">No forecast for today</p>
      </div>
    );
  }

  const config = LEVEL_CONFIG[level];

  return (
    <div className="text-center">
      <p className="text-2xl">{config.emoji}</p>
      <p className={`text-sm font-medium mt-1 ${config.className}`}>
        {config.label}
      </p>
      <p className="text-[10px] text-theme-tertiary mt-0.5">
        {config.description}
      </p>
    </div>
  );
}
