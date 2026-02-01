# 💰📅 Trial Payment Terms & Rota Integration

## ✅ What's New

Two major enhancements to the trial shift system:
1. **Payment Agreement** - Define whether trials are paid/unpaid/conditional
2. **Rota Integration** - Automatically add trial shifts to the manager's rota

## 🎯 Features Added

### **1. Payment Terms Options**

When scheduling a trial (via post-interview assessment), you can now select:

#### **Option 1: Unpaid Trial** 🔵
- No payment for trial shift hours
- Common for short trials (2-3 hours)
- Legally allowed in UK for genuine trial assessment

#### **Option 2: Paid Trial** 🟢
- Candidate paid at specified hourly rate
- You enter the rate (e.g., £11.50/hour)
- Payment guaranteed regardless of outcome
- Best practice for longer trials (4+ hours)

#### **Option 3: Paid if Hired** 🟣
- Payment only if candidate is successfully hired
- Conditional payment arrangement
- Good middle ground option

### **2. Rota Integration**

When you check **"Add trial shift to rota"**, the system:

✅ Creates a rota shift entry for the trial date/time  
✅ Shows candidate's name in the notes  
✅ Uses **pink color** (#EC4899) to stand out  
✅ Marks as "unassigned" (candidate not yet employee)  
✅ Includes full trial details in notes  
✅ Appears on the manager's rota schedule  

### **3. Database Schema**

#### **New Columns in `applications` table:**

```sql
trial_payment_terms      -- 'unpaid' | 'paid' | 'paid_if_hired'
trial_payment_rate       -- Decimal (hourly rate if paid)
trial_payment_notes      -- Text (additional payment details)
trial_rota_shift_id      -- UUID (link to created rota shift)
```

## 📋 How to Use

### **Step 1: Complete Interview Assessment**
1. Go to candidate profile
2. Click "✍️ Complete Interview"
3. Choose "Progress to Trial"
4. Fill in interview notes and rating

### **Step 2: Schedule Trial Details**
Fill in the standard trial info:
- Date, time, duration
- Site location
- Contact person
- What to bring
- Additional information

### **Step 3: Set Payment Terms** 💰

Select payment arrangement:

**For Unpaid Trial:**
```
● Unpaid Trial
○ Paid Trial
○ Paid if Hired
```

**For Paid Trial:**
```
○ Unpaid Trial
● Paid Trial
○ Paid if Hired

Hourly Rate (£): 11.50
Payment Notes: [Optional details]
```

**For Conditional Payment:**
```
○ Unpaid Trial
○ Paid Trial
● Paid if Hired

Payment Notes: Payment processed after successful onboarding
```

### **Step 4: Add to Rota (Optional)**

Check the box:
```
☑ Add trial shift to rota
  Creates a rota entry so managers can see the trial on the schedule
```

### **Step 5: Submit**

Click **"Submit"** and the system:
1. ✅ Saves interview assessment
2. ✅ Schedules trial with payment terms
3. ✅ Creates rota shift (if checked)
4. ✅ Sends email with payment details
5. ✅ Sets confirmation tracking

## 🎨 Rota Display

### **How Trial Shifts Appear on Rota:**

```
┌─────────────────────────────────────┐
│ 🎯 TRIAL SHIFT - Sarah Johnson     │ PINK
│ Friday, 10:00 - 14:00               │
│                                     │
│ Candidate for: Sous Chef           │
│ Contact: John Smith                │
│ Location: Main Kitchen             │
│ Payment: Paid £11.50/hr            │
└─────────────────────────────────────┘
```

### **Visual Indicators:**
- **Pink color** (#EC4899) - Easy to spot trial shifts
- **🎯 Icon** - Clear trial indicator
- **Unassigned** - Not linked to employee profile yet
- **Full details** - All info in shift notes

## 📧 Email Content

The trial invitation email now includes payment terms:

```
Dear Sarah,

Great news! We'd like to invite you for a trial shift:

📅 Date: Friday, 20 Dec 2025
⏰ Time: 10:00
⏱️ Duration: 4 hours

📍 Location:
Main Kitchen
123 High Street, London

👤 On Arrival:
You will meet John Smith

📋 What to Bring:
Black chef jacket, knives, ID

💰 Payment Terms:
This trial shift is paid at £11.50 per hour.

ℹ️ Additional Information:
Park in staff lot at rear. Use kitchen entrance.

Please confirm your attendance by replying to this email.
```

## 💡 Use Cases & Best Practices

### **When to Use Each Payment Option:**

#### **Unpaid Trial** 🔵
**Best for:**
- Short trials (1-2 hours)
- Quick skill assessments
- Observational trials
- Initial screening

**Legal Note:** In the UK, unpaid trials must be:
- Short in duration
- For genuine assessment purposes
- Not providing value to the business

#### **Paid Trial** 🟢
**Best for:**
- Full shift trials (4+ hours)
- Working during service
- Candidate doing actual work
- Professional/skilled positions

**Benefits:**
- Legal compliance
- Attracts quality candidates
- Professional image
- Fair treatment

#### **Paid if Hired** 🟣
**Best for:**
- Medium-length trials (3-4 hours)
- When budget is tight
- Incentive for success
- Mutual commitment

**Consider:**
- Make terms clear upfront
- May deter some candidates
- Ensure legally compliant

### **Rota Integration Benefits:**

#### **For Site Managers:**
✅ See upcoming trials at a glance  
✅ Remember who's coming and when  
✅ Plan around trial shifts  
✅ Prepare staff to welcome candidate  

#### **For Operations:**
✅ Avoid scheduling conflicts  
✅ Ensure adequate supervision  
✅ Track trial shift usage  
✅ Integration with existing schedules  

## 🔧 Technical Implementation

### **Rota Shift Creation Logic:**

When "Add to rota" is checked:

1. **Find or Create Rota**
   - Looks for existing rota for site/week
   - Creates new rota if none exists
   - Uses trial date as week reference

2. **Create Shift Entry**
   ```javascript
   {
     rota_id: [matched_or_new_rota],
     company_id: [company],
     profile_id: null,  // Unassigned
     shift_date: [trial_date],
     start_time: [trial_time],
     end_time: [calculated_from_duration],
     role_required: [job_title],
     status: 'scheduled',
     color: '#EC4899',  // Pink
     notes: '🎯 TRIAL SHIFT - [candidate_name]...',
     hourly_rate: [if_paid]
   }
   ```

3. **Link to Application**
   - Saves `trial_rota_shift_id` in applications table
   - Allows tracking and updates

### **Payment Terms Storage:**

```javascript
trial_payment_terms: 'paid',      // enum
trial_payment_rate: 11.50,        // decimal
trial_payment_notes: 'Paid via payroll on next cycle'
```

### **Email Integration:**

Payment info automatically added to trial invitation email:

```javascript
let paymentInfo = ''
if (terms === 'unpaid') {
  paymentInfo = 'This is an unpaid trial shift.'
} else if (terms === 'paid') {
  paymentInfo = `Paid at £${rate}/hr`
} else {
  paymentInfo = 'Paid if successfully hired'
}
```

## 📊 Example Scenarios

### **Scenario 1: Restaurant Server Trial**

**Setup:**
- Position: Server
- Duration: 3 hours (lunch service)
- Payment: Paid £10.50/hr
- Add to rota: ✓ Yes

**Result:**
- Trial shift appears on Saturday rota
- Manager sees "🎯 TRIAL SHIFT - Emma Wilson"
- Pink color makes it stand out
- Email confirms £10.50/hr payment
- Candidate knows they'll be paid

### **Scenario 2: Chef Trial Shift**

**Setup:**
- Position: Sous Chef
- Duration: 4 hours
- Payment: Paid if hired (£13/hr)
- Add to rota: ✓ Yes

**Result:**
- Full shift block on Friday rota
- Notes show candidate details
- Email explains conditional payment
- Manager prepared for trial
- Clear expectations set

### **Scenario 3: Quick Assessment**

**Setup:**
- Position: Barista
- Duration: 2 hours
- Payment: Unpaid
- Add to rota: ✗ No

**Result:**
- No rota entry created
- Manager informed via other means
- Email confirms unpaid terms
- Short assessment only

## ⚖️ Legal Considerations

### **UK Employment Law:**

#### **Unpaid Trials:**
- Must be reasonable length
- Should not exceed work shadowing
- Cannot replace regular staff
- Must be for assessment only
- Typically 1-2 hours maximum

#### **Paid Trials:**
- Required if candidate does actual work
- Must pay at least National Minimum Wage
- Subject to employment tax rules
- Safer legal position

#### **Paid if Hired:**
- Ensure contract is clear
- Payment terms in writing
- Consider tax implications
- Get legal advice

**Recommendation:** When in doubt, pay for trials. It's safer legally and shows good faith.

## 🚀 Setup Instructions

### **Step 1: Apply Database Migration**

Run in Supabase SQL Editor:
```sql
-- Copy contents from: APPLY_TRIAL_PAYMENT_AND_ROTA.sql
```

### **Step 2: Test the Feature**

1. Go to a candidate in interview stage
2. Complete interview assessment
3. Progress to trial
4. Fill in all trial details
5. Select payment terms
6. Check "Add to rota"
7. Submit
8. Check the rota page - trial shift should appear!

### **Step 3: Verify Email**

Check the trial invitation email includes:
- Payment terms clearly stated
- Hourly rate (if applicable)
- Payment notes (if added)

## 📈 Benefits Summary

| Benefit | Impact |
|---------|--------|
| **Legal Compliance** | Clear payment terms avoid legal issues |
| **Candidate Experience** | Transparency builds trust |
| **Manager Awareness** | Rota integration prevents surprises |
| **Operational Planning** | Trials visible in schedule |
| **Professionalism** | Shows organized, fair process |
| **Flexibility** | Three payment options for different scenarios |

## ✨ Future Enhancements

Potential additions:
- Track total trial costs (analytics)
- Auto-calculate trial payment
- Integration with payroll system
- Trial shift completion checklist
- Convert trial to scheduled shift if hired
- Analytics on paid vs unpaid success rates
- Regional minimum wage validation

---

**Status:** ✅ Ready to Use  
**Created:** December 2025  
**Module:** Teamly (Recruitment)  
**Integration:** Rota Management System
