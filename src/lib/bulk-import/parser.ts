import type { BulkImportField, ColumnMapping, ParsedRow } from './types';

/**
 * Parse a CSV or XLSX file into headers + raw row objects.
 * Uses dynamic import of SheetJS to keep it out of the main bundle.
 *
 * Handles HR exports that have metadata/title rows above the actual column headers
 * (e.g. Deputy exports: row 1 = "Team member details Downloaded by...", row 2 = actual headers).
 */
export async function parseFile(
  file: File
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const XLSX = await import('xlsx');

  let workbook: any;

  if (file.name.endsWith('.csv')) {
    const text = await file.text();
    workbook = XLSX.read(text, { type: 'string' });
  } else {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('No sheets found in the file.');

  const sheet = workbook.Sheets[sheetName];

  // Parse as array-of-arrays so we can detect the real header row
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (rawData.length < 2) throw new Error('No data rows found in the file.');

  // Find the best header row
  const headerRowIdx = findHeaderRow(rawData);
  const headerRow = rawData[headerRowIdx];

  // Build clean header names
  const headers: string[] = headerRow.map((cell: any, i: number) => {
    const val = cell != null ? String(cell).trim() : '';
    return val || `Column ${i + 1}`;
  });

  // Everything after the header row is data; skip empty/summary rows
  const dataRows = rawData.slice(headerRowIdx + 1).filter((row) => {
    const nonEmpty = row.filter((cell: any) => cell != null && String(cell).trim() !== '').length;
    return nonEmpty >= 2;
  });

  if (dataRows.length === 0) throw new Error('No data rows found after the header row.');

  // Convert to objects keyed by header name
  const rows = dataRows.map((row) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      const val = row[i];
      obj[headers[i]] = val != null ? String(val).trim() : '';
    }
    return obj;
  });

  return { headers, rows };
}

/**
 * Find the row index that's most likely the header row.
 * Scores each row by: count of non-empty unique string cells that look like labels
 * (not purely numeric, not dates, not very long text).
 */
