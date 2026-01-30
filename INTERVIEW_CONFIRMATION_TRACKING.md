# 📅 Interview & Trial Confirmation Tracking

## ✅ What's New

Your recruitment system now tracks whether candidates have confirmed their attendance for interviews and trial shifts!

## 🎯 Features Added

### **1. Database Schema**
Added 6 new columns to the `applications` table:

**Interview Tracking:**
- `interview_confirmation_status` - 'pending', 'confirmed', 'declined', or 'rescheduled'
- `interview_confirmation_at` - Timestamp when status was updated
- `interview_reschedule_reason` - Why it needs rescheduling (if applicable)

**Trial Tracking:**
- `trial_confirmation_status` - 'pending', 'confirmed', 'declined', or 'rescheduled'
- `trial_confirmation_at` - Timestamp when status was updated
- `trial_reschedule_reason` - Why it needs rescheduling (if applicable)

### **2. Automatic Status Setting**
When you schedule an interview or trial, the system automatically sets the confirmation status to `'pending'`.

### **3. UI on Candidate Profile Page**
On each candidate's profile (`/dashboard/people/recruitment/candidates/[id]`), you'll now see:

#### For Interview Stage:
```
┌─────────────────────────────────────────────┐
│ 📅 Interview: 20 Dec 2025, 10:00           │
│                                             │
│ Attendance: [✓ Confirmed] [✗ Declined]     │
│             [🔄 Reschedule]                 │
└─────────────────────────────────────────────┘
```

#### For Trial Stage:
```
┌─────────────────────────────────────────────┐
│ 👔 Trial: 22 Dec 2025, 09:00               │
│                                             │
│ Attendance: [✓ Confirmed] [✗ Declined]     │
│             [🔄 Reschedule]                 │
└─────────────────────────────────────────────┘
```

### **4. Action Buttons**

**Three quick actions:**

1. **✓ Confirmed** (Green)
   - Click when candidate confirms via email/phone
   - Shows as: ✓ Confirmed
   
2. **✗ Declined** (Red)
   - Click when candidate can't make it
   - Shows as: ✗ Declined
   
3. **🔄 Reschedule** (Amber)
   - Click when they need a different date/time
   - Prompts for reason
   - Shows as: 🔄 Needs Reschedule
   - Displays the reason below

**Reset Button:**
- Once a status is set, you can click "reset" to change it back to pending

## 📋 How to Use

### Step 1: Schedule Interview
1. Go to candidate profile
2. Click "📅 Schedule Interview"
3. Fill in details and send email
4. Status automatically set to **pending**

### Step 2: Track Confirmation
When candidate replies to your email:

**If they confirm:**
- Click **✓ Confirmed** button
- Status turns green

**If they decline:**
- Click **✗ Declined** button
- Status turns red
- Consider rescheduling or rejecting

**If they need to reschedule:**
- Click **🔄 Reschedule** button
- Enter their reason (e.g., "Can't make mornings, prefers afternoons")
- Manually reschedule the interview
- Status shows amber with reason displayed

### Step 3: Same for Trial Shifts
The exact same process works for trial shift confirmations.

## 🔧 Setup Required

### Apply Database Changes

**Option 1: Supabase SQL Editor (Recommended)**
1. Go to your Supabase project
2. Click SQL Editor
3. Copy and run the contents of: `APPLY_CONFIRMATION_TRACKING.sql`
4. Done! ✅

**Option 2: Supabase CLI**
```powershell
cd c:\Users\bruce\my-app
npx supabase db reset  # Full reset (caution: wipes data)
```

## 📊 Benefits

### **Better Organization**
- See at a glance who's confirmed
- Track who needs follow-up
- Identify candidates who are flaky

### **Improved Communication**
- No more wondering "Did they confirm?"
- Keep notes on reschedule reasons
- Better candidate experience

### **Data-Driven Decisions**
- Track confirmation rates by job
- Identify patterns (e.g., morning interviews have lower confirmation)
- Improve your recruitment process

## 🎨 Visual Indicators

**Color Coding:**
- 🟢 **Green** = Confirmed (good to go!)
- 🔴 **Red** = Declined (need to address)
- 🟡 **Amber** = Needs Reschedule (action required)
- ⚪ **Grey/White** = Pending (waiting for response)

## 📧 Email Workflow

Your interview/trial emails already say:
> "Please confirm your attendance by replying to this email."

**When they reply:**
1. Read their response
2. Go to their candidate profile
3. Click the appropriate button (Confirmed/Declined/Reschedule)
4. System tracks it automatically

**No need to manually update status** - you just click a button!

## 🚀 Next Steps

1. **Apply the SQL** from `APPLY_CONFIRMATION_TRACKING.sql`
2. **Test it out:**
   - Schedule an interview for a test candidate
   - See the confirmation buttons appear
   - Try clicking each button
3. **Start using it** for real candidates!

## 💡 Pro Tips

1. **Set a reminder** to check pending confirmations 24-48 hours after sending invite
2. **Follow up** with candidates who haven't confirmed 2 days before the interview
3. **Use the reschedule reason** to find better times for future candidates
4. **Track patterns** - if many decline, review your interview times/locations

## ✨ Future Enhancements

Potential additions:
- Auto-send reminder emails 24 hours before if still pending
- Analytics dashboard showing confirmation rates
- SMS confirmation option
- Calendar integration
- Automated follow-ups

---

**Status:** ✅ Ready to Use  
**Created:** December 2025  
**Module:** Teamly (Recruitment)
