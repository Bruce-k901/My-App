# 🎯 Recruitment System - Build Progress

## ✅ Completed

### 1. Database Schema
**File:** `supabase/migrations/20251217000000_create_recruitment_system.sql`

**Tables Created:**
- ✅ `jobs` - Job postings with FOH/BOH, pay type, requirements
- ✅ `candidates` - Candidate profiles
- ✅ `applications` - Links candidates to jobs, tracks status
- ✅ `offer_letters` - Offer generation & acceptance tracking

**Key Features:**
- Status pipeline: applied → screening → interview → trial → offer → accepted
- RLS policies for company access
- Automatic timestamp triggers
- Helper functions for status updates
- Offer token generation

---

### 2. Jobs Page
**File:** `src/app/dashboard/people/recruitment/page.tsx`

**Features:**
- ✅ List all job postings
- ✅ Filter by status (All / Open / Draft / Closed)
- ✅ Job cards showing:
  - Title, department, location
  - FOH/BOH + hourly/salaried badges
  - Pay range
  - Applicant count (placeholder)
  - Status badge
- ✅ "+ Post New Job" button
- ✅ View & Edit actions
- ✅ Empty state with CTA

---

### 3. Post Job Page
**File:** `src/app/dashboard/people/recruitment/jobs/new/page.tsx`

**Form Sections:**
- ✅ **Job Details**
  - Title (required)
  - Department
  - Description (textarea)
  - Location
  
- ✅ **Position Type** (CRITICAL!)
  - FOH / BOH / BOTH (button group)
  - Hourly / Salaried (button group)
  - Visual feedback & helper text
  
- ✅ **Pay & Contract**
  - Min/Max pay rate
  - Contract type (dropdown)
  - Contract hours
  
- ✅ **Requirements**
  - Required skills (comma-separated)
  - Required certifications (comma-separated)
  - Experience needed

**Actions:**
- ✅ Save as Draft
- ✅ Publish Immediately
- ✅ Validation (title required)
- ✅ Loading states
- ✅ Toast notifications
- ✅ Redirect to jobs list on success

---

## 🔄 Next Steps

### Phase 1: Core Pages (Continue)
4. ⏳ **Candidates Page** - List all candidates
5. ⏳ **Candidate Profile Page** - Individual candidate tracking
6. ⏳ **Job Details Page** - View job + applicants

### Phase 2: Application Management
7. ⏳ **Application Form** (Public) - For candidates to apply
8. ⏳ **Status Updates** - Move candidates through pipeline
9. ⏳ **Interview Scheduling** - Calendar integration
10. ⏳ **Trial Tracking** - Record trial shifts

### Phase 3: Offer System
11. ⏳ **Send Offer Modal** - Generate offer letter
12. ⏳ **Offer Acceptance Page** (Public) - Candidate accepts via token
13. ⏳ **E-Signature Component** - Digital signature
14. ⏳ **Offer Letter Templates** - Customizable templates

### Phase 4: Integration
15. ⏳ **Accept Offer → Create Profile** - Auto-create onboarding
16. ⏳ **Auto-Assign Pack** - Based on FOH/BOH + hourly/salaried
17. ⏳ **Send Onboarding Link** - Email with magic link
18. ⏳ **End-to-End Testing** - Full recruitment → onboarding → employees flow

---

## 🗂️ File Structure

```
src/app/dashboard/people/recruitment/
├── page.tsx                        ✅ Jobs list
├── jobs/
│   └── new/
│       └── page.tsx                ✅ Post job form
├── candidates/
│   ├── page.tsx                    ⏳ Candidates list
│   └── [id]/
│       └── page.tsx                ⏳ Candidate profile
└── [jobId]/
    └── page.tsx                    ⏳ Job details + applicants
```

---

## 🎨 UI Patterns Established

