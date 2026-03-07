/**
 * Trail-to-Opsly CSV Import — Core Logic
 *
 * Parses a Trail task report CSV export, deduplicates task instances into
 * unique templates, auto-maps categories and infers frequencies.
 */
import Papa from 'papaparse';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrailRawRow {
  task_description: string;
  location_name: string;
  due_datetime: string;
  status: string;
  checklist_count: string;
  [key: string]: string; // subtask_N_description, record log fields, etc.
}

export interface TrailChecklistItem {
  id: string;
  text: string;
  required: boolean;
}

export interface TrailDetectedField {
  field_name: string;
  field_type: 'text' | 'number' | 'temperature' | 'checkbox' | 'pass_fail' | 'select' | 'date';
  label: string;
  required: boolean;
  field_order: number;
  help_text: string | null;
  min_value: number | null;
  max_value: number | null;
  warn_threshold: number | null;
  fail_threshold: number | null;
  options: { value: string; label: string }[] | null;
  original_header: string;
}

export interface TrailDetectedFieldGroup {
  fields: TrailDetectedField[];
  evidenceTypes: string[];
  hasPhotos: boolean;
  repeatableLabels: string[];
}

export interface TrailTemplate {
  name: string;
  siteName: string;
  instanceCount: number;
  checklistItems: TrailChecklistItem[];
  inferredCategory: string;
  inferredFrequency: string;
  frequencyConfidence: 'high' | 'medium' | 'low';
  dueDates: Date[];
  included: boolean; // user can deselect
  isDuplicate?: boolean; // already exists in Opsly
  detectedFields: TrailDetectedFieldGroup;
  matchedTemplateSlug?: string; // matches existing compliance template
  matchedTemplateName?: string;
  overrideEvidenceTypes?: string[]; // user-overridden evidence types from review step
}

export interface TrailParseResult {
  templates: TrailTemplate[];
  totalRows: number;
  dateRange: { earliest: string; latest: string } | null;
  siteName: string;
  warnings: string[];
}

export interface TrailImportPayload {
  company_id: string;
  site_ids: string[];
  templates: Array<{
    name: string;
    category: string;
    frequency: string;
    checklistItems: TrailChecklistItem[];
    detectedFields?: TrailDetectedFieldGroup;
    matchedTemplateSlug?: string;
    overrideEvidenceTypes?: string[];
  }>;
}

export interface TrailImportResult {
  success: boolean;
  imported: number;
  linked: number;
  skipped: number;
  failed: number;
  details: {
    imported: Array<{ id: string; name: string; slug: string }>;
    linked: Array<{ name: string; templateName: string }>;
    skipped: Array<{ name: string; reason: string }>;
    failed: Array<{ name: string; error: string }>;
  };
}

// ---------------------------------------------------------------------------
// Category mapping
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food_safety: [
    'temperature', 'temp ', 'temp\t', 'fridge', 'freezer', 'probe',
    'food', 'allergen', 'haccp', 'delivery', 'dough', 'ingredient',
    'product', 'line check', 'bakery temp', 'kiosk temp', 'calibration',
  ],
  cleaning: [
    'cleaning', 'clean', 'sanitise', 'sanitize', 'washroom', 'zone',
  ],
  h_and_s: [
    'pest', 'water test', 'water record', 'sink', 'hot water',
    'accident', 'incident', 'glass', 'breakage', 'legionella',
    'visitor', 'audit',
  ],
  fire: ['fire alarm', 'fire safety', 'fire '],
  compliance: ['opening', 'closing', 'return to work'],
};

export function inferCategory(taskName: string): string {
  const lower = taskName.toLowerCase();
  // Check in priority order — fire before h_and_s (both could match "fire alarm test")
  for (const category of ['fire', 'food_safety', 'cleaning', 'h_and_s', 'compliance']) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }
  return 'compliance'; // fallback
}

// ---------------------------------------------------------------------------
// Frequency inference
// ---------------------------------------------------------------------------

