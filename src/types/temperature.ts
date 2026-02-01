export interface TemperatureEvaluation {
  status: "ok" | "warning" | "breach";
  direction: "high" | "low" | "within";
  reason: string;
  min?: number | null;
  max?: number | null;
  warningTolerance?: number;
  breachTolerance?: number;
}

export interface TemperatureLogWithMeta {
  id: string;
  recorded_at: string | null;
  reading: number | null;
  unit: string | null;
  status: string | null;
  meta?: {
    evaluation?: TemperatureEvaluation;
    [key: string]: unknown;
  } | null;
}

export interface TemperatureBreachAction {
  id: string;
  action_type: "monitor" | "callout";
  status: string;
  due_at: string | null;
  completed_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  temperature_log: TemperatureLogWithMeta | null;
}

// ============================================================================
// Site Equipment Positions Types
// ============================================================================

export interface SiteEquipmentPosition {
  id: string;
  site_id: string;
  company_id: string;
  nickname: string;
  position_type: 'chilled' | 'frozen' | 'hot_holding' | 'other' | null;
  current_asset_id: string | null;
  location_notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data (optional)
  asset?: {
    id: string;
    name: string;
    working_temp_min: number | null;
    working_temp_max: number | null;
    category?: string | null;
    brand?: string | null;
    model?: string | null;
  };
  site?: {
    id: string;
    name: string;
  };
}

export interface TemperatureLogWithPosition {
  id: string;
  asset_id: string | null;
  position_id: string | null;
  reading: number;
  status: 'ok' | 'warning' | 'critical' | 'failed' | string;
  recorded_at: string;
  day_part: string | null;
  unit?: string | null;
  notes?: string | null;
  recorded_by?: string | null;
  
  // For display - resolved nickname
  display_name?: string;
  
  // Joined data
  position?: SiteEquipmentPosition;
  asset?: {
    id: string;
    name: string;
    working_temp_min: number | null;
    working_temp_max: number | null;
    category?: string | null;
  };
}


