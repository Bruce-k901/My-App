/**
 * Food SOP Template
 * Dynamic field-based template for food preparation and cooking procedures
 */

export const FOOD_SOP_TEMPLATE = {
  type: 'doc',
  content: [
    // Header Section
    {
      type: 'prepHeader',
      attrs: {
        title: '',
        ref_code: '',
        version: '1.0',
        status: 'Draft',
        author: '',
        last_edited: '',
        sopType: 'Prep',
        yieldValue: 0,
        unit: '',
        toolColour: '',
        toolColourHex: '',
        safetyNotes: '',
        subRecipes: []
      }
    },

    // Ingredients Section
    {
      type: 'ingredientTable',
      attrs: {
        rows: [],
        multiplier: 1
      }
    },

    // Equipment Section
    {
      type: 'equipmentList',
      attrs: {
        rows: []
      }
    },

    // PPE Section
    {
      type: 'ppeList',
      attrs: {
        items: []
      }
    },

    // Pre-Start Section
    {
      type: 'preStartChecklist',
      attrs: {
        items: [
          { text: "Work area sanitised", completed: false },
          { text: "Correct PPE worn", completed: false },
          { text: "Correct colour-coded tools ready", completed: false },
          { text: "Allergens reviewed and ingredients checked", completed: false }
        ]
      }
    },

    // Process Steps Section
    {
      type: 'processSteps',
      attrs: {
        steps: []
      }
    },

    // Post-Finish Section
    {
      type: 'postFinishChecklist',
      attrs: {
        items: [
          { text: "Product labelled with date & expiry", completed: false },
          { text: "Storage temperature verified", completed: false },
          { text: "Equipment cleaned and sanitised", completed: false },
          { text: "Waste disposed correctly", completed: false }
        ]
      }
    },

    // Storage Info Section
    {
      type: 'storageInfo',
      attrs: {
        type: '',
        tempMin: null,
        tempMax: null,
        durationDays: null,
        storageNotes: ''
      }
    },

    // Compliance Section
    {
      type: 'sopComplianceCheck',
      attrs: {
        enabled: true
      }
    }
  ]
};

/**
 * Field Schema Definitions
 * Defines the structure of dynamic fields for each section
 */
