'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Staff, StaffHours } from './types';
import { 
  AlertCircle, 
  CheckCircle,
  Search,
} from 'lucide-react';
import { useState, useMemo } from 'react';

interface StaffListProps {
  staff: Staff[];
  staffHours: StaffHours[];
  onDragStart?: (staff: Staff) => void;
  selectedSkillFilter?: string;
  onSkillFilterChange?: (skill: string) => void;
}

function DraggableStaffCard({ 
  person, 
  hours 
}: { 
  person: Staff; 
  hours?: StaffHours;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `staff-${person.id}`,
    data: { type: 'staff', staff: person }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const contracted = person.contracted_hours || 0;
  const scheduledHours = hours?.scheduled_hours || 0;
  const hoursPercent = contracted > 0 ? (scheduledHours / contracted) * 100 : 0;
  const hoursDiff = scheduledHours - contracted;
  
  const getHoursColor = () => {
    if (contracted === 0) return 'bg-neutral-600';
    if (hoursPercent > 110) return 'bg-amber-500'; // Overtime
    if (hoursPercent >= 90) return 'bg-green-500'; // Good
    return 'bg-blue-500'; // Under
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-2 bg-neutral-800/80 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:border-neutral-500 ${
        person.is_ready ? 'border-neutral-700' : 'border-amber-500/30'
      } ${isDragging ? 'ring-2 ring-[#EC4899]' : ''}`}
    >
      <div className="flex items-center gap-2">
        {/* Avatar */}
        {person.avatar_url ? (
          <img src={person.avatar_url} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EC4899] to-blue-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
            {person.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{person.full_name}</p>
          <p className="text-xs text-neutral-500 truncate">{person.position_title || 'Staff'}</p>
        </div>

        {!person.is_ready && (
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" title={person.missing_items.join(', ')} />
        )}
      </div>

      {/* Hours Progress */}
      {contracted > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-neutral-400">{scheduledHours}h / {contracted}h</span>
            <span className={hoursDiff > 0 ? 'text-amber-400' : hoursDiff < -4 ? 'text-blue-400' : 'text-green-400'}>
              {hoursDiff > 0 ? `+${hoursDiff}` : hoursDiff}h
            </span>
          </div>
          <div className="h-1 bg-neutral-700 rounded-full overflow-hidden">
            <div className={`h-full ${getHoursColor()} transition-all`} style={{ width: `${Math.min(hoursPercent, 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

interface StaffListProps {
  staff: Staff[];
  staffHours: StaffHours[];
  selectedSite?: string | null;
  selectedSkillFilter?: string;
  onSkillFilterChange?: (skill: string) => void;
}

export function StaffList({ 
  staff, 
  staffHours,
  selectedSite,
  selectedSkillFilter,
  onSkillFilterChange 
}: StaffListProps) {
  const [search, setSearch] = useState('');
  const [showAllStaff, setShowAllStaff] = useState(true);

  // Filter staff
  const filteredStaff = useMemo(() => {
    const result = staff.filter(s => {
      const matchesSearch = !search || 
        s.full_name.toLowerCase().includes(search.toLowerCase());
      const matchesSkill = !selectedSkillFilter || 
        s.skills.includes(selectedSkillFilter);
      // If showAllStaff is false, only show staff from selected site
      const matchesSite = showAllStaff || !selectedSite || s.home_site === selectedSite;
      return matchesSearch && matchesSkill && matchesSite;
    });
    
    // Debug logging
    console.log('Staff filtering:', {
      total: staff.length,
      filtered: result.length,
      showAllStaff,
      selectedSite,
      search,
      skillFilter: selectedSkillFilter,
      breakdown: {
        ready: result.filter(s => s.is_ready).length,
        notReady: result.filter(s => !s.is_ready).length,
        withHomeSite: result.filter(s => s.home_site).length,
        withoutHomeSite: result.filter(s => !s.home_site).length,
      }
    });
    
    return result;
  }, [staff, search, selectedSkillFilter, showAllStaff, selectedSite]);

  const readyStaff = filteredStaff.filter(s => s.is_ready);
  const setupStaff = filteredStaff.filter(s => !s.is_ready);

  const getStaffHours = (profileId: string) => 
    staffHours.find(h => h.profile_id === profileId);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-2 border-b border-neutral-800">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded text-sm text-white placeholder-neutral-500"
          />
        </div>
        <label className="flex items-center gap-2 mt-2 text-xs text-neutral-400">
          <input
            type="checkbox"
            checked={showAllStaff}
            onChange={(e) => setShowAllStaff(e.target.checked)}
            className="rounded border-neutral-600 bg-neutral-700 text-[#EC4899]"
          />
          Show all company staff
        </label>
      </div>

      {/* Staff List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
        {/* Ready Staff */}
        {readyStaff.length > 0 && (
          <div>
            <p className="text-xs font-medium text-neutral-500 px-1 mb-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              Ready ({readyStaff.length})
            </p>
            <div className="space-y-1.5">
              {readyStaff.map((person) => (
                <DraggableStaffCard 
                  key={person.id} 
                  person={person}
                  hours={getStaffHours(person.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Setup Incomplete */}
        {setupStaff.length > 0 && (
          <div className={readyStaff.length > 0 ? 'pt-2' : ''}>
            <p className="text-xs font-medium text-neutral-500 px-1 mb-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              Setup Incomplete ({setupStaff.length})
            </p>
            <div className="space-y-1.5">
              {setupStaff.map((person) => (
                <DraggableStaffCard 
                  key={person.id} 
                  person={person}
                  hours={getStaffHours(person.id)}
                />
              ))}
            </div>
          </div>
        )}

        {filteredStaff.length === 0 && staff.length > 0 && (
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-neutral-500">No staff match current filters</p>
            <p className="text-xs text-neutral-600">
              Total staff: {staff.length} | Filtered: {filteredStaff.length}
            </p>
            {!showAllStaff && selectedSite && (
              <p className="text-xs text-amber-400">
                Showing only staff from selected site. Check "Show all company staff" to see everyone.
              </p>
            )}
          </div>
        )}

        {staff.length === 0 && (
          <p className="text-sm text-neutral-500 text-center py-4">No staff found</p>
        )}
      </div>
    </div>
  );
}