const TRIGGERED_KEYWORDS = [
  'visitor', 'accident', 'incident record', 'incident report',
  'glass', 'breakage', 'broken',
  'return to work', 'sickness', 'sick leave',
  'allergen guide', 'health declaration', 'health questionnaire',
  'complaint', 'customer complaint',
  'new starter', 'new employee', 'induction',
  'corrective action', 'non-conformance', 'non conformance',
  'delivery check', 'goods in',
  'sign-in', 'sign in', 'signing in',
  'maintenance request', 'repair request',
];

export function inferFrequency(
  taskName: string,
  dueDates: Date[]
): { frequency: string; confidence: 'high' | 'medium' | 'low' } {
  // Check keyword override first — some tasks are always ad-hoc
  const lower = taskName.toLowerCase();
  if (TRIGGERED_KEYWORDS.some(kw => lower.includes(kw))) {
    return { frequency: 'triggered', confidence: 'high' };
  }

  if (dueDates.length <= 1) {
    return { frequency: 'triggered', confidence: 'low' };
  }

  // Sort chronologically
  const sorted = [...dueDates].sort((a, b) => a.getTime() - b.getTime());

  // Calculate gaps in days
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diffMs = sorted[i].getTime() - sorted[i - 1].getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > 0) gaps.push(diffDays);
  }

  if (gaps.length === 0) {
    return { frequency: 'triggered', confidence: 'low' };
  }

  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const medianGap = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)];

  // Use median for robustness against outliers (missed days, holidays)
  if (medianGap <= 1.5) {
    return { frequency: 'daily', confidence: 'high' };
  }
  if (medianGap <= 8) {
    return { frequency: 'weekly', confidence: 'high' };
  }
  if (medianGap <= 16) {
    return { frequency: 'weekly', confidence: 'medium' };
  }
  if (medianGap <= 35) {
    return { frequency: 'monthly', confidence: 'medium' };
  }
  if (medianGap <= 100) {
    return { frequency: 'quarterly', confidence: 'low' };
  }
  if (medianGap <= 200) {
    return { frequency: 'annually', confidence: 'low' };
  }
  return { frequency: 'triggered', confidence: 'low' };
}

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

