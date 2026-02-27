// src/app/api/users/create/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/send-email";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const {
      full_name,
      email,
      company_id,
      site_id,
      app_role,
      position_title,
      boh_foh,
      phone_number,
      pin_code,
      // Training certificate fields
      food_safety_level,
      food_safety_expiry_date,
      h_and_s_level,
      h_and_s_expiry_date,
      fire_marshal_trained,
      fire_marshal_expiry_date,
      first_aid_trained,
      first_aid_expiry_date,
      cossh_trained,
      cossh_expiry_date,
    } = await req.json();

    if (!email || !company_id) {
      console.error("❌ Missing email or company_id", { email, company_id });
      return NextResponse.json(
        { error: "Missing email or company_id" },
        { status: 400 }
      );
    }

    // Init admin client
    let admin;
    try {
      admin = getSupabaseAdmin();
    } catch (e: any) {
      const msg = e?.message || "Server misconfigured";
      console.error("❌ Supabase admin init failed:", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    console.log("🟢 Incoming user payload:", {
      full_name,
      email,
      company_id,
      site_id,
      app_role,
      position_title,
      boh_foh,
      phone_number,
      pin_code,
    });

    // Check for existing profile with this email (regardless of company_id)
    // This handles cases where a user was removed from a company and needs to be re-added
    const emailLower = String(email).toLowerCase();
    const { data: existingProfile, error: checkErr } = await admin
      .from("profiles")
      .select("id, company_id, email")
      .eq("email", emailLower)
      .limit(1);

    if (checkErr) {
      console.error("❌ Profile check failed:", checkErr);
      return NextResponse.json({ error: checkErr.message }, { status: 500 });
    }

    // If profile exists with same company_id, it's a duplicate
    if (existingProfile && existingProfile.length > 0) {
      const existing = existingProfile[0];
      if (existing.company_id === company_id) {
        console.warn("⚠️ Profile already exists for this company:", email);
        return NextResponse.json(
          { error: "Profile already exists", code: "profile_exists" },
          { status: 409 }
        );
      } else {
        // Profile exists but with different/no company_id - we'll update it instead
        console.log(`ℹ️ Profile exists with different company_id. Will update instead of insert.`, {
          existingId: existing.id,
          existingCompanyId: existing.company_id,
          newCompanyId: company_id,
        });
      }
    }

    const roleValue = String(app_role || "Staff");

    // Step 1: Try to create auth user via invite first, then use auth user ID for profile
    let authUserId: string | null = null;
    let invitationSent = false;
    
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000');
      
      const emailLower = String(email).toLowerCase();
      console.log(`📧 [CREATE-USER] Calling inviteUserByEmail for ${emailLower}`);
      
      const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
        emailLower,
        {
          data: {
            full_name,
            company_id,
          },
          redirectTo: `${appUrl}/setup-account`,
        }
      );

      if (inviteError) {
        console.error(`❌ [CREATE-USER] inviteUserByEmail failed for ${emailLower}:`, {
          message: inviteError.message,
          status: inviteError.status,
          name: inviteError.name,
        });
        
        // Check for email configuration errors
        const isEmailConfigError = /smtp|email.*config|mail.*server|unable.*send|rate.*limit/i.test(inviteError.message || "");
        if (isEmailConfigError) {
          console.error(`🚨 [CREATE-USER] Email configuration/rate limit issue detected: ${inviteError.message}`);
          console.error(`💡 [CREATE-USER] Check Supabase Dashboard → Authentication → Email Templates → SMTP Settings`);
          console.error(`💡 [CREATE-USER] For local dev, check Inbucket at http://localhost:54324`);
          console.error(`💡 [CREATE-USER] Rate limit: Only 2 emails/hour allowed (check config.toml auth.rate_limit.email_sent)`);
          // Continue to create profile anyway, but log the issue
        }
        
        // Check if user already exists in auth
        if (inviteError.message?.includes("already registered") || inviteError.message?.includes("already exists")) {
          // User exists in auth - find their ID and send recovery email instead
          const { data: existingUsers } = await admin.auth.admin.listUsers();
          const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === emailLower);
          
          if (existingUser) {
            authUserId = existingUser.id;
            console.log(`✅ [CREATE-USER] Found existing auth user: ${authUserId}`);
            
            // Send recovery/password reset email for existing users
            // Use resetPasswordForEmail which actually SENDS the email (not just generates a link)
            try {
              console.log(`📧 [CREATE-USER] Sending password reset email to existing user: ${emailLower}`);
              
              // Use the regular client's resetPasswordForEmail which actually sends emails
              // We need to create a client instance for this
              const { createClient } = await import('@supabase/supabase-js');
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
              const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
              
              if (!supabaseUrl || !serviceRoleKey) {
                throw new Error('Missing Supabase URL or Service Role Key');
              }
              
              const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
                auth: {
                  autoRefreshToken: false,
                  persistSession: false,
                },
              });
              
              // resetPasswordForEmail actually SENDS the email
              const { data: resetData, error: resetError } = await supabaseClient.auth.resetPasswordForEmail(
                emailLower,
                {
                  redirectTo: `${appUrl}/setup-account`,
                }
              );
              
              if (resetError) {
                console.error(`❌ [CREATE-USER] Password reset email failed for ${emailLower}:`, {
                  message: resetError.message,
                  status: resetError.status,
                  name: resetError.name,
                });
                
                // Check for email configuration errors
                const isResetEmailConfigError = /smtp|email.*config|mail.*server|unable.*send|rate.*limit/i.test(resetError.message || "");
                if (isResetEmailConfigError) {
                  console.error(`🚨 [CREATE-USER] Email configuration/rate limit issue detected: ${resetError.message}`);
                  console.error(`💡 [CREATE-USER] Check Supabase Dashboard → Authentication → Email Templates → SMTP Settings`);
                  console.error(`💡 [CREATE-USER] For local dev, check Inbucket at http://localhost:54324`);
                  console.error(`💡 [CREATE-USER] Rate limit: Only 2 emails/hour allowed (check config.toml auth.rate_limit.email_sent)`);
                }
              } else {
                invitationSent = true;
                console.log(`✅ [CREATE-USER] Password reset email sent to existing user ${emailLower}`);
                console.log(`💡 [CREATE-USER] Check Inbucket at http://localhost:54324 for local dev emails`);
                console.log(`💡 [CREATE-USER] Email should arrive shortly. If not, check rate limits and SMTP config.`);

                // Send BCC notification copy to hello@opslytech.com
                sendEmail({
                  to: 'hello@opslytech.com',
                  subject: `[BCC] Password reset sent to ${emailLower}`,
                  html: `<p>A password reset / re-invite email was sent to <strong>${emailLower}</strong> (${full_name || 'No name'}).</p><p>Role: ${roleValue}</p><p>This is an automatic BCC copy for your records.</p>`,
                }).catch((err) => console.warn('⚠️ BCC notification failed:', err));
              }
            } catch (recoveryErr: any) {
              console.error(`❌ [CREATE-USER] Password reset email exception for ${emailLower}:`, {
                message: recoveryErr?.message,
                stack: recoveryErr?.stack,
                name: recoveryErr?.name,
              });
            }
          } else {
            console.warn(`⚠️ [CREATE-USER] User exists in auth but could not be found for ${emailLower}`);
          }
        } else {
          // Other error - we'll create profile with generated ID
          console.warn(`⚠️ [CREATE-USER] Invitation failed for ${emailLower}. Profile will be created without auth user link.`);
        }
      } else if (inviteData?.user?.id) {
        authUserId = inviteData.user.id;
        invitationSent = true;
        console.log(`✅ [CREATE-USER] Invitation email sent to ${emailLower}, auth user ID: ${authUserId}`);

        // Send BCC notification copy to hello@opslytech.com
        sendEmail({
          to: 'hello@opslytech.com',
          subject: `[BCC] Invite sent to ${emailLower}`,
          html: `<p>An invitation email was sent to <strong>${emailLower}</strong> (${full_name || 'No name'}).</p><p>Role: ${roleValue}</p><p>This is an automatic BCC copy for your records.</p>`,
        }).catch((err) => console.warn('⚠️ BCC notification failed:', err));
      }
    } catch (inviteErr: any) {
      console.error("❌ Invite exception:", inviteErr);
      // Continue - we'll create profile with generated ID
    }

    // Step 2: Create or update profile
    const existingProfileData = existingProfile && existingProfile.length > 0 ? existingProfile[0] : null;
    const profileId = existingProfileData?.id || authUserId || crypto.randomUUID();
    const isUpdate = !!existingProfileData;
    
    console.log(`🟢 ${isUpdate ? 'Updating' : 'Creating'} profile with ID: ${profileId} ${authUserId ? '(from auth user)' : existingProfileData ? '(existing profile)' : '(generated)'}`);

    // Helper function to convert empty strings to null (especially important for UUID fields)
    const nullIfEmpty = (value: any): any => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
      }
      return value;
    };

    // Helper function to convert to integer or null for integer fields
    const nullIfEmptyInt = (value: any): number | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') return null;
        const parsed = parseInt(trimmed, 10);
        return isNaN(parsed) ? null : parsed;
      }
      if (typeof value === 'number') {
        return isNaN(value) ? null : Math.floor(value);
      }
      return null;
    };

    // Helper function specifically for UUID fields - must be valid UUID or null
    const nullIfEmptyUUID = (value: any): string | null => {
      if (value === null || value === undefined) return null;
      const str = String(value).trim();
      if (str === '') return null;
      // Basic UUID format check (8-4-4-4-12 hex characters)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(str)) {
        console.warn(`⚠️ Invalid UUID format: "${str}", converting to null`);
        return null;
      }
      return str;
    };

    const profileData = {
      full_name,
      email: emailLower,
      company_id,
      // UUID fields: convert empty strings to null and validate format
      site_id: nullIfEmptyUUID(site_id),
      app_role: roleValue, // Should be "Admin", "Manager", "Staff", or "Owner"
      // Text fields: convert empty strings to null
      position_title: nullIfEmpty(position_title),
      // boh_foh must be uppercase "BOH" or "FOH" or null (per check constraint)
      boh_foh: (() => {
        if (!boh_foh) return null;
        const upper = String(boh_foh).toUpperCase().trim();
        // Only allow valid values: "BOH" or "FOH"
        return (upper === "BOH" || upper === "FOH") ? upper : null;
      })(),
      phone_number: nullIfEmpty(phone_number),
      pin_code: nullIfEmpty(pin_code),
      // Training certificate fields (integers)
      food_safety_level: nullIfEmptyInt(food_safety_level),
      food_safety_expiry_date: food_safety_expiry_date || null,
      h_and_s_level: nullIfEmptyInt(h_and_s_level),
      h_and_s_expiry_date: h_and_s_expiry_date || null,
      fire_marshal_trained: fire_marshal_trained ?? false,
      fire_marshal_expiry_date: fire_marshal_expiry_date || null,
      first_aid_trained: first_aid_trained ?? false,
      first_aid_expiry_date: first_aid_expiry_date || null,
      cossh_trained: cossh_trained ?? false,
      cossh_expiry_date: cossh_expiry_date || null,
    };

    console.log(`🔍 Profile data to ${isUpdate ? 'update' : 'insert'}:`, JSON.stringify(profileData, null, 2));
    console.log(`🔍 Profile ID: ${profileId}, Auth User ID: ${authUserId || 'none'}`);

    let dbError;
    if (isUpdate) {
      // Update existing profile
      const { error: updateError } = await admin
        .from("profiles")
        .update(profileData)
        .eq("id", profileId);
      dbError = updateError;
    } else {
      // Insert new profile
      const { error: insertError } = await admin
        .from("profiles")
        .insert({
          id: profileId,
          ...profileData,
        });
      dbError = insertError;
    }

    if (dbError) {
      console.error(`❌ ${isUpdate ? 'Update' : 'Insert'} failed:`, dbError);
      console.error(`❌ Full error object:`, JSON.stringify(dbError, null, 2));
      console.error(`❌ Profile data attempted:`, JSON.stringify({ id: profileId, ...profileData }, null, 2));
      return NextResponse.json(
        {
          error: `${isUpdate ? 'Update' : 'Insert'} failed`,
          details: dbError.message || dbError,
          code: dbError.code,
          hint: dbError.hint,
        },
        { status: 400 }
      );
    }

    console.log(`✅ User ${isUpdate ? 'updated' : 'saved'}: ${email} (${profileId})${invitationSent ? ' - Email sent' : ' - No email sent (check logs)'}`);
    
    // Step 3: Ensure user has messaging access (add to default company channel)
    if (company_id && profileId) {
      try {
        // Find or create default company channel
        const { data: defaultChannel } = await admin
          .from("messaging_channels")
          .select("id")
          .eq("company_id", company_id)
          .eq("channel_type", "site")
          .eq("is_auto_created", true)
          .limit(1)
          .maybeSingle();
        
        let channelId = defaultChannel?.id;
        
        if (!channelId) {
          // Create default channel if it doesn't exist
          const { data: newChannel, error: channelError } = await admin
            .from("messaging_channels")
            .insert({
              company_id,
              channel_type: "site",
              name: "General",
              description: "Company-wide messaging channel",
              created_by: profileId,
              is_auto_created: true,
            })
            .select("id")
            .single();
          
          if (!channelError && newChannel) {
            channelId = newChannel.id;
            console.log(`✅ Created default messaging channel: ${channelId}`);
          }
        }
        
        // Add user to channel if channel exists
        if (channelId) {
          const { error: memberError } = await admin
            .from("messaging_channel_members")
            .upsert({
              channel_id: channelId,
              profile_id: profileId,
              member_role: roleValue === "Admin" || roleValue === "Owner" ? "admin" : "member",
            }, {
              onConflict: "channel_id,profile_id",
            });
          
          if (memberError) {
            console.warn(`⚠️ Failed to add user to messaging channel:`, memberError);
          } else {
            console.log(`✅ Added user to messaging channel`);
          }
        }
      } catch (messagingError) {
        // Non-critical - log but don't fail user creation
        console.warn(`⚠️ Messaging access setup failed (non-critical):`, messagingError);
      }
    }
    
    // Return response with email status
    const response: any = { 
      ok: true, 
      id: profileId, 
      invited: invitationSent, 
      updated: isUpdate 
    };
    
    // If email wasn't sent but user exists, provide helpful message
    if (!invitationSent && existingProfileData) {
      response.warning = "User profile updated but email may not have been sent. Check terminal logs and Inbucket.";
    }
    
    return NextResponse.json(response, { status: 200 });
  } catch (e: any) {
    console.error("🔥 Unhandled server error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error", stack: e?.stack || "No stack" },
      { status: 500 }
    );
  }
}
