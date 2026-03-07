import type { ModuleImportConfig, BulkImportField } from './types';

function parseDate(v: string): string | null {
  if (!v || !v.trim()) return null;
  const trimmed = v.trim();

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // Try DD/MM/YYYY or DD-MM-YYYY (UK format)
  const ukMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (ukMatch) {
    const [, day, month, year] = ukMatch;
    const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // Try MM/DD/YYYY (US format)
  const usMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    if (Number(month) <= 12) {
      const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }

  // Try natural language date parsing
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

  return null;
}

function parseNumber(v: string): number | null {
  if (!v || !v.trim()) return null;
  const num = parseFloat(v.replace(/[^0-9.\-]/g, ''));
  return isNaN(num) ? null : num;
}

function mapAssetCategory(v: string): string {
  if (!v) return 'other';
  const t = v.trim().toLowerCase();
  switch (t) {
    case 'refrigeration':
    case 'display fridge':
    case 'fridge':
    case 'freezer':
    case 'chiller':
    case 'cold storage':
      return 'refrigeration';

    case 'cooking':
    case 'cooking equipment':
    case 'oven':
    case 'hob':
    case 'grill':
    case 'fryer':
      return 'cooking';

    case 'dishwashing':
    case 'pot washer':
    case 'glasswasher':
    case 'dishwasher':
      return 'dishwashing';

    case 'coffee':
    case 'coffee machine':
    case 'beverage':
    case 'espresso':
      return 'coffee';

    case 'safety':
    case 'fire safety':
    case 'fire extinguisher':
    case 'fire suppression':
      return 'safety';

    case 'other':
      return 'other';

    default:
      return 'other';
  }
}

const STATUS_MAP: Record<string, string> = {
  active: 'active',
  live: 'active',
  in_use: 'active',
  'in use': 'active',
  operational: 'active',
  working: 'active',
  inactive: 'inactive',
  decommissioned: 'inactive',
  off: 'inactive',
  'out of service': 'inactive',
  maintenance: 'maintenance',
  repair: 'maintenance',
  'under repair': 'maintenance',
  servicing: 'maintenance',
  retired: 'retired',
  disposed: 'retired',
  written_off: 'retired',
  'written off': 'retired',
  scrapped: 'retired',
};

function normaliseStatus(v: string): string {
  if (!v || !v.trim()) return 'active';
  const lower = v.trim().toLowerCase();
  return STATUS_MAP[lower] || 'active';
}

export const ASSETLY_IMPORT_FIELDS: BulkImportField[] = [
  {
    key: 'name',
    label: 'Asset Name',
    required: true,
    aliases: ['asset name', 'equipment name', 'equipment', 'label', 'item', 'description', 'asset', 'name'],
    type: 'text',
    validate: (v) => (!v || !v.trim()) ? 'Asset name is required' : null,
  },
  {
    key: 'brand',
    label: 'Brand',
    required: false,
    aliases: ['manufacturer', 'make', 'brand name', 'mfr', 'vendor'],
    type: 'text',
  },
  {
    key: 'model',
    label: 'Model',
    required: false,
    aliases: ['model number', 'model name', 'model no', 'model_number', 'model #'],
    type: 'text',
  },
  {
    key: 'serial_number',
    label: 'Serial Number',
    required: false,
    aliases: ['serial', 'serial no', 'serial #', 's/n', 'serial_no'],
    type: 'text',
  },
  {
    key: 'category',
    label: 'Category',
    required: false,
    aliases: ['type', 'asset type', 'equipment type', 'asset category'],
    type: 'select',
    selectOptions: ['refrigeration', 'cooking', 'dishwashing', 'coffee', 'safety', 'other'],
    transform: (v) => mapAssetCategory(v),
  },
  {
    key: 'site_name',
    label: 'Site / Location',
    required: false,
    aliases: ['site', 'location', 'branch', 'store', 'venue', 'workplace'],
    type: 'text',
  },
  {
    key: 'install_date',
    label: 'Install Date',
    required: false,
    aliases: ['installation date', 'date installed', 'installed'],
    type: 'date',
    transform: (v) => parseDate(v),
  },
  {
    key: 'purchase_date',
    label: 'Purchase Date',
    required: false,
    aliases: ['date of purchase', 'date purchased', 'bought'],
    type: 'date',
    transform: (v) => parseDate(v),
  },
  {
    key: 'warranty_end',
    label: 'Warranty End',
    required: false,
    aliases: ['warranty expiry', 'warranty end date', 'warranty expires'],
    type: 'date',
    transform: (v) => parseDate(v),
  },
  {
    key: 'next_service_date',
    label: 'Next Service Date',
    required: false,
    aliases: ['next service', 'service due', 'next service due'],
    type: 'date',
    transform: (v) => parseDate(v),
  },
  {
    key: 'last_service_date',
    label: 'Last Service Date',
    required: false,
    aliases: ['last service', 'last serviced', 'service date'],
    type: 'date',
    transform: (v) => parseDate(v),
  },
  {
    key: 'status',
    label: 'Status',
    required: false,
    aliases: ['asset status', 'condition', 'state'],
    type: 'select',
    selectOptions: ['active', 'inactive', 'maintenance', 'retired'],
    transform: (v) => normaliseStatus(v),
  },
  {
    key: 'notes',
    label: 'Notes',
    required: false,
    aliases: ['note', 'comments', 'remarks', 'additional info'],
    type: 'text',
  },
  {
    key: 'working_temp_min',
    label: 'Min Temp (°C)',
    required: false,
    aliases: ['min temp', 'minimum temp', 'temp min', 'min temperature'],
    type: 'number',
    transform: (v) => parseNumber(v),
  },
  {
    key: 'working_temp_max',
    label: 'Max Temp (°C)',
    required: false,
    aliases: ['max temp', 'maximum temp', 'temp max', 'max temperature'],
    type: 'number',
    transform: (v) => parseNumber(v),
  },
  {
    key: 'ppm_frequency_months',
    label: 'PPM Frequency (Months)',
    required: false,
    aliases: ['ppm frequency', 'service frequency', 'maintenance frequency', 'service interval'],
    type: 'number',
    transform: (v) => parseNumber(v),
    validate: (v) => {
      if (v !== null && v !== undefined && typeof v === 'number') {
        if (v < 1 || v > 60) return 'PPM frequency must be between 1 and 60 months';
      }
      return null;
    },
  },
];

export const ASSETLY_IMPORT_CONFIG: ModuleImportConfig = {
  moduleId: 'assetly',
  moduleName: 'Assets',
  targetTable: 'assets',
  fields: ASSETLY_IMPORT_FIELDS,
  maxRows: 500,
  batchSize: 50,
};

export function generateAssetTemplate(): string {
  const headers = [
    'Asset Name', 'Brand', 'Model', 'Serial Number', 'Category',
    'Site / Location', 'Install Date', 'Purchase Date', 'Warranty End',
    'Next Service Date', 'Last Service Date', 'Status', 'Notes',
    'Min Temp (°C)', 'Max Temp (°C)', 'PPM Frequency (Months)',
  ];

  const example1 = [
    'Walk-in Fridge', 'Foster', 'EP700H', 'FST-2024-001', 'Refrigeration',
    'Camden Site', '15/03/2023', '01/03/2023', '01/03/2026',
    '15/09/2025', '15/03/2025', 'Active', 'Main kitchen walk-in',
    '1', '5', '6',
  ];

  const example2 = [
    'Combi Oven', 'Rational', 'SCC WE 101', 'RAT-2023-045', 'Cooking',
    'Soho Site', '01/06/2022', '15/05/2022', '15/05/2025',
    '01/12/2025', '01/06/2025', 'Active', 'Main kitchen line',
    '', '', '12',
  ];

  const escape = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const lines = [
    headers.map(escape).join(','),
    example1.map(escape).join(','),
    example2.map(escape).join(','),
  ];

  return lines.join('\n');
}
