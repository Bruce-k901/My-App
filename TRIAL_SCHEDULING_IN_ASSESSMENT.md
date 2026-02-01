# 📅 Enhanced Post-Interview Assessment with Trial Scheduling

## ✅ What's New

The **Post-Interview Assessment** modal now includes comprehensive trial shift scheduling! When you complete an interview and decide to progress a candidate to trial, you can immediately schedule the trial with all necessary details.

## 🎯 Features Added

### **1. Integrated Trial Scheduling**
When completing an interview and selecting "Progress to Trial", the modal now includes:

#### **Date & Time**
- **Trial Date** - Calendar picker
- **Start Time** - Time picker
- **Duration** - Dropdown (2, 3, 4, 6, or 8 hours)

#### **Location & Contact**
- **Site Selection** - Dropdown of all your company sites
- **Contact Person** - Dropdown of staff at selected site (automatically filtered!)
- Shows site name and address in dropdown
- If no staff found for site, shows company managers

#### **Additional Details**
- **What to Bring** - e.g., "Black shoes, apron, ID"
- **Additional Information** - Parking, entrance instructions, expectations

### **2. Smart Site-Based Staff Filtering**
When you select a site, the system automatically:
1. Loads all staff/managers assigned to that site
2. Filters the contact person dropdown
3. Falls back to company managers if no site-specific staff found
4. Shows loading indicator while fetching

### **3. Automatic Trial Email with Full Details**
When you submit the assessment, the system:
1. Saves interview notes and rating
2. Schedules the trial shift
3. Sends trial invitation email with:
   - Date, time, and duration
   - Full site address
   - Contact person name
   - What to bring
   - Additional instructions
4. Sets trial confirmation status to 'pending'

## 📋 Workflow

### **Step 1: Complete Interview**
1. Go to candidate profile
2. Click "✍️ Complete Interview"
3. Select "Progress to Trial"
4. Rate the interview (1-5 stars)
5. Add your manager notes

### **Step 2: Schedule Trial**
The modal now shows **"Schedule Trial Shift"** section:

```
📅 Schedule Trial Shift
├── Trial Date: [Select date]
├── Start Time: [Select time]
├── Duration: [2/3/4/6/8 hours]
├── Location: [Select site from dropdown]
├── Contact Person: [Filtered by site]
├── What to Bring: [Optional text]
└── Additional Info: [Optional text]
```

### **Step 3: Submit**
Click **"Submit"** and the system:
- ✅ Saves interview assessment
- ✅ Creates trial schedule
- ✅ Sends trial invitation email
- ✅ Sets confirmation tracking to 'pending'

## 🎨 UI Enhancements

### **Visual Sections**
The modal is now organized into clear sections:
1. **Decision** - Progress or Reject
2. **Rating** - 1-5 stars
3. **Manager Notes** - Required text area
4. **Schedule Trial Shift** - Full scheduling form (only when progressing)

### **Smart Field Behavior**
- Contact person dropdown **disabled** until site is selected
- Shows "Select a site first" placeholder when no site selected
- Loading spinner while fetching site staff
- Helpful message if no staff found for site

### **Validation**
System validates:
- ✓ Manager notes are required
- ✓ Trial date is required
- ✓ Trial time is required
- ✓ Site selection is required
- ✓ Contact person is required

## 📧 Email Content

The trial invitation email now includes:

```
Dear [Candidate Name],

Great news! We'd like to invite you for a trial shift:

📅 Date: [Day, DD Mon YYYY]
⏰ Time: [HH:MM]
⏱️ Duration: [X] hours

📍 Location:
[Site Name]
[Site Address]

👤 On Arrival:
You will meet [Contact Person Name]

📋 What to Bring:
[Items to bring]

ℹ️ Additional Information:
[Parking, entrance, expectations, etc.]

Please confirm your attendance by replying to this email.
```

## 🔧 Technical Implementation

### **New State Variables**
- `trialDate`, `trialTime`, `trialDuration`
- `trialSiteId`, `trialContactPerson`
- `trialWhatToBring`, `trialAdditionalInfo`
- `sites[]` - List of company sites
- `siteStaff[]` - Filtered staff for selected site
- `loadingSiteStaff` - Loading state

### **Data Loading**
- Sites loaded on modal mount
- Site staff loaded when site is selected
- Uses `useEffect` hooks for reactive updates

