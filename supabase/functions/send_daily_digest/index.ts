// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";
import sendgrid from "https://esm.sh/@sendgrid/mail@7.7.0";

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

Deno.serve(async () => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SENDGRID_KEY = Deno.env.get("SENDGRID_KEY");
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  // Archive notifications older than 14 days
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("notifications").update({ status: "archived" }).lt(
    "created_at",
    cutoff,
  ).eq("status", "active");

  // 1. Get managers/admins and their preferences
  const { data: recipients, error: rErr } = await supabase
    .from("profiles")
    .select("id,email,company_id,site_id,app_role")
    .in("role", ["manager", "admin"]);
  if (rErr) {
    return new Response(`Recipient error: ${rErr.message}`, { status: 500 });
  }

  const { data: settings } = await supabase
    .from("profile_settings")
    .select(
      "user_id, receive_email_digests, include_incidents, include_tasks, notify_temperature_warnings",
    );
  const settingsMap = new Map<string, any>();
  for (const s of settings || []) settingsMap.set((s as any).user_id, s);

  // 2. Summaries for past 24h
  const now = new Date();
  const past24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const today = isoDate(now);

  const { data: incidents } = await supabase
    .from("incidents")
    .select("site_id, count(*)")
    .gte("created_at", past24)
    .eq("status", "open")
    .group("site_id");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("site_id, count(*)")
    .eq("due_date", today)
    .neq("status", "completed")
    .group("site_id");

  const { data: tempFailed } = await supabase
    .from("temperature_logs")
    .select("site_id, count(*)")
    .gte("recorded_at", past24)
    .eq("status", "failed")
    .group("site_id");

  const incMap = new Map<string, number>();
  for (const i of incidents || []) {
    incMap.set((i as any).site_id, Number((i as any).count));
  }
  const taskMap = new Map<string, number>();
  for (const t of tasks || []) {
    taskMap.set((t as any).site_id, Number((t as any).count));
  }
  const tempMap = new Map<string, number>();
  for (const x of tempFailed || []) {
    tempMap.set((x as any).site_id, Number((x as any).count));
  }

  // 3. Compose message per site/company and send
  if (SENDGRID_KEY) sendgrid.setApiKey(SENDGRID_KEY);

  for (const r of recipients || []) {
    const userId = (r as any).id as string;
    const s = settingsMap.get(userId) || {
      receive_email_digests: true,
      include_incidents: true,
      include_tasks: true,
      notify_temperature_warnings: true,
    };

    const siteId = (r as any).site_id as string | null;
    const role = (r as any).role as string;
    const companyId = (r as any).company_id as string;
    const email = (r as any).email as string;

    const openIncidents = siteId ? incMap.get(siteId) || 0 : 0;
    const incomplete = siteId ? taskMap.get(siteId) || 0 : 0;
    const tempWarnings = siteId ? tempMap.get(siteId) || 0 : 0;

    const lines: string[] = [];
    lines.push(
      `Daily Digest for ${role === "admin" ? "All Sites" : "Your Site"}:\n`,
    );
    if (s.include_incidents) lines.push(`• Open Incidents: ${openIncidents}`);
    if (s.include_tasks) lines.push(`• Incomplete Tasks: ${incomplete}`);
    if (s.notify_temperature_warnings) {
      lines.push(`• Temperature Warnings (24h): ${tempWarnings}`);
    }
    lines.push("\nLogin to Opsly for full details.");
    const msg = lines.join("\n");

    // Insert in-app notification
    const severity = openIncidents > 0 ? "warning" : "info";
    await supabase.from("notifications").insert({
      company_id: companyId,
      site_id: siteId,
      type: "digest",
      title: "Daily Compliance Summary",
      message: msg,
      severity,
      recipient_role: role,
    });

    // Optional email (HTML + text)
    if (SENDGRID_KEY && s.receive_email_digests && email) {
      try {
        const siteName = siteId
          ? ((await supabase.from("sites").select("name").eq("id", siteId)
            .limit(1)).data?.[0]?.name || siteId)
          : "All Sites";
        const html = `
          <div style="font-family: Inter,ui-sans-serif,system-ui,Arial; color:#0f172a; max-width:560px; margin:0 auto;">
            <div style="background: linear-gradient(135deg, #D37E91 0%, #b0607a 100%); padding:24px; border-radius:12px 12px 0 0; text-align:center;">
              <div style="margin:0 auto 12px; text-align:center;"><svg width="60" height="40" viewBox="0 0 200 130" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="24" height="110" rx="12" fill="#1B2624"/><rect x="44" y="30" width="24" height="90" rx="12" fill="#8B2E3E"/><rect x="78" y="15" width="24" height="105" rx="12" fill="#D9868C"/><rect x="112" y="25" width="24" height="95" rx="12" fill="#5D8AA8"/><rect x="146" y="10" width="24" height="110" rx="12" fill="#87B0D6"/><rect x="180" y="20" width="24" height="100" rx="12" fill="#9AC297"/></svg></div>
              <p style="margin:0; color:rgba(255,255,255,0.9); font-size:13px; font-weight:500;">Opsly Operations Platform</p>
            </div>
            <div style="padding:16px; background:#0f1220; border:1px solid #1f2937; border-radius:0 0 12px 12px;">
              <h2 style="margin:0 0 12px; color:#e5e7eb">Daily Compliance Summary</h2>
              <p style="margin:0 0 6px; color:#9ca3af">Site: ${siteName}</p>
              <ul style="margin:12px 0; padding-left:20px; color:#e5e7eb">
                ${
          s.include_incidents
            ? `<li>Open Incidents: <strong>${openIncidents}</strong></li>`
            : ""
        }
                ${
          s.include_tasks
            ? `<li>Incomplete Tasks: <strong>${incomplete}</strong></li>`
            : ""
        }
                ${
          s.notify_temperature_warnings
            ? `<li>Temperature Warnings (24h): <strong>${tempWarnings}</strong></li>`
            : ""
        }
              </ul>
              <p style="margin-top:12px; color:#9ca3af">Login to Opsly for full details.</p>
            </div>
          </div>`;
        await sendgrid.send({
          to: email,
          from: "Opsly <noreply@opslytech.com>",
          subject: "Daily Compliance Digest",
          text: msg,
          html,
        });
      } catch (e) {
        console.error("SendGrid error", e);
      }
    }
  }

  return new Response("Digest sent");
});
