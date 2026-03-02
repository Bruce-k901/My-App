import type { ChecklistCategory } from '@/types/offboarding';
import type { TerminationReason } from '@/types/teamly';

interface ChecklistItemTemplate {
  category: ChecklistCategory;
  title: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
}

/**
 * Generate default offboarding checklist items based on termination reason.
 * Returns ~25 items grouped by category.
 */
export function generateDefaultChecklist(
  terminationReason: TerminationReason,
): ChecklistItemTemplate[] {
  const items: ChecklistItemTemplate[] = [];
  let order = 0;

  // ── IT & Access ──────────────────────────────────────────────
  items.push(
    {
      category: 'it_access',
      title: 'Disable email account and set up forwarding',
      description: 'Deactivate the employee\'s email account and configure auto-forwarding or out-of-office reply.',
      is_required: true,
      sort_order: order++,
    },
    {
      category: 'it_access',
      title: 'Revoke system access (Opsly, POS, etc.)',
      description: 'Remove login credentials and access to all company systems and applications.',
      is_required: true,
      sort_order: order++,
    },
    {
      category: 'it_access',
      title: 'Change shared passwords if applicable',
      description: 'Update any shared account passwords the employee had access to.',
      is_required: false,
      sort_order: order++,
    },
    {
      category: 'it_access',
      title: 'Transfer ownership of shared files and documents',
      description: 'Reassign ownership of Google Drive, shared folders, or other collaborative documents.',
      is_required: true,
      sort_order: order++,
    },
  );

  // ── Equipment & Property ─────────────────────────────────────
  items.push(
    {
      category: 'equipment',
      title: 'Collect company keys and access fobs',
      description: 'Retrieve all building keys, security fobs, and access cards.',
      is_required: true,
      sort_order: order++,
    },
    {
      category: 'equipment',
      title: 'Collect company uniform / PPE',
      description: 'Retrieve all uniform items and personal protective equipment.',
      is_required: false,
      sort_order: order++,
    },
    {
      category: 'equipment',
      title: 'Recover company devices (laptop, phone, tablet)',
      description: 'Collect all company-owned electronic devices and wipe company data.',
      is_required: true,
      sort_order: order++,
    },
    {
      category: 'equipment',
      title: 'Collect company credit/payment cards',
      description: 'Retrieve and cancel any company credit or payment cards issued to the employee.',
      is_required: false,
      sort_order: order++,
    },
  );

  // ── Payroll & Finance ────────────────────────────────────────
  items.push(
    {
      category: 'payroll',
      title: 'Calculate and process final pay',
      description: 'Calculate outstanding wages, accrued holiday pay, and any other entitlements.',
      is_required: true,
      sort_order: order++,
    },
    {
      category: 'payroll',
      title: 'Issue P45',
      description: 'Submit leaving date via Full Payment Submission to HMRC and provide P45 parts 1A, 2, and 3 to the employee. This is a legal requirement.',
      is_required: true,
      sort_order: order++,
    },
    {
      category: 'payroll',
      title: 'Cancel recurring payroll adjustments',
      description: 'Remove any recurring deductions, allowances, or adjustments from payroll.',
      is_required: true,
      sort_order: order++,
    },
    {
      category: 'payroll',
      title: 'Notify pension provider',
      description: 'Inform the pension provider of the employee\'s departure and update auto-enrolment records.',
      is_required: true,
      sort_order: order++,
    },
  );

  // Add redundancy-specific payroll items
  if (terminationReason === 'redundancy') {
    items.push({
      category: 'payroll',
      title: 'Process statutory redundancy payment',
      description: 'Calculate and process statutory redundancy pay based on age, service length, and weekly pay (capped at statutory limit).',
      is_required: true,
      sort_order: order++,
    });
  }

  // ── Administration ───────────────────────────────────────────
  items.push(
    {
      category: 'admin',
      title: 'Remove from rota and future schedules',
      description: 'Cancel all future scheduled shifts and remove from rotation patterns.',
      is_required: true,
      sort_order: order++,
    },
    {
      category: 'admin',
      title: 'Cancel pending leave requests',
      description: 'Cancel any approved or pending leave requests after the last working day.',
      is_required: true,
      sort_order: order++,
    },
    {
      category: 'admin',
      title: 'Update org chart and reporting lines',
      description: 'Reassign direct reports and update the organisational structure.',
      is_required: false,
      sort_order: order++,
    },
    {
      category: 'admin',
      title: 'Send leaving announcement to team',
      description: 'Communicate the employee\'s departure to relevant colleagues and stakeholders.',
      is_required: false,
      sort_order: order++,
    },
    {
      category: 'admin',
      title: 'Provide or agree reference wording',
      description: 'Prepare a reference or agree on the wording with the employee.',
      is_required: false,
      sort_order: order++,
    },
  );

  // ── Knowledge Transfer ───────────────────────────────────────
  items.push(
    {
      category: 'knowledge_transfer',
      title: 'Handover of current projects and responsibilities',
      description: 'Document and transfer all ongoing work, projects, and regular duties.',
      is_required: true,
      sort_order: order++,
    },
    {
      category: 'knowledge_transfer',
      title: 'Document role-specific processes',
      description: 'Ensure any undocumented processes or knowledge are captured before departure.',
      is_required: false,
      sort_order: order++,
    },
    {
      category: 'knowledge_transfer',
      title: 'Hand over client/customer relationships',
      description: 'Introduce replacements to key clients, customers, or external contacts.',
      is_required: false,
      sort_order: order++,
    },
  );

  // ── Compliance ───────────────────────────────────────────────
  items.push(
    {
      category: 'compliance',
      title: 'Conduct exit interview',
      description: 'Schedule and conduct an exit interview to gather feedback on the employee\'s experience.',
      is_required: false,
      sort_order: order++,
    },
  );

  // Add dismissal-specific compliance items
  if (terminationReason === 'dismissed') {
    items.push({
      category: 'compliance',
      title: 'Ensure disciplinary file is complete',
      description: 'Verify all investigation notes, hearing records, and decision letters are filed correctly.',
      is_required: true,
      sort_order: order++,
    });
  }

  items.push(
    {
      category: 'compliance',
      title: 'Remind employee of ongoing obligations',
      description: 'Remind the employee of any confidentiality clauses, non-compete restrictions, or data protection obligations.',
      is_required: true,
      sort_order: order++,
    },
    {
      category: 'compliance',
      title: 'Archive employee record with retention schedule',
      description: 'Ensure the employee file is retained for 6 years after termination (Limitation Act 1980) and flagged for GDPR-compliant deletion after.',
      is_required: true,
      sort_order: order++,
    },
    {
      category: 'compliance',
      title: 'Update insurance and headcount records',
      description: 'Notify insurers and update headcount for employer\'s liability and other policies.',
      is_required: false,
      sort_order: order++,
    },
  );

  return items;
}
