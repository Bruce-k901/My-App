'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useAppContext } from '@/context/AppContext';
import { useSiteContext } from '@/contexts/SiteContext';
import { supabase } from '@/lib/supabase';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Copy,
  Send,
  Clock,
  Users,
  PoundSterling,
  Plus,
  MoreHorizontal,
  Target,
  X,
  Edit3,
  Trash2,
  UserX,
  AlertTriangle,
  Grip,
  Calendar,
  TrendingUp,
  Bell,
  Check,
  Download,
  Loader2,
} from '@/components/ui/icons';
import TimePicker from '@/components/ui/TimePicker';
import { pdf } from '@react-pdf/renderer';
import { RotaPDF } from '@/lib/pdf/templates/RotaPDF';
import { DayApprovalPanel } from '@/components/rota/DayApprovalPanel';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ShiftActionSheet } from '@/components/rota/ShiftActionSheet';

// ============================================
// TYPES
// ============================================

interface Staff {
  id: string;
  full_name: string;
  position_title: string | null;
  avatar_url: string | null;
  contracted_hours: number;
  hourly_rate: number;
  home_site: string | null;
  home_site_name?: string;
}

interface Shift {
  id: string;
  profile_id: string | null;
  profile_name?: string;
  profile_avatar?: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  net_hours: number;
  estimated_cost: number;
  role_required: string | null;
  section_id?: string | null;
  section_name?: string | null;
  section_color?: string | null;
  color: string;
  status: string;
  notes?: string | null;
  isFromOtherSite?: boolean; // True if this shift is from the employee's home site (for borrowed employees)
  otherSiteName?: string; // Name of the site this shift is from
}

interface DayForecast {
  predicted_revenue: number;
  target_hours: number;
  notes: string;
}

interface ShiftTemplate {
  id: string;
  name: string;
  short_name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  net_hours: number;
  color: string;
}

interface RotaSection {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

interface PlannedClosure {
  id: string;
  site_id?: string | null; // null for company-wide closures
  company_id?: string | null; // present for company-wide closures
  closure_start: string;
  closure_end: string;
  is_active: boolean;
  notes: string | null;
  closure_type?: 'site' | 'company'; // helper to distinguish
}

interface LeaveRequest {
  id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

type RosterItem =
  | { type: 'staff'; staffId: string }
  | { type: 'divider'; sectionId: string; name: string; color: string };

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatTime = (time: string): string => {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const mins = m !== '00' ? `:${m}` : '';
  if (hour === 0) return `12${mins}am`;
  if (hour === 12) return `12${mins}pm`;
  return hour > 12 ? `${hour - 12}${mins}pm` : `${hour}${mins}am`;
};

const calculateNetHours = (start: string, end: string, breakMins: number): number => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60;
  return Math.round((endMins - startMins - breakMins) / 60 * 10) / 10;
};

// Always compute net hours from times to avoid negative values for overnight shifts.
// (Do not trust shift.net_hours if the DB schema hasn't been updated yet.)
const getShiftNetHours = (shift: { start_time: string; end_time: string; break_minutes: number }): number =>
  calculateNetHours(shift.start_time, shift.end_time, shift.break_minutes || 0);

// ============================================
// DEFAULT SHIFT TEMPLATES (if table doesn't exist)
// ============================================

const DEFAULT_TEMPLATES: ShiftTemplate[] = [
  { id: '1', name: 'Opening', short_name: 'OPEN', start_time: '06:00', end_time: '14:00', break_minutes: 30, net_hours: 7.5, color: '#22c55e' },
  { id: '2', name: 'Morning', short_name: 'AM', start_time: '08:00', end_time: '16:00', break_minutes: 30, net_hours: 7.5, color: '#3b82f6' },
  { id: '3', name: 'Mid', short_name: 'MID', start_time: '11:00', end_time: '19:00', break_minutes: 30, net_hours: 7.5, color: '#8b5cf6' },
  { id: '4', name: 'Afternoon', short_name: 'PM', start_time: '14:00', end_time: '22:00', break_minutes: 30, net_hours: 7.5, color: '#f59e0b' },
  { id: '5', name: 'Closing', short_name: 'CLOSE', start_time: '17:00', end_time: '01:00', break_minutes: 30, net_hours: 7.5, color: '#ef4444' },
  { id: '6', name: 'Full Day', short_name: 'FULL', start_time: '09:00', end_time: '21:00', break_minutes: 60, net_hours: 11, color: '#64748b' },
];

const FALLBACK_SECTIONS: RotaSection[] = [
  { id: 'fallback-foh', name: 'FOH', color: 'rgb(var(--module-fg))', sort_order: 1 },
  { id: 'fallback-boh', name: 'BOH', color: '#22c55e', sort_order: 2 },
  { id: 'fallback-bar', name: 'Bar', color: '#3b82f6', sort_order: 3 },
  { id: 'fallback-res', name: 'Reservations', color: '#f59e0b', sort_order: 4 },
  { id: 'fallback-host', name: 'Host', color: '#8b5cf6', sort_order: 5 },
  { id: 'fallback-porters', name: 'Porters', color: '#64748b', sort_order: 6 },
];

// ============================================
// ADD SHIFT MODAL
// ============================================

function AddShiftModal({
  date,
  staff,
  sections,
  sectionsEnabled,
  initialSectionId,
  initialStaffId,
  lockStaff,
  templates,
  onSave,
  onClose,
}: {
  date: Date;
  staff: Staff[];
  sections: RotaSection[];
  sectionsEnabled: boolean;
  initialSectionId?: string | null;
  initialStaffId?: string | null;
  lockStaff?: boolean;
  templates: ShiftTemplate[];
  onSave: (data: { profile_id: string | null; start_time: string; end_time: string; break_minutes: number; color: string; section_id: string | null }) => void;
  onClose: () => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<ShiftTemplate | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMins, setBreakMins] = useState(30);
  const [selectedStaff, setSelectedStaff] = useState<string>(initialStaffId || '');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sectionsEnabled ? (initialSectionId || '') : '');
  const [color, setColor] = useState('rgb(var(--module-fg))');

  useEffect(() => {
    if (initialStaffId) setSelectedStaff(initialStaffId);
  }, [initialStaffId]);

  const netHours = calculateNetHours(startTime, endTime, breakMins);
  const staffMember = staff.find(s => s.id === selectedStaff);
  // hourly_rate is stored in pence, so cost is also in pence - convert to pounds for display
  const estimatedCostPence = staffMember ? Math.round(netHours * staffMember.hourly_rate) : 0;
  const estimatedCost = estimatedCostPence / 100;

  const applyTemplate = (t: ShiftTemplate) => {
    setSelectedTemplate(t);
    setStartTime(t.start_time);
    setEndTime(t.end_time);
    setBreakMins(t.break_minutes);
    setColor(t.color);
  };

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-theme-surface rounded-lg border border-theme w-full max-w-2xl shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <div>
            <h3 className="text-lg font-semibold text-theme-primary">Add Shift</h3>
            <p className="text-sm text-theme-tertiary">{date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-theme-surface rounded-lg">
            <X className="w-5 h-5 text-theme-tertiary" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick Templates */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">Quick Select Template</label>
            <div className="grid grid-cols-3 gap-2">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    selectedTemplate?.id === t.id 
                      ? 'border-module-fg bg-module-fg/10'
                      : 'border-theme hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-6 rounded" style={{ backgroundColor: t.color }} />
                    <div>
                      <p className="text-xs font-medium text-theme-primary">{t.short_name}</p>
                      <p className="text-[10px] text-theme-tertiary">{formatTime(t.start_time)}-{formatTime(t.end_time)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Times */}
          <div className="grid grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-xs text-theme-tertiary mb-1">Start Time</label>
              <TimePicker
                value={startTime}
                onChange={(value) => { setStartTime(value); setSelectedTemplate(null); }}
                className="w-full"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs text-theme-tertiary mb-1">End Time</label>
              <TimePicker
                value={endTime}
                onChange={(value) => { setEndTime(value); setSelectedTemplate(null); }}
                className="w-full"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs text-theme-tertiary mb-1">Break (mins)</label>
              <input
                type="number"
                min="0"
                max="480"
                step="15"
                value={breakMins}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setBreakMins(Math.max(0, Math.min(480, val)));
                }}
                className="w-full px-3 py-2 bg-theme-surface border-2 border-theme rounded-lg text-theme-primary text-sm font-medium focus:outline-none focus:border-module-fg dark:focus:border-module-fg focus:ring-2 focus:ring-module-fg/20 shadow-sm hover:border-gray-400 dark:hover:border-neutral-600 transition-colors"
              />
            </div>
          </div>

          {/* Assign Staff */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">
              Assign Staff Member {selectedStaff && <span className="text-module-fg">✓</span>}
            </label>

            {lockStaff ? (
              <div className="px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm">
                {staffMember?.full_name || 'Selected staff'}
              </div>
            ) : (
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary focus:border-module-fg focus:ring-1 focus:ring-module-fg"
              >
                <option value="">Leave Open (unassigned)</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} {s.position_title ? `(${s.position_title})` : ''} - £{(s.hourly_rate / 100).toFixed(2)}/hr
                  </option>
                ))}
              </select>
            )}

            {selectedStaff && staffMember && (
              <p className="text-xs text-theme-tertiary mt-1">
                Selected: {staffMember.full_name} • Cost: £{estimatedCost.toFixed(2)} for {netHours}h
              </p>
            )}
          </div>

          {/* Section */}
          {(sectionsEnabled || sections.length > 0) ? (
            <div className="relative">
              <label className="block text-sm font-medium text-theme-secondary mb-2">Section</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full px-3 py-2 pr-8 bg-theme-surface border-2 border-theme rounded-lg text-theme-primary focus:outline-none focus:border-module-fg dark:focus:border-module-fg focus:ring-2 focus:ring-module-fg/20 shadow-sm hover:border-gray-400 dark:hover:border-neutral-600 transition-colors appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                }}
              >
                <option value="">No section</option>
                {sections
                  .slice()
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div className="text-xs text-theme-tertiary">
              Sections are not enabled in the database yet. Apply the `rota_sections` migration to turn this on.
            </div>
          )}

          {/* Summary */}
          <div className="bg-theme-surface/50 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-theme-tertiary">
                <Clock className="w-4 h-4 inline mr-1" />
                {netHours}h net
              </span>
              {estimatedCost > 0 && (
                <span className="text-theme-tertiary">
                  <PoundSterling className="w-4 h-4 inline mr-1" />
                  £{estimatedCost.toFixed(2)}
                </span>
              )}
            </div>
            <div 
              className="w-6 h-6 rounded cursor-pointer border border-neutral-600"
              style={{ backgroundColor: color }}
              onClick={() => {
                const colors = ['rgb(var(--module-fg))', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
                const idx = colors.indexOf(color);
                setColor(colors[(idx + 1) % colors.length]);
              }}
              title="Click to change color"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-theme">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            className="px-4 py-2 bg-theme-surface hover:bg-theme-hover rounded-lg text-theme-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              console.log('Add Shift button clicked:', { startTime, endTime, breakMins, selectedStaff, color });
              onSave({ 
                profile_id: selectedStaff || null, 
                start_time: startTime, 
                end_time: endTime, 
                break_minutes: breakMins,
                color,
                section_id: sectionsEnabled ? (selectedSectionId || null) : null,
              });
            }}
            className="px-4 py-2 !bg-transparent border border-module-fg text-module-fg hover:shadow-[0_0_12px_rgba(var(--module-fg-rgb),0.7)] rounded-lg font-medium transition-all duration-200 ease-in-out hover:!bg-transparent"
          >
            Add Shift
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EDIT SHIFT MODAL
// ============================================

function EditShiftModal({
  shift,
  staff,
  sections,
  sectionsEnabled,
  onSave,
  onDelete,
  onClose,
}: {
  shift: Shift;
  staff: Staff[];
  sections: RotaSection[];
  sectionsEnabled: boolean;
  onSave: (data: Partial<Shift>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [startTime, setStartTime] = useState(shift.start_time);
  const [endTime, setEndTime] = useState(shift.end_time);
  const [breakMins, setBreakMins] = useState(shift.break_minutes);
  const [selectedStaff, setSelectedStaff] = useState(shift.profile_id || '');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sectionsEnabled ? (shift.section_id || '') : '');

  const netHours = calculateNetHours(startTime, endTime, breakMins);
  const staffMember = staff.find(s => s.id === selectedStaff);
  // hourly_rate is stored in pence, so cost is also in pence - convert to pounds for display
  const estimatedCostPence = staffMember ? Math.round(netHours * staffMember.hourly_rate) : 0;
  const estimatedCost = estimatedCostPence / 100;

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-theme-surface rounded-lg border border-theme w-full max-w-2xl shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <h3 className="text-lg font-semibold text-theme-primary">Edit Shift</h3>
          <button onClick={onClose} className="p-2 hover:bg-theme-surface rounded-lg">
            <X className="w-5 h-5 text-theme-tertiary" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-xs text-theme-tertiary mb-1">Start Time</label>
              <TimePicker
                value={startTime}
                onChange={(value) => setStartTime(value)}
                className="w-full"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs text-theme-tertiary mb-1">End Time</label>
              <TimePicker
                value={endTime}
                onChange={(value) => setEndTime(value)}
                className="w-full"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs text-theme-tertiary mb-1">Break (mins)</label>
              <input
                type="number"
                min="0"
                max="480"
                step="15"
                value={breakMins}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setBreakMins(Math.max(0, Math.min(480, val)));
                }}
                className="w-full px-3 py-2 bg-theme-surface border-2 border-theme rounded-lg text-theme-primary text-sm font-medium focus:outline-none focus:border-module-fg dark:focus:border-module-fg focus:ring-2 focus:ring-module-fg/20 shadow-sm hover:border-gray-400 dark:hover:border-neutral-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">Assigned To</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary focus:border-module-fg focus:ring-1 focus:ring-module-fg"
            >
              <option value="">Unassigned</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.full_name} - £{(s.hourly_rate / 100).toFixed(2)}/hr</option>
              ))}
            </select>
          </div>

          {(sectionsEnabled || sections.length > 0) && (
            <div className="relative">
              <label className="block text-sm font-medium text-theme-secondary mb-2">Section</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full px-3 py-2 pr-8 bg-theme-surface border-2 border-theme rounded-lg text-theme-primary focus:outline-none focus:border-module-fg dark:focus:border-module-fg focus:ring-2 focus:ring-module-fg/20 shadow-sm hover:border-gray-400 dark:hover:border-neutral-600 transition-colors appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                }}
              >
                <option value="">No section</option>
                {sections
                  .slice()
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="bg-theme-surface/50 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-theme-tertiary">
                <Clock className="w-4 h-4 inline mr-1" />
                {netHours}h net
              </span>
              {estimatedCost > 0 && (
                <span className="text-theme-tertiary">
                  <PoundSterling className="w-4 h-4 inline mr-1" />
                  £{estimatedCost.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between p-4 border-t border-theme">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }} 
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg"
          >
            Delete
          </button>
          <div className="flex gap-3">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }} 
              className="px-4 py-2 bg-theme-surface hover:bg-theme-hover rounded-lg text-theme-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log('Save Shift button clicked:', { startTime, endTime, breakMins, selectedStaff, netHours });
                onSave({ 
                  start_time: startTime, 
                  end_time: endTime, 
                  break_minutes: breakMins,
                  net_hours: netHours,
                  profile_id: selectedStaff || null,
                  ...(sectionsEnabled ? { section_id: selectedSectionId || null } : {}),
                  estimated_cost: Math.round(estimatedCost * 100),
                });
              }}
              className="px-4 py-2 !bg-transparent border border-module-fg text-module-fg hover:shadow-[0_0_12px_rgba(var(--module-fg-rgb),0.7)] rounded-lg font-medium transition-all duration-200 ease-in-out hover:!bg-transparent"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DRAG AND DROP COMPONENTS
// ============================================

function DroppableDayCell({
  id,
  personId,
  dateStr,
  children,
  className,
  onClick,
  title,
}: {
  id: string;
  personId: string;
  dateStr: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={title}
      onKeyDown={(e) => {
        // Make the div behave like a real button for accessibility
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`${className} ${isOver ? 'bg-module-fg/[0.20] border-module-fg' : ''}`}
    >
      {children}
    </div>
  );
}

function SortableStaffRow({
  item,
  index,
  person,
  weeklyHours,
  contracted,
  canManageRota,
  weekDays,
  shifts,
  onAddShift,
  onEditShift,
  onCopyShift,
  onSetCopyingShift,
  isDateClosed,
  isStaffOnLeave,
}: {
  item: RosterItem;
  index: number;
  person: Staff;
  weeklyHours: number;
  contracted: number;
  canManageRota: boolean;
  weekDays: Date[];
  shifts: Shift[];
  onAddShift: (staffId: string, date: Date) => void;
  onEditShift: (shift: Shift) => void;
  onCopyShift: (shiftId: string, date: string) => void;
  onSetCopyingShift: (shift: Shift) => void;
  isDateClosed: (dateStr: string) => boolean;
  isStaffOnLeave: (profileId: string, dateStr: string) => boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `staff-${person.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="grid grid-cols-[240px_80px_repeat(7,minmax(0,1fr))]">
      {/* Name cell */}
      <div className="px-3 py-1.5 border-r border-theme bg-theme-surface-elevated">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {canManageRota && (
                <button
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing text-theme-tertiary hover:text-theme-primary p-1"
                  title="Drag to reorder"
                >
                  <Grip className="w-4 h-4" />
                </button>
              )}
              <div className="min-w-0">
                <Link
                  href={`/dashboard/people/${person.id}`}
                  className="block text-sm font-semibold text-theme-primary truncate hover:text-module-fg transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="View employee profile"
                >
                  {person.full_name}
                </Link>
                {person.position_title && (
                  <div className="text-[11px] text-theme-tertiary truncate mt-0.5">{person.position_title}</div>
                )}
                {person.isBorrowed && person.borrowedFromSiteName && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                      From {person.borrowedFromSiteName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hours column */}
      <div className="px-2 py-1.5 border-r border-theme bg-theme-surface-elevated flex items-center justify-center">
        <div className="text-[11px] text-theme-secondary font-medium text-center">
          {weeklyHours.toFixed(1)}h{contracted ? `/${contracted}h` : ''}
        </div>
      </div>

      {/* Day cells */}
      {weekDays.map((d) => {
        const ds = d.toISOString().split('T')[0];
        const isClosed = isDateClosed(ds);
        const isOnLeave = isStaffOnLeave(person.id, ds);
        const personShifts = shifts
          .filter((s) => s.profile_id === person.id && s.shift_date === ds)
          .slice()
          .sort((a, b) => a.start_time.localeCompare(b.start_time));

        return (
          <DroppableDayCell
            key={`${person.id}-${ds}`}
            id={`day:${ds}:${person.id}`}
            personId={person.id}
            dateStr={ds}
            onClick={() => {
              if (!isClosed && !isOnLeave) {
                onAddShift(person.id, new Date(ds));
              }
            }}
            className={`px-2 py-1.5 border-r border-theme text-left min-h-[52px] relative ${
              isClosed 
                ? 'bg-red-50 dark:bg-red-500/10 opacity-60 cursor-not-allowed' 
                : isOnLeave
                  ? 'bg-blue-50 dark:bg-blue-500/15 border-l-4 border-l-blue-500 dark:border-l-blue-400'
                  : 'hover:bg-theme-hover'
            }`}
            title={isOnLeave ? 'On leave' : isClosed ? 'Site closed' : undefined}
          >
            <SortableContext items={personShifts.map((s) => `shift-${s.id}`)}>
              <div className="space-y-1">
                {personShifts.map((s) => (
                  <SortableShift
                    key={s.id}
                    shift={s}
                    onEdit={onEditShift}
                    onCopy={onCopyShift}
                    onSetCopyingShift={onSetCopyingShift}
                  />
                ))}
                {personShifts.length === 0 && (
                  <div className={`text-[10px] ${isOnLeave ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-theme-secondary'}`}>
                    {isOnLeave ? '🏖️ Leave' : '+'}
                  </div>
                )}
              </div>
            </SortableContext>
          </DroppableDayCell>
        );
      })}
    </div>
  );
}

