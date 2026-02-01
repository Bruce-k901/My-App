# 🔄 Recruitment → Onboarding → Employees → Rota Flow

## Overview

Complete employee lifecycle from job posting to being scheduled on the rota.

## The Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Recruitment │ ──→ │ Onboarding  │ ──→ │  Employees  │ ──→ │    Rota     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
  Job Posting         Offer Accept        Complete           Schedule
  Applications        Doc Collection       Profile            Shifts
  Interviews          Training           Activate           Clock In/Out
```

---

## Stage 1: Recruitment 🎯

### Current State
- Path: `/dashboard/people/recruitment`
- Post jobs
- Receive applications
- Track candidates

### What Happens Here
1. **Job Posting**
   - Manager creates job listing
   - Specifies: FOH/BOH, hourly/salaried, requirements
   - Job published (internal/external)

2. **Applications**
   - Candidates apply
   - Manager reviews applications
   - Shortlist candidates

3. **Interviews**
   - Schedule interviews
   - Record notes/feedback
   - Status tracking: Applied → Interview → Offer → Accepted/Rejected

4. **Offer Letter**
   - Manager selects candidate
   - System generates offer letter (from templates)
   - **CRITICAL:** Offer specifies FOH/BOH + hourly/salaried
   - Candidate receives offer via email/portal

### What Needs to Be Built
- [ ] **Offer Letter System**
  - Generate offer letters from templates
  - Send via email with accept/decline link
  - Track offer status
  
- [ ] **Accept Offer Trigger**
  - When candidate clicks "Accept Offer"
  - Auto-create profile in `profiles` table
  - Auto-create onboarding assignment
  - Send welcome email with onboarding link

---

## Stage 2: Onboarding 📋

### Current State
- Path: `/dashboard/people/onboarding`
- 4 pages: People to Onboard, Company Docs, Packs, My Docs
- Pack assignment system
- Document upload/acknowledgment

### What Happens Here
1. **Auto-Assignment** (New!)
   - Candidate accepts offer
   - Profile created with:
     - `app_role: 'staff'`
     - `position_title` from job posting
     - `company_id` from hiring manager
     - Status: `onboarding` (new status needed)
   - Onboarding pack auto-assigned based on job type:
     - FOH + Hourly → "FOH Hourly Pack"
     - BOH + Salaried → "BOH Salaried Pack"
     - etc.

2. **Employee Portal** (My Docs)
   - New employee logs in for first time
   - Sees "Welcome! Complete your onboarding"
   - Views assigned pack with documents
   - Tasks:
     - ✅ Read Staff Handbook
     - ✅ Sign Employment Contract
     - ✅ Complete New Starter Form
     - ✅ Upload ID documents
     - ✅ Upload certificates (Food Hygiene, etc.)
     - ✅ Complete health declaration
     - ✅ Sign GDPR consent
     - ✅ Acknowledge training requirements

3. **Manager Review**
   - Manager checks "People to Onboard" page
   - Sees completion status for each employee
   - Reviews uploaded documents
   - Approves/requests changes
   - Marks onboarding as complete

4. **Completion Trigger**
   - All required documents acknowledged/uploaded
   - Manager approves
   - Profile status changes: `onboarding` → `active`
   - **Employee now appears in main employee list**

### What Needs to Be Built
- [ ] **Profile Status Field**
  - Add `status` column to `profiles` table
  - Values: `onboarding`, `active`, `inactive`, `terminated`
  - Filter employees by status

- [ ] **Auto-Pack Assignment Logic**
  - Function: `auto_assign_onboarding_pack(profile_id, job_type)`
  - Maps job characteristics to pack
  - Creates assignment record

- [ ] **Document Upload System**
  - Employee can upload files (ID, certificates)
  - Link to onboarding assignment
  - Manager can view/download
  - Mark as approved/rejected

- [ ] **Completion Tracking**
  - Track which documents are acknowledged
  - Track which documents are uploaded
  - Calculate % complete
  - "Complete Onboarding" button for manager

---

## Stage 3: Employees 👥

### Current State
- Path: `/dashboard/people/employees`
- Employee directory
- Individual employee profiles
- Edit employee details

### What Happens Here
1. **Automatic Addition**
   - When onboarding status → `active`
   - Employee automatically appears in main list
   - No manual action needed

2. **Profile Completion**
   - Manager can add more details:
     - Start date
     - Department
     - Line manager
     - Pay rate
     - Contract hours
     - Sites they work at

3. **Access & Permissions**
   - Employee gets full app access
   - Can clock in/out
   - Can request leave
   - Can see their schedule

### What Needs to Be Built
- [ ] **Status Filter on Employee List**
  - Show only `active` employees by default
  - Filter: All / Active / Onboarding / Inactive
  - Visual indicator for onboarding employees

- [ ] **Onboarding Badge**
  - Show "🟡 Onboarding" badge next to name
  - Show "✅ Active" badge when complete
  - Quick link to their onboarding progress

---

## Stage 4: Rota/Schedule 📅

### Current State
- Path: `/dashboard/people/schedule`
- Shift scheduling system
- Drag-and-drop interface

### What Happens Here
1. **Available for Scheduling**
   - Employee with `active` status appears in rota
   - Manager can assign shifts
   - Employee sees their schedule

2. **Shift Assignment**
   - Manager creates shifts
   - Assigns employees
   - Employee gets notification

3. **Attendance**
   - Employee clocks in/out
   - Time tracked
   - Manager reviews attendance logs

### What Needs to Be Built
- [ ] **Status Check in Rota**
  - Only show `active` employees in shift assignment
  - Hide `onboarding` employees (optional)
  - Visual indicator if employee is new (e.g., "👋 New")

- [ ] **Start Date Filter**
  - Don't show employee in rota until their start date
  - Show "Starts on [date]" in employee list

---

## Database Schema Changes Needed

### 1. Add Status Column to Profiles
```sql
ALTER TABLE profiles 
ADD COLUMN status TEXT DEFAULT 'active' 
CHECK (status IN ('onboarding', 'active', 'inactive', 'terminated'));

