import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/send-email";
import { generateTeamInviteEmailHTML } from "@/lib/emails/teamInvite";

/**
 * Resend invitation email to an existing user via Resend.
 * Generates a Supabase auth link and sends a branded email.
 */
export async function POST(req: Request) {
  try {
    const { email, userId, companyId } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const emailLower = String(email).toLowerCase();
    console.log(`📧 [RESEND-INVITE] Processing resend invite request for: ${emailLower}`);

    const admin = getSupabaseAdmin();

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    // Fetch company name for the email (look up from profile if companyId not passed)
    let companyName = "Your team";
    let resolvedCompanyId = companyId;

    if (!resolvedCompanyId && userId) {
      const { data: profile } = await admin
        .from("profiles")
        .select("company_id")
        .eq("id", userId)
        .single();
      resolvedCompanyId = profile?.company_id;
    }

    if (resolvedCompanyId) {
      const { data: company } = await admin
        .from("companies")
        .select("name")
        .eq("id", resolvedCompanyId)
        .single();
      companyName = company?.name || "Your team";
    }

    // Check if user exists in auth
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(
      (u) => u.email?.toLowerCase() === emailLower
    );

    console.log(`📧 [RESEND-INVITE] User exists in auth: ${!!existingUser}`);

    // Generate the appropriate link type
    const linkType = existingUser ? "recovery" : "invite";
    console.log(`📧 [RESEND-INVITE] Generating ${linkType} link for ${emailLower}`);

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: linkType as "recovery" | "invite",
      email: emailLower,
      options: {
        redirectTo: `${appUrl}/setup-account`,
      },
    });

    if (linkError) {
      console.error(`❌ [RESEND-INVITE] Link generation failed for ${emailLower}:`, linkError.message);
      return NextResponse.json({ error: linkError.message }, { status: 400 });
    }

    const inviteUrl = linkData.properties.action_link;

    // Send branded email via Resend
    const html = generateTeamInviteEmailHTML({
      companyName,
      inviteUrl,
    });

    const emailResult = await sendEmail({
      to: emailLower,
      subject: `${companyName} has invited you to join Opsly`,
      html,
      bcc: "hello@opslytech.com",
    });

    if (!emailResult.success) {
      console.error(`❌ [RESEND-INVITE] Email send failed for ${emailLower}:`, emailResult.error);
      return NextResponse.json({
        error: emailResult.error || "Failed to send email",
      }, { status: 500 });
    }

    console.log(`✅ [RESEND-INVITE] Branded invite email sent to ${emailLower}`);

    return NextResponse.json({
      ok: true,
      message: "Invitation email sent",
    });
  } catch (e: any) {
    console.error(`🔥 [RESEND-INVITE] Unhandled exception:`, {
      message: e?.message,
      stack: e?.stack,
      name: e?.name,
    });
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
