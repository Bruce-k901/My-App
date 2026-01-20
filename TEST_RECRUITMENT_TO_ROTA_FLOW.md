# 🧪 Testing: Candidate → Rota Complete Flow

## Prerequisites

✅ Recruitment system built
✅ Onboarding system built  
✅ Storage bucket created (`recruitment_cvs`)
✅ RLS policies applied for public access

## Test Flow (Start to Finish)

### Step 1: Post a Job
1. Go to `/dashboard/people/recruitment`
2. Click "Post New Job"
3. Fill out job details:
   - Title: "Server"
   - Department: "Front of House"
   - Location: Your site
   - **FOH** (Front of House)
   - **Hourly** pay type
   - Pay rate: £12/hour
   - Required skills: Customer service
4. Set status to **"Open"**
5. Check **"Published"** checkbox
6. Click "Publish Job"

### Step 2: Share Job & Apply
1. Click "View" on the job card
2. Click "Copy Shareable Link"
3. Open link in **incognito window**
4. Click "Apply Now"
5. Fill out application:
   - Name: Test Candidate
   - Email: `your.test@email.com`
   - Phone: 07XXX XXXXXX
   - Upload a PDF CV
   - Add cover letter (optional)
6. Submit application
7. See success toast ✅
8. See confirmation page ✅

### Step 3: Review Application (Manager)
1. Go to `/dashboard/people/recruitment/candidates`
2. Find "Test Candidate" in the list
3. Click to view profile
4. See:
   - ✅ Application details
   - ✅ Cover letter
   - ✅ CV download button
5. Click "Download CV" - should open in new tab ✅

### Step 4: Progress Through Pipeline
1. On candidate profile, click status buttons:
   - "Screening" → Status updates ✅
   - "Interview" → Status updates ✅
   - "Trial" → Status updates ✅
2. Add interview notes (optional)

### Step 5: Send Offer Letter
1. When status is "Trial", click **"Send Offer"**
2. Fill out offer details:
   - Start date: Next Monday
   - Pay rate: £12 (matches job)
   - Contract type: Permanent
   - Contract hours: 40
3. Click "Send Offer"
4. See success toast ✅
5. **Copy the offer URL** from the toast

### Step 6: Accept Offer (Candidate)
1. Open the offer URL in incognito window
2. See beautiful offer letter with all details
3. Type full name in signature field
4. Click "Accept Offer"
5. See success message ✅

### Step 7: Verify Onboarding Created
1. Go to `/dashboard/people/onboarding` (People to Onboard)
2. Should see "Test Candidate" with:
   - ✅ Profile created
   - ✅ Onboarding pack assigned (FOH Hourly)
   - ✅ Status: Pending
3. Click to view onboarding details

### Step 8: Complete Onboarding
1. Upload required documents
2. Candidate acknowledges documents
3. Mark onboarding as complete

### Step 9: Move to Employees & Rota
1. Go to `/dashboard/people/employees`
2. Test Candidate should appear in employees list
3. Go to `/dashboard/people/schedule` (Rota)
4. Test Candidate should be available to schedule

## 🔧 If You Hit Issues

### Same Email Already Used
Run this SQL (change the email):
```sql
DELETE FROM public.offer_letters WHERE candidate_id IN (SELECT id FROM public.candidates WHERE email = 'your.test@email.com');
DELETE FROM public.applications WHERE candidate_id IN (SELECT id FROM public.candidates WHERE email = 'your.test@email.com');
DELETE FROM public.candidates WHERE email = 'your.test@email.com';
DELETE FROM public.profiles WHERE email = 'your.test@email.com';
```

### CV Not Uploading
- Check bucket exists: `recruitment_cvs`
- Check browser console for errors
- Verify file is PDF/DOC/DOCX under 5MB

### Offer Acceptance Fails
- Check profile doesn't already exist with that email
- Clear test data using SQL above
- Check browser console for specific error

### Onboarding Pack Not Assigned
- Make sure you ran `REBUILD_ONBOARDING_SIMPLE.sql`
- Check pack exists for FOH + Hourly
- Go to `/dashboard/people/onboarding/packs` to verify

## 📧 Email Testing (Optional)

If you want to test emails:
1. Sign up for Resend (free: 100 emails/day)
2. Get API key
3. Add to `.env.local`:
   ```env
   RESEND_API_KEY=re_your_key_here
   RESEND_FROM=onboarding@resend.dev
   ```
4. Restart server
5. Offer emails will send automatically

For now, just **copy the offer URL from the toast** and open it manually!

## ✅ Expected End Result

After completing all steps:
- ✅ Candidate applied through public form
- ✅ Manager reviewed application & CV
- ✅ Offer sent and accepted
- ✅ Profile auto-created
- ✅ Onboarding pack auto-assigned (FOH Hourly)
- ✅ Candidate appears in onboarding
- ✅ After onboarding complete → Moves to employees
- ✅ Available to schedule on rota

**The entire recruitment → onboarding → employee → rota pipeline is working!** 🎉
