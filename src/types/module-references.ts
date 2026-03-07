/**
 * Module References System - TypeScript Types
 * 
 * Provides type definitions for cross-module entity linking
 * Supports linking entities across Checkly, Stockly, and Teamly modules
 */

export type ModuleName = 'checkly' | 'stockly' | 'teamly';

/**
 * Common table names for each module
 */
export const MODULE_TABLES = {
  checkly: {
    tasks: 'checklist_tasks',
    templates: 'task_templates',
    incidents: 'incidents',
    assets: 'assets',
  },
  stockly: {
    waste_logs: 'waste_logs',
    deliveries: 'deliveries',
    stock_counts: 'stock_counts',
    stock_items: 'stock_items',
    transfers: 'transfers',
  },
  teamly: {
    employees: 'profiles',
    shifts: 'active_shifts',
    attendance: 'attendance_logs',
  },
} as const;

/**
 * Full module reference record from database
 */
export interface ModuleReference {
  id: string;
  source_module: ModuleName;
  source_table: string;
  source_id: string;
  target_module: ModuleName;
  target_table: string;
  target_id: string;
  link_type?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  created_by_profile_id?: string | null;
  company_id: string;
}

/**
 * Input for creating a new module reference
 */
export interface CreateModuleReferenceInput {
  source_module: ModuleName;
  source_table: string;
  source_id: string;
  target_module: ModuleName;
  target_table: string;
  target_id: string;
  link_type?: string;
  metadata?: Record<string, any>;
}

/**
 * Entity that links TO a target entity (source perspective)
 * Returned by get_linked_entities() function
 */
export interface LinkedEntity {
  link_id: string;
  source_module: string;
  source_table: string;
  source_id: string;
  link_type?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  created_by_profile_id?: string | null;
}

/**
 * Entity that a source entity links TO (target perspective)
 * Returned by get_references_from() function
 */
export interface ReferencedEntity {
  link_id: string;
  target_module: string;
  target_table: string;
  target_id: string;
  link_type?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  created_by_profile_id?: string | null;
}

/**
 * Parameters for unlinking entities
 */
export interface UnlinkEntitiesParams {
  source_module: string;
  source_table: string;
  source_id: string;
  target_module: string;
  target_table: string;
  target_id: string;
}

/**
 * Type guard to check if a value is a valid ModuleName
 */
export function isModuleName(value: string): value is ModuleName {
  return value === 'checkly' || value === 'stockly' || value === 'teamly';
}

/**
 * Type guard to check if an object is a valid CreateModuleReferenceInput
 */
export function isValidModuleReferenceInput(
  input: any
): input is CreateModuleReferenceInput {
  return (
    typeof input === 'object' &&
    input !== null &&
    isModuleName(input.source_module) &&
    typeof input.source_table === 'string' &&
    typeof input.source_id === 'string' &&
    isModuleName(input.target_module) &&
    typeof input.target_table === 'string' &&
    typeof input.target_id === 'string' &&
    (input.link_type === undefined || typeof input.link_type === 'string') &&
    (input.metadata === undefined || typeof input.metadata === 'object')
  );
}
