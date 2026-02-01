"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Ensure we're on the client side
const isClient = typeof window !== 'undefined';

interface TemperatureReading {
  id: string;
  reading: number;
  recorded_at: string;
  status: 'ok' | 'warning' | 'critical';
}

interface TemperatureSparklineProps {
  assetId: string;
  minTemp: number;
  maxTemp: number;
  readings?: TemperatureReading[];
  width?: number;
  height?: number;
}

interface Point {
  x: number;
  y: number;
  reading: number;
  isInRange: boolean;
  recordedAt: string;
}

const fetchReadings = async (assetId: string): Promise<TemperatureReading[]> => {
  const { data, error } = await supabase
    .from('temperature_logs')
    .select('id, reading, recorded_at, status')
    .eq('asset_id', assetId)
    .order('recorded_at', { ascending: false })
    .limit(6);
  
  if (error) {
    console.error('Failed to fetch temperature readings:', error);
    return [];
  }
  
  // Reverse so oldest is first (left), newest is last (right)
  return (data || []).reverse().map(log => ({
    id: log.id,
    reading: Number(log.reading),
    recorded_at: log.recorded_at || '',
    status: (log.status as 'ok' | 'warning' | 'critical') || 'ok'
  }));
};

const calculateYBounds = (minTemp: number, maxTemp: number) => {
  const buffer = 2; // 2°C buffer above and below range
  return {
    yMin: minTemp - buffer,
    yMax: maxTemp + buffer
  };
};

const calculatePoints = (
  readings: TemperatureReading[],
  chartWidth: number,
  chartHeight: number,
  yMin: number,
  yMax: number,
  minTemp: number,
  maxTemp: number
): Point[] => {
  if (readings.length === 0) return [];
  
  const xStep = readings.length > 1 
    ? chartWidth / (readings.length - 1) 
    : chartWidth / 2;
  
  // Prevent division by zero
  const yRange = yMax - yMin;
  const safeYRange = yRange === 0 ? 1 : yRange;
  
  return readings.map((reading, index) => {
    const x = readings.length > 1 ? index * xStep : chartWidth / 2;
    const y = ((yMax - reading.reading) / safeYRange) * chartHeight;
    const isInRange = reading.reading >= minTemp && reading.reading <= maxTemp;
    
    return {
      x,
      y: Math.max(0, Math.min(chartHeight, y)), // Clamp to chart bounds
      reading: reading.reading,
      isInRange,
      recordedAt: reading.recorded_at
    };
  });
};

const generateLinePath = (points: Point[]): string => {
  if (points.length < 2) return '';
  
  return points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${point.x} ${point.y}`;
    })
    .join(' ');
};

const generateAreaPath = (points: Point[], chartHeight: number): string => {
  if (points.length < 2) return '';
  
  const linePath = generateLinePath(points);
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  
  return `${linePath} L ${lastPoint.x} ${chartHeight} L ${firstPoint.x} ${chartHeight} Z`;
};

const TemperatureSparkline: React.FC<TemperatureSparklineProps> = ({
  assetId,
  minTemp,
  maxTemp,
  readings: propReadings,
  width = 120,
  height = 40
}) => {
  const [readings, setReadings] = useState<TemperatureReading[]>(propReadings || []);
  const [loading, setLoading] = useState(!propReadings);

  // All hooks must be called before any conditional returns
  useEffect(() => {
    // Only fetch on client side
    if (!isClient) return;

    if (!propReadings && assetId) {
      fetchReadings(assetId).then(data => {
        setReadings(data);
        setLoading(false);
      }).catch(error => {
        console.error('Error fetching temperature readings:', error);
        setReadings([]);
        setLoading(false);
      });
    }
  }, [assetId, propReadings]);

  const padding = 4;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);

  // Validate minTemp and maxTemp are valid numbers
  if (typeof minTemp !== 'number' || typeof maxTemp !== 'number' || isNaN(minTemp) || isNaN(maxTemp)) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-400"
        style={{ width, height }}
      >
        Invalid range
      </div>
    );
  }

  // Handle inverted ranges (freezers where min > max, e.g. -18 to -20)
  const isInvertedRange = minTemp > maxTemp;
  const actualMin = isInvertedRange ? maxTemp : minTemp;
  const actualMax = isInvertedRange ? minTemp : maxTemp;

  const { yMin, yMax } = calculateYBounds(actualMin, actualMax);
  const points = calculatePoints(readings, chartWidth, chartHeight, yMin, yMax, actualMin, actualMax);
  const hasOutOfRange = points.some(p => !p.isInRange);
  
  // Edge case: Invalid assetId
  if (!assetId) {
    return (
      <div 
        className="flex items-center justify-center text-xs text-slate-400"
        style={{ width, height }}
      >
        No asset
      </div>
    );
  }
  
  // Edge case: No data
  if (!loading && readings.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-xs text-slate-400"
        style={{ width, height }}
      >
        No data
      </div>
    );
  }
  
  // Edge case: Loading
  if (loading) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ width, height }}
      >
        <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  // Calculate safe zone positions (prevent division by zero)
  const yRange = yMax - yMin;
  const safeYRange = yRange === 0 ? 1 : yRange;
  const safeZoneTop = ((yMax - actualMax) / safeYRange) * chartHeight;
  const safeZoneBottom = ((yMax - actualMin) / safeYRange) * chartHeight;
  const safeZoneHeight = safeZoneBottom - safeZoneTop;
  
  return (
    <div className="relative group" style={{ width, height }}>
      <svg width={width} height={height} className="overflow-visible">
        <g transform={`translate(${padding}, ${padding})`}>
          {/* Safe zone gradient background */}
          <defs>
            <linearGradient id={`safeZone-${assetId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.08" />
              <stop offset="50%" stopColor="#10B981" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.08" />
            </linearGradient>
          </defs>
          
          {/* Safe zone rectangle */}
          <rect
            x="0"
            y={safeZoneTop}
            width={chartWidth}
            height={safeZoneHeight}
            fill={`url(#safeZone-${assetId})`}
            rx="2"
          />
          
          {/* Threshold lines */}
          <line
            x1="0" y1={safeZoneTop}
            x2={chartWidth} y2={safeZoneTop}
            stroke="#10B981"
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.3"
          />
          <line
            x1="0" y1={safeZoneBottom}
            x2={chartWidth} y2={safeZoneBottom}
            stroke="#10B981"
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.3"
          />
          
          {/* Area fill under line (only if 2+ points) */}
          {points.length >= 2 && (
            <path
              d={generateAreaPath(points, chartHeight)}
              fill={hasOutOfRange ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)'}
            />
          )}
          
          {/* Connecting line (only if 2+ points) */}
          {points.length >= 2 && (
            <path
              d={generateLinePath(points)}
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* Data points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill={point.isInRange ? '#10B981' : '#F43F5E'}
              stroke="white"
              strokeWidth="1"
            />
          ))}
        </g>
      </svg>
      
      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        {`Last ${readings.length} reading${readings.length !== 1 ? 's' : ''}: ${points.filter(p => p.isInRange).length} in range`}
      </div>
    </div>
  );
};

export default TemperatureSparkline;
