'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Plus, AlertTriangle, User } from 'lucide-react';
import TimePicker from '@/components/ui/TimePicker';

interface AddAttendanceModalProps {
  date: string;          // YYYY-MM-DD
  staffId: string | null; // Pre-selected staff, or null to choose
  siteId: string;
  companyId: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface StaffMember {
  id: string;
  full_name: string;
  position_title: string | null;
}

export default function AddAttendanceModal({
  date,
  staffId,
  siteId,
  companyId,
  userId,
  onClose,
  onSaved
}: AddAttendanceModalProps) {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState(staffId || '');
  const [clockIn, setClockIn] = useState('09:00');
  const [clockOut, setClockOut] = useState('17:00');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load staff list if no staffId provided
  useEffect(() => {
    if (!staffId) {
      loadStaff();
    } else {
      // Load single staff member name
      loadSingleStaff();
    }
  }, [staffId]);

  async function loadStaff() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, position_title')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('full_name');
    
    if (data) setStaffList(data);
  }

  async function loadSingleStaff() {
    if (!staffId) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, position_title')
      .eq('id', staffId)
      .single();
    
    if (data) setStaffList([data]);
  }

  async function handleSave() {
    if (!selectedStaffId) {
      setError('Please select a staff member');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for adding this record');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Build timestamps
      const clockInTime = `${date}T${clockIn}:00`;
      const clockOutTime = `${date}T${clockOut}:00`;
      
      // Calculate hours
      const start = new Date(clockInTime);
      const end = new Date(clockOutTime);
      const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
      // Create the attendance record
      const { data: attendanceData, error: attError } = await supabase
        .from('staff_attendance')
        .insert({
          user_id: selectedStaffId,
          company_id: companyId,
          site_id: siteId,
          clock_in_time: clockInTime,
          clock_out_time: clockOutTime,
          total_hours: totalHours,
          shift_status: 'off_shift',
          shift_notes: notes || null,
          manually_adjusted: true
        })
        .select('id')
        .single();
      
      if (attError) throw attError;
      
      // Create adjustment record for audit trail
      const { error: adjError } = await supabase
        .from('attendance_adjustments')
        .insert({
          company_id: companyId,
          site_id: siteId,
          attendance_id: attendanceData.id,
          staff_id: selectedStaffId,
          adjustment_date: date,
          original_clock_in: null,
          original_clock_out: null,
          original_hours: null,
          adjusted_clock_in: clockInTime,
          adjusted_clock_out: clockOutTime,
          adjusted_hours: totalHours,
          adjustment_type: 'manual_add',
          reason: reason,
          adjusted_by: userId
        });
      
      if (adjError) throw adjError;
      
      onSaved();
      onClose();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Get selected staff name
  const selectedStaff = staffList.find(s => s.id === selectedStaffId);
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#EC4899]" />
            <h3 className="font-semibold">Add Attendance Record</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/[0.05] rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Date Display */}
          <div>
            <p className="text-sm text-zinc-400 mb-1">Date</p>
            <p className="font-medium">
              {new Date(date).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
          
          {/* Staff Selection */}
          {staffId ? (
            <div>
              <p className="text-sm text-zinc-400 mb-1">Staff Member</p>
              <div className="flex items-center gap-2 bg-white/[0.05] rounded-lg p-3">
                <User className="w-4 h-4 text-zinc-400" />
                <span className="font-medium">
                  {selectedStaff?.full_name || 'Loading...'}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Staff Member <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.06] rounded-lg px-3 py-2 text-white"
              >
                <option value="">Select staff member...</option>
                {staffList.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name} {staff.position_title && `(${staff.position_title})`}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Time Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Clock In</label>
              <TimePicker
                value={clockIn}
                onChange={(value) => setClockIn(value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Clock Out</label>
              <TimePicker
                value={clockOut}
                onChange={(value) => setClockOut(value)}
                className="w-full"
              />
            </div>
          </div>
          
          {/* Calculated hours display */}
          {clockIn && clockOut && (
            <div className="bg-white/[0.05] rounded-lg p-3 text-center">
              <span className="text-zinc-400">Total Hours: </span>
              <span className="font-bold text-[#EC4899]">
                {(() => {
                  const start = new Date(`2000-01-01T${clockIn}`);
                  const end = new Date(`2000-01-01T${clockOut}`);
                  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                  return hours.toFixed(2);
                })()}h
              </span>
            </div>
          )}
          
          {/* Reason (required) */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Reason for Manual Entry <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Staff forgot to clock in, adding based on manager observation"
              rows={2}
              className="w-full bg-white/[0.05] border border-white/[0.06] rounded-lg px-3 py-2 resize-none"
            />
          </div>
          
          {/* Shift Notes (optional) */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Shift Notes <span className="text-zinc-500">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this shift..."
              className="w-full bg-white/[0.05] border border-white/[0.06] rounded-lg px-3 py-2"
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
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-[#EC4899] hover:bg-[#EC4899]/90 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Adding...' : 'Add Record'}
          </button>
        </div>
      </div>
    </div>
  );
}

