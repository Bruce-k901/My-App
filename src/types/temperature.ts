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


