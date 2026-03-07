import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/planly/notifications/preferences
 * Fetch notification preferences for a customer
 *
 * Query params:
 * - customer_id: string
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    if (!customerId) {
      return NextResponse.json(
        { error: 'customer_id is required' },
        { status: 400 }
      );
    }

    const { data: preferences, error } = await supabase
      .from('planly_customer_notification_preferences')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (which is fine)
      console.error('Error fetching preferences:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ preferences });
  } catch (error: any) {
    console.error('Error in GET /api/planly/notifications/preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/planly/notifications/preferences
 * Create or update notification preferences for a customer
 *
 * Body:
 * - customer_id: string
 * - email_enabled: boolean
 * - notify_on_auto_generation: boolean
 * - notify_on_confirmation: boolean
 * - notify_on_delivery_day: boolean
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customer_id,
      email_enabled,
      notify_on_auto_generation,
      notify_on_confirmation,
      notify_on_delivery_day,
    } = body;

    if (!customer_id) {
      return NextResponse.json(
        { error: 'customer_id is required' },
        { status: 400 }
      );
    }

    // Upsert preferences
    const { data: preferences, error } = await supabase
      .from('planly_customer_notification_preferences')
      .upsert(
        {
          customer_id,
          email_enabled: email_enabled ?? true,
          notify_on_auto_generation: notify_on_auto_generation ?? true,
          notify_on_confirmation: notify_on_confirmation ?? true,
          notify_on_delivery_day: notify_on_delivery_day ?? false,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'customer_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving preferences:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, preferences });
  } catch (error: any) {
    console.error('Error in POST /api/planly/notifications/preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