CREATE INDEX idx_profiles_status ON profiles(status);
```

### 2. Add Job Type to Recruitment
```sql
-- Assuming you have a `jobs` or `recruitment_posts` table
ALTER TABLE jobs 
ADD COLUMN boh_foh TEXT CHECK (boh_foh IN ('FOH', 'BOH', 'BOTH')),
ADD COLUMN pay_type TEXT CHECK (pay_type IN ('hourly', 'salaried'));
```

### 3. Link Candidates to Jobs
```sql
-- Assuming you have a `candidates` or `applications` table
ALTER TABLE candidates
ADD COLUMN job_id UUID REFERENCES jobs(id),
ADD COLUMN offer_status TEXT CHECK (offer_status IN ('pending', 'accepted', 'declined')),
ADD COLUMN offer_sent_at TIMESTAMPTZ,
ADD COLUMN offer_accepted_at TIMESTAMPTZ;
```

### 4. Track Document Uploads
```sql
CREATE TABLE employee_onboarding_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES employee_onboarding_assignments(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'id_proof', 'certificate', 'passport', etc.
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES profiles(id),
  review_status TEXT CHECK (review_status IN ('pending', 'approved', 'rejected')),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ
);
```

---

## API Endpoints Needed

### 1. Accept Offer
```typescript
POST /api/recruitment/accept-offer
Body: { candidateId, jobId, token }
Response: { success, profileId, onboardingAssignmentId }
```

### 2. Auto-Assign Pack
```typescript
POST /api/onboarding/auto-assign-pack
Body: { profileId, jobType: { bohFoh, payType } }
Response: { success, assignmentId, packId }
```

### 3. Upload Document
```typescript
POST /api/onboarding/upload-document
Body: { assignmentId, documentType, file }
Response: { success, documentId, fileUrl }
```

### 4. Complete Onboarding
```typescript
POST /api/onboarding/complete
Body: { assignmentId, profileId }
Response: { success, newStatus: 'active' }
```

---

## UI Components Needed

### 1. Recruitment Page
- **Offer Letter Modal**
  - Select candidate
  - Choose contract type (FOH/BOH, hourly/salaried)
  - Generate and preview offer letter
  - Send offer button

- **Candidate Status Badge**
  - Applied → Interview → Offer Sent → Offer Accepted → Onboarding

### 2. Onboarding Page Enhancements
- **Document Upload Section** (in My Docs)
  - File upload zones for each doc type
  - Preview uploaded files
  - Status indicators (pending/approved/rejected)

- **Progress Bar** (in People to Onboard)
  - Show % complete for each employee
  - List of outstanding items
  - "Approve & Complete" button

### 3. Employee List Filter
- **Status Tabs**
  - All | Active | Onboarding | Inactive
  - Count badges on each tab

- **Onboarding Indicator**
  - Yellow dot or badge for onboarding employees
  - Quick link to their onboarding page

---

## Automation & Triggers

### 1. Offer Accepted Trigger
```typescript
// When candidate accepts offer:
1. Create profile with status: 'onboarding'
2. Determine pack from job type (FOH/BOH + hourly/salaried)
3. Auto-assign onboarding pack
4. Send welcome email with onboarding link
5. Notify hiring manager
```

### 2. Onboarding Complete Trigger
```typescript
// When manager marks onboarding complete:
1. Update profile status: 'onboarding' → 'active'
2. Send "Welcome to the team!" email
3. Grant full app access
4. Add to employee directory
5. Make available for rota scheduling
6. Notify department manager
```

### 3. Start Date Trigger
```typescript
// On employee start date:
1. Send "It's your first day!" notification
2. Remind employee to clock in
3. Notify manager of new starter
4. Show in today's rota
```

---

## Implementation Priority

### Phase 1: Core Connection (Critical)
1. ✅ Profile status column
2. ✅ Auto-pack assignment logic
3. ✅ Status filter on employee list
4. ✅ Offer accept endpoint

### Phase 2: Document Management
5. ⏳ Document upload table & UI
6. ⏳ Manager review interface
7. ⏳ Completion tracking

### Phase 3: Automation
8. ⏳ Offer letter system
9. ⏳ Auto-assignment on offer accept
10. ⏳ Email notifications
11. ⏳ Complete onboarding workflow

### Phase 4: Polish
12. ⏳ Progress tracking
13. ⏳ Status badges
14. ⏳ Start date handling
15. ⏳ Rota integration

---

## Questions to Resolve

1. **Manual Override?**
   - Can manager manually assign different pack if auto-assignment is wrong?
   - ✅ Yes - manager can change pack in "People to Onboard"

2. **Onboarding Timeline?**
   - How long do employees have to complete onboarding?
   - Send reminders if incomplete?

3. **Partial Access?**
   - Can onboarding employees access any parts of the app?
   - Or completely locked out until status = active?

4. **Offer Letter Templates?**
   - Store in database or file system?
   - Who can edit templates?

5. **Document Types?**
   - Fixed list or configurable?
   - Required vs optional documents?

---

## Success Metrics

- **Recruitment → Onboarding**: < 5 minutes (automated)
- **Onboarding → Active**: 1-3 days (manual review)
- **Total Time to Rota**: 2-5 days from offer acceptance

---

**Next Steps:**
1. Review this flow with the team
2. Prioritize which phase to build first
3. Design database schema changes
4. Build core connection (Phase 1)
5. Test end-to-end flow

Would you like me to start implementing Phase 1?
