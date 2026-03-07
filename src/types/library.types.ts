export type LibraryType = 
  | 'ingredients' 
  | 'ppe' 
  | 'chemicals' 
  | 'disposables' 
  | 'first_aid'
  | 'products';

export type ModuleTheme = 'checkly' | 'stockly' | 'teamly' | 'planly' | 'assetly';

// Site Configuration Types
export type TransferPricingMethod = 'cost_plus_markup' | 'wholesale_price' | 'fixed_price';

export interface SiteConfig {
  id: string;
  site_id: string;
  company_id: string;

  // Stock Sources
  receives_supplier_deliveries: boolean;
  receives_internal_transfers: boolean;
  produces_items: boolean;

  // Sales Channels
  sells_wholesale: boolean;
  sells_retail: boolean;
  sells_online: boolean;
  sells_internal: boolean; // Supplies other sites

  // Production
  production_recipe_ids: string[] | null;

  // GP Model
  transfer_pricing_method: TransferPricingMethod;
  transfer_markup_percentage: number;

  // Wizard tracking
  setup_completed: boolean;
  setup_completed_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface BaseLibraryItem {
  id: string;
  company_id: string;
  site_id?: string;
  name: string;
  description?: string;
  category?: string;
  
  // Stockly fields
  track_stock: boolean;
  current_stock: number;
  par_level?: number;
  reorder_point?: number;
  reorder_qty?: number;
  sku?: string;
  stock_value: number;
  last_stock_count_date?: string;
  low_stock_alert: boolean;
  
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface IngredientLibraryItem extends BaseLibraryItem {
  ingredient_name?: string;
  unit: string;
  unit_cost: number;
  supplier?: string;
  allergens?: string[];

  pack_size?: number;
  pack_cost?: number;
  yield_percent: number;
  yield_notes?: string;
  costing_method: 'fifo' | 'lifo' | 'average';
  is_prep_item: boolean;
  is_purchasable: boolean;
  prep_state?: string;

  // Site Ownership (NEW - flexible stock flow architecture)
  owner_site_id: string | null; // NULL = company-wide, specific site_id = site-specific

  // Sales Channels (NEW - replaces single is_saleable flag)
  is_retail_saleable: boolean;
  is_wholesale_saleable: boolean;
  is_online_saleable: boolean;

  // Channel-specific Pricing (NEW)
  retail_price: number | null;
  wholesale_price: number | null;
  online_price: number | null;

  // Nutrition per 100g (UK Big 7 + Fibre)
  nutrition_energy_kcal: number | null;
  nutrition_fat_g: number | null;
  nutrition_saturated_fat_g: number | null;
  nutrition_carbohydrate_g: number | null;
  nutrition_sugars_g: number | null;
  nutrition_fibre_g: number | null;
  nutrition_protein_g: number | null;
  nutrition_salt_g: number | null;

  // Legacy fields (DEPRECATED - use channel-specific fields above)
  /** @deprecated Use is_retail_saleable, is_wholesale_saleable, or is_online_saleable instead */
  is_saleable?: boolean;
  /** @deprecated Use retail_price, wholesale_price, or online_price instead */
  sale_price?: number;
}

export interface PPELibraryItem extends BaseLibraryItem {
  item_name: string;
  item_type?: string;
  size_options?: string[];
  standard_compliance?: string;
  linked_risks?: string[];
  cleaning_replacement_interval?: string;
  unit_cost: number;
}

export interface ChemicalLibraryItem extends BaseLibraryItem {
  product_name: string;
  manufacturer?: string;
  hazard_symbols?: string[];
  dilution_ratio?: string;
  contact_time?: string;
  required_ppe?: string[];
  coshh_sheet_url?: string;
  use_case?: string;
  storage_requirements?: string;
  first_aid_instructions?: string;
  environmental_info?: string;
  unit_cost: number;
  pack_size?: string;
  linked_risks?: string[];
}

export interface DisposableLibraryItem extends BaseLibraryItem {
  item_name: string;
  material?: string;
  eco_friendly: boolean;
  color_finish?: string;
  dimensions?: string;
  sub_category?: string;
  unit_cost: number;
  pack_size?: number;
  unit_per_pack?: string;
  storage_location?: string;
  usage_context?: string;
}

export interface FirstAidLibraryItem extends BaseLibraryItem {
  item_name: string;
  typical_usage?: string;
  expiry_period_months?: number;
  storage_requirements?: string;
  unit_cost: number;
  pack_size?: string;
  standard_compliance?: string;
  sub_category?: string;
}

export interface RecipeOutputItem extends BaseLibraryItem {
  recipe_id?: string;
  source_type: 'recipe' | 'purchased';
  base_unit: string;

  calculated_cost?: number;
  manual_cost?: number;
  cost_method: 'calculated' | 'manual';

  sale_price: number;
  margin_percent?: number;

  production_time_minutes?: number;
  batch_size?: number;
  shelf_life_days?: number;

  barcode?: string;
  image_url?: string;
  allergens?: string[];
  dietary_info?: string[];

  is_active: boolean;
  is_saleable: boolean;
}

// UK Big 7 + Fibre nutritional values (per 100g on ingredients, aggregated on recipes)
export interface NutritionData {
  energy_kcal: number;
  fat_g: number;
  saturated_fat_g: number;
  carbohydrate_g: number;
  sugars_g: number;
  fibre_g: number;
  protein_g: number;
  salt_g: number;
}

export const NUTRITION_FIELDS: Array<{
  key: keyof NutritionData;
  label: string;
  unit: string;
  indent?: boolean;
  dbColumn: string;
}> = [
  { key: 'energy_kcal', label: 'Energy', unit: 'kcal', dbColumn: 'nutrition_energy_kcal' },
  { key: 'fat_g', label: 'Fat', unit: 'g', dbColumn: 'nutrition_fat_g' },
  { key: 'saturated_fat_g', label: 'of which saturates', unit: 'g', indent: true, dbColumn: 'nutrition_saturated_fat_g' },
  { key: 'carbohydrate_g', label: 'Carbohydrate', unit: 'g', dbColumn: 'nutrition_carbohydrate_g' },
  { key: 'sugars_g', label: 'of which sugars', unit: 'g', indent: true, dbColumn: 'nutrition_sugars_g' },
  { key: 'fibre_g', label: 'Fibre', unit: 'g', dbColumn: 'nutrition_fibre_g' },
  { key: 'protein_g', label: 'Protein', unit: 'g', dbColumn: 'nutrition_protein_g' },
  { key: 'salt_g', label: 'Salt', unit: 'g', dbColumn: 'nutrition_salt_g' },
];

// Stockly Recipe Types
export type RecipeType = 'PREP' | 'DISH' | 'COMPOSITE' | 'MODIFIER';
export type RecipeStatus = 'draft' | 'active' | 'archived';

export interface Recipe {
  id: string;
  company_id: string;
  name: string;
  recipe_type: RecipeType;
  recipe_status: RecipeStatus;

  // Site Ownership (NEW - flexible stock flow architecture)
  owner_site_id: string | null; // NULL = company-wide, specific site_id = site-specific
  is_production_recipe: boolean; // TRUE = produces for sale/transfer, FALSE = internal prep

  // Recipe Details
  yield_quantity: number;
  yield_unit: string;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  shelf_life_days: number | null;
  instructions: string | null;

  // Costing
  cost_per_portion: number | null;
  labor_cost: number | null;

  // Metadata
  output_ingredient_id: string | null; // Links to ingredients_library if recipe produces an ingredient
  is_ingredient: boolean; // Can this be used as ingredient in other recipes?
  base_unit: string | null;

  // Nutrition (calculated from ingredients)
  nutrition_per_recipe: NutritionData | null;
  nutrition_per_portion: NutritionData | null;
  nutrition_per_100g: NutritionData | null;
  nutrition_data_complete: boolean;

  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type LibraryItem = 
  | IngredientLibraryItem 
  | PPELibraryItem 
  | ChemicalLibraryItem 
  | DisposableLibraryItem 
  | FirstAidLibraryItem
  | RecipeOutputItem;

export type LibraryItemInput = Partial<LibraryItem> & {
  name: string;
  company_id: string;
};

export interface StockStatus {
  label: string;
  color: 'red' | 'yellow' | 'green' | 'gray';
}