export const FIELD_SCHEMAS = {
  header: [
    { key: 'title', label: 'SOP Title', type: 'input', required: true },
    { key: 'sopType', label: 'SOP Type', type: 'dropdown', required: true, options: ['Prep', 'Cooking'] },
    { key: 'version', label: 'Version', type: 'input', required: true },
    { key: 'author', label: 'Author', type: 'input', required: true },
    { key: 'ref_code', label: 'Reference', type: 'auto', required: false },
    { key: 'yieldValue', label: 'Yield / Portion', type: 'number', required: false },
    { key: 'unit', label: 'Unit', type: 'dropdown', required: false, options: ['g', 'kg', 'ml', 'L', 'pcs', 'servings'] },
    { key: 'shelfLife', label: 'Shelf Life', type: 'number', required: false, suffix: 'days' },
    { key: 'storageTemp', label: 'Storage Temp', type: 'number', required: false, suffix: '°C' },
    { key: 'objective', label: 'Objective / Purpose', type: 'textarea', required: false }
  ],

  ingredients: [
    { key: 'ingredient', label: 'Ingredient Name', type: 'input', required: true },
    { key: 'quantity', label: 'Quantity', type: 'number', required: true },
    { key: 'unit', label: 'Unit', type: 'dropdown', required: true, options: ['g', 'kg', 'ml', 'L', 'pcs', 'tsp', 'tbsp', 'cup'] },
    { key: 'supplier', label: 'Supplier', type: 'input', required: false },
    { key: 'allergen', label: 'Allergen', type: 'multiselect', required: false },
    { key: 'prepState', label: 'Prep State', type: 'dropdown', required: false, options: ['Fresh', 'Frozen', 'Defrosted', 'Cooked'] },
    { key: 'useByDate', label: 'Use-By Date', type: 'date', required: false },
    { key: 'costPerUnit', label: 'Cost per Unit', type: 'number', required: false },
    { key: 'photo', label: 'Photo', type: 'photo', required: false }
  ],

  equipment: [
    { key: 'name', label: 'Equipment Name', type: 'input', required: true },
    { key: 'function', label: 'Function / Use', type: 'textarea', required: false },
    { key: 'photo', label: 'Photo', type: 'photo', required: false },
    { key: 'safetyNote', label: 'Safety Note', type: 'textarea', required: false }
  ],

  ppe: [
    { key: 'item', label: 'PPE Item', type: 'input', required: true },
    { key: 'usageNote', label: 'Usage Note', type: 'textarea', required: false },
    { key: 'photo', label: 'Photo', type: 'photo', required: false }
  ],

  prestart: [
    { key: 'staffHygiene', label: 'Staff Hygiene Requirements', type: 'textarea', required: false },
    { key: 'workstationSetup', label: 'Workstation Setup', type: 'textarea', required: false },
    { key: 'equipmentReadiness', label: 'Equipment Readiness', type: 'textarea', required: false },
    { key: 'ingredientValidation', label: 'Ingredient Validation', type: 'textarea', required: false },
    { key: 'environmentControl', label: 'Environment Control', type: 'textarea', required: false }
  ],

  howto: [
    { key: 'description', label: 'Step Description', type: 'textarea', required: true },
    { key: 'stepNumber', label: 'Step Number', type: 'auto', required: false },
    { key: 'targetTemp', label: 'Target Temp', type: 'number', required: false, suffix: '°C' },
    { key: 'duration', label: 'Time / Duration', type: 'input', required: false },
    { key: 'photo', label: 'Photo / Diagram', type: 'photo', required: false },
    { key: 'safetyNote', label: 'Safety Note', type: 'textarea', required: false }
  ],

  postfinish: [
    { key: 'cleaningActions', label: 'Cleaning Actions', type: 'textarea', required: false },
    { key: 'wasteDisposal', label: 'Waste Disposal', type: 'textarea', required: false },
    { key: 'storageTransfer', label: 'Storage Transfer', type: 'textarea', required: false },
    { key: 'endNotes', label: 'End-of-Task Notes', type: 'textarea', required: false }
  ]
};

/**
 * Validation Rules for Compliance Section
 */
export const COMPLIANCE_RULES = {
  requiredFields: {
    header: ['title', 'sopType', 'version', 'author', 'ref_code'],
    ingredients: ['ingredient', 'quantity', 'unit'],
    howto: ['description'],
    prestart: ['items']
  },
  conditionalFields: {
    allergenWarning: {
      field: 'allergen',
      requirement: 'If allergens present, allergen field must be populated'
    }
  }
};

/**
 * Helper function to generate reference code
 */
export function generateReferenceCode(sopType: string, title: string): string {
  const prefixMap: Record<string, string> = {
    'Prep': 'PRE',
    'Cooking': 'COO',
    'Cleaning': 'CLE',
    'Service': 'SER',
    'ManualHandling': 'MAN'
  };
  
  const prefix = prefixMap[sopType] || 'SOP';
  const nameBit = title.replace(/\s+/g, '').slice(0, 4).toUpperCase();
  return `${prefix}-${nameBit}-001`;
}

/**
 * Helper function to check compliance
 */
export function checkCompliance(doc: any): { compliant: boolean; percentage: number; missing: string[] } {
  const missing: string[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  // Check header fields
  if (doc.content && doc.content.length > 0) {
    const header = doc.content.find((node: any) => node.type === 'prepHeader');
    if (header) {
      const requiredFields = COMPLIANCE_RULES.requiredFields.header;
      requiredFields.forEach((field: string) => {
        totalChecks++;
        if (!header.attrs[field]) {
          missing.push(`Header: ${field}`);
        } else {
          passedChecks++;
        }
      });
    }
  }

  // Check ingredients
  const ingredients = doc.content?.find((node: any) => node.type === 'ingredientTable');
  if (ingredients && ingredients.attrs.rows.length === 0) {
    missing.push('Ingredients: at least one ingredient required');
  } else if (ingredients) {
    passedChecks++;
    totalChecks++;
  }

  const percentage = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  const compliant = missing.length === 0 && percentage === 100;

  return { compliant, percentage, missing };
}
