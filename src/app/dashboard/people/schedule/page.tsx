'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
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
  Check,
  Printer,
} from 'lucide-react';

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
  { id: 'fallback-foh', name: 'FOH', color: '#EC4899', sort_order: 1 },
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
  const [color, setColor] = useState('#EC4899');

  useEffect(() => {
    if (initialStaffId) setSelectedStaff(initialStaffId);
  }, [initialStaffId]);

  const netHours = calculateNetHours(startTime, endTime, breakMins);
  const staffMember = staff.find(s => s.id === selectedStaff);
  const estimatedCost = staffMember ? netHours * staffMember.hourly_rate : 0;

  const applyTemplate = (t: ShiftTemplate) => {
    setSelectedTemplate(t);
    setStartTime(t.start_time);
    setEndTime(t.end_time);
    setBreakMins(t.break_minutes);
    setColor(t.color);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-neutral-900 rounded-xl border border-neutral-700 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-white">Add Shift</h3>
            <p className="text-sm text-neutral-400">{date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick Templates */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Quick Select Template</label>
            <div className="grid grid-cols-3 gap-2">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    selectedTemplate?.id === t.id 
                      ? 'border-[#EC4899] bg-[#EC4899]/10' 
                      : 'border-neutral-700 hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-6 rounded" style={{ backgroundColor: t.color }} />
                    <div>
                      <p className="text-xs font-medium text-white">{t.short_name}</p>
                      <p className="text-[10px] text-neutral-500">{formatTime(t.start_time)}-{formatTime(t.end_time)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Times */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => { setStartTime(e.target.value); setSelectedTemplate(null); }}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => { setEndTime(e.target.value); setSelectedTemplate(null); }}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Break (mins)</label>
              <input
                type="number"
                value={breakMins}
                onChange={(e) => setBreakMins(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
              />
            </div>
          </div>

          {/* Assign Staff */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Assign Staff Member {selectedStaff && <span className="text-[#EC4899]">✓</span>}
            </label>

            {lockStaff ? (
              <div className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm">
                {staffMember?.full_name || 'Selected staff'}
              </div>
            ) : (
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-[#EC4899] focus:ring-1 focus:ring-[#EC4899]"
              >
                <option value="">Leave Open (unassigned)</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} {s.position_title ? `(${s.position_title})` : ''} - £{s.hourly_rate}/hr
                  </option>
                ))}
              </select>
            )}

            {selectedStaff && staffMember && (
              <p className="text-xs text-neutral-400 mt-1">
                Selected: {staffMember.full_name} • Cost: £{estimatedCost.toFixed(2)} for {netHours}h
              </p>
            )}
          </div>

          {/* Section */}
          {sectionsEnabled ? (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Section</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-[#EC4899] focus:ring-1 focus:ring-[#EC4899]"
              >
                <option value="">No section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-xs text-neutral-500">
              Sections are not enabled in the database yet. Apply the `rota_sections` migration to turn this on.
            </div>
          )}

          {/* Summary */}
          <div className="bg-neutral-800/50 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-neutral-400">
                <Clock className="w-4 h-4 inline mr-1" />
                {netHours}h net
              </span>
              {estimatedCost > 0 && (
                <span className="text-neutral-400">
                  <PoundSterling className="w-4 h-4 inline mr-1" />
                  £{estimatedCost.toFixed(2)}
                </span>
              )}
            </div>
            <div 
              className="w-6 h-6 rounded cursor-pointer border border-neutral-600"
              style={{ backgroundColor: color }}
              onClick={() => {
                const colors = ['#EC4899', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
                const idx = colors.indexOf(color);
                setColor(colors[(idx + 1) % colors.length]);
              }}
              title="Click to change color"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-neutral-800">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white"
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
            className="px-4 py-2 !bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg font-medium transition-all duration-200 ease-in-out hover:!bg-transparent"
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
  const estimatedCost = staffMember ? netHours * staffMember.hourly_rate : 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-neutral-900 rounded-xl border border-neutral-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h3 className="text-lg font-semibold text-white">Edit Shift</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Break</label>
              <input
                type="number"
                value={breakMins}
                onChange={(e) => setBreakMins(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1">Assigned To</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
            >
              <option value="">Unassigned</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.full_name} - £{s.hourly_rate}/hr</option>
              ))}
            </select>
          </div>

          {sectionsEnabled && (
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Section</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
              >
                <option value="">No section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-neutral-800/50 rounded-lg p-3 text-sm text-neutral-400">
            {netHours}h net {estimatedCost > 0 && `• £${estimatedCost.toFixed(2)}`}
          </div>
        </div>

        <div className="flex justify-between p-4 border-t border-neutral-800">
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
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white"
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
              className="px-4 py-2 !bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg font-medium transition-all duration-200 ease-in-out hover:!bg-transparent"
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
}: {
  id: string;
  personId: string;
  dateStr: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateStr}-${personId}`,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={`${className} ${isOver ? 'bg-[#EC4899]/20 border-[#EC4899]' : ''}`}
    >
      {children}
    </button>
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
      <div className="px-3 py-1.5 border-r border-neutral-800 bg-neutral-950/10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {canManageRota && (
                <button
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing text-neutral-500 hover:text-white p-1"
                  title="Drag to reorder"
                >
                  <Grip className="w-4 h-4" />
                </button>
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{person.full_name}</div>
                {person.position_title && (
                  <div className="text-[11px] text-neutral-500 truncate mt-0.5">{person.position_title}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hours column */}
      <div className="px-2 py-1.5 border-r border-neutral-800 bg-neutral-950/10 flex items-center justify-center">
        <div className="text-[11px] text-neutral-300 font-medium text-center">
          {weeklyHours.toFixed(1)}h{contracted ? `/${contracted}h` : ''}
        </div>
      </div>

      {/* Day cells */}
      {weekDays.map((d) => {
        const ds = d.toISOString().split('T')[0];
        const personShifts = shifts
          .filter((s) => s.profile_id === person.id && s.shift_date === ds)
          .slice()
          .sort((a, b) => a.start_time.localeCompare(b.start_time));

        return (
          <DroppableDayCell
            key={`${person.id}-${ds}`}
            id={`day-${ds}-${person.id}`}
            personId={person.id}
            dateStr={ds}
            onClick={() => {
              onAddShift(person.id, new Date(ds));
            }}
            className="px-2 py-1.5 border-r border-neutral-800 hover:bg-neutral-900/30 text-left min-h-[52px]"
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
                  <div className="text-[10px] text-neutral-700">+</div>
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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative px-2 py-0.5 rounded-md bg-neutral-800/60 border border-neutral-700 hover:border-neutral-600 group/shift cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onEdit(shift);
      }}
    >
      <div className="w-full text-left pr-20">
        <div className="text-xs text-white font-medium">
          {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
        </div>
      </div>
      {/* Quick actions - always visible */}
      <div className="absolute top-0.5 right-0.5 flex gap-0.5 bg-neutral-900/90 rounded border border-neutral-700/50">
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="p-1 rounded hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-grab active:cursor-grabbing"
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
          className="p-1 rounded hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
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
          className="p-1 rounded hover:bg-neutral-700 text-neutral-300 hover:text-[#EC4899] transition-colors"
          title="Copy to other days"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
      {/* Shift length below */}
      <div className="text-[10px] text-neutral-500 mt-0.5">
        {shift.net_hours}h
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
      <div className="bg-neutral-900 rounded-xl border border-neutral-700 w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-white">Weekly forecast</h3>
            <p className="text-sm text-neutral-400">
              Choose one: {mode === 'hours' ? 'target hours' : 'predicted sales'}.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('hours')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'hours'
                  ? 'bg-transparent border border-[#EC4899] text-[#EC4899]'
                  : 'bg-white/[0.03] border border-white/[0.06] text-neutral-400 hover:text-white'
              }`}
            >
              Target hours
            </button>
            <button
              type="button"
              onClick={() => setMode('sales')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'sales'
                  ? 'bg-transparent border border-[#EC4899] text-[#EC4899]'
                  : 'bg-white/[0.03] border border-white/[0.06] text-neutral-400 hover:text-white'
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
              className="ml-auto text-[11px] font-semibold text-neutral-400 hover:text-white"
            >
              Clear week
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((d) => {
              const ds = d.toISOString().split('T')[0];
              return (
                <div key={ds} className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-2">
                  <div className="text-[11px] text-neutral-400 mb-1">
                    {d.toLocaleDateString('en-GB', { weekday: 'short' })} {d.getDate()}
                  </div>
                  <input
                    value={draft[ds] || ''}
                    inputMode={mode === 'hours' ? 'decimal' : 'numeric'}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [ds]: e.target.value }))}
                    className="w-full px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-white focus:border-[#EC4899] focus:ring-1 focus:ring-[#EC4899]"
                    placeholder={mode === 'hours' ? '0' : '0'}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-neutral-800">
          <button onClick={onClose} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 !bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg font-medium transition-all duration-200 ease-in-out hover:!bg-transparent disabled:opacity-50"
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
      <div
        className="relative w-full px-2.5 py-2 rounded-lg border-l-[3px] bg-neutral-800/70 hover:bg-neutral-800 text-left transition-colors"
        style={{ borderLeftColor: shift.color }}
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
          className="absolute top-1.5 right-1.5 p-1 rounded-md hover:bg-neutral-900/40 text-neutral-400 hover:text-white transition-colors"
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
            <div className={`min-w-0 text-sm font-semibold leading-4 whitespace-normal break-words line-clamp-2 ${
              shift.profile_id ? 'text-white' : 'text-amber-300'
            }`}>
              {shift.profile_id ? shift.profile_name : 'Open shift'}
            </div>
          </div>
          <div className="mt-0.5 text-xs text-neutral-300">
            <span className="font-medium">{formatTime(shift.start_time)}–{formatTime(shift.end_time)}</span>
          </div>
        </button>

        {/* Hours bottom-right */}
        <div className="absolute bottom-1 right-2 text-[10px] text-neutral-500 font-medium">
          {shift.net_hours}h
        </div>

        {/* Open shift: quick assign link */}
        {!shift.profile_id && onAssignStaff && staff && staff.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowAssignMenu(!showAssignMenu);
            }}
            className="mt-1 text-[10px] font-semibold text-[#EC4899] hover:text-[#EC4899]/80"
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
              className="fixed bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl min-w-[180px] overflow-hidden"
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
                className="w-full px-3 py-2 text-left text-xs text-white hover:bg-neutral-800 transition-colors"
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
                  className="w-full px-3 py-2 text-left text-xs text-[#EC4899] hover:bg-neutral-800 transition-colors"
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
                  className="w-full px-3 py-2 text-left text-xs text-white hover:bg-neutral-800 transition-colors"
                >
                  Copy to…
                </button>
              )}

              {!shift.profile_id && onAssignStaff && staff && staff.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowActionsMenu(false);
                    setShowAssignMenu(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-white hover:bg-neutral-800 transition-colors"
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
            className="absolute top-full left-0 right-0 mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-30 max-h-48 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[10px] text-neutral-500 border-b border-neutral-800">Assign to:</div>
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
                className="w-full px-3 py-2 text-left text-xs text-neutral-300 hover:bg-neutral-800 flex items-center gap-2 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#EC4899] to-blue-500 flex items-center justify-center text-white text-[8px] font-medium flex-shrink-0">
                  {s.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{s.full_name}</div>
                  {s.position_title && (
                    <div className="text-[10px] text-neutral-500 truncate">{s.position_title}</div>
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
  const [color, setColor] = useState('#EC4899');
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
      <div className="bg-neutral-900 rounded-xl border border-neutral-700 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-white">Rota Sections</h3>
            <p className="text-sm text-neutral-400">Create sections like FOH / BOH / Bar and group shifts.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!sectionsEnabled && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm">
              Sections aren’t enabled in your database yet. Run the migration `supabase/migrations/20251212000001_rota_sections.sql` then refresh.
            </div>
          )}
          <div className="bg-neutral-800/50 rounded-lg p-3">
            <p className="text-xs text-neutral-400 mb-2">Add section</p>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. FOH"
                className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  const colors = ['#EC4899', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
                  const idx = colors.indexOf(color);
                  setColor(colors[(idx + 1) % colors.length]);
                }}
                className="w-10 h-10 rounded-lg border border-neutral-700"
                style={{ backgroundColor: color }}
                title="Click to change color"
              />
              <button
                type="button"
                disabled={!sectionsEnabled || saving || !name.trim()}
                onClick={handleCreate}
                className="px-4 py-2 !bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg font-medium transition-all duration-200 ease-in-out hover:!bg-transparent disabled:opacity-50"
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
                <div key={s.id} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg border border-neutral-700">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-6 rounded" style={{ backgroundColor: s.color }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{s.name}</p>
                      <p className="text-xs text-neutral-500">Order: {s.sort_order ?? 0}</p>
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
              <p className="text-sm text-neutral-500 text-center py-8">No sections yet</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-neutral-800">
          <button onClick={onClose} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white">
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
      <div className="bg-neutral-900 rounded-xl border border-neutral-700 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-white">Copy shift to…</h3>
            <p className="text-sm text-neutral-400">
              {shift.profile_name || 'Open shift'} • {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-500">Select days</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDates(weekDays.map((d) => d.toISOString().split('T')[0]))}
                className="text-[10px] font-semibold text-neutral-400 hover:text-white"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedDates([])}
                className="text-[10px] font-semibold text-neutral-400 hover:text-white"
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
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-sm transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDate(ds)}
                    className="w-4 h-4 rounded border-neutral-600 bg-neutral-900 text-[#EC4899] focus:ring-[#EC4899] focus:ring-offset-0"
                  />
                  <span>
                    {d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </span>
                </div>
                {isSame && <span className="text-[10px] text-neutral-400">Same day</span>}
              </label>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-neutral-800">
          <button
            type="button"
            disabled={selectedDates.length === 0}
            onClick={() => onCopyToDates(selectedDates)}
            className="px-4 py-2 !bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg font-medium transition-all duration-200 ease-in-out hover:!bg-transparent disabled:opacity-50"
          >
            Copy ({selectedDates.length})
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white">
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
      <div className="bg-neutral-900 rounded-xl border border-neutral-700 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-white">Insert divider</h3>
            <p className="text-sm text-neutral-400">Choose a section label to insert into the roster.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg">
            <X className="w-5 h-5 text-neutral-400" />
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
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-sm transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-6 rounded" style={{ backgroundColor: s.color }} />
                  <span className="truncate">{s.name}</span>
                </div>
                <span className="text-[10px] text-neutral-500">Insert</span>
              </button>
            ))}
          {sections.length === 0 && (
            <div className="text-sm text-neutral-500 text-center py-8">
              No sections yet. Create them first via the Sections button.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-neutral-800">
          <button onClick={onClose} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white">
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
  const { profile, role } = useAppContext();
  const mountedRef = useRef(true);

  const roleLower = (role || profile?.app_role || '').toString().toLowerCase();
  const isManagerLike = roleLower === 'manager' || roleLower === 'general_manager';
  const canManageRota = ['admin', 'owner', 'manager', 'general_manager'].includes(roleLower);
  
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
    if (!profile?.company_id) return;
    
    try {
      const { data, error: err } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', profile.company_id)
        .order('name');

      if (err) {
        console.error('Error loading sites:', err);
        setError(`Failed to load sites: ${err.message}`);
        setSites([]);
        return;
      }

      if (!mountedRef.current) return;
      
      if (data && data.length > 0) {
        setSites(data);
        // Only set selectedSite if it's not already set or if the current selection is invalid
        const homeSite = data.find(s => s.id === profile?.home_site);
        const defaultSiteId = homeSite?.id || data[0].id;
        setSelectedSite((prev) => {
          // If prev is null or not in the new sites list, set to default
          if (!prev || !data.find(s => s.id === prev)) {
            return defaultSiteId;
          }
          return prev; // Keep existing selection
        });
      } else {
        setSites([]);
      }
    } catch (err: any) {
      console.error('Error in loadSites:', err);
      setError(err.message || 'Failed to load sites');
      setSites([]);
    }
  }, [profile?.company_id, profile?.home_site]);

  useEffect(() => {
    if (profile?.company_id && sites.length === 0 && !error) {
      loadSites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.company_id]);

  useEffect(() => {
    if (selectedSite && profile?.company_id) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSite, weekStarting, profile?.company_id]);

  const loadData = useCallback(async () => {
    if (!selectedSite || !profile?.company_id) return;
    if (!mountedRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const weekStr = weekStarting.toISOString().split('T')[0];

      // 1. Get or create rota
      let rotaData: { id: string; status: string } | null = null;
      
      const { data: existingRota, error: rotaErr } = await supabase
        .from('rotas')
        .select('id, status')
        .eq('site_id', selectedSite)
        .eq('week_starting', weekStr)
        .maybeSingle();

      if (rotaErr && rotaErr.code !== 'PGRST116') throw rotaErr;

      if (existingRota) {
        rotaData = existingRota;
      } else {
        const { data: newRota, error: createErr } = await supabase
          .from('rotas')
          .insert({
            company_id: profile.company_id,
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
      }

      if (!mountedRef.current) return;
      setRota(rotaData);

      // 2. Load shifts
      if (rotaData) {
        const baseSelect = `
          id, profile_id, shift_date, start_time, end_time,
          break_minutes, net_hours, estimated_cost,
          role_required, color, status,
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
          setShifts((fallbackResult.data || []).map((s: any) => ({
            ...s,
            profile_name: s.profiles?.full_name,
            profile_avatar: s.profiles?.avatar_url,
            estimated_cost: s.estimated_cost || 0,
            section_id: null,
            section_name: null,
            section_color: null,
          })));
        } else {
          if (!mountedRef.current) return;
          setSectionsEnabled(true);
          setShifts((withSectionsResult.data || []).map((s: any) => ({
            ...s,
            profile_name: s.profiles?.full_name,
            profile_avatar: s.profiles?.avatar_url,
            estimated_cost: s.estimated_cost || 0,
            section_name: s.rota_sections?.name || null,
            section_color: s.rota_sections?.color || null,
          })));
        }
      }

      // 3. Load forecasts
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

      // 4. Load ALL staff for the company using RPC to bypass RLS issues
      console.log('Loading staff for company:', profile.company_id);
      
      let staffData: any[] = [];
      let staffErr: any = null;

      // Try RPC function first (same as employees page) - bypasses RLS
      try {
        const rpcResult = await supabase.rpc('get_company_profiles', {
          p_company_id: profile.company_id
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
        staffData = allProfiles.filter((p: any) => p.status === 'active');
        console.log('Loaded staff via RPC (active only):', { 
          total: staffData.length, 
          totalProfiles: allProfiles.length,
          activeProfiles: staffData.map((p: any) => p.full_name)
        });
        
        // Get site names for home_site
        const siteIds = [...new Set(staffData.map((p: any) => p.home_site).filter(Boolean))];
        let sitesMap = new Map();
        if (siteIds.length > 0) {
          const { data: sitesData } = await supabase
            .from('sites')
            .select('id, name')
            .in('id', siteIds);
          if (sitesData) {
            sitesMap = new Map(sitesData.map(s => [s.id, s.name]));
          }
        }
        
        // Get additional fields (contracted_hours, hourly_rate) via direct query
        // Note: This might be blocked by RLS, but we'll try anyway
        const profileIds = staffData.map((p: any) => p.profile_id);
        console.log('Fetching additional fields for', profileIds.length, 'profiles');
        
        if (profileIds.length > 0) {
          const { data: additionalData, error: additionalError } = await supabase
            .from('profiles')
            .select('id, contracted_hours_per_week, hourly_rate')
            .in('id', profileIds);
          
          if (additionalError) {
            console.warn('Could not fetch additional fields (may be RLS blocked):', additionalError);
            console.log('This is OK - we will use defaults for contracted_hours and hourly_rate');
          }
          
          if (additionalData) {
            console.log('Got additional fields for', additionalData.length, 'profiles');
            const additionalMap = new Map(additionalData.map(p => [p.id, p]));
            staffData = staffData.map((p: any) => ({
              ...p,
              contracted_hours_per_week: additionalMap.get(p.profile_id)?.contracted_hours_per_week,
              hourly_rate: additionalMap.get(p.profile_id)?.hourly_rate,
              site_name: p.home_site ? sitesMap.get(p.home_site) : null
            }));
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
        const directResult = await supabase
          .from('profiles')
          .select(`
            id, full_name, position_title, avatar_url,
            contracted_hours_per_week, hourly_rate, home_site,
            sites:home_site (id, name)
          `)
          .eq('company_id', profile.company_id)
          .eq('status', 'active')
          .order('full_name');
        
        if (directResult.error) {
          console.error('Error loading staff (direct query):', directResult.error);
          staffErr = directResult.error;
        } else {
          staffData = directResult.data || [];
          console.log('Loaded staff via direct query:', { total: staffData.length });
        }
      }

      if (staffErr) {
        console.error('Failed to load staff:', staffErr);
        // Don't throw - just log and continue with empty array
        if (!mountedRef.current) return;
        setStaff([]);
      } else {
        // Format staff data - handle both RPC (profile_id) and direct query (id) formats
        const formattedStaff = (staffData || []).map((p: any) => ({
          id: p.profile_id || p.id, // RPC returns profile_id, direct query returns id
          full_name: p.full_name || 'Unknown',
          position_title: p.position_title,
          avatar_url: p.avatar_url,
          contracted_hours: p.contracted_hours_per_week || 40,
          hourly_rate: p.hourly_rate || 12,
          home_site: p.home_site,
          home_site_name: p.sites?.name || p.site_name || null,
        }));

        console.log('Formatted staff:', {
          total: formattedStaff.length,
          company_id: profile.company_id,
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

      // 5. Load sections for this site (fallback if table not deployed yet)
      try {
        const { data: sectionsData, error: sectionsErr } = await supabase
          .from('rota_sections')
          .select('id, name, color, sort_order')
          .eq('company_id', profile.company_id)
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
            color: s.color || '#EC4899',
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
      console.error('Load error:', err);
      setError(err.message);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [selectedSite, weekStarting, profile?.company_id]);

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
        color: section.color || '#EC4899',
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

    return { weekDateStrings, sections: result };
  }, [sectionsEnabled, shifts, orderedSections, staffPositionMap, weekDays, roleSortScore]);

  const staffRateMap = useMemo(() => {
    return new Map(staff.map((s) => [s.id, s.hourly_rate]));
  }, [staff]);

  const getShiftCostPence = useCallback((shift: Shift): number => {
    // Prefer DB value if present
    if (typeof shift.estimated_cost === 'number' && shift.estimated_cost > 0) {
      return shift.estimated_cost;
    }

    // Fallback: compute from staff hourly rate (assumed £/hr) and net hours
    if (shift.profile_id) {
      const rate = staffRateMap.get(shift.profile_id);
      if (typeof rate === 'number' && rate > 0) {
        return Math.round((shift.net_hours || 0) * rate * 100);
      }
    }

    return 0;
  }, [staffRateMap]);

  const siteStaff = useMemo(() => {
    if (!selectedSite) return staff;
    return staff.filter(s => s.home_site === selectedSite);
  }, [staff, selectedSite]);

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
  const totalHours = shifts.reduce((sum, s) => sum + (s.net_hours || 0), 0);
  const totalCost = shifts.reduce((sum, s) => sum + getShiftCostPence(s), 0);
  const openShifts = shifts.filter(s => !s.profile_id).length;
  const totalTargetHours = Object.values(forecasts).reduce((sum, f) => sum + (f.target_hours || 0), 0);

  const weeklyHoursByProfile = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of shifts) {
      if (!s.profile_id) continue;
      map.set(s.profile_id, (map.get(s.profile_id) || 0) + (s.net_hours || 0));
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

  // ============================================
  // ACTIONS
  // ============================================

  const handleAddShift = async (data: { profile_id: string | null; start_time: string; end_time: string; break_minutes: number; color: string; section_id: string | null }) => {
    if (!rota || !addingShiftDate || !profile?.company_id) {
      console.error('Cannot add shift: missing rota, date, or company_id', { rota, addingShiftDate, company_id: profile?.company_id });
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
      const cost = staffMember ? Math.round(netHours * staffMember.hourly_rate * 100) : 0;

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
        company_id: profile.company_id,
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
        updateData.estimated_cost = Math.round(data.net_hours * staffMember.hourly_rate * 100);
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
    if (!shift || !rota || !profile?.company_id) {
      console.error('Cannot copy shift: missing shift, rota, or company_id');
      return;
    }

    try {
      const targetDateStr = targetDate || shift.shift_date;
      const staffMember = shift.profile_id ? staff.find(s => s.id === shift.profile_id) : null;
      const cost = staffMember ? Math.round(shift.net_hours * staffMember.hourly_rate * 100) : 0;

      const { error } = await supabase.from('rota_shifts').insert({
        rota_id: rota.id,
        company_id: profile.company_id,
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
    if (!rota || !profile?.company_id) return;

    const uniqueDates = Array.from(new Set(targetDates)).filter(Boolean);
    if (uniqueDates.length === 0) return;

    try {
      const staffMember = shift.profile_id ? staff.find(s => s.id === shift.profile_id) : null;
      const cost = staffMember ? Math.round(shift.net_hours * staffMember.hourly_rate * 100) : 0;

      const rows = uniqueDates.map((dateStr) => {
        const row: any = {
          rota_id: rota.id,
          company_id: profile.company_id,
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
    if (overId.startsWith('day-')) {
      // Parse: day-{date}-{staffId}
      // Date format is YYYY-MM-DD (has dashes), so we need to be careful
      const match = overId.match(/^day-(.+?)-(.+)$/);
      if (!match) return;
      
      const dateStr = match[1]; // e.g., "2024-01-15"
      const staffId = match[2]; // e.g., "uuid" or "null"

      // Move shift to new date and optionally new staff
      const updateData: any = {
        shift_date: dateStr,
      };
      if (staffId && staffId !== 'null' && staffId !== 'undefined') {
        updateData.profile_id = staffId;
      } else {
        updateData.profile_id = null;
      }

      const { error } = await supabase
        .from('rota_shifts')
        .update(updateData)
        .eq('id', shiftId);

      if (error) {
        console.error('Error moving shift:', error);
        alert(`Failed to move shift: ${error.message}`);
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
    if (!rota || !profile?.company_id) {
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
        const cost = staffMember ? Math.round(shift.net_hours * staffMember.hourly_rate * 100) : 0;
        
        const base: any = {
          rota_id: rota.id,
          company_id: profile.company_id,
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
      const cost = Math.round(shift.net_hours * staffMember.hourly_rate * 100);
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
    if (!rota || !profile?.company_id) return;

    const lastWeek = new Date(weekStarting);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const { data: lastRota } = await supabase
      .from('rotas')
      .select('id')
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

    const newShifts = lastShifts.map(s => {
      const oldDate = new Date(s.shift_date);
      oldDate.setDate(oldDate.getDate() + 7);
      return {
        rota_id: rota.id,
        company_id: profile.company_id,
        profile_id: s.profile_id,
        shift_date: oldDate.toISOString().split('T')[0],
        start_time: s.start_time,
        end_time: s.end_time,
        break_minutes: s.break_minutes,
        net_hours: s.net_hours,
        estimated_cost: s.estimated_cost,
        color: s.color,
        status: 'scheduled'
      };
    });

    await supabase.from('rota_shifts').insert(newShifts);
    loadData();
  };

  const handlePublish = async () => {
    if (!rota) return;
    if (openShifts > 0 && !confirm(`${openShifts} shifts are unassigned. Publish anyway?`)) return;
    
    await supabase.from('rotas').update({ status: 'published' }).eq('id', rota.id);
    loadData();
  };

  const handleSaveForecast = async (date: string, data: DayForecast) => {
    if (!rota || !profile?.company_id) return;

    const existing = forecasts[date];
    
    if (existing) {
      // Update existing forecast
      const { data: forecastData } = await supabase
        .from('rota_forecasts')
        .select('id')
        .eq('rota_id', rota.id)
        .eq('forecast_date', date)
        .single();

      if (forecastData) {
        await supabase
          .from('rota_forecasts')
          .update({
            predicted_revenue: data.predicted_revenue,
            target_hours: data.target_hours,
            notes: data.notes,
          })
          .eq('id', forecastData.id);
      }
    } else {
      // Create new forecast
      await supabase.from('rota_forecasts').insert({
        rota_id: rota.id,
        company_id: profile.company_id,
        site_id: selectedSite,
        forecast_date: date,
        predicted_revenue: data.predicted_revenue,
        target_hours: data.target_hours,
        notes: data.notes,
      });
    }

    setForecasts(prev => ({ ...prev, [date]: data }));
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading && !rota) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EC4899]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-2">Error loading rota</p>
          <p className="text-neutral-500 text-sm">{error}</p>
          <button onClick={loadData} className="mt-4 px-4 py-2 bg-neutral-800 rounded-lg text-white">
            Retry
          </button>
        </div>
      </div>
    );
  }

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

          .rota-print-root .bg-neutral-900\\/50,
          .rota-print-root .bg-neutral-950,
          .rota-print-root .bg-neutral-800,
          .rota-print-root .bg-neutral-800\\/80,
          .rota-print-root .bg-neutral-800\\/50,
          .rota-print-root .bg-neutral-900 {
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
        }

        .print-only {
          display: none;
        }
      `}</style>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-neutral-800 mb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Rota</h1>
          {sites.length > 0 && (
            <select
              value={selectedSite || ''}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="no-print px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
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
          <button onClick={goToPreviousWeek} className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <div className="px-4 py-2 bg-[#EC4899]/20 text-[#EC4899] rounded-lg font-medium min-w-[180px] text-center">
            <Calendar className="w-4 h-4 inline mr-2" />
            {formatWeekRange()}
          </div>
          <button onClick={goToNextWeek} className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg">
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Actions */}
        <div className="no-print flex items-center gap-2">
          <button onClick={handleCopyLastWeek} className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white">
            <Copy className="w-4 h-4" />
            Copy Week
          </button>
          <button
            type="button"
            onClick={() => setShowForecastModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white"
            title="Forecast"
          >
            <TrendingUp className="w-4 h-4" />
            Forecast
          </button>
          <div className="flex items-center bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('people')}
              className={`px-3 py-2 text-sm ${viewMode === 'people' ? 'text-[#EC4899] bg-[#EC4899]/10' : 'text-white hover:bg-neutral-700'}`}
              title="People view"
            >
              People
            </button>
            <button
              type="button"
              onClick={() => setViewMode('sections')}
              className={`px-3 py-2 text-sm ${viewMode === 'sections' ? 'text-[#EC4899] bg-[#EC4899]/10' : 'text-white hover:bg-neutral-700'}`}
              title="Sections view"
            >
              Sections
            </button>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          {canManageRota && (
            <button
              onClick={() => setShowManageSections(true)}
              className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white"
            >
              <Grip className="w-4 h-4" />
              Sections
            </button>
          )}
          {rota?.status === 'draft' ? (
            <button onClick={handlePublish} className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg font-medium transition-all duration-200 ease-in-out">
              <Send className="w-4 h-4" />
              Publish
            </button>
          ) : (
            <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg">
              <Check className="w-4 h-4 inline mr-1" /> Published
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Week Grid */}
        <div className="rota-week-grid flex-1 bg-neutral-900/50 rounded-xl border border-neutral-800 flex flex-col overflow-hidden">
          {viewMode === 'people' ? (
            <div className="flex-1 overflow-auto">
              <div className="min-w-[1060px]">
                {/* Sticky header: days + weekly forecast inputs */}
                <div className="sticky top-0 z-10 bg-neutral-950/20 border-b border-neutral-800">
                  <div className="grid grid-cols-[240px_80px_repeat(7,minmax(0,1fr))] divide-x divide-neutral-800">
                    <div className="px-3 py-2 text-xs font-semibold text-neutral-400">Team</div>
                    <div className="px-3 py-2 text-xs font-semibold text-neutral-400 text-center">Hours</div>
                    {weekDays.map((d) => {
                      const ds = d.toISOString().split('T')[0];
                      const isToday = d.toDateString() === new Date().toDateString();
                      const f = forecasts[ds];
                      const summary =
                        (f?.target_hours && f.target_hours > 0)
                          ? `Target ${f.target_hours}h`
                          : (f?.predicted_revenue && f.predicted_revenue > 0)
                            ? `£${(f.predicted_revenue / 100).toFixed(0)}`
                            : '';
                      return (
                        <div key={ds} className={`px-3 py-2 ${isToday ? 'bg-[#EC4899]/10' : ''}`}>
                          <div className={`text-xs ${isToday ? 'text-[#EC4899]' : 'text-neutral-500'}`}>
                            {d.toLocaleDateString('en-GB', { weekday: 'short' })} {d.getDate()}
                          </div>
                          {summary && <div className="text-[10px] text-neutral-500 mt-1">{summary}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Staff rows */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={(event) => setActiveId(event.active.id as string)}
                  onDragEnd={(event) => {
                    setActiveId(null);
                    if (event.active.id.toString().startsWith('staff-')) {
                      handleStaffDragEnd(event);
                    } else if (event.active.id.toString().startsWith('shift-')) {
                      handleShiftDragEnd(event);
                    }
                  }}
                >
                  <SortableContext
                    items={rosterItemsForPeopleView
                      .filter((item) => item.type === 'staff')
                      .map((item) => `staff-${item.staffId}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="divide-y divide-neutral-800">
                      {rosterItemsForPeopleView.map((item, idx) => {
                    if (item.type === 'divider') {
                      return (
                        <div key={`div-${item.sectionId}-${idx}`} className="grid grid-cols-[240px_80px_repeat(7,minmax(0,1fr))]">
                          <div className="col-span-9 px-3 py-2 bg-neutral-950/30 border-b border-neutral-800 relative">
                            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: item.color }} />
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold text-white/90 pl-2">{item.name}</div>
                              {sectionsEnabled && canManageRota && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => moveRosterItem(idx, 'up')}
                                    disabled={idx === 0}
                                    className="text-[10px] text-neutral-500 hover:text-white disabled:opacity-30"
                                    title="Move divider up"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveRosterItem(idx, 'down')}
                                    disabled={idx === rosterItemsForPeopleView.length - 1}
                                    className="text-[10px] text-neutral-500 hover:text-white disabled:opacity-30"
                                    title="Move divider down"
                                  >
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeDividerFromRoster(idx)}
                                    className="text-[10px] text-neutral-500 hover:text-white"
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
                        assignmentStaff={assignmentStaff}
                        onAddShift={(staffId, date) => {
                          setAddingShiftSectionId(null);
                          setAddingShiftStaffId(staffId);
                          setAddingShiftDate(date);
                        }}
                        onEditShift={setEditingShift}
                        onCopyShift={handleCopyShift}
                        onSetCopyingShift={setCopyingShift}
                        moveRosterItem={moveRosterItem}
                        removeDividerFromRoster={removeDividerFromRoster}
                        sectionsEnabled={sectionsEnabled}
                      />
                    );
                  })}


                  {/* Open shifts row */}
                  <div className="grid grid-cols-[240px_80px_repeat(7,minmax(0,1fr))] bg-neutral-950/10">
                    <div className="px-3 py-2 border-r border-neutral-800 text-sm font-semibold text-amber-300">
                      Open shifts
                    </div>
                    <div className="px-2 py-2 border-r border-neutral-800">
                    </div>
                    {weekDays.map((d) => {
                      const ds = d.toISOString().split('T')[0];
                      const open = shifts
                        .filter((s) => !s.profile_id && s.shift_date === ds)
                        .slice()
                        .sort((a, b) => a.start_time.localeCompare(b.start_time));

                      return (
                        <DroppableDayCell
                          key={`open-${ds}`}
                          id={`day-${ds}-null`}
                          personId="null"
                          dateStr={ds}
                          onClick={() => {
                            setAddingShiftSectionId(null);
                            setAddingShiftStaffId(null);
                            setAddingShiftDate(new Date(ds));
                          }}
                          className="px-2 py-2 border-r border-neutral-800 hover:bg-neutral-900/30 text-left min-h-[64px]"
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
                              {open.length === 0 && <div className="text-[10px] text-neutral-700">+</div>}
                            </div>
                          </SortableContext>
                        </DroppableDayCell>
                      );
                    })}
                    </div>
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            ) : (
              <div>
                {/* Header row: Days */}
                <div className="grid grid-cols-7 divide-x divide-neutral-800 border-b border-neutral-800">
                {weekDays.map((date) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const dayShifts = shifts.filter(s => s.shift_date === dateStr);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const dayHours = dayShifts.reduce((sum, s) => sum + s.net_hours, 0);
                  const dayCost = dayShifts.reduce((sum, s) => sum + getShiftCostPence(s), 0);
                  const f = forecasts[dateStr];
                  const summary =
                    (f?.target_hours && f.target_hours > 0)
                      ? `Target ${f.target_hours}h`
                      : (f?.predicted_revenue && f.predicted_revenue > 0)
                        ? `£${(f.predicted_revenue / 100).toFixed(0)}`
                        : '';

                  return (
                    <div key={dateStr} className={`${isToday ? 'bg-[#EC4899]/5' : ''} ${isWeekend ? 'bg-neutral-950/30' : ''}`}>
                      <div className={`p-2 ${isToday ? 'bg-[#EC4899]/10' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className={`text-xs ${isToday ? 'text-[#EC4899]' : 'text-neutral-500'}`}>
                              {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                            </span>
                            <span className={`text-lg font-bold ml-1 ${isToday ? 'text-[#EC4899]' : 'text-white'}`}>
                              {date.getDate()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {copyingDayFrom && copyingDayFrom !== dateStr ? (
                              <button
                                onClick={() => {
                                  handleCopyDay(copyingDayFrom, dateStr);
                                  setCopyingDayFrom(null);
                                }}
                                className="px-2 py-1 text-[10px] font-semibold border border-[#EC4899] text-[#EC4899] rounded-md hover:bg-[#EC4899]/10 transition-colors"
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
                                  className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-[#EC4899]"
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
                              className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white"
                              title="Add shift"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                          <span>{dayHours}h</span>
                          <span>•</span>
                          <span>£{(dayCost / 100).toFixed(0)}</span>
                          {dayShifts.filter(s => !s.profile_id).length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400">{dayShifts.filter(s => !s.profile_id).length} open</span>
                            </>
                          )}
                        </div>
                        {summary && <div className="mt-1 text-[10px] text-neutral-500">{summary}</div>}

                        {copyingDayFrom === dateStr && (
                          <div className="mt-2 w-full p-2 border border-[#EC4899] bg-[#EC4899]/10 rounded-lg text-[#EC4899] text-xs font-medium text-center">
                            Copying… click Paste on another day
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCopyingDayFrom(null);
                              }}
                              className="ml-2 text-neutral-400 hover:text-white"
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

              {/* Body: section rows */}
              <div className="flex-1 overflow-y-auto">
                {sectionsEnabled && sectionedGrid ? (
                  <div className="grid grid-cols-7 divide-x divide-neutral-800">
                    {sectionedGrid.sections.map((sec) => (
                      <div key={sec.id} className="col-span-7">
                        {/* Section divider: full width bar */}
                        <div className="col-span-7 relative px-3 py-2 bg-neutral-950/40 border-b border-neutral-800">
                          <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: sec.color }} />
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-white/90 tracking-wide">
                              {sec.name}
                            </div>
                          </div>
                        </div>

                        {/* Role groups within section */}
                        <div className="grid grid-cols-7">
                          {sec.roleGroups.map((rg) => (
                            <div key={rg.role} className="col-span-7">
                              <div className="col-span-7 px-3 py-1.5 bg-neutral-900/30 border-b border-neutral-800 text-[11px] text-neutral-300 font-medium">
                                {rg.role}
                              </div>

                              <div className="grid grid-cols-7 divide-x divide-neutral-800">
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
                  // Fallback: original day-column layout (no sections)
                  <div className="grid grid-cols-7 divide-x divide-neutral-800">
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
                              className="w-full h-24 flex flex-col items-center justify-center gap-1 text-neutral-600 hover:text-neutral-400 border border-dashed border-neutral-700/50 rounded-lg hover:border-neutral-600 transition-colors"
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
          <div className="flex items-center gap-6 px-4 py-3 bg-neutral-950 border-t border-neutral-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-500" />
              <span className="text-neutral-400">Total Hours:</span>
              <span className="text-white font-bold">{totalHours}h</span>
              {totalTargetHours > 0 && (
                <span className={totalHours >= totalTargetHours ? 'text-green-400' : 'text-amber-400'}>
                  / {totalTargetHours}h target
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <PoundSterling className="w-4 h-4 text-neutral-500" />
              <span className="text-neutral-400">Labour Cost:</span>
              <span className="text-white font-bold">£{(totalCost / 100).toFixed(2)}</span>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-500" />
              <span className="text-neutral-400">Staff:</span>
              <span className="text-white font-bold">
                {new Set(shifts.filter(s => s.profile_id).map(s => s.profile_id)).size}
              </span>
            </div>

            {openShifts > 0 && (
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>{openShifts} open shifts</span>
              </div>
            )}
          </div>
        </div>
      </div>

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

      {showManageSections && canManageRota && selectedSite && profile?.company_id && (
        <ManageSectionsModal
          companyId={profile.company_id}
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
