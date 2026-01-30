# Multi-Site Employee Availability Integration Guide

## Overview
This guide shows how to integrate cross-site availability checking into the staff schedule/rota page to prevent double-booking employees across multiple sites.

## Features Implemented

### 1. Core Utility Functions (`src/lib/multiSiteAvailability.ts`)

- **`getEmployeeSites()`** - Get all sites an employee can work at
- **`getEmployeeShiftsAcrossSites()`** - Get employee's shifts at other sites
- **`doTimesOverlap()`** - Check if two time ranges conflict
- **`checkEmployeeAvailability()`** - Check if employee is available for a time slot
- **`checkMultipleEmployeesAvailability()`** - Batch check multiple employees
- **`getCrossSiteShiftsForDateRange()`** - Get all cross-site shifts for a week/month view

## Integration Steps

### Step 1: Import the utility in your schedule page

```typescript
import {
  checkEmployeeAvailability,
  getCrossSiteShiftsForDateRange,
  type CrossSiteShift,
  type EmployeeAvailability,
} from '@/lib/multiSiteAvailability';
```

### Step 2: Add state to track cross-site shifts

```typescript
const [crossSiteShifts, setCrossSiteShifts] = useState<Map<string, CrossSiteShift[]>>(new Map());
```

### Step 3: Fetch cross-site shifts when loading schedule

```typescript
useEffect(() => {
  async function loadCrossSiteShifts() {
    if (!siteId || !weekDates.length || !staff.length) return;
    
    const employeeIds = staff.map(s => s.id);
    const startDate = weekDates[0];
    const endDate = weekDates[weekDates.length - 1];
    
    const shiftsMap = await getCrossSiteShiftsForDateRange(
      employeeIds,
      siteId,
      startDate,
      endDate
    );
    
    setCrossSiteShifts(shiftsMap);
  }
  
  loadCrossSiteShifts();
}, [siteId, weekDates, staff]);
```

### Step 4: Check availability when adding/editing shifts

```typescript
// In your Add Shift Modal or shift creation function
const handleAddShift = async () => {
  const availability = await checkEmployeeAvailability(
    selectedEmployeeId,
    currentSiteId,
    shiftDate,
    startTime,
    endTime
  );
  
  if (!availability.is_available) {
    // Show warning
    toast.error(`Employee is unavailable: ${availability.reason}`);
    // Optionally show the conflicting shift details
    if (availability.conflicting_shift) {
      console.log('Conflicting shift at:', availability.conflicting_shift.site_name);
    }
    return;
  }
  
  // Proceed with creating shift
  // ... your existing shift creation logic
};
```

### Step 5: Display visual indicators in the schedule grid

```typescript
// In your shift cell rendering
function ShiftCell({ date, employeeId, existingShift }: ShiftCellProps) {
  const [conflictingShifts, setConflictingShifts] = useState<CrossSiteShift[]>([]);
  
  useEffect(() => {
    const shifts = crossSiteShifts.get(employeeId) || [];
    const conflicts = shifts.filter(shift => shift.shift_date === date);
    setConflictingShifts(conflicts);
  }, [crossSiteShifts, employeeId, date]);
  
  // If employee has shift at another site on this day
  if (conflictingShifts.length > 0 && !existingShift) {
    return (
      <div
        className="relative bg-neutral-800/50 border border-dashed border-neutral-600 rounded p-2 cursor-not-allowed"
        title={`Working at ${conflictingShifts[0].site_name}`}
      >
        <div className="text-xs text-neutral-500 text-center">
          @ {conflictingShifts[0].site_name}
        </div>
        <div className="text-xs text-neutral-400 text-center">
          {formatTime(conflictingShifts[0].start_time)} - {formatTime(conflictingShifts[0].end_time)}
        </div>
      </div>
    );
  }
  
  // Render normal shift or empty cell
  return existingShift ? <ShiftDisplay shift={existingShift} /> : <EmptyCell />;
}
```

### Step 6: Add visual warnings in employee rows

