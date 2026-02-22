'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar } from '@/components/ui/icons';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { getPPMStatus } from '@/utils/ppmHelpers';
import { usePPMCalendarData } from '@/hooks/usePPMCalendarData';
import { AddPPMModal } from './AddPPMModal';
import { PPMAsset } from '@/types/ppm';
import { nullifyUndefined } from '@/lib/utils';

interface PPMCalendarProps {
  onAssetClick: (asset: PPMAsset) => void;
  onRefresh?: () => void;
}

export function PPMCalendar({ onAssetClick, onRefresh }: PPMCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Initialize currentDate on client mount to avoid hydration mismatch
  React.useEffect(() => {
    if (currentDate === null) {
      setCurrentDate(new Date());
    }
  }, [currentDate]);

  // Helper to get current date with fallback (prevents null errors during initial render)
  const getCurrentDate = () => currentDate || new Date();

  // Use optimized calendar data hook
  const { assets, loading, error, refreshMonth } = usePPMCalendarData(getCurrentDate());

  // Debug: Log assets received
  React.useEffect(() => {
    if (currentDate) {
      console.log(`[PPM Calendar] Received ${assets.length} assets for ${format(currentDate, 'yyyy-MM')}`, assets.slice(0, 3))
    }
  }, [assets, currentDate])

  // Get the first day of the current month
  const date = getCurrentDate();
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  // Get the first day of the week for the calendar grid
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  
  // Get the last day of the week for the calendar grid
  const endDate = new Date(lastDayOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  // Generate calendar days
  const calendarDays = [];
  const currentDateIterator = new Date(startDate);
  
  while (currentDateIterator <= endDate) {
    calendarDays.push(new Date(currentDateIterator));
    currentDateIterator.setDate(currentDateIterator.getDate() + 1);
  }

  // Group assets by date
  const assetsByDate = assets.reduce((acc, asset) => {
    if (asset.next_service_date) {
      // Ensure date is in YYYY-MM-DD format for matching
      let dateKey = asset.next_service_date
      if (typeof dateKey === 'string' && dateKey.includes('T')) {
        dateKey = dateKey.split('T')[0]
      }
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(asset);
    }
    return acc;
  }, {} as Record<string, PPMAsset[]>);

  // Debug: Log grouped assets
  React.useEffect(() => {
    const dateKeys = Object.keys(assetsByDate)
    console.log(`[PPM Calendar] Grouped assets into ${dateKeys.length} dates:`, dateKeys.slice(0, 5))
  }, [assetsByDate])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isCurrentMonth = (date: Date) => {
    const dateToCompare = getCurrentDate();
    return date.getMonth() === dateToCompare.getMonth() && date.getFullYear() === dateToCompare.getFullYear();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleDayClick = (date: Date, dayAssets: PPMAsset[]) => {
    const dateKey = formatDateKey(date);
    
    if (dayAssets.length === 0) {
      // Empty day - open add modal
      setSelectedDate(dateKey);
      setShowAddModal(true);
    } else if (dayAssets.length === 1) {
      // Single asset - open drawer directly
      onAssetClick(dayAssets[0]);
    } else {
      // Multiple assets - could show a selection popup or open first one
      onAssetClick(dayAssets[0]);
    }
  };

  const handlePPMAdded = () => {
    // Refresh the current month data
    refreshMonth();
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-theme-primary flex items-center gap-2">
          <Calendar className="h-5 w-5 text-module-fg" />
          {currentDate ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ""}
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-theme-tertiary hover:text-theme-primary hover:bg-theme-hover rounded-lg transition-colors"
            disabled={loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm text-theme-tertiary hover:text-theme-primary hover:bg-theme-hover rounded-lg transition-colors"
            disabled={loading}
          >
            Today
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-theme-tertiary hover:text-theme-primary hover:bg-theme-hover rounded-lg transition-colors"
            disabled={loading}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 dark:border-cyan-400"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg p-4 mb-4">
          <p className="text-red-600 dark:text-red-400 text-sm">Error loading calendar data: {error}</p>
        </div>
      )}

      {/* Calendar Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-theme-tertiary border-b border-theme">
              {day}
            </div>
          ))}

        {/* Calendar Days */}
        {calendarDays.map((date, index) => {
          const dateKey = formatDateKey(date);
          const dayAssets = assetsByDate[dateKey] || [];
          const isCurrentMonthDay = isCurrentMonth(date);
          const isTodayDate = isToday(date);
          const isHovered = hoveredDay === dateKey;

          return (
            <div
              key={index}
              className={`min-h-[100px] p-2 border border-theme cursor-pointer transition-all duration-200 ${
                isCurrentMonthDay ? 'bg-white dark:bg-gray-800' : 'bg-theme-surface'
              } ${isTodayDate ? 'ring-2 ring-cyan-500' : ''} ${
                isHovered ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600' : ''
              } ${dayAssets.length === 0 ? 'hover:bg-theme-hover' : ''}`}
              onClick={() => handleDayClick(date, dayAssets)}
              onMouseEnter={() => setHoveredDay(dateKey)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              {/* Date Number */}
              <div className={`text-sm font-medium mb-2 flex items-center justify-between ${
                isCurrentMonthDay ? 'text-theme-primary' : 'text-theme-tertiary'
              } ${isTodayDate ? 'text-module-fg' : ''}`}>
                <span>{date.getDate()}</span>
                {dayAssets.length === 0 && isHovered && isCurrentMonthDay && (
                  <Plus className="h-3 w-3 text-module-fg" />
                )}
              </div>

              {/* PPM Events */}
              <div className="space-y-1">
                {dayAssets.slice(0, 3).map(asset => {
                  const cleanAsset = nullifyUndefined(asset);
                  const { status, color } = getPPMStatus(cleanAsset.next_service_date, cleanAsset.ppm_status);
                  const isOverdue = status === 'overdue';

                  return (
                    <div
                      key={cleanAsset.id}
                      className={`text-xs p-1 rounded hover:opacity-80 transition-all duration-200 ${
                        status === 'completed' ? 'opacity-60' : ''
                      } ${isOverdue ? 'animate-pulse' : ''}`}
                      style={{
                        backgroundColor: color + '20',
                        borderLeft: `3px solid ${color}`,
                        color: color
                      }}
                      title={`${cleanAsset.name} - ${cleanAsset.site_name} (${status})`}
                    >
                      <div className="truncate font-medium">{cleanAsset.name}</div>
                      <div className="truncate text-theme-tertiary">{cleanAsset.site_name}</div>
                    </div>
                  );
                })}

                {/* Show more indicator */}
                {dayAssets.length > 3 && (
                  <div className="text-xs text-theme-tertiary text-center py-1 hover:text-theme-primary transition-colors">
                    +{dayAssets.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-theme">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22C55E' }}></div>
          <span className="text-theme-secondary">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }}></div>
          <span className="text-theme-secondary">Overdue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
          <span className="text-theme-secondary">Due Soon</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#6B7280' }}></div>
          <span className="text-theme-secondary">Upcoming</span>
        </div>
      </div>

      {/* Add PPM Modal */}
      <AddPPMModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        selectedDate={selectedDate}
        onPPMAdded={handlePPMAdded}
      />
    </div>
  );
}