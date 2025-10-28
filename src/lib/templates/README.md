# Food SOP Template

A dynamic TipTap-based template for creating food preparation and cooking Standard Operating Procedures.

## Overview

The Food SOP Template provides a structured framework for documenting food preparation processes with comprehensive data capture including ingredients, equipment, safety requirements, and compliance tracking.

## Template Structure

The template consists of the following sections:

1. **Header** - Basic SOP metadata (title, type, version, author, reference code)
2. **Ingredients** - Quantitative ingredient table with allergen tracking
3. **Equipment** - Required equipment and tools
4. **PPE** - Personal protective equipment requirements
5. **Pre-Start** - Pre-production checklist items
6. **Process Steps** - Step-by-step cooking/preparation instructions
7. **Post-Finish** - Cleanup and verification tasks
8. **Storage Info** - Storage requirements and parameters
9. **Compliance** - Automated validation and completion tracking

## Usage

### Import the Template

```typescript
import { FOOD_SOP_TEMPLATE } from '@/lib/templates/foodSOPTemplate';
```

### Loading the Template

```typescript
// In your TipTap editor initialization
const editor = new Editor({
  extensions: [/* your extensions */],
  content: FOOD_SOP_TEMPLATE
});
```

### Field Schema Access

Each section has a defined schema for dynamic field generation:

```typescript
import { FIELD_SCHEMAS } from '@/lib/templates/foodSOPTemplate';

// Access field definitions for a section
const headerFields = FIELD_SCHEMAS.header;
const ingredientFields = FIELD_SCHEMAS.ingredients;
```

## Compliance Checking

The template includes automatic compliance validation:

```typescript
import { checkCompliance } from '@/lib/templates/foodSOPTemplate';

const result = checkCompliance(doc);
console.log(`Compliant: ${result.compliant}`);
console.log(`Completion: ${result.percentage}%`);
console.log(`Missing: ${result.missing.join(', ')}`);
```

## Reference Code Generation

Reference codes are auto-generated based on SOP Type and Title:

```typescript
import { generateReferenceCode } from '@/lib/templates/foodSOPTemplate';

const refCode = generateReferenceCode('Cooking', 'Lasagne Base');
// Returns: "COO-LASA-001"
```

### Prefixes

- Prep → `PRE-`
- Cooking → `COO-`
- Cleaning → `CLE-`
- Service → `SER-`
- Manual Handling → `MAN-`

## Field Types

The template supports multiple field types:

- `input` - Text input
- `number` - Numeric input
- `dropdown` - Select from options
- `multiselect` - Multiple selections
- `textarea` - Multi-line text
- `date` - Date picker
- `photo` - Image upload
- `auto` - Auto-generated value

## Required Fields

### Header
- SOP Title
- SOP Type
- Version
- Author

### Ingredients
- At least one ingredient with quantity and unit

### Process Steps
- At least one step with description

## Compliance Status

The compliance section provides:

- ✅ **Compliant** - All required fields completed
- ⚠️ **Warning** - Some fields missing
- ❌ **Non-Compliant** - Critical fields missing

Export functionality is disabled until the SOP is fully compliant.
