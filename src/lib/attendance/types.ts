// TypeScript types for Attendance Sign-Off feature

export interface AttendanceRecord {
  staffId: string;
  staffName: string;
  positionTitle: string | null;
  hourlyRate: number | null;
  workDate: string; // YYYY-MM-DD
  
  // Scheduled
  scheduledShiftId: string | null;
  scheduledStart: string | null; // HH:MM or TIME
  scheduledEnd: string | null;   // HH:MM or TIME
  scheduledHours: number | null;
  
  // Actual
  attendanceId: string | null;
  actualClockIn: string | null;  // ISO timestamp
  actualClockOut: string | null; // ISO timestamp
  actualHours: number | null;
  shiftNotes: string | null;
  
  // Status
  hoursVariance: number;
  attendanceStatus: 'normal' | 'missing_attendance' | 'unscheduled_shift' | 'late_arrival' | 'early_departure';
  manuallyAdjusted: boolean;
  signedOff: boolean;
  signedOffBy: string | null;
  signedOffAt: string | null;
}

export interface DayAttendance {
  date: string;         // YYYY-MM-DD
  dayName: string;      // "Monday", "Tuesday", etc.
  records: AttendanceRecord[];
  
  // Day totals
  totalScheduledHours: number;
  totalActualHours: number;
  totalVariance: number;
  signedOffCount: number;
  totalCount: number;
}

export interface WeekAttendance {
  weekStartDate: string; // Monday
  weekEndDate: string;   // Sunday
  siteId: string;
  siteName: string;
  days: DayAttendance[];
  
  // Week totals
  totalScheduledHours: number;
  totalActualHours: number;
  totalApprovedHours: number;
  totalVariance: number;
  signedOffCount: number;
  totalCount: number;
  percentComplete: number;
  
  // Payroll status
  payrollStatus: 'draft' | 'pending_review' | 'approved' | 'submitted' | 'rejected';
  payrollSubmissionId: string | null;
}

export interface TimeAdjustment {
  attendanceId: string | null;
  staffId: string;
  date: string;
  newClockIn: string;
  newClockOut: string;
  reason: string;
}

export interface SignOffAction {
  staffId: string;
  date: string;
  signedOff: boolean;
  approvedHours: number;
  notes?: string;
}

