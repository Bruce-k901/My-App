# 🎯 Recruitment System - Implementation Overview

## Database Schema Created ✅

### Tables

1. **`jobs`** - Job postings with FOH/BOH, pay type, requirements
2. **`candidates`** - Candidate profiles with CV, contact details
3. **`applications`** - Links candidates to jobs, tracks status pipeline
4. **`offer_letters`** - Offer generation, e-signature, acceptance tracking

### Key Fields for Flow

- **Jobs:** `boh_foh`, `pay_type` → Used for auto-pack assignment
- **Offer Letters:** `offer_token` → Magic link for candidate acceptance
- **Offer Letters:** `onboarding_profile_id` → Links to created profile

## Application Status Pipeline

```
applied → screening → interview → trial → offer → accepted
                                              ↓
                                         ONBOARDING
```

## The Flow (How It Works)

### 1. Manager Posts Job

- Creates job with all details
- Specifies: FOH/BOH, hourly/salaried (critical!)
- Publishes to job boards (future)
- Gets public application URL

### 2. Candidate Applies

- Fills application form (public page)
- Uploads CV
- Creates `candidate` record
- Creates `application` record with status: `applied`

### 3. Manager Reviews

- Sees candidate in Candidates page
- Reviews application
- Updates status: `applied` → `screening`
- Schedules interview: `screening` → `interview`
- Records interview notes & rating
- Arranges trial: `interview` → `trial`

### 4. Manager Sends Offer

- Status: `trial` → `offer`
- Creates `offer_letter` with:
  - Position, start date, pay rate
  - Contract terms
  - FOH/BOH + hourly/salaried (from job)
- Generates unique `offer_token`
- Sends email with magic link
- Candidate clicks link → Views offer

### 5. Candidate Accepts Offer ✨

- Reviews offer letter
- Types name as e-signature
- Clicks "Accept Offer"
- **Triggers automatic flow:**
  1. Offer status → `accepted`
  2. Application status → `accepted`
  3. Creates `profile` with status: `onboarding`
  4. Auto-assigns onboarding pack (based on FOH/BOH + hourly/salaried)
  5. Generates onboarding token
  6. Sends onboarding email with new magic link
  7. Candidate → Onboarding Portal

### 6. Onboarding (Already Built!)

- Candidate completes profile
- Uploads documents
- Signs contracts
- Submits for approval

### 7. Manager Approves

- Reviews completed onboarding
- Approves
- Profile status: `onboarding` → `active`
- **Employee now in Employees page**
- **Can be scheduled on rota**

---

## UI Pages to Build

### 1. Jobs Page (`/dashboard/people/recruitment`)

**Purpose:** View all job postings

**Features:**

- List all jobs (tabs: All / Open / Draft / Closed)
- Job cards showing:
  - Title, department, FOH/BOH
  - Number of applicants
  - Status badge
  - Pay range
- Actions: View, Edit, Close, Duplicate
- "+ Post New Job" button
- Search & filter

### 2. Post Job Page (`/dashboard/people/recruitment/jobs/new`)

**Purpose:** Create new job posting

**Form Sections:**

- **Job Details**
  - Title (required)
  - Department
  - Description (rich text)
  - Location/Site
- **Position Type** (Critical!)
  - FOH / BOH / Both (radio)
  - Hourly / Salaried (radio)
- **Pay & Contract**
  - Pay rate min/max
  - Contract type
  - Contract hours
- **Requirements**
  - Required skills (multi-select/tags)
  - Required certifications
  - Experience needed
- **Publishing**
  - Save as draft
  - Publish immediately
  - Close date
  - Job boards (future)

### 3. Candidates Page (`/dashboard/people/recruitment/candidates`)

**Purpose:** View all candidates

**Features:**

- List all candidates
- Filter by:
  - Status (Active / Hired / Rejected)
  - Job applied for
  - Source (Indeed, LinkedIn, etc.)
  - Tags
- Candidate cards showing:
  - Name, email, phone
  - Latest application status
  - Applied date
  - Star rating (if interviewed)
- Quick actions: View, Message, Reject
- Bulk actions (future)

### 4. Candidate Profile (`/dashboard/people/recruitment/candidates/[id]`)

**Purpose:** Track individual candidate

**Tabs:**

- **Overview**
  - Personal info
  - Contact details
  - CV download
  - Tags & notes
