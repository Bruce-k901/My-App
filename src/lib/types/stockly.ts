/**
 * Stockly Module TypeScript Types
 * Types for inventory management, stock counting, and production planning
 */

export interface StorageArea {
  id: string;
  company_id: string;
  name: string;
  division: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  ingredient_count?: number; // Computed field from join
}

export type StorageAreaInsert = Omit<
  StorageArea, 
  'id' | 'created_at' | 'updated_at' | 'ingredient_count'
>;

export type StorageAreaUpdate = Partial<StorageAreaInsert>;

// Division constants
export const STORAGE_DIVISIONS = [
  'Bar',
  'Kitchen',
  'FOH',
  'Bakery',
  'Warehouse',
  'Other'
] as const;

export type StorageDivision = typeof STORAGE_DIVISIONS[number];

// ============================================================================
// Stock Count Types (Library-Based System)
// ============================================================================

export type StockCountStatus = 'draft' | 'active' | 'finalized' | 'locked';
export type StockCountFrequency = 'weekly' | 'monthly' | 'adhoc';
export type CountItemStatus = 'pending' | 'counted' | 'skipped';
export type LibraryType = string; // Dynamic - can be any library type

export interface StockCount {
  id: string;
  company_id: string;
  name: string;
  count_date: string; // ISO date string
  frequency: StockCountFrequency;
  status: StockCountStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  finalized_at: string | null;
  finalized_by: string | null;
  locked_at: string | null;
  locked_by: string | null;
  total_items: number;
  items_counted: number;
  variance_count: number;
  total_variance_value: number;
  libraries_included: LibraryType[]; // NEW: Array of libraries included
}

export interface StockCountItem {
  id: string;
  stock_count_id: string;
  storage_area_id: string | null; // Now nullable - pre-assigned area (may be null)
  ingredient_id: string;
  
  // NEW FIELDS
  library_type: LibraryType;
  counted_storage_area_id: string | null; // Where item was actually found during counting
  item_type: string | null;
  
  // Stock movement
  opening_stock: number | null;
  stock_in: number;
  sales: number;
  waste: number;
  transfers_in: number;
  transfers_out: number;
  theoretical_closing: number | null;
  
  // Count data
  counted_quantity: number | null;
  variance_quantity: number | null;
  variance_percentage: number | null;
  variance_value: number | null;
  
  // Metadata
  unit_of_measurement: string | null;
  unit_cost: number | null;
  status: CountItemStatus;
  counted_at: string | null;
  notes: string | null;
  created_at: string;
  
  // Joined data
  ingredient?: Ingredient;
  storage_area?: StorageArea; // Pre-assigned area (may be null)
  counted_storage_area?: StorageArea; // Where actually found during counting
}

export interface StockCountWithDetails extends StockCount {
  items?: StockCountItem[];
}

// Library info for selection
export interface LibraryInfo {
  type: LibraryType;
  name: string;
  count: number;
  description: string;
  tableName?: string; // The actual table name (e.g., 'ingredients_library')
}

export type StockCountInsert = Omit<
  StockCount,
  'id' | 'created_at' | 'finalized_at' | 'finalized_by' | 'locked_at' | 'locked_by' | 'total_items' | 'items_counted' | 'variance_count' | 'total_variance_value'
>;

export type StockCountUpdate = Partial<StockCountInsert>;

// Ingredient interface (for stock count items)
export interface Ingredient {
  id: string;
  ingredient_name?: string;
  name?: string;
  unit_of_measurement?: string;
  cost_per_unit?: number;
  current_stock_level?: number;
  storage_area_id?: string;
}