### Color Scheme
- **Primary Action:** Magenta (#EC4899) - border + text + glow
- **Status Badges:**
  - Open: Green
  - Draft: Gray
  - Paused: Yellow
  - Closed: Red
- **Position Type Badges:**
  - FOH/BOH: Blue
  - Hourly/Salaried: Purple

### Components Used
- Select dropdown (from UI library)
- Button groups for radio-style selections
- Status badges
- Card layouts
- Toast notifications (sonner)
- Loading states (Loader2 icon)

---

## 🔑 Critical Design Decisions

### 1. FOH/BOH + Hourly/Salaried Are Prominent
- Shown on job cards
- Big button selectors in form
- Helper text explaining importance
- **These drive the onboarding pack auto-assignment**

### 2. Status-First Approach
- Applications have clear status pipeline
- Status history tracked in JSONB
- Can't skip steps (enforced in UI, not DB)
- Visual kanban or list views

### 3. Token-Based Access
- Offer letters use tokens (not authentication)
- Onboarding uses tokens (not authentication)
- Allows candidates to access without creating account
- Account created on offer acceptance

### 4. Company Isolation
- All tables have `company_id`
- RLS enforces company boundaries
- Public views (job board, offers) filter by company
- No cross-company data leakage

---

## 📊 Data Flow

### Current State
```
Manager → Post Job → Job appears in list
```

### Next Phase (Candidates)
```
Candidate → Apply → Create candidate + application → Appears in candidates list
Manager → Review → Update status → Schedule interview
Manager → Interview notes → Rate candidate → Move to trial or offer
```

### Final Phase (Offers & Onboarding)
```
Manager → Send offer → Generate token → Email to candidate
Candidate → Click link → View offer → Accept
System → Create profile → Assign pack → Send onboarding link
Candidate → Complete onboarding → Manager approves → Active employee
```

---

## 🧪 Testing Checklist

### Jobs Page
- [ ] Can view empty state
- [ ] Can create job as draft
- [ ] Can create job as published
- [ ] Job appears in list immediately
- [ ] Filters work correctly
- [ ] Can edit job (future)
- [ ] Can view job details (future)

### Post Job Form
- [x] Form fields save correctly
- [x] FOH/BOH buttons work
- [x] Hourly/Salaried buttons work
- [x] Validation works (title required)
- [x] Save draft works
- [x] Publish works
- [x] Redirects after save
- [ ] Edit existing job (future)

---

## 🚀 Demo Flow (When Complete)

1. **Manager Posts Job**
   - "Server - FOH Hourly"
   - £11.50-15/hour
   - Published

2. **Candidate Applies** (future)
   - Fills application form
   - Uploads CV
   - Appears in candidates list

3. **Manager Reviews**
   - Views candidate profile
   - Schedules interview
   - Records notes: "Great personality!"
   - Moves to offer

4. **Manager Sends Offer**
   - Position: Server
   - Start Date: Next Monday
   - Pay: £12.50/hour
   - Sends offer link

5. **Candidate Accepts**
   - Opens link
   - Reviews offer
   - Signs electronically
   - Accepts

6. **Auto-Magic ✨**
   - Profile created
   - FOH Hourly pack assigned
   - Onboarding link sent
   - Manager notified

7. **Candidate Completes Onboarding**
   - Opens onboarding link
   - Fills profile
   - Uploads ID
   - Signs contracts

8. **Manager Approves**
   - Reviews documents
   - Approves onboarding
   - Employee → Active
   - Can be scheduled!

---

## 💪 What Makes This Special

1. **FOH/BOH + Hourly/Salaried as First-Class**
   - Most systems treat this as notes/tags
   - You make it structural
   - Drives automation

2. **Seamless Handoff**
   - Recruitment → Onboarding → Employees
   - No manual data entry
   - No copy/paste
   - All automated

3. **Token-Based Access**
   - Candidates don't need account
   - One-click acceptance
   - Professional experience
   - Low friction

4. **Complete Before First Shift**
   - Forces compliance
   - Payroll-ready
   - All documents signed
   - Right to work verified

---

## 📝 Next Session Goals

**Build Candidates Page:**
- List view of all candidates
- Filter by status, source, job
- Search by name/email
- Quick actions (view, message, reject)
- Link to candidate profile

**Time Estimate:** 30-45 minutes

**Then:** Candidate profile page with status management

**Ready to continue?** 🚀
