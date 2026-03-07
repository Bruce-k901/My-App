import { FieldType } from '@/types/checklist';

export interface FieldTypeConfig {
  label: string;
  icon: string; // Phosphor icon name from @/components/ui/icons
  description: string;
  hasUnit: boolean;
  hasMinMax: boolean;
  hasThresholds: boolean;
  hasOptions: boolean;
  hasSubFields: boolean;
  defaultPlaceholder: string;
}

export const FIELD_TYPE_CONFIG: Record<string, FieldTypeConfig> = {
  [FieldType.TEXT]: {
    label: 'Text',
    icon: 'Type',
    description: 'Single-line text input',
    hasUnit: false,
    hasMinMax: false,
    hasThresholds: false,
    hasOptions: false,
    hasSubFields: false,
    defaultPlaceholder: 'Enter text...',
  },
  [FieldType.NUMBER]: {
    label: 'Number',
    icon: 'Hash',
    description: 'Numeric input with optional unit',
    hasUnit: true,
    hasMinMax: true,
    hasThresholds: true,
    hasOptions: false,
    hasSubFields: false,
    defaultPlaceholder: 'Enter number...',
  },
  [FieldType.TEMPERATURE]: {
    label: 'Temperature',
    icon: 'Thermometer',
    description: 'Temperature input (°C)',
    hasUnit: false, // unit is always °C
    hasMinMax: true,
    hasThresholds: true,
    hasOptions: false,
    hasSubFields: false,
    defaultPlaceholder: 'Enter temperature...',
  },
  [FieldType.YES_NO]: {
    label: 'Yes / No',
    icon: 'ToggleRight',
    description: 'Binary yes/no toggle',
    hasUnit: false,
    hasMinMax: false,
    hasThresholds: false,
    hasOptions: false,
    hasSubFields: false,
    defaultPlaceholder: '',
  },
  [FieldType.SELECT]: {
    label: 'Select',
    icon: 'ListBullets',
    description: 'Dropdown with custom options',
    hasUnit: false,
    hasMinMax: false,
    hasThresholds: false,
    hasOptions: true,
    hasSubFields: false,
    defaultPlaceholder: 'Select an option...',
  },
  [FieldType.PHOTO]: {
    label: 'Photo',
    icon: 'Camera',
    description: 'Photo capture or upload',
    hasUnit: false,
    hasMinMax: false,
    hasThresholds: false,
    hasOptions: false,
    hasSubFields: false,
    defaultPlaceholder: '',
  },
  [FieldType.DATE]: {
    label: 'Date',
    icon: 'Calendar',
    description: 'Date picker',
    hasUnit: false,
    hasMinMax: false,
    hasThresholds: false,
    hasOptions: false,
    hasSubFields: false,
    defaultPlaceholder: 'Select date...',
  },
  [FieldType.TIME]: {
    label: 'Time',
    icon: 'Clock',
    description: 'Time picker',
    hasUnit: false,
    hasMinMax: false,
    hasThresholds: false,
    hasOptions: false,
    hasSubFields: false,
    defaultPlaceholder: 'Select time...',
  },
  [FieldType.PASS_FAIL]: {
    label: 'Pass / Fail',
    icon: 'CheckCircle',
    description: 'Pass/Fail toggle buttons',
    hasUnit: false,
    hasMinMax: false,
    hasThresholds: false,
    hasOptions: false,
    hasSubFields: false,
    defaultPlaceholder: '',
  },
  [FieldType.REPEATABLE_RECORD]: {
    label: 'Record Table',
    icon: 'Table',
    description: 'Multi-row table with sub-fields',
    hasUnit: false,
    hasMinMax: false,
    hasThresholds: false,
    hasOptions: false,
    hasSubFields: true,
    defaultPlaceholder: '',
  },
};

/** Available field types for the builder (ordered for display) */
export const BUILDER_FIELD_TYPES = [
  FieldType.TEXT,
  FieldType.NUMBER,
  FieldType.TEMPERATURE,
  FieldType.YES_NO,
  FieldType.SELECT,
  FieldType.PHOTO,
  FieldType.DATE,
  FieldType.TIME,
  FieldType.PASS_FAIL,
  FieldType.REPEATABLE_RECORD,
];

/** Field types available as sub-fields inside a REPEATABLE_RECORD (no nesting) */
export const RECORD_SUB_FIELD_TYPES = [
  FieldType.TEXT,
  FieldType.NUMBER,
  FieldType.TEMPERATURE,
  FieldType.YES_NO,
  FieldType.SELECT,
  FieldType.DATE,
  FieldType.TIME,
  FieldType.PASS_FAIL,
];

/** Common units for number fields */
export const COMMON_UNITS = [
  'KG', 'Gm', 'mg', 'L', 'ml', 'oz', 'lb',
  '°C', '°F', 'mm', 'cm', 'm', '%', 'ppm',
];
