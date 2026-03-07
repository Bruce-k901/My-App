import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { ensureValidToken, getSquareTokens } from './tokens';
import { getSquareClient } from './client';
import { handleSquareError, withRetry, sleep } from './errors';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LaborSyncResult {
  success: boolean;
  shiftsProcessed: number;
  shiftsSkipped: number;
  shiftsFailed: number;
  unmappedMembers: string[];
  dateFrom: string;
  dateTo: string;
  error?: string;
}

export interface AutoMatchResult {
  matched: number;
  unmatched: number;
  total: number;
}

interface EmployeeMapping {
  pos_team_member_id: string;
  profile_id: string | null;
}

// ─── Labor Sync ─────────────────────────────────────────────────────────────

/**
 * Sync Square timecards/shifts to Teamly staff_attendance + time_entries.
 *
 * Flow:
 * 1. Fetch CLOSED timecards from Square for date range + location
 * 2. Look up pos_employee_mappings to resolve team_member_id → profile_id
 * 3. For each mapped timecard, upsert into staff_attendance + time_entries
 * 4. Handle breaks from Square shift data
 */
export async function syncSquareLabor(
  companyId: string,
  siteId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<LaborSyncResult> {
  const supabase = getSupabaseAdmin();

  // Default date range: last 7 days
  const now = new Date();
  const from = dateFrom || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const to = dateTo || now.toISOString().split('T')[0];

  const result: LaborSyncResult = {
    success: false,
    shiftsProcessed: 0,
    shiftsSkipped: 0,
    shiftsFailed: 0,
    unmappedMembers: [],
    dateFrom: from,
    dateTo: to,
  };

  // Get valid token
  const accessToken = await ensureValidToken(companyId);
  if (!accessToken) {
    result.error = 'Square token expired or unavailable — please reconnect';
    return result;
  }

  // Get location ID
  const tokens = await getSquareTokens(companyId);
  if (!tokens?.locationId) {
    result.error = 'No Square location selected';
    return result;
  }

  const client = getSquareClient(accessToken);

  // Load employee mappings for this company
  const { data: mappings } = await supabase
    .from('pos_employee_mappings')
    .select('pos_team_member_id, profile_id')
    .eq('company_id', companyId)
    .eq('pos_provider', 'square')
    .eq('is_active', true);

  const mappingMap = new Map<string, string | null>();
  for (const m of (mappings || []) as EmployeeMapping[]) {
    mappingMap.set(m.pos_team_member_id, m.profile_id);
  }

  try {
    // Fetch timecards with cursor-based pagination
    let cursor: string | undefined;

    do {
      const searchResponse = await withRetry(() =>
        client.labor.searchTimecards({
          query: {
            filter: {
              locationIds: [tokens.locationId!],
              status: 'CLOSED',
              workday: {
                dateRange: {
                  startDate: from,
                  endDate: to,
                },
                matchTimecardsBy: 'START_AT',
                defaultTimezone: 'Europe/London',
              },
            },
            sort: {
              field: 'START_AT',
              order: 'ASC',
            },
          },
          limit: 200,
          cursor,
        }),
      );

      const timecards = searchResponse.timecards ?? [];
      cursor = searchResponse.cursor ?? undefined;

      for (const tc of timecards) {
        if (!tc.id || !tc.teamMemberId) continue;

        // Check employee mapping
        const profileId = mappingMap.get(tc.teamMemberId);
        if (!profileId) {
          // Track unmapped members (unique)
          if (!result.unmappedMembers.includes(tc.teamMemberId)) {
            result.unmappedMembers.push(tc.teamMemberId);
          }
          result.shiftsSkipped++;
          continue;
        }

        try {
          // Idempotency check — skip if timecard already synced
          const { data: existing } = await supabase
            .from('staff_attendance')
            .select('id')
            .eq('company_id', companyId)
            .eq('pos_timecard_id', tc.id)
            .maybeSingle();

          if (existing) {
            result.shiftsSkipped++;
            continue;
          }

          // Calculate hours and breaks
          const startAt = tc.startAt;
          const endAt = tc.endAt;
          if (!startAt || !endAt) {
            result.shiftsSkipped++;
            continue;
          }

          const startDate = new Date(startAt);
          const endDate = new Date(endAt);
          const grossMs = endDate.getTime() - startDate.getTime();
          const grossHours = grossMs / (1000 * 60 * 60);

          // Calculate total break minutes
          let totalBreakMinutes = 0;
          let firstBreakStart: string | null = null;
          let firstBreakEnd: string | null = null;
          if (tc.breaks && tc.breaks.length > 0) {
            for (const brk of tc.breaks) {
              if (brk.startAt && brk.endAt) {
                const brkStart = new Date(brk.startAt);
                const brkEnd = new Date(brk.endAt);
                totalBreakMinutes += (brkEnd.getTime() - brkStart.getTime()) / (1000 * 60);
              }
            }
            // Record first break for break_start/break_end fields
            if (tc.breaks[0]?.startAt) firstBreakStart = tc.breaks[0].startAt;
            if (tc.breaks[0]?.endAt) firstBreakEnd = tc.breaks[0].endAt;
          }

          const netHours = grossHours - (totalBreakMinutes / 60);

          // Insert into staff_attendance
          const { error: attendanceError } = await supabase
            .from('staff_attendance')
            .insert({
              profile_id: profileId,
              company_id: companyId,
              site_id: siteId,
              clock_in_time: startAt,
              clock_out_time: endAt,
              shift_status: 'off_shift',
              total_hours: Math.round(netHours * 100) / 100,
              source: 'pos_square',
              pos_timecard_id: tc.id,
            });

          if (attendanceError) {
            // Could be a unique constraint violation if synced via another path
            if (attendanceError.code === '23505') {
              result.shiftsSkipped++;
              continue;
            }
            console.error(`[square/labor] Attendance insert error for ${tc.id}:`, attendanceError);
            result.shiftsFailed++;
            continue;
          }

          // Insert into time_entries
          const { error: timeError } = await supabase
            .from('time_entries')
            .insert({
              profile_id: profileId,
              company_id: companyId,
              site_id: siteId,
              clock_in: startAt,
              clock_out: endAt,
              entry_type: 'shift',
              status: 'completed',
              gross_hours: Math.round(grossHours * 100) / 100,
              net_hours: Math.round(netHours * 100) / 100,
              total_break_minutes: Math.round(totalBreakMinutes),
              break_start: firstBreakStart,
              break_end: firstBreakEnd,
              source: 'pos_square',
              pos_timecard_id: tc.id,
            });

          if (timeError && timeError.code !== '23505') {
            console.error(`[square/labor] time_entries insert error for ${tc.id}:`, timeError);
            // Don't fail the whole sync — attendance was already inserted
          }

          result.shiftsProcessed++;
        } catch (err) {
          console.error(`[square/labor] Failed to process timecard ${tc.id}:`, err);
          result.shiftsFailed++;
        }
      }

      // Respect rate limits between pages
      if (cursor) await sleep(200);
    } while (cursor);

    result.success = true;
    return result;
  } catch (err) {
    console.error('[square/labor] Sync failed:', err);
    try {
      handleSquareError(err);
    } catch (squareErr) {
      result.error = squareErr instanceof Error ? squareErr.message : String(err);
    }
    return result;
  }
}

// ─── Auto-Match Team Members ────────────────────────────────────────────────

/**
 * Fetch Square team members and auto-match to Teamly profiles by name.
 * Creates/updates pos_employee_mappings records.
 */
export async function autoMatchTeamMembers(
  companyId: string,
  siteId: string,
): Promise<AutoMatchResult> {
  const supabase = getSupabaseAdmin();

  const accessToken = await ensureValidToken(companyId);
  if (!accessToken) {
    throw new Error('Square token expired or unavailable');
  }

  const tokens = await getSquareTokens(companyId);
  if (!tokens?.locationId) {
    throw new Error('No Square location selected');
  }

  const client = getSquareClient(accessToken);

  // Fetch Square team members assigned to this location
  let squareMembers: Array<{
    id: string;
    givenName: string;
    familyName: string;
  }> = [];

  let cursor: string | undefined;
  do {
    const response = await withRetry(() =>
      client.teamMembers.search({
        query: {
          filter: {
            locationIds: [tokens.locationId!],
            status: 'ACTIVE',
          },
        },
        limit: 200,
        cursor,
      }),
    );

    const members = response.teamMembers ?? [];
    for (const m of members) {
      if (m.id) {
        squareMembers.push({
          id: m.id,
          givenName: m.givenName || '',
          familyName: m.familyName || '',
        });
      }
    }
    cursor = response.cursor ?? undefined;
    if (cursor) await sleep(200);
  } while (cursor);

  // Fetch Teamly profiles for this company
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('company_id', companyId);

  const profileList = (profiles || []) as Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
  }>;

  // Build normalized name → profile map
  const profileByName = new Map<string, string>();
  for (const p of profileList) {
    const normalizedName = `${(p.first_name || '').toLowerCase().trim()} ${(p.last_name || '').toLowerCase().trim()}`.trim();
    if (normalizedName) {
      profileByName.set(normalizedName, p.id);
    }
  }

  let matched = 0;
  let unmatched = 0;

  for (const member of squareMembers) {
    const squareName = `${member.givenName.toLowerCase().trim()} ${member.familyName.toLowerCase().trim()}`.trim();
    const matchedProfileId = profileByName.get(squareName) || null;
    const matchMethod = matchedProfileId ? 'auto_name' : 'unmatched';

    if (matchedProfileId) matched++;
    else unmatched++;

    // Upsert mapping
    await supabase
      .from('pos_employee_mappings')
      .upsert(
        {
          company_id: companyId,
          site_id: siteId,
          pos_provider: 'square',
          pos_team_member_id: member.id,
          pos_team_member_name: `${member.givenName} ${member.familyName}`.trim(),
          profile_id: matchedProfileId,
          match_method: matchMethod,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'company_id,pos_provider,pos_team_member_id',
          ignoreDuplicates: false,
        },
      );
  }

  return {
    matched,
    unmatched,
    total: squareMembers.length,
  };
}
