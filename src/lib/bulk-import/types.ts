/** Field definition for a bulk import target */
export interface BulkImportField {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'select';
  selectOptions?: string[];
  transform?: (value: string) => any;
  validate?: (value: any) => string | null;
}

/** Module-specific import configuration (reusable across modules) */
export interface ModuleImportConfig {
  moduleId: string;
  moduleName: string;
  targetTable: string;
  fields: BulkImportField[];
  maxRows: number;
  batchSize: number;
  duplicateCheckField?: string;
  duplicateCheckScope?: string;
}

/** Mapping from a source column to a target field */
export interface ColumnMapping {
  sourceColumn: string;
  targetField: string | null;
  confidence: 'exact' | 'alias' | 'manual' | 'unmapped';
  sampleValues: string[];
}

/** A parsed + validated row ready for review */
export interface ParsedRow {
  _rowIndex: number;
  _errors: RowError[];
  _warnings: string[];
  _status: 'valid' | 'error' | 'warning' | 'duplicate';
  _included: boolean;
  [key: string]: any;
}

export interface RowError {
  field: string;
  message: string;
}

/** Result returned by the bulk import API */
export interface BulkImportResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ rowIndex: number; field?: string; message: string }>;
  logId?: string;
}