- **Applications**
  - List of all jobs applied for
  - Status for each
  - Timeline
- **Activity**
  - Interview scheduled
  - Interview completed
  - Trial arranged
  - Offer sent
  - All status changes

**Actions:**

- Schedule Interview
- Record Interview Notes
- Arrange Trial
- Send Offer
- Reject Application

### 5. Job Details Page (`/dashboard/people/recruitment/[jobId]`)

**Purpose:** View job & its applicants

**Sections:**

- **Job Info**
  - Title, description
  - Requirements
  - Status
  - Edit button
- **Applicants Pipeline**
  - Kanban view or list
  - Columns: Applied → Screening → Interview → Trial → Offer → Accepted
  - Drag & drop to change status
  - Click candidate → Quick view
- **Actions**
  - Edit Job
  - Pause/Close Job
  - Share Job Link
  - View Analytics (future)

### 6. Send Offer Modal

**Purpose:** Generate & send offer letter

**Form:**

- Candidate name (prefilled)
- Position (prefilled from job)
- Start date (date picker)
- Pay rate (number)
- Contract hours
- Review offer letter preview
- Send offer button

**After Send:**

- Application status → `offer`
- Offer status → `sent`
- Email sent to candidate
- Copy offer link button

---

## API Endpoints Needed

### Jobs

- `GET /api/recruitment/jobs` - List jobs
- `POST /api/recruitment/jobs` - Create job
- `GET /api/recruitment/jobs/[id]` - Get job
- `PATCH /api/recruitment/jobs/[id]` - Update job
- `DELETE /api/recruitment/jobs/[id]` - Delete job

### Candidates

- `GET /api/recruitment/candidates` - List candidates
- `POST /api/recruitment/candidates` - Create candidate
- `GET /api/recruitment/candidates/[id]` - Get candidate
- `PATCH /api/recruitment/candidates/[id]` - Update candidate

### Applications

- `GET /api/recruitment/applications` - List applications
- `POST /api/recruitment/applications` - Create application
- `PATCH /api/recruitment/applications/[id]` - Update status
- `POST /api/recruitment/applications/[id]/schedule-interview` - Schedule interview
- `POST /api/recruitment/applications/[id]/record-interview` - Record interview notes

### Offers

- `POST /api/recruitment/offers` - Create & send offer
- `GET /api/recruitment/offers/[token]` - View offer (candidate)
- `POST /api/recruitment/offers/[token]/accept` - Accept offer (candidate)
- `POST /api/recruitment/offers/[token]/decline` - Decline offer (candidate)

---

## Integration Points

### Recruitment → Onboarding

**Trigger:** Candidate accepts offer

**Flow:**

```typescript
1. Update offer_letters.status = 'accepted'
2. Update applications.status = 'accepted'
3. Create profile:
   - email from candidate
   - full_name from candidate
   - company_id from job
   - onboarding_status = 'pending'
   - position_title from offer
   - start_date from offer
4. Determine onboarding pack:
   - Get boh_foh + pay_type from job
   - Find matching pack from company_onboarding_packs
5. Create employee_onboarding_assignment
6. Generate onboarding_token
7. Send onboarding email
8. Link offer to profile (onboarding_profile_id)
```

### Onboarding → Employees

**Trigger:** Manager approves onboarding

**Flow:**

```typescript
1. Update profile.onboarding_status = 'active'
2. Update employee_onboarding_assignment.approved_at
3. Employee appears in /dashboard/people/employees
4. Employee available for rota scheduling
```

---

## Build Order

### Phase 1: Core Pages (This Week)

1. ✅ Database migration
2. Jobs page (list view)
3. Post Job page (form)
4. Candidates page (list view)
5. Candidate profile page

### Phase 2: Application Management

6. Job details page with applicants
7. Status update system
8. Interview scheduling
9. Trial tracking

### Phase 3: Offer System

10. Send offer modal
11. Offer letter generation
12. Candidate acceptance page (public)
13. E-signature component

### Phase 4: Integration

14. Accept offer → Create profile
15. Auto-assign onboarding pack
16. Send onboarding link
17. Test full flow

---

## Next Steps

1. Run the migration
2. Build Jobs page (list + create)
3. Test job creation
4. Build Candidates page
5. Test application flow
6. Build offer system
7. Connect to onboarding

**Ready to start building the UI?** Let's do the Jobs page first!
