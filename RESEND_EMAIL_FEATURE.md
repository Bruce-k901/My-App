# 📧 Resend Email Feature - Complete

## Overview

Managers can now **resend invitation emails** directly from the candidate profile page. This is useful when:
- Candidate didn't receive the original email
- Email went to spam
- Candidate lost the email
- Need to send a reminder
- Email address was corrected

## 🎯 Features

### **1. Resend Interview Invitation** 📅

**When Available:**
- Application status: `interview`
- Interview has been scheduled

**What It Sends:**
- Original interview details
- Confirmation token (for one-click responses)
- All confirmation buttons (Confirm/Request Changes)

**Button Location:**
- Inside the interview confirmation status box
- Blue colored button
- Icon: 📧 Mail

### **2. Resend Trial Invitation** 👔

**When Available:**
- Application status: `trial`
- Trial shift has been scheduled

**What It Sends:**
- Trial shift date, time, location
- Duration and contact person
- Payment terms
- Confirmation token
- All confirmation buttons

**Button Location:**
- Inside the trial confirmation status box
- Purple colored button
- Icon: 📧 Mail

### **3. Resend Offer Email** 💼

**When Available:**
- Application status: `offer` or `accepted`
- Offer has been sent

**What It Sends:**
- Complete offer details (pay, start date, contract)
- Confirmation token
- Accept/Request Changes/Decline buttons
- Link to offer letter

**Button Location:**
- In the action buttons section
- Pink colored button
- Icon: 📧 Mail

## 🎨 UI Design

### **Interview Resend Button**

```
┌────────────────────────────────────────┐
│ 📅 Interview: 20 Dec, 10:00           │
│ Attendance: ⏳ Pending Response       │
│ ┌──────────────────────────────────┐  │
│ │ 📧 Resend Interview Invitation   │  │
│ └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

**Styling:**
- Background: `bg-blue-500/10`
- Text: `text-blue-400`
- Border: `border-blue-500/30`
- Hover: `hover:bg-blue-500/20`
- Full width button
- Small icon + text

### **Trial Resend Button**

```
┌────────────────────────────────────────┐
│ 👔 Trial: 23 Dec, 09:00               │
│ Attendance: ✓ Confirmed               │
│ ┌──────────────────────────────────┐  │
│ │ 📧 Resend Trial Invitation       │  │
│ └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

**Styling:**
- Background: `bg-purple-500/10`
- Text: `text-purple-400`
- Border: `border-purple-500/30`
- Hover: `hover:bg-purple-500/20`

### **Offer Resend Button**

```
┌────────────────────────────────────────┐
│ Action Buttons                         │
│ ┌──────────────────────────────────┐  │
│ │ 📧 Resend Offer Email            │  │
│ └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

**Styling:**
- Background: `bg-pink-500/10`
- Text: `text-pink-400`
- Border: `border-pink-500/30`
- Hover: `hover:bg-pink-500/20`

## 🔄 How It Works

### **Interview Email Resend**

1. **Manager clicks "Resend Interview Invitation"**
2. System fetches:
   - Application's `confirmation_token`
   - Interview scheduled date/time
   - Job title and company details
3. Calls API: `/api/recruitment/send-interview-invite`
4. Email sent with:
   - Interview details
   - Confirmation buttons
   - Secure token link
5. Toast notification: "✅ Interview invitation resent!"

### **Trial Email Resend**

1. **Manager clicks "Resend Trial Invitation"**
2. System fetches:
   - Application's `confirmation_token`
   - Trial scheduled date/time
3. Extracts date and time from `trial_scheduled_at`
4. Calls API: `/api/recruitment/send-trial-invite`
5. Email sent with all trial details
6. Toast notification: "✅ Trial invitation resent!"

### **Offer Email Resend**

1. **Manager clicks "Resend Offer Email"**
2. System fetches:
   - Application's `confirmation_token`
   - Latest `offer_letters` record
3. Retrieves all offer details:
   - Start date
   - Pay rate
   - Contract type
   - Contract hours
   - Offer token
4. Calls API: `/api/recruitment/send-offer-email`
5. Email sent with complete offer
6. Toast notification: "✅ Offer email resent!"

## 🔒 Security

### **Same Token Reused**
- Each application has one `confirmation_token`
- Same token used for all resends
- Token doesn't expire (optional expiry can be added)
- Secure 128-bit UUID

### **No Duplicate Records**
- Resending doesn't create new application records
- Doesn't change confirmation status
- Doesn't reset responses
- Simply sends email again

### **Permission Check**
- User must be logged in
- User must have access to company
- Uses existing RLS policies
- Same permissions as scheduling

## 📊 Usage Scenarios

### **Scenario 1: Email Went to Spam**

**Problem:** Candidate says they never received interview invitation

**Solution:**
1. Manager goes to candidate profile
2. Sees interview is scheduled
3. Clicks "Resend Interview Invitation"
4. Candidate receives email again
5. This time they find it!

### **Scenario 2: Candidate Lost Email**

**Problem:** Candidate: "I deleted the email, can you send it again?"

**Solution:**
1. One click to resend
2. Same confirmation link works
3. No need to reschedule
4. Professional and quick

### **Scenario 3: Email Address Was Wrong**

**Problem:** Original email bounced

**Solution:**
1. Update candidate's email address
2. Click resend button
3. Email goes to correct address
4. Confirmation still works

### **Scenario 4: Reminder Before Event**

**Problem:** Interview tomorrow, candidate hasn't confirmed

**Solution:**
1. Resend invitation as reminder
2. Includes all details
3. Easy one-click confirmation
4. Reduces no-shows

## 📧 Email Content

All resent emails include:

### **✅ Original Content**
- All details from first send
- Date, time, location
- What to bring
- Additional info

### **✅ Confirmation Links**
- Same secure token
- All action buttons
- Works even if clicked multiple times
- Previous responses still visible

### **✅ Professional Formatting**
- Beautiful HTML emails
- Mobile-responsive
- Brand colors
- Clear call-to-action

## 🎯 Button States

### **Interview Button**
- Shows when: `interview_scheduled_at` exists
- Shows when: status = `interview`
- Always visible (pending, confirmed, declined, rescheduled)

### **Trial Button**
- Shows when: `trial_scheduled_at` exists
- Shows when: status = `trial`
- Always visible regardless of confirmation status

### **Offer Button**
- Shows when: status = `offer` OR `accepted`
- Fetches most recent offer_letters record
- Includes offer token for acceptance link

## 💡 Best Practices

### **For Managers:**

1. **Check spam first**
   - Ask candidate to check spam folder
   - Add your domain to safe senders

2. **Verify email address**
   - Before resending, confirm email is correct
   - Update if needed

3. **Use as reminder**
   - Send day before interview/trial
   - Reduces no-shows

4. **Don't spam**
   - One resend is usually enough
   - If multiple resends needed, call candidate

### **Automated Future Enhancements:**

Could add:
- Automatic reminder 24hrs before
- Track number of sends
- Flag if sent 3+ times
- Disable after certain number

## 🛠️ Technical Implementation

### **Files Modified:**

**`src/app/dashboard/people/recruitment/candidates/[id]/page.tsx`**

Added three resend button implementations:

1. **Interview resend button** (lines ~445-480)
   - Fetches confirmation_token
   - Calls send-interview-invite API
   - Shows success/error toast

2. **Trial resend button** (lines ~636-680)
   - Fetches confirmation_token
   - Parses trial_scheduled_at
   - Calls send-trial-invite API

3. **Offer resend button** (lines ~762-820)
   - Fetches confirmation_token
   - Queries offer_letters table
   - Calls send-offer-email API
   - Includes all offer details

### **APIs Used:**

All existing APIs, no changes needed:
- `/api/recruitment/send-interview-invite`
- `/api/recruitment/send-trial-invite`
- `/api/recruitment/send-offer-email`

### **Database Queries:**

**Get Confirmation Token:**
```typescript
const { data: appData } = await supabase
  .from('applications')
  .select('confirmation_token')
  .eq('id', app.id)
  .single()
