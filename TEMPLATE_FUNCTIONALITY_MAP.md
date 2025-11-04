# Temperature Check Template - Full Functionality Map

## Overview

This document maps the complete functionality, UI/UX patterns, and data flow of the `TemperatureCheckTemplate` component to serve as a reference for implementing other compliance templates.

---

## Component Structure

### File Location

`src/components/compliance/TemperatureCheckTemplate.tsx`

### Component Signature

```typescript
interface TemperatureCheckTemplateProps {
  editTemplateId?: string;
  onSave?: () => void;
}

export function TemperatureCheckTemplate({
  editTemplateId,
  onSave,
}: TemperatureCheckTemplateProps = {});
```

---

## UI/UX Patterns

### 1. Card Layout Pattern

**Container:**

```tsx
<div className="rounded-xl border border-magenta-500 bg-[#141823]">
```

- Border color: `magenta-500` (theme-specific)
- Background: `bg-[#141823]` (dark theme)
- Rounded corners: `rounded-xl`

**Card Header (Collapsed State):**

```tsx
<div className="p-4 cursor-pointer hover:bg-[#1a1f2e] transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
```

- Clickable entire header
- Hover effect: darker background
- Smooth transitions

**Expanded Content:**

```tsx
<div className="border-t border-neutral-800 p-6 bg-[#0f1220]">
```

- Darker background than header (`bg-[#0f1220]` vs `bg-[#141823]`)
- Top border separator
- Padding: `p-6`

### 2. Icon + Badge Pattern

**Icon Container:**

```tsx
<div className="p-2 rounded-lg bg-magenta-500/10 border border-magenta-500/20">
  <Thermometer className="w-5 h-5 text-magenta-400" />
</div>
```

- Icon: `Thermometer` from lucide-react
- Background: 10% opacity theme color
- Border: 20% opacity theme color
- Icon color: theme color (`magenta-400`)

**Status Badge:**

```tsx
<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
  Draft
</span>
```

- Full rounded (`rounded-full`)
- Color-coded (yellow for draft)
- Small text (`text-xs`)

### 3. Metadata Grid Pattern

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
  <div>
    <span className="text-slate-500">Label:</span>
    <p className="text-slate-200 font-medium">Value</p>
  </div>
</div>
```

- Responsive grid: 2 columns mobile, 4 columns desktop
- Label: `text-slate-500` (muted)
- Value: `text-slate-200 font-medium` (bright, bold)

### 4. Expand/Collapse Button

```tsx
<button
  onClick={(e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }}
  className="p-2 rounded-lg hover:bg-magenta-500/10 text-magenta-400 transition-colors"
>
  <Edit2 className="w-4 h-4" />
</button>
```

- `stopPropagation()` to prevent parent click
- Hover effect with theme color
- Icon: `Edit2` from lucide-react

---

## Form Components

### 1. Equipment Selection (Repeatable Rows)

**Container:**

```tsx
<div className="space-y-3 max-h-64 overflow-y-auto">
```

**Row Structure:**

```tsx
<div className="flex items-center gap-3 p-3 rounded-lg border border-neutral-800 bg-[#141823]">
```

**Equipment Dropdown:**

```tsx
<select className="flex-1 px-3 py-2 text-sm rounded-lg bg-[#0f1220] border border-neutral-800 text-slate-200">
  <option value="">Select equipment...</option>
  {assets.map((asset) => (
    <option key={asset.id} value={asset.id}>
      {asset.name}
    </option>
  ))}
</select>
```

**Nickname Input:**

```tsx
<input
  type="text"
  placeholder="Nickname (e.g., Fridge 1, ABC)"
  className="flex-1 px-3 py-2 text-sm rounded-lg bg-[#0f1220] border border-neutral-800 text-slate-200 placeholder:text-slate-500"
/>
```

**Add Row Button:**

```tsx
<button className="text-sm px-3 py-1 rounded-lg border border-magenta-500 text-magenta-400 hover:bg-magenta-500/10 transition-colors">
  + Add Equipment
</button>
```

**Delete Row Button:**

```tsx
<button className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
  <X className="w-4 h-4" />
</button>
```

- Only shown if `equipmentRows.length > 1`
- Red theme for destructive action

### 2. Day Parts Selection (Toggle Buttons)

```tsx
<div className="grid grid-cols-3 gap-3">
  {dayParts.map((part) => (
    <button
      type="button"
      onClick={() => toggleDayPart(part.id)}
      className={`px-4 py-3 rounded-lg border text-center transition-all ${
        selectedDayParts.includes(part.id)
          ? "border-magenta-500 bg-magenta-500/10 text-magenta-400"
          : "border-neutral-800 bg-[#141823] text-slate-400 hover:border-neutral-700"
      }`}
    >
      <div className="text-sm font-medium">{part.label}</div>
    </button>
  ))}
