import type { ACASGuidance } from '@/types/offboarding';
import type { DismissalSubReason } from '@/types/offboarding';
import type { TerminationReason } from '@/types/teamly';

/**
 * ACAS Code of Practice Guidance
 *
 * Provides contextual legal guidance based on termination reason.
 * This is purely informational — displayed in the offboarding wizard
 * to help managers follow correct procedures.
 *
 * References:
 * - ACAS Code of Practice on Disciplinary and Grievance Procedures
 * - Employment Rights Act 1996, Part X
 * - Employment Relations Act 1999, s.10 (right to be accompanied)
 */

export function getACASGuidance(
  reason: TerminationReason,
  subReason?: DismissalSubReason | null,
): ACASGuidance {
  switch (reason) {
    case 'resigned':
      return {
        title: 'Employee Resignation',
        required_steps: [
          'Accept the resignation in writing',
          'Confirm the notice period and last working day',
          'Process outstanding pay and accrued holiday',
          'Issue P45 without unreasonable delay',
        ],
        warnings: [
          'Employees must give at least 1 week statutory notice after 1 month of service',
          'Contractual notice may be longer — check the employment contract',
          'An employee may withdraw a resignation if the employer agrees, but there is no automatic right to retract',
        ],
        documents_needed: [
          'Resignation acknowledgement letter',
          'Final pay confirmation',
        ],
        legal_references: [
          'Employment Rights Act 1996, s.86 (notice periods)',
        ],
      };

    case 'dismissed':
      return getDismissalGuidance(subReason);

    case 'redundancy':
      return {
        title: 'Redundancy',
        required_steps: [
          'Establish a genuine redundancy situation (role is no longer needed)',
          'Define fair and objective selection criteria',
          'Consult meaningfully with affected employees individually',
          'If 20+ employees affected: collective consultation required (30 days for 20-99, 45 days for 100+)',
          'Consider suitable alternative employment before confirming redundancy',
          'Allow the employee to appeal the decision',
          'Calculate and pay statutory redundancy pay',
        ],
        warnings: [
          'Employees with 2+ years service are entitled to statutory redundancy pay',
          'Selection criteria must be objective, measurable, and non-discriminatory',
          'Failure to consult properly may make the redundancy unfair',
          'You must notify the Secretary of State (HR1 form) if making 20+ employees redundant',
          'Employees on maternity or family leave have priority for suitable alternative roles',
        ],
        documents_needed: [
          'At-risk of redundancy notification letter',
          'Selection criteria and scoring matrix',
          'Consultation meeting records',
          'Redundancy confirmation letter with pay calculation',
          'Right of appeal letter',
        ],
        legal_references: [
          'Employment Rights Act 1996, Part XI (Redundancy Payments)',
          'Trade Union and Labour Relations (Consolidation) Act 1992, s.188 (collective consultation)',
          'ACAS guidance on redundancy handling',
        ],
      };

    case 'end_of_contract':
      return {
        title: 'End of Fixed-Term Contract',
        required_steps: [
          'Provide written reasons for non-renewal (after 1 year of service)',
          'Give statutory notice of non-renewal',
          'Consider if the role still exists (may be a redundancy situation)',
          'Allow the employee to appeal',
        ],
        warnings: [
          'Non-renewal of a fixed-term contract is legally a dismissal',
          'All unfair dismissal protections apply after the qualifying period',
          'Employees on fixed-term contracts for 4+ years automatically become permanent',
          'If the role continues but the person is not renewed, this may be unfair dismissal',
          'Statutory redundancy pay may be due if the role no longer exists (after 2 years service)',
        ],
        documents_needed: [
          'Written notice of non-renewal with reasons',
          'Right of appeal letter',
        ],
        legal_references: [
          'Fixed-term Employees (Prevention of Less Favourable Treatment) Regulations 2002',
          'Employment Rights Act 1996, s.95 (dismissal includes non-renewal)',
        ],
      };

    case 'mutual_agreement':
      return {
        title: 'Mutual Agreement / Settlement',
        required_steps: [
          'Negotiate terms with the employee',
          'Draft a formal settlement agreement',
          'Employee must receive independent legal advice (legal requirement)',
          'Employer typically contributes to employee\'s legal fees',
          'Both parties sign the agreement',
        ],
        warnings: [
          'A settlement agreement is not valid unless the employee receives independent legal advice',
          'The agreement must be in writing and identify the specific adviser',
          'The first GBP 30,000 of any termination payment can be tax-free if structured correctly',
          'The agreement must relate to particular identified proceedings or complaints',
          'Consider including: reference wording, confidentiality, non-derogatory clauses',
        ],
        documents_needed: [
          'Settlement agreement draft',
          'Certificate of independent legal advice',
          'Agreed reference wording',
        ],
        legal_references: [
          'Employment Rights Act 1996, s.203 (settlement agreements)',
          'ACAS guidance on settlement agreements',
        ],
      };

    case 'retired':
      return {
        title: 'Retirement',
        required_steps: [
          'Confirm the employee\'s voluntary decision to retire',
          'Document that the decision is entirely voluntary',
          'Process all outstanding pay and benefits',
          'Provide pension information and options',
        ],
        warnings: [
          'There is no default retirement age in UK law (abolished 2011)',
          'Forced retirement is likely to be age discrimination under the Equality Act 2010',
          'Employers can only enforce a compulsory retirement age if it can be objectively justified',
          'Ensure the retirement is genuinely voluntary and well-documented',
        ],
        documents_needed: [
          'Written confirmation of voluntary retirement',
          'Pension information pack',
        ],
        legal_references: [
          'Equality Act 2010, s.13 (age discrimination)',
          'Employment Equality (Repeal of Retirement Age Provisions) Regulations 2011',
        ],
      };

    case 'other':
    default:
      return {
        title: 'Other Termination',
        required_steps: [
          'Document the reason for termination clearly',
          'Follow a fair procedure appropriate to the circumstances',
          'Give appropriate notice',
          'Allow the employee to appeal',
        ],
        warnings: [
          'All dismissals must be for a fair reason and follow a fair procedure',
          'The employee has the right to be accompanied at any formal hearing',
          'Keep thorough records of the process and decisions made',
        ],
        documents_needed: [
          'Written reasons for termination',
          'Right of appeal letter',
        ],
        legal_references: [
          'Employment Rights Act 1996, s.98 (fair dismissal)',
          'ACAS Code of Practice on Disciplinary and Grievance Procedures',
        ],
      };
  }
}