function SortableShift({
  shift,
  onEdit,
  onCopy,
  onSetCopyingShift,
}: {
  shift: Shift;
  onEdit: (shift: Shift) => void;
  onCopy: (shiftId: string, date: string) => void;
  onSetCopyingShift: (shift: Shift) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `shift-${shift.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    pointerEvents: isDragging ? 'none' as const : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'z-0' : ''}`}
    >
      {/* Top indicator strip for borrowed shifts */}
      {shift.isFromOtherSite && (
        <div className="absolute -top-0.5 left-0 right-0 h-1 bg-blue-500 rounded-t-md z-10" />
      )}
      
      <div
        className={`px-2 py-0.5 rounded-md group/shift cursor-pointer ${
          shift.isFromOtherSite
            ? 'bg-blue-500/20 border-2 border-blue-500 hover:border-blue-400'
            : 'bg-theme-surface/60 border border-theme hover:border-neutral-600'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onEdit(shift);
        }}
      >
      <div className="w-full text-left pr-20">
        <div className={`text-[10px] font-medium ${shift.isFromOtherSite ? 'text-blue-400' : 'text-theme-primary'}`}>
          {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
          {shift.isFromOtherSite && shift.otherSiteName && (
            <span className="ml-1 inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 bg-blue-500/30 text-blue-100 rounded font-semibold border border-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
                <path d="M10 6h4"/>
                <path d="M10 10h4"/>
                <path d="M10 14h4"/>
                <path d="M10 18h4"/>
              </svg>
              @ {shift.otherSiteName}
            </span>
          )}
        </div>
      </div>
      {/* Quick actions - always visible */}
      <div className="absolute top-0.5 right-0.5 flex gap-0.5 bg-theme-surface rounded border border-theme">
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="p-1 rounded hover:bg-theme-hover text-theme-secondary hover:text-theme-primary transition-colors cursor-grab active:cursor-grabbing"
          title="Drag to move shift"
        >
          <Grip className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCopy(shift.id, shift.shift_date);
          }}
          className="p-1 rounded hover:bg-theme-hover text-theme-secondary hover:text-theme-primary transition-colors"
          title="Duplicate on same day"
        >
          <Copy className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSetCopyingShift(shift);
          }}
          className="p-1 rounded hover:bg-theme-hover text-theme-secondary hover:text-module-fg transition-colors"
          title="Copy to other days"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
      {/* Shift length below */}
      <div className={`text-[9px] mt-0.5 ${shift.isFromOtherSite ? 'text-blue-300' : 'text-theme-tertiary'}`}>
        {getShiftNetHours(shift).toFixed(1)}h
      </div>
    </div>
    </div>
  );
}

// Lightweight drag overlay preview — rendered via portal so it floats above everything
function ShiftDragPreview({ shift }: { shift: Shift }) {
  return (
    <div className="px-3 py-1.5 rounded-lg bg-theme-surface border-2 border-module-fg shadow-lg shadow-black/30 opacity-95 min-w-[120px] pointer-events-none">
      <div className="text-[11px] font-semibold text-module-fg">
        {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
      </div>
      <div className="text-[10px] text-theme-secondary truncate max-w-[160px]">
        {shift.profile_name || 'Open shift'}
      </div>
      <div className="text-[9px] text-theme-tertiary">
        {getShiftNetHours(shift).toFixed(1)}h
      </div>
    </div>
  );
}

// ============================================
// FORECAST MODAL (ONE METRIC AT A TIME)
// ============================================

function ForecastModal({
  weekDays,
  forecasts,
  onSaveDay,
  onClose,
}: {
  weekDays: Date[];
  forecasts: Record<string, DayForecast>;
  onSaveDay: (dateStr: string, data: DayForecast) => Promise<void>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'hours' | 'sales'>('hours');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const d of weekDays) {
      const ds = d.toISOString().split('T')[0];
      const f = forecasts[ds];
      next[ds] =
        mode === 'hours'
          ? (f?.target_hours ? String(f.target_hours) : '')
          : (f?.predicted_revenue ? String((f.predicted_revenue / 100).toFixed(0)) : '');
    }
    setDraft(next);
  }, [weekDays, forecasts, mode]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const tasks = weekDays.map((d) => {
        const ds = d.toISOString().split('T')[0];
        const existing = forecasts[ds] || { predicted_revenue: 0, target_hours: 0, notes: '' };
        const raw = (draft[ds] || '').trim();

        if (mode === 'hours') {
          const hours = raw ? parseFloat(raw) : 0;
          // Validate: reasonable max is 24 hours per day (168 hours per week)
          // But allow up to 200 hours per day for edge cases (1400 per week)
          if (hours > 200) {
            alert(`Warning: ${hours} hours seems unusually high for a single day. Maximum recommended is 24 hours per day.`);
          }
          return onSaveDay(ds, { ...existing, target_hours: hours || 0 });
        }

        const pounds = raw ? parseFloat(raw) : 0;
        return onSaveDay(ds, { ...existing, predicted_revenue: Math.round((pounds || 0) * 100) });
      });

      await Promise.all(tasks);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-theme-surface rounded-xl border border-theme w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <div>
            <h3 className="text-lg font-semibold text-theme-primary">Weekly forecast</h3>
            <p className="text-sm text-theme-tertiary">
              Choose one: {mode === 'hours' ? 'target hours' : 'predicted sales'}.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-theme-surface rounded-lg">
            <X className="w-5 h-5 text-theme-tertiary" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('hours')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'hours'
                  ? 'bg-transparent border border-module-fg text-module-fg'
                  : 'bg-theme-surface-elevated border border-theme text-theme-tertiary hover:text-theme-primary'
              }`}
            >
              Target hours
            </button>
            <button
              type="button"
              onClick={() => setMode('sales')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'sales'
                  ? 'bg-transparent border border-module-fg text-module-fg'
                  : 'bg-theme-surface-elevated border border-theme text-theme-tertiary hover:text-theme-primary'
              }`}
            >
              Predicted sales
            </button>

            <button
              type="button"
              onClick={() => {
                const next: Record<string, string> = {};
                for (const d of weekDays) {
                  next[d.toISOString().split('T')[0]] = '';
                }
                setDraft(next);
              }}
              className="ml-auto text-[11px] font-semibold text-theme-tertiary hover:text-theme-primary"
            >
              Clear week
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((d) => {
              const ds = d.toISOString().split('T')[0];
              return (
                <div key={ds} className="bg-theme-surface/50 border border-theme rounded-lg p-2">
                  <div className="text-[11px] text-theme-tertiary mb-1">
                    {d.toLocaleDateString('en-GB', { weekday: 'short' })} {d.getDate()}
                  </div>
                  <input
                    value={draft[ds] || ''}
                    inputMode={mode === 'hours' ? 'decimal' : 'numeric'}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [ds]: e.target.value }))}
                    className="w-full px-2 py-1 bg-theme-surface border border-theme rounded text-sm text-theme-primary focus:border-module-fg focus:ring-1 focus:ring-module-fg"
                    placeholder={mode === 'hours' ? '0' : '0'}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-theme">
          <button onClick={onClose} className="px-4 py-2 bg-theme-surface hover:bg-theme-hover rounded-lg text-theme-primary">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 !bg-transparent border border-module-fg text-module-fg hover:shadow-[0_0_12px_rgba(var(--module-fg-rgb),0.7)] rounded-lg font-medium transition-all duration-200 ease-in-out hover:!bg-transparent disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SHIFT CARD
// ============================================

function ShiftCard({ 
  shift, 
  onClick,
  onAssignStaff,
  onDuplicate,
  onCopyTo,
  staff
}: { 
  shift: Shift; 
  onClick: () => void;
  onAssignStaff?: (staffId: string) => void;
  onDuplicate?: () => void;
  onCopyTo?: () => void;
  staff?: Staff[];
}) {
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const actionsBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative group">
      {/* Top indicator strip for borrowed shifts */}
      {shift.isFromOtherSite && (
        <div className="absolute -top-1 left-0 right-0 h-1 bg-blue-500 rounded-t-lg" />
      )}
      
      <div
        className={`relative w-full px-2.5 py-2 rounded-lg border-l-[3px] text-left transition-colors ${
          shift.isFromOtherSite 
            ? 'bg-blue-500/20 hover:bg-module-fg/10 border-2 border-blue-500'
            : 'bg-theme-surface/70 hover:bg-theme-surface border border-transparent'
        }`}
        style={{ borderLeftColor: shift.isFromOtherSite ? '#3b82f6' : shift.color }}
      >
        {/* Actions dropdown */}
        <button
          ref={actionsBtnRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setShowActionsMenu((v) => !v);
          }}
          className="absolute top-1.5 right-1.5 p-1 rounded-md hover:bg-theme-surface/40 text-theme-tertiary hover:text-theme-primary transition-colors"
          title="Actions"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Main click target */}
        <button
          type="button"
          onClick={onClick}
          className="w-full text-left pr-8"
          title="Edit shift"
        >
          <div className="flex items-baseline justify-between gap-2">
            <div className={`min-w-0 text-[11px] font-semibold leading-3 whitespace-normal break-words line-clamp-2 ${
              shift.isFromOtherSite
                ? 'text-blue-400'
                : shift.profile_id 
                  ? 'text-theme-primary' 
                  : (shift.role_required?.includes('TRIAL') ? 'text-module-fg' : 'text-amber-300')
            }`}>
              {(() => {
                const displayText = shift.profile_id 
                  ? shift.profile_name 
                  : (shift.role_required?.includes('TRIAL') ? shift.role_required : 'Open shift');
                
                // Debug logging for trial shifts
                if (!shift.profile_id && shift.role_required) {
                  console.log('Shift display:', {
                    id: shift.id,
                    role_required: shift.role_required,
                    includes_TRIAL: shift.role_required?.includes('TRIAL'),
                    displayText,
                    color: shift.color
                  });
                }
                
                return displayText;
              })()}
            </div>
          </div>
          <div className="mt-0.5 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className={`font-medium ${shift.isFromOtherSite ? 'text-blue-300' : 'text-theme-secondary'}`}>
                {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
              </span>
              {shift.isFromOtherSite && shift.otherSiteName && (
                <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 bg-blue-500/30 text-blue-100 rounded font-semibold border border-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
                    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
                    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
                    <path d="M10 6h4"/>
                    <path d="M10 10h4"/>
                    <path d="M10 14h4"/>
                    <path d="M10 18h4"/>
                  </svg>
                  @ {shift.otherSiteName}
                </span>
              )}
            </div>
          </div>
        </button>

        {/* Hours bottom-right */}
        <div className="absolute bottom-0.5 right-1.5 text-[9px] text-theme-tertiary font-medium">
          {getShiftNetHours(shift).toFixed(1)}h
        </div>

        {/* Open shift: quick assign link (but not for trial shifts) */}
        {!shift.profile_id && !shift.role_required?.includes('TRIAL') && onAssignStaff && staff && staff.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowAssignMenu(!showAssignMenu);
            }}
            className="mt-1 text-[10px] font-semibold text-module-fg hover:text-module-fg/80"
            title="Assign staff"
          >
            Assign
          </button>
        )}
      </div>

      {/* Actions menu (portal so it never hides behind sidebar/overflow) */}
      {mounted && showActionsMenu && (() => {
        const rect = actionsBtnRef.current?.getBoundingClientRect();
        if (!rect) return null;

        return createPortal(
          <>
            <div
              className="fixed inset-0"
              style={{ zIndex: 9998 }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setShowActionsMenu(false);
              }}
            />
            <div
              className="fixed bg-theme-surface border border-theme rounded-lg shadow-xl min-w-[180px] overflow-hidden"
              style={{ zIndex: 9999, top: rect.bottom + 6, left: Math.max(8, rect.right - 180) }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowActionsMenu(false);
                  onClick();
                }}
                className="w-full px-3 py-2 text-left text-xs text-theme-primary hover:bg-theme-surface transition-colors"
              >
                Edit
              </button>

              {onDuplicate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowActionsMenu(false);
                    onDuplicate();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-module-fg hover:bg-theme-surface transition-colors"
                >
                  Duplicate (same day)
                </button>
              )}

              {onCopyTo && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowActionsMenu(false);
                    onCopyTo();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-theme-primary hover:bg-theme-surface transition-colors"
                >
                  Copy to…
                </button>
              )}

              {!shift.profile_id && !shift.role_required?.includes('TRIAL') && onAssignStaff && staff && staff.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowActionsMenu(false);
                    setShowAssignMenu(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-theme-primary hover:bg-theme-surface transition-colors"
                >
                  Assign…
                </button>
              )}
            </div>
          </>,
          document.body
        );
      })()}
      
      {showAssignMenu && staff && staff.length > 0 && (
        <>
          <div 
            className="fixed inset-0 z-20" 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowAssignMenu(false);
            }}
          />
          <div 
            className="absolute top-full left-0 right-0 mt-1 bg-theme-surface border border-theme rounded-lg shadow-xl z-30 max-h-48 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[10px] text-theme-tertiary border-b border-theme">Assign to:</div>
            {staff.map(s => (
              <button
                key={s.id}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  console.log('Assigning staff to shift:', { shiftId: shift.id, staffId: s.id, staffName: s.full_name });
                  if (onAssignStaff) {
                    onAssignStaff(s.id);
                  }
                  setShowAssignMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-xs text-theme-secondary hover:bg-theme-surface flex items-center gap-2 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 dark:from-blue-400 to-blue-500 flex items-center justify-center text-theme-primary text-[8px] font-medium flex-shrink-0">
                  {s.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-theme-primary font-medium truncate">{s.full_name}</div>
                  {s.position_title && (
                    <div className="text-[10px] text-theme-tertiary truncate">{s.position_title}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// MANAGE SECTIONS MODAL
// ============================================

function ManageSectionsModal({
  companyId,
  siteId,
  sections,
  sectionsEnabled,
  onClose,
  onReload,
}: {
  companyId: string;
  siteId: string;
  sections: RotaSection[];
  sectionsEnabled: boolean;
  onClose: () => void;
  onReload: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('rgb(var(--module-fg))');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!sectionsEnabled) {
      alert('Sections are not enabled in the database yet. Please apply the rota sections migration first.');
      return;
    }
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('rota_sections').insert({
        company_id: companyId,
        site_id: siteId,
        name: name.trim(),
        color,
        sort_order: (sections.reduce((max, s) => Math.max(max, s.sort_order || 0), 0) || 0) + 1,
        is_active: true,
      });

      if (error) {
        console.error('Error creating section:', error);
        alert(`Failed to create section: ${error.message}`);
        return;
      }

      setName('');
      await onReload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sectionId: string) => {
    if (!sectionsEnabled) {
      alert('Sections are not enabled in the database yet. Please apply the rota sections migration first.');
      return;
    }
    if (!confirm('Delete this section? Shifts will be moved to Unsectioned.')) return;
    try {
      const { error } = await supabase.from('rota_sections').delete().eq('id', sectionId);
      if (error) {
        console.error('Error deleting section:', error);
        alert(`Failed to delete section: ${error.message}`);
        return;
      }
      await onReload();
    } catch (err: any) {
      console.error('Exception deleting section:', err);
      alert(`Failed to delete section: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-theme-surface rounded-xl border border-theme w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <div>
            <h3 className="text-lg font-semibold text-theme-primary">Rota Sections</h3>
            <p className="text-sm text-theme-tertiary">Create sections like FOH / BOH / Bar and group shifts.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-theme-surface rounded-lg">
            <X className="w-5 h-5 text-theme-tertiary" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!sectionsEnabled && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm">
              Sections aren’t enabled in your database yet. Run the migration `supabase/migrations/20251212000001_rota_sections.sql` then refresh.
            </div>
          )}
          <div className="bg-theme-surface/50 rounded-lg p-3">
            <p className="text-xs text-theme-tertiary mb-2">Add section</p>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. FOH"
                className="flex-1 px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-module-fg focus:ring-1 focus:ring-module-fg transition-colors"
              />
              <button
                type="button"
                onClick={() => {
                  const colors = ['rgb(var(--module-fg))', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
                  const idx = colors.indexOf(color);
                  setColor(colors[(idx + 1) % colors.length]);
                }}
                className="w-10 h-10 rounded-lg border border-theme"
                style={{ backgroundColor: color }}
                title="Click to change color"
              />
              <button
                type="button"
                disabled={!sectionsEnabled || saving || !name.trim()}
                onClick={handleCreate}
                className="px-4 py-2 !bg-transparent border border-module-fg text-module-fg hover:shadow-[0_0_12px_rgba(var(--module-fg-rgb),0.7)] rounded-lg font-medium transition-all duration-200 ease-in-out hover:!bg-transparent disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {sections
              .slice()
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-theme-surface rounded-lg border border-theme">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-6 rounded" style={{ backgroundColor: s.color }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-theme-primary truncate">{s.name}</p>
                      <p className="text-xs text-theme-tertiary">Order: {s.sort_order ?? 0}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm"
                    disabled={!sectionsEnabled}
                  >
                    Delete
                  </button>
                </div>
              ))}

            {sections.length === 0 && (
              <p className="text-sm text-theme-tertiary text-center py-8">No sections yet</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-theme">
          <button onClick={onClose} className="px-4 py-2 bg-theme-surface hover:bg-theme-hover rounded-lg text-theme-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COPY SHIFT MODAL
// ============================================

function CopyShiftModal({
  shift,
  weekDays,
  onCopyToDates,
  onClose,
}: {
  shift: Shift;
  weekDays: Date[];
  onCopyToDates: (dateStrs: string[]) => void;
  onClose: () => void;
}) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) => (prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-theme-surface rounded-xl border border-theme w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <div>
            <h3 className="text-lg font-semibold text-theme-primary">Copy shift to…</h3>
            <div className="text-sm text-theme-tertiary">
              <div className="flex items-center gap-2">
                <span>{shift.profile_name || 'Open shift'} • {formatTime(shift.start_time)}–{formatTime(shift.end_time)}</span>
                {shift.isFromOtherSite && shift.otherSiteName && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30" title={`Working at ${shift.otherSiteName}`}>
                    @ {shift.otherSiteName}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-theme-surface rounded-lg">
            <X className="w-5 h-5 text-theme-tertiary" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-theme-tertiary">Select days</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDates(weekDays.map((d) => d.toISOString().split('T')[0]))}
                className="text-[10px] font-semibold text-theme-tertiary hover:text-theme-primary"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedDates([])}
                className="text-[10px] font-semibold text-theme-tertiary hover:text-theme-primary"
              >
                Clear
              </button>
            </div>
          </div>

          {weekDays.map((d) => {
            const ds = d.toISOString().split('T')[0];
            const isSame = ds === shift.shift_date;
            const checked = selectedDates.includes(ds);
            return (
              <label
                key={ds}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-theme-surface hover:bg-theme-hover text-theme-primary text-sm transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDate(ds)}
                    className="w-4 h-4 rounded border-neutral-600 bg-theme-surface text-module-fg focus:ring-module-fg focus:ring-offset-0"
                  />
                  <span>
                    {d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </span>
                </div>
                {isSame && <span className="text-[10px] text-theme-tertiary">Same day</span>}
              </label>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-theme">
          <button
            type="button"
            disabled={selectedDates.length === 0}
            onClick={() => onCopyToDates(selectedDates)}
            className="px-4 py-2 !bg-transparent border border-module-fg text-module-fg hover:shadow-[0_0_12px_rgba(var(--module-fg-rgb),0.7)] rounded-lg font-medium transition-all duration-200 ease-in-out hover:!bg-transparent disabled:opacity-50"
          >
            Copy ({selectedDates.length})
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-theme-surface hover:bg-theme-hover rounded-lg text-theme-primary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// INSERT DIVIDER MODAL
// ============================================

function InsertDividerModal({
  sections,
  onSelect,
  onClose,
}: {
  sections: RotaSection[];
  onSelect: (section: RotaSection) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-theme-surface rounded-xl border border-theme w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <div>
            <h3 className="text-lg font-semibold text-theme-primary">Insert divider</h3>
            <p className="text-sm text-theme-tertiary">Choose a section label to insert into the roster.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-theme-surface rounded-lg">
            <X className="w-5 h-5 text-theme-tertiary" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {sections
            .slice()
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-theme-surface hover:bg-theme-hover text-theme-primary text-sm transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-6 rounded" style={{ backgroundColor: s.color }} />
                  <span className="truncate">{s.name}</span>
                </div>
                <span className="text-[10px] text-theme-tertiary">Insert</span>
              </button>
            ))}
          {sections.length === 0 && (
            <div className="text-sm text-theme-tertiary text-center py-8">
              No sections yet. Create them first via the Sections button.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-theme">
          <button onClick={onClose} className="px-4 py-2 bg-theme-surface hover:bg-theme-hover rounded-lg text-theme-primary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function RotaBuilderPage() {
  const { profile, role, companyId } = useAppContext();
  const siteContext = useSiteContext();
  const searchParams = useSearchParams();
  const mountedRef = useRef(true);
  const { isMobile } = useIsMobile();

  // Mobile state - selected day for single day view
  const [mobileSelectedDay, setMobileSelectedDay] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // Normalize role to a stable "key" format (e.g. "General Manager" -> "general_manager")
  const roleKey = (role || profile?.app_role || '')
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '_');

  const isManagerLike = roleKey === 'manager' || roleKey === 'general_manager';
  const canManageRota = ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'ops_manager'].includes(roleKey);
  const canApproveRota = ['admin', 'owner', 'area_manager', 'ops_manager'].includes(roleKey);
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const [weekStarting, setWeekStarting] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Data state
  const [rota, setRota] = useState<{ id: string; status: string } | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [templates] = useState<ShiftTemplate[]>(DEFAULT_TEMPLATES);
  const [forecasts, setForecasts] = useState<Record<string, DayForecast>>({});
  const [sections, setSections] = useState<RotaSection[]>(FALLBACK_SECTIONS);
  const [sectionsEnabled, setSectionsEnabled] = useState(false);
  const [siteAssignments, setSiteAssignments] = useState<Map<string, { borrowed_site_id: string; start_date: string; end_date: string | null }[]>>(new Map());
  const [plannedClosures, setPlannedClosures] = useState<PlannedClosure[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  // UI state
  const [addingShiftDate, setAddingShiftDate] = useState<Date | null>(null);
  const [addingShiftSectionId, setAddingShiftSectionId] = useState<string | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [assigningToShift, setAssigningToShift] = useState<string | null>(null);
  const [copyingDayFrom, setCopyingDayFrom] = useState<string | null>(null);
  const [showManageSections, setShowManageSections] = useState(false);
  const [copyingShift, setCopyingShift] = useState<Shift | null>(null);
  const [viewMode, setViewMode] = useState<'people' | 'sections'>('people');
  const [addingShiftStaffId, setAddingShiftStaffId] = useState<string | null>(null);
  const [rosterOrder, setRosterOrder] = useState<RosterItem[]>([]);
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notifyingOpenShifts, setNotifyingOpenShifts] = useState(false);
  const [submittingForApproval, setSubmittingForApproval] = useState(false);
  const [approvingRota, setApprovingRota] = useState(false);
  // publishingRota state removed — approved is now the final visible state
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  // Mobile shift action sheet state
  const [selectedMobileShift, setSelectedMobileShift] = useState<Shift | null>(null);
  const [isShiftActionOpen, setIsShiftActionOpen] = useState(false);
  const [userAttendanceStatus, setUserAttendanceStatus] = useState<{ onShift: boolean } | null>(null);

  // Close actions dropdown on outside click / escape
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!actionsMenuOpen) return;
      const el = actionsMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setActionsMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (!actionsMenuOpen) return;
      if (e.key === 'Escape') setActionsMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [actionsMenuOpen]);

  // Load attendance status for current user (for mobile shift actions)
  useEffect(() => {
    async function checkAttendance() {
      try {
        const response = await fetch('/api/attendance/status');
        if (response.ok) {
          const data = await response.json();
          setUserAttendanceStatus({ onShift: !!data.onShift });
        }
      } catch {
        // Silently fail — actions just won't show clock in/out
      }
    }
    if (profile?.id && isMobile) checkAttendance();
  }, [profile?.id, isMobile]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ============================================
  // DATA LOADING
  // ============================================

  const loadSites = useCallback(async () => {
    if (!companyId || siteContext.loading) return;
    
    try {
      // Use accessible sites from SiteContext instead of loading all company sites
      const accessibleSites = siteContext.accessibleSites;
      
      if (!mountedRef.current) return;
      
      if (accessibleSites && accessibleSites.length > 0) {
        // Convert AccessibleSite[] to { id, name }[]
        const sitesList = accessibleSites.map(site => ({
          id: site.id,
          name: site.name
        }));
        setSites(sitesList);
        
        // Check for site query parameter first, then use SiteContext's selectedSiteId or home site
        const siteParam = searchParams?.get('site');
        const siteFromParam = siteParam ? accessibleSites.find(s => s.id === siteParam) : null;
        const siteContextSite = siteContext.selectedSiteId !== 'all' 
          ? accessibleSites.find(s => s.id === siteContext.selectedSiteId)
          : null;
        const homeSite = accessibleSites.find(s => s.is_home);
        const defaultSiteId = siteFromParam?.id || siteContextSite?.id || homeSite?.id || accessibleSites[0]?.id;
        
        setSelectedSite((prev) => {
          // Validate previous selection is still accessible
          if (prev && accessibleSites.find(s => s.id === prev)) {
            return prev; // Keep existing selection if still accessible
          }
          // If prev is null or not accessible, set to default
          return defaultSiteId || null;
        });
      } else {
        setSites([]);
        setSelectedSite(null);
      }
    } catch (err: any) {
      console.error('Error in loadSites:', err);
      setError(err.message || 'Failed to load sites');
      setSites([]);
    }
  }, [companyId, siteContext.accessibleSites, siteContext.selectedSiteId, siteContext.loading, searchParams]);

  useEffect(() => {
    if (companyId && !siteContext.loading && sites.length === 0 && !error) {
      loadSites();
    }
     
  }, [companyId, siteContext.loading, siteContext.accessibleSites]);

  useEffect(() => {
    if (selectedSite && companyId && !siteContext.loading) {
      loadData();
    }
     
  }, [selectedSite, weekStarting, companyId, siteContext.loading, siteContext.accessibleSites]);

  const loadData = useCallback(async () => {
    if (!selectedSite || !companyId) return;
    if (!mountedRef.current) return;
    
    // Validate user can access this site
    const canAccess = siteContext.accessibleSites.some(site => site.id === selectedSite);
    if (!canAccess && siteContext.selectedSiteId !== 'all') {
      setError('You do not have access to this site. Please select a site you have access to.');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const weekStr = weekStarting.toISOString().split('T')[0];

      // 1. Get or create rota
      let rotaData: { id: string; status: string } | null = null;
      
      const { data: existingRota, error: rotaErr } = await supabase
        .from('rotas')
        .select('id, status')
        .eq('company_id', companyId)
        .eq('site_id', selectedSite)
        .eq('week_starting', weekStr)
        .maybeSingle();

      if (rotaErr && rotaErr.code !== 'PGRST116') throw rotaErr;

      if (existingRota) {
        rotaData = existingRota;
      } else {
        // Only managers/admins/owners can create rotas
        const canCreateRota = role && ['Admin', 'Owner', 'Manager', 'General Manager', 'Area Manager', 'Ops Manager', 'Super Admin'].includes(role);
        
        if (canCreateRota) {
          const { data: newRota, error: createErr } = await supabase
            .from('rotas')
            .insert({
              company_id: companyId,
              site_id: selectedSite,
              week_starting: weekStr,
              status: 'draft',
              total_hours: 0,
              total_cost: 0
            })
            .select('id, status')
            .single();

          if (createErr) throw createErr;
          rotaData = newRota;
        } else {
          // Staff members can't create rotas - show message that rota doesn't exist yet
          setError('No rota exists for this site and week. Please contact a manager to create one.');
          setLoading(false);
          return;
        }
      }

      if (!mountedRef.current) return;
      setRota(rotaData);

      // 2. Load employee site assignments (needed before loading shifts to include borrowed employee shifts)
      let assignmentsMap = new Map<string, { borrowed_site_id: string; start_date: string; end_date: string | null }[]>();
      try {
        const { data: assignmentsData, error: assignmentsErr } = await supabase
          .from('employee_site_assignments')
          .select('profile_id, borrowed_site_id, start_date, end_date')
          .eq('company_id', companyId)
          .eq('is_active', true);
        
        if (assignmentsErr) {
          console.warn('Could not load site assignments (may not be deployed yet):', assignmentsErr);
        } else if (assignmentsData) {
          assignmentsData.forEach((a: any) => {
            const existing = assignmentsMap.get(a.profile_id) || [];
            assignmentsMap.set(a.profile_id, [...existing, {
              borrowed_site_id: a.borrowed_site_id,
              start_date: a.start_date,
              end_date: a.end_date,
            }]);
          });
        }
      } catch (assignmentsError) {
        console.warn('Exception loading site assignments:', assignmentsError);
      }
      
      if (!mountedRef.current) return;
      setSiteAssignments(assignmentsMap);

      // 3. Load shifts
      if (rotaData) {
        const baseSelect = `
          id, profile_id, shift_date, start_time, end_time,
          break_minutes, net_hours, estimated_cost,
          role_required, color, status, notes,
          profiles:profile_id (full_name, avatar_url)
        `;

        const selectWithSections = `
          ${baseSelect},
          section_id,
          rota_sections:section_id (id, name, color, sort_order)
        `;

        // Try with sections first; fall back gracefully if the migration hasn't been applied yet
        const withSectionsResult = await supabase
          .from('rota_shifts')
          .select(selectWithSections)
          .eq('rota_id', rotaData.id)
          .order('shift_date')
          .order('start_time');

        if (withSectionsResult.error) {
          const msg = withSectionsResult.error.message || '';
          const looksLikeMissingSections =
            msg.toLowerCase().includes('section_id') ||
            msg.toLowerCase().includes('rota_sections') ||
            msg.toLowerCase().includes('does not exist');

          if (!looksLikeMissingSections) {
            throw withSectionsResult.error;
          }

          console.warn('Sections not available yet; loading shifts without sections:', withSectionsResult.error);
          if (!mountedRef.current) return;
          setSectionsEnabled(false);

          const fallbackResult = await supabase
            .from('rota_shifts')
            .select(baseSelect)
            .eq('rota_id', rotaData.id)
            .order('shift_date')
            .order('start_time');

          if (fallbackResult.error) throw fallbackResult.error;

          if (!mountedRef.current) return;
          const mainShiftsFallback = (fallbackResult.data || []).map((s: any) => ({
            ...s,
            profile_name: s.profiles?.full_name,
            profile_avatar: s.profiles?.avatar_url,
            estimated_cost: s.estimated_cost || 0,
            section_id: null,
            section_name: null,
            section_color: null,
            isFromOtherSite: false,
          }));
          
          // Identify borrowed employees and all employees with assignments
          const borrowedEmployeeIds = Array.from(assignmentsMap.keys()).filter(empId => {
            const assignments = assignmentsMap.get(empId);
            return assignments?.some(a => a.borrowed_site_id === selectedSite);
          });
          
          const allAssignedEmployeeIds = Array.from(assignmentsMap.keys());
          
          console.log('🔍 Cross-site shift fetch (fallback):', {
            selectedSite,
            weekStr,
            borrowedEmployeeIds: borrowedEmployeeIds.length,
            allAssignedEmployeeIds: allAssignedEmployeeIds.length
          });
          
          // Fetch shifts from home sites for borrowed employees (fallback path)
          if (borrowedEmployeeIds.length > 0 && rotaData) {
            const { data: borrowedProfiles } = await supabase
              .from('profiles')
              .select('id, home_site')
              .in('id', borrowedEmployeeIds)
              .not('home_site', 'is', null);
            
            if (borrowedProfiles) {
              const homeSiteIds = [...new Set(borrowedProfiles.map(p => p.home_site).filter(Boolean))];
              
              for (const homeSiteId of homeSiteIds) {
                const { data: homeRota } = await supabase
                  .from('rotas')
                  .select('id')
                  .eq('company_id', companyId)
                  .eq('site_id', homeSiteId)
                  .eq('week_starting', weekStr)
                  .maybeSingle();
                
                if (homeRota) {
                  const empIdsForSite = borrowedProfiles
                    .filter(p => p.home_site === homeSiteId)
                    .map(p => p.id);
                  
                  const { data: homeShifts } = await supabase
                    .from('rota_shifts')
                    .select(baseSelect)
                    .eq('rota_id', homeRota.id)
                    .in('profile_id', empIdsForSite)
                    .order('shift_date')
                    .order('start_time');
                  
                  if (homeShifts && homeShifts.length > 0) {
                    const mappedHomeShifts = homeShifts.map((s: any) => ({
                      ...s,
                      profile_name: s.profiles?.full_name,
                      profile_avatar: s.profiles?.avatar_url,
                      estimated_cost: s.estimated_cost || 0,
                      section_id: null,
                      section_name: null,
                      section_color: null,
                      isFromOtherSite: true,
                      otherSiteName: sites.find(site => site.id === homeSiteId)?.name || 'Home Site',
                    }));
                    
                    mainShiftsFallback.push(...mappedHomeShifts);
                  }
                }
              }
            }
          }
          
          // Also fetch shifts for ANY employee who has borrowed site assignments (fallback)
          if (allAssignedEmployeeIds.length > 0) {
            const employeeBorrowedSites = new Map<string, string[]>();
            
            allAssignedEmployeeIds.forEach(empId => {
              const assignments = assignmentsMap.get(empId);
              const borrowedSites = assignments?.map(a => a.borrowed_site_id) || [];
              if (borrowedSites.length > 0) {
                employeeBorrowedSites.set(empId, borrowedSites);
              }
            });
            
            const allBorrowedSiteIds = new Set<string>();
            employeeBorrowedSites.forEach((siteIds) => {
              siteIds.forEach(siteId => {
                if (siteId !== selectedSite) {
                  allBorrowedSiteIds.add(siteId);
                }
              });
            });
            
            for (const borrowedSiteId of Array.from(allBorrowedSiteIds)) {
              const { data: borrowedRota } = await supabase
                .from('rotas')
                .select('id')
                .eq('company_id', companyId)
                .eq('site_id', borrowedSiteId)
                .eq('week_starting', weekStr)
                .maybeSingle();
              
              if (borrowedRota) {
                const empIdsForBorrowedSite = allAssignedEmployeeIds.filter(empId => {
                  const borrowedSites = employeeBorrowedSites.get(empId) || [];
                  return borrowedSites.includes(borrowedSiteId);
                });
                
                if (empIdsForBorrowedSite.length === 0) continue;
                
                const { data: borrowedShifts } = await supabase
                  .from('rota_shifts')
                  .select(baseSelect)
                  .eq('rota_id', borrowedRota.id)
                  .in('profile_id', empIdsForBorrowedSite)
                  .order('shift_date')
                  .order('start_time');
                
                if (borrowedShifts && borrowedShifts.length > 0) {
                  const mappedBorrowedShifts = borrowedShifts.map((s: any) => ({
                    ...s,
                    profile_name: s.profiles?.full_name,
                    profile_avatar: s.profiles?.avatar_url,
                    estimated_cost: s.estimated_cost || 0,
                    section_id: null,
                    section_name: null,
                    section_color: null,
                    isFromOtherSite: true,
                    otherSiteName: sites.find(site => site.id === borrowedSiteId)?.name || 'Other Site',
                  }));
                  
                  mainShiftsFallback.push(...mappedBorrowedShifts);
                }
              }
            }
          }
          
          setShifts(mainShiftsFallback);
        } else {
          if (!mountedRef.current) return;
          setSectionsEnabled(true);
          const mainShifts = (withSectionsResult.data || []).map((s: any) => ({
            ...s,
            profile_name: s.profiles?.full_name,
            profile_avatar: s.profiles?.avatar_url,
            estimated_cost: s.estimated_cost || 0,
            section_name: s.rota_sections?.name || null,
            section_color: s.rota_sections?.color || null,
            isFromOtherSite: false, // Shifts from current site
          }));
          
          // For borrowed employees, also fetch their shifts from their home site
          // so both sites can see the full schedule
          const borrowedEmployeeIds = Array.from(assignmentsMap.keys()).filter(empId => {
            const assignments = assignmentsMap.get(empId);
            return assignments?.some(a => a.borrowed_site_id === selectedSite);
          });
          
          // Also get ALL employees who have any borrowed site assignments
          // This includes employees whose home is the current site but work elsewhere
          const allAssignedEmployeeIds = Array.from(assignmentsMap.keys());
          
          console.log('🔍 Cross-site shift fetch:', {
            selectedSite,
            weekStr,
            borrowedEmployeeIds: borrowedEmployeeIds.length,
            allAssignedEmployeeIds: allAssignedEmployeeIds.length,
            assignmentsMap: Array.from(assignmentsMap.entries()).map(([empId, assignments]) => ({
              empId,
              assignments: assignments.map(a => a.borrowed_site_id)
            }))
          });
          
          // Fetch shifts from home sites for borrowed employees
          // Query profiles to get home_site for borrowed employees
          if (borrowedEmployeeIds.length > 0 && rotaData) {
            const { data: borrowedProfiles } = await supabase
              .from('profiles')
              .select('id, home_site')
              .in('id', borrowedEmployeeIds)
              .not('home_site', 'is', null);
            
            if (borrowedProfiles) {
              const homeSiteIds = [...new Set(borrowedProfiles.map(p => p.home_site).filter(Boolean))];
              
              // Fetch rotas for home sites
              for (const homeSiteId of homeSiteIds) {
                const { data: homeRota } = await supabase
                  .from('rotas')
                  .select('id')
                  .eq('company_id', companyId)
                  .eq('site_id', homeSiteId)
                  .eq('week_starting', weekStr)
                  .maybeSingle();
                
                if (homeRota) {
                  // Get employee IDs for this home site
                  const empIdsForSite = borrowedProfiles
                    .filter(p => p.home_site === homeSiteId)
                    .map(p => p.id);
                  
                  // Fetch shifts for borrowed employees from their home site rota
                  const { data: homeShifts } = await supabase
                    .from('rota_shifts')
                    .select(selectWithSections)
                    .eq('rota_id', homeRota.id)
                    .in('profile_id', empIdsForSite)
                    .order('shift_date')
                    .order('start_time');
                  
                  if (homeShifts && homeShifts.length > 0) {
                    // Add home site shifts as "other site" shifts
                    const mappedHomeShifts = homeShifts.map((s: any) => ({
                      ...s,
                      profile_name: s.profiles?.full_name,
                      profile_avatar: s.profiles?.avatar_url,
                      estimated_cost: s.estimated_cost || 0,
                      section_name: s.rota_sections?.name || null,
                      section_color: s.rota_sections?.color || null,
                      isFromOtherSite: true, // Mark as from home site
                      otherSiteName: sites.find(site => site.id === homeSiteId)?.name || 'Home Site',
                    }));
                    
                    mainShifts.push(...mappedHomeShifts);
                  }
                }
              }
            }
          }
          
          // NEW: Also fetch shifts for ANY employee who has borrowed site assignments
          // This ensures we see shifts even if they don't have shifts at current site yet
          if (allAssignedEmployeeIds.length > 0) {
            // For each employee with assignments, check if they have borrowed sites
            const employeeBorrowedSites = new Map<string, string[]>();
            
            allAssignedEmployeeIds.forEach(empId => {
              const assignments = assignmentsMap.get(empId);
              const borrowedSites = assignments?.map(a => a.borrowed_site_id) || [];
              if (borrowedSites.length > 0) {
                employeeBorrowedSites.set(empId, borrowedSites);
              }
            });
            
            console.log('👥 Employees with borrowed sites:', Array.from(employeeBorrowedSites.entries()));
            
            // Collect all unique borrowed site IDs (excluding current site)
            const allBorrowedSiteIds = new Set<string>();
            employeeBorrowedSites.forEach((siteIds) => {
              siteIds.forEach(siteId => {
                if (siteId !== selectedSite) {
                  allBorrowedSiteIds.add(siteId);
                }
              });
            });
            
            console.log('🏢 Borrowed sites to check:', Array.from(allBorrowedSiteIds));
            
            // Fetch shifts from each borrowed site
            for (const borrowedSiteId of Array.from(allBorrowedSiteIds)) {
              const { data: borrowedRota } = await supabase
                .from('rotas')
                .select('id')
                .eq('company_id', companyId)
                .eq('site_id', borrowedSiteId)
                .eq('week_starting', weekStr)
                .maybeSingle();
              
              console.log(`📅 Rota for borrowed site ${borrowedSiteId}:`, borrowedRota);
              
              if (borrowedRota) {
                // Get employees who can work at this borrowed site
                const empIdsForBorrowedSite = allAssignedEmployeeIds.filter(empId => {
                  const borrowedSites = employeeBorrowedSites.get(empId) || [];
                  return borrowedSites.includes(borrowedSiteId);
                });
                
                console.log(`👤 Employees for borrowed site ${borrowedSiteId}:`, empIdsForBorrowedSite);
                
                if (empIdsForBorrowedSite.length === 0) continue;
                
                // Fetch shifts for these employees at the borrowed site
                const { data: borrowedShifts } = await supabase
                  .from('rota_shifts')
                  .select(selectWithSections)
                  .eq('rota_id', borrowedRota.id)
                  .in('profile_id', empIdsForBorrowedSite)
                  .order('shift_date')
                  .order('start_time');
                
                console.log(`📋 Borrowed shifts found for site ${borrowedSiteId}:`, borrowedShifts?.length || 0);
                
                if (borrowedShifts && borrowedShifts.length > 0) {
                  // Add borrowed site shifts as "other site" shifts
                  const mappedBorrowedShifts = borrowedShifts.map((s: any) => ({
                    ...s,
                    profile_name: s.profiles?.full_name,
                    profile_avatar: s.profiles?.avatar_url,
                    estimated_cost: s.estimated_cost || 0,
                    section_name: s.rota_sections?.name || null,
                    section_color: s.rota_sections?.color || null,
                    isFromOtherSite: true, // Mark as from borrowed site
                    otherSiteName: sites.find(site => site.id === borrowedSiteId)?.name || 'Other Site',
                  }));
                  
                  console.log(`✅ Adding ${mappedBorrowedShifts.length} borrowed shifts to display`);
                  mainShifts.push(...mappedBorrowedShifts);
                }
              }
            }
          }
          
          // Calculate week date strings for debugging
          const weekDateStringsForLog = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(weekStarting);
            date.setDate(date.getDate() + i);
            return date.toISOString().split('T')[0];
          });
          
          console.log(`[Rota] Loaded ${mainShifts.length} shifts with sections for week ${weekStr}`, {
            shiftsCount: mainShifts.length,
            uniqueStaff: new Set(mainShifts.filter(s => s.profile_id).map(s => s.profile_id)).size,
            shiftsWithSections: mainShifts.filter(s => s.section_id).length,
            shiftsWithoutSections: mainShifts.filter(s => !s.section_id).length,
            shiftsByDate: weekDateStringsForLog.reduce((acc, ds) => {
              acc[ds] = mainShifts.filter(s => s.shift_date === ds).length;
              return acc;
            }, {} as Record<string, number>)
          });
          setShifts(mainShifts);
        }
      }

      // 4. Load forecasts
      if (rotaData) {
        const { data: forecastData } = await supabase
          .from('rota_forecasts')
          .select('*')
          .eq('rota_id', rotaData.id);

        const forecastMap: Record<string, DayForecast> = {};
        (forecastData || []).forEach((f: any) => {
          forecastMap[f.forecast_date] = {
            predicted_revenue: f.predicted_revenue || 0,
            target_hours: f.target_hours || 0,
            notes: f.notes || '',
          };
        });
        if (!mountedRef.current) return;
        setForecasts(forecastMap);
      }

      // 4b. Load planned closures for the selected site AND company-wide closures
      // Calculate the date range for the week (Monday to Sunday)
      const weekEndDate = new Date(weekStarting);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      const weekEndStr = weekEndDate.toISOString().split('T')[0];

      // Fetch site-specific closures
      const { data: siteClosuresData, error: siteClosuresError } = await supabase
        .from('site_closures')
        .select('id, site_id, closure_start, closure_end, is_active, notes')
        .eq('site_id', selectedSite)
        .eq('is_active', true)
        // Fetch closures that overlap with the current week
        // Closure overlaps if: closure_start <= week_end AND closure_end >= week_start
        .lte('closure_start', weekEndStr)
        .gte('closure_end', weekStr);

      // Fetch company-wide closures
      const { data: companyClosuresData, error: companyClosuresError } = await supabase
        .from('company_closures')
        .select('id, company_id, closure_start, closure_end, is_active, notes')
        .eq('company_id', companyId)
        .eq('is_active', true)
        // Fetch closures that overlap with the current week
        .lte('closure_start', weekEndStr)
        .gte('closure_end', weekStr);

      if (siteClosuresError) {
        console.warn('Error loading site planned closures:', siteClosuresError);
      }
      if (companyClosuresError) {
        console.warn('Error loading company planned closures:', companyClosuresError);
      }

      // Combine site and company closures
      const allClosures = [
        ...(siteClosuresData || []).map(c => ({ ...c, closure_type: 'site' })),
        ...(companyClosuresData || []).map(c => ({ ...c, closure_type: 'company', site_id: null }))
      ];

      if (!mountedRef.current) return;
      setPlannedClosures(allClosures || []);

      // 4c. Load approved/taken leave requests for staff that overlap with the current week
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('id, profile_id, start_date, end_date, status')
        .eq('company_id', companyId)
        .in('status', ['approved', 'taken'])
        // Fetch leave that overlaps with the current week
        // Leave overlaps if: start_date <= week_end AND end_date >= week_start
        .lte('start_date', weekEndStr)
        .gte('end_date', weekStr);

      if (leaveError) {
        console.warn('Error loading leave requests:', leaveError);
      } else {
        if (!mountedRef.current) return;
        console.log(`[Rota] Loaded ${leaveData?.length || 0} leave requests for week ${weekStr} to ${weekEndStr}`, leaveData);
        setLeaveRequests(leaveData || []);
      }

      // 5. Load ALL staff for the company using RPC to bypass RLS issues
      console.log('Loading staff for company:', companyId);
      
      // Helper function to calculate hourly rate from salary: salary / 52 / contracted_hours
      // Note: salary field in database is always stored as ANNUAL salary in pounds
      // pay_frequency is for payroll purposes only, not for calculating hourly rate from the salary field
      const calculateHourlyRateFromSalary = (salary: number, contractedHoursPerWeek: number, payFrequency?: string): number => {
        if (!salary || !contractedHoursPerWeek || contractedHoursPerWeek <= 0) {
          return 0;
        }
        
        // Salary field is always stored as annual salary in pounds
        // Calculate hourly rate: annual salary / 52 weeks / contracted_hours_per_week
        // Store in pence (multiply by 100)
        const hourlyRateInPounds = salary / 52 / contractedHoursPerWeek;
        return Math.round(hourlyRateInPounds * 100);
      };
      
      let staffData: any[] = [];
      let staffErr: any = null;

      // Try RPC function first (same as employees page) - bypasses RLS
      try {
        const rpcResult = await supabase.rpc('get_company_profiles', {
          p_company_id: companyId
        });
        
        if (rpcResult.error) {
          console.warn('RPC failed, falling back to direct query:', rpcResult.error);
          throw rpcResult.error;
        }
        
        // RPC returns all profiles, filter for active only
        const allProfiles = rpcResult.data || [];
        console.log('RPC returned profiles:', {
          total: allProfiles.length,
          profiles: allProfiles.map((p: any) => ({
            profile_id: p.profile_id,
            full_name: p.full_name,
            status: p.status,
            home_site: p.home_site
          }))
        });
        
        // Check if there's an employee param - if so, include that employee even if not active
        const employeeParam = searchParams?.get('employee');
        const allActiveProfiles = allProfiles.filter((p: any) => p.status === 'active');
        
        // If there's an employee param, ensure that employee is included even if not active
        if (employeeParam) {
          const paramEmployee = allProfiles.find((p: any) => p.profile_id === employeeParam);
          if (paramEmployee && !allActiveProfiles.find((p: any) => p.profile_id === employeeParam)) {
            console.log('Including employee from URL params even though status is not active:', {
              profile_id: paramEmployee.profile_id,
              full_name: paramEmployee.full_name,
              status: paramEmployee.status
            });
            allActiveProfiles.push(paramEmployee);
          }
        }
        
        staffData = allActiveProfiles;
        console.log('Loaded staff via RPC (active only):', { 
          total: staffData.length, 
          totalProfiles: allProfiles.length,
          activeProfiles: staffData.map((p: any) => p.full_name)
        });
        
        // Get site names for home_site
        const siteIds = [...new Set(staffData.map((p: any) => p.home_site).filter(Boolean))];
        let sitesMap = new Map();
        if (siteIds.length > 0) {
          const { data: sitesData, error: sitesError } = await supabase
            .from('sites')
            .select('id, name')
            .in('id', siteIds);
          
          if (sitesError) {
            console.warn('⚠️ Could not fetch site names (RLS may be blocking):', {
              message: sitesError.message,
              code: sitesError.code,
              details: sitesError.details,
              hint: sitesError.hint,
              siteIds: siteIds
            });
            // Continue without site names - not critical for rota functionality
          } else if (sitesData) {
            sitesMap = new Map(sitesData.map(s => [s.id, s.name]));
            console.log(`✅ Loaded ${sitesData.length} site names`);
          }
        }
        
        // Get additional fields (contracted_hours, hourly_rate, salary, pay_frequency) via direct query
        // Note: This might be blocked by RLS, but we'll try anyway
        const profileIds = staffData.map((p: any) => p.profile_id);
        console.log('Fetching additional fields for', profileIds.length, 'profiles');
        
        if (profileIds.length > 0) {
          const { data: additionalData, error: additionalError } = await supabase
            .from('profiles')
            .select('id, contracted_hours_per_week, hourly_rate, salary, pay_frequency')
            .in('id', profileIds);
          
          if (additionalError) {
            console.warn('Could not fetch additional fields (may be RLS blocked):', additionalError);
            console.log('This is OK - we will use defaults for contracted_hours and hourly_rate');
          }
          
          if (additionalData) {
            console.log('Got additional fields for', additionalData.length, 'profiles');
            const additionalMap = new Map(additionalData.map(p => [p.id, p]));
            staffData = staffData.map((p: any) => {
              const profile = additionalMap.get(p.profile_id);
              const contractedHours = profile?.contracted_hours_per_week || 40;
              let hourlyRate = profile?.hourly_rate;
              
              // If employee has a salary, calculate hourly rate from salary (always override with salary calculation)
              if (profile?.salary && profile.salary > 0) {
                const calculatedRate = calculateHourlyRateFromSalary(profile.salary, contractedHours, profile.pay_frequency);
                if (calculatedRate > 0) {
                  hourlyRate = calculatedRate;
                  console.log(`Calculated hourly rate from salary for ${p.full_name}: £${profile.salary.toFixed(2)} salary / 52 / ${contractedHours}h = £${(calculatedRate / 100).toFixed(2)}/hr`);
                }
              }
              
              return {
                ...p,
                contracted_hours_per_week: contractedHours,
                hourly_rate: hourlyRate || null,
                salary: profile?.salary,
                pay_frequency: profile?.pay_frequency,
                site_name: p.home_site ? sitesMap.get(p.home_site) : null
              };
            });
          } else {
            // If we couldn't get additional data, just add site_name
            staffData = staffData.map((p: any) => ({
              ...p,
              site_name: p.home_site ? sitesMap.get(p.home_site) : null
            }));
          }
        }
        
        console.log('Final staffData before formatting:', {
          count: staffData.length,
          allProfileIds: staffData.map(p => p.profile_id),
          allNames: staffData.map(p => p.full_name),
          sample: staffData.slice(0, 5).map(p => ({
            profile_id: p.profile_id,
            full_name: p.full_name,
            home_site: p.home_site,
            site_name: p.site_name,
            status: p.status
          }))
        });
      } catch (rpcError) {
        // Fallback to direct query if RPC fails
        console.log('Falling back to direct query');
        
        // Check if there's an employee param - if so, we'll include them even if not active
        const employeeParam = searchParams?.get('employee');
        
        let query = supabase
          .from('profiles')
          .select(`
            id, full_name, position_title, avatar_url,
            contracted_hours_per_week, hourly_rate, home_site, salary, pay_type, pay_frequency,
            sites:home_site (id, name)
          `)
          .eq('company_id', companyId)
          .order('full_name');
        
        // If no employee param, filter by active status
        if (!employeeParam) {
          query = query.eq('status', 'active');
        }
        
        const directResult = await query;
        
        if (directResult.error) {
          console.error('Error loading staff (direct query):', directResult.error);
          staffErr = directResult.error;
        } else {
          let allStaffData = directResult.data || [];
          
          // Filter for active, but include employee param if specified
          if (employeeParam) {
            const activeStaff = allStaffData.filter((p: any) => p.status === 'active');
            const paramEmployee = allStaffData.find((p: any) => p.id === employeeParam);
            if (paramEmployee && !activeStaff.find((p: any) => p.id === employeeParam)) {
              console.log('Including employee from URL params even though status is not active:', {
                id: paramEmployee.id,
                full_name: paramEmployee.full_name,
                status: paramEmployee.status
              });
              activeStaff.push(paramEmployee);
            }
            staffData = activeStaff;
          } else {
            staffData = allStaffData.filter((p: any) => p.status === 'active');
          }
          
          console.log('Loaded staff via direct query:', { 
            total: staffData.length,
            allProfiles: allStaffData.length,
            employeeParam: employeeParam || 'none'
          });
        }
      }

      if (staffErr) {
        console.error('Failed to load staff:', staffErr);
        // Don't throw - just log and continue with empty array
        if (!mountedRef.current) return;
        setStaff([]);
      } else {
        // Format staff data - handle both RPC (profile_id) and direct query (id) formats
        const formattedStaff = (staffData || []).map((p: any) => {
          const contractedHours = p.contracted_hours_per_week || 40;
          let hourlyRate = p.hourly_rate;
          
          // If employee has a salary, calculate hourly rate from salary (always override with salary calculation)
          if (p.salary && p.salary > 0) {
            const calculatedRate = calculateHourlyRateFromSalary(p.salary, contractedHours, p.pay_frequency);
            if (calculatedRate > 0) {
              hourlyRate = calculatedRate;
              console.log(`Calculated hourly rate from salary for ${p.full_name}: £${p.salary.toFixed(2)} salary / 52 / ${contractedHours}h = £${(calculatedRate / 100).toFixed(2)}/hr`);
            }
          }
          
          return {
            id: p.profile_id || p.id, // RPC returns profile_id, direct query returns id
            full_name: p.full_name || 'Unknown',
            position_title: p.position_title,
            avatar_url: p.avatar_url,
            contracted_hours: contractedHours,
            hourly_rate: hourlyRate || 1200, // Default to £12/hr in pence if not set
            home_site: p.home_site,
            home_site_name: p.sites?.name || p.site_name || null,
          };
        });

        console.log('Formatted staff:', {
          total: formattedStaff.length,
          company_id: companyId,
          selectedSite,
          bySite: formattedStaff.reduce((acc: any, s: any) => {
            const siteName = s.home_site_name || (s.home_site === selectedSite ? 'Selected Site' : 'Other Site') || 'No Site';
            acc[siteName] = (acc[siteName] || 0) + 1;
            return acc;
          }, {}),
          selectedSiteStaff: formattedStaff.filter(s => s.home_site === selectedSite).length,
          selectedSiteStaffList: formattedStaff.filter(s => s.home_site === selectedSite).map(s => s.full_name),
          allStaffNames: formattedStaff.map(s => s.full_name)
        });

        if (!mountedRef.current) return;
        setStaff(formattedStaff);
      }

      // 6. Load sections for this site (fallback if table not deployed yet)
      try {
        const { data: sectionsData, error: sectionsErr } = await supabase
          .from('rota_sections')
          .select('id, name, color, sort_order')
          .eq('company_id', companyId)
          .eq('site_id', selectedSite)
          .eq('is_active', true)
          .order('sort_order')
          .order('name');

        if (sectionsErr) {
          console.warn('Could not load rota sections (falling back):', sectionsErr);
          if (!mountedRef.current) return;
          setSectionsEnabled(false);
          setSections(FALLBACK_SECTIONS);
        } else {
          const mapped: RotaSection[] = (sectionsData || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            color: s.color || 'rgb(var(--module-fg))',
            sort_order: s.sort_order || 0,
          }));
          if (!mountedRef.current) return;
          setSectionsEnabled(true);
          setSections(mapped);
        }
      } catch (sectionsError) {
        console.warn('Exception loading rota sections (falling back):', sectionsError);
        if (!mountedRef.current) return;
        setSectionsEnabled(false);
        setSections(FALLBACK_SECTIONS);
      }

    } catch (err: any) {
      if (!mountedRef.current) return;
      
      // Better error logging - Supabase errors don't serialize well
      const errorDetails = {
        message: err?.message || 'Unknown error',
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        stack: err?.stack,
        name: err?.name,
        // Try to extract Supabase error info
        supabaseError: err?.error || err?.supabaseError,
      };
      
      console.error('❌ Load error:', errorDetails);
      
      // Set a user-friendly error message
      const errorMessage = err?.message || 
                          err?.error?.message || 
                          'Failed to load rota data. Please check your permissions and try again.';
      setError(errorMessage);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [selectedSite, weekStarting, companyId]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStarting);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [weekStarting]);

  // Helper function to check if a date falls within any planned closure
  const isDateClosed = useCallback((dateStr: string): boolean => {
    if (!plannedClosures || plannedClosures.length === 0) return false;
    
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    
    return plannedClosures.some(closure => {
      if (!closure.closure_start || !closure.closure_end) return false;
      
      const startDate = new Date(closure.closure_start);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(closure.closure_end);
      endDate.setHours(23, 59, 59, 999);
      
      return date >= startDate && date <= endDate;
    });
  }, [plannedClosures]);

  // Helper function to check if a staff member is on leave on a specific date
  const isStaffOnLeave = useCallback((profileId: string, dateStr: string): boolean => {
    if (!leaveRequests || leaveRequests.length === 0) {
      return false;
    }
    
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    
    const result = leaveRequests.some(leave => {
      // Check if this leave request is for the given profile
      if (leave.profile_id !== profileId) return false;
      if (!leave.start_date || !leave.end_date) return false;
      
      // Parse leave dates
      const startDate = new Date(leave.start_date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(leave.end_date);
      endDate.setHours(23, 59, 59, 999);
      
      // Check if the date falls within the leave period
      const isWithinRange = date >= startDate && date <= endDate;
      return isWithinRange;
    });
    
    return result;
  }, [leaveRequests]);

  const staffPositionMap = useMemo(() => {
    return new Map(staff.map((s) => [s.id, s.position_title || '']));
  }, [staff]);

  const orderedSections = useMemo(() => {
    return sections.slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [sections]);

  const roleSortScore = useCallback((roleName: string) => {
    const r = roleName.toLowerCase();
    if (r.includes('manager') || r.includes('management')) return 0;
    if (r.includes('supervisor')) return 1;
    if (r.includes('lead')) return 2;
    return 10;
  }, []);

  const sectionedGrid = useMemo(() => {
    if (!sectionsEnabled) return null;

    const getRoleGroup = (shift: Shift): string => {
      if (shift.role_required && shift.role_required.trim()) return shift.role_required.trim();
      if (shift.profile_id) {
        const pos = staffPositionMap.get(shift.profile_id);
        if (pos && pos.trim()) return pos.trim();
      }
      return 'General';
    };

    const weekDateStrings = weekDays.map((d) => d.toISOString().split('T')[0]);

    // Build a lookup: sectionId -> role -> date -> shifts[]
    const bySection: Record<string, Record<string, Record<string, Shift[]>>> = {};
    const unsectionedKey = '__unsectioned__';

    for (const s of shifts) {
      const sectionKey = s.section_id || unsectionedKey;
      const roleKey = getRoleGroup(s);
      const dateKey = s.shift_date;
      bySection[sectionKey] ||= {};
      bySection[sectionKey][roleKey] ||= {};
      bySection[sectionKey][roleKey][dateKey] ||= [];
      bySection[sectionKey][roleKey][dateKey].push(s);
    }

    // Debug: Log shifts for this week (after bySection is built)
    const uniqueStaffIds = new Set(shifts.filter(s => s.profile_id).map(s => s.profile_id));
    const staffNames = Array.from(uniqueStaffIds).map(id => {
      const shift = shifts.find(s => s.profile_id === id);
      return shift?.profile_name || id;
    });
    
    const shiftsBySectionDebug = Object.keys(bySection).reduce((acc, sectionKey) => {
      const sectionShifts = Object.values(bySection[sectionKey] || {}).flatMap(roles => 
        Object.values(roles).flat()
      );
      const sectionStaff = Array.from(new Set(sectionShifts.filter(s => s.profile_id).map(s => s.profile_id)));
      const sectionStaffNames = sectionStaff.map(id => {
        const shift = sectionShifts.find(s => s.profile_id === id);
        return shift?.profile_name || id;
      });
      
      acc[sectionKey] = {
        count: sectionShifts.length,
        uniqueStaff: sectionStaff.length,
        staffNames: sectionStaffNames,
        roles: Object.keys(bySection[sectionKey] || {}),
        shiftsByRole: Object.keys(bySection[sectionKey] || {}).reduce((roleAcc, role) => {
          const roleShifts = Object.values(bySection[sectionKey]?.[role] || {}).flat();
          roleAcc[role] = {
            count: roleShifts.length,
            staff: Array.from(new Set(roleShifts.filter(s => s.profile_id).map(s => s.profile_name || s.profile_id)))
          };
          return roleAcc;
        }, {} as Record<string, { count: number; staff: string[] }>)
      };
      return acc;
    }, {} as Record<string, any>);
    
    console.log(`[SectionedGrid] Processing ${shifts.length} shifts for week starting ${weekDateStrings[0]}`, {
      weekDateStrings,
      shiftsCount: shifts.length,
      uniqueStaff: uniqueStaffIds.size,
      staffNames: staffNames,
      shiftsByDate: weekDateStrings.reduce((acc, ds) => {
        acc[ds] = shifts.filter(s => s.shift_date === ds).length;
        return acc;
      }, {} as Record<string, number>),
      shiftsBySection: shiftsBySectionDebug
    });

    const result: Array<{
      id: string;
      name: string;
      color: string;
      roleGroups: Array<{
        role: string;
        byDate: Record<string, Shift[]>;
      }>;
    }> = [];

    for (const section of orderedSections) {
      const sectionKey = section.id;
      const roles = Object.keys(bySection[sectionKey] || {});
      if (roles.length === 0) continue;

      const roleGroups = roles
        .slice()
        .sort((a, b) => {
          const sa = roleSortScore(a);
          const sb = roleSortScore(b);
          if (sa !== sb) return sa - sb;
          return a.localeCompare(b);
        })
        .map((role) => {
          const byDate: Record<string, Shift[]> = {};
          for (const ds of weekDateStrings) {
            byDate[ds] = (bySection[sectionKey]?.[role]?.[ds] || []).slice().sort((a, b) => a.start_time.localeCompare(b.start_time));
          }
          return { role, byDate };
        });

      result.push({
        id: section.id,
        name: section.name,
        color: section.color || 'rgb(var(--module-fg))',
        roleGroups,
      });
    }

    // Unsectioned last (if any)
    if (Object.keys(bySection[unsectionedKey] || {}).length > 0) {
      const roles = Object.keys(bySection[unsectionedKey] || {});
      const roleGroups = roles
        .slice()
        .sort((a, b) => a.localeCompare(b))
        .map((role) => {
          const byDate: Record<string, Shift[]> = {};
          for (const ds of weekDateStrings) {
            byDate[ds] = (bySection[unsectionedKey]?.[role]?.[ds] || []).slice().sort((a, b) => a.start_time.localeCompare(b.start_time));
          }
          return { role, byDate };
        });

      result.push({
        id: unsectionedKey,
        name: 'Unsectioned',
        color: '#525252',
        roleGroups,
      });
    }

    // Log detailed section breakdown
    console.log(`[SectionedGrid] Built ${result.length} sections`);
    result.forEach((sec, idx) => {
      const sectionShifts = sec.roleGroups.flatMap(rg => Object.values(rg.byDate).flat());
      const sectionStaff = Array.from(new Set(sectionShifts.filter(s => s.profile_id).map(s => s.profile_name || s.profile_id)));
      console.log(`  Section ${idx + 1}: "${sec.name}" (id: ${sec.id})`, {
        roleGroups: sec.roleGroups.length,
        totalShifts: sectionShifts.length,
        uniqueStaff: sectionStaff.length,
        staffNames: sectionStaff,
        roles: sec.roleGroups.map(rg => ({
          role: rg.role,
          shifts: Object.values(rg.byDate).flat().length,
          staff: Array.from(new Set(Object.values(rg.byDate).flat().filter(s => s.profile_id).map(s => s.profile_name || s.profile_id)))
        }))
      });
    });
    console.log(`[SectionedGrid] Summary`, {
      orderedSectionsCount: orderedSections.length,
      orderedSectionIds: orderedSections.map(s => s.id),
      bySectionKeys: Object.keys(bySection),
      unmatchedSections: Object.keys(bySection).filter(key => key !== '__unsectioned__' && !orderedSections.find(s => s.id === key))
    });
    
    return { weekDateStrings, sections: result };
  }, [sectionsEnabled, shifts, orderedSections, staffPositionMap, weekDays, roleSortScore]);

  // Debug: Log sections view data when viewMode changes to sections (after sectionedGrid is defined)
  useEffect(() => {
    if (viewMode === 'sections' && sectionsEnabled && sectionedGrid) {
      const allShiftsInSections = sectionedGrid.sections.flatMap(sec => 
        sec.roleGroups.flatMap(rg => 
          Object.values(rg.byDate).flat()
        )
      );
      const renderedStaff = new Set(allShiftsInSections.filter(s => s.profile_id).map(s => s.profile_name || s.profile_id));
      console.log(`[Sections View] Rendering ${sectionedGrid.sections.length} sections`, {
        totalShiftsRendered: allShiftsInSections.length,
        uniqueStaffRendered: renderedStaff.size,
        staffNames: Array.from(renderedStaff),
        sections: sectionedGrid.sections.map(sec => ({
          name: sec.name,
          roleGroups: sec.roleGroups.length,
          shifts: sec.roleGroups.reduce((sum, rg) => sum + Object.values(rg.byDate).flat().length, 0),
          staff: Array.from(new Set(sec.roleGroups.flatMap(rg => Object.values(rg.byDate).flat().filter(s => s.profile_id).map(s => s.profile_name || s.profile_id))))
        }))
      });
    }
  }, [viewMode, sectionsEnabled, sectionedGrid]);

  const staffRateMap = useMemo(() => {
    return new Map(staff.map((s) => [s.id, s.hourly_rate]));
  }, [staff]);

  const getShiftCostPence = useCallback((shift: Shift): number => {
    // Prefer DB value if present
    if (typeof shift.estimated_cost === 'number' && shift.estimated_cost > 0) {
      return shift.estimated_cost;
    }

    // Fallback: compute from staff hourly rate (stored in pence) and net hours
    if (shift.profile_id) {
      const rate = staffRateMap.get(shift.profile_id);
      if (typeof rate === 'number' && rate > 0) {
        // hourly_rate is already in pence, so no need to multiply by 100
        return Math.round(getShiftNetHours(shift) * rate);
      }
    }

    return 0;
  }, [staffRateMap]);

  const siteStaff = useMemo(() => {
    if (!selectedSite) return staff;
    const employeeParam = searchParams?.get('employee');
    
    // Get week date strings for checking active assignments
    const weekDateStrings = weekDays.map((d) => d.toISOString().split('T')[0]);
    
    // Filter by home_site
    const homeSiteStaff = staff.filter(s => s.home_site === selectedSite);
    
    // Include borrowed employees who have active assignments for this site during the current week
    const borrowedStaff = staff
      .filter(s => {
        // Skip if they're already in homeSiteStaff or if they have no home_site
        if (s.home_site === selectedSite || !s.home_site) return false;
        
        // Check if they have an active assignment to this site
        const assignments = siteAssignments.get(s.id);
        if (!assignments || assignments.length === 0) return false;
        
        // Check if any assignment covers this site and overlaps with the current week
        return assignments.some(assignment => {
          if (assignment.borrowed_site_id !== selectedSite) return false;
          
          // Check if assignment overlaps with any date in the current week
          return weekDateStrings.some(dateStr => {
            const date = new Date(dateStr);
            const startDate = new Date(assignment.start_date);
            const endDate = assignment.end_date ? new Date(assignment.end_date) : null;
            
            // Assignment is active if date is >= start_date and (no end_date or date <= end_date)
            return date >= startDate && (!endDate || date <= endDate);
          });
        });
      })
      .map(s => {
        // Mark as borrowed and add home site name
        const homeSiteName = sites.find(site => site.id === s.home_site)?.name || 'Unknown Site';
        return {
          ...s,
          isBorrowed: true,
          borrowedFromSiteName: homeSiteName,
        };
      });
    
    // Combine home site staff and borrowed staff
    let filtered = [...homeSiteStaff, ...borrowedStaff];
    
    // Always include the employee specified in URL params if not already included
    if (employeeParam && !filtered.find(s => s.id === employeeParam)) {
      const employee = staff.find(s => s.id === employeeParam);
      if (employee) {
        filtered = [...filtered, employee];
      }
    }
    
    return filtered;
  }, [staff, selectedSite, searchParams, siteAssignments, weekDays]);

  const assignmentStaff = useMemo(() => {
    if (!selectedSite) return staff;

    // People view is strictly the selected site's team (no sidebar filters anymore)
    return siteStaff;
  }, [selectedSite, siteStaff, staff]);

  // Persisted roster ordering (per site) for People view
  useEffect(() => {
    if (!selectedSite) return;
    try {
      const key = `rota_roster_order:${selectedSite}`;
      const raw = localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as RosterItem[]) : [];
      if (Array.isArray(parsed)) setRosterOrder(parsed);
    } catch {
      // ignore
    }
  }, [selectedSite]);

  const rosterItemsForPeopleView = useMemo(() => {
    const baseStaff = assignmentStaff;
    const staffById = new Map(baseStaff.map((s) => [s.id, s]));

    // Start from stored order if present, otherwise default to staff list
    const seed: RosterItem[] = rosterOrder.length
      ? rosterOrder
      : baseStaff.map((s) => ({ type: 'staff' as const, staffId: s.id }));

    // Filter out staff that no longer exist; keep dividers
    const normalized: RosterItem[] = seed.filter((item) => {
      if (item.type === 'divider') return true;
      return staffById.has(item.staffId);
    });

    // Append new staff not in the list
    const existingStaffIds = new Set(
      normalized.filter((i): i is { type: 'staff'; staffId: string } => i.type === 'staff').map((i) => i.staffId)
    );
    for (const s of baseStaff) {
      if (!existingStaffIds.has(s.id)) normalized.push({ type: 'staff', staffId: s.id });
    }

    return normalized;
  }, [assignmentStaff, rosterOrder]);

  // Stats
  const totalHours = shifts.reduce((sum, s) => sum + getShiftNetHours(s), 0);
  const totalCost = shifts.reduce((sum, s) => sum + getShiftCostPence(s), 0);
  const openShifts = shifts.filter(s => !s.profile_id).length;
  const totalTargetHours = Object.values(forecasts).reduce((sum, f) => sum + (f.target_hours || 0), 0);
  const totalForecastRevenue = Object.values(forecasts).reduce((sum, f) => sum + (f.predicted_revenue || 0), 0);
  const totalLabourPct = totalForecastRevenue > 0 ? (totalCost / totalForecastRevenue) * 100 : null;
  
  // Check if target hours might be in minutes (if total > 1000, it's likely wrong)
  // 16200 hours = 270 hours if it was minutes (still high but possible)
  const mightBeInMinutes = totalTargetHours > 1000 && totalTargetHours % 60 === 0;
  const suggestedHours = mightBeInMinutes ? totalTargetHours / 60 : null;

  // Per-day analysis: hours, cost, labour % vs forecast revenue
  const dayAnalysisByDate = useMemo(() => {
    const map = new Map<string, { hours: number; costPence: number; revenuePence: number }>();
    for (const s of shifts) {
      const ds = s.shift_date;
      const prev = map.get(ds) || { hours: 0, costPence: 0, revenuePence: 0 };
      prev.hours += getShiftNetHours(s);
      prev.costPence += getShiftCostPence(s);
      map.set(ds, prev);
    }
    for (const [ds, f] of Object.entries(forecasts)) {
      const prev = map.get(ds) || { hours: 0, costPence: 0, revenuePence: 0 };
      prev.revenuePence = f?.predicted_revenue || 0;
      map.set(ds, prev);
    }
    return map;
  }, [forecasts, shifts, getShiftCostPence]);

  const weeklyHoursByProfile = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of shifts) {
      if (!s.profile_id) continue;
      map.set(s.profile_id, (map.get(s.profile_id) || 0) + getShiftNetHours(s));
    }
    return map;
  }, [shifts]);

  // ============================================
  // NAVIGATION
  // ============================================

  const goToPreviousWeek = () => {
    const d = new Date(weekStarting);
    d.setDate(d.getDate() - 7);
    setWeekStarting(d);
  };

  const goToNextWeek = () => {
    const d = new Date(weekStarting);
    d.setDate(d.getDate() + 7);
    setWeekStarting(d);
  };

  const formatWeekRange = () => {
    const end = new Date(weekStarting);
    end.setDate(end.getDate() + 6);
    return `${weekStarting.getDate()} ${weekStarting.toLocaleDateString('en-GB', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('en-GB', { month: 'short' })}`;
  };

  const handleDownloadPDF = useCallback(async () => {
    setIsGeneratingPDF(true);
    try {
      const siteName = sites.find((s) => s.id === selectedSite)?.name || 'Unknown Site';
      const weekStartStr = weekStarting.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      // Convert staff data to RotaPDF format
      const staffForPDF = assignmentStaff.map((person) => {
        const shiftsForPDF = DAYS.map((dayAbbrev, dayIndex) => {
          const dateObj = weekDays[dayIndex];
          const dateStr = dateObj.toISOString().split('T')[0];
          const personShifts = shifts.filter(
            (s) => s.profile_id === person.id && s.shift_date === dateStr
          );

          if (personShifts.length === 0) {
            const isOnLeave = isStaffOnLeave(person.id, dateStr);
            return {
              day: dayAbbrev,
              isOff: isOnLeave,
            };
          }

          // Take the first shift for display (or combine if multiple)
          const firstShift = personShifts[0];
          return {
            day: dayAbbrev,
            startTime: firstShift.start_time,
            endTime: firstShift.end_time,
            isOff: false,
          };
        });

        const totalHours = weeklyHoursByProfile.get(person.id) || 0;

        return {
          name: person.full_name,
          role: person.position_title || '',
          shifts: shiftsForPDF,
          totalHours: Math.round(totalHours * 10) / 10,
        };
      });

      // Calculate daily totals
      const dailyTotals = DAYS.map((dayAbbrev, dayIndex) => {
        const dateObj = weekDays[dayIndex];
        const dateStr = dateObj.toISOString().split('T')[0];
        const dayShifts = shifts.filter((s) => s.shift_date === dateStr && s.profile_id);
        const uniqueStaff = new Set(dayShifts.map((s) => s.profile_id));
        const totalHours = dayShifts.reduce((sum, s) => sum + getShiftNetHours(s), 0);

        return {
          day: dayAbbrev,
          staffCount: uniqueStaff.size,
          totalHours: Math.round(totalHours * 10) / 10,
        };
      });

      const blob = await pdf(
        <RotaPDF
          siteName={siteName}
          weekStarting={weekStartStr}
          staff={staffForPDF}
          dailyTotals={dailyTotals}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeSiteName = siteName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const weekDateStr = weekStarting.toISOString().split('T')[0];
      link.download = `rota-${safeSiteName}-${weekDateStr}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [assignmentStaff, shifts, weekDays, weeklyHoursByProfile, weekStarting, sites, selectedSite, isStaffOnLeave, getShiftNetHours]);

  // ============================================
  // ACTIONS
  // ============================================
  const notifyTeamAboutOpenShifts = useCallback(async () => {
    if (!canManageRota) return;
    if (!rota || !selectedSite || !companyId) return;

    const openCount = shifts.filter((s) => !s.profile_id && s.status !== 'cancelled').length;
    if (openCount === 0) {
      alert('No open shifts to notify.');
      return;
    }

    if (!assignmentStaff.length) {
      alert('No staff found for this site.');
      return;
    }

    const confirmMsg = `Send notifications for ${openCount} open shift(s) to ${assignmentStaff.length} staff member(s)?`;
    if (!confirm(confirmMsg)) return;

    setNotifyingOpenShifts(true);
    try {
      const resp = await fetch('/api/rota/notify-open-shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotaId: rota.id, siteId: selectedSite }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to notify open shifts');
      }

      const parts: string[] = [];
      if (typeof data?.openShiftCount === 'number') parts.push(`${data.openShiftCount} open shift(s)`);
      if (typeof data?.recipientCount === 'number') parts.push(`${data.recipientCount} staff`);
      if (typeof data?.notificationCount === 'number') parts.push(`${data.notificationCount} notification(s)`);

      const msg = `Sent: ${parts.join(' • ') || 'done'}.`;
      alert(msg);

      if (data?.messagingLink) {
        console.log('Open shifts posted in messaging:', data.messagingLink);
      }
    } catch (err: any) {
      console.error('Failed to notify open shifts:', err);
      alert(`Failed to send notifications: ${err?.message || 'Unknown error'}`);
    } finally {
      setNotifyingOpenShifts(false);
    }
  }, [assignmentStaff, canManageRota, companyId, rota, selectedSite, shifts]);

  const handleAddShift = async (data: { profile_id: string | null; start_time: string; end_time: string; break_minutes: number; color: string; section_id: string | null }) => {
    if (!rota || !addingShiftDate || !companyId) {
      console.error('Cannot add shift: missing rota, date, or company_id', { rota, addingShiftDate, company_id: companyId });
      return;
    }

    try {
      const netHours = calculateNetHours(data.start_time, data.end_time, data.break_minutes);
      const staffMember = data.profile_id ? staff.find(s => s.id === data.profile_id) : null;

      // Managers must not roster staff from other sites
      if (isManagerLike && data.profile_id && selectedSite && staffMember && staffMember.home_site !== selectedSite) {
        alert('Managers can only roster staff from the selected site.');
        return;
      }
      // hourly_rate is already in pence, so no need to multiply by 100
      const cost = staffMember ? Math.round(netHours * staffMember.hourly_rate) : 0;

      console.log('Adding shift:', {
        rota_id: rota.id,
        profile_id: data.profile_id,
        shift_date: addingShiftDate.toISOString().split('T')[0],
        start_time: data.start_time,
        end_time: data.end_time,
        break_minutes: data.break_minutes,
        estimated_cost: cost,
      });

      const insertPayload: any = {
        rota_id: rota.id,
        company_id: companyId,
        profile_id: data.profile_id,
        shift_date: addingShiftDate.toISOString().split('T')[0],
        start_time: data.start_time,
        end_time: data.end_time,
        break_minutes: data.break_minutes,
        estimated_cost: cost,
        color: data.color,
        status: 'scheduled',
      };

      if (sectionsEnabled) {
        insertPayload.section_id = data.section_id;
      }

      const { data: insertedData, error } = await supabase.from('rota_shifts').insert(insertPayload).select();

      if (error) {
        console.error('Error adding shift:', error);
        alert(`Failed to add shift: ${error.message}`);
        return;
      }

      console.log('Shift added successfully:', insertedData);
      setAddingShiftDate(null);
      setAddingShiftSectionId(null);
      await loadData();
    } catch (err: any) {
      console.error('Exception adding shift:', err);
      alert(`Failed to add shift: ${err.message || 'Unknown error'}`);
    }
  };

  const handleUpdateShift = async (shiftId: string, data: Partial<Shift>) => {
    try {
      const staffMember = data.profile_id ? staff.find(s => s.id === data.profile_id) : null;
      
      // Validate required fields
      if (!data.start_time || !data.end_time) {
        alert('Start time and end time are required');
        return;
      }

      // Note: net_hours is a GENERATED column in the database, so we don't update it directly
      // It's automatically calculated from start_time, end_time, and break_minutes
      const updateData: any = {
        start_time: data.start_time,
        end_time: data.end_time,
        break_minutes: data.break_minutes || 0,
        profile_id: data.profile_id || null,
      };

      if (sectionsEnabled && 'section_id' in data) {
        updateData.section_id = data.section_id ?? null;
      }

      if (staffMember && data.net_hours) {
        // hourly_rate is already in pence, so no need to multiply by 100
        updateData.estimated_cost = Math.round(data.net_hours * staffMember.hourly_rate);
      } else if (data.profile_id === null) {
        updateData.estimated_cost = 0;
      }

      const { error } = await supabase
        .from('rota_shifts')
        .update(updateData)
        .eq('id', shiftId);

      if (error) {
        console.error('Error updating shift:', error);
        const errorMessage = error.message || error.details || JSON.stringify(error);
        alert(`Failed to update shift: ${errorMessage}`);
        return;
      }

      await loadData();
    } catch (err: any) {
      console.error('Exception updating shift:', err);
      alert(`Failed to update shift: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    await supabase.from('rota_shifts').delete().eq('id', shiftId);
    loadData();
  };

  const handleCopyShift = async (shiftId: string, targetDate?: string) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift || !rota || !companyId) {
      console.error('Cannot copy shift: missing shift, rota, or company_id');
      return;
    }

    try {
      const targetDateStr = targetDate || shift.shift_date;
      const staffMember = shift.profile_id ? staff.find(s => s.id === shift.profile_id) : null;
      const cost = staffMember ? Math.round(getShiftNetHours(shift) * staffMember.hourly_rate) : 0;

      const { error } = await supabase.from('rota_shifts').insert({
        rota_id: rota.id,
        company_id: companyId,
        profile_id: shift.profile_id,
        ...(sectionsEnabled ? { section_id: shift.section_id } : {}),
        shift_date: targetDateStr,
        start_time: shift.start_time,
        end_time: shift.end_time,
        break_minutes: shift.break_minutes,
        role_required: shift.role_required,
        estimated_cost: cost,
        color: shift.color,
        status: 'scheduled'
      });

      if (error) {
        console.error('Error copying shift:', error);
        alert(`Failed to copy shift: ${error.message}`);
        return;
      }

      console.log('Shift copied successfully');
      await loadData();
    } catch (err: any) {
      console.error('Exception copying shift:', err);
      alert(`Failed to copy shift: ${err.message || 'Unknown error'}`);
    }
  };

  const handleCopyShiftToDates = async (shift: Shift, targetDates: string[]) => {
    if (!rota || !companyId) return;

    const uniqueDates = Array.from(new Set(targetDates)).filter(Boolean);
    if (uniqueDates.length === 0) return;

    try {
      const staffMember = shift.profile_id ? staff.find(s => s.id === shift.profile_id) : null;
      // hourly_rate is already in pence, so no need to multiply by 100
      const cost = staffMember ? Math.round(getShiftNetHours(shift) * staffMember.hourly_rate) : 0;

      const rows = uniqueDates.map((dateStr) => {
        const row: any = {
          rota_id: rota.id,
          company_id: companyId,
          profile_id: shift.profile_id,
          shift_date: dateStr,
          start_time: shift.start_time,
          end_time: shift.end_time,
          break_minutes: shift.break_minutes,
          role_required: shift.role_required,
          estimated_cost: cost,
          color: shift.color,
          status: 'scheduled',
        };

        if (sectionsEnabled) {
          row.section_id = shift.section_id;
        }

        return row;
      });

      const { error } = await supabase.from('rota_shifts').insert(rows);
      if (error) {
        console.error('Error copying shift to multiple days:', error);
        alert(`Failed to copy shift: ${error.message}`);
        return;
      }

      await loadData();
    } catch (err: any) {
      console.error('Exception copying shift to multiple days:', err);
      alert(`Failed to copy shift: ${err.message || 'Unknown error'}`);
    }
  };

  const moveRosterItem = useCallback((index: number, direction: 'up' | 'down') => {
    if (!selectedSite) return;

    setRosterOrder((prev) => {
      const current = prev.length ? [...prev] : rosterItemsForPeopleView;
      if (index < 0 || index >= current.length) return prev;

      const swapWith = direction === 'up' ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= current.length) return prev;

      const next = [...current];
      const tmp = next[index];
      next[index] = next[swapWith];
      next[swapWith] = tmp;

      try {
        localStorage.setItem(`rota_roster_order:${selectedSite}`, JSON.stringify(next));
      } catch {
        // ignore
      }

      return next;
    });
  }, [rosterItemsForPeopleView, selectedSite]);

  // Handle drag end for staff reordering
  const handleStaffDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedSite) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (!activeId.startsWith('staff-') || !overId.startsWith('staff-')) return;

    const activeStaffId = activeId.replace('staff-', '');
    const overStaffId = overId.replace('staff-', '');

    setRosterOrder((prev) => {
      const current = prev.length ? [...prev] : rosterItemsForPeopleView;
      const activeIndex = current.findIndex(
        (item) => item.type === 'staff' && item.staffId === activeStaffId
      );
      const overIndex = current.findIndex(
        (item) => item.type === 'staff' && item.staffId === overStaffId
      );

      if (activeIndex === -1 || overIndex === -1) return prev;

      const next = arrayMove(current, activeIndex, overIndex);
      try {
        localStorage.setItem(`rota_roster_order:${selectedSite}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [rosterItemsForPeopleView, selectedSite]);

  // Handle drag end for shift moving
  const handleShiftDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !rota) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (!activeId.startsWith('shift-')) return;

    const shiftId = activeId.replace('shift-', '');
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    // Check if dropping on a day cell (format: day-{date}-{staffId})
    if (overId.startsWith('day:')) {
      // Parse: day:YYYY-MM-DD:staffId
      // Use ':' separators so dates (with '-') and UUIDs (with '-') are unambiguous.
      const parts = overId.split(':');
      if (parts.length < 3) return;

      const dateStr = parts[1];
      const staffId = parts.slice(2).join(':'); // defensive: keep any extra ':' intact

      // Move shift to new date and optionally new staff
      const updateData: any = {
        shift_date: dateStr,
      };
      // Only update profile_id when it actually changes to avoid
      // triggering the cost recalculation unnecessarily
      const newProfileId = (staffId && staffId !== 'null' && staffId !== 'undefined') ? staffId : null;
      if (newProfileId !== (shift.profile_id ?? null)) {
        updateData.profile_id = newProfileId;
      }

      const { error } = await supabase
        .from('rota_shifts')
        .update(updateData)
        .eq('id', shiftId);

      if (error) {
        // Supabase errors sometimes log as {} depending on how console is wrapped,
        // so log a plain object with the useful fields.
        console.error('Error moving shift:', {
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint,
          code: (error as any).code,
        });
        alert(`Failed to move shift: ${error.message || 'Unknown error'}`);
        return;
      }

      await loadData();
    }
  }, [shifts, rota, loadData]);

  const addDividerToRoster = useCallback((section: RotaSection) => {
    if (!selectedSite) return;
    const item: RosterItem = { type: 'divider', sectionId: section.id, name: section.name, color: section.color };
    setRosterOrder((prev) => {
      const base = prev.length ? [...prev] : [...rosterItemsForPeopleView];
      const next = [...base, item];
      try {
        localStorage.setItem(`rota_roster_order:${selectedSite}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [rosterItemsForPeopleView, selectedSite]);

  const insertDividerToRosterAt = useCallback((section: RotaSection, index: number) => {
    if (!selectedSite) return;
    const item: RosterItem = { type: 'divider', sectionId: section.id, name: section.name, color: section.color };
    setRosterOrder((prev) => {
      const base = prev.length ? [...prev] : [...rosterItemsForPeopleView];
      const safeIndex = Math.max(0, Math.min(index, base.length));
      const next = [...base.slice(0, safeIndex), item, ...base.slice(safeIndex)];
      try {
        localStorage.setItem(`rota_roster_order:${selectedSite}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [rosterItemsForPeopleView, selectedSite]);

  const removeDividerFromRoster = useCallback((index: number) => {
    if (!selectedSite) return;
    setRosterOrder((prev) => {
      const current = prev.length ? [...prev] : rosterItemsForPeopleView;
      if (index < 0 || index >= current.length) return prev;
      const next = current.filter((_, i) => i !== index);
      try {
        localStorage.setItem(`rota_roster_order:${selectedSite}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [rosterItemsForPeopleView, selectedSite]);

  const handleCopyDay = async (sourceDate: string, targetDate: string) => {
    if (!rota || !companyId) {
      console.error('Cannot copy day: missing rota or company_id');
      return;
    }

    const sourceShifts = shifts.filter(s => s.shift_date === sourceDate);
    if (sourceShifts.length === 0) {
      alert('No shifts to copy from this day');
      return;
    }

    try {
      const newShifts = sourceShifts.map(shift => {
        const staffMember = shift.profile_id ? staff.find(s => s.id === shift.profile_id) : null;
        // hourly_rate is already in pence, so no need to multiply by 100
        const cost = staffMember ? Math.round(getShiftNetHours(shift) * staffMember.hourly_rate) : 0;
        
        const base: any = {
          rota_id: rota.id,
          company_id: companyId,
          profile_id: shift.profile_id,
          shift_date: targetDate,
          start_time: shift.start_time,
          end_time: shift.end_time,
          break_minutes: shift.break_minutes,
          role_required: shift.role_required,
          estimated_cost: cost,
          color: shift.color,
          status: 'scheduled'
        };

        if (sectionsEnabled) {
          base.section_id = shift.section_id;
        }

        return base;
      });

      const { error } = await supabase.from('rota_shifts').insert(newShifts);

      if (error) {
        console.error('Error copying day:', error);
        alert(`Failed to copy day: ${error.message}`);
        return;
      }

      console.log(`Copied ${newShifts.length} shifts successfully`);
      await loadData();
    } catch (err: any) {
      console.error('Exception copying day:', err);
      alert(`Failed to copy day: ${err.message || 'Unknown error'}`);
    }
  };

  const handleAssignStaff = async (shiftId: string, staffId: string) => {
    console.log('handleAssignStaff called:', { shiftId, staffId, shiftsCount: shifts.length, staffCount: staff.length });
    
    const shift = shifts.find(s => s.id === shiftId);
    const staffMember = staff.find(s => s.id === staffId);
    
    if (!shift) {
      console.error('Shift not found:', { shiftId, availableShifts: shifts.map(s => ({ id: s.id, date: s.shift_date })) });
      alert(`Shift not found. Shift ID: ${shiftId}`);
      return;
    }
    
    if (!staffMember) {
      console.error('Staff member not found:', { staffId, availableStaff: staff.map(s => ({ id: s.id, name: s.full_name })) });
      alert(`Staff member not found. Staff ID: ${staffId}`);
      return;
    }

    // Managers must not roster staff from other sites
    if (isManagerLike && selectedSite && staffMember.home_site !== selectedSite) {
      alert('Managers can only roster staff from the selected site.');
      return;
    }
    
    try {
      // hourly_rate is already in pence, so no need to multiply by 100
      const cost = Math.round(getShiftNetHours(shift) * staffMember.hourly_rate);
      console.log('Assigning staff to shift:', {
        shiftId,
        shiftDate: shift.shift_date,
        shiftTime: `${shift.start_time}-${shift.end_time}`,
        staffId,
        staffName: staffMember.full_name,
        netHours: shift.net_hours,
        hourlyRate: staffMember.hourly_rate,
        cost
      });

      const { data, error } = await supabase
        .from('rota_shifts')
        .update({
          profile_id: staffId,
          estimated_cost: cost,
        })
        .eq('id', shiftId)
        .select();

      if (error) {
        console.error('Error assigning staff:', error);
        alert(`Failed to assign staff: ${error.message}`);
        return;
      }

      console.log('Staff assigned successfully:', data);
      setAssigningToShift(null);
      await loadData();
    } catch (err: any) {
      console.error('Exception assigning staff:', err);
      alert(`Failed to assign staff: ${err.message || 'Unknown error'}`);
    }
  };

  const handleCopyLastWeek = async () => {
    if (!rota || !companyId) return;

    const lastWeek = new Date(weekStarting);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const { data: lastRota } = await supabase
      .from('rotas')
      .select('id')
      .eq('company_id', companyId)
      .eq('site_id', selectedSite)
      .eq('week_starting', lastWeek.toISOString().split('T')[0])
      .maybeSingle();

    if (!lastRota) {
      alert('No rota found for last week');
      return;
    }

    const { data: lastShifts } = await supabase
      .from('rota_shifts')
      .select('*')
      .eq('rota_id', lastRota.id);

    if (!lastShifts?.length) {
      alert('No shifts in last week\'s rota');
      return;
    }

    // Filter out trial shifts and open/unassigned shifts
    // Trial shifts have role_required containing 'TRIAL'
    // Open shifts have null profile_id
    const shiftsToCopy = lastShifts.filter(s => {
      const isTrialShift = s.role_required?.includes('TRIAL') || s.role_required?.includes('trial');
      const isOpenShift = !s.profile_id;
      return !isTrialShift && !isOpenShift;
    });

    if (!shiftsToCopy.length) {
      alert('No assigned shifts found in last week\'s rota (trial and open shifts are excluded)');
      return;
    }

    const newShifts = shiftsToCopy.map(s => {
      const oldDate = new Date(s.shift_date);
      oldDate.setDate(oldDate.getDate() + 7);
      return {
        rota_id: rota.id,
        company_id: companyId,
        profile_id: s.profile_id,
        shift_date: oldDate.toISOString().split('T')[0],
        start_time: s.start_time,
        end_time: s.end_time,
        break_minutes: s.break_minutes,
        role_required: s.role_required, // Preserve role_required for non-trial shifts
        // net_hours is computed in DB / UI; don't copy a potentially incorrect stored value
        estimated_cost: s.estimated_cost,
        color: s.color,
        status: 'scheduled'
      };
    });

    await supabase.from('rota_shifts').insert(newShifts);
    loadData();
  };

  const submitForApproval = async () => {
    if (!rota) return;
    if (openShifts > 0 && !confirm(`${openShifts} shifts are unassigned. Send for approval anyway?`)) return;

    setSubmittingForApproval(true);
    try {
      const { error } = await supabase.rpc('submit_rota_for_approval' as any, { p_rota_id: rota.id } as any);
      if (error) throw error;
      await loadData();
    } catch (err: any) {
      console.error('Failed to submit rota for approval:', err);
      alert(err?.message || 'Failed to submit for approval');
    } finally {
      setSubmittingForApproval(false);
    }
  };

  const approveCurrentRota = async () => {
    if (!rota) return;
    setApprovingRota(true);
    try {
      const { error } = await supabase.rpc('approve_rota' as any, { p_rota_id: rota.id } as any);
      if (error) throw error;
      await loadData();
    } catch (err: any) {
      console.error('Failed to approve rota:', err);
      alert(err?.message || 'Failed to approve rota');
    } finally {
      setApprovingRota(false);
    }
  };

  // publishCurrentRota removed — approved is now the final visible state

  const handleSaveForecast = async (date: string, data: DayForecast) => {
    if (!rota || !companyId) return;

    // Use upsert on (rota_id, forecast_date) so it works for both create + update
    // IMPORTANT: rota_forecasts does NOT have company_id/site_id columns.
    const { error } = await supabase
      .from('rota_forecasts')
      .upsert(
        {
          rota_id: rota.id,
          forecast_date: date,
          predicted_revenue: data.predicted_revenue,
          target_hours: data.target_hours,
          notes: data.notes,
        } as any,
        { onConflict: 'rota_id,forecast_date' } as any
      );

    if (error) {
      console.error('Failed to save forecast:', {
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
      });
      alert(`Failed to save forecast: ${error.message || 'Unknown error'}`);
      return;
    }

    setForecasts((prev) => ({ ...prev, [date]: data }));
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading && !rota) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-module-fg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-2">Error loading rota</p>
          <p className="text-theme-tertiary text-sm">{error}</p>
          <button onClick={loadData} className="mt-4 px-4 py-2 bg-theme-surface rounded-lg text-theme-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // MOBILE VIEW - Single Day Rota
  // ============================================
  if (isMobile) {
    const mobileSelectedDayStr = mobileSelectedDay.toISOString().split('T')[0];
    const dayShifts = shifts.filter(s => s.shift_date === mobileSelectedDayStr);
    const isClosed = plannedClosures.some(closure => {
      if (!closure.closure_start || !closure.closure_end) return false;
      const startDate = new Date(closure.closure_start);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(closure.closure_end);
      endDate.setHours(23, 59, 59, 999);
      return mobileSelectedDay >= startDate && mobileSelectedDay <= endDate;
    });
    const isToday = mobileSelectedDay.toDateString() === new Date().toDateString();

    // Helper: get staff member by ID
    const getStaffMember = (profileId: string | null) => {
      if (!profileId) return null;
      return staff.find(s => s.id === profileId);
    };

    // Navigate to previous day
    const goToPrevDay = () => {
      const newDate = new Date(mobileSelectedDay);
      newDate.setDate(newDate.getDate() - 1);
      setMobileSelectedDay(newDate);

      // Update week if needed
      const newDateWeekStart = new Date(newDate);
      const day = newDateWeekStart.getDay();
      newDateWeekStart.setDate(newDateWeekStart.getDate() - day + (day === 0 ? -6 : 1));
      newDateWeekStart.setHours(0, 0, 0, 0);
      if (newDateWeekStart.getTime() !== weekStarting.getTime()) {
        setWeekStarting(newDateWeekStart);
      }
    };

    // Navigate to next day
    const goToNextDay = () => {
      const newDate = new Date(mobileSelectedDay);
      newDate.setDate(newDate.getDate() + 1);
      setMobileSelectedDay(newDate);

      // Update week if needed
      const newDateWeekStart = new Date(newDate);
      const day = newDateWeekStart.getDay();
      newDateWeekStart.setDate(newDateWeekStart.getDate() - day + (day === 0 ? -6 : 1));
      newDateWeekStart.setHours(0, 0, 0, 0);
      if (newDateWeekStart.getTime() !== weekStarting.getTime()) {
        setWeekStarting(newDateWeekStart);
      }
    };

    // Go to today
    const goToToday = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setMobileSelectedDay(today);

      // Update week if needed
      const todayWeekStart = new Date(today);
      const day = todayWeekStart.getDay();
      todayWeekStart.setDate(todayWeekStart.getDate() - day + (day === 0 ? -6 : 1));
      todayWeekStart.setHours(0, 0, 0, 0);
      if (todayWeekStart.getTime() !== weekStarting.getTime()) {
        setWeekStarting(todayWeekStart);
      }
    };

    // Group shifts by section or time
    const assignedShifts = dayShifts.filter(s => s.profile_id);
    const openShiftsList = dayShifts.filter(s => !s.profile_id);

    // Calculate totals for the day
    const totalHours = dayShifts.reduce((sum, s) => sum + getShiftNetHours(s), 0);
    const totalCost = dayShifts.reduce((sum, s) => sum + getShiftCostPence(s), 0) / 100;

    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-theme-primary">
        {/* Mobile Header */}
        <div className="sticky top-0 z-20 bg-white dark:bg-[#0a0a0a] border-b border-black/10 dark:border-white/10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          {/* Site Selector */}
          {sites.length > 1 && (
            <div className="px-4 pt-4 pb-2">
              <select
                value={selectedSite || ''}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-theme-primary text-sm"
              >
                {sites.map(site => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Day Navigation */}
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              onClick={goToPrevDay}
              className="p-2 rounded-full bg-black/5 dark:bg-white/5 active:bg-black/10 dark:active:bg-white/10"
            >
              <ChevronLeft className="w-5 h-5 text-theme-primary" />
            </button>

            <div className="flex-1 text-center">
              <button onClick={goToToday} className="inline-flex flex-col items-center">
                <span className={`text-lg font-semibold ${isToday ? 'text-purple-600 dark:text-purple-400' : 'text-theme-primary'}`}>
                  {mobileSelectedDay.toLocaleDateString('en-GB', { weekday: 'long' })}
                </span>
                <span className="text-sm text-theme-tertiary">
                  {mobileSelectedDay.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </button>
            </div>

            <button
              onClick={goToNextDay}
              className="p-2 rounded-full bg-black/5 dark:bg-white/5 active:bg-black/10 dark:active:bg-white/10"
            >
              <ChevronRight className="w-5 h-5 text-theme-primary" />
            </button>
          </div>

          {/* Day Summary */}
          <div className="px-4 pb-3 flex items-center gap-4 text-xs text-theme-tertiary">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{assignedShifts.length} staff</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{totalHours.toFixed(1)}h</span>
            </div>
            <div className="flex items-center gap-1">
              <PoundSterling className="w-3.5 h-3.5" />
              <span>£{totalCost.toFixed(0)}</span>
            </div>
            {openShiftsList.length > 0 && (
              <div className="flex items-center gap-1 text-orange-400">
                <UserX className="w-3.5 h-3.5" />
                <span>{openShiftsList.length} open</span>
              </div>
            )}
          </div>
        </div>

        {/* Day Content */}
        <div className="px-4 py-4 space-y-4" style={{ paddingBottom: 'calc(var(--bottom-tab-height) + env(safe-area-inset-bottom, 0px) + 5rem)' }}>
          {isClosed ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <div className="text-red-400 text-lg font-semibold mb-1">🔒 Closed</div>
              <p className="text-theme-tertiary text-sm">This location is closed on this day</p>
            </div>
          ) : dayShifts.length === 0 ? (
            <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-6 text-center">
              <div className="text-theme-tertiary text-lg mb-1">No shifts scheduled</div>
              <p className="text-theme-disabled text-sm">No shifts have been added for this day yet</p>
            </div>
          ) : (
            <>
              {/* Assigned Shifts */}
              {assignedShifts.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-theme-tertiary uppercase tracking-wider mb-3">Scheduled Staff</h3>
                  <div className="space-y-2">
                    {assignedShifts
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map(shift => {
                        const staffMember = getStaffMember(shift.profile_id);
                        const hours = getShiftNetHours(shift);
                        const isOnLeave = shift.profile_id && leaveRequests.some(leave => {
                          if (leave.profile_id !== shift.profile_id) return false;
                          const startDate = new Date(leave.start_date);
                          const endDate = new Date(leave.end_date);
                          return mobileSelectedDay >= startDate && mobileSelectedDay <= endDate;
                        });

                        return (
                          <div
                            key={shift.id}
                            onClick={() => {
                              setSelectedMobileShift(shift);
                              setIsShiftActionOpen(true);
                            }}
                            className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-3 flex items-center gap-3 cursor-pointer active:bg-black/10 dark:active:bg-white/10 transition-colors"
                          >
                            {/* Color indicator */}
                            <div
                              className="w-1 h-12 rounded-full flex-shrink-0"
                              style={{ backgroundColor: shift.section_color || shift.color || 'rgb(var(--module-fg))' }}
                            />

                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              {staffMember?.avatar_url ? (
                                <img
                                  src={staffMember.avatar_url}
                                  alt={staffMember.full_name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-theme-tertiary text-sm font-medium">
                                  {staffMember?.full_name?.charAt(0) || '?'}
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-theme-primary truncate">
                                  {staffMember?.full_name || shift.profile_name || 'Unknown'}
                                </span>
                                {isOnLeave && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                                    On Leave
                                  </span>
                                )}
                                {shift.isFromOtherSite && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                    @ {shift.otherSiteName}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-theme-tertiary">
                                {staffMember?.position_title && (
                                  <span className="mr-2">{staffMember.position_title}</span>
                                )}
                                {shift.section_name && (
                                  <span className="text-theme-tertiary">• {shift.section_name}</span>
                                )}
                              </div>
                            </div>

                            {/* Time + Chevron */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <div className="text-right">
                                <div className="text-theme-primary font-medium text-sm">
                                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                </div>
                                <div className="text-theme-tertiary text-xs">
                                  {hours}h
                                  {shift.break_minutes > 0 && ` (${shift.break_minutes}m break)`}
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-theme-tertiary" />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Open Shifts */}
              {openShiftsList.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-orange-400/80 uppercase tracking-wider mb-3">
                    Open Shifts ({openShiftsList.length})
                  </h3>
                  <div className="space-y-2">
                    {openShiftsList
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map(shift => {
                        const hours = getShiftNetHours(shift);

                        return (
                          <div
                            key={shift.id}
                            onClick={() => {
                              setSelectedMobileShift(shift);
                              setIsShiftActionOpen(true);
                            }}
                            className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 flex items-center gap-3 cursor-pointer active:bg-orange-500/10 transition-colors"
                          >
                            {/* Color indicator */}
                            <div
                              className="w-1 h-12 rounded-full flex-shrink-0"
                              style={{ backgroundColor: shift.section_color || shift.color || '#f59e0b' }}
                            />

                            {/* Icon */}
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                                <UserX className="w-5 h-5 text-orange-400" />
                              </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-orange-400">Open Shift</div>
                              <div className="text-sm text-theme-tertiary">
                                {shift.role_required || shift.section_name || 'Any role'}
                              </div>
                            </div>

                            {/* Time + Chevron */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <div className="text-right">
                                <div className="text-theme-primary font-medium text-sm">
                                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                </div>
                                <div className="text-theme-tertiary text-xs">
                                  {hours}h
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-theme-tertiary" />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Day Selector - Bottom */}
        <div className="fixed left-0 right-0 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur border-t border-black/10 dark:border-white/10 px-4 py-2 z-10 lg:hidden" style={{ bottom: 'calc(var(--bottom-tab-height) + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex items-center justify-between gap-1">
            {weekDays.map((day) => {
              const dayStr = day.toISOString().split('T')[0];
              const isSelected = dayStr === mobileSelectedDayStr;
              const dayIsToday = day.toDateString() === new Date().toDateString();
              const dayShiftCount = shifts.filter(s => s.shift_date === dayStr).length;

              return (
                <button
                  key={dayStr}
                  onClick={() => setMobileSelectedDay(day)}
                  className={`flex-1 py-2 px-1 rounded-lg text-center transition-colors ${
                    isSelected
                      ? 'bg-purple-100 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-500/50'
                      : 'bg-black/5 dark:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`text-[10px] uppercase ${isSelected ? 'text-module-fg' : dayIsToday ? 'text-module-fg' : 'text-theme-tertiary'}`}>
                    {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </div>
                  <div className={`text-sm font-medium ${isSelected ? 'text-theme-primary' : 'text-theme-secondary'}`}>
                    {day.getDate()}
                  </div>
                  {dayShiftCount > 0 && (
                    <div className={`text-[9px] ${isSelected ? 'text-purple-600 dark:text-purple-300' : 'text-theme-tertiary'}`}>
                      {dayShiftCount}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Shift Action Sheet */}
        <ShiftActionSheet
          shift={selectedMobileShift}
          staffMember={selectedMobileShift?.profile_id ? getStaffMember(selectedMobileShift.profile_id) : null}
          isOpen={isShiftActionOpen}
          onClose={() => {
            setIsShiftActionOpen(false);
            setSelectedMobileShift(null);
          }}
          onClockIn={async () => {
            if (!selectedSite) {
              toast.error('No site selected');
              return;
            }
            const response = await fetch('/api/attendance/clock-in', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ siteId: selectedSite }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to clock in');
            toast.success('Clocked in successfully');
            setUserAttendanceStatus({ onShift: true });
          }}
          onClockOut={async () => {
            const response = await fetch('/api/attendance/clock-out', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to clock out');
            toast.success('Clocked out successfully');
            setUserAttendanceStatus({ onShift: false });
          }}
          onRecordAbsence={async (shiftId, profileId, reason, notes) => {
            const { error } = await supabase.from('staff_attendance').insert({
              profile_id: profileId,
              company_id: companyId,
              site_id: selectedSite,
              clock_in_time: new Date().toISOString(),
              shift_status: 'absent',
              shift_notes: `${reason}${notes ? ': ' + notes : ''}`,
            });
            if (error) throw error;
            toast.success('Absence recorded');
          }}
          onEditShift={(shift) => {
            setEditingShift(shift as Shift);
          }}
          currentUserId={profile?.id}
          isUserClockedIn={userAttendanceStatus?.onShift ?? false}
          canManageRota={canManageRota}
          siteId={selectedSite}
        />
      </div>
    );
  }

  // ============================================
  // DESKTOP VIEW - Weekly Grid
  // ============================================
  return (
    <div className="rota-print-root h-[calc(100vh-8rem)] flex flex-col">
      <style jsx global>{`
        @media print {
          /* Hide app chrome */
          aside,
          header,
          .ios-sticky-header,
          .no-print {
            display: none !important;
          }

          /* Remove dashboard padding/scroll constraints */
          main {
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }

          /* Make rota fully printable */
          .rota-print-root {
            height: auto !important;
          }

          .rota-print-root,
          .rota-print-root * {
            color: #111 !important;
            box-shadow: none !important;
          }

          .rota-print-root .rota-staff-panel {
            display: none !important;
          }

          .rota-print-root .rota-week-grid {
            border: 1px solid #ddd !important;
          }

          .rota-print-root .overflow-y-auto {
            overflow: visible !important;
            max-height: none !important;
          }

          .rota-print-root .bg-theme-surface\\/50,
          .rota-print-root .bg-neutral-950,
          .rota-print-root .bg-theme-surface,
          .rota-print-root .bg-theme-surface\\/80,
          .rota-print-root .bg-theme-surface\\/50,
          .rota-print-root .bg-theme-surface {
            background: transparent !important;
          }

          .rota-print-root .border-neutral-800 {
            border-color: #ddd !important;
          }

          .rota-print-root .divide-neutral-800 > :not([hidden]) ~ :not([hidden]) {
            border-color: #ddd !important;
          }

          .print-only {
            display: block !important;
          }

          /* Repeat header row on each printed page */
          .rota-print-grid {
            width: 100% !important;
            border-collapse: collapse !important;
          }

          .rota-print-header-row {
            display: table-header-group !important;
            page-break-inside: avoid !important;
          }

          .rota-print-body-row {
            display: table-row-group !important;
          }

          .rota-print-row {
            page-break-inside: avoid !important;
          }

          /* Prevent page breaks inside staff rows */
          .rota-print-staff-row {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Ensure header repeats on each page */
          @page {
            margin: 1cm;
          }

          /* Table cell styling */
          .rota-print-grid th,
          .rota-print-grid td {
            border-right: 1px solid #ddd !important;
            vertical-align: top !important;
            padding: 8px !important;
          }
        }

        .print-only {
          display: none;
        }
      `}</style>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 xl:gap-4 pb-3 border-b border-theme mb-3 bg-theme-surface-elevated px-4 py-3 -mx-4 -mt-4 sticky top-[112px] z-20 rounded-t-lg">
        <div className="flex items-center gap-3">
          {sites.length > 0 && (
            <select
              value={selectedSite || ''}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="no-print px-3 py-1.5 bg-theme-surface border border-theme rounded-lg text-theme-primary"
            >
              {sites.map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          )}
          <div className="print-only text-sm">
            <span className="font-semibold">Site:</span>{' '}
            {sites.find((s) => s.id === selectedSite)?.name || '—'}
          </div>
          <div className="print-only text-sm">
            <span className="font-semibold">Week:</span>{' '}
            {formatWeekRange()}
          </div>
        </div>

        {/* Week Nav */}
        <div className="no-print flex items-center gap-2">
 <button onClick={goToPreviousWeek} className="p-2 bg-theme-surface hover:bg-theme-hover border border-theme rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-theme-primary" />
          </button>
          <div className="px-4 py-2 bg-module-fg/10 border border-module-fg/20 text-module-fg rounded-lg font-medium min-w-[140px] xl:min-w-[180px] text-center shadow-sm dark:shadow-none">
            <Calendar className="w-4 h-4 inline mr-2" />
            {formatWeekRange()}
          </div>
 <button onClick={goToNextWeek} className="p-2 bg-theme-surface hover:bg-theme-hover border border-theme rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-theme-primary" />
          </button>
        </div>

        {/* Actions */}
        <div className="no-print flex items-center gap-2">
 <button onClick={handleCopyLastWeek} className="flex items-center gap-2 px-2 xl:px-3 py-2 bg-theme-surface hover:bg-theme-hover border border-theme rounded-lg text-theme-primary transition-colors" title="Copy Week">
            <Copy className="w-4 h-4" />
            <span className="hidden xl:inline">Copy Week</span>
          </button>
          <button
            type="button"
            onClick={() => setShowForecastModal(true)}
 className="flex items-center gap-2 px-2 xl:px-3 py-2 bg-theme-surface hover:bg-theme-hover border border-theme rounded-lg text-theme-primary transition-colors"
            title="Forecast"
          >
            <TrendingUp className="w-4 h-4" />
            <span className="hidden xl:inline">Forecast</span>
          </button>
 <div className="flex items-center bg-theme-surface border border-theme rounded-lg overflow-hidden shadow-sm dark:shadow-none">
            <button
              type="button"
              onClick={() => setViewMode('people')}
              className={`px-3 py-2 text-sm transition-colors ${viewMode === 'people' ? 'text-module-fg bg-module-fg/10 font-medium' : 'text-theme-secondary hover:bg-theme-hover'}`}
              title="People view"
            >
              People
            </button>
            <button
              type="button"
              onClick={() => setViewMode('sections')}
              className={`px-3 py-2 text-sm transition-colors ${viewMode === 'sections' ? 'text-module-fg bg-module-fg/10 font-medium' : 'text-theme-secondary hover:bg-theme-hover'}`}
              title="Sections view"
            >
              Sections
            </button>
          </div>

          {/* Actions dropdown: Draft/Notify/Print/Approval/Publish */}
          <div ref={actionsMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setActionsMenuOpen((v) => !v)}
 className="flex items-center gap-2 px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary hover:bg-theme-hover transition-colors shadow-sm dark:shadow-none"
              aria-haspopup="menu"
              aria-expanded={actionsMenuOpen}
              title="Actions"
            >
              <MoreHorizontal className="w-4 h-4" />
              <span className="hidden xl:inline">Actions</span>
            </button>

            {actionsMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded-lg border border-theme bg-theme-surface shadow-xl overflow-hidden z-50"
              >
                <div className="px-3 py-2 text-[11px] text-theme-tertiary border-b border-theme">
                  Status:{' '}
                  <span className="text-theme-primary">
                    {rota?.status === 'pending_approval'
                      ? 'Ready for approval'
                      : rota?.status === 'approved' || rota?.status === 'published'
                        ? 'Approved (Live)'
                        : 'Draft'}
                  </span>
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActionsMenuOpen(false);
                    handleDownloadPDF();
                  }}
                  disabled={isGeneratingPDF}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-theme-primary hover:bg-theme-hover transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    {isGeneratingPDF ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {isGeneratingPDF ? 'Generating…' : 'Download PDF'}
                  </span>
                </button>

                {canManageRota && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      notifyTeamAboutOpenShifts();
                    }}
                    disabled={notifyingOpenShifts || openShifts === 0}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-module-fg hover:bg-theme-hover disabled:opacity-50"
                    title={openShifts === 0 ? 'No open shifts' : 'Notify staff about open shifts'}
                  >
                    <span className="flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      {notifyingOpenShifts ? 'Notifying…' : 'Notify open shifts'}
                    </span>
                    {openShifts > 0 && <span className="text-[11px] text-theme-tertiary">{openShifts}</span>}
                  </button>
                )}

                {rota?.status === 'draft' && canManageRota && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      submitForApproval();
                    }}
                    disabled={submittingForApproval}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-module-fg hover:bg-theme-hover disabled:opacity-50"
                    title="Send to Owner / Area Manager / Ops Manager for approval"
                  >
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      {submittingForApproval ? 'Sending…' : 'Send for approval'}
                    </span>
                  </button>
                )}

                {rota?.status === 'pending_approval' && canApproveRota && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      approveCurrentRota();
                    }}
                    disabled={approvingRota}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-module-fg hover:bg-theme-hover disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      {approvingRota ? 'Approving…' : 'Approve'}
                    </span>
                  </button>
                )}

                {/* Publish step removed — approved is now the final visible state */}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Week Grid */}
        <div className="rota-week-grid flex-1 bg-theme-surface rounded-lg border border-theme flex flex-col overflow-hidden shadow-sm dark:shadow-none">
          {viewMode === 'people' ? (
            <div className="flex-1 overflow-auto">
              <div className="min-w-[1060px]">
                {/* Sticky header: days + weekly forecast inputs */}
                <div className="sticky top-0 z-10 bg-theme-button border-b border-theme">
                  <div className="grid grid-cols-[240px_80px_repeat(7,minmax(0,1fr))] divide-x divide-theme">
                    <div className="px-3 py-2 text-xs font-semibold text-theme-secondary">Team</div>
                    <div className="px-3 py-2 text-xs font-semibold text-theme-secondary text-center">Hours</div>
                    {weekDays.map((d) => {
                      const ds = d.toISOString().split('T')[0];
                      const isToday = d.toDateString() === new Date().toDateString();
                      const isClosed = isDateClosed(ds);
                      const f = forecasts[ds];
                      const summary =
                        (f?.target_hours && f.target_hours > 0)
                          ? `Target ${f.target_hours}h`
                          : (f?.predicted_revenue && f.predicted_revenue > 0)
                            ? `£${(f.predicted_revenue / 100).toFixed(0)}`
                            : '';
                      return (
                        <div key={ds} className={`px-3 py-2 ${isToday ? 'bg-module-fg/[0.08]' : isClosed ? 'bg-red-50 dark:bg-red-500/10' : ''}`}>
                          <div className={`text-xs font-medium ${isToday ? 'text-module-fg' : isClosed ? 'text-red-600 dark:text-red-400' : 'text-theme-secondary'}`}>
                            {d.toLocaleDateString('en-GB', { weekday: 'short' })} {d.getDate()}
                            {isClosed && <span className="ml-1 text-[10px]">🔒</span>}
                          </div>
                          {summary && !isClosed && <div className="text-[10px] text-theme-secondary mt-1">{summary}</div>}
                          {isClosed && <div className="text-[10px] text-red-600 dark:text-red-400 mt-1">Closed</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Staff rows */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={pointerWithin}
                  onDragStart={(event) => setActiveId(event.active.id as string)}
                  onDragEnd={(event) => {
                    setActiveId(null);
                    if (event.active.id.toString().startsWith('staff-')) {
                      handleStaffDragEnd(event);
                    } else if (event.active.id.toString().startsWith('shift-')) {
                      handleShiftDragEnd(event);
                    }
                  }}
                  onDragCancel={() => setActiveId(null)}
                >
                  <SortableContext
                    items={rosterItemsForPeopleView
                      .filter((item) => item.type === 'staff')
                      .map((item) => `staff-${item.staffId}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="divide-y divide-theme">
                      {rosterItemsForPeopleView.map((item, idx) => {
                    if (item.type === 'divider') {
                      return (
                        <div key={`div-${item.sectionId}-${idx}`} className="grid grid-cols-[240px_80px_repeat(7,minmax(0,1fr))]">
                          <div className="col-span-9 px-3 py-2 bg-theme-button border-b border-theme relative">
                            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: item.color }} />
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold text-theme-primary/90 pl-2">{item.name}</div>
                              {sectionsEnabled && canManageRota && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => moveRosterItem(idx, 'up')}
                                    disabled={idx === 0}
                                    className="text-[10px] text-theme-tertiary hover:text-theme-primary disabled:opacity-30"
                                    title="Move divider up"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveRosterItem(idx, 'down')}
                                    disabled={idx === rosterItemsForPeopleView.length - 1}
                                    className="text-[10px] text-theme-tertiary hover:text-theme-primary disabled:opacity-30"
                                    title="Move divider down"
                                  >
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeDividerFromRoster(idx)}
                                    className="text-[10px] text-theme-tertiary hover:text-theme-primary"
                                    title="Remove divider"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const person = assignmentStaff.find((s) => s.id === item.staffId);
                    if (!person) return null;
                    const weeklyHours = weeklyHoursByProfile.get(person.id) || 0;
                    const contracted = person.contracted_hours || 0;

                    return (
                      <SortableStaffRow
                        key={person.id}
                        item={item}
                        index={idx}
                        person={person}
                        weeklyHours={weeklyHours}
                        contracted={contracted}
                        canManageRota={canManageRota}
                        weekDays={weekDays}
                        shifts={shifts}
                        onAddShift={(staffId, date) => {
                          setAddingShiftSectionId(null);
                          setAddingShiftStaffId(staffId);
                          setAddingShiftDate(date);
                        }}
                        onEditShift={setEditingShift}
                        onCopyShift={handleCopyShift}
                        onSetCopyingShift={setCopyingShift}
                        isDateClosed={isDateClosed}
                        isStaffOnLeave={isStaffOnLeave}
                      />
                    );
                  })}
                  </div>
                </SortableContext>

                {/* Open shifts row (excluding trials) */}
                <div className="grid grid-cols-[240px_80px_repeat(7,minmax(0,1fr))] bg-module-fg/[0.06]">
                    <div className="px-3 py-2 border-r border-theme text-sm font-semibold text-module-fg">
                      Open shifts
                    </div>
                    <div className="px-2 py-2 border-r border-theme">
                    </div>
                    {weekDays.map((d) => {
                      const ds = d.toISOString().split('T')[0];
                      const isClosed = isDateClosed(ds);
                      const open = shifts
                        .filter((s) => !s.profile_id && s.shift_date === ds && !s.role_required?.includes('TRIAL'))
                        .slice()
                        .sort((a, b) => a.start_time.localeCompare(b.start_time));

                      return (
                        <DroppableDayCell
                          key={`open-${ds}`}
                          id={`day:${ds}:null`}
                          personId="null"
                          dateStr={ds}
                          onClick={() => {
                            if (!isClosed) {
                              setAddingShiftSectionId(null);
                              setAddingShiftStaffId(null);
                              setAddingShiftDate(new Date(ds));
                            }
                          }}
                          className={`px-2 py-2 border-r border-theme text-left min-h-[64px] ${
                            isClosed
                              ? 'bg-red-500/5 opacity-60 cursor-not-allowed'
                              : 'hover:bg-module-fg/[0.04]'
                          }`}
                        >
                          <SortableContext items={open.map((s) => `shift-${s.id}`)}>
                            <div className="space-y-1.5">
                              {open.map((s) => (
                                <SortableShift
                                  key={s.id}
                                  shift={s}
                                  onEdit={setEditingShift}
                                  onCopy={handleCopyShift}
                                  onSetCopyingShift={setCopyingShift}
                                />
                              ))}
                              {open.length === 0 && <div className="text-[10px] text-theme-secondary">+</div>}
                            </div>
                          </SortableContext>
                        </DroppableDayCell>
                      );
                    })}
                </div>

                {/* Trial shifts row */}
                <div className="grid grid-cols-[240px_80px_repeat(7,minmax(0,1fr))] bg-module-fg/[0.10]">
                    <div className="px-3 py-2 border-r border-theme text-sm font-semibold text-module-fg flex items-center gap-2">
                      🎯 Trial Shifts
                    </div>
                    <div className="px-2 py-2 border-r border-theme">
                    </div>
                    {weekDays.map((d) => {
                      const ds = d.toISOString().split('T')[0];
                      const isClosed = isDateClosed(ds);
                      const trials = shifts
                        .filter((s) => !s.profile_id && s.shift_date === ds && s.role_required?.includes('TRIAL'))
                        .slice()
                        .sort((a, b) => a.start_time.localeCompare(b.start_time));

                      return (
                        <DroppableDayCell
                          key={`trial-${ds}`}
                          id={`day:${ds}:trial`}
                          personId="trial"
                          dateStr={ds}
                          onClick={() => {
                            // Don't allow adding shifts to trial row
                          }}
                          className={`px-2 py-2 border-r border-theme text-left min-h-[64px] ${
                            isClosed ? 'bg-red-500/5 opacity-60' : ''
                          }`}
                        >
                          <SortableContext items={trials.map((s) => `shift-${s.id}`)}>
                            <div className="space-y-1.5">
                              {trials.map((s) => (
                                <SortableShift
                                  key={s.id}
                                  shift={s}
                                  onEdit={setEditingShift}
                                  onCopy={handleCopyShift}
                                  onSetCopyingShift={setCopyingShift}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DroppableDayCell>
                      );
                    })}
                </div>
                  {/* Floating drag preview — rendered via portal above everything */}
                  <DragOverlay dropAnimation={null}>
                    {activeId?.startsWith('shift-') ? (() => {
                      const s = shifts.find((sh) => `shift-${sh.id}` === activeId);
                      return s ? <ShiftDragPreview shift={s} /> : null;
                    })() : null}
                  </DragOverlay>
                </DndContext>

                {/* Day totals footer (keeps header clean) */}
                <div className="sticky bottom-0 z-10 bg-theme-button border-t border-theme">
                  <div className="grid grid-cols-[240px_80px_repeat(7,minmax(0,1fr))] divide-x divide-theme">
                    <div className="px-3 py-2 text-xs font-bold text-theme-secondary">Totals</div>
                    <div className="px-3 py-2 text-xs font-bold text-theme-secondary text-center">—</div>
                    {weekDays.map((d) => {
                      const ds = d.toISOString().split('T')[0];
                      const isClosed = isDateClosed(ds);
                      const a = dayAnalysisByDate.get(ds) || { hours: 0, costPence: 0, revenuePence: 0 };
                      const labourPct = a.revenuePence > 0 ? (a.costPence / a.revenuePence) * 100 : null;
                      return (
                        <div key={`totals-${ds}`} className={`px-3 py-2 ${isClosed ? 'bg-red-500/5 opacity-60' : ''}`}>
                          <div className={`text-xs font-bold ${isClosed ? 'text-red-400' : 'text-theme-primary'}`}>
                            £{(a.costPence / 100).toFixed(0)}
                          </div>
                          <div className={`text-[11px] mt-0.5 font-medium ${isClosed ? 'text-red-400/70' : 'text-theme-secondary'}`}>
                            {a.hours.toFixed(1)}h{labourPct !== null ? ` • ${labourPct.toFixed(1)}%` : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Header row: Days */}
                <div className="grid grid-cols-7 divide-x divide-theme border-b border-theme flex-shrink-0">
                {weekDays.map((date) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const isClosed = isDateClosed(dateStr);
                  const dayShifts = shifts.filter(s => s.shift_date === dateStr);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const dayHours = dayShifts.reduce((sum, s) => sum + getShiftNetHours(s), 0);
                  const dayCost = dayShifts.reduce((sum, s) => sum + getShiftCostPence(s), 0);
                  const f = forecasts[dateStr];
                  const summary =
                    (f?.target_hours && f.target_hours > 0)
                      ? `Target ${f.target_hours}h`
                      : (f?.predicted_revenue && f.predicted_revenue > 0)
                        ? `£${(f.predicted_revenue / 100).toFixed(0)}`
                        : '';
                  const labourPct =
                    f?.predicted_revenue && f.predicted_revenue > 0
                      ? (dayCost / f.predicted_revenue) * 100
                      : null;

                  return (
                    <div key={dateStr} className={`${isToday ? 'bg-module-fg/[0.05]' : isClosed ? 'bg-red-500/5' : ''} ${isWeekend ? 'bg-theme-button' : ''}`}>
                      <div className={`p-2 ${isToday ? 'bg-module-fg/[0.08]' : isClosed ? 'bg-red-500/10' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className={`text-xs ${isToday ? 'text-module-fg' : isClosed ? 'text-red-400' : 'text-theme-tertiary'}`}>
                              {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                            </span>
                            <span className={`text-lg font-bold ml-1 ${isToday ? 'text-module-fg' : isClosed ? 'text-red-400' : 'text-theme-primary'}`}>
                              {date.getDate()}
                              {isClosed && <span className="ml-1 text-xs">🔒</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {copyingDayFrom && copyingDayFrom !== dateStr ? (
                              <button
                                onClick={() => {
                                  handleCopyDay(copyingDayFrom, dateStr);
                                  setCopyingDayFrom(null);
                                }}
                                className="px-2 py-1 text-[10px] font-semibold border border-module-fg text-module-fg rounded-md hover:bg-module-fg/10 transition-colors"
                                title="Paste copied day"
                              >
                                Paste
                              </button>
                            ) : (
                              dayShifts.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCopyingDayFrom(dateStr);
                                  }}
                                  className="p-1 hover:bg-theme-hover rounded text-theme-tertiary hover:text-module-fg"
                                  title="Copy day"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}

                            <button
                              onClick={() => {
                                setAddingShiftSectionId(null);
                                setAddingShiftStaffId(null);
                                setAddingShiftDate(date);
                              }}
                              className="p-1 hover:bg-theme-hover rounded text-theme-tertiary hover:text-theme-primary"
                              title="Add shift"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/*
                          Day stats moved to bottom footer row to keep the header clean.
                          (Hours, cost, labour %, open shifts)
                        */}
                        {summary && <div className="mt-1 text-[10px] text-theme-tertiary">{summary}</div>}

                        {copyingDayFrom === dateStr && (
                          <div className="mt-2 w-full p-2 border border-module-fg bg-module-fg/10 rounded-lg text-module-fg text-xs font-medium text-center">
                            Copying… click Paste on another day
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCopyingDayFrom(null);
                              }}
                              className="ml-2 text-theme-tertiary hover:text-theme-primary"
                              title="Cancel copy"
                            >
                              <X className="w-3 h-3 inline" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day totals footer (sections view) */}
              <div className="grid grid-cols-7 divide-x divide-theme border-t border-theme bg-theme-button flex-shrink-0">
                {weekDays.map((date) => {
                  const ds = date.toISOString().split('T')[0];
                  const isClosed = isDateClosed(ds);
                  const a = dayAnalysisByDate.get(ds) || { hours: 0, costPence: 0, revenuePence: 0 };
                  const openCount = shifts.filter((s) => !s.profile_id && s.shift_date === ds).length;
                  const labourPct = a.revenuePence > 0 ? (a.costPence / a.revenuePence) * 100 : null;
                  return (
                    <div key={`footer-${ds}`} className={`p-2 ${isClosed ? 'bg-red-500/5 opacity-60' : ''}`}>
                      <div className={`text-xs font-bold ${isClosed ? 'text-red-400' : 'text-theme-primary'}`}>
                        £{(a.costPence / 100).toFixed(0)}
                      </div>
                      <div className={`text-[11px] mt-0.5 font-medium ${isClosed ? 'text-red-400/70' : 'text-theme-secondary'}`}>
                        {a.hours.toFixed(1)}h{labourPct !== null ? ` • ${labourPct.toFixed(1)}%` : ''}
                        {openCount > 0 ? ` • ${openCount} open` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Body: section rows */}
              <div className="flex-1 overflow-y-auto">
                {sectionsEnabled && sectionedGrid ? (
                  <div className="grid grid-cols-7 divide-x divide-theme">
                    {sectionedGrid.sections.map((sec) => (
                      <div key={sec.id} className="col-span-7">
                        {/* Section divider: full width bar */}
                        <div className="col-span-7 relative px-3 py-2 bg-theme-button border-b border-theme">
                          <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: sec.color }} />
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-theme-primary/90 tracking-wide">
                              {sec.name}
                            </div>
                          </div>
                        </div>

                        {/* Role groups within section */}
                        <div className="grid grid-cols-7">
                          {sec.roleGroups.map((rg) => (
                            <div key={rg.role} className="col-span-7">
                              <div className="col-span-7 px-3 py-1.5 bg-theme-surface/30 border-b border-theme text-[11px] text-theme-secondary font-medium">
                                {rg.role}
                              </div>

                              <div className="grid grid-cols-7 divide-x divide-theme">
                                {sectionedGrid.weekDateStrings.map((ds) => (
                                  <div key={`${sec.id}-${rg.role}-${ds}`} className="p-2 min-h-[110px]">
                                    <div className="space-y-2">
                                      {(rg.byDate[ds] || []).map((shift) => (
                                        <ShiftCard
                                          key={shift.id}
                                          shift={shift}
                                          onClick={() => setEditingShift(shift)}
                                          onAssignStaff={(staffId) => handleAssignStaff(shift.id, staffId)}
                                          onDuplicate={() => handleCopyShift(shift.id, shift.shift_date)}
                                          onCopyTo={() => setCopyingShift(shift)}
                                          staff={assignmentStaff}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Fallback: original day-column layout (no sections) */
                  <div className="grid grid-cols-7 divide-x divide-theme">
                    {weekDays.map((date) => {
                      const dateStr = date.toISOString().split('T')[0];
                      const dayShifts = shifts.filter(s => s.shift_date === dateStr);

                      return (
                        <div key={dateStr} className="p-2">
                          {dayShifts.length === 0 ? (
                            <button
                              onClick={() => {
                                setAddingShiftSectionId(null);
                                setAddingShiftStaffId(null);
                                setAddingShiftDate(date);
                              }}
                              className="w-full h-24 flex flex-col items-center justify-center gap-1 text-theme-secondary hover:text-theme-tertiary border border-dashed border-theme rounded-lg hover:border-module-fg/30 transition-colors"
                            >
                              <Plus className="w-5 h-5" />
                              <span className="text-xs">Add shift</span>
                            </button>
                          ) : (
                            <div className="space-y-2">
                              {dayShifts
                                .slice()
                                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                                .map((shift) => (
                                  <ShiftCard
                                    key={shift.id}
                                    shift={shift}
                                    onClick={() => setEditingShift(shift)}
                                    onAssignStaff={(staffId) => handleAssignStaff(shift.id, staffId)}
                                    onDuplicate={() => handleCopyShift(shift.id, shift.shift_date)}
                                    onCopyTo={() => setCopyingShift(shift)}
                                    staff={assignmentStaff}
                                  />
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats Footer */}
          <div className="flex items-center gap-6 px-4 py-3 bg-theme-button border-t border-theme">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-theme-secondary" />
              <span className="text-theme-secondary">Total Hours:</span>
              <span className="text-theme-primary font-bold">{totalHours.toFixed(1)}h</span>
              {totalTargetHours > 0 && (
                <>
                  {totalTargetHours > 1000 ? (
                    <span 
                      className="text-red-400 cursor-help" 
                      title={
                        suggestedHours 
                          ? `Target hours (${totalTargetHours.toFixed(0)}h) seems unusually high. Did you mean ${suggestedHours.toFixed(1)}h? Please check your forecast values in the Forecast modal.`
                          : `Target hours (${totalTargetHours.toFixed(0)}h) seems unusually high. Maximum recommended is ~168h per week (24h/day). Please check your forecast values in the Forecast modal.`
                      }
                    >
                      {' / '}{totalTargetHours.toFixed(0)}h target ⚠️
                    </span>
                  ) : (
                    <span className={totalHours >= totalTargetHours ? 'text-green-400' : 'text-amber-400'}>
                      {' / '}{totalTargetHours.toFixed(1)}h target
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <PoundSterling className="w-4 h-4 text-theme-secondary" />
              <span className="text-theme-secondary">Labour Cost:</span>
              <span className="text-theme-primary font-bold">£{(totalCost / 100).toFixed(2)}</span>
            </div>

            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-theme-secondary" />
              <span className="text-theme-secondary">Forecast Sales:</span>
              <span className="text-theme-primary font-bold">
                {totalForecastRevenue > 0 ? `£${(totalForecastRevenue / 100).toFixed(0)}` : '—'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-theme-secondary" />
              <span className="text-theme-secondary">Labour %:</span>
              <span className="text-theme-primary font-bold">
                {totalLabourPct !== null ? `${totalLabourPct.toFixed(1)}%` : '—'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-theme-secondary" />
              <span className="text-theme-secondary">Staff:</span>
              <span className="text-theme-primary font-bold">
                {new Set(shifts.filter(s => s.profile_id).map(s => s.profile_id)).size}
              </span>
            </div>

            {openShifts > 0 && (
              <div className="flex items-center gap-2 text-yellow-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>{openShifts} open shifts</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Day-by-Day Approval Panel - shown when rota is pending approval */}
      {rota?.status === 'pending_approval' && rota && (
        <DayApprovalPanel
          rotaId={rota.id}
          weekDays={weekDays}
          forecasts={forecasts}
          shifts={shifts}
          dayAnalysisByDate={dayAnalysisByDate}
          canApprove={canApproveRota}
          onApprovalChange={loadData}
        />
      )}

      {/* Published banner - shown when rota is approved (live to staff) */}
      {(rota?.status === 'approved' || rota?.status === 'published') && (
        <div className="mx-3 mb-3 flex items-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/20 rounded-lg">
          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">Published</span>
          <span className="text-xs text-green-600/70 dark:text-green-400/60">— This rota is live and visible to staff</span>
        </div>
      )}

      {/* Modals */}
      {addingShiftDate && (
        <AddShiftModal
          date={addingShiftDate}
          staff={assignmentStaff}
          sections={sections}
          sectionsEnabled={sectionsEnabled}
          initialSectionId={addingShiftSectionId}
          initialStaffId={addingShiftStaffId}
          lockStaff={!!addingShiftStaffId}
          templates={templates}
          onSave={handleAddShift}
          onClose={() => {
            setAddingShiftDate(null);
            setAddingShiftSectionId(null);
            setAddingShiftStaffId(null);
          }}
        />
      )}

      {editingShift && (
        <EditShiftModal
          shift={editingShift}
          staff={assignmentStaff}
          sections={sections}
          sectionsEnabled={sectionsEnabled}
          onSave={(data) => {
            handleUpdateShift(editingShift.id, data);
            setEditingShift(null);
          }}
          onDelete={() => {
            handleDeleteShift(editingShift.id);
            setEditingShift(null);
          }}
          onClose={() => setEditingShift(null)}
        />
      )}

      {showManageSections && canManageRota && selectedSite && companyId && (
        <ManageSectionsModal
          companyId={companyId}
          siteId={selectedSite}
          sections={sections}
          sectionsEnabled={sectionsEnabled}
          onClose={() => setShowManageSections(false)}
          onReload={loadData}
        />
      )}

      {copyingShift && (
        <CopyShiftModal
          shift={copyingShift}
          weekDays={weekDays}
          onCopyToDates={async (dateStrs) => {
            await handleCopyShiftToDates(copyingShift, dateStrs);
            setCopyingShift(null);
          }}
          onClose={() => setCopyingShift(null)}
        />
      )}

      {showForecastModal && (
        <ForecastModal
          weekDays={weekDays}
          forecasts={forecasts}
          onSaveDay={handleSaveForecast}
          onClose={() => setShowForecastModal(false)}
        />
      )}

    </div>
  );
}
