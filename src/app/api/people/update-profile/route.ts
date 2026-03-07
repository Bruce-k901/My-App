import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(req: NextRequest) {
  try {
    const { employeeId, updateData } = await req.json();

    if (!employeeId || !updateData) {
      return NextResponse.json({ error: 'Missing employeeId or updateData' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // If email is being changed, check it isn't already used by another profile
    if (updateData.email) {
      const { data: existing } = await admin
        .from('profiles')
        .select('id, status')
        .eq('email', updateData.email)
        .neq('id', employeeId)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // If the conflicting profile is inactive/merged, auto-release its email
        if (existing.status === 'inactive') {
          await admin
            .from('profiles')
            .update({ email: `merged_${existing.id.slice(0, 8)}_${updateData.email}` })
            .eq('id', existing.id);
          console.log(`[update-profile] Auto-released email ${updateData.email} from inactive profile ${existing.id}`);
        } else {
          return NextResponse.json(
            { error: 'This email address is already in use by another active employee.' },
            { status: 409 },
          );
        }
      }
    }

    let { data, error } = await admin
      .from('profiles')
      .update(updateData)
      .eq('id', employeeId)
      .select();

    // If we hit a unique constraint on email, try to auto-release from inactive profiles
    if (error?.code === '23505' && updateData.email) {
      console.log(`[update-profile] Constraint hit for email ${updateData.email}, attempting auto-release`);

      const { data: blocker } = await admin
        .from('profiles')
        .select('id, status, email')
        .eq('email', updateData.email)
        .neq('id', employeeId)
        .limit(1)
        .maybeSingle();

      if (blocker?.status === 'inactive') {
        // Release the email from the inactive/merged profile
        await admin
          .from('profiles')
          .update({ email: `merged_${blocker.id.slice(0, 8)}_${blocker.email}` })
          .eq('id', blocker.id);
        console.log(`[update-profile] Released email from inactive profile ${blocker.id}`);

        // Retry the original update
        const retry = await admin
          .from('profiles')
          .update(updateData)
          .eq('id', employeeId)
          .select();

        data = retry.data;
        error = retry.error;
      }
    }

    if (error) {
      console.error('[update-profile]', error);

      if (error.code === '23505') {
        const field = error.message.includes('email') ? 'email address' : 'value';
        return NextResponse.json(
          { error: `This ${field} is already in use by another active employee.` },
          { status: 409 },
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[update-profile]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
