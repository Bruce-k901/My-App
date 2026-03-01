import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { OA_PROFILE_ID, OA_DISPLAY_NAME } from '@/lib/oa/identity';

const TAG = '[OA StartConvo]';

/**
 * Ensure both OA and the user are active members of the given channel.
 * Uses upsert to handle missing or previously-left members.
 */
async function ensureMembers(
  admin: ReturnType<typeof getSupabaseAdmin>,
  channelId: string,
  userProfileId: string,
) {
  // Check current members
  const { data: members } = await admin
    .from('messaging_channel_members')
    .select('profile_id, left_at')
    .eq('channel_id', channelId);

  const memberMap = new Map(
    (members || []).map((m: any) => [m.profile_id, m.left_at]),
  );

  // Fix OA membership
  if (!memberMap.has(OA_PROFILE_ID)) {
    await admin
      .from('messaging_channel_members')
      .insert({ channel_id: channelId, profile_id: OA_PROFILE_ID, member_role: 'admin' } as any);
    console.log(`${TAG} Inserted OA member for channel ${channelId}`);
  } else if (memberMap.get(OA_PROFILE_ID) !== null) {
    await admin
      .from('messaging_channel_members')
      .update({ left_at: null } as any)
      .eq('channel_id', channelId)
      .eq('profile_id', OA_PROFILE_ID);
    console.log(`${TAG} Re-activated OA member for channel ${channelId}`);
  }

  // Fix user membership
  if (!memberMap.has(userProfileId)) {
    await admin
      .from('messaging_channel_members')
      .insert({ channel_id: channelId, profile_id: userProfileId, member_role: 'member' } as any);
    console.log(`${TAG} Inserted user member ${userProfileId} for channel ${channelId}`);
  } else if (memberMap.get(userProfileId) !== null) {
    await admin
      .from('messaging_channel_members')
      .update({ left_at: null } as any)
      .eq('channel_id', channelId)
      .eq('profile_id', userProfileId);
    console.log(`${TAG} Re-activated user member ${userProfileId} for channel ${channelId}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's profile to find their company
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .maybeSingle();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const admin = getSupabaseAdmin();

    // Check for existing OA channel for this user
    const { data: channels } = await admin
      .from('messaging_channels')
      .select('id, participants:messaging_channel_members(profile_id)')
      .eq('channel_type', 'direct')
      .eq('company_id', profile.company_id)
      .eq('name', OA_DISPLAY_NAME);

    if (channels) {
      for (const ch of channels) {
        const memberIds = (ch.participants as any[])?.map((p: any) => p.profile_id) || [];
        const hasOA = memberIds.includes(OA_PROFILE_ID);
        const hasUser = memberIds.includes(user.id) || memberIds.includes(profile.id);

        if (hasOA && hasUser) {
          // Self-heal: ensure both members are active and profile_id is correct
          await ensureMembers(admin, ch.id, user.id);
          return NextResponse.json({ success: true, channelId: ch.id });
        }
      }

      // Also check for channels that exist but have missing/broken members
      // (e.g., channel was created but member insert failed)
      for (const ch of channels) {
        const memberIds = (ch.participants as any[])?.map((p: any) => p.profile_id) || [];
        // Channel named "Opsly Assistant" with OA or user as member — repair it
        if (memberIds.length < 2 || !memberIds.includes(OA_PROFILE_ID) || !memberIds.includes(user.id)) {
          console.log(`${TAG} Repairing channel ${ch.id} with ${memberIds.length} members`);
          await ensureMembers(admin, ch.id, user.id);
          return NextResponse.json({ success: true, channelId: ch.id });
        }
      }
    }

    // Create new channel
    const { data: channel, error: createErr } = await admin
      .from('messaging_channels')
      .insert({
        channel_type: 'direct',
        company_id: profile.company_id,
        name: OA_DISPLAY_NAME,
        description: 'Your personal Opsly Assistant channel',
        created_by: user.id,
        is_auto_created: true,
      } as any)
      .select('id')
      .single();

    if (createErr || !channel) {
      console.error(`${TAG} Channel creation failed:`, JSON.stringify(createErr));
      return NextResponse.json(
        { error: `Channel creation failed: ${createErr?.message || 'unknown'}` },
        { status: 500 },
      );
    }

    // Add both members
    await ensureMembers(admin, channel.id, user.id);

    console.log(`${TAG} Created channel ${channel.id} for user ${user.id}`);
    return NextResponse.json({ success: true, channelId: channel.id });
  } catch (error: any) {
    console.error(`${TAG} Error:`, error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
