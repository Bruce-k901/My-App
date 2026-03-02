import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { toE164 } from '@/lib/whatsapp/phone';

// ============================================================================
// GET  /api/whatsapp/contacts — List contacts for the user's company
// POST /api/whatsapp/contacts — Create or update a contact
// ============================================================================

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    const { data: contacts, error } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('wa_display_name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contacts: contacts || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    const body = await request.json();
    const { phone_number, contact_type, display_name, opted_in, supplier_id, contractor_id } = body;

    if (!phone_number) {
      return NextResponse.json({ error: 'phone_number is required' }, { status: 400 });
    }

    const phone = toE164(phone_number);
    if (!phone) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: contact, error } = await admin
      .from('whatsapp_contacts')
      .upsert(
        {
          company_id: profile.company_id,
          phone_number: phone,
          wa_display_name: display_name || null,
          contact_type: contact_type || 'other',
          opted_in: opted_in ?? false,
          opted_in_at: opted_in ? new Date().toISOString() : null,
          supplier_id: supplier_id || null,
          contractor_id: contractor_id || null,
          linked_entity_type: supplier_id ? 'supplier' : contractor_id ? 'contractor' : null,
          linked_entity_id: supplier_id || contractor_id || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id,phone_number' },
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contact });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