```

**Get Offer Details:**
```typescript
const { data: offerData } = await supabase
  .from('offer_letters')
  .select('*')
  .eq('application_id', app.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .single()
```

## 🎨 Visual Examples

### **Before Clicking:**

```
┌─────────────────────────────────────────────┐
│ 📅 Interview: 20 Dec, 10:00                │
│ Attendance: ⏳ Pending Response            │
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ 📧 Resend Interview Invitation          ││  ← Button
│ └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### **After Clicking (Success):**

```
✅ Interview invitation resent!
```

### **After Clicking (Error):**

```
❌ Failed to resend invitation
```

## 🚀 Ready to Use

**Status:** ✅ Fully implemented

**Requirements:**
- None! Works immediately
- Uses existing confirmation system
- No database changes needed
- No migrations required

**Testing:**
1. Go to candidate profile
2. Schedule interview/trial or send offer
3. See resend button appear
4. Click button
5. Check email arrives
6. Verify confirmation links work

## 📈 Benefits

### **Time Saving**
- No need to reschedule
- One click vs multiple steps
- Instant delivery

### **Professional**
- Quick response to candidate requests
- Shows organization
- Reduces friction

### **Reliable**
- Uses same proven email system
- Same confirmation tokens
- Consistent experience

### **Flexible**
- Works for all email types
- Works any time after sending
- No restrictions

## 🔮 Future Enhancements

Potential additions:

1. **Send Count Tracking**
   ```sql
   ALTER TABLE applications 
   ADD COLUMN interview_email_send_count INT DEFAULT 1,
   ADD COLUMN trial_email_send_count INT DEFAULT 1;
   ```

2. **Last Sent Timestamp**
   - Show "Last sent: 2 hours ago"
   - Prevent accidental double-sends

3. **Custom Message**
   - Add optional note when resending
   - "Here's the invitation again..."

4. **SMS Backup**
   - If email fails, offer SMS
   - Twilio integration

5. **Email Open Tracking**
   - Track if candidate opened email
   - Resend button shows "Not opened"

6. **Bulk Resend**
   - Select multiple candidates
   - Resend to all pending

## ✨ Summary

**What:** Resend buttons for all recruitment emails

**Where:** Candidate profile page

**When:** After interview/trial/offer has been sent

**Why:** 
- Candidates lose emails
- Emails go to spam
- Need reminders
- Quick and professional

**How:** One-click resend with same details and token

**Status:** ✅ Complete and ready to use!

---

**Created:** December 2025  
**Module:** Teamly (Recruitment)  
**Impact:** Improved manager efficiency and candidate communication
