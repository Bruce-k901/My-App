# 🚀 In-App Onboarding Link System - Implementation Plan

## The Vision

**Problem:** Current onboarding is paper-based, email back-and-forth, documents lost, compliance headache

**Solution:** Send new starter a magic link → Complete entire profile in-app → Manager approves → Ready for first shift

**USP:** Complete statutory onboarding BEFORE first shift = Clean payroll, full compliance, professional experience

---

## The Flow

### Manager Side

```
1. Hire someone from recruitment (or add directly)
   ↓
2. Create onboarding assignment
   - Enter: Name, Email, Start Date, Pay Rate
   - Select: FOH/BOH, Hourly/Salaried
   - System auto-loads appropriate pack
   ↓
3. Customize pack (optional)
   - Add/remove documents
   - Mark some as required/optional
   - Personalize contract with their details
   ↓
4. Generate & send magic link
   - System creates unique onboarding URL
   - Sends email: "Welcome! Complete your onboarding"
   - Track: Link sent, Link opened, Progress
   ↓
5. Monitor progress
   - See % complete
   - View submitted documents
   - Review uploaded files (ID, certificates)
   ↓
6. Approve & Activate
   - All docs complete? ✅
   - Mark as "Approved"
   - Employee status → Active
   - Can now be scheduled on rota
```

### New Starter Side

```
1. Receive email
   - Subject: "Welcome to [Company]! Complete your onboarding"
   - Contains magic link (no password needed)
   ↓
2. Click link → Opens onboarding portal
   - Welcome screen with their name
   - Shows list of documents to complete
   - Progress bar (0% → 100%)
   ↓
3. Complete profile IN-APP
   - Personal Details (address, phone, emergency contact)
   - Bank Details (for payroll)
   - Tax Info (NI number, tax code)
   - Right to Work (upload passport/visa)
   - Qualifications (upload certificates)
   ↓
4. Read & Sign Documents
   - Staff Handbook (read → tick "I agree")
   - Employment Contract (with their name/pay prefilled)
   - Health Declaration
   - GDPR Consent
   - Each requires e-signature or checkbox
   ↓
5. Upload Required Documents
   - Photo ID (passport/driving license)
   - Proof of Address
   - Food Hygiene Certificate (if required)
   - Right to Work documents
   - Drag-and-drop upload
   ↓
6. Submit for approval
   - Click "Submit Onboarding"
   - Manager gets notification
   - Employee sees "Pending approval" status
   ↓
7. Approved! 🎉
   - Email: "You're all set! See you on [start date]"
   - Can now log in to full app
   - See their schedule
   - Clock in/out on first day
```

---

## Database Schema

### 1. Onboarding Tokens Table (NEW)
```sql
CREATE TABLE onboarding_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  
  -- Token should expire after 7 days
  CHECK (expires_at > created_at)
);

CREATE INDEX idx_onboarding_tokens_token ON onboarding_tokens(token);
CREATE INDEX idx_onboarding_tokens_profile ON onboarding_tokens(profile_id);
```

### 2. Employee Onboarding Documents (Enhanced)
```sql
CREATE TABLE employee_onboarding_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES employee_onboarding_assignments(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Document info
  document_type TEXT NOT NULL, -- 'id_proof', 'certificate', 'right_to_work', 'contract_signed', etc.
  document_name TEXT NOT NULL,
  file_path TEXT, -- NULL if just acknowledgment (no upload)
  
  -- Upload/acknowledgment
  uploaded_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ, -- For read & agree documents
  signature_data TEXT, -- E-signature if needed
  
  -- Manager review
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. Employee Profile Data (NEW)
```sql
CREATE TABLE employee_profile_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Personal
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'United Kingdom',
  
  -- Emergency Contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  
  -- Banking (encrypted in production)
  bank_name TEXT,
  account_number TEXT,
  sort_code TEXT,
  
  -- Tax
  ni_number TEXT,
  tax_code TEXT,
  student_loan TEXT CHECK (student_loan IN ('none', 'plan1', 'plan2', 'plan4', 'postgrad')),
  
  -- Employment
  start_date DATE,
  position TEXT,
  pay_rate DECIMAL(10,2),
  pay_frequency TEXT CHECK (pay_frequency IN ('hourly', 'daily', 'weekly', 'monthly', 'annual')),
  contract_type TEXT CHECK (contract_type IN ('permanent', 'fixed_term', 'zero_hours', 'casual')),
  contract_hours DECIMAL(5,2),
  
  -- Right to Work
  right_to_work_verified BOOLEAN DEFAULT false,
  right_to_work_expiry DATE,
  share_code TEXT, -- For right to work checks
  
  -- Health
  dietary_requirements TEXT,
  medical_conditions TEXT,
  disabilities TEXT,
  
  -- Consent flags
  gdpr_consent BOOLEAN DEFAULT false,
  gdpr_consent_date TIMESTAMPTZ,
  marketing_consent BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies needed
