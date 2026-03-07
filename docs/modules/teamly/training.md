# Staff Training System - End-to-End Process Document

## Overview

The training system manages the full lifecycle of staff training: from course catalog management and assignment, through employee enrollment, online learning, assessment, certification, billing, and renewal tracking. It integrates with Msgly (messaging), notifications/calendar, Today's Tasks, and the billing system.

---

## Table of Contents

1. [Entry Points (How Training Starts)](#1-entry-points)
2. [Assignment Flow](#2-assignment-flow)
3. [Employee Enrollment](#3-employee-enrollment)
4. [Course Learning & Assessment](#4-course-learning--assessment)
5. [Course Completion & Certification](#5-course-completion--certification)
6. [Certificate Expiry & Renewal](#6-certificate-expiry--renewal)
7. [Manual Training Recording](#7-manual-training-recording)
8. [Billing](#8-billing)
9. [Compliance Matrix](#9-compliance-matrix)
10. [Dashboard Widget](#10-dashboard-widget)
11. [Database Schema](#11-database-schema)
12. [File Reference](#12-file-reference)
13. [Status Flows](#13-status-flows)
14. [Notification Channels](#14-notification-channels)

---

## 1. Entry Points

There are **5 distinct paths** that trigger a course assignment or training record:

### Path A: Manager assigns from Compliance Matrix

**Where:** `/dashboard/people/training/matrix` or `/dashboard/training`
**Who:** Manager, Admin, Owner, General Manager, Area Manager, Regional Manager
**How:** Click a matrix cell or "Assign Course" button > `AssignCourseModal` opens
**API:** `POST /api/training/assignments`
**Outcome:** Creates `course_assignment` (status=`invited`), sends Msgly message, calendar reminder, manager follow-up task

### Path B: Manager assigns from Employee Profile

**Where:** `/dashboard/people/[id]` > Training tab (`EmployeeTrainingTab`)
**Who:** Manager+
**How:** Check courses in grid > click "Assign Selected"
**API:** `POST /api/training/assignments`
**Outcome:** Same as Path A

### Path C: Manager books course from Certificate Expiry Task

**Where:** Today's Tasks > Certificate expiry task > `CertificateTaskModal` > "Book Course"
**Who:** Manager+
**How:** Opens `BookCourseFromTaskModal` with employee/course pre-filled
**API:** `POST /api/training/book-course-from-task`
**Outcome:** Creates `course_assignment`, sends notifications, AND auto-completes the originating `checklist_task`

### Path D: Manager updates certificate expiry directly

**Where:** Today's Tasks > Certificate expiry task > `CertificateTaskModal` > "Update Expiry"
**Who:** Manager+
**How:** Enter new expiry date in the modal
**API:** Calls `complete_training` RPC + updates `checklist_tasks`
**Outcome:** Creates/updates `training_record` with new expiry, completes the task. No course assignment created.

### Path E: Manual training recording

**Where:** `/dashboard/people/training/record` or `RecordTrainingModal` from various pages
**Who:** Manager+ (or staff recording own external training)
**API:** Calls `complete_training` Supabase RPC
**Outcome:** Creates `training_record` directly. No assignment, no online course, no Msgly message.

### Path F: Employee self-enrols from Course Catalog

**Where:** `/dashboard/courses` > click course > `/dashboard/courses/food-safety` > "Start Course"
**Who:** Any authenticated employee
**How:** Navigates to `/learn/[courseId]` directly (no assignment required for browsing, but assignment needed for tracked completion)
**Outcome:** Employee can view course content. If they have an active assignment, progress is tracked.

---

## 2. Assignment Flow

### API: `POST /api/training/assignments`

**Source file:** `src/app/api/training/assignments/route.ts`

**Step-by-step:**

1. Authenticate user via `supabase.auth.getUser()`
2. Fetch user's profile, verify company membership
3. Check role is manager+ (`admin`, `owner`, `manager`, `general_manager`, `area_manager`, `regional_manager`)
4. Fetch target employee profile (must be same company)
5. Fetch `training_courses` record (verify exists, same company, active)
6. Check no active assignment already exists (`status IN ('invited','confirmed','in_progress')`)
7. **INSERT** into `course_assignments`:
   - `company_id`, `profile_id`, `course_id`
   - `status = 'invited'`
   - `assigned_by = manager's profile.id`
   - `deadline_date = provided date`
8. **Send Msgly notification** → `sendCourseAssignmentNotification()`
   - Creates/finds channel named "Training: {Course Name}"
   - Adds employee + manager as channel members
   - Posts system message with "Confirm & Start Course" action button
   - Updates assignment with `msgly_conversation_id`
9. **Create calendar reminder** → `createCourseReminderTask()`
   - Creates notification (type=`task`) due 7 days before deadline
   - Updates assignment with `calendar_task_id`
10. **Create manager follow-up task** → `createCourseFollowUpTask()`
    - Creates `checklist_task` (priority=`high`) due 7 days after deadline
    - `source_type = 'course_followup'`
11. Return `{ success: true, assignmentId }`

### API: `POST /api/training/book-course-from-task`

**Source file:** `src/app/api/training/book-course-from-task/route.ts`

Same as above, plus:

- Step 12: **Complete originating task** - Updates `checklist_tasks` with `status='completed'`, `completed_by`, `completion_notes`
- Used exclusively from `CertificateTaskModal` > `BookCourseFromTaskModal`

---

## 3. Employee Enrollment

### Confirmation Page: `/training/confirm/[assignmentId]`

**Source file:** `src/app/training/confirm/[assignmentId]/page.tsx`

**What the employee sees:**

- Course name, description, estimated duration
- Deadline date
- Name confirmation field
- Site selector dropdown
- Charge acknowledgment checkbox ("A charge of £5 will apply upon completion")
- "Confirm & Start Course" button

**Step-by-step:**

1. Page loads assignment data (join with `training_courses` and `profiles`)
2. Validates assignment belongs to current user
3. Validates assignment status is `invited`
4. Employee enters name, selects site, checks acknowledgment
5. Calls `POST /api/training/assignments/[id]/confirm`
6. **API updates** `course_assignments`:
   - `status = 'confirmed'`
   - `confirmed_at = now()`
   - `confirmation_name`
   - `confirmation_site_id`
7. Creates calendar reminder (if not already created)
8. Redirects to `/learn/[courseId]` (if course has `content_path`) or `/dashboard/courses`

---

## 4. Course Learning & Assessment

### Course Layout: `/learn/[courseId]`

**Source file:** `src/app/learn/[courseId]/page.tsx`

**Course content** is loaded from static JSON data files in the `/courses/` directory. Each course has modules with pages containing:

- Content pages (text, images, interactions)
- Quiz pages (questions with scoring)
- Final assessment

### Progress Tracking

**API:** `POST /api/training/progress`
**Source file:** `src/app/api/training/progress/route.ts`

As the employee navigates through pages:

1. Each page/module completion calls `POST /api/training/progress`
2. Upserts into `course_progress` table:
   - `assignment_id`, `course_id`, `profile_id`, `company_id`
   - `module_id`, `lesson_id`, `page_id`
   - `status` (not_started / in_progress / completed)
   - `quiz_score`, `quiz_passed`, `time_spent_seconds`
3. If assignment status is `confirmed` and first progress is recorded → status updates to `in_progress`

### Quiz Questions

**API:** `GET /api/training/questions?course_id=X&module_id=Y`
**Source file:** `src/app/api/training/questions/route.ts`

- Fetches from `course_questions` + `course_question_options`
- Supports `single_choice`, `multi_choice` question types
- Questions randomized by default
- Optional `count` parameter to limit questions

### Final Assessment Access

**Source file:** `src/lib/training/courseAccess.ts`

- `canAccessFinalAssessment()` checks assignment status is `confirmed` or `in_progress`
- Returns `{ allowed, reason, assignmentId }`

---

## 5. Course Completion & Certification

### API: `POST /api/courses/complete`

**Source file:** `src/app/api/courses/complete/route.ts`

**Request body:** `{ courseId, scorePercentage, assignmentId?, siteId? }`

**Step-by-step** (via `completeCourseWithCertificate()`):

1. Map `courseId` (JSON file ID like "uk-l2-food-safety") to `training_courses` DB record via `courseMapping.ts`
2. Check `scorePercentage >= pass_mark_percentage` (default 70%)
3. Determine if course generates certificate (`courseGeneratesCertificate()`)
4. If yes: generate certificate number format `{CODE}-{YYYY}-{RANDOM}` (e.g., "FS-L2-2026-ABC123")
5. Calculate `expiry_date` from `certification_validity_months`
6. Call `complete_training` Supabase RPC → creates/upserts `training_record`:
   - `status = 'completed'`
   - `passed = true/false`
   - `score_percentage`
   - `certificate_number`
   - `expiry_date`
7. If `assignmentId` provided → update `course_assignments`:
   - `status = 'completed'`
   - `training_record_id = new record ID`
8. Create `course_charge`:
   - `amount_pence = 500` (£5.00)
   - `status = 'pending'`
   - `charge_type = 'course_completion'`
9. Return `{ trainingRecordId, certificateNumber, certificateUrl }`

### Certificate PDF Generation

**API:** `GET /api/certificates/[recordId]`
**Source file:** `src/app/api/certificates/[recordId]/route.ts`

1. Fetch `training_record` (must have `passed = true`)
2. Check access: owner OR same-company manager+
3. Check Supabase Storage cache at `certificates/{certificate_number}.pdf`
4. If cached → return cached PDF
5. If not cached → generate PDF via `generateCertificatePdf()`, cache to storage
6. Return PDF with `Content-Type: application/pdf`

---

## 6. Certificate Expiry & Renewal

### How Expiry Tasks Are Generated

Certificate expiry tasks appear in **Today's Tasks** via the task generation system. When a `training_record.expiry_date` is approaching (within `renewal_reminder_days`, default 30), a `checklist_task` is created for the employee's manager.

### Task Metadata

```json
{
  "certificate_type": "food_safety",
  "profile_id": "uuid",
  "expiry_date": "2026-03-15",
  "employee_name": "Vicky Thomas"
}
```

### Certificate Task Modal

**Source file:** `src/components/training/CertificateTaskModal.tsx`

When a manager opens a certificate expiry task, the modal presents **two paths**:

#### Option 1: Book Training Course (Primary CTA - Pink themed)

- Opens `BookCourseFromTaskModal`
- Maps `certificate_type` → `course_code` via `certificateMapping.ts`
- Looks up `training_courses` by code
- Calls `POST /api/training/book-course-from-task`
- Creates assignment + notifications + completes the task

#### Option 2: Update Expiry Date (Secondary - Amber themed)

- Enter new expiry date (must be future)
- Calls `complete_training` RPC to create/update training record
- Updates `checklist_task` to completed
- No course assignment, no Msgly message

### Certificate Type to Course Code Mapping

**Source file:** `src/lib/training/certificateMapping.ts`

| Certificate Type | Level 2 Code | Level 3 Code |
| ---------------- | ------------ | ------------ |
| food_safety      | FS-L2        | FS-L3        |
| h_and_s          | HS-L2        | HS-L3        |
| fire_marshal     | FIRE         | -            |
| first_aid        | FIRST-AID    | -            |
| cossh            | COSHH        | -            |
| allergen         | ALLERGY      | -            |

### Training Record Lookup for Legacy Data

**Source file:** `src/lib/training/trainingRecordLookup.ts`

Some employees have certificate expiry dates stored directly on the `profiles` table (legacy fields: `food_safety_expiry_date`, `h_and_s_expiry_date`, etc.). The lookup function:

1. Maps certificate_type → course_code
2. Searches `training_courses` by code
3. Searches `training_records` by profile + course
4. If no records found → falls back to `profiles` table legacy fields
5. Returns virtual `TrainingRecord` objects for legacy data

---

## 7. Manual Training Recording

### Record Training Modal

**Source file:** `src/components/training/RecordTrainingModal.tsx`

**Available from:**

- `/dashboard/people/training` (Record Training button)
- `/dashboard/people/training/matrix` (Record Training button)
- `/dashboard/people/training/course/[id]` (Record Training button)
- `/dashboard/training` (Record Training button)
- Employee profile Training tab

**Fields:**

- Employee selector (dropdown, disabled in edit mode)
- Course selector (grouped by category)
- Completion date (required)
- Expiry date (auto-calculated from course `certification_validity_months`)
- Score (if `assessment_required = true`)
- Certificate number (if `results_in_certification = true`)
- Trainer/provider name
- Notes

**Process:**

1. Manager selects employee and course
2. Enters completion details
3. Calls `complete_training` Supabase RPC
4. Creates `training_record` directly
5. DB trigger `sync_training_record_to_profile` auto-syncs to profile cert fields

### Standalone Record Page

**Source file:** `src/app/dashboard/people/training/record/page.tsx`

Same functionality as the modal but as a full page. Accepts `employee` and `course` query params for pre-selection.

---

## 8. Billing

**Source file:** `src/lib/training/billing.ts`

### Course Charges

Every course completion (via `completeCourseWithCertificate()`) creates a `course_charge`:

- `amount_pence = 500` (£5.00)
- `status = 'pending'`
- `charge_type = 'course_completion'`

### Invoice Integration

1. `findOrCreateInvoice(companyId, subscriptionId)` - Gets or creates a draft invoice
2. `addChargeToInvoice(chargeId, invoiceId)` - Adds charge as a line item
3. `addPendingChargesToInvoice(companyId, subscriptionId)` - Bulk processes all pending charges
4. Invoice number format: `INV-{YYYY}-{NNN}` (e.g., "INV-2026-001")
5. Payment due: 30 days from invoice date

---

## 9. Compliance Matrix

### Matrix View

**Source file:** `src/app/dashboard/people/training/matrix/page-client.tsx`

**What it shows:**

- Grid: employees (rows) x courses (columns)
- Cell status icons: compliant (green check), expired (red X), expiring soon (amber clock), in progress, required, optional
- Summary stats: Team Members, Up to Date, Due Soon, Expired/Missing
- Site filter, mandatory-only toggle

**Data source:** `compliance_matrix_view` (Supabase view)

**Compliance Status Logic:**
| Status | Condition |
|---|---|
| `compliant` | Completed, passed, not expired |
| `expiring_soon` | Completed but expiring within 30 days |
| `expired` | Certificate has expired |
| `in_progress` | Currently undertaking training |
| `required` | Mandatory course, not yet completed |
| `optional` | Non-mandatory, not completed |

### Training Overview Page

**Source file:** `src/app/dashboard/people/training/page.tsx`

High-level dashboard showing:

- Overview stats from `company_training_overview` view
- Per-category certification cards (Food Safety, H&S, Fire, First Aid, COSHH)
- Expiring soon alerts
- Course compliance rates from `training_stats_view`

---

## 10. Dashboard Widget

### Training Expiries Widget

**Source file:** `src/components/dashboard/widgets-v2/TrainingExpiriesWidget.tsx`

- Shows staff with training expiring in 30 days
- Calls `get_expiring_training` RPC
- Displays top 5 with days countdown
- Red if <=7 days, orange if >7 days
- Quick-assign button opens `AssignCourseModal`

---

## 11. Database Schema

### Core Tables

#### `training_courses`

Course catalog. One row per course per company.

| Column                        | Type              | Purpose                                                      |
| ----------------------------- | ----------------- | ------------------------------------------------------------ |
| id                            | UUID PK           |                                                              |
| company_id                    | UUID FK→companies | Multi-tenancy                                                |
| name                          | TEXT              | Course name                                                  |
| code                          | TEXT              | Unique per company (e.g., "FS-L2")                           |
| category                      | TEXT              | Food Safety, Health & Safety, Compliance, Skills, Management |
| course_type                   | TEXT              | internal, external, online, certification                    |
| duration_minutes              | INT               | Estimated duration                                           |
| results_in_certification      | BOOL              | Whether completion generates a certificate                   |
| certification_validity_months | INT               | How long certificate is valid (NULL=forever)                 |
| is_mandatory                  | BOOL              | Required for all/some roles                                  |
| mandatory_for_roles           | TEXT[]            | Roles requiring this course                                  |
| mandatory_for_sites           | UUID[]            | Sites requiring this course (NULL=all)                       |
| pass_mark_percentage          | INT               | Required pass mark (default 70)                              |
| renewal_required              | BOOL              | Whether cert must be renewed                                 |
| renewal_reminder_days         | INT               | Days before expiry to remind (default 30)                    |
| is_active                     | BOOL              | Whether course is available                                  |
| content_path                  | TEXT              | Path to online course content                                |

#### `course_assignments`

Tracks the assignment → enrollment → completion workflow.

| Column                | Type                     | Purpose                                             |
| --------------------- | ------------------------ | --------------------------------------------------- |
| id                    | UUID PK                  |                                                     |
| company_id            | UUID FK→companies        |                                                     |
| profile_id            | UUID FK→profiles         | Assigned employee                                   |
| course_id             | UUID FK→training_courses |                                                     |
| status                | TEXT                     | invited, confirmed, in_progress, completed, expired |
| assigned_by           | UUID FK→profiles         | Manager who assigned                                |
| deadline_date         | DATE                     | Due date                                            |
| confirmed_at          | TIMESTAMPTZ              | When employee confirmed                             |
| confirmation_name     | TEXT                     | Name as confirmed                                   |
| confirmation_site_id  | UUID FK→sites            | Site confirmed at                                   |
| training_record_id    | UUID FK→training_records | Resulting training record                           |
| msgly_conversation_id | UUID                     | Messaging channel reference                         |
| calendar_task_id      | UUID                     | Calendar notification reference                     |

#### `training_records`

Stores completed training with certificate details.

| Column             | Type                     | Purpose                                              |
| ------------------ | ------------------------ | ---------------------------------------------------- |
| id                 | UUID PK                  |                                                      |
| company_id         | UUID FK→companies        |                                                      |
| profile_id         | UUID FK→profiles         | Employee                                             |
| course_id          | UUID FK→training_courses |                                                      |
| status             | TEXT                     | not_started, in_progress, completed, expired, failed |
| completed_at       | TIMESTAMPTZ              | Completion timestamp                                 |
| score_percentage   | INT                      | Assessment score (0-100)                             |
| passed             | BOOL                     | Whether assessment passed                            |
| certificate_number | TEXT                     | e.g., "FS-L2-2026-ABC123"                            |
| certificate_url    | TEXT                     | URL to cached PDF                                    |
| expiry_date        | DATE                     | When certificate expires                             |
| verified           | BOOL                     | Manager-verified                                     |
| trainer_name       | TEXT                     | For offline/external training                        |

#### `course_progress`

Granular page-by-page progress tracking for online courses.

| Column             | Type                       | Purpose                             |
| ------------------ | -------------------------- | ----------------------------------- |
| id                 | UUID PK                    |                                     |
| assignment_id      | UUID FK→course_assignments |                                     |
| profile_id         | UUID FK→profiles           |                                     |
| course_id          | UUID                       |                                     |
| module_id          | TEXT                       | Module identifier                   |
| lesson_id          | TEXT                       | Lesson identifier                   |
| page_id            | TEXT                       | Page identifier                     |
| status             | TEXT                       | not_started, in_progress, completed |
| quiz_score         | INT                        | Score for quiz pages                |
| quiz_passed        | BOOL                       |                                     |
| time_spent_seconds | INT                        | Time on page                        |

#### `course_charges`

Billing records for course completions.

| Column       | Type                     | Purpose                |
| ------------ | ------------------------ | ---------------------- |
| id           | UUID PK                  |                        |
| company_id   | UUID FK→companies        |                        |
| profile_id   | UUID FK→profiles         | Employee who completed |
| course_id    | UUID FK→training_courses |                        |
| amount_pence | INT                      | 500 (£5.00)            |
| status       | TEXT                     | pending, invoiced      |
| charge_type  | TEXT                     | course_completion      |

#### `course_questions` + `course_question_options`

Quiz/assessment question bank per course module.

### Views

| View                        | Purpose                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `compliance_matrix_view`    | Employee x Course grid with compliance status               |
| `training_stats_view`       | Per-course aggregated compliance stats                      |
| `company_training_overview` | Company-level summary (total, compliant, expiring, expired) |
| `training_records_view`     | Enriched records with employee/course joins                 |

### Key Database Functions (RPCs)

| Function                      | Purpose                                    |
| ----------------------------- | ------------------------------------------ |
| `complete_training()`         | Records training completion (upsert)       |
| `get_expiring_training()`     | Returns training expiring within N days    |
| `check_employee_compliance()` | Returns compliance status for one employee |
| `auto_expire_training()`      | Batch-expires old training records         |
| `get_compliance_summary()`    | Company compliance stats by category       |

---

## 12. File Reference

### API Routes

| Path                                          | File                                                       | Purpose                  |
| --------------------------------------------- | ---------------------------------------------------------- | ------------------------ |
| POST /api/training/assignments                | `src/app/api/training/assignments/route.ts`                | Create assignment        |
| GET /api/training/assignments                 | `src/app/api/training/assignments/route.ts`                | Fetch assignments        |
| POST /api/training/assignments/[id]/confirm   | `src/app/api/training/assignments/[id]/confirm/route.ts`   | Confirm enrollment       |
| POST /api/training/book-course-from-task      | `src/app/api/training/book-course-from-task/route.ts`      | Book from task           |
| GET /api/training/progress                    | `src/app/api/training/progress/route.ts`                   | Fetch progress           |
| POST /api/training/progress                   | `src/app/api/training/progress/route.ts`                   | Record progress          |
| GET /api/training/questions                   | `src/app/api/training/questions/route.ts`                  | Fetch quiz questions     |
| POST /api/training/records/[id]/update-expiry | `src/app/api/training/records/[id]/update-expiry/route.ts` | Update cert expiry       |
| POST /api/courses/complete                    | `src/app/api/courses/complete/route.ts`                    | Complete course          |
| GET /api/certificates/[recordId]              | `src/app/api/certificates/[recordId]/route.ts`             | Download certificate PDF |

### Library Functions

| File                                             | Key Exports                                               |
| ------------------------------------------------ | --------------------------------------------------------- |
| `src/lib/training/notifications.ts`              | `sendCourseAssignmentNotification()`, `resolveAuthUUID()` |
| `src/lib/training/calendar.ts`                   | `createCourseReminderTask()`                              |
| `src/lib/training/createCourseFollowUpTask.ts`   | `createCourseFollowUpTask()`                              |
| `src/lib/training/billing.ts`                    | `addChargeToInvoice()`, `findOrCreateInvoice()`           |
| `src/lib/training/certificateMapping.ts`         | `certificateTypeToCourseCode()`                           |
| `src/lib/training/courseAccess.ts`               | `getCurrentAssignment()`, `canAccessFinalAssessment()`    |
| `src/lib/training/trainingRecordLookup.ts`       | `findTrainingRecordForCertificate()`                      |
| `src/lib/training/bookCourseFromTask.ts`         | `bookCourseFromCertificateTask()`                         |
| `src/lib/certificates/courseCompletion.ts`       | `completeCourseWithCertificate()`                         |
| `src/lib/certificates/courseMapping.ts`          | `getCourseMapping()`, `courseGeneratesCertificate()`      |
| `src/lib/certificates/generateCertificatePdf.ts` | `generateCertificatePdf()`                                |

### UI Components

| File                                                       | Purpose                          |
| ---------------------------------------------------------- | -------------------------------- |
| `src/components/training/AssignCourseModal.tsx`            | Assign course to employee        |
| `src/components/training/BookCourseFromTaskModal.tsx`      | Book course from task            |
| `src/components/training/CertificateTaskModal.tsx`         | Handle cert expiry task          |
| `src/components/training/RecordTrainingModal.tsx`          | Record manual training           |
| `src/components/training/UpdateCertificateExpiryModal.tsx` | Update cert expiry date          |
| `src/components/training/EmployeeTrainingTab.tsx`          | Training tab on employee profile |

### Pages

| Route                                  | File                                                     | Purpose                     |
| -------------------------------------- | -------------------------------------------------------- | --------------------------- |
| /dashboard/courses                     | `src/app/dashboard/courses/page.tsx`                     | Course catalog              |
| /dashboard/my-training                 | `src/app/dashboard/my-training/page.tsx`                 | Employee's own training     |
| /dashboard/people/training             | `src/app/dashboard/people/training/page.tsx`             | Training overview (manager) |
| /dashboard/people/training/matrix      | `src/app/dashboard/people/training/matrix/page.tsx`      | Compliance matrix           |
| /dashboard/people/training/record      | `src/app/dashboard/people/training/record/page.tsx`      | Record training form        |
| /dashboard/people/training/course/[id] | `src/app/dashboard/people/training/course/[id]/page.tsx` | Course compliance detail    |
| /dashboard/training                    | `src/app/dashboard/training/page.tsx`                    | Legacy training overview    |
| /training/confirm/[assignmentId]       | `src/app/training/confirm/[assignmentId]/page.tsx`       | Employee enrollment         |
| /learn/[courseId]                      | `src/app/learn/[courseId]/page.tsx`                      | Course content/learning     |
| /learn/[courseId]/results              | `src/app/learn/[courseId]/results/page.tsx`              | Course results              |

---

## 13. Status Flows

### Course Assignment Status

```
                               ┌──────────────┐
                               │   INVITED     │  Manager assigns course
                               └──────┬───────┘
                                      │
                          Employee confirms
                                      │
                               ┌──────▼───────┐
                               │  CONFIRMED    │  Employee accepted
                               └──────┬───────┘
                                      │
                        First progress recorded
                                      │
                               ┌──────▼───────┐
                               │ IN_PROGRESS   │  Employee learning
                               └──────┬───────┘
                                      │
                         Course completed + passed
                                      │
                               ┌──────▼───────┐
                               │  COMPLETED    │  Certificate issued
                               └──────────────┘

Any active status ──── deadline passes ──── EXPIRED
```

### Training Record Status

```
                               ┌──────────────┐
                               │ NOT_STARTED   │  (from manual recording)
                               └──────┬───────┘
                                      │
                               ┌──────▼───────┐
                               │ IN_PROGRESS   │  (from progress tracking)
                               └──────┬───────┘
                                      │
                            ┌─────────┴──────────┐
                            │                    │
                     ┌──────▼───────┐    ┌───────▼──────┐
                     │  COMPLETED   │    │    FAILED     │
                     └──────┬───────┘    └──────────────┘
                            │
                   expiry_date passes
                            │
                     ┌──────▼───────┐
                     │   EXPIRED    │  (auto or via auto_expire_training)
                     └──────────────┘
```

---

## 14. Notification Channels

When a course is assigned, the system notifies the employee through **3 channels**:

### A. Msgly (Direct Message)

- Creates channel: "Training: {Course Name}"
- Channel type: `direct`, `is_auto_created: true`
- Members: employee (member role) + assigner (admin role)
- Message type: `system`
- Includes action button: "Confirm & Start Course" → `/training/confirm/[assignmentId]`
- **Source:** `src/lib/training/notifications.ts`

### B. Calendar/Notification

- Creates notification in `notifications` table
- Type: `task`
- Title: "Complete Training: {Course Name}"
- Link: `/learn/{content_path}` or `/dashboard/courses`
- Due date: 7 days before deadline (or 7 days from now if no deadline)
- Skipped if reminder date is in the past
- **Source:** `src/lib/training/calendar.ts`

### C. Manager Follow-up Task

- Creates `checklist_task` for the assigning manager
- Priority: `high`
- Due: 7 days after course deadline
- Task name: "Follow-up: {Employee Name} - {Course Name}"
- `source_type: 'course_followup'`
- **Source:** `src/lib/training/createCourseFollowUpTask.ts`

### Failure Handling

All notification channels are **fire-and-forget**: if any channel fails, the assignment still succeeds. Errors are logged but not propagated to the user.

---

## Default Seeded Courses

Each company gets these courses auto-seeded:

| Code    | Name                      | Duration | Validity  | Mandatory       |
| ------- | ------------------------- | -------- | --------- | --------------- |
| FS-L2   | Food Safety Level 2       | 3 hrs    | 36 months | All staff       |
| FS-L3   | Food Safety Level 3       | 8 hrs    | 36 months | Managers/Owners |
| ALLERGY | Allergen Awareness        | 1 hr     | 12 months | All staff       |
| HS-L2   | Health and Safety Level 2 | 4 hrs    | 36 months | All staff       |
| COSHH   | COSHH Training            | 45 min   | 24 months | All staff       |
| MH      | Manual Handling           | 30 min   | 24 months | All staff       |
| FIRE    | Fire Safety Awareness     | 45 min   | 12 months | All staff       |
| FAW     | First Aid at Work         | 18 hrs   | 36 months | Managers/Owners |
| PLH     | Personal Licence Holder   | 6 hrs    | No expiry | Managers/Owners |
| HS-IND  | Health & Safety Induction | 30 min   | No expiry | All staff       |
| GDPR    | Data Protection & GDPR    | 30 min   | 12 months | All staff       |

---

## Course Content (Online Courses Available)

| Course ID (JSON)              | Course Code | Certificate |
| ----------------------------- | ----------- | ----------- |
| uk-l2-food-safety             | FS-L2       | Yes         |
| uk-l2-health-and-safety       | HS-L2       | Yes         |
| uk-l2-allergens               | ALG-L2      | Yes         |
| uk-l2-fire-safety             | FS2-L2      | Yes         |
| uk-l2-manual-handling         | MH-L2       | Yes         |
| uk-l3-haccp                   | HACCP-L3    | Yes         |
| uk-l2-coshh                   | COSHH-L2    | Yes         |
| uk-l2-safeguarding            | SG-L2       | Yes         |
| uk-l2-first-aid               | FA-L2       | Yes         |
| uk-l2-food-allergens-advanced | ALG-ADV     | Yes         |
