import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function PATCH(req: NextRequest) {
  try {
    const { employeeId, updateData } = await req.json();

    if (!employeeId || !updateData) {
      return NextResponse.json({ error: 'Missing employeeId or updateData' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from('profiles')
      .update(updateData)
      .eq('id', employeeId)
      .select();

    if (error) {
      console.error('[update-profile]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[update-profile]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
