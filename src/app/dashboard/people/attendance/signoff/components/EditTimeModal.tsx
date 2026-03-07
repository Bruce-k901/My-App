'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Clock, AlertTriangle } from '@/components/ui/icons';
import { AttendanceRecord } from '@/lib/attendance/types';
import TimePicker from '@/components/ui/TimePicker';

interface EditTimeModalProps {
  record: AttendanceRecord;
  companyId: string;
  siteId: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditTimeModal({
  record,
  companyId,
  siteId,
  userId,
  onClose,
  onSaved
}: EditTimeModalProps) {
  // Parse existing times
  const existingClockIn = record.actualClockIn 
    ? new Date(record.actualClockIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '';
  const existingClockOut = record.actualClockOut
    ? new Date(record.actualClockOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '';
  
  const [clockIn, setClockIn] = useState(existingClockIn);
  const [clockOut, setClockOut] = useState(existingClockOut);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!reason.trim()) {
      setError('Please provide a reason for the adjustment');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Build new timestamps
      const datePart = record.workDate;
      const newClockIn = `${datePart}T${clockIn}:00`;
      const newClockOut = `${datePart}T${clockOut}:00`;
      
      // Calculate new hours
      const start = new Date(newClockIn);
      const end = new Date(newClockOut);
      const newHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
      // Create adjustment record
      const { error: adjError } = await supabase
        .from('attendance_adjustments')
        .insert({
          company_id: companyId,
          site_id: siteId,
          attendance_id: record.attendanceId,
          staff_id: record.staffId,
          adjustment_date: record.workDate,
          original_clock_in: record.actualClockIn,
          original_clock_out: record.actualClockOut,
          original_hours: record.actualHours,
          adjusted_clock_in: newClockIn,
          adjusted_clock_out: newClockOut,
          adjusted_hours: newHours,
          adjustment_type: 'time_edit',
          reason: reason,
          adjusted_by: userId
        });
      
      if (adjError) throw adjError;
      
      // Update the attendance record
      const { error: attError } = await supabase
        .from('staff_attendance')
        .update({
          clock_in_time: newClockIn,
          clock_out_time: newClockOut,
          total_hours: newHours,
          manually_adjusted: true
        })
        .eq('id', record.attendanceId);
      
      if (attError) throw attError;
      
      onSaved();
      onClose();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#171b2d] border border-theme rounded-xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold">Edit Time Record</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm text-theme-tertiary mb-1">Staff Member</p>
            <p className="font-medium">{record.staffName}</p>
          </div>
          
          <div>
            <p className="text-sm text-theme-tertiary mb-1">Date</p>
            <p className="font-medium">
              {new Date(record.workDate).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-theme-tertiary mb-1">Clock In</label>
              <TimePicker
                value={clockIn}
                onChange={(value) => setClockIn(value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-theme-tertiary mb-1">Clock Out</label>
              <TimePicker
                value={clockOut}
                onChange={(value) => setClockOut(value)}
                className="w-full"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-theme-tertiary mb-1">
              Reason for Adjustment <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Staff forgot to clock out, correcting to actual departure time"
              rows={3}
              className="w-full bg-theme-button border border-theme rounded-lg px-3 py-2 resize-none"
            />
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-theme">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-theme-tertiary hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

