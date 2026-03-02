import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { generateDefaultChecklist } from '@/lib/people/offboarding-checklist';
import type { TerminationReason } from '@/types/teamly';

/**
 * POST /api/people/terminate
 *
 * Initiates the offboarding process for an employee:
 * 1. Updates the profile with termination details and sets status to 'offboarding'
 * 2. Creates offboarding checklist items
 * 3. Cancels future scheduled shifts and pending leave requests
 * 4. Optionally schedules an exit interview
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      employeeId,
      companyId,
      initiatedBy,
      terminationReason,
      terminationSubReason,
      terminationNotes,
      terminationDate,
      lastWorkingDay,
      noticeEndDate,
      pilonApplicable,
      eligibleForRehire,
      scheduleExitInterview,
      managerId,
    } = body;

    if (!employeeId || !companyId || !terminationReason || !terminationDate) {
      return NextResponse.json(
        { error: 'Missing required fields: employeeId, companyId, terminationReason, terminationDate' },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    // 1. Update profile with termination details
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .update({
        status: 'offboarding',
        termination_date: terminationDate,
        termination_reason: terminationReason,
        termination_sub_reason: terminationSubReason || null,
        termination_notes: terminationNotes || null,
        last_working_day: lastWorkingDay || terminationDate,
        notice_end_date: noticeEndDate || null,
        pilon_applicable: pilonApplicable || false,
        eligible_for_rehire: eligibleForRehire ?? null,
        termination_initiated_by: initiatedBy || null,
        termination_initiated_at: new Date().toISOString(),
      })
      .eq('id', employeeId)
      .select()
      .single();

    if (profileError) {
      console.error('[terminate] Profile update error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 2. Generate and insert checklist items
    const checklistTemplates = generateDefaultChecklist(terminationReason as TerminationReason);
    const checklistRows = checklistTemplates.map((item) => ({
      company_id: companyId,
      profile_id: employeeId,
      category: item.category,
      title: item.title,
      description: item.description,
      is_required: item.is_required,
      sort_order: item.sort_order,
      auto_generated: true,
      is_completed: false,
    }));

    const { data: checklist, error: checklistError } = await admin
      .from('offboarding_checklist_items')
      .insert(checklistRows)
      .select();

    if (checklistError) {
      console.error('[terminate] Checklist insert error:', checklistError);
      // Non-fatal — continue with the process
    }

    // 3. Cancel future scheduled shifts (after last working day)
    const effectiveLastDay = lastWorkingDay || terminationDate;
    const { error: shiftsError } = await admin
      .from('scheduled_shifts')
      .update({ status: 'cancelled' })
      .eq('profile_id', employeeId)
      .gt('shift_date', effectiveLastDay)
      .in('status', ['published', 'draft', 'confirmed']);

    if (shiftsError) {
      console.error('[terminate] Cancel shifts error:', shiftsError);
      // Non-fatal — log and continue
    }

    // 4. Cancel pending leave requests (after last working day)
    const { error: leaveError } = await admin
      .from('leave_requests')
      .update({ status: 'cancelled' })
      .eq('profile_id', employeeId)
      .gt('start_date', effectiveLastDay)
      .in('status', ['pending', 'approved']);

    if (leaveError) {
      console.error('[terminate] Cancel leave error:', leaveError);
      // Non-fatal — log and continue
    }

    // 5. Optionally schedule exit interview
    if (scheduleExitInterview && managerId) {
      try {
        // Find exit_interview template
        const { data: template } = await admin
          .from('review_templates')
          .select('id')
          .eq('company_id', companyId)
          .eq('template_type', 'exit_interview')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (template) {
          // Calculate suggested date: 3 days before last working day
          const exitDate = new Date(effectiveLastDay);
          exitDate.setDate(exitDate.getDate() - 3);
          const scheduledDate = exitDate.toISOString().split('T')[0];

          await admin.from('employee_review_schedules').insert({
            company_id: companyId,
            employee_id: employeeId,
            manager_id: managerId,
            template_id: template.id,
            scheduled_date: scheduledDate,
            status: 'scheduled',
          });
        }
      } catch (err) {
        console.error('[terminate] Exit interview scheduling error:', err);
        // Non-fatal
      }
    }

    // 6. Send OA notification (fire-and-forget)
    try {
      const { oa } = await import('@/lib/oa');
      if (managerId) {
        await oa.sendNotification({
          recipientProfileId: managerId,
          companyId,
          title: 'Offboarding process started',
          body: `The offboarding process has been initiated for ${profile.full_name}. Please review and complete the offboarding checklist.`,
          href: `/dashboard/people/${employeeId}`,
        });
      }
    } catch (err) {
      console.error('[terminate] OA notification error:', err);
      // Non-fatal
    }

    return NextResponse.json({
      data: {
        profile,
        checklist: checklist || [],
      },
    });
  } catch (error) {
    console.error('[terminate]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