ALTER TABLE employee_profile_data ENABLE ROW LEVEL SECURITY;
```

### 4. Add Status to Profiles
```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending' 
CHECK (onboarding_status IN ('pending', 'in_progress', 'submitted', 'approved', 'active'));

-- Update existing profiles to 'active'
UPDATE profiles SET onboarding_status = 'active' WHERE onboarding_status IS NULL;
```

### 5. Update Onboarding Assignments
```sql
ALTER TABLE employee_onboarding_assignments
ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS contract_prepared BOOLEAN DEFAULT false;
```

---

## API Endpoints

### 1. Create Onboarding Assignment + Send Link
```typescript
POST /api/onboarding/create-and-send
Body: {
  email: string
  fullName: string
  startDate: string
  position: string
  bohFoh: 'FOH' | 'BOH' | 'BOTH'
  payType: 'hourly' | 'salaried'
  payRate: number
  packId?: string // Optional - auto-select if not provided
}
Response: {
  success: boolean
  profileId: string
  assignmentId: string
  tokenUrl: string
  emailSent: boolean
}
```

### 2. Verify Token & Get Assignment
```typescript
GET /api/onboarding/verify/:token
Response: {
  valid: boolean
  assignment: {
    id: string
    employeeName: string
    companyName: string
    startDate: string
    position: string
    documents: Document[]
    profileData: PartialProfile
    completionPercentage: number
  }
}
```

### 3. Update Profile Data
```typescript
PATCH /api/onboarding/profile/:token
Body: {
  personalDetails: { ... }
  emergencyContact: { ... }
  bankDetails: { ... }
  taxInfo: { ... }
}
Response: { success: boolean }
```

### 4. Upload Document
```typescript
POST /api/onboarding/upload-document/:token
Body: FormData {
  assignmentId: string
  documentType: string
  file: File
}
Response: {
  success: boolean
  documentId: string
  fileUrl: string
}
```

### 5. Acknowledge Document
```typescript
POST /api/onboarding/acknowledge-document/:token
Body: {
  documentId: string
  acknowledged: boolean
  signature?: string
}
Response: { success: boolean }
```

### 6. Submit for Approval
```typescript
POST /api/onboarding/submit/:token
Response: {
  success: boolean
  completionPercentage: number
  missingItems: string[]
}
```

### 7. Manager Approve
```typescript
POST /api/onboarding/approve/:assignmentId
Body: {
  approved: boolean
  notes?: string
}
Response: {
  success: boolean
  profileStatus: 'active'
}
```

---

## UI Pages & Components

### 1. Manager: Create Onboarding Assignment Modal
**Path:** Modal on `/dashboard/people/onboarding`

**Components:**
- **Step 1: Employee Details**
  - Full Name (required)
  - Email (required)
  - Start Date (required)
  - Position (dropdown or text)
  
- **Step 2: Contract Terms**
  - FOH/BOH/Both (radio buttons)
  - Hourly/Salaried (radio buttons)
  - Pay Rate (£ per hour or annual)
  - Contract Hours (per week)
  - Contract Type (permanent/fixed-term/zero-hours)
  
- **Step 3: Onboarding Pack**
  - Auto-selected based on FOH/BOH + hourly/salaried
  - Preview: Shows documents in pack
  - Can add/remove documents
  - Mark required/optional
  
- **Step 4: Review & Send**
  - Preview email that will be sent
  - Option: "Send now" or "Save draft"
  - Generate link button
  - Copy link (if not sending email yet)

**Actions:**
- Creates profile with status: `pending`
- Creates assignment
- Generates token
- Sends email
- Redirects to tracking page

---

### 2. Employee: Onboarding Portal
**Path:** `/onboarding/[token]` (public route, no auth needed)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ [Company Logo]            Welcome, [Name]!          │
│                                                      │
│ Progress: ████████░░░░░░░░░░  65%                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 📋 Your Onboarding Checklist                        │
│                                                      │
│ ✅ 1. Personal Details           COMPLETE           │
│ ✅ 2. Emergency Contact           COMPLETE           │
│ ⏳ 3. Bank Details                IN PROGRESS        │
│ ⬜ 4. Tax Information            TO DO               │
│ ⬜ 5. Right to Work              TO DO               │
│ ⬜ 6. Staff Handbook             TO DO               │
│ ⬜ 7. Employment Contract        TO DO               │
│ ⬜ 8. Health Declaration         TO DO               │
│ ⬜ 9. GDPR Consent               TO DO               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Let's get started! Click an item above to begin.    │
│                                                      │
│ Your start date: Monday, 3rd January 2025           │
│ Position: Server (Front of House)                   │
└─────────────────────────────────────────────────────┘
```

