// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";

// Processes pending incident notifications and sends to Slack webhook.
// Schedule via Supabase cron: every 1-5 minutes depending on urgency.

async function sendSlack(webhookUrl: string, payload: any) {
  const text = `🔥 Incident: ${payload.type} (severity: ${payload.severity})\n` +
    `Site: ${payload.site_id} | Company: ${payload.company_id}\n` +
    `Description: ${payload.description}`;
  const body = { text };
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Slack webhook failed: ${res.status}`);
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const slackWebhook = Deno.env.get("INCIDENT_SLACK_WEBHOOK_URL");
  if (!slackWebhook) {
    return new Response("Missing INCIDENT_SLACK_WEBHOOK_URL", { status: 500 });
  }

  const { data: pending, error } = await supabase
    .from("incident_notifications")
    .select("id, incident_id, payload")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) return new Response(`Query error: ${error.message}`, { status: 500 });
  if (!pending || pending.length === 0) return new Response(JSON.stringify({ processed: 0 }), { headers: { "Content-Type": "application/json" } });

  let processed = 0;
  for (const n of pending) {
    try {
      await sendSlack(slackWebhook, n.payload ?? {});
      await supabase
        .from("incident_notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", n.id);
      processed++;
    } catch (e) {
      await supabase
        .from("incident_notifications")
        .update({ status: "failed" })
        .eq("id", n.id);
    }
  }

  return new Response(JSON.stringify({ processed }), {
    headers: { "Content-Type": "application/json" },
  });
});