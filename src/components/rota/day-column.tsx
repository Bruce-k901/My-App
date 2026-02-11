'use client';

import { useDroppable } from '@dnd-kit/core';
import { Shift, DayForecast } from './types';
import { ShiftCard } from './shift-card';
import { ForecastInput } from './forecast-input';
import { 
  Plus, 
  TrendingUp, 
  Users, 
  Clock,
  AlertTriangle,
  CheckCircle,
  DollarSign
} from '@/components/ui/icons';
import { useMemo, useState } from 'react';

interface DayColumnProps {
  date: Date;
  shifts: Shift[];
  forecast?: DayForecast['forecast'];
  onAddShift: () => void;
  onRemoveShift: (shiftId: string) => void;
  onUnassignShift: (shiftId: string) => void;
  onEditShift: (shiftId: string) => void;
  onUpdateForecast?: (date: string, forecast: number) => void;
  isToday?: boolean;
}

export function DayColumn({
  date,
  shifts,
  forecast,
  onAddShift,
  onRemoveShift,
  onUnassignShift,
  onEditShift,
  onUpdateForecast,
  isToday = false
}: DayColumnProps) {
  const dateStr = date.toISOString().split('T')[0];
  const [showForecastInput, setShowForecastInput] = useState(false);
  
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateStr}`,
    data: { type: 'day', date: dateStr }
  });

  // Calculate day stats
  const dayStats = useMemo(() => {
    const totalHours = shifts.reduce((sum, s) => sum + s.net_hours, 0);
    const totalCost = shifts.reduce((sum, s) => sum + (s.estimated_cost || 0), 0);
    const assignedShifts = shifts.filter(s => s.profile_id).length;
    const unassignedShifts = shifts.filter(s => !s.profile_id).length;
    
    return { totalHours, totalCost, assignedShifts, unassignedShifts };
  }, [shifts]);

  // Compare to forecast
  const getForecastStatus = () => {
    if (!forecast) return 'none';
    const diff = dayStats.totalHours - forecast.recommended_hours;
    if (diff < -2) return 'under';
    if (diff > 2) return 'over';
    return 'good';
  };

  const forecastStatus = getForecastStatus();
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[date.getDay()];
  const dayNum = date.getDate();

  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col border-r border-gray-200 dark:border-neutral-800 last:border-r-0 transition-colors ${
        isOver ? 'bg-[#D37E91]/10 dark:bg-[#D37E91]/10' : ''
      } ${isToday ? 'bg-[#D37E91]/10/50 dark:bg-[#D37E91]/5' : ''} ${isWeekend ? 'bg-gray-50 dark:bg-neutral-900/50' : ''}`}
    >
      {/* Day Header - Compact */}
      <div className={`p-1.5 border-b border-gray-200 dark:border-neutral-800 ${isToday ? 'bg-[#D37E91]/10 dark:bg-[#D37E91]/10' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className={`text-xs font-medium ${isToday ? 'text-[#D37E91]' : 'text-gray-500 dark:text-white/60'}`}>
              {dayName}
            </span>
            <span className={`text-lg font-bold ${isToday ? 'text-[#D37E91]' : 'text-gray-900 dark:text-white'}`}>
              {dayNum}
            </span>
          </div>
          <button
            onClick={onAddShift}
            className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {/* Day Stats Row */}
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-neutral-500">
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {dayStats.totalHours}h
          </span>
          <span className="flex items-center gap-0.5">
            <Users className="w-3 h-3" />
            {dayStats.assignedShifts}
          </span>
          {dayStats.totalCost > 0 && (
            <span>£{(dayStats.totalCost / 100).toFixed(0)}</span>
          )}
        </div>

        {/* Forecast Comparison */}
        <div className="mt-1.5 relative">
          {forecast ? (
            <div className={`flex items-center gap-1.5 text-xs px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${
              forecastStatus === 'under' ? 'bg-amber-500/10 text-amber-400' :
              forecastStatus === 'over' ? 'bg-blue-500/10 text-blue-400' :
              forecastStatus === 'good' ? 'bg-green-500/10 text-green-400' :
              'bg-neutral-700 text-gray-500 dark:text-white/60'
            }`}
            onClick={() => setShowForecastInput(true)}
            >
              {forecastStatus === 'under' && <AlertTriangle className="w-3 h-3" />}
              {forecastStatus === 'over' && <TrendingUp className="w-3 h-3" />}
              {forecastStatus === 'good' && <CheckCircle className="w-3 h-3" />}
              <span className="truncate">
                {forecastStatus === 'under' && `${(forecast.recommended_hours - dayStats.totalHours).toFixed(1)}h needed`}
                {forecastStatus === 'over' && `${(dayStats.totalHours - forecast.recommended_hours).toFixed(1)}h over`}
                {forecastStatus === 'good' && 'On target'}
              </span>
            </div>
          ) : (
            <button
              onClick={() => setShowForecastInput(true)}
              className="w-full flex items-center gap-1.5 text-xs px-1.5 py-0.5 rounded bg-neutral-700/50 text-gray-500 dark:text-white/60 hover:bg-neutral-700 hover:text-neutral-300 transition-colors"
            >
              <DollarSign className="w-3 h-3" />
              <span>Add forecast</span>
            </button>
          )}
          {showForecastInput && onUpdateForecast && (
            <ForecastInput
              date={dateStr}
              currentForecast={forecast?.predicted_revenue}
              onSave={(d, f) => {
                onUpdateForecast(d, f);
                setShowForecastInput(false);
              }}
              onClose={() => setShowForecastInput(false)}
            />
          )}
        </div>
      </div>

      {/* Shifts Container */}
      <div className="flex-1 p-1 space-y-1 overflow-y-auto min-h-[150px]">
        {shifts
          .sort((a, b) => a.start_time.localeCompare(b.start_time))
          .map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              onRemove={() => onRemoveShift(shift.id)}
              onUnassign={() => onUnassignShift(shift.id)}
              onEdit={() => onEditShift(shift.id)}
              compact={true}
            />
          ))}
        
        {shifts.length === 0 && (
          <button
            onClick={onAddShift}
            className="w-full h-full min-h-[100px] flex items-center justify-center text-gray-400 dark:text-neutral-600 hover:text-gray-500 dark:hover:text-white/60 text-sm border border-dashed border-gray-300 dark:border-neutral-700 rounded hover:border-gray-400 dark:hover:border-neutral-500 transition-colors"
          >
            + Add shift
          </button>
        )}
      </div>
    </div>
  );
}

