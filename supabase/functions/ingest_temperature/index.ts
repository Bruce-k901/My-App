import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";
import * as crypto from "https://deno.land/std@0.224.0/crypto/mod.ts";

interface TemperaturePayload {
  tenant_id: string;
  site_id: string;
  asset_id?: string | null;
  reading: number;
  unit?: string;
  recorded_at?: string;
  source?: string;
  meta?: Record<string, unknown>;
}

type ThresholdEvaluation = {
  status: "ok" | "warning" | "breach";
  direction: "high" | "low" | "within";
  reason: string;
  min?: number | null;
  max?: number | null;
  warningTolerance: number;
  breachTolerance: number;
};

const WARNING_TOLERANCE = 1;
const BREACH_TOLERANCE = 2;
const FALLBACK_RANGE = { min: -2, max: 8 };

function hex(arrayBuffer: ArrayBuffer) {
  return [...new Uint8Array(arrayBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sign(secret: string, data: string) {
  const key = await crypto.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.sign("HMAC", key, new TextEncoder().encode(data));
  return hex(signature);
}

async function verifySignature(secret: string, data: string, provided: string | null) {
  if (!provided) return { valid: false, expected: "", provided: "" };
  const expected = await sign(secret, data);
  const valid = expected.length === provided.length && crypto.timingSafeEqual(
    new TextEncoder().encode(expected),
    new TextEncoder().encode(provided)
  );
  return { valid, expected, provided };
}

function evaluateReading(
  reading: number,
  workingMin: number | null,
  workingMax: number | null
): ThresholdEvaluation {
  const min = workingMin ?? FALLBACK_RANGE.min;
  const max = workingMax ?? FALLBACK_RANGE.max;

  // Track whether we are using fallback ranges for messaging.
  const usedFallback = workingMin === null && workingMax === null;

  const highBreach = reading > max + BREACH_TOLERANCE;
  const lowBreach = reading < min - BREACH_TOLERANCE;
  const highWarn = reading > max + WARNING_TOLERANCE;
  const lowWarn = reading < min - WARNING_TOLERANCE;

  if (highBreach) {
    return {
      status: "breach",
      direction: "high",
      reason: usedFallback
        ? `Reading ${reading}°C is above safe limit ${max}°C`
        : `Reading ${reading}°C exceeded asset max ${max}°C (+${BREACH_TOLERANCE}°C tolerance)`,
      min: workingMin,
      max: workingMax,
      warningTolerance: WARNING_TOLERANCE,
      breachTolerance: BREACH_TOLERANCE,
    };
  }

  if (lowBreach) {
    return {
      status: "breach",
      direction: "low",
      reason: usedFallback
        ? `Reading ${reading}°C is below safe limit ${min}°C`
        : `Reading ${reading}°C dropped below asset min ${min}°C (-${BREACH_TOLERANCE}°C tolerance)`,
      min: workingMin,
      max: workingMax,
      warningTolerance: WARNING_TOLERANCE,
      breachTolerance: BREACH_TOLERANCE,
    };
  }

  if (highWarn) {
    return {
      status: "warning",
      direction: "high",
      reason: usedFallback
        ? `Reading ${reading}°C is approaching the high limit ${max}°C`
        : `Reading ${reading}°C is above asset max ${max}°C (+${WARNING_TOLERANCE}°C tolerance)`,
      min: workingMin,
      max: workingMax,
      warningTolerance: WARNING_TOLERANCE,
      breachTolerance: BREACH_TOLERANCE,
    };
  }

  if (lowWarn) {
    return {
      status: "warning",
      direction: "low",
      reason: usedFallback
        ? `Reading ${reading}°C is approaching the low limit ${min}°C`
        : `Reading ${reading}°C is below asset min ${min}°C (-${WARNING_TOLERANCE}°C tolerance)`,
      min: workingMin,
      max: workingMax,
      warningTolerance: WARNING_TOLERANCE,
      breachTolerance: BREACH_TOLERANCE,
    };
  }

  return {
    status: "ok",
    direction: "within",
    reason: "Reading within configured temperature range",
    min: workingMin,
    max: workingMax,
    warningTolerance: WARNING_TOLERANCE,
    breachTolerance: BREACH_TOLERANCE,
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
  }

  const rawBody = await req.text();
  if (!rawBody) {
    return jsonResponse({ error: "Empty payload" }, { status: 400 });
  }

  let payload: TemperaturePayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, { status: 400 });
  }

  const signature = req.headers.get("x-temp-signature");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  console.log("Temperature ingest using Supabase URL:", supabaseUrl);

  const supabase = createClient(
    supabaseUrl!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: keyRow, error: keyError } = await supabase
    .from("temperature_ingest_keys")
    .select("secret")
    .eq("company_id", payload.tenant_id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (keyError || !keyRow) {
    return jsonResponse({ error: "No active ingest key for tenant" }, { status: 401 });
  }

  const verification = await verifySignature(keyRow.secret, rawBody, signature);
  if (!verification.valid) {
    return jsonResponse({ error: "Invalid signature" }, { status: 401 });
  }

  if (!payload.site_id || typeof payload.reading !== "number") {
    return jsonResponse({ error: "Missing site_id or reading" }, { status: 400 });
  }

  const recordedAt = payload.recorded_at ? new Date(payload.recorded_at).toISOString() : new Date().toISOString();

  let asset: {
    id: string;
    name: string | null;
    working_temp_min: number | null;
    working_temp_max: number | null;
  } | null = null;

  if (payload.asset_id) {
    const { data: assetRow, error: assetError } = await supabase
      .from("assets")
      .select("id, name, working_temp_min, working_temp_max")
      .eq("id", payload.asset_id)
      .maybeSingle();

    if (assetError) {
      console.error("Failed to fetch asset details", assetError);
    } else {
      asset = assetRow;
    }
  }

  const evaluation = evaluateReading(
    payload.reading,
    asset?.working_temp_min ?? null,
    asset?.working_temp_max ?? null
  );

  const meta = {
    ...payload.meta,
    evaluation,
    asset: asset
      ? {
        id: asset.id,
        name: asset.name,
        working_temp_min: asset.working_temp_min,
        working_temp_max: asset.working_temp_max,
      }
      : null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("temperature_logs")
    .insert({
      company_id: payload.tenant_id,
      site_id: payload.site_id,
      asset_id: payload.asset_id ?? null,
      reading: payload.reading,
      unit: payload.unit ?? "celsius",
      recorded_at: recordedAt,
      source: payload.source ?? "ingest",
      meta,
      status: evaluation.status,
    })
    .select("id, status")
    .single();

  if (insertError) {
    console.error("Temperature insert error:", insertError);
    return jsonResponse({ error: insertError.message }, { status: 500 });
  }

  console.log("Inserted temperature log", inserted);

  if (evaluation.status === "breach" && inserted?.id) {
    const dueMonitor = new Date(recordedAt);
    dueMonitor.setMinutes(dueMonitor.getMinutes() + 30);
    const dueCallout = new Date(recordedAt);
    dueCallout.setMinutes(dueCallout.getMinutes() + 15);

    const actionPayloads = [
      {
        company_id: payload.tenant_id,
        site_id: payload.site_id,
        temperature_log_id: inserted.id,
        action_type: "monitor" as const,
        status: "pending" as const,
        due_at: dueMonitor.toISOString(),
        metadata: {
          evaluation,
          recommended_interval_minutes: 30,
          recorded_at: recordedAt,
        },
      },
      {
        company_id: payload.tenant_id,
        site_id: payload.site_id,
        temperature_log_id: inserted.id,
        action_type: "callout" as const,
        status: "pending" as const,
        due_at: dueCallout.toISOString(),
        metadata: {
          evaluation,
          recommended_action: "Escalate to manager/contractor",
          recorded_at: recordedAt,
        },
      },
    ];

    const { error: actionError } = await supabase
      .from("temperature_breach_actions")
      .upsert(actionPayloads, { onConflict: "temperature_log_id,action_type" });

    if (actionError) {
      console.error("Failed to upsert breach actions", actionError);
    }
  }

  return jsonResponse(
    {
      id: inserted?.id,
      status: inserted?.status ?? "ok",
      evaluation,
    },
    { status: 201 },
  );
});
