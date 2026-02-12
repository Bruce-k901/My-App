'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui/Card';
import { Calendar, Clock, Plus, X, Check, XCircle, Loader2, ChevronLeft, ChevronRight, Building2 } from '@/components/ui/icons';
import { toast } from 'sonner';
import TimePicker from '@/components/ui/TimePicker';
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns';
// import { AvailabilityStats } from '@/components/availability/AvailabilityStats'; // TODO: Create component

// ============================================
// TYPES
// ============================================

interface AvailabilityPattern {
  id: string;
  day_of_week: number;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  is_active: boolean;
}

interface AvailabilityOverride {
  id: string;
  date: string;
  override_type: 'unavailable' | 'available' | 'time_off_request' | 'leave';
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  request_status: 'pending' | 'approved' | 'rejected' | 'cancelled' | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function MyAvailabilityPage() {
  const { profile, company } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'patterns' | 'calendar'>('patterns');
  
  // Patterns state
  const [patterns, setPatterns] = useState<AvailabilityPattern[]>([]);
  
  // Calendar state
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday start
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // ============================================
  // DATA LOADING
  // ============================================

  const loadPatterns = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('staff_availability_patterns')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('is_active', true)
        .order('day_of_week');

      if (error) throw error;
      setPatterns(data || []);
    } catch (error: any) {
      console.error('Error loading patterns:', error);
      toast.error('Failed to load availability patterns');
    }
  }, [profile?.id]);

  const loadOverrides = useCallback(async () => {
    if (!profile?.id) return;

    try {
      // Load overrides for current month
      const startDate = format(currentWeek, 'yyyy-MM-dd');
      const endDate = format(addWeeks(currentWeek, 4), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('staff_availability_overrides')
        .select('*')
        .eq('profile_id', profile.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');

      if (error) throw error;
      setOverrides(data || []);
    } catch (error: any) {
      console.error('Error loading overrides:', error);
      toast.error('Failed to load availability overrides');
    }
  }, [profile?.id, currentWeek]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadPatterns(), loadOverrides()]);
    setLoading(false);
  }, [loadPatterns, loadOverrides]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // PATTERN MANAGEMENT
  // ============================================

  const savePattern = async (dayOfWeek: number, periods: { am: boolean; pm: boolean; allDay: boolean }, notes: string) => {
    if (!profile?.id || !company?.id) {
      console.error('Missing user or company:', { userId: profile?.id, companyId: company?.id });
      return;
    }

    const isAvailable = periods.am || periods.pm || periods.allDay;

    console.log('💾 Saving availability pattern:', {
      dayOfWeek,
      periods,
      isAvailable,
      notes,
      userId: profile.id,
      companyId: company.id
    });

    try {
      // Check if pattern exists
      const existingPattern = patterns.find(p => p.day_of_week === dayOfWeek);

      // Determine time range based on selections
      let startTime: string | null = null;
      let endTime: string | null = null;

      if (isAvailable) {
        if (periods.allDay) {
          // All day - store as null/null to indicate available all day
          startTime = null;
          endTime = null;
        } else if (periods.am && periods.pm) {
          // Both AM and PM = all day
          startTime = null;
          endTime = null;
        } else if (periods.am) {
          // AM only: 9am - 12pm
          startTime = '09:00';
          endTime = '12:00';
        } else if (periods.pm) {
          // PM only: 12pm - 5pm
          startTime = '12:00';
          endTime = '17:00';
        }
      }

      if (existingPattern) {
        console.log('🔄 Updating existing pattern:', existingPattern.id);
        const updateData: any = {
          is_available: isAvailable,
          start_time: startTime,
          end_time: endTime,
          notes: notes || null,
        };
        
        const { data, error } = await supabase
          .from('staff_availability_patterns')
          .update(updateData)
          .eq('id', existingPattern.id)
          .select();

        if (error) {
          console.error('❌ UPDATE error:', error);
          throw error;
        }
        console.log('✅ UPDATE success:', data);
        toast.success('Availability updated');
      } else {
        console.log('➕ Creating new pattern');
        const insertData: any = {
          company_id: company.id,
          profile_id: profile.id,
          day_of_week: dayOfWeek,
          is_available: isAvailable,
          start_time: startTime,
          end_time: endTime,
          notes: notes || null,
        };
        
        const { data, error } = await supabase
          .from('staff_availability_patterns')
          .insert(insertData)
          .select();

        if (error) {
          console.error('❌ INSERT error:', error);
          throw error;
        }
        console.log('✅ INSERT success:', data);
        toast.success('Availability saved');
      }

      await loadPatterns();
    } catch (error: any) {
      console.error('❌ Error saving pattern:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error
      });
      toast.error(`Failed to save availability: ${error?.message || error?.code || 'Unknown error'}`);
    }
  };


  // ============================================
  // TIME OFF REQUEST
  // ============================================

  const requestTimeOff = async (date: Date, type: 'time_off_request' | 'leave', reason: string, startTime?: string, endTime?: string) => {
    if (!profile?.id || !company?.id) return;

    try {
      const { error } = await supabase
        .from('staff_availability_overrides')
        .insert({
          company_id: company.id,
          profile_id: profile.id,
          date: format(date, 'yyyy-MM-dd'),
          override_type: type,
          start_time: startTime || null,
          end_time: endTime || null,
          reason: reason,
          request_status: 'pending',
        });

      if (error) throw error;
      toast.success('Time off request submitted');
      await loadOverrides();
      setShowRequestModal(false);
      setSelectedDate(null);
    } catch (error: any) {
      console.error('Error requesting time off:', error);
      toast.error('Failed to submit request');
    }
  };

  // ============================================
  // RENDER: PATTERNS VIEW
  // ============================================

  const renderPatternsView = () => (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-theme-primary">Weekly Availability Pattern</h2>
        <p className="text-sm text-theme-tertiary mt-1">
          Set your regular weekly availability. This will apply to all weeks unless overridden.
        </p>
      </div>

      <div className="space-y-3">
        {DAYS_OF_WEEK.map((day) => {
          const pattern = patterns.find(p => p.day_of_week === day.value);
          return (
            <PatternCard
              key={day.value}
              day={day}
              pattern={pattern}
              onSave={savePattern}
            />
          );
        })}
      </div>
    </div>
  );

  // ============================================
  // RENDER: CALENDAR VIEW
  // ============================================

  const renderCalendarView = () => {
    // Get the start of the week (Monday)
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="space-y-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-theme-primary">Availability Calendar</h2>
            <p className="text-sm text-theme-tertiary mt-1">
              View and manage specific date overrides and time-off requests.
            </p>
          </div>
          <Button
            onClick={() => setShowRequestModal(true)}
            className="bg-transparent text-module-fg border border-module-fg hover:shadow-[0_0_12px_rgba(var(--module-fg-rgb),0.7)] transition-all duration-200 ease-in-out"
          >
            <Plus className="w-4 h-4 mr-2" />
            Request Time Off
          </Button>
        </div>

        {/* Week selector */}
        <div className="flex items-center justify-between bg-theme-surface border border-theme rounded-lg p-4 hover:border-theme-hover transition-colors">
          <Button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            variant="ghost"
            size="sm"
            className="text-theme-secondary hover:text-theme-primary hover:bg-theme-hover transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-theme-primary font-medium">
            Week of {format(weekStart, 'MMM dd, yyyy')}
          </div>
          <Button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            variant="ghost"
            size="sm"
            className="text-theme-secondary hover:text-theme-primary hover:bg-theme-hover transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayOverride = overrides.find(o => isSameDay(parseISO(o.date), day));
            const dayOfWeek = day.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            const dayPattern = patterns.find(p => p.day_of_week === dayOfWeek);
            
            return (
              <DayCard
                key={day.toISOString()}
                date={day}
                override={dayOverride}
                pattern={dayPattern}
                onRequestTimeOff={() => {
                  setSelectedDate(day);
                  setShowRequestModal(true);
                }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // Check if user is a manager
  const isManager = profile?.app_role && 
    ['Admin', 'Owner', 'Manager', 'General Manager', 'Super Admin'].includes(profile.app_role);

  // ============================================
  // MAIN RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-module-fg animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">My Availability</h1>
          <p className="text-theme-tertiary mt-1">
            Manage your work availability and request time off
          </p>
        </div>
        
        {/* Manager Link */}
        {isManager && (
          <a href="/dashboard/people/my-availability/requests">
            <Button
              className="bg-transparent text-module-fg border border-module-fg hover:shadow-[0_0_12px_rgba(var(--module-fg-rgb),0.7)] transition-all duration-200 ease-in-out"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Review Requests
            </Button>
          </a>
        )}
      </div>

      {/* Stats */}
      {/* TODO: Add AvailabilityStats component */}
      {/* {profile?.id && company?.id && (
        <AvailabilityStats 
          profileId={profile.id} 
          companyId={company.id} 
          isManager={isManager}
        />
      )} */}
        
      {/* View Toggle */}
      <div className="flex gap-2 bg-theme-button border border-theme rounded-lg p-1">
        <button
          onClick={() => setView('patterns')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            view === 'patterns'
              ? 'bg-module-fg text-white'
              : 'text-theme-secondary hover:text-theme-primary'
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-2" />
          Weekly Pattern
        </button>
        <button
          onClick={() => setView('calendar')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            view === 'calendar'
              ? 'bg-module-fg text-white'
              : 'text-theme-secondary hover:text-theme-primary'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Calendar View
        </button>
      </div>

      {/* Content */}
      {view === 'patterns' ? renderPatternsView() : renderCalendarView()}

      {/* Time Off Request Modal */}
      {showRequestModal && (
        <TimeOffRequestModal
          selectedDate={selectedDate}
          onClose={() => {
            setShowRequestModal(false);
            setSelectedDate(null);
          }}
          onSubmit={requestTimeOff}
        />
      )}
    </div>
  );
}

// ============================================
// PATTERN CARD COMPONENT
// ============================================

interface PatternCardProps {
  day: { value: number; label: string };
  pattern?: AvailabilityPattern;
  onSave: (dayOfWeek: number, periods: { am: boolean; pm: boolean; allDay: boolean }, notes: string) => void;
}

function PatternCard({ day, pattern, onSave }: PatternCardProps) {
  // Parse existing pattern to determine periods
  const getPeriodsFromPattern = (pattern?: AvailabilityPattern): { am: boolean; pm: boolean; allDay: boolean } => {
    // If no pattern exists, default to All Day for new patterns
    if (!pattern) {
      return { am: true, pm: true, allDay: true };
    }
    
    // If pattern exists but is_available is false, return all unchecked
    if (!pattern.is_available) {
      return { am: false, pm: false, allDay: false };
    }

    // If no times set, it's all day
    if (!pattern.start_time || !pattern.end_time) {
      return { am: true, pm: true, allDay: true };
    }

    const startHour = parseInt(pattern.start_time.split(':')[0]);
    const endHour = parseInt(pattern.end_time.split(':')[0]);
    
    // Determine periods based on time range
    const hasAM = startHour < 12;
    const hasPM = endHour >= 12;
    
    // If covers most of the day, treat as all day
    if (hasAM && hasPM && (endHour - startHour) >= 8) {
      return { am: true, pm: true, allDay: true };
    }
    
    return {
      am: hasAM && !hasPM,
      pm: hasPM && !hasAM,
      allDay: false
    };
  };

  const [periods, setPeriods] = useState(getPeriodsFromPattern(pattern));
  const [notes, setNotes] = useState(pattern?.notes || '');
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state when pattern changes (e.g., after save)
  useEffect(() => {
    setPeriods(getPeriodsFromPattern(pattern));
    setNotes(pattern?.notes || '');
  }, [pattern]);

  // Auto-save when periods change
  const handlePeriodChange = (period: 'am' | 'pm' | 'allDay') => {
    let newPeriods: { am: boolean; pm: boolean; allDay: boolean };
    
    if (period === 'allDay') {
      // Toggle all day - if currently all day, unselect everything (not available)
      if (periods.allDay) {
        newPeriods = { am: false, pm: false, allDay: false };
      } else {
        newPeriods = { am: true, pm: true, allDay: true };
      }
    } else {
      // User is toggling AM or PM
      // If "All Day" is currently selected, switch to individual period selection
      if (periods.allDay) {
        // If clicking AM while in All Day mode, switch to AM only
        if (period === 'am') {
          newPeriods = { am: true, pm: false, allDay: false };
        } else {
          // If clicking PM while in All Day mode, switch to PM only
          newPeriods = { am: false, pm: true, allDay: false };
        }
      } else {
        // Normal toggle - flip the selected period
        newPeriods = { ...periods, [period]: !periods[period], allDay: false };
        // If both AM and PM are selected, treat as all day
        if (newPeriods.am && newPeriods.pm) {
          newPeriods.allDay = true;
        }
      }
    }
    
    setPeriods(newPeriods);
    // Auto-save immediately
    onSave(day.value, newPeriods, notes);
  };

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    // Clear existing timeout
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }
    // Auto-save when notes change (with a small delay to avoid too many saves)
    notesTimeoutRef.current = setTimeout(() => {
      onSave(day.value, periods, newNotes);
    }, 500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Card className="p-4 bg-theme-surface border border-theme hover:border-theme-hover transition-colors shadow-sm dark:shadow-none">
      <div className="space-y-3">
        <h3 className="font-semibold text-theme-primary">{day.label}</h3>

        {/* Period checkboxes - always visible */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer hover:text-theme-primary transition-colors">
            <input
              type="checkbox"
              checked={periods.allDay}
              onChange={() => handlePeriodChange('allDay')}
              className="w-4 h-4 rounded border-theme bg-theme-surface text-module-fg focus:ring-module-fg focus:ring-2"
            />
            <span className="text-sm text-theme-secondary">All Day</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-theme-primary transition-colors">
            <input
              type="checkbox"
              checked={periods.am}
              onChange={() => handlePeriodChange('am')}
              className="w-4 h-4 rounded border-theme bg-theme-surface text-module-fg focus:ring-module-fg focus:ring-2"
            />
            <span className="text-sm text-theme-secondary">AM (9am - 12pm)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-theme-primary transition-colors">
            <input
              type="checkbox"
              checked={periods.pm}
              onChange={() => handlePeriodChange('pm')}
              className="w-4 h-4 rounded border-theme bg-theme-surface text-module-fg focus:ring-module-fg focus:ring-2"
            />
            <span className="text-sm text-theme-secondary">PM (12pm - 5pm)</span>
          </label>
          {!periods.allDay && !periods.am && !periods.pm && (
            <div className="text-xs text-red-500 dark:text-red-400 italic">Not available this day</div>
          )}
        </div>

        {/* Notes - always visible */}
        <div>
          <label className="text-xs text-theme-tertiary block mb-1">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="e.g., School pickup at 3pm"
            className="w-full bg-theme-surface border border-theme rounded-md px-3 py-2 text-theme-primary text-sm focus:outline-none focus:border-module-fg focus:ring-1 focus:ring-module-fg transition-colors"
          />
        </div>
      </div>
    </Card>
  );
}

// ============================================
// DAY CARD COMPONENT
// ============================================

interface DayCardProps {
  date: Date;
  override?: AvailabilityOverride;
  pattern?: AvailabilityPattern;
  onRequestTimeOff: () => void;
}

function DayCard({ date, override, pattern, onRequestTimeOff }: DayCardProps) {
  const isToday = isSameDay(date, new Date());
  const isPast = date < new Date() && !isToday;

  // Helper to convert pattern to display text
  const getPatternDisplayText = (pattern: AvailabilityPattern): string => {
    if (!pattern.is_available) {
      return 'Not available';
    }

    // If no times set, it's all day
    if (!pattern.start_time || !pattern.end_time) {
      return 'All Day';
    }

    const startHour = parseInt(pattern.start_time.split(':')[0]);
    const endHour = parseInt(pattern.end_time.split(':')[0]);
    
    // Determine periods based on time range
    const hasAM = startHour < 12;
    const hasPM = endHour >= 12;
    
    if (hasAM && !hasPM) {
      return 'AM';
    } else if (hasPM && !hasAM) {
      return 'PM';
    } else {
      return 'All Day';
    }
  };

  let status: 'available' | 'unavailable' | 'pending' | 'approved' = 'available';
  let displayText = '';
  let statusColor = 'text-theme-tertiary';

  if (override) {
    if (override.override_type === 'time_off_request') {
      status = override.request_status === 'approved' ? 'approved' : 'pending';
      displayText = override.request_status === 'approved' ? 'Time Off (Approved)' : 'Pending Request';
      statusColor = override.request_status === 'approved' ? 'text-red-500 dark:text-red-400' : 'text-amber-600 dark:text-yellow-400';
    } else if (override.override_type === 'unavailable') {
      status = 'unavailable';
      displayText = 'Unavailable';
      statusColor = 'text-red-500 dark:text-red-400';
    }
  } else if (pattern) {
    displayText = getPatternDisplayText(pattern);
    if (pattern.is_available) {
      statusColor = 'text-green-600 dark:text-green-400';
    } else {
      status = 'unavailable';
      statusColor = 'text-theme-tertiary';
    }
  } else {
    // No pattern exists - default to "All Day" (matching the Weekly Pattern view default)
    displayText = 'All Day';
    statusColor = 'text-green-600 dark:text-green-400';
  }

  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        isToday
          ? 'border-module-fg bg-module-fg/10'
          : 'border-theme bg-theme-surface hover:border-theme-hover shadow-sm dark:shadow-none'
      } ${isPast ? 'opacity-50' : ''}`}
    >
      <div className="text-center mb-2">
        <div className="text-xs text-theme-secondary uppercase font-medium">{format(date, 'EEE')}</div>
        <div className={`text-lg font-bold ${isToday ? 'text-module-fg' : 'text-theme-primary'}`}>
          {format(date, 'd')}
        </div>
      </div>

      <div className={`text-xs font-medium ${statusColor} text-center min-h-[32px] flex items-center justify-center`}>
        {displayText || 'Available'}
      </div>

      {!isPast && !override && (
        <Button
          onClick={onRequestTimeOff}
          size="sm"
          variant="ghost"
          className="w-full mt-2 text-xs text-theme-secondary hover:text-module-fg border border-theme hover:border-module-fg/30"
        >
          Request Time Off
        </Button>
      )}
    </div>
  );
}

// ============================================
// TIME OFF REQUEST MODAL
// ============================================

interface TimeOffRequestModalProps {
  selectedDate: Date | null;
  onClose: () => void;
  onSubmit: (date: Date, type: 'time_off_request' | 'leave', reason: string, startTime?: string, endTime?: string) => void;
}

function TimeOffRequestModal({ selectedDate, onClose, onSubmit }: TimeOffRequestModalProps) {
  const [date, setDate] = useState(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState<'time_off_request' | 'leave'>('time_off_request');
  const [isPartialDay, setIsPartialDay] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit(
        parseISO(date),
        type,
        reason,
        isPartialDay ? startTime : undefined,
        isPartialDay ? endTime : undefined
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-theme-surface-elevated border border-theme rounded-lg max-w-md w-full p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-theme-primary">Request Time Off</h2>
          <button
            onClick={onClose}
            className="text-theme-tertiary hover:text-theme-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div>
            <label className="text-sm text-theme-secondary block mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-theme-surface border border-theme rounded-md px-3 py-2 text-theme-primary focus:outline-none focus:border-module-fg focus:ring-1 focus:ring-module-fg transition-colors"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-sm text-theme-secondary block mb-2">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'time_off_request' | 'leave')}
              className="w-full bg-theme-surface border border-theme rounded-md px-3 py-2 text-theme-primary focus:outline-none focus:border-module-fg focus:ring-1 focus:ring-module-fg transition-colors"
            >
              <option value="time_off_request">Time Off Request</option>
              <option value="leave">Leave (Holiday/Sick)</option>
            </select>
          </div>

          {/* Partial Day */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="partial-day"
              checked={isPartialDay}
              onChange={(e) => setIsPartialDay(e.target.checked)}
              className="w-4 h-4 rounded border-theme bg-theme-surface text-module-fg focus:ring-module-fg"
            />
            <label htmlFor="partial-day" className="text-sm text-theme-secondary">
              Partial day (specify times)
            </label>
          </div>

          {/* Time Range */}
          {isPartialDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-theme-tertiary block mb-1">Start Time</label>
                <TimePicker
                  value={startTime}
                  onChange={(value) => setStartTime(value)}
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-theme-tertiary block mb-1">End Time</label>
                <TimePicker
                  value={endTime}
                  onChange={(value) => setEndTime(value)}
                  required
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="text-sm text-theme-secondary block mb-2">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="Please provide a reason for your request..."
              className="w-full bg-theme-surface border border-theme rounded-md px-3 py-2 text-theme-primary resize-none focus:outline-none focus:border-module-fg focus:ring-1 focus:ring-module-fg transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              className="flex-1 text-theme-tertiary"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-transparent text-module-fg border border-module-fg hover:shadow-[0_0_12px_rgba(var(--module-fg-rgb),0.7)] transition-all duration-200 ease-in-out"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