/** Strip emojis and special chars, produce a URL-safe slug */
export function slugify(name: string): string {
  return name
    // Remove emojis and other non-ASCII symbols
    .replace(/[\u{1F600}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '') // variation selectors
    .replace(/[\u{200D}]/gu, '') // zero-width joiner
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    || 'template';
}

/** Generate unique slugs for a batch, appending _2, _3 etc. for duplicates */
export function generateUniqueSlugs(
  names: string[],
  existingSlugs: Set<string>
): string[] {
  const used = new Set(existingSlugs);
  return names.map(name => {
    let base = slugify(name);
    let slug = base;
    let counter = 1;
    while (used.has(slug)) {
      slug = `${base}_${counter}`;
      counter++;
    }
    used.add(slug);
    return slug;
  });
}

// ---------------------------------------------------------------------------
// UUID generation (simple, browser-compatible)
// ---------------------------------------------------------------------------

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ---------------------------------------------------------------------------
// Record Log Field Detection (Zone 3)
// ---------------------------------------------------------------------------

const ZONE1_COLUMNS = new Set([
  'task_description', 'location_name', 'due_datetime', 'status',
  'checklist_count', 'assignee_name', 'assignee_email',
  'completed_by_name', 'completed_by_email', 'task_id',
  'task_uuid', 'checklist_uuid', 'checklist_id',
]);

const SKIP_COLUMN_PATTERNS = [
  /^Last updated/i,
  /^Created/i,
  /^Completed datetime/i,
  /^Completed at/i,
  /^subtask_/,
];

const PHOTO_URL_PATTERN = /^https?:\/\/(web\.)?trailapp\.com/i;

const TEMPERATURE_KEYWORDS = [
  'fridge', 'freezer', 'chiller', 'drinks fridge',
  'hot water', 'cold water', 'probe', 'iced', 'boiled',
  'temp 1', 'temp 2', 'temp 3', 'temperature',
];

function isZone3Column(header: string): boolean {
  if (ZONE1_COLUMNS.has(header)) return false;
  if (SKIP_COLUMN_PATTERNS.some(p => p.test(header))) return false;
  return true;
}

function slugifyFieldName(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    || 'field';
}

function classifyField(
  header: string,
  values: string[]
): { fieldType: TrailDetectedField['field_type']; isPhoto: boolean } {
  const nonEmpty = values.filter(v => v.trim());
  if (nonEmpty.length === 0) return { fieldType: 'text', isPhoto: false };

  // Photo URLs from Trail
  if (nonEmpty.every(v => PHOTO_URL_PATTERN.test(v.trim()))) {
    return { fieldType: 'text', isPhoto: true };
  }

  // Yes/No pattern
  const yesNoCount = nonEmpty.filter(v =>
    ['yes', 'no'].includes(v.trim().toLowerCase())
  ).length;
  if (yesNoCount / nonEmpty.length >= 0.8) {
    return { fieldType: 'checkbox', isPhoto: false };
  }

  // Numeric values
  const numericValues = nonEmpty.filter(v => !isNaN(parseFloat(v.trim())) && v.trim() !== '');
  if (numericValues.length / nonEmpty.length >= 0.7) {
    const headerLower = header.toLowerCase();
    const isTemperature = TEMPERATURE_KEYWORDS.some(kw => headerLower.includes(kw));
    return { fieldType: isTemperature ? 'temperature' : 'number', isPhoto: false };
  }

  // Date patterns
  const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{2}[/\-]\d{2}[/\-]\d{4}/;
  const dateCount = nonEmpty.filter(v => datePattern.test(v.trim())).length;
  if (dateCount / nonEmpty.length >= 0.7) {
    return { fieldType: 'date', isPhoto: false };
  }

  return { fieldType: 'text', isPhoto: false };
}

function inferTempThresholds(header: string): {
  min_value: number; max_value: number;
  warn_threshold: number | null; fail_threshold: number | null;
} {
  const h = header.toLowerCase();

  if (h.includes('freezer')) {
    return { min_value: -30, max_value: 0, warn_threshold: -15, fail_threshold: -12 };
  }
  if (h.includes('fridge') || h.includes('chiller') || h.includes('drinks')) {
    return { min_value: -5, max_value: 15, warn_threshold: 5, fail_threshold: 8 };
  }
  if (h.includes('hot water')) {
    return { min_value: 30, max_value: 100, warn_threshold: 50, fail_threshold: 45 };
  }
  if (h.includes('cold water')) {
    return { min_value: 0, max_value: 25, warn_threshold: 20, fail_threshold: 22 };
  }
  if (h.includes('iced') || h.includes('ice point')) {
    return { min_value: -5, max_value: 5, warn_threshold: 1, fail_threshold: 2 };
  }
  if (h.includes('boiled') || h.includes('boiling')) {
    return { min_value: 95, max_value: 105, warn_threshold: 99, fail_threshold: 98 };
  }
  // Generic temperature
  return { min_value: -30, max_value: 120, warn_threshold: null, fail_threshold: null };
}

function deriveEvidenceTypes(fields: TrailDetectedField[], hasPhotos: boolean): string[] {
  const types = new Set<string>();

  if (fields.some(f => f.field_type === 'temperature')) types.add('temperature');
  if (fields.some(f => f.field_type === 'checkbox')) types.add('yes_no_checklist');
  if (fields.some(f => f.field_type === 'pass_fail')) types.add('pass_fail');
  if (hasPhotos) types.add('photo');
  if (fields.some(f => f.field_type === 'text' || f.field_type === 'number')) types.add('text_note');

  if (types.size === 0) types.add('text_note');

  return Array.from(types);
}

function detectRecordLogFields(
  rows: TrailRawRow[],
  allHeaders: string[]
): TrailDetectedFieldGroup {
  const zone3Headers = allHeaders.filter(isZone3Column);

  // Find which zone3 headers have data for this task group
  const activeHeaders = zone3Headers.filter(header =>
    rows.some(row => {
      const val = row[header]?.trim();
      return val && val.length > 0;
    })
  );

  const fields: TrailDetectedField[] = [];
  let hasPhotos = false;
  const repeatableLabels: string[] = [];
  let fieldOrder = 0;

  for (const header of activeHeaders) {
    const values = rows.map(r => r[header] || '').filter(v => v.trim());
    const { fieldType, isPhoto } = classifyField(header, values);

    if (isPhoto) {
      hasPhotos = true;
      continue; // Don't create a field for photo URLs
    }

    fieldOrder++;
    // Clean label: remove PapaParse duplicate suffix (_1, _2)
    const label = header.replace(/_(\d+)$/, ' $1').trim();

    const field: TrailDetectedField = {
      field_name: slugifyFieldName(header),
      field_type: fieldType,
      label,
      required: fieldType === 'temperature',
      field_order: fieldOrder,
      help_text: fieldType === 'checkbox' ? `Confirm: ${label}` : null,
      min_value: null,
      max_value: null,
      warn_threshold: null,
      fail_threshold: null,
      options: null,
      original_header: header,
    };

    // Apply temperature thresholds
    if (fieldType === 'temperature') {
      const thresholds = inferTempThresholds(header);
      field.min_value = thresholds.min_value;
      field.max_value = thresholds.max_value;
      field.warn_threshold = thresholds.warn_threshold;
      field.fail_threshold = thresholds.fail_threshold;
      repeatableLabels.push(label);
    }

    fields.push(field);
  }

  const evidenceTypes = deriveEvidenceTypes(fields, hasPhotos);

  return { fields, evidenceTypes, hasPhotos, repeatableLabels };
}

// ---------------------------------------------------------------------------
// Compliance template matching
// ---------------------------------------------------------------------------

const TRAIL_COMPLIANCE_MAPPINGS: Array<{ keywords: string[]; slug: string; name: string }> = [
  { keywords: ['fire alarm'], slug: 'fire_alarm_test_weekly', name: 'Fire Alarm Test Weekly' },
  { keywords: ['temp probe calibration', 'probe calibration'], slug: 'temperature_probe_calibration_audit', name: 'Temperature Probe Calibration Audit' },
  { keywords: ['pest activity', 'pest control'], slug: 'pest_control_device_inspection', name: 'Pest Control Device Inspection' },
  { keywords: ['sickness absence'], slug: 'staff_sickness_exclusion_log', name: 'Staff Sickness & Exclusion Log' },
  { keywords: ['first aid'], slug: 'first_aid_kit_inspection', name: 'First Aid Kit Inspection' },
  { keywords: ['emergency lighting'], slug: 'emergency_lighting_test', name: 'Emergency Lighting Test' },
];

function matchComplianceTemplate(taskName: string): { slug: string; name: string } | null {
  const lower = taskName.toLowerCase();
  for (const mapping of TRAIL_COMPLIANCE_MAPPINGS) {
    if (mapping.keywords.some(kw => lower.includes(kw))) {
      return { slug: mapping.slug, name: mapping.name };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// CSV Parsing & Deduplication
// ---------------------------------------------------------------------------

export function parseTrailCSV(csvText: string): TrailParseResult {
  const warnings: string[] = [];

  // Parse with PapaParse — handles quoted fields, embedded newlines, duplicate headers
  const parsed = Papa.parse<TrailRawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string, index: number) => {
      // PapaParse will auto-rename duplicate headers, but we provide the raw name
      // so we can identify subtask columns by their original name
      return header.trim();
    },
  });

  if (parsed.errors.length > 0) {
    const criticalErrors = parsed.errors.filter(e => e.type === 'Quotes' || e.type === 'FieldMismatch');
    if (criticalErrors.length > 0) {
      warnings.push(`CSV parsing had ${criticalErrors.length} issue(s). Some rows may be incomplete.`);
    }
  }

  const rows = parsed.data;
  if (rows.length === 0) {
    return { templates: [], totalRows: 0, dateRange: null, siteName: '', warnings: ['No data rows found in CSV.'] };
  }

  // Get actual header names from PapaParse
  const headers = parsed.meta.fields || [];

  // Find subtask description columns (subtask_0_description through subtask_19_description)
  const subtaskCols: string[] = [];
  for (let n = 0; n <= 19; n++) {
    const col = headers.find(h => h === `subtask_${n}_description`);
    if (col) subtaskCols.push(col);
  }

  // Detect site name (most common value)
  const siteName = rows[0]?.location_name?.trim() || '';

  // Group rows by task_description
  const groups = new Map<string, TrailRawRow[]>();
  let skippedEmpty = 0;

  for (const row of rows) {
    const name = row.task_description?.trim();
    if (!name) {
      skippedEmpty++;
      continue;
    }
    if (!groups.has(name)) {
      groups.set(name, []);
    }
    groups.get(name)!.push(row);
  }

  if (skippedEmpty > 0) {
    warnings.push(`${skippedEmpty} row(s) skipped — missing task name.`);
  }

  // Build templates from groups
  const templates: TrailTemplate[] = [];
  let earliestDate: Date | null = null;
  let latestDate: Date | null = null;

  for (const [name, instances] of groups) {
    // Collect unique checklist items (union across all instances)
    const itemSet = new Set<string>();
    for (const row of instances) {
      for (const col of subtaskCols) {
        const val = row[col]?.trim();
        if (val) itemSet.add(val);
      }
    }

    const checklistItems: TrailChecklistItem[] = Array.from(itemSet).map(text => ({
      id: genId(),
      text,
      required: true,
    }));

    // Collect due dates for frequency inference
    const dueDates: Date[] = [];
    for (const row of instances) {
      const dtStr = row.due_datetime?.trim();
      if (dtStr) {
        const dt = new Date(dtStr);
        if (!isNaN(dt.getTime())) {
          dueDates.push(dt);
          if (!earliestDate || dt < earliestDate) earliestDate = dt;
          if (!latestDate || dt > latestDate) latestDate = dt;
        }
      }
    }

    const { frequency, confidence } = inferFrequency(name, dueDates);
    const category = inferCategory(name);

    // Detect record log fields (Zone 3)
    const detectedFields = detectRecordLogFields(instances, headers);

    // Check if this task matches an existing compliance template
    const complianceMatch = matchComplianceTemplate(name);

    // Auto-exclude "Example task" (single instance, likely a Trail demo task)
    const isExample = name.toLowerCase() === 'example task' && instances.length <= 1;

    templates.push({
      name,
      siteName,
      instanceCount: instances.length,
      checklistItems,
      inferredCategory: category,
      inferredFrequency: frequency,
      frequencyConfidence: confidence,
      dueDates,
      included: !isExample,
      detectedFields,
      matchedTemplateSlug: complianceMatch?.slug,
      matchedTemplateName: complianceMatch?.name,
    });
  }

  // Sort by instance count descending (most common tasks first)
  templates.sort((a, b) => b.instanceCount - a.instanceCount);

  const dateRange = earliestDate && latestDate
    ? { earliest: earliestDate.toISOString().slice(0, 10), latest: latestDate.toISOString().slice(0, 10) }
    : null;

  return {
    templates,
    totalRows: rows.length,
    dateRange,
    siteName,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CATEGORY_OPTIONS = [
  { value: 'food_safety', label: 'Food Safety & Hygiene' },
  { value: 'h_and_s', label: 'Health & Safety' },
  { value: 'fire', label: 'Fire Safety' },
  { value: 'cleaning', label: 'Cleaning & Maintenance' },
  { value: 'compliance', label: 'Compliance / General' },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'triggered', label: 'Ad-hoc / Triggered' },
  { value: 'once', label: 'One-off' },
] as const;

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map(o => [o.value, o.label])
);

export const FREQUENCY_LABEL: Record<string, string> = Object.fromEntries(
  FREQUENCY_OPTIONS.map(o => [o.value, o.label])
);
