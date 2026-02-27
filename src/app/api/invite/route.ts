import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/send-email";

export async function POST(req: Request) {
  try {
    const { email, phone_number, pin_code, companyId } = await req.json();

    if (email) {
      const emailLower = String(email).toLowerCase();
      console.log(`📧 [INVITE] Attempting to invite user: ${emailLower}`);
      
      const admin = getSupabaseAdmin();
      // Optional server-side duplicate profile guard within the same company
      if (companyId) {
        const { data: existing, error: checkErr } = await admin
          .from("profiles")
          .select("id")
          .eq("company_id", companyId)
          .eq("email", emailLower)
          .limit(1);
        if (checkErr) {
          console.error(`❌ [INVITE] Profile check failed for ${emailLower}:`, checkErr);
          return NextResponse.json({ error: checkErr.message }, { status: 500 });
        }
        if (existing && existing.length > 0) {
          console.warn(`⚠️ [INVITE] Profile already exists for ${emailLower} in company ${companyId}`);
          return NextResponse.json({ error: "Profile already exists for this company", code: "profile_exists" }, { status: 409 });
        }
      }
      
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      
      console.log(`📧 [INVITE] Calling inviteUserByEmail for ${emailLower} with redirectTo: ${appUrl}/setup-account`);
      
      const { data, error } = await admin.auth.admin.inviteUserByEmail(emailLower, {
        redirectTo: `${appUrl}/setup-account`,
      });
      
      if (error) {
        console.error(`❌ [INVITE] inviteUserByEmail failed for ${emailLower}:`, {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        
        // Distinguish common duplicate auth case
        const isDuplicateAuth = /already registered|already exists/i.test(error.message || "");
        const status = isDuplicateAuth ? 409 : 400;
        const code = isDuplicateAuth ? "auth_exists" : undefined;
        
        // Check for email configuration errors
        const isEmailConfigError = /smtp|email.*config|mail.*server|unable.*send/i.test(error.message || "");
        if (isEmailConfigError) {
          console.error(`🚨 [INVITE] Email configuration issue detected: ${error.message}`);
          return NextResponse.json({ 
            error: "Email service is not configured. Please check Supabase SMTP settings.", 
            code: "email_config_error",
            details: error.message 
          }, { status: 500 });
        }
        
        return NextResponse.json({ error: error.message, code }, { status });
      }
      
      console.log(`✅ [INVITE] Successfully invited ${emailLower}`, {
        userId: data?.user?.id,
        emailSent: !!data?.user,
      });

      // Send BCC notification copy to hello@opslytech.com
      sendEmail({
        to: 'hello@opslytech.com',
        subject: `[BCC] Invite sent to ${emailLower}`,
        html: `<p>An invitation email was sent to <strong>${emailLower}</strong>.</p><p>This is an automatic BCC copy for your records.</p>`,
      }).catch((err) => console.warn('⚠️ BCC notification failed:', err));

      return NextResponse.json({ ok: true, data });
    }

    if (phone_number) {
      // Stub for SMS invites until Twilio/Vonage is integrated
      console.log("SMS invite stub", { phone_number, pin_code });
      return NextResponse.json({ ok: true, sms: true });
    }

    return NextResponse.json({ error: "No email or phone_number provided" }, { status: 400 });
  } catch (e: any) {
    console.error(`🔥 [INVITE] Unhandled exception:`, {
      message: e?.message,
      stack: e?.stack,
      name: e?.name,
    });
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}