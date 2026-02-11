'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useChartTheme } from '@/hooks/dashboard/useChartTheme';
import { ChartWidgetCard, ChartWidgetSkeleton } from './ChartWidgetCard';

interface TemperatureLogsChartProps {
  siteId: string;
  companyId: string;
}

interface TempReading {
  time: string;
  label: string;
  [key: string]: number | string; // dynamic keys per equipment
}

// Color palette for different equipment lines - vibrant colors that work in both themes
const LINE_COLORS = [
  '#E879F9', // brighter blush
  '#10B981', // vibrant emerald
  '#3B82F6', // vibrant blue
  '#F59E0B', // vibrant amber
  '#8B5CF6', // vibrant violet
  '#F97316', // vibrant orange
  '#14B8A6', // vibrant teal
  '#EF4444', // vibrant red
];

export default function TemperatureLogsChart({ siteId, companyId }: TemperatureLogsChartProps) {
  const [chartData, setChartData] = useState<TempReading[]>([]);
  const [equipmentNames, setEquipmentNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const ct = useChartTheme();

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // Last 7 days

        let query = supabase
          .from('temperature_logs')
          .select(`
            id,
            reading,
            recorded_at,
            status,
            position:site_equipment_positions!position_id (
              id,
              nickname
            ),
            asset:assets!asset_id (
              id,
              name
            )
          `)
          .eq('company_id', companyId)
          .gte('recorded_at', startDate.toISOString())
          .lte('recorded_at', endDate.toISOString())
          .order('recorded_at', { ascending: true })
          .limit(2000);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data: logs, error } = await query;

        if (error) {
          // Table may not exist yet — degrade gracefully
          setLoading(false);
          return;
        }

        if (!logs || logs.length === 0) {
          setLoading(false);
          return;
        }

        // Resolve display names and group by time buckets
        const equipSet = new Set<string>();
        const readings: { time: Date; name: string; reading: number }[] = [];

        logs.forEach((log: any) => {
          const name = (log.position as any)?.nickname ?? (log.asset as any)?.name ?? 'Unknown';
          equipSet.add(name);
          readings.push({
            time: new Date(log.recorded_at),
            name,
            reading: log.reading,
          });
        });

        const names = Array.from(equipSet).slice(0, 8); // Max 8 lines
        setEquipmentNames(names);

        // Bucket into 6-hour intervals for 7-day view
        const buckets: Record<string, Record<string, number[]>> = {};
        readings.forEach(r => {
          const bucket = new Date(r.time);
          // Round down to nearest 6-hour interval
          const hours = bucket.getHours();
          bucket.setHours(Math.floor(hours / 6) * 6, 0, 0, 0);
          const key = bucket.toISOString();
          if (!buckets[key]) buckets[key] = {};
          if (!buckets[key][r.name]) buckets[key][r.name] = [];
          buckets[key][r.name].push(r.reading);
        });

        // Build chart data with averages per bucket
        const data: TempReading[] = Object.entries(buckets)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([timeKey, equipReadings]) => {
            const d = new Date(timeKey);
            const now = new Date();
            const isToday = d.toDateString() === now.toDateString();

            const entry: TempReading = {
              time: timeKey,
              // Show "Today 12:00" or "Mon 12:00" format
              label: isToday
                ? `Today ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                : d.toLocaleDateString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
            };
            names.forEach(name => {
              const vals = equipReadings[name];
              if (vals && vals.length > 0) {
                entry[name] = Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
              }
            });
            return entry;
          });

        setChartData(data);
      } catch (err) {
        console.error('Error fetching temperature logs:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [companyId, siteId]);

  // Calculate Y axis domain
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [-25, 25];
    let min = Infinity;
    let max = -Infinity;
    chartData.forEach(d => {
      equipmentNames.forEach(name => {
        const v = d[name];
        if (typeof v === 'number') {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      });
    });
    if (!isFinite(min)) return [-25, 25];
    return [Math.floor(min - 3), Math.ceil(max + 3)];
  }, [chartData, equipmentNames]);

  if (loading) return <ChartWidgetSkeleton />;

  if (chartData.length === 0) {
    return (
      <ChartWidgetCard title="Temperature Logs" module="checkly" viewAllHref="/dashboard/todays_tasks">
        <div className="flex items-center justify-center h-full text-[rgb(var(--text-disabled))] text-xs">
          No temperature data in the last 7 days
        </div>
      </ChartWidgetCard>
    );
  }

  return (
    <ChartWidgetCard title="Temperature Logs (7 days)" module="checkly" viewAllHref="/dashboard/todays_tasks">
      <div className="flex flex-col h-full">
        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
          {equipmentNames.map((name, i) => (
            <div key={name} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }}
              />
              <span className="text-[10px] text-[rgb(var(--text-disabled))] truncate max-w-[100px]">{name}</span>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height={190} minWidth={0} minHeight={0}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              {/* Safe zone bands */}
              <ReferenceArea y1={1} y2={8} fill="#34D399" fillOpacity={0.04} />
              <ReferenceArea y1={-18} y2={-22} fill="#60A5FA" fillOpacity={0.04} />
              <XAxis
                dataKey="label"
                stroke={ct.axis}
                tick={{ fontSize: 10, fill: ct.tick }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={yDomain}
                stroke={ct.axis}
                tick={{ fontSize: 10, fill: ct.tick }}
                tickLine={false}
                tickFormatter={(v) => `${v}°`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: ct.tooltipBg,
                  border: `1px solid ${ct.tooltipBorder}`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: ct.tooltipText,
                }}
                formatter={(value: number) => [`${value}°C`, '']}
                labelStyle={{ color: ct.labelText }}
              />
              {equipmentNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: LINE_COLORS[i % LINE_COLORS.length] }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartWidgetCard>
  );
}
