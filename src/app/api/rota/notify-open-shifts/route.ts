import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { oa } from "@/lib/oa";

type NotifyOpenShiftsBody = {
  rotaId: string;
  siteId: string;
};

function formatTime(time: string) {
  // Expect "HH:MM:SS" or "HH:MM"
  return time?.slice(0, 5) || time;
}

async function sendEmailViaResend(params: {
  to: string[];
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || process.env.EMAIL_FROM;

  // Safe fallback (current repo behavior): if no provider keys, just log.
  if (!apiKey || !from) {
    console.log("📧 (email skipped) Missing RESEND_API_KEY or RESEND_FROM/EMAIL_FROM", {
      toCount: params.to.length,
      subject: params.subject,
    });
    return { sent: 0, skipped: params.to.length };
  }

  // Resend API: https://resend.com/docs/api-reference/emails/send-email
  const results = await Promise.allSettled(
    params.to.map(async (to) => {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: params.subject,
          html: params.html,
          text: params.text,
        }),
      });
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`Resend error ${resp.status}: ${body}`);
      }
      return true;
    }),
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed) {
    console.warn("Some emails failed to send via Resend", { sent, failed });
  }
  return { sent, failed };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<NotifyOpenShiftsBody>;
    const rotaId = body.rotaId;
    const siteId = body.siteId;

    if (!rotaId || !siteId) {
      return NextResponse.json({ error: "Missing rotaId or siteId" }, { status: 400 });
    }

    // Auth (cookie-based)
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Load caller profile for role/company validation
    const { data: callerProfile, error: callerErr } = await supabase
      .from("profiles")
      .select("id, company_id, app_role, full_name, email, is_platform_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (callerErr || !callerProfile?.company_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    const roleKey = String(callerProfile.app_role || "")
      .toLowerCase()
      .replace(/\s+/g, "_");
    const canManageRota = callerProfile.is_platform_admin || ["admin", "owner", "manager", "general_manager", "area_manager", "ops_manager"].includes(roleKey);
    if (!canManageRota) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = getSupabaseAdmin();

    // Validate rota belongs to site & company
    const { data: rota, error: rotaErr } = await admin
      .from("rotas")
      .select("id, company_id, site_id, week_starting, status")
      .eq("id", rotaId)
      .maybeSingle();
    if (rotaErr || !rota) {
      return NextResponse.json({ error: "Rota not found" }, { status: 404 });
    }
    if (!callerProfile.is_platform_admin && (rota.company_id !== callerProfile.company_id || rota.site_id !== siteId)) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    // Site name for nicer messaging/email
    const { data: site } = await admin.from("sites").select("id, name").eq("id", siteId).maybeSingle();
    const siteName = site?.name || "your site";

    // Find open shifts for this rota
    const { data: openShifts, error: shiftsErr } = await admin
      .from("rota_shifts")
      .select("id, shift_date, start_time, end_time, role_required, status")
      .eq("rota_id", rotaId)
      .is("profile_id", null)
      .neq("status", "cancelled")
      .order("shift_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (shiftsErr) throw shiftsErr;
    if (!openShifts || openShifts.length === 0) {
      return NextResponse.json({ ok: true, message: "No open shifts", notified: 0 }, { status: 200 });
    }

    // Recipient selection (site team)
    const { data: recipients, error: recipientsErr } = await admin
      .from("profiles")
      .select("id, full_name, email, position_title, home_site, site_id, status")
      .eq("company_id", callerProfile.company_id)
      .eq("status", "active")
      .or(`home_site.eq.${siteId},site_id.eq.${siteId}`);
    if (recipientsErr) throw recipientsErr;

    const recipientList = (recipients || []).filter((p: any) => p?.id);
    if (recipientList.length === 0) {
      return NextResponse.json({ error: "No active staff found for this site" }, { status: 400 });
    }

    // Create / find a dedicated messaging channel for open shifts at this site
    let channelId: string | null = null;
    const { data: existingChannel } = await admin
      .from("messaging_channels")
      .select("id")
      .eq("company_id", callerProfile.company_id)
      .eq("channel_type", "site")
      .eq("entity_id", siteId)
      .eq("name", "Open Shifts")
      .is("archived_at", null)
      .maybeSingle();

    if (existingChannel?.id) {
      channelId = existingChannel.id;
    } else {
      const { data: createdChannel, error: chErr } = await admin
        .from("messaging_channels")
        .insert({
          company_id: callerProfile.company_id,
          channel_type: "site",
          entity_id: siteId,
          name: "Open Shifts",
          description: `Open shift offers for ${siteName}`,
          created_by: callerProfile.id,
          is_auto_created: true,
          topic: "🗓️ Open Shifts",
          topic_category: "operations",
        } as any)
        .select("id")
        .single();
      if (chErr) throw chErr;
      channelId = createdChannel.id;
    }

    // Ensure members (best-effort)
    if (channelId) {
      const allMemberIds = Array.from(new Set([callerProfile.id, ...recipientList.map((r: any) => r.id)]));

      const { data: existingMembers } = await admin
        .from("messaging_channel_members")
        .select("profile_id,left_at")
        .eq("channel_id", channelId)
        .in("profile_id", allMemberIds);

      const existingMap = new Map<string, any>((existingMembers || []).map((m: any) => [m.profile_id || m.user_id, m]));
      const toInsert = allMemberIds
        .filter((uid) => !existingMap.has(uid))
        .map((uid) => ({
          channel_id: channelId!,
          profile_id: uid,
          member_role: uid === callerProfile.id ? "admin" : "member",
        }));

      if (toInsert.length) {
        await admin.from("messaging_channel_members").insert(toInsert as any);
      }

      const leftIds = (existingMembers || []).filter((m: any) => m.left_at).map((m: any) => m.profile_id || m.user_id);
      if (leftIds.length) {
        await admin
          .from("messaging_channel_members")
          .update({ left_at: null })
          .eq("channel_id", channelId)
          .in("profile_id", leftIds);
      }
    }

    // Build human-friendly summary
    const lines = openShifts.map((s: any) => {
      const when = `${new Date(s.shift_date).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })} ${formatTime(s.start_time)}–${formatTime(s.end_time)}`;
      const role = s.role_required ? ` • ${s.role_required}` : "";
      return `• ${when}${role}`;
    });

    const subject = `Open shifts available (${siteName})`;
    const textBody =
      `Open shifts have been posted for ${siteName}.\n\n` +
      lines.join("\n") +
      `\n\nTo accept a shift, open the app and go to Notifications.\n`;
    const htmlBody =
      `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #1a1d24; border-radius: 16px; overflow: hidden;">` +
      `<div style="background: linear-gradient(135deg, #D37E91 0%, #8B5CF6 100%); padding: 32px; text-align: center;">` +
      `<div style="margin: 0 auto 16px; text-align: center;"><svg width="60" height="40" viewBox="0 0 200 130" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="24" height="110" rx="12" fill="#1B2624"/><rect x="44" y="30" width="24" height="90" rx="12" fill="#8B2E3E"/><rect x="78" y="15" width="24" height="105" rx="12" fill="#D9868C"/><rect x="112" y="25" width="24" height="95" rx="12" fill="#5D8AA8"/><rect x="146" y="10" width="24" height="110" rx="12" fill="#87B0D6"/><rect x="180" y="20" width="24" height="100" rx="12" fill="#9AC297"/></svg></div>` +
      `<h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Open Shifts Available</h1>` +
      `<p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">${siteName}</p>` +
      `</div>` +
      `<div style="padding: 28px 32px;">` +
      `<p style="margin: 0 0 16px; color: rgba(255,255,255,0.85); font-size: 15px;">Open shifts have been posted for <strong style="color:#fff;">${siteName}</strong>.</p>` +
      `<ul style="margin: 0 0 20px; padding-left: 20px; color: rgba(255,255,255,0.75); font-size: 14px; line-height: 1.8;">${lines.map((l) => `<li>${l.replace(/^•\s*/, "")}</li>`).join("")}</ul>` +
      `<p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 13px;">To accept a shift, open the app and go to <strong style="color:#D37E91;">Notifications</strong>.</p>` +
      `</div></div>`;

    // 1) In-app notifications (offers)
    const notes = [];
    for (const shift of openShifts) {
      const when = `${new Date(shift.shift_date).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })} ${formatTime(shift.start_time)}–${formatTime(shift.end_time)}`;
      const rolePart = shift.role_required ? ` • ${shift.role_required}` : "";
      const title = "Open shift available";
      const message = `${when}${rolePart}\nTap "Accept shift" to claim it.`;

      for (const person of recipientList) {
        notes.push({
          company_id: callerProfile.company_id,
          profile_id: person.id,
          type: "message",
          title,
          message,
          link: "/notifications",
          metadata: {
            kind: "open_shift_offer",
            shift_id: shift.id,
            rota_id: rotaId,
            site_id: siteId,
            via: ["messaging", "email", "notifications"],
            channel_id: channelId,
            source: "opsly_assistant",
          },
          read: false,
        });
      }
    }

    // Use chunking to avoid very large payloads
    const chunkSize = 500;
    for (let i = 0; i < notes.length; i += chunkSize) {
      const chunk = notes.slice(i, i + chunkSize);
      const { error: nErr } = await admin.from("notifications").insert(chunk as any);
      if (nErr) throw nErr;
    }

    // 2) Messaging via OA — channel post + individual DMs
    const messageContent =
      `Open shifts available for ${siteName} (week starting ${rota.week_starting}).\n\n` +
      `${lines.join("\n")}\n\n` +
      `To claim a shift: go to Notifications and tap "Accept shift".`;

    // Post to the site Open Shifts channel via OA
    if (channelId) {
      await oa.sendChannelMessage({
        channelId,
        content: messageContent,
        messageType: "text",
        metadata: {
          messageType: "open_shift_offer",
          kind: "open_shifts_offer",
          rota_id: rotaId,
          site_id: siteId,
          shift_ids: openShifts.map((s: any) => s.id),
        },
      });
    }

    // Send individual DMs from OA to each staff member
    const dmPromises = recipientList.map((person: any) =>
      oa.sendDM({
        recipientProfileId: person.id,
        companyId: callerProfile.company_id,
        content: messageContent,
        messageType: "text",
        metadata: {
          messageType: "open_shift_offer",
          kind: "open_shift_offer",
          rota_id: rotaId,
          site_id: siteId,
          shift_ids: openShifts.map((s: any) => s.id),
        },
      })
    );
    await Promise.allSettled(dmPromises);

    // 3) Email
    const emails = recipientList.map((p: any) => p.email).filter(Boolean) as string[];
    const emailResult = await sendEmailViaResend({
      to: emails,
      subject,
      html: htmlBody,
      text: textBody,
    });

    return NextResponse.json({
      ok: true,
      openShiftCount: openShifts.length,
      recipientCount: recipientList.length,
      notificationCount: notes.length,
      channelId,
      messagingLink: channelId ? `/dashboard/messaging?conversation=${channelId}` : null,
      emailResult,
    });
  } catch (error: any) {
    console.error("notify-open-shifts error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to notify open shifts" },
      { status: 500 },
    );
  }
}


