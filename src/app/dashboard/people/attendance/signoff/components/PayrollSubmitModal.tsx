'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Send, Lock, AlertTriangle, FileSpreadsheet, Download } from 'lucide-react';
import { WeekAttendance } from '@/lib/attendance/types';

interface PayrollSubmitModalProps {
  weekData: WeekAttendance;
  companyId: string;
  userId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function PayrollSubmitModal({
  weekData,
  companyId,
  userId,
  onClose,
  onSubmitted
}: PayrollSubmitModalProps) {
  const [notes, setNotes] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'none'>('csv');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    
    try {
      // Create or update payroll submission
      const { data: submission, error: subError } = await supabase
        .from('payroll_submissions')
        .upsert({
          company_id: companyId,
          site_id: weekData.siteId,
          week_start_date: weekData.weekStartDate,
          week_end_date: weekData.weekEndDate,
          total_staff: weekData.totalCount,
          total_scheduled_hours: weekData.totalScheduledHours,
          total_actual_hours: weekData.totalActualHours,
          total_approved_hours: weekData.totalActualHours, // Could be different if adjustments made
          status: 'submitted',
          submitted_by: userId,
          submitted_at: new Date().toISOString(),
          export_format: exportFormat !== 'none' ? exportFormat : null,
          notes: notes || null
        }, {
          onConflict: 'company_id,site_id,week_start_date'
        })
        .select()
        .single();
      
      if (subError) throw subError;
      
      // Lock all attendance records for this week
      const { error: lockError } = await supabase
        .from('staff_attendance')
        .update({ payroll_locked: true })
        .eq('site_id', weekData.siteId)
        .gte('clock_in_time', weekData.weekStartDate)
        .lte('clock_in_time', weekData.weekEndDate + 'T23:59:59');
      
      if (lockError) throw lockError;
      
      // Generate export if requested
      if (exportFormat !== 'none') {
        await generateExport(submission.id);
      }
      
      setSubmitted(true);
      
      // Close after a brief delay to show success
      setTimeout(() => {
        onSubmitted();
        onClose();
      }, 2000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function generateExport(submissionId: string) {
    // Fetch all the data for export
    const { data: records } = await supabase
      .from('weekly_attendance_review')
      .select('*')
      .eq('site_id', weekData.siteId)
      .gte('work_date', weekData.weekStartDate)
      .lte('work_date', weekData.weekEndDate)
      .order('staff_name')
      .order('work_date');
    
    if (!records) return;
    
    if (exportFormat === 'csv') {
      // Generate CSV
      const headers = [
        'Staff Name',
        'Position',
        'Date',
        'Scheduled Start',
        'Scheduled End',
        'Scheduled Hours',
        'Actual Start',
        'Actual End',
        'Actual Hours',
        'Hourly Rate',
        'Total Pay'
      ];
      
      const rows = records.map(r => [
        r.staff_name,
        r.position_title || '',
        r.work_date,
        r.scheduled_start || '',
        r.scheduled_end || '',
        r.scheduled_hours || 0,
        r.actual_clock_in ? new Date(r.actual_clock_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
        r.actual_clock_out ? new Date(r.actual_clock_out).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
        r.actual_hours || 0,
        r.hourly_rate || 0,
        ((r.actual_hours || 0) * (r.hourly_rate || 0)).toFixed(2)
      ]);
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-${weekData.siteName}-${weekData.weekStartDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    if (exportFormat === 'json') {
      // Generate JSON
      const exportData = {
        site: weekData.siteName,
        weekStart: weekData.weekStartDate,
        weekEnd: weekData.weekEndDate,
        exportedAt: new Date().toISOString(),
        summary: {
          totalStaff: weekData.totalCount,
          totalScheduledHours: weekData.totalScheduledHours,
          totalActualHours: weekData.totalActualHours,
          totalVariance: weekData.totalVariance
        },
        records: records.map(r => ({
          staffName: r.staff_name,
          position: r.position_title,
          date: r.work_date,
          scheduledHours: r.scheduled_hours,
          actualHours: r.actual_hours,
          hourlyRate: r.hourly_rate,
          totalPay: (r.actual_hours || 0) * (r.hourly_rate || 0)
        }))
      };
      
      // Download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-${weekData.siteName}-${weekData.weekStartDate}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-white/[0.03] border border-green-500/30 rounded-xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-green-400 mb-2">Payroll Submitted!</h3>
          <p className="text-zinc-400">
            Week of {new Date(weekData.weekStartDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long'
            })} has been locked and sent to payroll.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[#EC4899]" />
            <h3 className="font-semibold">Submit to Payroll</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/[0.05] rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Week Info */}
          <div className="bg-white/[0.05] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400">Site</span>
              <span className="font-medium">{weekData.siteName}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400">Week</span>
              <span className="font-medium">
                {new Date(weekData.weekStartDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short'
                })} - {new Date(weekData.weekEndDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400">Total Staff</span>
              <span className="font-medium">{weekData.totalCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Total Hours</span>
              <span className="font-medium">{weekData.totalActualHours.toFixed(2)}h</span>
            </div>
          </div>
          
          {/* Warning */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-amber-400 font-medium">This action cannot be undone</p>
              <p className="text-zinc-400 mt-1">
                Once submitted, all attendance records for this week will be locked. 
                You will not be able to make further adjustments.
              </p>
            </div>
          </div>
          
          {/* Export Format */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Export Format</label>
            <div className="flex gap-3">
              <button
                onClick={() => setExportFormat('csv')}
                className={`
                  flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors
                  ${exportFormat === 'csv' 
                    ? 'bg-[#EC4899]/20 border-[#EC4899] text-[#EC4899]' 
                    : 'bg-white/[0.05] border-white/[0.06] text-zinc-400 hover:border-white/[0.1]'
                  }
                `}
              >
                <FileSpreadsheet className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={() => setExportFormat('json')}
                className={`
                  flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors
                  ${exportFormat === 'json' 
                    ? 'bg-[#EC4899]/20 border-[#EC4899] text-[#EC4899]' 
                    : 'bg-white/[0.05] border-white/[0.06] text-zinc-400 hover:border-white/[0.1]'
                  }
                `}
              >
                <Download className="w-4 h-4" />
                JSON
              </button>
              <button
                onClick={() => setExportFormat('none')}
                className={`
                  flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors
                  ${exportFormat === 'none' 
                    ? 'bg-[#EC4899]/20 border-[#EC4899] text-[#EC4899]' 
                    : 'bg-white/[0.05] border-white/[0.06] text-zinc-400 hover:border-white/[0.1]'
                  }
                `}
              >
                None
              </button>
            </div>
          </div>
          
          {/* Notes */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Notes <span className="text-zinc-500">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for payroll team..."
              rows={2}
              className="w-full bg-white/[0.05] border border-white/[0.06] rounded-lg px-3 py-2 resize-none"
            />
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 text-sm bg-[#EC4899] hover:bg-[#EC4899]/90 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Lock & Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

