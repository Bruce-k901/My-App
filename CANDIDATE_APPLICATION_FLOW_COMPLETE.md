# ✅ Candidate Application Flow Complete

## 🎯 What's Been Built

### 1. Public Application Form
- **URL**: `/jobs/[jobId]/apply`
- **Features**:
  - Clean, professional form layout
  - Personal information (name, email, phone)
  - CV upload (PDF, DOC, DOCX - max 5MB)
  - Cover letter text area
  - Source tracking (how they heard about the job)
  - Real-time validation
  - Loading states during submission
  - Mobile responsive

### 2. Application Submission API
- **Endpoint**: `/api/recruitment/apply`
- **Process**:
  1. Validates all required fields
  2. Checks if candidate already exists (by email + company)
  3. Creates/updates candidate record
  4. Creates application record
  5. Links application to job
  6. Prevents duplicate applications to same job
  7. Returns candidate ID and application ID

### 3. CV Upload System
- **Storage**: Supabase Storage bucket `recruitment_cvs`
- **Folder Structure**: `{company_id}/candidates/{candidate_id}/{filename.pdf}`
- **Security**: 
  - Private bucket (not publicly accessible)
  - RLS policies for company members only
  - File validation (type & size)
- **Endpoint**: `/api/recruitment/update-cv-path`

### 4. Application Confirmation Page
- **URL**: `/jobs/[jobId]/apply/confirmation?applicationId={id}`
- **Features**:
  - Success animation with checkmark
  - Application summary (company, position, submitted date)
  - Application reference number
  - "What happens next?" guide
  - Confirmation email notice
  - Link back to job listing

### 5. Updated Public Job Page
- **"Apply Now" buttons** now link to `/jobs/[jobId]/apply`
- Removed placeholder modal

## 🔄 Complete Flow

### Candidate Journey:
1. **Discovers job** via shared link/social/job board
2. **Views job details** at `/jobs/[jobId]`
3. **Clicks "Apply Now"** → Redirected to application form
4. **Fills out form**:
   - Personal info
   - Uploads CV
   - Writes cover letter
   - Selects source
5. **Submits application**
6. **CV uploads** to Supabase Storage
7. **Redirected to confirmation** page
8. **Receives confirmation** email (TODO)

### Company Journey:
1. **Application arrives** in candidates page
2. **Manager views** candidate profile
3. **Downloads CV** from storage
4. **Reviews** application and cover letter
5. **Progresses** through interview stages
6. **Sends offer** letter
7. **Onboarding** automatically created when offer accepted

## 🗄️ Database Tables Used

### `candidates`
- Stores candidate personal info
- Links to company
- Tracks overall status (`active`, `hired`, `rejected`, `withdrawn`)
- Stores CV file path
- Unique constraint: email per company

### `applications`
- Links candidate to specific job
- Tracks application status (`applied`, `screening`, `interview`, `trial`, `offer`, `accepted`, `rejected`, `withdrawn`)
- Stores applied timestamp
- Stores status change history

## 🔒 Security Features

1. **Public Job Access**
   - Only published jobs (`is_published: true` AND `status: 'open'`)
   - RLS policy: `public_can_view_published_jobs`

2. **CV Storage Security**
   - Private bucket (not public)
   - Company-specific folders
   - RLS policies restrict access to company members
   - Managers can upload/view/delete

3. **Duplicate Prevention**
   - Checks if candidate already applied to same job
   - Returns error if duplicate application attempt

4. **File Validation**
   - CV must be PDF, DOC, or DOCX
   - Max file size 5MB
   - Client-side validation before upload

## 📝 Setup Required

### 1. Create Storage Bucket
Run the SQL file to create the bucket:
```bash
# In Supabase SQL Editor, run:
CREATE_RECRUITMENT_CVS_BUCKET.sql
```

Or create manually in Supabase Dashboard:
- Go to Storage
- Create new bucket: `recruitment_cvs`
- Set to **Private**
- Apply RLS policies from SQL file

### 2. Environment Variables
Ensure these are set:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🧪 Testing the Flow

1. **Create & publish a job** in recruitment dashboard
2. **Get shareable link** from job details page
3. **Open in incognito** window (to test as public user)
4. **Click "Apply Now"**
5. **Fill out application form**
6. **Upload a test CV** (PDF)
7. **Submit application**
8. **Verify confirmation** page loads
9. **Check candidates page** in dashboard
10. **Verify CV** can be downloaded

## 🚀 Next Steps (Optional Enhancements)

### Email Notifications
- Send confirmation email to candidate
- Notify hiring manager of new application
- Use Supabase Edge Functions or Resend/SendGrid

### Application Tracking
- Email notifications for status updates
- Candidate portal to view application status
- Calendar integration for interview scheduling

### Enhanced CV Features
- CV parsing/OCR to extract info
- Multiple document uploads (cover letter, certificates)
- LinkedIn profile import

### Application Analytics
- Track conversion rates
- Source effectiveness (which job boards work best)
- Time-to-hire metrics

## 📊 What Managers See

When an application is submitted, managers can:

1. **View in Candidates List**
   - New candidate appears with "applied" status
   - Shows job they applied to
   - Application date/time

2. **View Candidate Profile**
   - All applications for this candidate
   - Download CV
   - Read cover letter
   - See source (where they found the job)
   - Add internal notes
   - Progress through stages

3. **Move to Interview**
   - Update status to "screening" → "interview" → "trial"
   - Add interview notes
   - Schedule interviews (TODO)

4. **Send Offer**
   - When ready, click "Send Offer"
   - Fill out offer details
   - Candidate accepts online
   - **Auto-creates onboarding assignment** ✅

---

**Status**: ✅ Complete and ready to test!

**Key Files**:
- Form: `src/app/jobs/[jobId]/apply/page.tsx`
- API: `src/app/api/recruitment/apply/route.ts`
- Confirmation: `src/app/jobs/[jobId]/apply/confirmation/page.tsx`
- Storage Setup: `CREATE_RECRUITMENT_CVS_BUCKET.sql`
