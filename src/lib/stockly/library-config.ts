/**
 * Central configuration for all library tables.
 * Single source of truth for table names, name fields, and accepted columns.
 */

export interface LibraryTableConfig {
  table: string;
  label: string;
  nameField: string;
  /** Columns this table accepts when receiving a moved item */
  moveColumns: readonly string[];
}

// Column groups
const CORE = ['company_id', 'supplier', 'department', 'notes'] as const;
const COST = ['unit_cost', 'pack_cost', 'pack_size', 'unit'] as const;
const STOCK = ['track_stock', 'current_stock', 'par_level', 'reorder_point', 'reorder_qty', 'sku'] as const;

export const LIBRARY_TABLES: LibraryTableConfig[] = [
  {
    table: 'ingredients_library', label: 'Ingredients', nameField: 'ingredient_name',
    moveColumns: [...CORE, ...COST, ...STOCK, 'category'],
  },
  {
    table: 'chemicals_library', label: 'Chemicals', nameField: 'product_name',
    moveColumns: [...CORE, 'unit_cost', 'pack_cost', 'pack_size', 'unit'],
    // No category (uses use_case), no stock tracking columns
  },
  {
    table: 'disposables_library', label: 'Disposables', nameField: 'item_name',
    moveColumns: [...CORE, 'pack_cost', 'pack_size', 'unit', ...STOCK, 'category'],
  },
  {
    table: 'packaging_library', label: 'Packaging', nameField: 'item_name',
    moveColumns: [...CORE, 'pack_cost', 'pack_size', 'unit', ...STOCK, 'category'],
  },
  {
    table: 'ppe_library', label: 'PPE', nameField: 'item_name',
    moveColumns: [...CORE, ...COST, ...STOCK, 'category'],
  },
  {
    table: 'first_aid_supplies_library', label: 'First Aid', nameField: 'item_name',
    moveColumns: [...CORE, 'unit_cost', 'pack_cost', 'pack_size', 'unit', ...STOCK, 'category'],
  },
  {
    table: 'drinks_library', label: 'Drinks', nameField: 'item_name',
    moveColumns: [...CORE, ...COST, ...STOCK, 'category'],
  },
  {
    table: 'glassware_library', label: 'Glassware', nameField: 'item_name',
    moveColumns: [...CORE, ...COST, ...STOCK, 'category'],
  },
  {
    table: 'serving_equipment_library', label: 'Utensils & Tools', nameField: 'item_name',
    moveColumns: [...CORE, ...COST, ...STOCK, 'category'],
  },
];

/** All possible columns that might be copied during a move */
export const STANDARD_COLUMNS = [
  'company_id', 'supplier', 'unit_cost', 'pack_cost', 'pack_size', 'unit',
  'department', 'track_stock', 'current_stock', 'par_level', 'reorder_point',
  'reorder_qty', 'sku', 'category', 'notes',
] as const;

/** Get all libraries except the given source (for move targets) */
export function getMoveTargets(sourceTable: string): LibraryTableConfig[] {
  return LIBRARY_TABLES.filter(t => t.table !== sourceTable);
}

/** Get config for a specific table */
export function getLibraryConfig(tableName: string): LibraryTableConfig | undefined {
  return LIBRARY_TABLES.find(t => t.table === tableName);
}
