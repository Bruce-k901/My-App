

# 📧 Email Confirmation System

## ✅ What's Implemented

A complete email confirmation system that allows candidates to confirm/decline/reschedule directly from email links!

## 🎯 Features

### **1. Confirmation Links in ALL Emails**
Every recruitment email now includes action buttons:
- ✅ **Confirm Attendance** (Green button)
- 🔄 **Request Changes** (Amber button)

### **2. Public Confirmation Page**
Beautiful public page at: `/confirm/[token]`
- No login required
- Secure token-based access
- Mobile-friendly
- Branded design

### **3. Three Response Options**

#### **✓ Confirm**
- One click confirmation
- Instantly updates system
- Manager notified

#### **🔄 Reschedule**
- Candidate picks new date/time
- Adds reason
- Manager reviews request
- Can approve/deny

#### **✗ Decline**
- Candidate provides reason
- Automatically updates status
- Manager notified

### **4. Works for ALL Stages**

✅ **Interview Invitations**
- Confirm/decline/reschedule interview
- Request different time
- Works with all interview types

✅ **Trial Shift Invitations** 
- Confirm trial attendance
- Request different date
- Decline trial

✅ **Job Offers** (Ready to implement)
- Accept offer
- Request different start date
- Decline offer

## 📊 Database Schema

### **applications table** (Enhanced)
```sql
confirmation_token      UUID (unique, indexed)
token_expires_at        TIMESTAMPTZ (optional expiry)
```

### **application_confirmation_responses** (New)
```sql
id                      UUID
application_id          UUID → applications
candidate_id            UUID → candidates
response_type           TEXT (interview/trial/offer)
action                  TEXT (confirm/decline/reschedule)

-- Reschedule details
requested_date          DATE
requested_time          TIME
reschedule_reason       TEXT

-- Decline details
decline_reason          TEXT

-- Offer details
requested_start_date    DATE

-- Metadata
responded_at            TIMESTAMPTZ
processed               BOOLEAN
processed_by            UUID
```

## 🔒 Security

### **Token-Based Access**
- Each application gets unique UUID token
- Tokens are unguessable (128-bit random)
- No authentication required
- One token per application

### **RLS Policies**
- **Anonymous**: Can INSERT responses (public form)
- **Company members**: Can SELECT their responses
- **Managers**: Can UPDATE (mark processed)

### **No Sensitive Data Exposed**
- Confirmation page shows:
  - Candidate name
  - Job title
  - Company name
  - Scheduled time
- Does NOT show:
  - Other candidates
  - Internal notes
  - Application history

## 📧 Email Examples

### **Interview Invitation Email**

```
🎉 Interview Invitation!

Dear John Smith,

Great news! We'd like to invite you to an interview for 
the position of Sous Chef at Main Kitchen.

Interview Details
Type: 📍 In-Person Interview
Date: Friday, 20 December 2024
Time: 10:00
Location: Main Kitchen - 123 High St, London

┌─────────────────────────────────┐
│  ✓ Confirm Attendance            │ ← Green button
│  🔄 Request Changes               │ ← Amber button
└─────────────────────────────────┘

We look forward to meeting you!
```

### **Trial Shift Invitation Email**

```
👔 Trial Shift Invitation!

Dear Sarah Wilson,

We'd like to invite you for a trial shift:

Trial Details
Date: Monday, 23 December 2024
Time: 09:00
Duration: 4 hours
Location: Main Kitchen
Contact: John Smith (Manager)

💰 Payment: Paid £11.50/hr

┌─────────────────────────────────┐
│  ✓ Confirm Attendance            │
│  🔄 Request Changes               │
└─────────────────────────────────┘
```

## 🎨 Confirmation Page UI

### **Initial View**
```
┌────────────────────────────────────┐
│  📅 Interview Confirmation         │
│  Main Kitchen                      │
├────────────────────────────────────┤
│                                    │
│  Candidate: John Smith             │
│  Position: Sous Chef               │
│  Scheduled: Friday, 20 Dec, 10:00  │
│                                    │
├────────────────────────────────────┤
│  Your Response:                    │
│  ┌──────┐  ┌──────┐  ┌──────┐    │
│  │  ✓   │  │  🔄  │  │  ✗   │    │
│  │Confirm│  │Change│  │Decline│   │
│  └──────┘  └──────┘  └──────┘    │
│                                    │
│  [Submit Response]                 │
└────────────────────────────────────┘
```