```typescript
// Add indicator next to employee name if they work at multiple sites
function EmployeeRow({ employee }: { employee: StaffMember }) {
  const [assignedSites, setAssignedSites] = useState<string[]>([]);
  
  useEffect(() => {
    async function loadSites() {
      const { borrowed_sites } = await getEmployeeSites(
        employee.id,
        companyId,
        currentDate
      );
      setAssignedSites(borrowed_sites.map(s => s.borrowed_site_name));
    }
    loadSites();
  }, [employee.id]);
  
  return (
    <div className="flex items-center gap-2">
      <span>{employee.full_name}</span>
      {assignedSites.length > 0 && (
        <span
          className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded"
          title={`Also works at: ${assignedSites.join(', ')}`}
        >
          Multi-site
        </span>
      )}
    </div>
  );
}
```

### Step 7: Add conflict prevention in drag-and-drop

```typescript
// In your onDragEnd handler
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  
  if (!over) return;
  
  // Parse the drop target (date + employee)
  const [targetDate, targetEmployeeId] = over.id.toString().split('_');
  
  // Get the shift being moved
  const shift = findShiftById(active.id.toString());
  
  if (shift && targetEmployeeId !== shift.profile_id) {
    // Check if new employee is available
    const availability = await checkEmployeeAvailability(
      targetEmployeeId,
      siteId,
      targetDate,
      shift.start_time,
      shift.end_time
    );
    
    if (!availability.is_available) {
      toast.error(`Cannot assign shift: ${availability.reason}`);
      return; // Prevent the move
    }
  }
  
  // Proceed with moving the shift
  // ... your existing drag logic
};
```

## UI Design Patterns

### Pattern 1: Greyed-out Cell
```tsx
<div className="bg-neutral-800/30 border border-dashed border-neutral-600/50 opacity-60">
  <div className="text-xs text-neutral-500">@ Other Site</div>
</div>
```

### Pattern 2: With Site Name and Times
```tsx
<div className="relative group cursor-not-allowed">
  <div className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border border-neutral-700 rounded p-2">
    <div className="flex items-center gap-1 text-xs text-neutral-400">
      <Building2 className="w-3 h-3" />
      <span className="truncate">{siteName}</span>
    </div>
    <div className="text-xs text-neutral-500 mt-1">
      {startTime} - {endTime}
    </div>
  </div>
  
  {/* Tooltip on hover */}
  <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
    <div className="bg-neutral-800 border border-neutral-700 rounded p-2 shadow-lg whitespace-nowrap">
      <p className="text-xs text-white">Working at {siteName}</p>
      <p className="text-xs text-neutral-400">{startTime} - {endTime}</p>
    </div>
  </div>
</div>
```

### Pattern 3: Badge Indicator
```tsx
<div className="relative">
  {/* Normal shift display */}
  <ShiftCard shift={shift} />
  
  {/* Badge if from other site */}
  {isFromOtherSite && (
    <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
      Multi
    </div>
  )}
</div>
```

## Testing Checklist

- [ ] Employee with assignments to multiple sites shows correctly
- [ ] Creating shift at Site A prevents creating overlapping shift at Site B
- [ ] Dragging shift to unavailable employee shows error
- [ ] Visual indicator shows where employee is actually working
- [ ] Overnight shifts (crossing midnight) are handled correctly
- [ ] Cancelled shifts don't block availability
- [ ] Performance is acceptable with 50+ employees and 7-day view

## Database Requirements

Ensure the `employee_site_assignments` table exists (already created via migration):
- `profile_id` - Employee ID
- `company_id` - Company ID  
- `home_site_id` - Employee's home site
- `borrowed_site_id` - Site they can work at
- `start_date` - Assignment start
- `end_date` - Assignment end (NULL = permanent)
- `is_active` - Whether assignment is active

## Performance Considerations

- Batch check employees rather than individual queries
- Cache cross-site shifts for the visible date range
- Only re-fetch when date range or employee list changes
- Use optimistic UI updates with background validation

## Future Enhancements

1. **Smart Suggestions**: Suggest available employees when one is unavailable
2. **Conflict Resolution**: Offer to move/swap shifts when conflicts detected
3. **Travel Time**: Add buffer time when employee works at different sites on same day
4. **Notifications**: Alert managers when multi-site employee's schedule is full
5. **Analytics**: Report on multi-site utilization and conflicts prevented

