# Peoplely Phase 2: Leave Management - Implementation Complete ✅

## What Was Built

### 1. ✅ Database Migrations (5 files)

**Migration 1:** `supabase/migrations/20250302000001_create_leave_types.sql`
- Leave types table with configurable settings per company
- Default leave types seeding function (Annual Leave, Sick Leave, TOIL, etc.)
- Auto-seeds leave types for new companies via trigger
- RLS policies for viewing/managing leave types

**Migration 2:** `supabase/migrations/20250302000002_create_leave_requests.sql`
- Leave requests table with status workflow
- Half-day support
- Approval tracking (reviewed_by, reviewed_at)
- RLS policies: employees view own, managers view all company requests
- Update timestamp trigger

**Migration 3:** `supabase/migrations/20250302000003_create_leave_balances.sql`
- Leave balances table (entitled, carried_over, adjustments, taken, pending)
- Helper functions: `get_leave_balance()`, `initialize_leave_balance()`
- Automatic balance updates via triggers:
  - When request created → add to pending_days
  - When request approved → move from pending to taken
  - When request declined/cancelled → remove from pending
- RLS policies for viewing/managing balances

**Migration 4:** `supabase/migrations/20250302000004_create_public_holidays.sql`
- Public holidays table (UK bank holidays 2025 seeded)
- Leave blackout dates table
- `calculate_working_days()` function (excludes weekends & holidays)
- `check_blackout_conflict()` function
- RLS policies

**Migration 5:** `supabase/migrations/20250302000005_create_leave_views.sql`
- `leave_balances_view` - balances with calculated remaining days
- `leave_requests_view` - requests with employee/leave type details
- `leave_calendar_view` - calendar events for approved leave
- Grants SELECT access to authenticated users

### 2. ✅ TypeScript Types

**File:** `src/types/peoplely.ts`
- `LeaveType` - Leave type configuration
- `LeaveRequest` - Leave request record
- `LeaveRequestStatus` - Status enum ('pending', 'approved', 'declined', 'cancelled', 'taken')
- `LeaveBalance` - Balance record
- `LeaveBalanceView` - Balance view with calculated fields
- `LeaveRequestView` - Request view with joined data
- `LeaveCalendarEvent` - Calendar event data
- `PublicHoliday` - Public holiday record
- `LeaveBlackoutDate` - Blackout date record

### 3. ✅ UI Components

**Leave Overview Page:** `src/app/dashboard/people/leave/page.tsx`
- Balance cards showing remaining/taken/pending days per leave type
- Calendar view with month navigation
- Requests view showing pending requests
- Manager approval/decline actions
- Toggle between calendar and requests views
- Uses existing design system (magenta accents, card styling)

**Leave Request Form:** `src/app/dashboard/people/leave/request/page.tsx`
- Leave type selection (visual cards with colors)
- Date range picker with half-day options
- Real-time working days calculation (excludes weekends/holidays)
- Balance display for leave types that deduct from allowance
- Validation (notice periods, max consecutive days, balance checks)
- Success/error states
- Auto-approval for leave types that don't require approval

## Features Implemented

### ✅ Leave Types Configuration
- Configurable per company
- Default types seeded automatically
- Settings: paid/unpaid, requires approval, deducts from allowance, half-days, notice periods

### ✅ Leave Request Workflow
- Employees can create requests
- Managers can approve/decline
- Status tracking (pending → approved/declined)
- Automatic balance updates

### ✅ Balance Tracking
- Entitled days (from profile/annual_leave_allowance)
- Carried over days
- Manual adjustments
- Taken days (approved requests)
- Pending days (pending requests)
- Calculated remaining days

### ✅ Working Days Calculation
- Excludes weekends (Saturday/Sunday)
- Excludes public holidays (UK bank holidays)
- Supports half-days
- Uses company's UK region setting

### ✅ Calendar View
- Month navigation
- Shows approved leave for all team members
- Color-coded by leave type
- Today indicator
- Multiple events per day support

