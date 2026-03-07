// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";

// ============================================================================
// WhatsApp Automations Edge Function
// Runs on a 30-minute cron. Handles automated WhatsApp notifications:
//   1. Delivery reminders (day before expected delivery)
//   2. Overdue critical task alerts
//   3. Contractor follow-up (1hr after no response)
//
// Schedule via Supabase cron: every 30 minutes
// ============================================================================

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results = {
    deliveryReminders: 0,
    overdueAlerts: 0,
    contractorFollowups: 0,
    errors: 0,
  };

  try {
    // -------------------------------------------------------------------
    // 1. Delivery Reminders — day before expected delivery
    // -------------------------------------------------------------------
    await processDeliveryReminders(supabase, results);

    // -------------------------------------------------------------------
    // 2. Overdue Critical Task Alerts
    // -------------------------------------------------------------------
    await processOverdueTasks(supabase, results);

    // -------------------------------------------------------------------
    // 3. Contractor Follow-ups (no response after 1 hour)
    // -------------------------------------------------------------------
    await processContractorFollowups(supabase, results);
  } catch (err) {
    console.error("[whatsapp-automations] Top-level error:", err);
    results.errors++;
  }

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

// ---------------------------------------------------------------------------
// 1. Delivery Reminders
// Send a reminder to suppliers with deliveries expected tomorrow
// ---------------------------------------------------------------------------
async function processDeliveryReminders(supabase: any, results: any) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD

  // Find POs with expected delivery tomorrow that haven't had a reminder sent
  const { data: orders, error } = await supabase
    .from("purchase_orders")
    .select("id, order_number, expected_delivery, company_id, site_id, supplier_id")
    .eq("expected_delivery", tomorrowStr)
    .in("status", ["sent", "confirmed"])
    .is("wa_reminder_sent", null);

  if (error) {
    console.error("[delivery-reminders] Query error:", error.message);
    results.errors++;
    return;
  }

  for (const order of orders || []) {
    try {
      // Fetch supplier details (suppliers is a view)
      const { data: supplier } = await supabase
        .from("suppliers")
        .select("id, name, contact_name, ordering_config")
        .eq("id", order.supplier_id)
        .maybeSingle();

      const whatsappNumber = supplier?.ordering_config?.whatsapp_number;
      if (!whatsappNumber) continue;

      // Fetch site name
      const { data: site } = await supabase
        .from("sites")
        .select("name")
        .eq("id", order.site_id)
        .maybeSingle();

      // Fetch line items with product names
      const { data: lines } = await supabase
        .from("purchase_order_lines")
        .select("quantity_ordered, product_variant_id")
        .eq("purchase_order_id", order.id)
        .limit(6);

      // Check contact opt-in
      const { data: contact } = await supabase
        .from("whatsapp_contacts")
        .select("opted_in")
        .eq("company_id", order.company_id)
        .eq("phone_number", whatsappNumber)
        .maybeSingle();

      if (!contact?.opted_in) continue;

      // Find approved template
      const { data: template } = await supabase
        .from("whatsapp_templates")
        .select("id, meta_status")
        .eq("company_id", order.company_id)
        .eq("name", "delivery_reminder_v1")
        .maybeSingle();

      if (!template || template.meta_status !== "APPROVED") continue;

      // Format items summary
      const itemCount = lines?.length || 0;
      const itemsSummary = itemCount > 0
        ? `${itemCount} item${itemCount !== 1 ? "s" : ""} ordered`
        : "See order details";

      // Send via WhatsApp
      const credentials = await getCredentials(supabase, order.company_id);
      if (!credentials) continue;

      const bodyParams = [
        { type: "text", text: supplier?.contact_name || supplier?.name || "Supplier" },
        { type: "text", text: order.order_number },
        { type: "text", text: tomorrowStr },
        { type: "text", text: site?.name || "Site" },
        { type: "text", text: itemsSummary },
      ];

      const sendResult = await sendTemplate(
        credentials,
        whatsappNumber,
        "delivery_reminder_v1",
        bodyParams,
      );

      if (sendResult.success) {
        // Log the message
        await supabase.from("whatsapp_messages").insert({
          company_id: order.company_id,
          site_id: order.site_id,
          phone_number: whatsappNumber,
          contact_name: supplier.contact_name || supplier.name,
          direction: "outbound",
          message_type: "template",
          template_name: "delivery_reminder_v1",
          template_params: bodyParams,
          status: "sent",
          wa_message_id: sendResult.waMessageId,
          linked_entity_type: "purchase_order",
          linked_entity_id: order.id,
          processing_status: "processed",
        });

        // Mark PO as reminded
        await supabase
          .from("purchase_orders")
          .update({ wa_reminder_sent: new Date().toISOString() })
          .eq("id", order.id);

        results.deliveryReminders++;
      }
    } catch (err) {
      console.error(`[delivery-reminders] Error for order ${order.id}:`, err);
      results.errors++;
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Overdue Critical Task Alerts
// Send alerts for critical/high priority tasks that are overdue
// ---------------------------------------------------------------------------
async function processOverdueTasks(supabase: any, results: any) {
  const now = new Date().toISOString();

  // Find overdue critical tasks that haven't been alerted via WhatsApp
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, due_date, priority, company_id, site_id, assigned_to")
    .in("priority", ["critical", "high"])
    .in("status", ["pending", "in_progress"])
    .lt("due_date", now.split("T")[0])
    .is("wa_overdue_alert_sent", null);

  if (error) {
    console.error("[overdue-tasks] Query error:", error.message);
    results.errors++;
    return;
  }

  // Group tasks by company to send to managers
  const tasksByCompany: Record<string, any[]> = {};
  for (const task of tasks || []) {
    if (!tasksByCompany[task.company_id]) {
      tasksByCompany[task.company_id] = [];
    }
    tasksByCompany[task.company_id].push(task);
  }

  for (const [companyId, companyTasks] of Object.entries(tasksByCompany)) {
    try {
      // Find the template
      const { data: template } = await supabase
        .from("whatsapp_templates")
        .select("id, meta_status")
        .eq("company_id", companyId)
        .eq("name", "task_overdue_v1")
        .maybeSingle();

      if (!template || template.meta_status !== "APPROVED") continue;

      const credentials = await getCredentials(supabase, companyId);
      if (!credentials) continue;

      // Get company admins/managers with WhatsApp contacts
      const { data: managers } = await supabase
        .from("profiles")
        .select("id, full_name, phone_number")
        .eq("company_id", companyId)
        .in("role", ["Admin", "Owner", "General Manager", "Manager"]);

      for (const task of companyTasks) {
        // Fetch site and assignee names for template params
        let siteName = "Unknown site";
        if (task.site_id) {
          const { data: siteData } = await supabase
            .from("sites").select("name").eq("id", task.site_id).maybeSingle();
          if (siteData?.name) siteName = siteData.name;
        }
        let assigneeName = "Unassigned";
        if (task.assigned_to) {
          const { data: assigneeData } = await supabase
            .from("profiles").select("full_name").eq("id", task.assigned_to).maybeSingle();
          if (assigneeData?.full_name) assigneeName = assigneeData.full_name;
        }

        // Send alert to each manager who has opted-in WhatsApp
        for (const manager of managers || []) {
          if (!manager.phone_number) continue;

          const { data: contact } = await supabase
            .from("whatsapp_contacts")
            .select("opted_in")
            .eq("company_id", companyId)
            .eq("phone_number", manager.phone_number)
            .maybeSingle();

          if (!contact?.opted_in) continue;

          const bodyParams = [
            { type: "text", text: manager.full_name || "Manager" },
            { type: "text", text: task.title },
            { type: "text", text: siteName },
            { type: "text", text: task.due_date },
            { type: "text", text: assigneeName },
          ];

          const sendResult = await sendTemplate(
            credentials,
            manager.phone_number,
            "task_overdue_v1",
            bodyParams,
          );

          if (sendResult.success) {
            await supabase.from("whatsapp_messages").insert({
              company_id: companyId,
              site_id: task.site_id,
              phone_number: manager.phone_number,
              contact_name: manager.full_name,
              direction: "outbound",
              message_type: "template",
              template_name: "task_overdue_v1",
              template_params: bodyParams,
              status: "sent",
              wa_message_id: sendResult.waMessageId,
              linked_entity_type: "task",
              linked_entity_id: task.id,
              processing_status: "processed",
            });

            results.overdueAlerts++;
          }
        }

        // Mark task as alerted (once per task, not per manager)
        await supabase
          .from("tasks")
          .update({ wa_overdue_alert_sent: new Date().toISOString() })
          .eq("id", task.id);
      }
    } catch (err) {
      console.error(`[overdue-tasks] Error for company ${companyId}:`, err);
      results.errors++;
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Contractor Follow-ups
// Send follow-up to contractors who haven't responded to a callout after 1hr
// ---------------------------------------------------------------------------
async function processContractorFollowups(supabase: any, results: any) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Find outbound contractor_callout messages sent > 1hr ago with no reply
  const { data: callouts, error } = await supabase
    .from("whatsapp_messages")
    .select("id, company_id, phone_number, contact_name, linked_entity_id, template_params, created_at")
    .eq("template_name", "contractor_callout_v1")
    .eq("direction", "outbound")
    .in("status", ["sent", "delivered"])
    .lt("created_at", oneHourAgo)
    .is("followup_sent", null);

  if (error) {
    console.error("[contractor-followups] Query error:", error.message);
    results.errors++;
    return;
  }

  for (const callout of callouts || []) {
    try {
      // Check if contractor replied (any inbound from same phone after the callout)
      const { data: replies } = await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq("phone_number", callout.phone_number)
        .eq("company_id", callout.company_id)
        .eq("direction", "inbound")
        .gt("created_at", callout.created_at)
        .limit(1);

      if (replies && replies.length > 0) {
        // Contractor has replied — mark and skip
        await supabase
          .from("whatsapp_messages")
          .update({ followup_sent: "replied" })
          .eq("id", callout.id);
        continue;
      }

      // Check if the contact has an open service window (we can send free-form)
      const { data: contact } = await supabase
        .from("whatsapp_contacts")
        .select("service_window_expires")
        .eq("phone_number", callout.phone_number)
        .eq("company_id", callout.company_id)
        .maybeSingle();

      const hasWindow = contact?.service_window_expires &&
        new Date(contact.service_window_expires) > new Date();

      if (!hasWindow) {
        // No service window — skip (can't send free-form outside window)
        continue;
      }

      const credentials = await getCredentials(supabase, callout.company_id);
      if (!credentials) continue;

      // Send a polite follow-up text
      const followupText =
        `Hi ${callout.contact_name || "there"}, just following up on the callout request we sent earlier. ` +
        `Could you let us know if you're able to attend? Please reply YES to confirm or suggest an alternative time. Thank you.`;

      const res = await fetch(
        `${GRAPH_API_BASE}/${credentials.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: callout.phone_number,
            type: "text",
            text: { body: followupText },
          }),
        },
      );

      const data = await res.json();

      if (res.ok) {
        // Log follow-up message
        await supabase.from("whatsapp_messages").insert({
          company_id: callout.company_id,
          phone_number: callout.phone_number,
          contact_name: callout.contact_name,
          direction: "outbound",
          message_type: "text",
          content: followupText,
          status: "sent",
          wa_message_id: data.messages?.[0]?.id,
          linked_entity_type: "callout",
          linked_entity_id: callout.linked_entity_id,
          processing_status: "processed",
        });

        // Mark original callout as followed-up
        await supabase
          .from("whatsapp_messages")
          .update({ followup_sent: new Date().toISOString() })
          .eq("id", callout.id);

        results.contractorFollowups++;
      }
    } catch (err) {
      console.error(`[contractor-followups] Error for callout ${callout.id}:`, err);
      results.errors++;
    }
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface Credentials {
  accessToken: string;
  phoneNumberId: string;
}

async function getCredentials(
  supabase: any,
  companyId: string,
): Promise<Credentials | null> {
  const { data } = await supabase
    .from("integration_connections")
    .select("config")
    .eq("integration_type", "whatsapp")
    .eq("status", "connected")
    .eq("company_id", companyId)
    .maybeSingle();

  const phoneNumberId =
    data?.config?.phone_number_id ||
    Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

  if (!phoneNumberId || !accessToken) return null;
  return { accessToken, phoneNumberId };
}

async function sendTemplate(
  credentials: Credentials,
  to: string,
  templateName: string,
  bodyParams: Array<{ type: string; text: string }>,
): Promise<{ success: boolean; waMessageId?: string }> {
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en_GB" },
      components: [
        { type: "body", parameters: bodyParams },
      ],
    },
  };

  const res = await fetch(
    `${GRAPH_API_BASE}/${credentials.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const data = await res.json();
  return {
    success: res.ok,
    waMessageId: data.messages?.[0]?.id,
  };
}
