# ✅ Trial Shifts on Rota - Complete

## 🎯 How Trial Shifts Work

Trial shifts are **already being created** on the rota when you progress a candidate to trial!

## 📍 Where to Find Them

### **Location:** People → Schedule (Rota)

1. Go to `dashboard/people/schedule`
2. Navigate to the week of the trial
3. Look for the specific day you scheduled the trial

## 🎨 How to Identify Trial Shifts

Trial shifts appear as **PINK shifts** with special markers:

### **Visual Indicators:**
- ✅ **Pink color** (`#EC4899`) - stands out from regular shifts
- ✅ **Unassigned** - shows as `profile_id: null` (no staff assigned)
- ✅ **"🎯 TRIAL SHIFT" in notes**

### **Shift Details Include:**
```
🎯 TRIAL SHIFT - [Candidate Name]
Candidate for: [Job Title]
Contact: [Manager Name]
Location: [Site Name]
Payment: [Unpaid/Paid/Paid if hired]
```

## 🔍 Example:

**What you'll see on the rota:**

```
Friday, 20 Dec 2025
─────────────────────────────
┌─────────────────────────┐
│ 10:00 - 14:00          │
│ [PINK]                  │
│ Unassigned              │
│ Role: Chef              │
│ 🎯 TRIAL SHIFT          │
│                         │
│ Sarah Johnson           │
│ Candidate for: Chef     │
│ Contact: John Smith     │
└─────────────────────────┘
```

## 💡 Key Features

### **1. Automatically Created**
When you progress a candidate to trial:
- ✅ Rota is created/found for that week
- ✅ Shift is added with trial details
- ✅ Appears immediately on schedule

### **2. Includes All Details**
- Candidate name
- Job they're applying for
- Who they're meeting
- Location
- Payment terms

### **3. Color-Coded**
- **Pink (#EC4899)** - instantly recognizable as trial
- Different from regular shifts
- Stands out in the schedule

## 🚀 How to Use

### **Schedule a Trial:**
1. Go to candidate profile
2. Click "Progress to Trial"
3. Fill in:
   - Date & Time
   - Location (select site from dropdown)
   - Contact person (select from site staff)
   - Duration
   - Payment terms
4. Check "Add to rota" (checked by default)
5. Submit

### **View on Rota:**
1. Navigate to the week of the trial
2. Look for the pink shift on the scheduled day
3. Click the shift to see full details in notes

### **After Confirmation:**
When candidate confirms:
- Trial shift remains on rota
- Status stays as scheduled
- You can see candidate's confirmation on their profile

## 📊 Rota Integration Details

### **Database:**
- Table: `rota_shifts`
- Link: `applications.trial_rota_shift_id`

### **Shift Data:**
```typescript
{
  rota_id: string,
  company_id: string,
  profile_id: null,  // Unassigned (candidate not employee yet)
  shift_date: '2025-12-20',
  start_time: '10:00',
  end_time: '14:00',
  break_minutes: 0,
  role_required: 'Chef',
  status: 'scheduled',
  color: '#EC4899',  // PINK
  notes: '🎯 TRIAL SHIFT - Sarah Johnson\n...'
}
```

## 🎯 What Makes It Work

### **1. Week Calculation:**
```typescript
// Calculate Monday of the trial week
const dayOfWeek = trialDateObj.getDay()
const daysToMonday = (dayOfWeek + 6) % 7
const weekStarting = new Date(trialDateObj)
weekStarting.setDate(trialDateObj.getDate() - daysToMonday)
```

### **2. Rota Creation/Lookup:**
- Checks if rota exists for that week + site
- Creates new rota if needed
- Uses existing rota if available

### **3. Shift Insertion:**
- Adds shift to `rota_shifts` table
- Links back to application via `trial_rota_shift_id`
- Immediately visible on schedule

## ✅ Status

**Complete:** Trial shifts are automatically added to the rota!

**How to Test:**
1. Progress a candidate to trial
2. Navigate to Schedule page
3. Go to the week you scheduled
4. Look for the pink shift on that day

**Result:** Trial shift appears immediately on the rota! 🎉

---

**Created:** December 2025  
**Module:** Teamly (Recruitment) + Schedule  
**Integration:** Complete and working