**Sections (Expandable):**

#### Section 1: Personal Details
- Full Name (prefilled from invite)
- Date of Birth
- Phone Number
- Address (line 1, line 2, city, postcode)
- Save button

#### Section 2: Emergency Contact
- Name
- Phone
- Relationship
- Save button

#### Section 3: Bank Details
- Bank Name
- Account Number
- Sort Code
- "Why do we need this?" info tooltip
- Save button

#### Section 4: Tax Information
- National Insurance Number
- Tax Code (or "I don't know my tax code")
- Student Loan (none/plan1/plan2/etc)
- Save button

#### Section 5: Right to Work
- Upload passport or
- Upload UK driving license + proof of address or
- Upload BRP card
- Drag-and-drop zone
- Preview uploaded files

#### Section 6: Read & Acknowledge Documents
For each document:
- Document viewer (embedded PDF or download)
- Checkbox: "I have read and understood this document"
- E-signature field (type your name)
- Date (auto-filled)

#### Section 7: Upload Certificates
- Food Hygiene Certificate (if required)
- First Aid Certificate (if required)
- Other qualifications
- Drag-and-drop zones

#### Final: Submit
- Review all sections
- "Submit for Approval" button
- Disabled until all required sections complete
- Shows missing items if incomplete

---

### 3. Manager: Review Onboarding Progress
**Path:** `/dashboard/people/onboarding` (enhanced)

**New Components:**

#### Onboarding Progress Card
For each employee in onboarding:
```
┌─────────────────────────────────────────────────────┐
│ 👤 John Smith                        ████░░ 75%     │
│    Server (FOH) • Starts: 3 Jan 2025                │
│                                                      │
│    Personal Details ✅  Bank Details ✅              │
│    Tax Info ✅          Right to Work ⏳             │
│    Documents ⬜ (3/5 complete)                       │
│                                                      │
│    [View Details] [Send Reminder] [Edit Pack]       │
└─────────────────────────────────────────────────────┘
```

#### Review Modal
Click "View Details" →
- See all submitted data
- View uploaded documents (preview or download)
- Approve/reject each document
- Add notes
- "Approve All & Activate" button
- "Request Changes" button (sends email)

---

### 4. Email Templates

#### Onboarding Invitation Email
```
Subject: Welcome to [Company]! Complete Your Onboarding

Hi [Name],

Welcome to the team! We're excited for you to start on [Start Date] as our new [Position].

Before your first shift, please complete your onboarding profile. This should take about 15-20 minutes.

👉 Complete Your Onboarding: [Magic Link]

What you'll need:
✅ Your address and contact details
✅ Bank details (for payroll)
✅ National Insurance number
✅ Photo ID (passport or driving license)
✅ Proof of right to work in the UK
✅ Food Hygiene Certificate (if you have one)

This link is valid for 7 days. If you have any questions, just reply to this email.

See you soon!
[Manager Name]
[Company Name]

---
This link is personal to you. Please don't share it with others.
```

#### Reminder Email (if not complete after 3 days)
```
Subject: Reminder: Complete Your Onboarding for [Company]

Hi [Name],

Just a friendly reminder to complete your onboarding profile before your start date ([Start Date]).

You're [X]% complete - just a few more steps to go!

👉 Continue Your Onboarding: [Magic Link]

Need help? Just reply to this email.

Thanks!
[Manager Name]
```

