'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LogIn,
  LogOut,
  UserX,
  Edit3,
  Clock,
  ChevronRight,
  X,
  Users,
} from '@/components/ui/icons';
import { toast } from 'sonner';
import { MOBILE_LAYOUT, MOBILE_Z } from '@/lib/mobile-layout';

interface ShiftInfo {
  id: string;
  profile_id: string | null;
  profile_name?: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  net_hours: number;
  role_required: string | null;
  section_name?: string | null;
  section_color?: string | null;
  color: string;
  status: string;
  notes?: string | null;
}

interface StaffInfo {
  id: string;
  full_name: string;
  position_title: string | null;
  avatar_url: string | null;
}

interface ShiftActionSheetProps {
  shift: ShiftInfo | null;
  staffMember: StaffInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onClockIn?: (shiftId: string) => Promise<void>;
  onClockOut?: (shiftId: string) => Promise<void>;
  onRecordAbsence?: (shiftId: string, profileId: string, reason: string, notes: string) => Promise<void>;
  onEditShift?: (shift: ShiftInfo) => void;
  onAssignShift?: (shiftId: string) => void;
  currentUserId?: string;
  isUserClockedIn?: boolean;
  canManageRota?: boolean;
  siteId?: string | null;
}

const ABSENCE_REASONS = [
  { value: 'sick', label: 'Sick' },
  { value: 'no_show', label: 'No-show' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

export function ShiftActionSheet({
  shift,
  staffMember,
  isOpen,
  onClose,
  onClockIn,
  onClockOut,
  onRecordAbsence,
  onEditShift,
  onAssignShift,
  currentUserId,
  isUserClockedIn = false,
  canManageRota = false,
  siteId,
}: ShiftActionSheetProps) {
  const [mode, setMode] = useState<'actions' | 'absence'>('actions');
  const [absenceReason, setAbsenceReason] = useState('sick');
  const [absenceNotes, setAbsenceNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!shift) return null;

  const isOwnShift = shift.profile_id === currentUserId;
  const isAssigned = !!shift.profile_id;
  const isToday = shift.shift_date === new Date().toISOString().split('T')[0];

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const min = m !== '00' ? `:${m}` : '';
    return `${hour > 12 ? hour - 12 : hour}${min}${hour >= 12 ? 'pm' : 'am'}`;
  };

  function handleClose() {
    setMode('actions');
    setAbsenceReason('sick');
    setAbsenceNotes('');
    setLoading(false);
    onClose();
  }

  async function handleClockIn() {
    if (!onClockIn || !shift) return;
    setLoading(true);
    try {
      await onClockIn(shift.id);
      handleClose();
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  }

  async function handleClockOut() {
    if (!onClockOut || !shift) return;
    setLoading(true);
    try {
      await onClockOut(shift.id);
      handleClose();
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAbsence() {
    if (!onRecordAbsence || !shift?.profile_id) return;
    setLoading(true);
    try {
      await onRecordAbsence(shift.id, shift.profile_id, absenceReason, absenceNotes);
      handleClose();
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 bg-black/30 dark:bg-black/50 ${MOBILE_Z.sheetBackdrop}`}
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed bottom-0 left-0 right-0 ${MOBILE_Z.sheet} bg-white dark:bg-[rgb(var(--surface-elevated))] border-t border-black/10 dark:border-white/10 rounded-t-2xl max-h-[70vh] overflow-y-auto`}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full" />
            </div>

            {/* Shift Info Header */}
            <div className="px-5 pb-4 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-3">
                {/* Color indicator */}
                <div
                  className="w-1 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: shift.section_color || shift.color || 'rgb(var(--module-fg))' }}
                />

                {/* Avatar / Icon */}
                <div className="flex-shrink-0">
                  {isAssigned && staffMember ? (
                    staffMember.avatar_url ? (
                      <img
                        src={staffMember.avatar_url}
                        alt={staffMember.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-theme-tertiary text-sm font-medium">
                        {staffMember.full_name.charAt(0)}
                      </div>
                    )
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <UserX className="w-5 h-5 text-orange-400" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-theme-primary truncate">
                    {isAssigned ? (staffMember?.full_name || shift.profile_name || 'Unknown') : 'Open Shift'}
                  </div>
                  <div className="text-sm text-theme-tertiary">
                    {isAssigned && staffMember?.position_title && (
                      <span className="mr-2">{staffMember.position_title}</span>
                    )}
                    {!isAssigned && shift.role_required && (
                      <span className="mr-2">{shift.role_required}</span>
                    )}
                    {shift.section_name && (
                      <span>{isAssigned && staffMember?.position_title ? '· ' : ''}{shift.section_name}</span>
                    )}
                  </div>
                </div>

                {/* Time */}
                <div className="text-right flex-shrink-0">
                  <div className="text-theme-primary font-medium text-sm">
                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                  </div>
                  <div className="text-theme-tertiary text-xs">
                    {shift.net_hours}h
                    {shift.break_minutes > 0 && ` (${shift.break_minutes}m break)`}
                  </div>
                </div>
              </div>
            </div>

            {mode === 'actions' ? (
              /* Action Buttons */
              <div className={`px-4 py-3 space-y-1 ${MOBILE_LAYOUT.sheetPadding}`}>
                {/* Clock In — own shift, not clocked in, today */}
                {isOwnShift && !isUserClockedIn && isToday && onClockIn && (
                  <ActionButton
                    icon={<LogIn className="w-5 h-5" />}
                    label="Clock In"
                    onClick={handleClockIn}
                    loading={loading}
                    accent
                  />
                )}

                {/* Clock Out — own shift, clocked in */}
                {isOwnShift && isUserClockedIn && onClockOut && (
                  <ActionButton
                    icon={<LogOut className="w-5 h-5" />}
                    label="Clock Out"
                    onClick={handleClockOut}
                    loading={loading}
                  />
                )}

                {/* Record Absence — managers only, assigned shifts */}
                {canManageRota && isAssigned && onRecordAbsence && (
                  <ActionButton
                    icon={<UserX className="w-5 h-5" />}
                    label="Record Absence"
                    onClick={() => setMode('absence')}
                  />
                )}

                {/* Edit Shift — managers only */}
                {canManageRota && onEditShift && (
                  <ActionButton
                    icon={<Edit3 className="w-5 h-5" />}
                    label="Edit Shift"
                    onClick={() => {
                      onEditShift(shift);
                      handleClose();
                    }}
                  />
                )}

                {/* Assign Staff — managers only, open shifts */}
                {canManageRota && !isAssigned && onAssignShift && (
                  <ActionButton
                    icon={<Users className="w-5 h-5" />}
                    label="Assign Staff"
                    onClick={() => {
                      onAssignShift(shift.id);
                      handleClose();
                    }}
                  />
                )}

                {/* Cancel */}
                <ActionButton
                  icon={<X className="w-5 h-5" />}
                  label="Cancel"
                  onClick={handleClose}
                  muted
                />
              </div>
            ) : (
              /* Absence Form */
              <div className={`px-5 py-4 space-y-4 ${MOBILE_LAYOUT.sheetPadding}`}>
                <h3 className="text-base font-semibold text-theme-primary">
                  Record Absence — {staffMember?.full_name || shift.profile_name}
                </h3>

                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Reason</label>
                  <select
                    value={absenceReason}
                    onChange={(e) => setAbsenceReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black/[0.04] dark:bg-white/[0.06] border border-black/15 dark:border-white/[0.1] rounded-lg text-theme-primary focus:outline-none focus:border-module-fg/50"
                  >
                    {ABSENCE_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">Notes (optional)</label>
                  <textarea
                    value={absenceNotes}
                    onChange={(e) => setAbsenceNotes(e.target.value)}
                    placeholder="Additional details..."
                    rows={3}
                    className="w-full px-4 py-2 bg-black/[0.04] dark:bg-white/[0.06] border border-black/15 dark:border-white/[0.1] rounded-lg text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:border-module-fg/50"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSubmitAbsence}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-lg font-medium text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Recording...' : 'Record Absence'}
                  </button>
                  <button
                    onClick={() => setMode('actions')}
                    className="px-4 py-2.5 bg-black/[0.04] dark:bg-white/[0.06] text-theme-primary rounded-lg text-sm hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-colors"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  loading = false,
  accent = false,
  muted = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading?: boolean;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`
        w-full flex items-center gap-4 px-4 py-3.5 rounded-xl
        transition-colors disabled:opacity-50
        ${accent
          ? 'text-green-600 dark:text-green-400 hover:bg-green-500/10 active:bg-green-500/15'
          : muted
            ? 'text-theme-tertiary hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10'
            : 'text-theme-primary hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10'
        }
      `}
    >
      <span className={accent ? 'text-green-600 dark:text-green-400' : muted ? 'text-theme-tertiary' : 'text-theme-tertiary'}>
        {icon}
      </span>
      <span className="text-[15px] font-medium">{loading ? 'Loading...' : label}</span>
    </button>
  );
}
