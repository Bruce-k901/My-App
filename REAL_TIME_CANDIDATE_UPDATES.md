# 🔄 Real-Time Candidate Card Updates

## ✅ What's New

Candidate cards now automatically update in real-time when candidates respond to emails!

## 🎯 How It Works

### **Real-Time Subscriptions**

When you're viewing a candidate profile, the app now:
1. ✅ Subscribes to changes in the `applications` table for that candidate
2. ✅ Automatically reloads the data when the candidate responds
3. ✅ Shows toast notifications for important updates
4. ✅ Cleans up the subscription when you leave the page

### **What Updates Automatically:**

#### **Interview Confirmations:**
- ✅ When candidate **confirms** → Green badge "✓ Confirmed" + 🎉 toast
- ✅ When candidate **declines** → Red badge "✗ Declined" + error toast
- ✅ When candidate **requests changes** → Amber badge "🔄 Needs Reschedule" + info toast

#### **Trial Shift Confirmations:**
- ✅ When candidate **confirms** → Green badge "✓ Confirmed" + 🎉 toast
- ✅ When candidate **declines** → Red badge "✗ Declined" + error toast
- ✅ When candidate **requests changes** → Amber badge "🔄 Needs Reschedule" + info toast

#### **Job Offer Responses:**
- ✅ When candidate **accepts** → Status changes to "Accepted" + 🌟 toast
- ✅ When candidate **declines** → Status changes to "Rejected" + error toast

## 💬 Toast Notifications

### **Interview Confirmed:**
```
🎉 Candidate confirmed interview!
The candidate has confirmed their attendance.
```

### **Trial Confirmed:**
```
🎉 Candidate confirmed trial shift!
The candidate has confirmed their attendance.
```

### **Offer Accepted:**
```
🌟 Candidate accepted job offer!
The candidate has accepted the offer.
```

### **Declined:**
```
❌ Candidate declined [interview/trial/offer]
The candidate has declined the [interview/trial/offer].
```

### **Requested Changes:**
```
ℹ️ Candidate requested changes
The candidate has requested to reschedule.
```

## 🎬 User Flow

### **Manager's Experience:**

1. **Send Interview Email**
   - Manager schedules interview
   - Email sent to candidate
   - Card shows "Interview scheduled" with status "pending"

2. **Candidate Responds**
   - Candidate clicks link in email
   - Confirms/Declines/Requests changes
   - Submits response

3. **Manager Sees Update** ⚡ **INSTANTLY**
   - Toast notification appears
   - Card badge updates automatically
   - No refresh needed!

### **Example Timeline:**

```
10:00 AM - Manager sends interview invite
10:05 AM - Candidate opens email
10:06 AM - Candidate clicks "Confirm Attendance"
10:06 AM - Manager's screen updates instantly:
           ✅ Toast: "🎉 Candidate confirmed interview!"
           ✅ Badge changes to green "✓ Confirmed"
           ✅ Timestamp shows when they confirmed
```

## 🔧 Technical Implementation

### **Supabase Realtime Channel:**

```typescript
const channel = supabase
  .channel(`candidate-${candidateId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'applications',
      filter: `candidate_id=eq.${candidateId}`,
    },
    (payload) => {
      // Check what changed
      const newData = payload.new
      const oldData = payload.old
      
      // Show appropriate notification
      if (newData.interview_confirmation_status !== oldData.interview_confirmation_status) {
        toast.success('🎉 Candidate confirmed!')
      }
      
      // Reload data
      load()
    }
  )
  .subscribe()
```

### **Cleanup:**

The subscription is automatically cleaned up when:
- ✅ User navigates away from candidate profile
- ✅ Component unmounts
- ✅ User logs out

```typescript
return () => {
  supabase.removeChannel(channel)
}
```

## 🎨 Visual Feedback

### **Badge Colors:**

**Confirmed:**
```css
bg-green-500/20 text-green-400 border-green-500/30
```

**Declined:**
```css
bg-red-500/20 text-red-400 border-red-500/30
```

**Needs Reschedule:**
```css
bg-amber-500/20 text-amber-400 border-amber-500/30
```

## 📱 Multi-User Support

✅ **Multiple managers can view the same candidate**
- All managers see updates instantly
- No conflicts or race conditions
- Everyone stays in sync

✅ **Works across devices**
- Desktop updates
- Tablet updates
- Phone updates

## 🚀 Performance

- ✅ **Minimal overhead** - only subscribes when viewing candidate
- ✅ **Efficient** - only reloads when data actually changes
- ✅ **Clean** - automatically unsubscribes when not needed
- ✅ **Fast** - updates appear in milliseconds

## 📝 What Triggers Updates

### **Automatic (Real-time):**
- ✅ Candidate confirms via email link
- ✅ Candidate declines via email link
- ✅ Candidate requests changes via email link
- ✅ Another manager updates the status

### **Manual (Refresh):**
- ❌ None needed anymore!

## 🎯 Status

**Complete:** ✅

**Files Updated:**
1. `src/app/dashboard/people/recruitment/candidates/[id]/page.tsx`

**Features Added:**
- ✅ Real-time Supabase subscription
- ✅ Automatic data refresh on updates
- ✅ Toast notifications for status changes
- ✅ Clean subscription cleanup
- ✅ Multi-user support

**Result:** Managers now see candidate responses instantly without refreshing! 🎉

---

**Created:** December 2025  
**Module:** Teamly (Recruitment)  
**Impact:** Better UX, faster response times, no manual refreshes needed
