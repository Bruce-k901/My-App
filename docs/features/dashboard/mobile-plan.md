# Opsly Mobile Platform - Feature Plan & Design Vision

## Philosophy

> **"If you do it every day, it's on mobile. If you set it up once, it's on desktop."**

> **"The Invisible Ops Director"** - Opsly mobile should feel like having a competent colleague who knows what you need before you ask, gets out of your way when you're busy, catches things you might miss, and never wastes your time.

---

## Design System

### Colour Strategy

```css
/* Primary - Used for CTAs and active states */
--opsly-primary: #ff6b9d; /* Pink gradient start */
--opsly-primary-end: #ff8a65; /* Orange gradient end */

/* Module Accents */
--checkly-accent: #4caf50; /* Green - Compliance */
--stockly-accent: #2196f3; /* Blue - Inventory */
--teamly-accent: #9c27b0; /* Purple - People */
--planly-accent: #ff9800; /* Orange - Production */
--assetly-accent: #607d8b; /* Blue-grey - Assets */
--msgly-accent: #00bcd4; /* Cyan - Messages */

/* Dark Theme Base */
--bg-primary: #0d0d0f;
--bg-secondary: #1a1a1f;
--bg-elevated: #252530;
--text-primary: #ffffff;
--text-secondary: #9ca3af;
```

### Typography

```css
--font-heading: "DM Sans", system-ui, sans-serif;
--font-body: "Inter", system-ui, sans-serif;
--text-xs: 0.75rem; /* 12px - timestamps */
--text-sm: 0.875rem; /* 14px - secondary */
--text-base: 1rem; /* 16px - body */
--text-lg: 1.125rem; /* 18px - labels */
--text-xl: 1.25rem; /* 20px - headers */
--text-2xl: 1.5rem; /* 24px - titles */
```

### Mobile Design Rules

1. **Dark theme by default** - Kitchen/warehouse workers need varied lighting support
2. **High contrast for critical info** - Temperatures, alerts, countdowns
3. **Large touch targets** - Minimum 44x44px, ideally 48x48px
4. **Generous spacing** - Gloved fingers need room for error
5. **Status at a glance** - Green/amber/red visual language

---

## Navigation Structure

### Bottom Navigation (5 tabs)

| Tab      | Icon | Badge  | Purpose                    |
| -------- | ---- | ------ | -------------------------- |
| Home     | 🏠   | -      | Dashboard + Clock In/Out   |
| Tasks    | ✓    | Count  | Today's tasks + checklists |
| Messages | 💬   | Unread | Msgly                      |
| Rota     | 📅   | -      | Calendar + My Schedule     |
| More     | ≡    | -      | All other features         |

### Menu Structure (Flattened)

```
QUICK ACCESS (most used)
├── Clock In/Out
├── Today's Tasks
├── Daily Checklists
├── Record Incident
└── Temperature Logging

STOCKLY
├── Receive Delivery
├── Record Waste
├── Quick Count
├── View Stock Levels
└── Place Order

PLANLY
├── Today's Production
├── Delivery Schedule
└── Update Order Status

ASSETLY
├── Place Callout
├── View Assets
└── Service Schedule

MY STUFF
├── My Rota
├── Leave & Availability
├── Payslips
├── Training
└── Staff Cards
```

---

## Role-Based Home Screens

Different roles see different primary actions:

| Role                 | Primary Quick Actions                                   |
| -------------------- | ------------------------------------------------------- |
| **Kitchen Staff**    | Temp Logging, Daily Checklists, Production View, Tasks  |
| **Front of House**   | Tasks, Messages, Incidents, Clock In/Out                |
| **Managers**         | Callouts, Stock Alerts, Approve Requests, Team Messages |
| **Delivery Drivers** | Delivery Schedule, Order Status, Route, Clock In/Out    |
| **Warehouse**        | Receive Delivery, Quick Count, Stock Levels, Waste      |

---

## Feature Matrix by Module

### TEAMLY (People & HR)

#### Mobile View

| Feature               | Priority   | Description                             |
| --------------------- | ---------- | --------------------------------------- |
| Clock In/Out          | **HIGH**   | Tap to clock with location verification |
| View My Rota          | **HIGH**   | See personal schedule/shifts            |
| View Staff Cards      | **HIGH**   | Quick access to team contact info       |
| Request Leave         | **MEDIUM** | Submit leave requests                   |
| View Leave Balance    | **MEDIUM** | Check remaining leave days              |
| View Payslips         | **MEDIUM** | Access personal payslips                |
| My Availability       | **MEDIUM** | Submit availability for scheduling      |
| View Training Records | LOW        | See certifications & expiry dates       |

#### Desktop Only