#### Approval Email
```
Subject: You're All Set! Welcome to [Company]

Hi [Name],

Great news - your onboarding has been approved! You're all set for your first shift on [Start Date].

📅 Your First Day:
- Date: [Start Date]
- Time: [Start Time]
- Location: [Address]
- Report to: [Manager Name]

What to Bring:
- Your original ID documents (we'll take copies)
- Comfortable, non-slip shoes
- Enthusiasm! 🎉

You can now access the app to:
- View your schedule
- Clock in/out
- Request holidays
- View payslips

Download the app: [App Store Link] [Play Store Link]

See you on [Start Date]!
[Manager Name]
[Company Name]
```

---

## Security & Validation

### Token Security
- Tokens are UUID v4 (cryptographically random)
- Expire after 7 days
- Single-use preferred (mark as `used` when onboarding submitted)
- Or allow re-use until approved (so employee can come back)

### Data Validation
- All required fields validated before submission
- Bank details validated (UK sort code format)
- NI number validated (UK format)
- Postcode validated (UK format)
- File uploads: max 10MB, allowed types: PDF, JPG, PNG, DOC, DOCX

### File Storage
- Store in Supabase Storage: `company-onboarding/[company_id]/[profile_id]/[filename]`
- Generate signed URLs for viewing (manager only)
- Employee can't access other employees' files

### RLS Policies
```sql
-- Employee can only see/update their own onboarding via token
CREATE POLICY "onboarding_token_access"
ON employee_profile_data
FOR ALL
USING (
  profile_id IN (
    SELECT profile_id FROM onboarding_tokens 
    WHERE token = current_setting('request.jwt.claim.onboarding_token', true)
    AND expires_at > now()
    AND used_at IS NULL
  )
);

-- Managers can see all onboarding in their company
CREATE POLICY "managers_can_view_onboarding"
ON employee_profile_data
FOR SELECT
USING (
  profile_id IN (
    SELECT id FROM profiles 
    WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  AND
  (SELECT app_role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner', 'manager')
);
```

---

## Implementation Phases

### Phase 1: Database & Core (Week 1)
- [ ] Create all tables (tokens, profile_data, documents)
- [ ] Add status column to profiles
- [ ] RLS policies
- [ ] Migration script

### Phase 2: Manager UI (Week 1-2)
- [ ] "Create Onboarding" modal
- [ ] Token generation
- [ ] Email sending (Resend API)
- [ ] Progress tracking page
- [ ] Review & approve interface

### Phase 3: Employee Portal (Week 2-3)
- [ ] Public onboarding route
- [ ] Token verification
- [ ] Multi-step form
- [ ] File upload
- [ ] Document acknowledgment
- [ ] E-signature component
- [ ] Submit for approval

### Phase 4: Integration (Week 3)
- [ ] Connect to recruitment (offer accept → create onboarding)
- [ ] Connect to employees (approved → active status)
- [ ] Connect to rota (only show active employees)
- [ ] Email notifications

### Phase 5: Polish (Week 4)
- [ ] Progress bar
- [ ] Reminders
- [ ] Mobile optimization
- [ ] Testing
- [ ] Documentation

---

## Why This is a Game-Changer

### For Managers
✅ No more chasing paperwork  
✅ Everything in one place  
✅ Clear progress tracking  
✅ Professional first impression  
✅ Compliance guaranteed  
✅ Payroll-ready before first shift  

### For Employees
✅ Modern, mobile-friendly experience  
✅ Do it at their own pace  
✅ No printing/scanning  
✅ Know exactly what's needed  
✅ Clear progress indication  
✅ Feels professional & organized  

### For the Business
✅ Faster time-to-productivity  
✅ Complete audit trail  
✅ Reduced admin time (50%+)  
✅ Better compliance  
✅ Differentiation from competitors  
✅ Premium product positioning  

---

## Success Metrics

**Target:**
- Onboarding completion time: < 30 minutes (employee side)
- Manager approval time: < 15 minutes
- Total time from offer → active: < 48 hours
- Completion rate: > 95%
- Zero missing documents on first shift

---

Would you like me to start building this? I suggest we begin with:
1. Database migrations
2. Token generation system
3. Basic onboarding form structure
4. Then iterate from there
