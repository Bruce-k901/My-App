import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

/**
 * Test endpoint to diagnose email sending issues
 * POST /api/users/test-email
 * Body: { email: "test@example.com" }
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    
    const emailLower = String(email).toLowerCase();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    
    const admin = getSupabaseAdmin();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ 
        error: "Missing Supabase configuration",
        details: { hasUrl: !!supabaseUrl, hasKey: !!serviceRoleKey }
      }, { status: 500 });
    }
    
    const results: any = {
      email: emailLower,
      appUrl,
      tests: {},
    };
    
    // Test 1: Check if user exists in auth
    console.log(`🔍 [TEST-EMAIL] Checking if user exists in auth: ${emailLower}`);
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === emailLower);
    
    results.tests.userExists = !!existingUser;
    results.tests.userId = existingUser?.id || null;
    results.tests.emailConfirmed = existingUser?.email_confirmed_at ? true : false;
    
    if (existingUser) {
      console.log(`✅ [TEST-EMAIL] User found in auth: ${existingUser.id}`);
      
      // Test 2: Try resetPasswordForEmail (actually sends email)
      console.log(`📧 [TEST-EMAIL] Attempting resetPasswordForEmail for ${emailLower}`);
      const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      
      const { data: resetData, error: resetError } = await supabaseClient.auth.resetPasswordForEmail(
        emailLower,
        {
          redirectTo: `${appUrl}/setup-account`,
        }
      );
      
      results.tests.resetPasswordForEmail = {
        success: !resetError,
        error: resetError ? {
          message: resetError.message,
          status: resetError.status,
          name: resetError.name,
        } : null,
      };
      
      if (resetError) {
        console.error(`❌ [TEST-EMAIL] resetPasswordForEmail failed:`, resetError);
      } else {
        console.log(`✅ [TEST-EMAIL] resetPasswordForEmail succeeded`);
      }
      
      // Test 3: Try generateLink (creates link but doesn't send email)
      console.log(`🔗 [TEST-EMAIL] Attempting generateLink for ${emailLower}`);
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: emailLower,
        options: {
          redirectTo: `${appUrl}/setup-account`,
        },
      });
      
      results.tests.generateLink = {
        success: !linkError,
        error: linkError ? {
          message: linkError.message,
          status: linkError.status,
          name: linkError.name,
        } : null,
        link: linkData?.properties?.action_link || null,
      };
      
      if (linkError) {
        console.error(`❌ [TEST-EMAIL] generateLink failed:`, linkError);
      } else {
        console.log(`✅ [TEST-EMAIL] generateLink succeeded, link: ${linkData?.properties?.action_link}`);
      }
    } else {
      console.log(`ℹ️ [TEST-EMAIL] User not found in auth, trying inviteUserByEmail`);
      
      // Test 4: Try inviteUserByEmail for new user
      const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
        emailLower,
        {
          redirectTo: `${appUrl}/setup-account`,
        }
      );
      
      results.tests.inviteUserByEmail = {
        success: !inviteError,
        error: inviteError ? {
          message: inviteError.message,
          status: inviteError.status,
          name: inviteError.name,
        } : null,
        userId: inviteData?.user?.id || null,
      };
      
      if (inviteError) {
        console.error(`❌ [TEST-EMAIL] inviteUserByEmail failed:`, inviteError);
      } else {
        console.log(`✅ [TEST-EMAIL] inviteUserByEmail succeeded`);
      }
    }
    
    // Summary
    results.summary = {
      emailShouldBeSent: results.tests.resetPasswordForEmail?.success || results.tests.inviteUserByEmail?.success,
      checkInbucket: "http://localhost:54324",
      checkSupabaseDashboard: "Authentication → Email Templates → SMTP Settings",
    };
    
    return NextResponse.json(results, { status: 200 });
  } catch (e: any) {
    console.error(`🔥 [TEST-EMAIL] Exception:`, e);
    return NextResponse.json({ 
      error: e?.message || "Server error",
      stack: e?.stack 
    }, { status: 500 });
  }
}










