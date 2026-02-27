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

    // 4. Process rows in batches
    const results = {
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ rowIndex: number; field?: string; message: string }>,
    };

    // Cache contractor defaults by site_id+category to avoid redundant RPC calls
    const contractorCache = new Map<string, Record<string, string | null>>();

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowIndex = i + j + 1;

        // Require name
        if (!row.name || !row.name.trim()) {
          results.failed++;
          results.errors.push({ rowIndex, field: 'name', message: 'Missing asset name' });
          continue;
        }

        // Resolve site name to UUID
        let siteId: string | null = null;
        if (row.site_name) {
          const siteLower = row.site_name.toLowerCase().trim();
          siteId = siteMap.get(siteLower) || null;
          if (!siteId) {
            for (const [name, id] of siteMap) {
              if (name.includes(siteLower) || siteLower.includes(name)) {
                siteId = id;
                break;
              }
            }
          }
        }

        // Resolve default contractors (cached per site_id+category)
        const category = row.category || 'other';
        let contractors: Record<string, string | null> = {
          ppm_contractor_id: null,
          reactive_contractor_id: null,
          warranty_contractor_id: null,
        };

        if (siteId && category) {
          const cacheKey = `${siteId}::${category}`;
          if (contractorCache.has(cacheKey)) {
            contractors = contractorCache.get(cacheKey)!;
          } else {
            const { data: defaults } = await admin.rpc('assign_default_contractors', {
              p_site_id: siteId,
              p_category: category,
            });
            if (defaults?.[0]) {
              contractors = {
                ppm_contractor_id: defaults[0].ppm_contractor_id || null,
                reactive_contractor_id: defaults[0].reactive_contractor_id || null,
                warranty_contractor_id: defaults[0].warranty_contractor_id || null,
              };
            }
            contractorCache.set(cacheKey, contractors);
          }
        }

        const { error } = await admin.from('assets').insert({
          company_id,
          name: row.name.trim(),
          brand: row.brand || null,
          model: row.model || null,
          serial_number: row.serial_number || null,
          category,
          site_id: siteId,
          install_date: row.install_date || null,
          purchase_date: row.purchase_date || null,
          warranty_end: row.warranty_end || null,
          next_service_date: row.next_service_date || null,
          last_service_date: row.last_service_date || null,
          status: row.status || 'active',
          notes: row.notes || null,
          working_temp_min: row.working_temp_min ?? null,
          working_temp_max: row.working_temp_max ?? null,
          ppm_frequency_months: row.ppm_frequency_months ?? null,
          ...contractors,
        });

        if (error) {
          results.failed++;
          results.errors.push({ rowIndex, message: error.message });
        } else {
          results.created++;
        }
      }
    }

    // 5. Write audit log
    await admin.from('bulk_upload_logs').insert({
      company_id,
      uploaded_by: profile.id,
      module: 'assetly',
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
    console.error('[asset-bulk-upload] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