- Employee Management (add/edit/archive)
- Attendance Admin & Reports
- Leave Approval workflow
- Schedule/Rota Creation
- Payroll Management & Rates
- Training Matrix Management
- Recruitment & Onboarding
- Performance Reviews & Goals
- Shift Rules Configuration
- HR Reports & Analytics

---

### STOCKLY (Inventory)

#### Mobile View

| Feature                  | Priority   | Description                        |
| ------------------------ | ---------- | ---------------------------------- |
| Receive Stock Deliveries | **HIGH**   | Scan/log incoming stock with photo |
| Quick Stock Count        | **HIGH**   | Spot check inventory levels        |
| Record Waste             | **HIGH**   | Log wastage/spoilage with photo    |
| View Stock Levels        | **MEDIUM** | Check current stock                |
| View Low Stock Alerts    | **MEDIUM** | See items needing reorder          |
| Place Stock Orders       | **MEDIUM** | Submit purchase orders             |
| View Today's Deliveries  | **MEDIUM** | See expected deliveries            |
| Staff Purchase           | LOW        | Process staff purchases            |
| View Pending Orders      | LOW        | Check order status                 |

#### Desktop Only

- Stock Item Setup (SKUs, pricing)
- Supplier Management
- Recipe Creation
- Ingredient Libraries
- Storage Area Setup
- Purchase Order Templates
- Credit Note Management
- Full Stocktake Planning
- Production Planning
- GP Reports & Analytics

---

### PLANLY (Orders & Production)

#### Mobile View

| Feature                | Priority   | Description                         |
| ---------------------- | ---------- | ----------------------------------- |
| View Daily Production  | **HIGH**   | See today's production requirements |
| View Delivery Schedule | **HIGH**   | Check today's deliveries            |
| Update Order Status    | **MEDIUM** | Mark orders packed/dispatched       |
| View Order Details     | **MEDIUM** | Check individual order info         |
| Tray Packing Updates   | **MEDIUM** | Update packing progress             |
| View Customer Info     | LOW        | Quick customer lookup               |

#### Desktop Only

- Order Creation
- Customer Management & Bulk Upload
- Product Catalog
- Pricing Management
- Production Planning/Worksheets
- Delivery Note Generation
- Bake Group Setup
- Cutoff Rules
- Destination Groups
- Process Templates
- Monthly Sales Reports

---

### ASSETLY (Equipment)

#### Mobile View

| Feature                  | Priority   | Description                        |
| ------------------------ | ---------- | ---------------------------------- |
| Place Callouts           | **HIGH**   | Report equipment issues with photo |
| View Asset Info          | **HIGH**   | Look up equipment details, manuals |
| View Service Schedule    | **MEDIUM** | See upcoming maintenance           |
| Log Temperature Readings | **MEDIUM** | Record temp checks                 |
| View Contractor Info     | **MEDIUM** | Get contractor contact details     |
| Update Asset Status      | LOW        | Mark equipment in/out of service   |

#### Desktop Only

- Asset Registry Setup
- Contractor Management
- PPM Schedule Setup
- Warranty Tracking Admin
- Service History Reports
- Asset Categories Setup
- Callout Log Reports
- Archive Assets

---

### COMPLIANCE & SAFETY

#### Mobile View

| Feature                   | Priority   | Description                                     |
| ------------------------- | ---------- | ----------------------------------------------- |
| Complete Daily Checklists | **HIGH**   | Fill in operational checklists                  |
| Temperature Logging       | **HIGH**   | Record fridge/freezer temps (legal requirement) |
| Record Incidents          | **HIGH**   | Log complaints, incidents with photos           |
| View SOPs                 | **MEDIUM** | Reference safe operating procedures             |
| View COSHH Data           | **MEDIUM** | Access chemical safety info                     |
| View Risk Assessments     | LOW        | Reference safety documents                      |

#### Desktop Only

- Checklist Template Creation
- Risk Assessment Creation
- SOP Management
- COSHH Setup
- EHO Report Generation
- Incident Analysis
- Compliance Dashboard

---

### TASKS & CALENDAR

#### Mobile View

| Feature             | Priority   | Description                  |
| ------------------- | ---------- | ---------------------------- |
| View Today's Tasks  | **HIGH**   | See assigned tasks for today |
| Complete Tasks      | **HIGH**   | Mark tasks done, add notes   |
| View Daily Calendar | **HIGH**   | See today's schedule/events  |
| Task Notifications  | **MEDIUM** | Receive task reminders       |
| View My Tasks       | **MEDIUM** | Personal task list           |

#### Desktop Only

- Task Creation & Assignment
- Task Templates
- Calendar Event Creation
- Task Analytics

---

### MSGLY (Messaging)

#### Mobile View

