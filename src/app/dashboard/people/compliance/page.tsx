'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useSiteContext } from '@/contexts/SiteContext';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Fingerprint,
  GraduationCap,
  FileText,
  Clock,
} from '@/components/ui/icons';
import RecordTrainingModal from '@/components/training/RecordTrainingModal';
import { AssignCourseModal } from '@/components/training/AssignCourseModal';
import { ComplianceScoreRing } from '@/components/people/compliance/ComplianceScoreRing';
import { ComplianceCategoryCard } from '@/components/people/compliance/ComplianceCategoryCard';
import { ComplianceFilters, type ComplianceFilterState } from '@/components/people/compliance/ComplianceFilters';
import { ComplianceTable } from '@/components/people/compliance/ComplianceTable';
import { ComplianceActionSheet } from '@/components/people/compliance/ComplianceActionSheet';
import { ComplianceExport } from '@/components/people/compliance/ComplianceExport';
import type {
  EmployeeCompliance,
  ComplianceItem,
  ComplianceStatus,
  ComplianceSummary,
  ComplianceCategory,
  ComplianceActionType,
  ComplianceActionSheetState,
} from '@/types/compliance';

// ── Helpers ────────────────────────────────────────────────

function daysBetween(date: string): number {
  const d = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function worstStatus(statuses: ComplianceStatus[]): ComplianceStatus {
  const priority: ComplianceStatus[] = [
    'expired',
    'missing',
    'action_required',
    'expiring_soon',
    'compliant',
    'not_applicable',
  ];
  for (const s of priority) {
    if (statuses.includes(s)) return s;
  }
  return 'not_applicable';
}

// ── Raw DB types ───────────────────────────────────────────

interface ProfileRow {
  profile_id: string;
  full_name: string;
  avatar_url: string | null;
  employee_number: string | null;
  department: string | null;
  start_date: string | null;
  probation_end_date: string | null;
  contract_type: string | null;
  home_site: string | null;
  app_role: string | null;
  right_to_work_status: string | null;
  right_to_work_expiry: string | null;
  right_to_work_document_type: string | null;
  dbs_status: string | null;
  dbs_certificate_number: string | null;
  dbs_check_date: string | null;
  dbs_update_service_registered: boolean | null;
  national_insurance_number: string | null;
  pension_enrolled: boolean | null;
  termination_date: string | null;
}

interface DocRow {
  profile_id: string;
  document_type: string;
  expires_at: string | null;
  verified_at: string | null;
  created_at: string;
}

interface TrainingRow {
  profile_id: string;
  course_code: string;
  course_name: string;
  course_id: string;
  is_mandatory: boolean;
  compliance_status: string;
  expiry_date: string | null;
}

// ── Page ───────────────────────────────────────────────────

export default function CompliancePage() {
  const { profile, companyId } = useAppContext();
  const siteContext = useSiteContext();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeCompliance[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  // Default site filter to the global site context selection (same as rota)
  const [filters, setFilters] = useState<ComplianceFilterState>({
    status: 'all',
    category: 'all',
    department: 'all',
    site: siteContext.selectedSiteId || 'all',
    expiryWindow: 'all',
    search: '',
  });

  // Sync site filter when global site context changes
  useEffect(() => {
    if (!siteContext.loading) {
      setFilters((f) => ({ ...f, site: siteContext.selectedSiteId || 'all' }));
    }
  }, [siteContext.selectedSiteId, siteContext.loading]);

  // Action sheet state
  const [sheetState, setSheetState] = useState<ComplianceActionSheetState>({
    open: false,
    mode: null,
    employeeId: '',
    employeeName: '',
  });

  // Training modals
  const [recordModal, setRecordModal] = useState<{
    open: boolean;
    employeeId?: string;
    employeeName?: string;
    courseId?: string;
    courseName?: string;
  }>({ open: false });

  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    profileId: string;
    profileName: string;
    courseId: string;
    courseName: string;
  } | null>(null);

  // ── Data fetching ─────────────────────────────────────────

  const fetchData = useCallback(async (silent = false) => {
    if (!companyId) return;
    if (!silent) setLoading(true);

    try {
      const [profilesRes, docsRes, trainingRes, siteAccessRes] = await Promise.all([
        supabase.rpc('get_compliance_profiles', { p_company_id: companyId }),
        supabase
          .from('employee_documents')
          .select('profile_id, document_type, expires_at, verified_at, created_at')
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .in('document_type', [
            'employment_contract',
            'contract',
            'policy_acknowledgement',
            'right_to_work',
            'dbs_certificate',
            'visa',
            'passport',
            'p45',
          ]),
        supabase
          .from('compliance_matrix_view')
          .select('profile_id, course_code, course_name, course_id, is_mandatory, compliance_status, expiry_date')
          .eq('company_id', companyId)
          .eq('is_mandatory', true),
        supabase
          .from('user_site_access')
          .select('profile_id, site_id')
          .eq('company_id', companyId),
      ]);

      // Filter out terminated employees and platform admins client-side
      // (RPC returns all profiles for the company)
      const profiles = ((profilesRes.data || []) as ProfileRow[]).filter(
        (p) => !p.termination_date && p.app_role?.toLowerCase() !== 'platform_admin'
      );
      const docs = (docsRes.data || []) as DocRow[];
      const training = (trainingRes.data || []) as TrainingRow[];
      const siteAccessRows = (siteAccessRes.data || []) as { profile_id: string; site_id: string }[];

      // Site names from SiteContext (same source as rota)
      const sitesList = siteContext.accessibleSites;

      // Build site access lookup: profile_id → Set<site_id>
      const siteAccessMap = new Map<string, Set<string>>();
      for (const row of siteAccessRows) {
        if (!siteAccessMap.has(row.profile_id)) siteAccessMap.set(row.profile_id, new Set());
        siteAccessMap.get(row.profile_id)!.add(row.site_id);
      }

      // Build docs lookup: profile_id → doc_type[]
      const docsMap = new Map<string, Set<string>>();
      for (const d of docs) {
        if (!docsMap.has(d.profile_id)) docsMap.set(d.profile_id, new Set());
        docsMap.get(d.profile_id)!.add(d.document_type);
      }

      // Build training lookup: profile_id → TrainingRow[]
      const trainingMap = new Map<string, TrainingRow[]>();
      for (const t of training) {
        if (!trainingMap.has(t.profile_id)) trainingMap.set(t.profile_id, []);
        trainingMap.get(t.profile_id)!.push(t);
      }

      // Unique departments
      const deptSet = new Set<string>();
      for (const p of profiles) {
        if (p.department) deptSet.add(p.department);
      }
      setDepartments(Array.from(deptSet).sort());

      // Site name lookup
      const siteNameMap = new Map<string, string>();
      for (const s of sitesList) siteNameMap.set(s.id, s.name);

      // ── Build compliance per employee ──
      const result: EmployeeCompliance[] = profiles.map((p) => {
        const empDocs = docsMap.get(p.profile_id) || new Set<string>();
        const empTraining = trainingMap.get(p.profile_id) || [];
        const items: ComplianceItem[] = [];

        // ── RIGHT TO WORK ──
        const rtwDocUploaded = empDocs.has('right_to_work') || empDocs.has('visa') || empDocs.has('passport');
        let rtwStatus: ComplianceStatus;
        let rtwDetail = '';

        if (p.right_to_work_status === 'not_required') {
          rtwStatus = 'compliant';
          rtwDetail = 'Not required (British/Irish citizen)';
        } else if (p.right_to_work_status === 'verified') {
          if (p.right_to_work_expiry) {
            const days = daysBetween(p.right_to_work_expiry);
            if (days < 0) {
              rtwStatus = 'expired';
              rtwDetail = `Expired ${p.right_to_work_expiry}`;
            } else if (days <= 90) {
              rtwStatus = 'expiring_soon';
              rtwDetail = `Expires in ${days} days`;
            } else {
              rtwStatus = rtwDocUploaded ? 'compliant' : 'action_required';
              rtwDetail = p.right_to_work_document_type
                ? p.right_to_work_document_type.replace(/_/g, ' ')
                : 'Verified';
            }
          } else {
            rtwStatus = rtwDocUploaded ? 'compliant' : 'action_required';
            rtwDetail = 'Indefinite leave / citizen';
          }
        } else if (p.right_to_work_status === 'expired') {
          rtwStatus = 'expired';
          rtwDetail = 'RTW status expired';
        } else {
          rtwStatus = p.right_to_work_status === 'pending' ? 'action_required' : 'missing';
          rtwDetail = p.right_to_work_status === 'pending' ? 'Check pending' : 'Not checked';
        }

        items.push({
          category: 'right_to_work',
          label: 'Right to Work Check',
          status: rtwStatus,
          detail: rtwDetail,
          expiryDate: p.right_to_work_expiry || undefined,
          daysUntilExpiry: p.right_to_work_expiry ? daysBetween(p.right_to_work_expiry) : undefined,
          actionType: 'update_rtw',
        });

        if (!rtwDocUploaded && rtwStatus !== 'not_applicable') {
          items.push({
            category: 'right_to_work',
            label: 'RTW Supporting Document',
            status: 'missing',
            detail: 'No document uploaded',
            actionType: 'upload_doc',
            actionMeta: { docType: 'right_to_work', docLabel: 'RTW Document' },
          });
        }

        // ── DBS ──
        let dbsStatus: ComplianceStatus;
        let dbsDetail = '';

        if (p.dbs_status === 'not_required') {
          dbsStatus = 'not_applicable';
          dbsDetail = 'Not required for this role';
        } else if (p.dbs_status === 'clear') {
          // Advisory: re-check if older than 3 years
          if (p.dbs_check_date) {
            const daysSinceCheck = -daysBetween(p.dbs_check_date);
            if (daysSinceCheck > 1095) {
              dbsStatus = 'expiring_soon';
              dbsDetail = `Clear, but checked ${Math.floor(daysSinceCheck / 365)}+ years ago`;
            } else {
              dbsStatus = 'compliant';
              dbsDetail = `Clear${p.dbs_certificate_number ? ` #${p.dbs_certificate_number}` : ''}`;
            }
          } else {
            dbsStatus = 'compliant';
            dbsDetail = 'Clear (no date recorded)';
          }
        } else if (p.dbs_status === 'pending') {
          dbsStatus = 'action_required';
          dbsDetail = 'DBS check pending';
        } else if (p.dbs_status === 'issues_found') {
          dbsStatus = 'action_required';
          dbsDetail = 'Issues found — review required';
        } else {
          dbsStatus = 'missing';
          dbsDetail = 'DBS status not set';
        }

        items.push({
          category: 'dbs',
          label: 'DBS Check',
          status: dbsStatus,
          detail: dbsDetail,
          actionType: 'update_dbs',
        });

        // ── TRAINING ──
        const trainingStatuses: ComplianceStatus[] = [];
        for (const t of empTraining) {
          let tStatus: ComplianceStatus;
          let tDetail = '';

          if (t.compliance_status === 'current' || t.compliance_status === 'compliant') {
            if (t.expiry_date) {
              const days = daysBetween(t.expiry_date);
              if (days <= 60) {
                tStatus = 'expiring_soon';
                tDetail = `Expires in ${days} days`;
              } else {
                tStatus = 'compliant';
                tDetail = `Valid until ${t.expiry_date}`;
              }
            } else {
              tStatus = 'compliant';
              tDetail = 'Current';
            }
          } else if (t.compliance_status === 'expired') {
            tStatus = 'expired';
            tDetail = t.expiry_date ? `Expired ${t.expiry_date}` : 'Expired';
          } else if (t.compliance_status === 'expiring_soon') {
            tStatus = 'expiring_soon';
            tDetail = t.expiry_date ? `Expires ${t.expiry_date}` : 'Expiring soon';
          } else if (t.compliance_status === 'in_progress' || t.compliance_status === 'assigned') {
            tStatus = 'action_required';
            tDetail = t.compliance_status === 'in_progress' ? 'In progress' : 'Assigned';
          } else {
            tStatus = 'missing';
            tDetail = 'Not started';
          }

          trainingStatuses.push(tStatus);
          items.push({
            category: 'training',
            label: t.course_name || t.course_code,
            status: tStatus,
            detail: tDetail,
            expiryDate: t.expiry_date || undefined,
            daysUntilExpiry: t.expiry_date ? daysBetween(t.expiry_date) : undefined,
            actionType: tStatus === 'compliant' || tStatus === 'expiring_soon' ? 'record_training' : 'record_training',
            actionMeta: {
              courseId: t.course_id,
              courseName: t.course_name || t.course_code,
            },
          });
        }

        // ── DOCUMENTS ──
        const docItems: { key: string; label: string; docType: string }[] = [
          { key: 'contract', label: 'Employment Contract', docType: 'employment_contract' },
          { key: 'ni', label: 'National Insurance Number', docType: '' },
          { key: 'pension', label: 'Pension Enrolment', docType: '' },
        ];

        const docStatuses: ComplianceStatus[] = [];

        // Contract
        const hasContract = empDocs.has('employment_contract') || empDocs.has('contract');
        docStatuses.push(hasContract ? 'compliant' : 'missing');
        items.push({
          category: 'documents',
          label: 'Employment Contract',
          status: hasContract ? 'compliant' : 'missing',
          detail: hasContract ? 'Uploaded' : 'Not uploaded',
          actionType: hasContract ? undefined : 'upload_doc',
          actionMeta: hasContract ? undefined : { docType: 'employment_contract', docLabel: 'Employment Contract' },
        });

        // NI Number
        const hasNI = !!p.national_insurance_number;
        docStatuses.push(hasNI ? 'compliant' : 'missing');
        items.push({
          category: 'documents',
          label: 'National Insurance Number',
          status: hasNI ? 'compliant' : 'missing',
          detail: hasNI ? 'Recorded' : 'Not recorded',
          actionType: hasNI ? undefined : 'update_field',
          actionMeta: hasNI ? undefined : { fieldName: 'national_insurance_number', fieldLabel: 'NI Number', fieldType: 'text' },
        });

        // Pension
        const hasPension = p.pension_enrolled === true;
        docStatuses.push(hasPension ? 'compliant' : 'action_required');
        items.push({
          category: 'documents',
          label: 'Pension Auto-Enrolment',
          status: hasPension ? 'compliant' : 'action_required',
          detail: hasPension ? 'Enrolled' : 'Not enrolled',
          actionType: hasPension ? undefined : 'update_field',
          actionMeta: hasPension ? undefined : {
            fieldName: 'pension_enrolled',
            fieldLabel: 'Pension Enrolled',
            fieldType: 'boolean',
          },
        });

        // ── PROBATION ──
        let probStatus: ComplianceStatus = 'not_applicable';
        let probDetail = '';

        if (p.probation_end_date) {
          const days = daysBetween(p.probation_end_date);
          if (days < 0) {
            probStatus = 'compliant';
            probDetail = `Completed (ended ${p.probation_end_date})`;
          } else if (days <= 14) {
            probStatus = 'expiring_soon';
            probDetail = `Ends in ${days} days — review due`;
          } else {
            probStatus = 'compliant';
            probDetail = `Ends ${p.probation_end_date}`;
          }
        } else {
          probStatus = 'not_applicable';
          probDetail = 'No probation set';
        }

        items.push({
          category: 'probation',
          label: 'Probation Period',
          status: probStatus,
          detail: probDetail,
        });

        // ── Aggregate ──
        const catStatus = (cat: ComplianceCategory) =>
          worstStatus(items.filter((i) => i.category === cat).map((i) => i.status));

        const applicableItems = items.filter((i) => i.status !== 'not_applicable');
        const compliantCount = applicableItems.filter((i) => i.status === 'compliant').length;
        const score = applicableItems.length > 0
          ? Math.round((compliantCount / applicableItems.length) * 100)
          : 100;

        // Collect all site IDs: home_site + user_site_access entries
        const allSiteIds = new Set<string>();
        if (p.home_site) allSiteIds.add(p.home_site);
        const accessSites = siteAccessMap.get(p.profile_id);
        if (accessSites) accessSites.forEach((sid) => allSiteIds.add(sid));

        return {
          profileId: p.profile_id,
          fullName: p.full_name,
          employeeNumber: p.employee_number || undefined,
          department: p.department || undefined,
          siteId: p.home_site || undefined,
          siteIds: Array.from(allSiteIds),
          siteName: p.home_site ? siteNameMap.get(p.home_site) : undefined,
          avatarUrl: p.avatar_url || undefined,
          startDate: p.start_date || undefined,
          overallScore: score,
          items,
          rtw: catStatus('right_to_work'),
          dbs: catStatus('dbs'),
          training: trainingStatuses.length > 0 ? worstStatus(trainingStatuses) : 'not_applicable',
          documents: worstStatus(docStatuses),
          probation: probStatus,
        };
      });

      setEmployees(result);
    } catch (err) {
      console.error('[compliance] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, siteContext.accessibleSites]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Filtering ──────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = employees;

    // Site filter — checks home_site AND user_site_access entries
    if (filters.site !== 'all') {
      result = result.filter((e) => e.siteIds.includes(filters.site));
    }

    if (filters.department !== 'all') {
      result = result.filter((e) => e.department === filters.department);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          (e.employeeNumber && e.employeeNumber.toLowerCase().includes(q))
      );
    }

    if (filters.status === 'compliant') {
      result = result.filter((e) => e.overallScore === 100);
    } else if (filters.status === 'action_required') {
      result = result.filter((e) =>
        e.items.some((i) => i.status === 'action_required' || i.status === 'expired' || i.status === 'missing')
      );
    } else if (filters.status === 'expiring_soon') {
      result = result.filter((e) => e.items.some((i) => i.status === 'expiring_soon'));
    }

    if (filters.category !== 'all') {
      result = result.filter((e) => {
        const catItems = e.items.filter((i) => i.category === filters.category);
        return catItems.some((i) => i.status !== 'compliant' && i.status !== 'not_applicable');
      });
    }

    if (filters.expiryWindow !== 'all') {
      const windowDays = parseInt(filters.expiryWindow);
      result = result.filter((e) =>
        e.items.some(
          (i) => i.daysUntilExpiry !== undefined && i.daysUntilExpiry >= 0 && i.daysUntilExpiry <= windowDays
        )
      );
    }

    return result;
  }, [employees, filters]);

  // ── Summary ────────────────────────────────────────────────

  // Summary is computed from the filtered list so KPI cards reflect the current view
  const summary = useMemo<ComplianceSummary>(() => {
    const pool = filtered;
    const total = pool.length;
    const fullyCompliant = pool.filter((e) => e.overallScore === 100).length;
    const actionRequired = pool.filter((e) =>
      e.items.some((i) => i.status === 'action_required' || i.status === 'expired' || i.status === 'missing')
    ).length;
    const expiringSoon = pool.filter((e) =>
      e.items.some((i) => i.status === 'expiring_soon')
    ).length;
    const overallScore = total > 0 ? Math.round(pool.reduce((s, e) => s + e.overallScore, 0) / total) : 100;

    const categories: { category: ComplianceCategory; label: string }[] = [
      { category: 'right_to_work', label: 'Right to Work' },
      { category: 'dbs', label: 'DBS Checks' },
      { category: 'training', label: 'Training' },
      { category: 'documents', label: 'Documents' },
      { category: 'probation', label: 'Probation' },
    ];

    const byCategory = categories.map(({ category, label }) => {
      const catEmployees = pool.filter((e) =>
        e.items.some((i) => i.category === category && i.status !== 'not_applicable')
      );
      const compliant = catEmployees.filter((e) => {
        const catItems = e.items.filter((i) => i.category === category && i.status !== 'not_applicable');
        return catItems.every((i) => i.status === 'compliant');
      }).length;
      const urgent = catEmployees.filter((e) =>
        e.items.some(
          (i) =>
            i.category === category &&
            (i.status === 'expired' || i.status === 'missing' || i.status === 'action_required')
        )
      ).length;

      return { category, label, compliant, total: catEmployees.length, urgent };
    });

    return { totalEmployees: total, fullyCompliant, actionRequired, expiringSoon, overallScore, byCategory };
  }, [filtered]);

  // ── Action handlers ────────────────────────────────────────

  const handleAction = (
    employeeId: string,
    employeeName: string,
    actionType: ComplianceActionType,
    meta?: Record<string, string>,
  ) => {
    if (actionType === 'record_training' && meta?.courseId) {
      setRecordModal({
        open: true,
        employeeId,
        employeeName,
        courseId: meta.courseId,
        courseName: meta.courseName,
      });
    } else if (actionType === 'assign_training' && meta?.courseId) {
      setAssignModal({
        open: true,
        profileId: employeeId,
        profileName: employeeName,
        courseId: meta.courseId,
        courseName: meta.courseName || '',
      });
    } else {
      setSheetState({
        open: true,
        mode: actionType,
        employeeId,
        employeeName,
        meta,
      });
    }
  };

  // ── Category card icons ────────────────────────────────────

  const CATEGORY_ICONS: Record<string, React.ElementType> = {
    right_to_work: ShieldCheck,
    dbs: Fingerprint,
    training: GraduationCap,
    documents: FileText,
    probation: Clock,
  };

  // ── Urgent items count ─────────────────────────────────────

  const urgentRTW = filtered.filter((e) => e.rtw === 'expired' || e.rtw === 'missing' || e.rtw === 'action_required').length;
  const urgentTraining = filtered.filter((e) =>
    e.items.some((i) => i.category === 'training' && (i.status === 'expired' || i.status === 'missing'))
  ).length;
  const urgentDocs = filtered.filter((e) =>
    e.items.some((i) => i.category === 'documents' && i.status === 'missing')
  ).length;

  const totalUrgent = urgentRTW + urgentTraining + urgentDocs;

  // ── Render ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-teamly" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-teamly" />
            Compliance Hub
          </h1>
          <p className="text-sm text-theme-secondary mt-1">
            UK employment compliance across your workforce
          </p>
        </div>
        <ComplianceExport data={filtered} />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="col-span-2 md:col-span-1 flex justify-center">
          <ComplianceScoreRing score={summary.overallScore} />
        </div>
        {summary.byCategory.map((cat) => (
          <ComplianceCategoryCard
            key={cat.category}
            category={cat.category}
            label={cat.label}
            icon={CATEGORY_ICONS[cat.category] || ShieldCheck}
            compliant={cat.compliant}
            total={cat.total}
            urgent={cat.urgent}
            active={filters.category === cat.category}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                category: f.category === cat.category ? 'all' : cat.category,
              }))
            }
          />
        ))}
      </div>

      {/* Urgent Banner */}
      {totalUrgent > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-red-500">Urgent:</span>{' '}
            <span className="text-theme-primary">
              {urgentRTW > 0 && `${urgentRTW} RTW issue${urgentRTW > 1 ? 's' : ''}`}
              {urgentRTW > 0 && urgentTraining > 0 && ' · '}
              {urgentTraining > 0 && `${urgentTraining} training expired`}
              {(urgentRTW > 0 || urgentTraining > 0) && urgentDocs > 0 && ' · '}
              {urgentDocs > 0 && `${urgentDocs} missing documents`}
            </span>
          </div>
          <button
            onClick={() => setFilters((f) => ({ ...f, status: 'action_required' }))}
            className="ml-auto text-xs font-medium text-red-500 hover:text-red-400 whitespace-nowrap"
          >
            Show all →
          </button>
        </div>
      )}

      {/* Filters */}
      <ComplianceFilters
        filters={filters}
        onChange={setFilters}
        departments={departments}
        sites={siteContext.accessibleSites}
      />

      {/* Summary line */}
      <p className="text-xs text-theme-secondary">
        Showing {filtered.length} of {employees.length} employees
        {filters.site !== 'all' && ` · ${siteContext.accessibleSites.find((s) => s.id === filters.site)?.name || 'Site'}`}
        {filters.status !== 'all' && ` · ${filters.status.replace(/_/g, ' ')}`}
      </p>

      {/* Table */}
      <ComplianceTable employees={filtered} onAction={handleAction} />

      {/* Action Sheet */}
      <ComplianceActionSheet
        state={sheetState}
        onClose={() => setSheetState((s) => ({ ...s, open: false }))}
        onSuccess={() => fetchData(true)}
      />

      {/* Record Training Modal */}
      <RecordTrainingModal
        isOpen={recordModal.open}
        onClose={() => setRecordModal({ open: false })}
        onSuccess={() => {
          setRecordModal({ open: false });
          fetchData(true);
        }}
        employeeId={recordModal.employeeId}
        employeeName={recordModal.employeeName}
        courseId={recordModal.courseId}
        courseName={recordModal.courseName}
      />

      {/* Assign Course Modal */}
      {assignModal && (
        <AssignCourseModal
          isOpen={assignModal.open}
          onClose={() => setAssignModal(null)}
          profileId={assignModal.profileId}
          profileName={assignModal.profileName}
          courseId={assignModal.courseId}
          courseName={assignModal.courseName}
          onSuccess={() => {
            setAssignModal(null);
            fetchData(true);
          }}
        />
      )}
    </div>
  );
}
