'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { calculatePeriodForDate, getRecentPeriods } from '../lib/period-calculator';

interface PayrunSchedule {
  schedule_type: 'weekly' | 'fortnightly' | 'monthly' | 'four_weekly' | 'last_friday' | 'last_day';
  period_start_day: number | null;
  period_start_date: number | null;
  pay_date_type: 'days_after' | 'same_day_next_week' | 'last_friday' | 'last_day';
  days_after_period_end: number;
}

interface Props {
  periodStart: Date;
  periodEnd: Date;
  payDate: Date;
  schedule: PayrunSchedule | null;
  onPeriodChange: (start: Date, end: Date, payDate: Date) => void;
}

export default function PayPeriodSelector({
  periodStart,
  periodEnd,
  payDate,
  schedule,
  onPeriodChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(
    periodStart.toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(
    periodEnd.toISOString().split('T')[0]
  );
  const [useCustom, setUseCustom] = useState(false);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handlePeriodSelect = (start: Date, end: Date, payDate: Date) => {
    onPeriodChange(start, end, payDate);
    setIsOpen(false);
    setUseCustom(false);
  };

  const handleCustomDates = () => {
    // Validate dates
    if (!customStartDate || !customEndDate) {
      alert('Please select both start and end dates');
      return;
    }
    
    const start = new Date(customStartDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEndDate);
    end.setHours(23, 59, 59, 999);
    
    // Validate date range
    if (start > end) {
      alert('Start date must be before end date');
      return;
    }
    
    // Calculate pay date (default: 5 days after period end)
    const calculatedPayDate = new Date(end);
    calculatedPayDate.setDate(calculatedPayDate.getDate() + (schedule?.days_after_period_end || 5));
    
    console.log('Custom dates selected:', {
      start: start.toISOString(),
      end: end.toISOString(),
      payDate: calculatedPayDate.toISOString(),
    });
    
    onPeriodChange(start, end, calculatedPayDate);
    setIsOpen(false);
    setUseCustom(false);
  };

  const recentPeriods = schedule ? getRecentPeriods(schedule, 12) : [];

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-transparent border border-white/[0.06] text-white hover:bg-white/[0.05]"
      >
        <Calendar className="w-4 h-4 mr-2" />
        <span className="text-sm">
          {formatDate(periodStart)} - {formatDate(periodEnd)}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 ml-2" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-2" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-[#0B0D13] border border-white/[0.06] rounded-lg shadow-xl z-50 p-4">
          <div className="space-y-4">
            {/* Recent Periods */}
            {schedule && recentPeriods.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-white mb-2">Recent Periods</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {recentPeriods.map((period, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePeriodSelect(period.start, period.end, period.payDate)}
                      className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/[0.05] rounded transition-colors"
                    >
                      {period.label}
                      <span className="text-xs text-white/40 ml-2">
                        (Pay: {formatDate(period.payDate)})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Date Range */}
            <div className="border-t border-white/[0.06] pt-4">
              <h3 className="text-sm font-medium text-white mb-3">Custom Date Range</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1">Period Start</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1">Period End</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded px-3 py-2 text-sm text-white"
                  />
                </div>
                <Button
                  onClick={handleCustomDates}
                  className="w-full bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]"
                >
                  Apply Custom Dates
                </Button>
              </div>
            </div>

            {/* Current Period Info */}
            <div className="border-t border-white/[0.06] pt-4">
              <div className="text-xs text-white/60 space-y-1">
                <div>Pay Date: {formatDate(payDate)}</div>
                {schedule && (
                  <div>Schedule: {schedule.schedule_type}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