### **Database Updates**
On submission, updates `applications` table:
```sql
interview_notes = [notes]
interview_rating = [1-5]
interview_completed_at = [timestamp]
status = 'trial'
trial_scheduled_at = [date+time]
trial_confirmation_status = 'pending'
```

### **Email API Call**
```javascript
POST /api/recruitment/send-trial-invite
{
  candidateEmail, candidateName, jobTitle,
  trialDate, trialTime, trialDuration,
  trialLocation: "Site Name - Address",
  whatToBring, 
  additionalInfo: "includes contact person"
}
```

## 💡 Benefits

### **Time Saving**
- ✅ One modal for interview assessment + trial scheduling
- ✅ No need to open separate "Schedule Trial" modal
- ✅ All information captured at once

### **Better Organization**
- ✅ Interview notes saved before forgetting
- ✅ Trial scheduled while candidate is fresh in mind
- ✅ All details in one place

### **Improved Candidate Experience**
- ✅ Faster turnaround from interview to trial
- ✅ Complete trial information in one email
- ✅ Knows who to ask for on arrival
- ✅ Clear instructions on what to bring

### **Data Quality**
- ✅ Ensures trial scheduling isn't forgotten
- ✅ Captures site-specific contact information
- ✅ Links interview performance to trial scheduling

## 🎯 Field Descriptions

| Field | Required | Purpose | Example |
|-------|----------|---------|---------|
| **Trial Date** | Yes | When the trial will take place | 2025-12-20 |
| **Start Time** | Yes | What time to arrive | 09:00 |
| **Duration** | No | How long the trial lasts | 4 hours |
| **Location** | Yes | Which site/venue | "Main Kitchen - 123 High St" |
| **Contact Person** | Yes | Who greets them on arrival | "John Smith (Manager)" |
| **What to Bring** | No | Items they need | "Black shoes, apron, ID" |
| **Additional Info** | No | Extra instructions | "Park at rear, use staff entrance" |

## 🚀 Usage Tips

### **1. Keep Sites Updated**
Make sure your sites table has:
- Current addresses
- Active sites only
- Clear naming (e.g., "Main Kitchen" not "Site 1")

### **2. Assign Staff to Sites**
For the contact person dropdown to work well:
- Ensure managers are assigned to specific sites
- Use `sites` array field on profiles
- Or assign Manager/Admin roles

### **3. Provide Complete Information**
In "Additional Info", include:
- Where to park
- Which entrance to use
- What to expect during trial
- Break arrangements
- How payment works (if applicable)

### **4. Set Realistic Durations**
Common trial shift lengths:
- **2-3 hours** - Quick assessment, during service
- **4 hours** - Half shift, standard trial
- **6-8 hours** - Full shift, comprehensive trial

## 📊 Example Flow

**Scenario:** Sarah interviewed well for Sous Chef position

1. **Manager completes interview:**
   - Rating: 4/5 ⭐⭐⭐⭐
   - Notes: "Good knife skills, needs work on plating"
   - Decision: Progress to Trial

2. **Schedules trial immediately:**
   - Date: Friday, 20 Dec 2025
   - Time: 10:00
   - Duration: 4 hours
   - Location: Main Kitchen - 123 High Street, London
   - Contact: John Smith (Head Chef)
   - Bring: "Black chef jacket, knives, ID"
   - Info: "Park in staff lot at rear. Use kitchen entrance. We'll run you through service prep."

3. **System actions:**
   - ✅ Saves interview assessment
   - ✅ Updates status to 'trial'
   - ✅ Schedules trial for Dec 20
   - ✅ Sends detailed email to Sarah
   - ✅ Sets confirmation tracking
   - ✅ Shows on candidate profile

4. **Sarah receives email with all details**

5. **Manager sees trial on candidate profile with confirmation tracking**

## ✨ Future Enhancements

Potential additions:
- Add multiple contact people
- Select trial supervisor separately from greeter
- Add trial objectives/tasks checklist
- Integration with staff rotas
- Send calendar invite (ICS file)
- SMS notification option
- Map link to site location

---

**Status:** ✅ Ready to Use  
**Created:** December 2025  
**Module:** Teamly (Recruitment)  
**Component:** `ProgressApplicationModal.tsx`