| Feature               | Priority   | Description                         |
| --------------------- | ---------- | ----------------------------------- |
| View Messages         | **HIGH**   | Read team messages                  |
| Send Messages         | **HIGH**   | Reply to conversations              |
| Message Notifications | **HIGH**   | Push notifications for new messages |
| View Unread Count     | **MEDIUM** | Badge showing unread messages       |

#### Desktop Only

- Message Administration
- Broadcast Messages
- Message Search & Export

---

## Enhanced Features to Add

### Photo Capture Integration

- Delivery discrepancies → attach to delivery record
- Equipment issues → attach to callout
- Incidents → attach to incident report
- Waste logging → attach to waste record

### Offline Mode (Critical)

Core functions that must work offline:

- Clock in/out (sync when connected)
- Temperature logging
- Daily checklists
- Task completion
- Incident recording

### Voice Notes

- Quick incident recording when hands are busy/dirty
- Attach to any record type

---

## Implementation Phases

### Phase 1 - Foundation (Beta Must-Have)

**Infrastructure:**

- [ ] Bottom navigation (5 tabs)
- [ ] Responsive mobile layout system
- [ ] PWA manifest & service worker
- [ ] Role-based home screen logic
- [ ] Push notification setup

**Essential Features:**

- [ ] Clock in/out with location
- [ ] View my rota/schedule
- [ ] Daily task list with completion
- [ ] Daily checklists (compliance)
- [ ] Messages (Msgly)
- [ ] Temperature logging
- [ ] Basic incident reporting

### Phase 2 - Operational Depth

**Stock Operations:**

- [ ] Receive delivery (quick mode + photo)
- [ ] Record waste
- [ ] Quick stock count
- [ ] View stock levels + alerts

**Asset & Maintenance:**

- [ ] Place callout with photo
- [ ] View asset info
- [ ] Service schedule

### Phase 3 - Enhancement

**User Features:**

- [ ] Leave requests
- [ ] Availability submission
- [ ] View payslips
- [ ] Staff directory/cards

**Advanced:**

- [ ] Offline mode for core functions
- [ ] Voice notes for incidents
- [ ] Quick photo capture throughout

### Phase 4 - Polish

- [ ] Full haptic feedback system
- [ ] Polished animations & transitions
- [ ] Dark/light mode toggle
- [ ] Gesture shortcuts (swipe actions)

---

## PWA Configuration

### manifest.json

```json
{
  "name": "Opsly",
  "short_name": "Opsly",
  "theme_color": "#0D0D0F",
  "background_color": "#0D0D0F",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/mobile",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192" },
    { "src": "/icons/icon-512.png", "sizes": "512x512" }
  ]
}
```

### Critical CSS

```css
/* Handle notches and home indicators */
padding-bottom: env(safe-area-inset-bottom);
padding-top: env(safe-area-inset-top);

/* Prevent pull-to-refresh where inappropriate */
body {
  overscroll-behavior-y: contain;
}

/* Touch behaviour */
touch-action: manipulation;
-webkit-tap-highlight-color: transparent;
```

---

## Haptic Feedback Patterns

| Action             | iOS                 | Android       |
| ------------------ | ------------------- | ------------- |
| Clock in/out       | notificationSuccess | CONFIRM       |
| Task complete      | impactLight         | CLOCK_TICK    |
| Error              | notificationError   | REJECT        |
| Pull to refresh    | selectionChanged    | CONTEXT_CLICK |
| Destructive action | notificationWarning | LONG_PRESS    |

---

## Animation Timings

```css
--duration-instant: 100ms; /* Quick feedback */
--duration-fast: 200ms; /* Interactive elements */
--duration-normal: 300ms; /* Screen transitions */
--duration-slow: 500ms; /* Emphasis animations */

--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

---

## Success Metrics

| Metric                     | Target        | Why            |
| -------------------------- | ------------- | -------------- |
| Daily active users         | >80% of staff | Adoption       |
| Time to clock in           | <5 seconds    | Efficiency     |
| Checklist completion rate  | >95%          | Compliance     |
| Avg session length         | 2-4 minutes   | Right depth    |
| Task completion via mobile | >70%          | Mobile utility |
| App crashes                | <0.1%         | Stability      |
| Time to first interaction  | <3 seconds    | Performance    |

---

## Summary

### Mobile: ~35 features

- Daily operations done repeatedly
- View/reference information
- Simple data entry (counts, temps, incidents)
- Personal information (rota, leave, payslips)

### Desktop: ~60+ features

- All setup and configuration
- Master data creation
- Complex reporting and analytics
- Bulk operations and administration
- User/role management
- Billing and system settings

---

## Files Created

- **Prototype Component:** `src/components/mobile/MobileHomePrototype.tsx`
- **This Plan:** `docs/MOBILE_FEATURE_PLAN.md`
