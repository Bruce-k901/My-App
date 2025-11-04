# Task Builder Modal - Complete Package

This package contains all the code needed for the Template Builder Modal system. Everything is ready to copy and use.

## 📦 Files Included

1. **`TASK_BUILDER_MODAL_PACKAGE.tsx`** - Complete source code with both components
2. **`TASK_BUILDER_MODAL_README.md`** - This documentation file

## 📋 What's Included

### Components

1. **MasterTemplateModal** - The main template builder modal component
   - Full-featured form with all template configuration options
   - Daypart selection with time pickers for Daily frequency
   - Feature toggles for task capabilities
   - Automatic database saving
   - Navigation after creation

2. **TaskTemplatesPage** - Example page showing how to use the modal
   - Template listing with grid layout
   - Modal trigger button
   - Loading and empty states
   - Template refresh after creation

## 🔧 Dependencies Required

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "next": "^14.0.0",
    "lucide-react": "^0.294.0",
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

## 🗄️ Database Schema

Your `task_templates` table must have these columns:

```sql
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL,
  dayparts TEXT[],
  recurrence_pattern JSONB,
  time_of_day TEXT,
  instructions TEXT,
  evidence_types TEXT[],
  requires_sop BOOLEAN DEFAULT false,
  requires_risk_assessment BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 📁 Installation Steps

### Step 1: Extract Components

Split `TASK_BUILDER_MODAL_PACKAGE.tsx` into two files:

**File 1:** `src/components/templates/MasterTemplateModal.tsx`

- Copy the `MasterTemplateModal` component and all related code (lines starting with `// ============================================================================`)
- Include the `DAYPARTS` constant
- Include the `FeatureItem` component
- Include the `MasterTemplateModal` component

**File 2:** `src/app/dashboard/tasks/templates/page.tsx`

- Copy the `TaskTemplatesPage` component
- Include the `Template` interface

### Step 2: Update Import Paths

Update these imports in both files to match your project structure:

```typescript
// Update these paths:
import { supabase } from "@/lib/supabase"; // Your Supabase client path
import { useAppContext } from "@/context/AppContext"; // Your AppContext path
import { MasterTemplateModal } from "@/components/templates/MasterTemplateModal"; // Modal import path
```

### Step 3: Configure AppContext

Ensure your `AppContext` provides `companyId`:

```typescript
// In your AppContext
interface AppContextType {
  companyId: string | null;
  // ... other properties
}
```

### Step 4: Verify Supabase Client

Ensure your Supabase client is configured:

```typescript
// src/lib/supabase.ts (or similar)
import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

### Step 5: Styling

This component uses Tailwind CSS. Ensure:

- Tailwind is installed and configured
- These color classes are available: `pink-500`, `pink-600`, `pink-700`, `gray-400`, `white`, `neutral-900`, `green-500`, `orange-500`

## 🎨 Features

### Template Builder Features

- ✅ **Template Configuration**
  - Template name, compliance type, category
  - Task name and description
  - Sub-category support

- ✅ **Feature Selection**
  - Monitor/Callout Modal
  - Checklist
  - Pass/Fail Buttons
  - Library Dropdown
  - Risk Assessment Upload
  - Frequency Module
  - Linked Evidence
  - Temperature Logs
  - Asset Dropdown
  - SOP Upload

- ✅ **Task Instructions**
  - Purpose (What)
  - Importance (Why)
  - Method (How)
  - Special Requirements

- ✅ **Frequency & Scheduling**
  - Daily, Weekly, Monthly, Quarterly, Annually, On Demand, Custom
  - Daypart selection for Daily frequency
  - Time selection per daypart
  - Single daypart selection for other frequencies

### Template Listing Page Features

- ✅ Grid layout for templates
- ✅ Loading state
- ✅ Empty state with call-to-action
- ✅ Template cards with:
  - Name and description
  - Category badge
  - Frequency display
  - Daypart count
- ✅ Auto-refresh after template creation

## 🔄 Usage Example

```typescript
import { MasterTemplateModal } from '@/components/templates/MasterTemplateModal';

function MyPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Create Template
      </button>

      <MasterTemplateModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={(config) => {
          console.log('Template saved:', config);
        }}
      />
    </>
  );
}
```

## 🎯 Customization

### Change Dayparts

Edit the `DAYPARTS` constant in `MasterTemplateModal.tsx`:

```typescript
const DAYPARTS = [
  { value: "custom_value", label: "Custom Label", times: ["09:00", "10:00"] },
  // Add more dayparts as needed
];
```

### Change Categories

Modify the `categoryMap` in `handleSave`:

```typescript
const categoryMap: Record<string, string> = {
  "Food Safety": "food_safety",
  "Your Category": "your_category",
  // Add more mappings
};
```

### Change Frequencies

Modify the `frequencyMap` in `handleSave`:

```typescript
const frequencyMap: Record<string, string> = {
  Daily: "daily",
  "Your Frequency": "your_frequency",
  // Add more mappings
};
```

### Change Navigation Route

Update the route in `handleSave`:

```typescript
router.push("/your/custom/route");
```

## 🐛 Troubleshooting

### Modal doesn't open

- Check that `isOpen` prop is `true`
- Verify the modal is rendered in the DOM

### Save fails

- Check browser console for error messages
- Verify `companyId` is available in AppContext
- Ensure database table structure matches schema
- Check Supabase RLS policies allow INSERT

### Templates don't load

- Verify `companyId` is set
- Check Supabase connection
- Ensure RLS policies allow SELECT
- Check browser console for errors

### Styling looks wrong

- Verify Tailwind CSS is installed and configured
- Check that color classes exist in your Tailwind config
- Ensure CSS is being compiled

## 📝 Notes

- The modal automatically closes and navigates after successful save
- Templates are filtered by `company_id` and `is_active = true`
- Daypart times are stored in `recurrence_pattern.daypart_times`
- Evidence types are derived from enabled features
- Slug is auto-generated from template name

## 🔗 Related Files

For a complete list of task-related files, see `TASK_FILES_REFERENCE.md`

## 📄 License

Use as needed in your project.
