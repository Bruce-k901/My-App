'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { Calendar, Save } from 'lucide-react';

export default function HolidayYearSettings() {
  const { companyId, profile } = useAppContext();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [holidayYearMonth, setHolidayYearMonth] = useState<number>(1);
  const [holidayYearDay, setHolidayYearDay] = useState<number>(1);

  const isManager = profile?.app_role && ['admin', 'owner', 'manager'].includes((profile.app_role || '').toLowerCase());

  useEffect(() => {
    if (companyId) {
      fetchCompanySettings();
    }
  }, [companyId]);

  const fetchCompanySettings = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('holiday_year_start_month, holiday_year_start_day')
        .eq('id', companyId)
        .single();

      if (error) throw error;

      if (data) {
        setHolidayYearMonth(data.holiday_year_start_month || 1);
        setHolidayYearDay(data.holiday_year_start_day || 1);
      }
    } catch (error: any) {
      console.error('Error fetching company settings:', error);
      showToast('Failed to load holiday year settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!companyId) {
      showToast('Company ID not found', 'error');
      return;
    }

    // Validate day based on month
    const daysInMonth = new Date(2024, holidayYearMonth, 0).getDate();
    if (holidayYearDay > daysInMonth) {
      showToast(`Invalid day. ${getMonthName(holidayYearMonth)} only has ${daysInMonth} days.`, 'error');
      return;
    }

    try {
      setSaving(true);
      
      const { data, error } = await supabase
        .from('companies')
        .update({
          holiday_year_start_month: holidayYearMonth,
          holiday_year_start_day: holidayYearDay,
        })
        .eq('id', companyId)
        .select();

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // Check if it's an RLS error
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          throw new Error('You do not have permission to update company settings. Please contact an administrator.');
        }
        
        // Check if column doesn't exist
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
          throw new Error('Holiday year columns not found. Please run the database migration first.');
        }
        
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No company found to update');
      }

      showToast('Holiday year settings saved successfully', 'success');
      
      // Refresh balances after a short delay to allow the database to update
      setTimeout(() => {
        // Trigger a custom event that the balances page can listen to
        window.dispatchEvent(new CustomEvent('holidayYearUpdated'));
      }, 500);
    } catch (error: any) {
      console.error('Error saving holiday year settings:', error);
      const errorMessage = error?.message || 'Failed to save holiday year settings';
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'January';
  };

  const getDaysInMonth = (month: number) => {
    return new Date(2024, month, 0).getDate();
  };

  if (!isManager) {
    return null; // Only managers/admins can edit
  }

  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
        <p className="text-neutral-400 text-sm">Loading holiday year settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-[#EC4899]" />
        <h3 className="text-white font-medium">Holiday Year Start Date</h3>
      </div>
      
      <p className="text-neutral-400 text-sm mb-4">
        Set when your company's holiday/leave year starts. This affects how holiday entitlement is accrued throughout the year.
      </p>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <label className="block text-sm text-neutral-300 mb-2">Month</label>
          <select
            value={holidayYearMonth}
            onChange={(e) => {
              const newMonth = parseInt(e.target.value);
              setHolidayYearMonth(newMonth);
              // Adjust day if it's invalid for the new month
              const maxDays = getDaysInMonth(newMonth);
              if (holidayYearDay > maxDays) {
                setHolidayYearDay(maxDays);
              }
            }}
            className="w-full px-3 py-2 bg-[#0B0D13] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:border-[#EC4899]"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <option key={month} value={month}>
                {getMonthName(month)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm text-neutral-300 mb-2">Day</label>
          <select
            value={holidayYearDay}
            onChange={(e) => setHolidayYearDay(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-[#0B0D13] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:border-[#EC4899]"
          >
            {Array.from({ length: getDaysInMonth(holidayYearMonth) }, (_, i) => i + 1).map(day => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
        <p className="text-blue-300 text-sm">
          <strong>Current setting:</strong> {getMonthName(holidayYearMonth)} {holidayYearDay}
        </p>
        <p className="text-blue-200/80 text-xs mt-1">
          Example: If set to April 1st, employees accrue holiday from April 1st to March 31st each year.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] rounded-lg hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Saving...' : 'Save Holiday Year Settings'}
      </button>
    </div>
  );
}

