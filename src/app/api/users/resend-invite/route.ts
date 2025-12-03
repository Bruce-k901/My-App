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

    const admin = getSupabaseAdmin();

    // Check if user exists in auth
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(
      (u) => u.email?.toLowerCase() === String(email).toLowerCase()
    );

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    if (existingUser) {
      // User exists in auth - send password reset email instead
      // This allows them to set/reset their password
      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: String(email).toLowerCase(),
        options: {
          redirectTo: `${appUrl}/setup-account`,
        },
      });

      if (error) {
        console.error("❌ Password reset link generation failed:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        message: "Password reset email sent",
        link: data.properties?.action_link,
      });
    } else {
      // User doesn't exist in auth - send invitation
      const { data, error } = await admin.auth.admin.inviteUserByEmail(
        String(email).toLowerCase(),
        {
          redirectTo: `${appUrl}/setup-account`,
        }
      );

      if (error) {
        console.error("❌ Invite failed:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        message: "Invitation email sent",
        data,
      });
    }
  } catch (e: any) {
    console.error("❌ Resend invite exception:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