### ✅ Manager Features
- View all company requests
- Approve/decline actions
- See pending requests count badge

## Design System Compliance

All components follow your design guidelines:
- ✅ Background: `bg-[#0B0D13]` for main app background
- ✅ Cards: `bg-white/[0.03]` with `border border-white/[0.06]`
- ✅ Buttons: `bg-transparent`, `text-[#EC4899]`, `border border-[#EC4899]`, `hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]`
- ✅ No pink backgrounds - all use magenta (#EC4899)
- ✅ Mobile-responsive layouts

## Integration Points

### ✅ Uses Existing Infrastructure
- `profiles` table - for employee data and annual_leave_allowance
- `companies` table - for company_id and UK region
- `sites` table - for site filtering (future)
- `useAppContext()` - for user/profile/company data
- `supabase` client - from `@/lib/supabase`

### ✅ Database Functions
- `calculate_working_days()` - RPC function for date calculations
- `initialize_leave_balance()` - Auto-creates balances when needed
- `get_leave_balance()` - Helper for balance queries

## Files Created

```
supabase/migrations/
├── 20250302000001_create_leave_types.sql          ✅ Created
├── 20250302000002_create_leave_requests.sql       ✅ Created
├── 20250302000003_create_leave_balances.sql       ✅ Created
├── 20250302000004_create_public_holidays.sql      ✅ Created
└── 20250302000005_create_leave_views.sql          ✅ Created

src/
├── app/dashboard/people/leave/
│   ├── page.tsx                                   ✅ Created
│   └── request/
│       └── page.tsx                               ✅ Created
└── types/
    └── peoplely.ts                                ✅ Updated (added leave types)
```

## Post-Implementation Checklist

- [ ] Run all 5 database migrations in Supabase SQL Editor (in order)
- [ ] Verify leave types seeded for existing companies
- [ ] Verify UK bank holidays 2025 seeded
- [ ] Test creating a leave request
- [ ] Test approving/declining requests (as manager)
- [ ] Verify balance updates correctly
- [ ] Test working days calculation (excludes weekends/holidays)
- [ ] Test calendar view shows approved leave
- [ ] Test half-day options
- [ ] Test validation (notice periods, balance checks)

## Testing Checklist

1. **Create Leave Request**
   - [ ] Select leave type
   - [ ] Choose dates
   - [ ] Verify working days calculated correctly
   - [ ] Submit request
   - [ ] Verify appears in pending requests

2. **Balance Updates**
   - [ ] Create request → pending_days increases
   - [ ] Approve request → taken_days increases, pending_days decreases
   - [ ] Decline request → pending_days returns
   - [ ] Cancel request → balance returns

3. **Calendar View**
   - [ ] Navigate months
   - [ ] See approved leave events
   - [ ] Today indicator works
   - [ ] Multiple events per day display correctly

4. **Manager Actions**
   - [ ] View all company requests
   - [ ] Approve request → status changes, balance updates
   - [ ] Decline request → status changes, balance updates

5. **Validation**
   - [ ] Notice period validation works
   - [ ] Max consecutive days validation works
   - [ ] Balance check prevents over-booking
   - [ ] Date range validation (end >= start)

## Next Steps

### Phase 3: Scheduling and Rota
- Shift scheduling
- Rota management
- Shift swaps
- Availability preferences

### Future Enhancements
- Leave carry-over processing
- Leave year rollover
- Email notifications for approvals
- Leave reports/analytics
- Integration with payroll

## Notes

- All migrations use `IF NOT EXISTS` for idempotency
- RLS policies ensure data isolation by company
- Triggers automatically maintain balance consistency
- Views simplify common queries
- UK bank holidays seeded for 2025 (can be extended)
- Working days calculation respects company's UK region setting

## Known Limitations

- Public holidays only seeded for 2025 (can add more years)
- No email notifications yet (Phase 3+)
- No leave year rollover automation yet (can be added)
- Blackout dates created but not enforced in request form yet (can add validation)

