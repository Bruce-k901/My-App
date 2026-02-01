import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Resend invitation email to an existing user
 * This allows admins to resend invitation emails to users who may not have received them
 * or need a new invitation link.
 */
export async function POST(req: Request) {
  try {
    const { email, userId } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const emailLower = String(email).toLowerCase();
    console.log(`📧 [RESEND-INVITE] Processing resend invite request for: ${emailLower}`);

    const admin = getSupabaseAdmin();

    // Check if user exists in auth
    console.log(`📧 [RESEND-INVITE] Checking if user exists in auth...`);
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(
      (u) => u.email?.toLowerCase() === emailLower
    );
    
    console.log(`📧 [RESEND-INVITE] User exists in auth: ${!!existingUser}`);

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    if (existingUser) {
      // User exists in auth - send password reset email instead
      // This allows them to set/reset their password
      const emailLower = String(email).toLowerCase();
      console.log(`📧 [RESEND-INVITE] Generating recovery link for existing user: ${emailLower}`);
      
      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: emailLower,
        options: {
          redirectTo: `${appUrl}/setup-account`,
        },
      });

      if (error) {
        console.error(`❌ [RESEND-INVITE] Password reset link generation failed for ${emailLower}:`, {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        
        // Check for email configuration errors
        const isEmailConfigError = /smtp|email.*config|mail.*server|unable.*send/i.test(error.message || "");
        if (isEmailConfigError) {
          console.error(`🚨 [RESEND-INVITE] Email configuration issue detected: ${error.message}`);
          return NextResponse.json({ 
            error: "Email service is not configured. Please check Supabase SMTP settings.", 
            code: "email_config_error",
            details: error.message 
          }, { status: 500 });
        }
        
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      console.log(`✅ [RESEND-INVITE] Successfully generated recovery link for ${emailLower}`);

      return NextResponse.json({
        ok: true,
        message: "Password reset email sent",
        link: data.properties?.action_link,
      });
    } else {
      // User doesn't exist in auth - send invitation
      const emailLower = String(email).toLowerCase();
      console.log(`📧 [RESEND-INVITE] Calling inviteUserByEmail for ${emailLower}`);
      
      const { data, error } = await admin.auth.admin.inviteUserByEmail(
        emailLower,
        {
          redirectTo: `${appUrl}/setup-account`,
        }
      );

      if (error) {
        console.error(`❌ [RESEND-INVITE] inviteUserByEmail failed for ${emailLower}:`, {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        
        // Check for email configuration errors
        const isEmailConfigError = /smtp|email.*config|mail.*server|unable.*send/i.test(error.message || "");
        if (isEmailConfigError) {
          console.error(`🚨 [RESEND-INVITE] Email configuration issue detected: ${error.message}`);
          return NextResponse.json({ 
            error: "Email service is not configured. Please check Supabase SMTP settings.", 
            code: "email_config_error",
            details: error.message 
          }, { status: 500 });
        }
        
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      console.log(`✅ [RESEND-INVITE] Successfully sent invite to ${emailLower}`, {
        userId: data?.user?.id,
      });

      return NextResponse.json({
        ok: true,
        message: "Invitation email sent",
        data,
      });
    }
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




