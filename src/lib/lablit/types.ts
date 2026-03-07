import type { EncryptedValue } from '@/lib/encryption';

// ---------------------------------------------------------------------------
// Labl.it integration types
// ---------------------------------------------------------------------------

/** Config stored in integration_connections.config (JSONB) */
export interface LablitConfig {
  api_key_encrypted: EncryptedValue;
  device_id: string; // UUID from Labl.it device (base64-decoded)
  device_name?: string; // Friendly label, e.g. "Kitchen Printer 1"
  account_id?: string; // Labl.it account/org ID (if the API provides one)
  base_url?: string; // Override default API URL
}

/** Label payload assembled from Opsly batch/product data */
export interface LablitLabelPayload {
  product_name: string;
  batch_code: string;
  production_date: string | null; // ISO date
  use_by_date: string | null; // ISO date
  best_before_date: string | null; // ISO date
  allergens: string[]; // Full display labels (e.g. "Milk", "Cereals containing gluten")
  may_contain_allergens: string[];
  quantity: number | null;
  unit: string | null;
  recipe_name: string | null;
  company_name: string | null;
  site_name: string | null;
  storage_conditions: string | null;
  ingredients_list: string | null;
}

/**
 * Placeholder for a product in Labl.it's system.
 * Field names will be adjusted once API docs are available.
 */
export interface LablitProduct {
  id?: string;
  name: string;
  allergens: string[];
  may_contain: string[];
  shelf_life_days?: number;
  storage_conditions?: string;
  batch_code?: string;
  use_by_date?: string;
  best_before_date?: string;
}

export interface LablitSyncResult {
  success: boolean;
  products_pushed: number;
  products_failed: number;
  errors: string[];
}

export type LablitConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending';
