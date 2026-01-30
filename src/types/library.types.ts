export type LibraryType = 
  | 'ingredients' 
  | 'ppe' 
  | 'chemicals' 
  | 'disposables' 
  | 'first_aid'
  | 'products';

export type ModuleTheme = 'checkly' | 'stockly' | 'teamly';

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
  is_saleable: boolean;
  sale_price?: number;
  prep_state?: string;
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

