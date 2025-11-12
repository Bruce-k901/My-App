# Template Features Modular Architecture

## Overview

Template features are now modular, self-contained components that automatically handle:

- UI rendering
- State management
- Integration with other features (monitor/callout, assets)
- Pre-population from template data

## Component Structure

```
src/components/templates/features/
├── MonitorCalloutModal.tsx          # Shared modal for monitor/callout
├── TemperatureLoggingFeature.tsx    # Temperature logs + Asset linking + Monitor/Callout
├── PassFailFeature.tsx              # Pass/Fail + Monitor/Callout
├── ChecklistFeature.tsx             # Checklist + Pre-population
├── YesNoChecklistFeature.tsx        # Yes/No checklist + Monitor/Callout
├── PhotoEvidenceFeature.tsx         # Photo uploads
├── AssetSelectionFeature.tsx        # Asset selection
└── index.ts                         # Exports
```

## Key Features

### 1. Automatic Integration

- **Temperature Logging** automatically links to Assets and triggers Monitor/Callout when thresholds are exceeded
- **Pass/Fail** automatically triggers Monitor/Callout when marked as "Fail"
- **Yes/No Checklist** automatically triggers Monitor/Callout when "No" is selected

### 2. Pre-population

- **ChecklistFeature** automatically loads items from `template.recurrence_pattern.default_checklist_items`
- **TemperatureLoggingFeature** automatically populates from selected assets

### 3. Dynamic Rendering

Features are only rendered when enabled in the template:

```typescript
const features = getTemplateFeatures(template);

{features.checklist && (
  <ChecklistFeature
    items={formData.checklistItems}
    defaultItems={template.recurrence_pattern?.default_checklist_items}
    onChange={(items) => setFormData({ ...formData, checklistItems: items })}
  />
)}
```

## Usage in TaskFromTemplateModal

Replace inline feature rendering with component imports:

```typescript
import {
  TemperatureLoggingFeature,
  PassFailFeature,
  ChecklistFeature,
  YesNoChecklistFeature,
  PhotoEvidenceFeature,
  AssetSelectionFeature
} from './features';

// In render:
{features.tempLogs && (
  <TemperatureLoggingFeature
    temperatures={formData.temperatures}
    selectedAssets={formData.selectedAssets}
    assets={assets}
    onChange={(temps) => setFormData({ ...formData, temperatures: temps })}
    onMonitorCallout={handleMonitorCallout}
    contractorType={template.contractor_type}
    warnThreshold={getWarnThreshold()}
    failThreshold={getFailThreshold()}
  />
)}
```

## Template Configuration

All features are automatically detected from template configuration:

- `evidence_types` array determines which features to show
- `repeatable_field_name` determines asset selection
- `triggers_contractor_on_failure` enables monitor/callout
- `recurrence_pattern.default_checklist_items` pre-populates checklists

## Benefits

1. **No manual editing** - Features render automatically based on template config
2. **Consistent behavior** - All templates use the same components
3. **Easy maintenance** - Update one component, all templates benefit
4. **Clear separation** - Each feature is self-contained
5. **Type safety** - Each component has well-defined props