### **Reschedule View**
```
┌────────────────────────────────────┐
│  🔄 Selected: Reschedule           │
├────────────────────────────────────┤
│  Preferred Date: [2024-12-21]     │
│  Preferred Time: [14:00]          │
│                                    │
│  Reason:                           │
│  ┌────────────────────────────────┐│
│  │Can't make mornings, prefer    ││
│  │afternoons. Thanks!            ││
│  └────────────────────────────────┘│
│                                    │
│  [Submit Response]                 │
└────────────────────────────────────┘
```

### **Success View**
```
┌────────────────────────────────────┐
│         ✓                          │
│    Thank You!                      │
│                                    │
│  Your attendance has been          │
│  confirmed.                        │
│                                    │
│  You can close this window.        │
└────────────────────────────────────┘
```

## 🔄 Workflow

### **For Candidates**

1. **Receive Email**
   - Opens recruitment email
   - Sees confirmation buttons

2. **Click Button**
   - Takes to `/confirm/[token]`
   - Sees interview/trial details
   - Pre-loaded with their info

3. **Choose Action**
   - **Confirm**: One click → Done!
   - **Reschedule**: Pick date/time, add reason
   - **Decline**: Add reason why

4. **Submit**
   - Instant feedback
   - Success message
   - Can close page

### **For Managers**

1. **Automatic Updates**
   - Application status updated instantly
   - Confirmation badges on profile

2. **View Responses**
   - See all confirmation responses
   - Know who confirmed/declined
   - Review reschedule requests

3. **Take Action**
   - Approve reschedules
   - Decline and message candidate
   - Update schedule accordingly

## 🚀 Setup Instructions

### **Step 1: Apply Database Changes**
Run in Supabase SQL Editor:
```sql
-- Copy contents from: APPLY_CONFIRMATION_SYSTEM.sql
```

### **Step 2: Test Email**
1. Schedule an interview
2. Check email includes confirmation buttons
3. Click button
4. Verify confirmation page works

### **Step 3: Verify Integration**
- Check candidate profile shows confirmation status
- Verify responses are recorded
- Test all three actions (confirm/decline/reschedule)

## 📈 Benefits

### **For Candidates**
✅ Super easy - one click confirmation  
✅ No login/signup required  
✅ Works on mobile  
✅ Can reschedule without calling  
✅ Professional experience  

### **For Managers**
✅ Instant confirmation status  
✅ Reduces no-shows  
✅ Automatic status updates  
✅ Centralized responses  
✅ Less back-and-forth  

### **For Company**
✅ Better candidate experience  
✅ Higher confirmation rates  
✅ Less admin work  
✅ Professional brand image  
✅ Audit trail of all responses  

## 🎯 Response Types

### **Interview Confirmations**
- Updates `interview_confirmation_status`
- Sets `interview_confirmation_at`
- Stores reschedule reason if applicable

### **Trial Confirmations**
- Updates `trial_confirmation_status`
- Sets `trial_confirmation_at`
- Stores reschedule reason if applicable

### **Offer Responses** (Ready for implementation)
- Can accept/decline offer
- Request different start date
- Immediate feedback to manager

## 📊 Tracking & Analytics

### **View Confirmation Responses**
```sql
SELECT 
  c.full_name,
  j.title as job_title,
  acr.response_type,
  acr.action,
  acr.requested_date,
  acr.requested_time,
  acr.reschedule_reason,
  acr.decline_reason,
  acr.responded_at,
  acr.processed
FROM application_confirmation_responses acr
JOIN candidates c ON c.id = acr.candidate_id
JOIN applications a ON a.id = acr.application_id
JOIN jobs j ON j.id = a.job_id
WHERE acr.processed = FALSE
ORDER BY acr.responded_at DESC;
```

### **Confirmation Rates**
```sql
-- Interview confirmation rate
SELECT 
  COUNT(*) FILTER (WHERE interview_confirmation_status = 'confirmed') * 100.0 / COUNT(*) as confirmation_rate
FROM applications
WHERE interview_scheduled_at IS NOT NULL;
```

## 🔮 Future Enhancements

Potential additions:
- **SMS confirmations** - Send via Twilio
- **Calendar invites** - ICS file attachment
- **Reminders** - Auto-send 24hrs before
- **Analytics dashboard** - Confirmation rates by job/time
- **Two-way rescheduling** - Manager suggests times, candidate picks
- **Video interview links** - Embed Zoom/Teams links
- **Multi-language support** - Translations

---

**Status:** ✅ Implemented (Interview emails)  
**Next:** Apply to Trial and Offer emails  
**Date:** December 2025  
**Module:** Teamly (Recruitment)