function getDismissalGuidance(subReason?: DismissalSubReason | null): ACASGuidance {
  const base: ACASGuidance = {
    title: 'Dismissal',
    required_steps: [
      'Investigate the matter thoroughly and impartially',
      'Notify the employee in writing of the allegations/concerns with evidence',
      'Hold a formal disciplinary hearing (employee has right to be accompanied)',
      'Allow the employee to respond and present their case',
      'Make and communicate the decision in writing with reasons',
      'Inform the employee of their right to appeal',
      'If appealed, hold an appeal hearing with a more senior/uninvolved person',
    ],
    warnings: [
      'The employee has the statutory right to be accompanied by a trade union rep or work colleague (ERA 1999, s.10)',
      'Failure to follow the ACAS Code can result in a 25% uplift in compensation at tribunal',
      'Consider alternatives to dismissal: warnings, demotion, transfer',
      'Ensure consistency with how similar cases have been treated',
      'Tribunal claims must be brought within 3 months less 1 day of termination (extending to 6 months under ERA 2025)',
    ],
    documents_needed: [
      'Investigation report',
      'Invitation to disciplinary hearing letter',
      'Hearing outcome / dismissal letter',
      'Right of appeal letter',
      'Appeal outcome letter (if applicable)',
    ],
    legal_references: [
      'Employment Rights Act 1996, s.98 (fair reasons for dismissal)',
      'ACAS Code of Practice on Disciplinary and Grievance Procedures',
      'Employment Relations Act 1999, s.10 (right to be accompanied)',
    ],
  };

  switch (subReason) {
    case 'gross_misconduct':
      return {
        ...base,
        title: 'Summary Dismissal (Gross Misconduct)',
        required_steps: [
          'Suspend the employee on FULL PAY while investigating (suspension is not a penalty)',
          ...base.required_steps,
        ],
        warnings: [
          'Even summary dismissal requires a fair procedure — you cannot skip the hearing',
          'The "Burchell test" applies: genuine belief, reasonable grounds, reasonable investigation',
          'Mitigating circumstances must be considered',
          'Common examples: theft, fraud, violence, serious H&S breach, gross negligence',
          ...base.warnings,
        ],
      };

    case 'capability':
      return {
        ...base,
        title: 'Dismissal for Capability / Performance',
        required_steps: [
          'Document the performance concerns clearly',
          'Provide support, training, or reasonable adjustments',
          'Set clear targets with a reasonable timeframe for improvement',
          'Hold regular review meetings to assess progress',
          'If no improvement: proceed with formal process',
          ...base.required_steps.slice(1),
        ],
        warnings: [
          'For performance issues, the employee must be given a reasonable opportunity to improve',
          'For health-related capability: consider reasonable adjustments, occupational health referral',
          'Long-term sickness: follow a fair process and consider Equality Act obligations',
          ...base.warnings,
        ],
      };

    case 'conduct':
      return {
        ...base,
        title: 'Dismissal for Misconduct',
      };

    case 'statutory_illegality':
      return {
        ...base,
        title: 'Dismissal for Statutory Illegality',
        required_steps: [
          'Confirm the legal restriction preventing continued employment',
          'Consider if alternative arrangements are possible',
          'Follow a fair procedure and allow the employee to respond',
          ...base.required_steps.slice(3),
        ],
        warnings: [
          'Examples: loss of driving licence (driver role), loss of right to work, professional registration lapsed',
          'You must still follow a fair process even though employment is legally impossible',
          ...base.warnings,
        ],
      };

    case 'sosr':
      return {
        ...base,
        title: 'Dismissal for Some Other Substantial Reason (SOSR)',
        warnings: [
          'SOSR is a catch-all for legitimate reasons not covered by other categories',
          'Examples: business reorganisation, breakdown of trust, third-party pressure',
          'The reason must be substantial enough to justify dismissal',
          ...base.warnings,
        ],
      };

    default:
      return base;
  }
}
