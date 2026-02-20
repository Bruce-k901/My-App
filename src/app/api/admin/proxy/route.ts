import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Admin proxy route — allows platform admins to perform mutations on behalf of any company.
 * Security: verifies is_platform_admin server-side via JWT, never trusts client-side flags.
 * Only allows mutations on explicitly allowlisted tables.
 */

const ALLOWED_TABLES = [
  'onboarding_progress',
  'sites',
  'departments',
  'suppliers',
  'storage_areas',
  'stock_items',
  'task_templates',
  'sops',
  'equipment',
  'risk_assessments',
  'assets',
  'contractors',
  'company_onboarding_packs',
  'courses',
  'planly_destination_groups',
  'planly_base_doughs',
  'planly_bake_groups',
  'planly_products',
  'planly_customers',
] as const;

type AllowedTable = typeof ALLOWED_TABLES[number];

function isAllowedTable(table: string): table is AllowedTable {
  return (ALLOWED_TABLES as readonly string[]).includes(table);
}

export async function POST(request: Request) {
  try {
    // Step 1: Verify authenticated user via JWT/cookie session
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // Step 2: Verify platform admin server-side (never trust client)
    const { data: profile } = await admin
      .from('profiles')
      .select('id, is_platform_admin')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    // Fallback to id match (both patterns exist in codebase)
    const resolvedProfile = profile || (await admin
      .from('profiles')
      .select('id, is_platform_admin')
      .eq('id', user.id)
      .maybeSingle()).data;

    if (!resolvedProfile?.is_platform_admin) {
      return NextResponse.json(
        { error: 'Forbidden: Platform admin access required' },
        { status: 403 }
      );
    }

    // Step 3: Parse and validate request
    const body = await request.json();
    const { table, operation, payload, filters } = body as {
      table: string;
      operation: 'insert' | 'update' | 'upsert' | 'delete';
      payload?: Record<string, unknown>;
      filters?: Record<string, unknown>;
    };

    if (!table || !operation) {
      return NextResponse.json(
        { error: 'table and operation are required' },
        { status: 400 }
      );
    }

    if (!isAllowedTable(table)) {
      return NextResponse.json(
        { error: `Table "${table}" is not allowed via admin proxy` },
        { status: 400 }
      );
    }

    const validOperations = ['insert', 'update', 'upsert', 'delete'];
    if (!validOperations.includes(operation)) {
      return NextResponse.json(
        { error: `Operation "${operation}" is not supported` },
        { status: 400 }
      );
    }

    // Step 4: Execute mutation with admin client (bypasses RLS)
    let result;

    if (operation === 'insert') {
      if (!payload) return NextResponse.json({ error: 'payload required for insert' }, { status: 400 });
      result = await admin.from(table).insert(payload).select();
    } else if (operation === 'upsert') {
      if (!payload) return NextResponse.json({ error: 'payload required for upsert' }, { status: 400 });
      result = await admin.from(table).upsert(payload).select();
    } else if (operation === 'update') {
      if (!payload) return NextResponse.json({ error: 'payload required for update' }, { status: 400 });
      if (!filters || Object.keys(filters).length === 0) {
        return NextResponse.json({ error: 'filters required for update (prevents full-table update)' }, { status: 400 });
      }
      let query = admin.from(table).update(payload);
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value as string);
      }
      result = await query.select();
    } else if (operation === 'delete') {
      if (!filters || Object.keys(filters).length === 0) {
        return NextResponse.json({ error: 'filters required for delete (prevents full-table delete)' }, { status: 400 });
      }
      let query = admin.from(table).delete();
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value as string);
      }
      result = await query.select();
    }

    if (result?.error) {
      console.error('Admin proxy mutation error:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: result?.data || null, success: true });
  } catch (error) {
    console.error('Admin proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