function findHeaderRow(rawData: any[][]): number {
  let bestIdx = 0;
  let bestScore = 0;

  const checkRows = Math.min(rawData.length, 10);

  for (let i = 0; i < checkRows; i++) {
    const row = rawData[i];
    if (!row) continue;

    let score = 0;
    const seen = new Set<string>();

    for (const cell of row) {
      const val = cell != null ? String(cell).trim() : '';
      if (!val) continue;
      if (/^\d+(\.\d+)?$/.test(val)) continue; // skip pure numbers
      if (val.length > 60) continue; // skip long text (likely data)
      const lower = val.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Auto-map source column headers to target fields using exact and alias matching.
 * Returns a ColumnMapping for every source column.
 *
 * Special handling: if both "first name" and "last name" columns exist,
 * they are mapped to virtual _first_name / _last_name targets (not full_name)
 * so that applyMapping can concatenate them.
 */
export function autoMapColumns(
  headers: string[],
  fields: BulkImportField[],
  sampleRows: Record<string, string>[] = []
): ColumnMapping[] {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  // Detect first name + last name pair — if both exist, use virtual fields
  const hasFirstAndLast =
    lowerHeaders.some((h) => h === 'first name' || h === 'first_name' || h === 'firstname') &&
    lowerHeaders.some((h) => h === 'last name' || h === 'last_name' || h === 'lastname' || h === 'surname');

  const usedFields = new Set<string>();

  return headers.map((header) => {
    const lower = header.toLowerCase().trim();
    const samples = sampleRows.slice(0, 3).map((r) => r[header] || '');

    // Handle first name / last name virtual mapping
    if (hasFirstAndLast) {
      if (lower === 'first name' || lower === 'first_name' || lower === 'firstname') {
        return { sourceColumn: header, targetField: '_first_name', confidence: 'alias' as const, sampleValues: samples };
      }
      if (lower === 'last name' || lower === 'last_name' || lower === 'lastname' || lower === 'surname') {
        return { sourceColumn: header, targetField: '_last_name', confidence: 'alias' as const, sampleValues: samples };
      }
    }

    // Try exact match on field key
    const exactByKey = fields.find(
      (f) => !usedFields.has(f.key) && f.key === lower
    );
    if (exactByKey) {
      usedFields.add(exactByKey.key);
      return { sourceColumn: header, targetField: exactByKey.key, confidence: 'exact' as const, sampleValues: samples };
    }

    // Try exact match on field label
    const exactByLabel = fields.find(
      (f) => !usedFields.has(f.key) && f.label.toLowerCase() === lower
    );
    if (exactByLabel) {
      usedFields.add(exactByLabel.key);
      return { sourceColumn: header, targetField: exactByLabel.key, confidence: 'exact' as const, sampleValues: samples };
    }

    // Try alias match
    const aliasMatch = fields.find(
      (f) =>
        !usedFields.has(f.key) &&
        f.aliases.some((a) => a.toLowerCase() === lower)
    );
    if (aliasMatch) {
      usedFields.add(aliasMatch.key);
      return { sourceColumn: header, targetField: aliasMatch.key, confidence: 'alias' as const, sampleValues: samples };
    }

    // Try partial match: header contains alias (one-directional only).
    // Require alias >= 4 chars to avoid false positives from short aliases.
    const partialMatch = fields.find(
      (f) =>
        !usedFields.has(f.key) &&
        f.aliases.some((a) => {
          const aLower = a.toLowerCase();
          return aLower.length >= 4 && lower.includes(aLower);
        })
    );
    if (partialMatch) {
      usedFields.add(partialMatch.key);
      return { sourceColumn: header, targetField: partialMatch.key, confidence: 'alias' as const, sampleValues: samples };
    }

    return { sourceColumn: header, targetField: null, confidence: 'unmapped' as const, sampleValues: samples };
  });
}

/**
 * Apply column mappings to raw rows, running transforms and validators.
 * Handles _first_name + _last_name virtual fields → full_name concatenation.
 */
export function applyMapping(
  rawRows: Record<string, string>[],
  mappings: ColumnMapping[],
  fields: BulkImportField[]
): ParsedRow[] {
  // Build lookup: targetField → sourceColumn
  const fieldToSource = new Map<string, string>();
  for (const m of mappings) {
    if (m.targetField) {
      fieldToSource.set(m.targetField, m.sourceColumn);
    }
  }

  // Detect first_name / last_name → full_name concatenation needed
  const firstNameSource = fieldToSource.get('_first_name');
  const lastNameSource = fieldToSource.get('_last_name');
  const hasFullName = fieldToSource.has('full_name');
  const needsNameConcat = !hasFullName && (firstNameSource || lastNameSource);

  const fieldMap = new Map<string, BulkImportField>();
  for (const f of fields) {
    fieldMap.set(f.key, f);
  }

  return rawRows.map((raw, idx) => {
    const row: ParsedRow = {
      _rowIndex: idx + 1,
      _errors: [],
      _warnings: [],
      _status: 'valid',
      _included: true,
    };

    // Map values with transforms
    for (const [targetField, sourceColumn] of fieldToSource) {
      // Skip virtual fields
      if (targetField.startsWith('_')) continue;

      const field = fieldMap.get(targetField);
      if (!field) continue;

      let value: any = raw[sourceColumn] || '';

      if (value && field.transform) {
        value = field.transform(value);
      } else if (!value) {
        value = null;
      }

      row[targetField] = value;
    }

    // Handle first_name + last_name concatenation
    if (needsNameConcat) {
      const first = firstNameSource ? (raw[firstNameSource] || '').trim() : '';
      const last = lastNameSource ? (raw[lastNameSource] || '').trim() : '';
      row.full_name = [first, last].filter(Boolean).join(' ') || null;
    }

    // Validate
    for (const field of fields) {
      if (field.validate) {
        const error = field.validate(row[field.key]);
        if (error) {
          if (field.required) {
            row._errors.push({ field: field.key, message: error });
          } else {
            row._warnings.push(`${field.label}: ${error}`);
          }
        }
      } else if (field.required && !row[field.key]) {
        row._errors.push({ field: field.key, message: `${field.label} is required` });
      }
    }

    // Set status based on errors/warnings
    if (row._errors.length > 0) {
      row._status = 'error';
      row._included = false;
    } else if (row._warnings.length > 0) {
      row._status = 'warning';
    }

    return row;
  });
}

/**
 * Re-validate rows after inline edits. Preserves _included state.
 */
export function validateRows(
  rows: ParsedRow[],
  fields: BulkImportField[]
): ParsedRow[] {
  return rows.map((row) => {
    const newErrors: ParsedRow['_errors'] = [];
    const newWarnings: string[] = [];

    for (const field of fields) {
      if (field.validate) {
        const error = field.validate(row[field.key]);
        if (error) {
          if (field.required) {
            newErrors.push({ field: field.key, message: error });
          } else {
            newWarnings.push(`${field.label}: ${error}`);
          }
        }
      } else if (field.required && !row[field.key]) {
        newErrors.push({ field: field.key, message: `${field.label} is required` });
      }
    }

    let status: ParsedRow['_status'] = 'valid';
    if (row._status === 'duplicate') {
      status = 'duplicate';
    } else if (newErrors.length > 0) {
      status = 'error';
    } else if (newWarnings.length > 0) {
      status = 'warning';
    }

    return {
      ...row,
      _errors: newErrors,
      _warnings: newWarnings,
      _status: status,
      _included: status === 'error' ? false : row._included,
    };
  });
}

/**
 * Mark duplicate rows (by email) within the file and against existing emails.
 */
export function markDuplicates(
  rows: ParsedRow[],
  existingEmails: Set<string>
): ParsedRow[] {
  const seenEmails = new Map<string, number>();

  return rows.map((row) => {
    const email = (row.email || '').toLowerCase().trim();
    if (!email) return row;

    // Check against existing DB emails
    if (existingEmails.has(email)) {
      return {
        ...row,
        _status: 'duplicate' as const,
        _included: false,
        _warnings: [...row._warnings, 'This email already exists in your team'],
      };
    }

    // Check for duplicates within the file
    const prevRow = seenEmails.get(email);
    if (prevRow !== undefined) {
      return {
        ...row,
        _status: 'duplicate' as const,
        _included: false,
        _warnings: [...row._warnings, `Duplicate email (same as row ${prevRow})`],
      };
    }

    seenEmails.set(email, row._rowIndex);
    return row;
  });
}

/**
 * Generate a CSV template with example data for download.
 */
export function generateTemplate(fields: BulkImportField[]): string {
  const headers = fields.filter(f => f.key !== 'site_name').map(f => f.label);
  headers.splice(5, 0, 'Site / Location');

  const example1 = [
    'Sarah Jones', 'sarah.jones@example.com', '07700 900123', 'Staff', 'Barista',
    'Camden Site', 'FOH', 'Sarah', '15/06/1995', '01/03/2024', 'permanent',
    'EMP001', 'John Jones', '07700 900456', '10 High Street, London', '35', 'Female', 'she/her'
  ];
  const example2 = [
    'James Smith', 'james.smith@example.com', '07700 900789', 'Manager', 'Head Chef',
    'Soho Site', 'BOH', 'Jim', '22/11/1988', '15/01/2023', 'permanent',
    'EMP002', 'Mary Smith', '07700 900321', '5 Park Lane, London', '40', 'Male', 'he/him'
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
