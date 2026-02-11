'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import Select from '@/components/ui/Select';
import { ArrowLeft, Save, Calendar, Info } from '@/components/ui/icons';
import Link from 'next/link';
import { toast } from 'sonner';

interface PayrunSchedule {
  id?: string;
  schedule_type: 'weekly' | 'fortnightly' | 'monthly' | 'four_weekly' | 'last_friday' | 'last_day';
  period_start_day: number | null;
  period_start_date: number | null;
  pay_date_type: 'days_after' | 'same_day_next_week' | 'last_friday' | 'last_day';
  days_after_period_end: number;
  auto_generate: boolean;
  generate_days_before: number;
  site_ids: string[] | null;
  is_active: boolean;
  tax_year_start_date: string | null; // Date string in YYYY-MM-DD format
}

export default function PayrunSettingsPage() {
  const { profile, companyId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Default tax year start to April 6th (UK tax year)
  const getDefaultTaxYearStart = () => {
    const currentYear = new Date().getFullYear();
    const currentDate = new Date();
    // If we're before April 6th, use previous year's April 6th
    // Otherwise use this year's April 6th
    if (currentDate < new Date(currentYear, 3, 6)) {
      return `${currentYear - 1}-04-06`;
    }
    return `${currentYear}-04-06`;
  };

  const [schedule, setSchedule] = useState<PayrunSchedule>({
    schedule_type: 'weekly',
    period_start_day: 1,
    period_start_date: 1,
    pay_date_type: 'days_after',
    days_after_period_end: 5,
    auto_generate: false,
    generate_days_before: 3,
    site_ids: null,
    is_active: true,
    tax_year_start_date: getDefaultTaxYearStart(),
  });

  useEffect(() => {
    if (companyId) {
      fetchSchedule();
    }
  }, [companyId]);

  const fetchSchedule = async () => {
    if (!companyId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('payrun_schedules')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching schedule:', error);
      toast.error('Failed to load schedule');
    } else if (data) {
      setSchedule(data);
    }
    
    setLoading(false);
  };

  const handleSave = async () => {
    if (!companyId || !profile?.id) {
      toast.error('Missing company or user information');
      return;
    }

    setSaving(true);
    
    try {
      const scheduleData = {
        ...schedule,
        company_id: companyId,
        created_by: profile.id,
        updated_at: new Date().toISOString(),
      };

      if (schedule.id) {
        const { error } = await supabase
          .from('payrun_schedules')
          .update(scheduleData)
          .eq('id', schedule.id);
        
        if (error) throw error;
        toast.success('Payrun schedule updated');
      } else {
        const { error } = await supabase
          .from('payrun_schedules')
          .insert(scheduleData);
        
        if (error) throw error;
        toast.success('Payrun schedule created');
        fetchSchedule();
      }
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const scheduleTypeOptions = [
    { label: 'Weekly', value: 'weekly', description: 'Every week (52 periods/year)' },
    { label: 'Fortnightly', value: 'fortnightly', description: 'Every 2 weeks (26 periods/year)' },
    { label: 'Monthly', value: 'monthly', description: 'Monthly (12 periods/year)' },
    { label: 'Four-Weekly', value: 'four_weekly', description: 'Every 4 weeks (13 periods/year)' },
    { label: 'Last Friday', value: 'last_friday', description: 'Last Friday of each month' },
    { label: 'Last Day', value: 'last_day', description: 'Last day of each month' },
  ];

  const payDateTypeOptions = [
    { label: 'Days After Period End', value: 'days_after' },
    { label: 'Same Day Next Week', value: 'same_day_next_week' },
    { label: 'Last Friday of Month', value: 'last_friday' },
    { label: 'Last Day of Month', value: 'last_day' },
  ];

  const dayOptions = [
    { label: 'Monday', value: '1' },
    { label: 'Tuesday', value: '2' },
    { label: 'Wednesday', value: '3' },
    { label: 'Thursday', value: '4' },
    { label: 'Friday', value: '5' },
    { label: 'Saturday', value: '6' },
    { label: 'Sunday', value: '7' },
  ];

  // Calculate 12-month schedule preview (must be before any conditional returns)
  const schedulePreview = useMemo(() => {
    if (!schedule.schedule_type) return [];

    const periods: Array<{
      periodNumber: number;
      periodStart: Date;
      periodEnd: Date;
      payDate: Date;
    }> = [];

    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1); // Start of current month
    let currentDate = new Date(startDate);

    // Helper to get last Friday of month
    const getLastFriday = (date: Date): Date => {
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const dayOfWeek = lastDay.getDay(); // 0 = Sunday, 5 = Friday
      const daysToSubtract = dayOfWeek < 5 ? dayOfWeek + 2 : dayOfWeek - 5;
      return new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() - daysToSubtract);
    };

    // Helper to get last day of month
    const getLastDay = (date: Date): Date => {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    };

    // Helper to calculate pay date
    const calculatePayDate = (periodEnd: Date): Date => {
      switch (schedule.pay_date_type) {
        case 'days_after':
          const payDate = new Date(periodEnd);
          payDate.setDate(payDate.getDate() + (schedule.days_after_period_end || 5));
          return payDate;
        case 'same_day_next_week':
          const nextWeek = new Date(periodEnd);
          nextWeek.setDate(nextWeek.getDate() + 7);
          return nextWeek;
        case 'last_friday':
          return getLastFriday(new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 1));
        case 'last_day':
          return getLastDay(new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 1));
        default:
          const defaultDate = new Date(periodEnd);
          defaultDate.setDate(defaultDate.getDate() + 5);
          return defaultDate;
      }
    };

    // Calculate periods based on schedule type
    let periodCount = 0;
    const maxPeriods = 15; // Enough for 12 months

    switch (schedule.schedule_type) {
      case 'weekly': {
        // Find next occurrence of the specified day
        // Schedule uses 1=Monday, 2=Tuesday... 7=Sunday
        // JavaScript uses 0=Sunday, 1=Monday... 6=Saturday
        const targetDay = schedule.period_start_day || 1; // 1 = Monday
        const jsDay = targetDay === 7 ? 0 : targetDay; // Convert Sunday (7) to 0
        let periodStart = new Date(currentDate);
        
        // Find the next occurrence of target day
        while (periodStart.getDay() !== jsDay) {
          periodStart.setDate(periodStart.getDate() + 1);
        }

        for (let i = 0; i < maxPeriods && periodCount < 52; i++) {
          const periodEnd = new Date(periodStart);
          periodEnd.setDate(periodEnd.getDate() + 6);
          
          periods.push({
            periodNumber: periodCount + 1,
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
            payDate: calculatePayDate(periodEnd)
          });

          periodStart.setDate(periodStart.getDate() + 7);
          periodCount++;
        }
        break;
      }

      case 'fortnightly': {
        const targetDay = schedule.period_start_day || 1;
        const jsDay = targetDay === 7 ? 0 : targetDay;
        let periodStart = new Date(currentDate);
        
        while (periodStart.getDay() !== jsDay) {
          periodStart.setDate(periodStart.getDate() + 1);
        }

        for (let i = 0; i < maxPeriods && periodCount < 26; i++) {
          const periodEnd = new Date(periodStart);
          periodEnd.setDate(periodEnd.getDate() + 13);
          
          periods.push({
            periodNumber: periodCount + 1,
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
            payDate: calculatePayDate(periodEnd)
          });

          periodStart.setDate(periodStart.getDate() + 14);
          periodCount++;
        }
        break;
      }

      case 'four_weekly': {
        const targetDay = schedule.period_start_day || 1;
        const jsDay = targetDay === 7 ? 0 : targetDay;
        let periodStart = new Date(currentDate);
        
        while (periodStart.getDay() !== jsDay) {
          periodStart.setDate(periodStart.getDate() + 1);
        }

        for (let i = 0; i < maxPeriods && periodCount < 13; i++) {
          const periodEnd = new Date(periodStart);
          periodEnd.setDate(periodEnd.getDate() + 27);
          
          periods.push({
            periodNumber: periodCount + 1,
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
            payDate: calculatePayDate(periodEnd)
          });

          periodStart.setDate(periodStart.getDate() + 28);
          periodCount++;
        }
        break;
      }

      case 'monthly': {
        const dayOfMonth = schedule.period_start_date || 1;
        
        for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
          const periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, dayOfMonth);
          const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0); // Last day of month
          
          periods.push({
            periodNumber: monthOffset + 1,
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
            payDate: calculatePayDate(periodEnd)
          });
        }
        break;
      }

      case 'last_friday': {
        for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
          const month = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1);
          const lastFriday = getLastFriday(month);
          
          // Period is the month containing the last Friday
          const periodStart = new Date(month.getFullYear(), month.getMonth(), 1);
          const periodEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
          
          periods.push({
            periodNumber: monthOffset + 1,
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
            payDate: lastFriday
          });
        }
        break;
      }

      case 'last_day': {
        for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
          const month = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1);
          const lastDay = getLastDay(month);
          
          const periodStart = new Date(month.getFullYear(), month.getMonth(), 1);
          const periodEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
          
          periods.push({
            periodNumber: monthOffset + 1,
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
            payDate: lastDay
          });
        }
        break;
      }
    }

    return periods;
  }, [schedule]);

  const needsDayOfWeek = ['weekly', 'fortnightly', 'four_weekly'].includes(schedule.schedule_type);
  const needsDayOfMonth = schedule.schedule_type === 'monthly';
  const showDaysAfter = schedule.pay_date_type === 'days_after';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/people/payroll">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payrun Schedule Settings</h1>
          <p className="text-gray-500 dark:text-white/60">Configure flexible payroll period schedules</p>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white dark:bg-white/[0.03] shadow-sm dark:shadow-none border border-gray-200 dark:border-white/[0.06] rounded-xl p-6 space-y-6">
        {/* Schedule Type */}
        <div className="space-y-2">
          <Label htmlFor="schedule_type" className="text-gray-900 dark:text-white">
            Pay Period Schedule Type
          </Label>
          <Select
            value={schedule.schedule_type}
            onValueChange={(value: string) =>
              setSchedule({ ...schedule, schedule_type: value as PayrunSchedule['schedule_type'] })
            }
            options={scheduleTypeOptions.map(opt => ({ label: `${opt.label} - ${opt.description}`, value: opt.value }))}
            placeholder="Select schedule type"
          />
          <p className="text-xs text-gray-500 dark:text-white/60">
            {scheduleTypeOptions.find(opt => opt.value === schedule.schedule_type)?.description}
          </p>
        </div>

        {/* Period Start Configuration */}
        {needsDayOfWeek && (
          <div className="space-y-2">
            <Label htmlFor="start_day" className="text-gray-900 dark:text-white">
              Period Starts On (Day of Week)
            </Label>
            <Select
              value={String(schedule.period_start_day || 1)}
              onValueChange={(value) =>
                setSchedule({ ...schedule, period_start_day: parseInt(value) })
              }
              options={dayOptions}
              placeholder="Select day"
            />
            <p className="text-xs text-gray-500 dark:text-white/60">
              The day of the week when each pay period begins
            </p>
          </div>
        )}

        {needsDayOfMonth && (
          <div className="space-y-2">
            <Label htmlFor="start_date" className="text-gray-900 dark:text-white">
              Period Starts On (Day of Month)
            </Label>
            <Input
              id="start_date"
              type="number"
              min="1"
              max="28"
              value={schedule.period_start_date || 1}
              onChange={(e) =>
                setSchedule({ ...schedule, period_start_date: parseInt(e.target.value) || 1 })
              }
              className="bg-white dark:bg-white/[0.05] border-gray-300 dark:border-white/[0.12] text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-white/60">
              Day of month (1-28) when monthly period starts. Leave as 1 for first of month.
            </p>
          </div>
        )}

        {/* Pay Date Type */}
        <div className="space-y-2">
          <Label htmlFor="pay_date_type" className="text-gray-900 dark:text-white">
            Pay Date Calculation
          </Label>
          <Select
            value={schedule.pay_date_type}
            onValueChange={(value: string) =>
              setSchedule({ ...schedule, pay_date_type: value as PayrunSchedule['pay_date_type'] })
            }
            options={payDateTypeOptions}
            placeholder="Select pay date type"
          />
          <p className="text-xs text-gray-500 dark:text-white/60">
            How to calculate when staff get paid
          </p>
        </div>

        {/* Days After Period End (conditional) */}
        {showDaysAfter && (
          <div className="space-y-2">
            <Label htmlFor="days_after" className="text-gray-900 dark:text-white">
              Days After Period End
            </Label>
            <Input
              id="days_after"
              type="number"
              min="1"
              max="14"
              value={schedule.days_after_period_end}
              onChange={(e) =>
                setSchedule({ ...schedule, days_after_period_end: parseInt(e.target.value) || 5 })
              }
              className="bg-white dark:bg-white/[0.05] border-gray-300 dark:border-white/[0.12] text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-white/60">
              Number of days after period ends when staff get paid
            </p>
          </div>
        )}

        {/* Tax Year Start Date */}
        <div className="space-y-2">
          <Label htmlFor="tax_year_start" className="text-gray-900 dark:text-white">
            Tax Year Start Date
          </Label>
          <Input
            id="tax_year_start"
            type="date"
            value={schedule.tax_year_start_date || getDefaultTaxYearStart()}
            onChange={(e) =>
              setSchedule({ ...schedule, tax_year_start_date: e.target.value })
            }
            className="bg-white dark:bg-white/[0.05] border-gray-300 dark:border-white/[0.12] text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-white/60">
            UK tax year typically starts on 6 April. This is used for holiday accrual calculations and payroll period alignment.
          </p>
        </div>

        {/* Auto Generation */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="auto_generate"
              checked={schedule.auto_generate}
              onChange={(e) =>
                setSchedule({ ...schedule, auto_generate: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-300 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-900 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <Label htmlFor="auto_generate" className="text-gray-900 dark:text-white cursor-pointer">
              Auto-generate payroll runs
            </Label>
          </div>
          
          {schedule.auto_generate && (
            <div className="ml-7 space-y-2">
              <Label htmlFor="generate_days" className="text-gray-900 dark:text-white">
                Generate X Days Before Pay Date
              </Label>
              <Input
                id="generate_days"
                type="number"
                min="1"
                max="7"
                value={schedule.generate_days_before}
                onChange={(e) =>
                  setSchedule({ ...schedule, generate_days_before: parseInt(e.target.value) || 3 })
                }
                className="bg-white dark:bg-white/[0.05] border-gray-300 dark:border-white/[0.12] text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-white/60">
                Payroll runs will be automatically created this many days before the pay date
              </p>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-white/[0.06]">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-transparent border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:shadow-[0_0_12px_rgba(37,99,235,0.4)] dark:hover:shadow-[0_0_12px_rgba(96,165,250,0.5)] transition-all duration-200"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400 mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Schedule
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 12-Month Schedule Preview */}
      {schedulePreview.length > 0 && (
        <div className="bg-white dark:bg-white/[0.03] shadow-sm dark:shadow-none border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">12-Month Schedule Preview</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-white/60">Period</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-white/60">Period Start</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-white/60">Period End</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-white/60">Pay Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-white/60">Tax Year</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-white/60">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/[0.06]">
                {schedulePreview.map((period, index) => {
                  const daysDiff = Math.ceil((period.periodEnd.getTime() - period.periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  const isPast = period.payDate < new Date();
                  
                  // Calculate which tax year this period belongs to
                  const getTaxYear = (date: Date): string => {
                    if (!schedule.tax_year_start_date) return 'N/A';
                    
                    const taxYearStart = new Date(schedule.tax_year_start_date);
                    const taxYearEnd = new Date(taxYearStart);
                    taxYearEnd.setFullYear(taxYearEnd.getFullYear() + 1);
                    
                    // Check if date falls in current tax year
                    if (date >= taxYearStart && date < taxYearEnd) {
                      return `${taxYearStart.getFullYear()}/${taxYearEnd.getFullYear()}`;
                    }
                    
                    // Check if date is before tax year start (previous tax year)
                    if (date < taxYearStart) {
                      const prevYearStart = new Date(taxYearStart);
                      prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
                      return `${prevYearStart.getFullYear()}/${taxYearStart.getFullYear()}`;
                    }
                    
                    // Date is after current tax year (next tax year)
                    return `${taxYearEnd.getFullYear()}/${taxYearEnd.getFullYear() + 1}`;
                  };
                  
                  const taxYear = getTaxYear(period.periodStart);
                  
                  return (
                    <tr 
                      key={index} 
                      className={`hover:bg-gray-50 dark:hover:bg-white/[0.02] ${isPast ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-3 text-gray-900 dark:text-white text-sm font-medium">
                        #{period.periodNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white text-sm">
                        {period.periodStart.toLocaleDateString('en-GB', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric',
                          weekday: 'short'
                        })}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white text-sm">
                        {period.periodEnd.toLocaleDateString('en-GB', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric',
                          weekday: 'short'
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`${isPast ? 'text-neutral-500' : 'text-blue-600 dark:text-blue-400 font-medium'}`}>
                          {period.payDate.toLocaleDateString('en-GB', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric',
                            weekday: 'short'
                          })}
                        </span>
                        {isPast && (
                          <span className="ml-2 text-xs text-neutral-500">(Past)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-white/60 text-sm">
                        {taxYear}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-white/60 text-sm">
                        {daysDiff} days
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-xs text-gray-500 dark:text-white/60">
            <p>Total periods shown: {schedulePreview.length}</p>
            {schedule.schedule_type === 'four_weekly' && (
              <p className="mt-1">Note: Four-weekly schedules have 13 periods per year</p>
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-400">
            <p className="font-semibold mb-1">Schedule Types Explained:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-300">
              <li><strong>Four-Weekly:</strong> 13 periods per year (every 4 weeks)</li>
              <li><strong>Last Friday:</strong> Last Friday of each calendar month</li>
              <li><strong>Last Day:</strong> Last day of each calendar month (28th, 29th, 30th, or 31st)</li>
            </ul>
            <p className="mt-2">Salaried staff will have their annual salary divided by the number of pay periods per year.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
