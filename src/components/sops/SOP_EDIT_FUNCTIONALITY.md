# SOP Edit Functionality

## Overview
When a user clicks "Edit" on an existing SOP from the SOPs tab, the system needs to:
1. Load the sop_data from sop_entries
2. Navigate to the appropriate template page
3. Pre-populate all fields with the saved data
4. Change "Save" button to "Update"
5. Add "Save as New Version" option

## Implementation Steps

### 1. Template Pages Need to Accept Edit Mode

Update each template page to:
- Check for `?edit=sop_id` query parameter
- Load SOP data if edit mode is active
- Pre-populate all form fields
- Show "Update" button instead of "Save"
- Add "Save as New Version" button

### 2. Food Template Example

```typescript
// In food-template/page.tsx
const router = useRouter();
const [isEditMode, setIsEditMode] = useState(false);
const [editingSOPId, setEditingSOPId] = useState(null);

useEffect(() => {
  const editId = new URLSearchParams(window.location.search).get('edit');
  if (editId) {
    setIsEditMode(true);
    setEditingSOPId(editId);
    loadSOPData(editId);
  }
}, []);

const loadSOPData = async (sopId) => {
  const { data, error } = await supabase
    .from('sop_entries')
    .select('*')
    .eq('id', sopId)
    .single();
  
  if (data) {
    const sopData = data.sop_data;
    // Pre-populate all fields
    setTitle(sopData.header.title);
    setVersion(sopData.header.version);
    setStatus(sopData.header.status);
    setAuthor(sopData.header.author);
    setIngredients(sopData.ingredients);
    setEquipment(sopData.equipment);
    setProcessSteps(sopData.processSteps);
    // ... etc
  }
};

const handleUpdate = async () => {
  // Update existing SOP
  const { error } = await supabase
    .from('sop_entries')
    .update({
      sop_data: sopData,
      updated_at: new Date().toISOString(),
      updated_by: profile?.id
    })
    .eq('id', editingSOPId);
};

const handleSaveAsNewVersion = async () => {
  // Create new version
  const newVersion = parseFloat(version) + 0.1;
  const { error } = await supabase
    .from('sop_entries')
    .insert({
      company_id: companyId,
      title,
      ref_code: refCode,
      version: newVersion.toString(),
      status: 'Draft',
      author,
      category,
      sop_data: sopData,
      created_by: profile?.id
    });
};
```

### 3. Update SOPs List to Pass Edit ID

Already implemented in list/page.tsx:
```typescript
const handleEditSOP = (sop) => {
  const templateMap = { /* ... */ };
  const templatePath = templateMap[sop.category] || '/dashboard/sops/food-template';
  router.push(`${templatePath}?edit=${sop.id}`);
};
```

## What Needs to Be Done

1. **Update each template page** (food-template, service-template, cleaning-template, etc.) to:
   - Check for edit query parameter
   - Load and populate SOP data
   - Switch button text from "Save" to "Update"
   - Add "Save as New Version" functionality

2. **Add loading state** while fetching SOP data

3. **Handle error cases**:
   - SOP not found
   - Permission denied
   - Data corruption

4. **Version management**:
   - Auto-increment version number
   - Keep archived versions

5. **Navigation after update**:
   - Return to SOPs list
   - Show success toast
   - Optionally navigate to updated SOP