</div>
```

- 3-column grid
- Selected: theme color border + background
- Unselected: muted with hover effect

### 3. Time Inputs (Dynamic)

```tsx
<div className="grid grid-cols-3 gap-3">
  {selectedDayParts.map((dayPart, index) => (
    <div key={dayPart}>
      <label className="block text-xs text-slate-400 mb-1 capitalize">{dayPart}</label>
      <input
        type="time"
        value={times[index] || "09:00"}
        onChange={(e) => updateTime(index, e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg bg-[#141823] border border-neutral-800 text-slate-200"
      />
    </div>
  ))}
</div>
```

- Only shows inputs for selected day parts
- Dynamic grid based on selection
- Capitalized labels

### 4. Action Buttons

```tsx
<div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
  <button className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] hover:border-white/[0.25] backdrop-blur-md transition-all duration-150">
    Save
  </button>
  <button className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] hover:border-white/[0.25] backdrop-blur-md transition-all duration-150">
    Save & Deploy
  </button>
</div>
```

- Right-aligned
- Border-top separator
- Glassmorphism effect (`backdrop-blur-md`)
- White/transparent theme for buttons

---

## State Management

### State Variables

```typescript
const [isExpanded, setIsExpanded] = useState(false);
const [assets, setAssets] = useState<Asset[]>([]);
const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>([
  { id: crypto.randomUUID(), assetId: "", nickname: "" },
]);
const [selectedDayParts, setSelectedDayParts] = useState<string[]>([
  "morning",
  "afternoon",
  "evening",
]);
const [times, setTimes] = useState<string[]>(["09:00", "14:00", "20:00"]);
const [status, setStatus] = useState<"draft">("draft");
const [editingTemplateId, setEditingTemplateId] = useState<string | undefined>(editTemplateId);
const [loading, setLoading] = useState(false);
```

### Equipment Row Interface

```typescript
interface EquipmentRow {
  id: string; // UUID for React key
  assetId: string; // Selected asset UUID
  nickname: string; // User-friendly name
}
```

---

## Data Flow

### 1. Initialization

**Load Assets:**

```typescript
useEffect(() => {
  if (profile?.company_id) {
    loadAssets();
    if (editTemplateId) {
      loadDraftData(editTemplateId);
    }
  }
}, [profile?.company_id, profile?.site_id, editTemplateId]);
```

**Asset Query:**

```typescript
let query = supabase
  .from("assets")
  .select("id, name, category, site_id, company_id, status")
  .eq("status", "active")
  .eq("company_id", profile.company_id)
  .eq("archived", false)
  .order("name");

if (profile.site_id) {
  query = query.eq("site_id", profile.site_id);
}
```

### 2. Save as Draft Flow

**Function:** `handleSave()`

**Steps:**

1. Validate equipment (at least 1 required)
2. Prepare template data:
   - Name: `"SFBB Temperature Checks (Draft)"`
   - Slug: `sfbb-temperature-checks-draft-${Date.now()}`
   - `is_template_library: false` (marks as draft)
   - Company-scoped (`company_id: profile.company_id`)
3. Insert/Update template in `task_templates`
4. Create template fields:
   - `fridge_name` (select with equipment options)
   - `temperature` (number, -20 to 10°C)
   - `status` (pass_fail)
   - `initials` (text)
   - `photo` (photo, optional)
5. Alert success, collapse form
6. Call `onSave()` callback if provided

**Template Fields Mapping:**

```typescript
// Template field structure
{
  template_id: template.id,
  field_name: "fridge_name",
  field_type: "select",
  label: "Fridge Name",
  required: true,
  field_order: 1,
  help_text: "Select the unit being checked",
  options: validEquipment.map(eq => ({
    value: eq.assetId,
    label: eq.nickname || 'Equipment'
  }))
}
```

### 3. Save & Deploy Flow

**Function:** `handleSaveAndDeploy()`

**Steps:**

1. Validate equipment (at least 1 required)
2. Create template:
   - Name: `"SFBB Temperature Checks"`
   - Slug: `sfbb-temperature-checks-${Date.now()}`
   - `is_template_library: true` (available in templates)
   - Company-scoped
3. Create template fields (same as draft)
4. Create checklist tasks:
   - One task per selected daypart
   - Due date: today
   - Due time: from times array
   - Status: "pending"
   - Priority: "medium"
5. Alert success with task count
6. Collapse form

**Task Creation:**

```typescript
for (let i = 0; i < selectedDayParts.length; i++) {
  const dayPart = selectedDayParts[i];
  const time = times[i] || "09:00";

  taskInstances.push({
    template_id: template.id,
    company_id: profile.company_id,
    site_id: profile.site_id,
    due_date: today.toISOString().split("T")[0],
    due_time: `${time}:00`,
    daypart: dayPart,
    assigned_to_role: "kitchen_manager",
    assigned_to_user_id: profile.id,
    status: "pending",
    priority: "medium",
  });
}
```

### 4. Load Draft Data

**Function:** `loadDraftData(templateId)`

**Steps:**

1. Load template from `task_templates`
2. Load template fields from `template_fields`
3. Extract equipment from `fridge_name` field options
4. Populate equipment rows
5. Load dayparts and times
6. Expand form (`setIsExpanded(true)`)

**Equipment Extraction:**

```typescript
const fridgeField = fields?.find((f) => f.field_name === "fridge_name");
if (fridgeField?.options && Array.isArray(fridgeField.options)) {
  const equipmentRowsData = fridgeField.options.map((opt: any) => ({
    id: crypto.randomUUID(),
    assetId: opt.value,
    nickname: opt.label,
  }));
  setEquipmentRows(equipmentRowsData);
}
```

---

## Database Operations

### Tables Used

1. **`assets`** - Equipment lookup
   - Fields: `id, name, category, site_id, company_id, status`
   - Filter: `status = 'active'`, `archived = false`
   - Scope: Company (optionally site)

2. **`task_templates`** - Template storage
   - Insert/Update operations
   - Key fields: `name, slug, company_id, is_template_library`

3. **`template_fields`** - Form field definitions
   - Linked to template via `template_id`
   - Ordered by `field_order`

4. **`checklist_tasks`** - Task instances
   - Created on "Save & Deploy"
   - Linked to template via `template_id`

### RLS & Scoping

- All queries scoped to `profile.company_id`
- Site filtering when `profile.site_id` exists
- Templates can be:
  - Company-specific (`company_id = profile.company_id`)
  - Drafts (`is_template_library = false`)
  - Published (`is_template_library = true`)

---

## Styling Patterns

### Color Scheme

**Theme Colors:**

- Primary: `magenta-500` / `magenta-400`
- Background layers:
  - Card: `bg-[#141823]`
  - Expanded: `bg-[#0f1220]`
  - Header hover: `bg-[#1a1f2e]`

**Text Colors:**

- Primary: `text-slate-200` / `text-white`
- Muted: `text-slate-400` / `text-slate-500`
- Theme accent: `text-magenta-400`

**Borders:**

- Default: `border-neutral-800`
- Theme: `border-magenta-500`
- Buttons: `border-white/[0.1]`

**Opacity Patterns:**

- Backgrounds: `/10` (10% opacity)
- Borders: `/20` (20% opacity)
- Button hover: `/25` (25% opacity)

### Spacing

- Container padding: `p-4` (header), `p-6` (expanded)
- Section spacing: `space-y-6`
- Grid gaps: `gap-3`
- Button padding: `px-4 py-2` or `px-3 py-1`

### Typography

- Headings: `text-lg font-semibold`
- Labels: `text-sm font-medium`
- Body: `text-sm` or `text-xs`
- Metadata labels: `text-slate-500`
- Metadata values: `text-slate-200 font-medium`

---

## Interaction Patterns

### 1. Expand/Collapse

- Click header to toggle
- Edit button also toggles
- Smooth transition with `transition-colors`
- State persisted in component

### 2. Dynamic Form Fields

- Equipment rows: Add/Remove dynamically
- Time inputs: Only shown for selected dayparts
- Validation: At least 1 equipment required

### 3. Multi-select Pattern

- Day parts: Toggle selection (array state)
- Visual feedback: Color change on selection
- Persists selection state

### 4. Error Handling

- Alerts for validation errors
- Alerts for database errors
- Console logging for debugging
- User-friendly error messages

---

## Integration Points

### 1. AppContext

```typescript
const { profile } = useAppContext();
// Uses: profile.company_id, profile.site_id, profile.id
```

### 2. Supabase Client

```typescript
import { supabase } from "@/lib/supabase";
// Direct client-side queries
```

### 3. Callbacks

```typescript
interface TemperatureCheckTemplateProps {
  onSave?: () => void; // Called after successful save
}
```

### 4. Page Integration

**Usage in compliance-templates page:**

```tsx
<TemperatureCheckTemplate />
```

**Usage in drafts page:**

```tsx
<TemperatureCheckTemplate editTemplateId={template.id} onSave={() => fetchDrafts()} />
```

---

## Key Behaviors

### Draft vs Published

**Draft (`is_template_library: false`):**

- Name includes "(Draft)"
- Goes to Drafts page
- Can be edited and converted to published

**Published (`is_template_library: true`):**

- Appears in Templates page
- Can generate tasks
- "Save & Deploy" creates published template

### Equipment Mapping

- Assets from `assets` table
- Stored as options in `template_fields`
- Format: `{ value: assetId, label: nickname }`
- Displayed as dropdown in task completion form

### Task Generation

- One task per daypart
- Same template, different times
- All tasks linked to same `template_id`
- Due date: today (immediate deployment)

---

## Form Field Types Used

1. **Select** (`fridge_name`)
   - Options populated from assets
   - Required

2. **Number** (`temperature`)
   - Min: -20, Max: 10
   - Required
   - Validation in UI

3. **Pass/Fail** (`status`)
   - Binary choice
   - Required

4. **Text** (`initials`)
   - Short text input
   - Required

5. **Photo** (`photo`)
   - File upload
   - Optional

---

## Complete Workflow

### User Journey

1. **View Template Card** (Collapsed)
   - See metadata, icon, badge
   - Click to expand

2. **Expand Template**
   - Form fields appear
   - Equipment selection
   - Day part selection
   - Time configuration

3. **Configure Template**
   - Select equipment (add/remove rows)
   - Choose day parts (toggle buttons)
   - Set times (time inputs)

4. **Save Options**
   - **Save**: Creates draft → Drafts page
   - **Save & Deploy**: Creates template + tasks → Templates page + My Tasks

5. **Task Completion** (Separate flow)
   - Tasks appear in "Today's Tasks"
   - User completes via `TaskCompletionModal`
   - Workflow handler processes completion

---

## Data Structure Examples

### Template Data Structure

```typescript
{
  company_id: "uuid",
  name: "SFBB Temperature Checks",
  slug: "sfbb-temperature-checks-1234567890",
  description: "Daily temperature monitoring...",
  category: "food_safety",
  audit_category: "food_safety",
  frequency: "daily",
  time_of_day: "before_open",
  dayparts: ["morning", "afternoon", "evening"],
  assigned_to_role: "kitchen_manager",
  repeatable_field_name: "fridge_name",
  evidence_types: ["temperature", "photo", "pass_fail"],
  compliance_standard: "Food Safety Act / HACCP",
  is_template_library: true,
  is_active: true,
  instructions: "Temperature check for: Fridge 1, Fridge 2..."
}
```

### Template Fields Structure

```typescript
[
  {
    template_id: "uuid",
    field_name: "fridge_name",
    field_type: "select",
    label: "Fridge Name",
    required: true,
    field_order: 1,
    help_text: "Select the unit being checked",
    options: [
      { value: "asset-uuid-1", label: "Fridge 1" },
      { value: "asset-uuid-2", label: "Main Fridge" },
    ],
  },
  // ... more fields
];
```

### Checklist Task Structure

```typescript
{
  template_id: "uuid",
  company_id: "uuid",
  site_id: "uuid",
  due_date: "2025-01-29",
  due_time: "09:00:00",
  daypart: "morning",
  assigned_to_role: "kitchen_manager",
  assigned_to_user_id: "uuid",
  status: "pending",
  priority: "medium"
}
```

---

## UX Consistency Guidelines

### 1. Card Pattern

- Always use rounded-xl border
- Theme color border for active/selected
- Hover effects on interactive elements
- Smooth transitions

### 2. Form Patterns

- Dark backgrounds: `bg-[#0f1220]` for inputs
- Border: `border-neutral-800`
- Text: `text-slate-200` for inputs
- Placeholders: `placeholder:text-slate-500`

### 3. Button Patterns

- Glassmorphism for primary actions
- Theme color for accent buttons
- Red for destructive actions
- Consistent padding and rounded corners

### 4. Status Indicators

- Badges with rounded-full
- Color-coded (yellow=draft, green=active, red=critical)
- Small text (`text-xs`)

### 5. Grid Layouts

- Responsive: `grid-cols-2 md:grid-cols-4`
- Consistent gaps: `gap-3`
- Center-aligned or left-aligned content

---

## Next Steps for Other Templates

To implement other templates (Emergency Lighting, Fire Alarm, etc.) consistently:

1. **Create similar component structure**
   - Card header with icon
   - Expandable form
   - Theme color: Use appropriate color (magenta for food safety, etc.)

2. **Adapt form fields**
   - Replace equipment selection with relevant inputs
   - Use appropriate field types (pass_fail_grid, temperature_grid, etc.)

3. **Maintain same save/deploy flow**
   - Same validation patterns
   - Same database operations
   - Same task generation logic

4. **Keep styling consistent**
   - Same color opacity patterns
   - Same spacing and typography
   - Same interaction patterns

5. **Map to workflow types**
   - Ensure templates link to correct workflow handlers
   - Include workflowConfig in template data
