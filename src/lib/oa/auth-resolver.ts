/**
 * Shared auth UUID resolver.
 *
 * Extracted from training/notifications.ts so any OA service (messaging,
 * tasks, notifications) can resolve a profile_id → auth.users.id.
 *
 * Strategies (in order):
 *   1. Use knownAuthId if provided
 *   2. profiles.auth_user_id field
 *   3. Check if profile.id IS the auth UUID (old-style profiles)
 *   4. Email-based lookup via auth.admin.listUsers
 */

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const TAG = '[OA Auth]';

export async function resolveAuthUUID(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  profileId: string,
  knownAuthId?: string | null,
): Promise<string | null> {
  if (knownAuthId) return knownAuthId;

  const { data: profileData } = await supabaseAdmin
    .from('profiles')
    .select('auth_user_id, email, employee_number')
    .eq('id', profileId)
    .maybeSingle();

  if (profileData?.auth_user_id) {
    console.log(`${TAG} Resolved via auth_user_id for ${profileData.employee_number || profileId}`);
    return profileData.auth_user_id;
  }

  // profile.id might BE the auth UUID (old-style profiles)
  const { data: authCheck } = await supabaseAdmin.auth.admin.getUserById(profileId);
  if (authCheck?.user) {
    console.log(`${TAG} profile.id IS auth UUID for ${profileData?.employee_number || profileId}`);
    return profileId;
  }

  // Last resort: match by email
  if (profileData?.email) {
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const match = usersList?.users?.find(
      (u) => u.email?.toLowerCase() === profileData.email!.toLowerCase(),
    );
    if (match) {
      console.log(`${TAG} Resolved via email for ${profileData.employee_number || profileData.email}`);
      return match.id;
    }
  }

  console.error(`${TAG} Cannot resolve auth UUID:`, {
    profileId,
    employeeNumber: profileData?.employee_number,
    email: profileData?.email,
  });
  return null;
}
