import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const ALLOWED_ROLES = ['Admin', 'Owner', 'Manager', 'General Manager'];
const BATCH_SIZE = 50;

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id, app_role, is_platform_admin')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const isAllowed = profile.is_platform_admin || ALLOWED_ROLES.includes(profile.app_role);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      company_id,
      file_name,
      file_size_bytes,
      column_mapping,
      rows,
    } = body;

    if (!company_id || (company_id !== profile.company_id && !profile.is_platform_admin)) {
      return NextResponse.json({ error: 'Invalid company_id' }, { status: 400 });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows to import' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // 3. Load company sites for name→UUID resolution
    const { data: sites } = await admin
      .from('sites')
      .select('id, name')
      .eq('company_id', company_id);

    const siteMap = new Map<string, string>();
    if (sites) {
      for (const site of sites) {
        siteMap.set(site.name.toLowerCase().trim(), site.id);
      }
    }

    // 4. Load existing emails for duplicate detection
    const { data: existingProfiles } = await admin
      .from('profiles')
      .select('email')
      .eq('company_id', company_id)
      .not('email', 'is', null);

    const existingEmails = new Set<string>();
    if (existingProfiles) {
      for (const p of existingProfiles) {
        if (p.email) existingEmails.add(p.email.toLowerCase().trim());
      }
    }

    // 5. Process rows in batches
    const results = {
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ rowIndex: number; field?: string; message: string }>,
    };

    const now = new Date().toISOString();

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const toInsert: any[] = [];

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowIndex = i + j + 1;
        const email = (row.email || '').toLowerCase().trim();

        // Skip if no email
        if (!email) {
          results.failed++;
          results.errors.push({ rowIndex, field: 'email', message: 'Missing email' });
          continue;
        }

        // Skip duplicates
        if (existingEmails.has(email)) {
          results.skipped++;
          results.errors.push({ rowIndex, field: 'email', message: 'Email already exists' });
          continue;
        }

        // Resolve site name to UUID
        let siteId: string | null = null;
        if (row.site_name) {
          const siteLower = row.site_name.toLowerCase().trim();
          // Try exact match first
          siteId = siteMap.get(siteLower) || null;
          // Try partial match
          if (!siteId) {
            for (const [name, id] of siteMap) {
              if (name.includes(siteLower) || siteLower.includes(name)) {
                siteId = id;
                break;
              }
            }
          }
        }

        // Mark email as seen to prevent in-batch duplicates
        existingEmails.add(email);

        toInsert.push({
          rowIndex,
          params: {
            p_id: crypto.randomUUID(),
            p_company_id: company_id,
            p_email: email,
            p_full_name: row.full_name || null,
            p_phone_number: row.phone_number || null,
            p_app_role: row.app_role || 'Staff',
            p_position_title: row.position_title || null,
            p_site_id: siteId,
            p_boh_foh: row.boh_foh || null,
            p_preferred_name: row.preferred_name || null,
            p_date_of_birth: row.date_of_birth || null,
            p_hire_date: row.hire_date || null,
            p_employment_type: row.employment_type || null,
            p_external_employee_id: row.external_employee_id || null,
            p_emergency_contact_name: row.emergency_contact_name || null,
            p_emergency_contact_phone: row.emergency_contact_phone || null,
            p_address: row.address || null,
            p_regular_hours_per_week: row.regular_hours_per_week || null,
            p_gender: row.gender || null,
            p_pronouns: row.pronouns || null,
            p_imported_at: now,
          },
        });
      }

      // Insert row-by-row via RPC (bypasses triggers that fail for null auth_user_id)
      for (const { rowIndex, params } of toInsert) {
        const { error } = await admin.rpc('bulk_insert_profile', params);

        if (error) {
          results.failed++;
          results.errors.push({ rowIndex, message: error.message });
        } else {
          results.created++;
        }
      }
    }

    // 6. Write audit log
    await admin.from('bulk_upload_logs').insert({
      company_id,
      uploaded_by: profile.id,
      module: 'teamly',
      file_name: file_name || 'unknown',
      file_size_bytes: file_size_bytes || 0,
      total_rows: rows.length,
      created_count: results.created,
      skipped_count: results.skipped,
      failed_count: results.failed,
      errors: results.errors.length > 0 ? results.errors : [],
      column_mapping: column_mapping || null,
      status: results.failed === rows.length ? 'failed' : 'completed',
    });

    return NextResponse.json({
      success: true,
      created: results.created,
      updated: 0,
      skipped: results.skipped,
      failed: results.failed,
      errors: results.errors,
    });
  } catch (err: any) {
    console.error('[bulk-upload] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
