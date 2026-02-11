"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { Loader2, RefreshCw, GraduationCap, AlertTriangle, ChevronDown, ChevronRight, CalendarPlus, Edit2 } from '@/components/ui/icons';
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import RecordTrainingModal from "@/components/training/RecordTrainingModal";

interface SiteOption {
  id: string;
  name: string;
}

type TrainingStatus = "current" | "due_soon" | "expired" | "missing" | "not_trained";

interface CourseTrainingData {
  course_id: string;
  course_name: string;
  course_code: string | null;
  category: string;
  is_mandatory: boolean;
  training_status: string;
  completed_at: string | null;
  expiry_date: string | null;
  compliance_status: string;
  score_percentage?: number | null;
  certificate_number?: string | null;
}

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  app_role: string;
  position_title: string | null;
  home_site: string | null;
  site_name: string | null;
}

interface MatrixRow {
  profile: ProfileData;
  courses: CourseTrainingData[];
  overallStatus: TrainingStatus;
  statusCounts: Record<TrainingStatus, number>;
}

const STATUS_STYLES: Record<TrainingStatus, string> = {
  current: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  due_soon: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  expired: "bg-red-500/10 text-red-400 border border-red-500/20",
  missing: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  not_trained: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
};

// Map certificate_type query params to course codes for task navigation
const CERT_TYPE_TO_COURSE_CODES: Record<string, string[]> = {
  food_safety: ['FS-L2', 'FS-L3'],
  h_and_s: ['HS-L2'],
  fire_marshal: ['FIRE'],
  first_aid: ['FAW'],
  cossh: ['COSHH', 'ALLERGY'],
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const daysUntil = (dateString: string | null | undefined) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

function complianceToTrainingStatus(compliance: string, expiryDate: string | null): TrainingStatus {
  switch (compliance?.toLowerCase()) {
    case 'compliant':
    case 'current':
      return 'current';
    case 'expiring_soon': {
      const days = daysUntil(expiryDate);
      return days !== null && days <= 60 ? 'due_soon' : 'current';
    }
    case 'expired':
      return 'expired';
    case 'in_progress':
    case 'assigned':
    case 'invited':
      return 'missing';
    case 'required':
      return 'not_trained';
    case 'optional':
    default:
      return 'missing';
  }
}

function trainingStatusLabel(status: TrainingStatus, expiryDate: string | null): string {
  const days = daysUntil(expiryDate);
  switch (status) {
    case 'current':
      return expiryDate ? `Valid until ${formatDate(expiryDate)}` : 'Completed';
    case 'due_soon':
      return days !== null ? `Due in ${days} day${days === 1 ? '' : 's'}` : 'Expiring soon';
    case 'expired':
      return days !== null ? `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago` : 'Expired';
    case 'not_trained':
      return 'Not trained';
    case 'missing':
    default:
      return 'Not recorded';
  }
}

function StatusBadge({ status, children }: { status: TrainingStatus; children: React.ReactNode }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      {children}
    </span>
  );
}

function TrainingMatrixPageContent() {
  const { loading: authLoading, companyId, siteId, profile: currentUserProfile, company } = useAppContext();
  const effectiveCompanyId = company?.id || companyId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteParam = useMemo(() => searchParams?.get("site"), [searchParams]);
  const profileIdParam = useMemo(() => searchParams?.get("profile_id"), [searchParams]);
  const certificateTypeParam = useMemo(() => searchParams?.get("certificate_type"), [searchParams]);

  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | "all" | "home">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProfiles, setExpandedProfiles] = useState<Record<string, boolean>>({});
  const [highlightedProfileId, setHighlightedProfileId] = useState<string | null>(null);

  // RecordTrainingModal state
  const [recordModal, setRecordModal] = useState<{
    employeeId?: string;
    employeeName?: string;
    courseId?: string;
    courseName?: string;
    existingRecord?: {
      id: string;
      completed_at?: string | null;
      expiry_date?: string | null;
      score_percentage?: number | null;
      certificate_number?: string | null;
      trainer_name?: string | null;
      notes?: string | null;
    };
  } | null>(null);

  // Booking modal state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingSaveLoading, setBookingSaveLoading] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    userId: "",
    course: "",
    level: "",
    provider: "",
    scheduledDate: "",
    notes: "",
  });

  useEffect(() => {
    if (siteParam) {
      setSelectedSite(siteParam === "home" || siteParam === "all" ? siteParam : siteParam);
    } else if (siteId) {
      setSelectedSite("home");
    }
  }, [siteParam, siteId]);

  useEffect(() => {
    if (!effectiveCompanyId) return;
    const fetchSites = async () => {
      const { data } = await supabase
        .from("sites")
        .select("id,name")
        .eq("company_id", effectiveCompanyId)
        .order("name");
      setSites(data || []);
    };
    fetchSites();
  }, [effectiveCompanyId]);

  const fetchMatrixData = useCallback(async () => {
    if (!effectiveCompanyId) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('compliance_matrix_view')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .order('full_name')
        .order('course_name');

      if (selectedSite === "home" && siteId) {
        query = query.eq('home_site', siteId);
      } else if (selectedSite && selectedSite !== "all") {
        query = query.eq('home_site', selectedSite);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        if (queryError.code === '42P01') {
          setError('Compliance matrix view not available. Please run database migrations.');
        } else {
          throw queryError;
        }
        setMatrixData([]);
      } else {
        setMatrixData(data || []);
      }
    } catch (err: any) {
      console.error("Failed to load training matrix", err);
      setError(err?.message || "Failed to load training matrix");
      setMatrixData([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveCompanyId, selectedSite, siteId]);

  useEffect(() => {
    fetchMatrixData();
  }, [fetchMatrixData]);

  // Build matrix rows from compliance_matrix_view data
  const matrixRows: MatrixRow[] = useMemo(() => {
    const profileMap = new Map<string, { profile: ProfileData; courses: CourseTrainingData[] }>();

    matrixData.forEach((entry: any) => {
      const pid = entry.profile_id;
      if (!profileMap.has(pid)) {
        profileMap.set(pid, {
          profile: {
            id: pid,
            full_name: entry.full_name || entry.email || 'Unknown',
            email: entry.email || '',
            app_role: entry.app_role || 'staff',
            position_title: entry.position_title || null,
            home_site: entry.home_site || null,
            site_name: entry.site_name || null,
          },
          courses: [],
        });
      }

      profileMap.get(pid)!.courses.push({
        course_id: entry.course_id,
        course_name: entry.course_name,
        course_code: entry.course_code || null,
        category: entry.category || 'General',
        is_mandatory: entry.is_mandatory || false,
        training_status: entry.training_status || 'not_started',
        completed_at: entry.completed_at || null,
        expiry_date: entry.expiry_date || null,
        compliance_status: entry.compliance_status || 'optional',
        score_percentage: entry.score_percentage || null,
        certificate_number: entry.certificate_number || null,
      });
    });

    const statusPriority: Record<TrainingStatus, number> = {
      current: 1,
      due_soon: 2,
      missing: 3,
      not_trained: 4,
      expired: 5,
    };

    return Array.from(profileMap.values()).map(({ profile, courses }) => {
      const counts: Record<TrainingStatus, number> = { current: 0, due_soon: 0, missing: 0, not_trained: 0, expired: 0 };
      let worstStatus: TrainingStatus = 'current';

      courses.forEach(course => {
        const status = complianceToTrainingStatus(course.compliance_status, course.expiry_date);
        counts[status]++;
        if (statusPriority[status] > statusPriority[worstStatus]) {
          worstStatus = status;
        }
      });

      return { profile, courses, overallStatus: worstStatus, statusCounts: counts };
    });
  }, [matrixData]);

  // Unique profiles for booking form
  const allProfiles = useMemo(
    () => matrixRows.map(r => r.profile),
    [matrixRows]
  );

  const summaryStats = useMemo(() => {
    const totals = { staff: allProfiles.length, current: 0, dueSoon: 0, expired: 0, missing: 0, notTrained: 0 };
    matrixRows.forEach(row => {
      totals.current += row.statusCounts.current;
      totals.dueSoon += row.statusCounts.due_soon;
      totals.expired += row.statusCounts.expired;
      totals.missing += row.statusCounts.missing;
      totals.notTrained += row.statusCounts.not_trained;
    });
    return totals;
  }, [matrixRows, allProfiles.length]);

  // Handle query params for navigation from tasks
  useEffect(() => {
    if (profileIdParam && matrixRows.length > 0) {
      const row = matrixRows.find(r => r.profile.id === profileIdParam);
      if (row) {
        setExpandedProfiles(prev => ({ ...prev, [profileIdParam]: true }));
        setHighlightedProfileId(profileIdParam);

        if (certificateTypeParam) {
          const courseCodes = CERT_TYPE_TO_COURSE_CODES[certificateTypeParam] || [];
          const matchingCourse = row.courses.find(c =>
            c.course_code && courseCodes.includes(c.course_code.toUpperCase())
          );

          if (matchingCourse) {
            setTimeout(async () => {
              // Look up existing record for edit mode
              const { data: records } = await supabase
                .from('training_records')
                .select('id, completed_at, expiry_date, score_percentage, certificate_number, trainer_name, notes')
                .eq('profile_id', profileIdParam)
                .eq('course_id', matchingCourse.course_id)
                .order('completed_at', { ascending: false })
                .limit(1);

              setRecordModal({
                employeeId: profileIdParam,
                employeeName: row.profile.full_name,
                courseId: matchingCourse.course_id,
                courseName: matchingCourse.course_name,
                existingRecord: records?.[0] || undefined,
              });
            }, 800);
          }
        }

        setTimeout(() => {
          const element = document.getElementById(`profile-row-${profileIdParam}`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => setHighlightedProfileId(null), 5000);
        }, 500);
      }
    }
  }, [profileIdParam, certificateTypeParam, matrixRows]);

  const toggleProfileExpansion = (profileId: string) => {
    setExpandedProfiles(prev => ({ ...prev, [profileId]: !prev[profileId] }));
  };

  const handleOpenRecordModal = () => {
    if (allProfiles.length === 0) {
      toast.error("No team members available to record training");
      return;
    }
    setRecordModal({});
  };

  const handleEditCourse = async (profile: ProfileData, course: CourseTrainingData) => {
    const hasCompletion = ['compliant', 'current', 'expiring_soon', 'expired'].includes(
      course.compliance_status?.toLowerCase()
    );

    if (hasCompletion) {
      const { data: records } = await supabase
        .from('training_records')
        .select('id, completed_at, expiry_date, score_percentage, certificate_number, trainer_name, notes')
        .eq('profile_id', profile.id)
        .eq('course_id', course.course_id)
        .order('completed_at', { ascending: false })
        .limit(1);

      setRecordModal({
        employeeId: profile.id,
        employeeName: profile.full_name,
        courseId: course.course_id,
        courseName: course.course_name,
        existingRecord: records?.[0] || undefined,
      });
    } else {
      setRecordModal({
        employeeId: profile.id,
        employeeName: profile.full_name,
        courseId: course.course_id,
        courseName: course.course_name,
      });
    }
  };

  const handleOpenBookingModal = () => {
    if (allProfiles.length === 0) {
      toast.error("No team members available to book training");
      return;
    }
    setBookingForm({
      userId: allProfiles[0]?.id || "",
      course: "",
      level: "",
      provider: "",
      scheduledDate: "",
      notes: "",
    });
    setIsBookingModalOpen(true);
  };

  const handleSaveBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!effectiveCompanyId) { toast.error("Missing company context"); return; }
    if (!bookingForm.userId) { toast.error("Select a team member"); return; }
    if (!bookingForm.course.trim()) { toast.error("Enter the course name"); return; }

    const targetProfile = allProfiles.find(p => p.id === bookingForm.userId);
    setBookingSaveLoading(true);

    try {
      const { error: bookingError } = await supabase.from("training_bookings").insert({
        company_id: effectiveCompanyId,
        user_id: bookingForm.userId,
        site_id: targetProfile?.home_site || null,
        course: bookingForm.course.trim(),
        level: bookingForm.level?.trim() || null,
        provider: bookingForm.provider?.trim() || null,
        scheduled_date: bookingForm.scheduledDate || null,
        notes: bookingForm.notes?.trim() || null,
        created_by: currentUserProfile?.id ?? null,
      });

      if (bookingError) throw bookingError;

      toast.success("Training booking captured");
      setIsBookingModalOpen(false);
      fetchMatrixData();
    } catch (err: any) {
      console.error("Failed to save training booking", err);
      toast.error(err?.message || "Failed to save training booking");
    } finally {
      setBookingSaveLoading(false);
    }
  };

  const selectedBookingProfile = useMemo(
    () => allProfiles.find(p => p.id === bookingForm.userId),
    [bookingForm.userId, allProfiles]
  );

  const actions = (
    <div className="flex items-center gap-3">
      <button
        onClick={fetchMatrixData}
        className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm text-white transition hover:bg-white/10"
        disabled={loading}
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Refresh
      </button>
      <button
        onClick={handleOpenRecordModal}
        className="inline-flex items-center gap-2 rounded-lg border border-magenta-500 px-3 py-2 text-sm font-medium text-magenta-400 transition hover:bg-magenta-500/10 hover:shadow-[0_0_14px_rgba(211,126,145,0.35)]"
      >
        <GraduationCap className="h-4 w-4" />
        Record Training
      </button>
      <button
        onClick={handleOpenBookingModal}
        className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/70 px-3 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/10 hover:shadow-[0_0_14px_rgba(34,211,238,0.35)]"
      >
        <CalendarPlus className="h-4 w-4" />
        Book Training
      </button>
    </div>
  );

  const siteSelector = (
    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
      <label htmlFor="site-filter" className="text-slate-400">Filter by site</label>
      <select
        id="site-filter"
        className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-magenta-500"
        value={selectedSite}
        onChange={(e) => setSelectedSite(e.target.value as typeof selectedSite)}
      >
        <option value="all">All sites</option>
        {siteId && <option value="home">Home site only</option>}
        {sites.map(site => (
          <option key={site.id} value={site.id}>{site.name}</option>
        ))}
      </select>
    </div>
  );

  if (authLoading) {
    return (
      <OrgContentWrapper title="Training Matrix">
        <div className="flex items-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading account…
        </div>
      </OrgContentWrapper>
    );
  }

  if (!companyId) {
    return (
      <OrgContentWrapper title="Training Matrix">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          Connect your company profile to manage staff training records.
        </div>
      </OrgContentWrapper>
    );
  }

  return (
    <OrgContentWrapper title="Training Matrix" actions={actions}>
      {siteSelector}

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <SummaryCard label="Team Members" value={summaryStats.staff} tone="default" />
        <SummaryCard label="Up to Date" value={summaryStats.current} tone="success" />
        <SummaryCard label="Due Soon" value={summaryStats.dueSoon} tone="warning" />
        <SummaryCard label="Expired / Missing" value={summaryStats.expired + summaryStats.missing + summaryStats.notTrained} tone="danger" />
      </section>

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading training matrix…
        </div>
      ) : matrixRows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-slate-300">
          No team members found for this filter.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {matrixRows.map(({ profile, courses, overallStatus, statusCounts }) => {
            const isExpanded = expandedProfiles[profile.id] ?? false;
            const isHighlighted = highlightedProfileId === profile.id;
            const countsSummary = (Object.entries(statusCounts) as Array<[TrainingStatus, number]>)
              .filter(([, count]) => count > 0)
              .sort((a, b) => b[1] - a[1]);

            return (
              <article
                id={`profile-row-${profile.id}`}
                key={profile.id}
                className={`rounded-xl border p-5 transition ${
                  isHighlighted
                    ? 'border-blue-500/60 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                    : 'border-white/10 bg-white/5 hover:border-magenta-500/40'
                }`}
              >
                <header className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{profile.full_name}</h3>
                    <p className="text-sm text-slate-400">
                      {profile.app_role || "Team Member"}
                      {profile.position_title ? ` • ${profile.position_title}` : ""}
                    </p>
                  </div>
                  <div className="text-xs text-slate-400">
                    {profile.site_name && <p>Site: {profile.site_name}</p>}
                  </div>
                </header>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <StatusBadge status={overallStatus}>
                    {trainingStatusLabel(overallStatus, null)}
                  </StatusBadge>
                  {countsSummary
                    .filter(([status]) => status !== overallStatus)
                    .map(([status, count]) => (
                      <span key={status} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-400">
                        {count} {status.replace("_", " ")}
                      </span>
                    ))}
                </div>

                <button
                  onClick={() => toggleProfileExpansion(profile.id)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-magenta-500/40 hover:text-magenta-200"
                  type="button"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {isExpanded ? "Hide detailed breakdown" : "View detailed breakdown"}
                </button>

                <div className={`mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 ${isExpanded ? "" : "hidden"}`}>
                  {courses.map(course => {
                    const status = complianceToTrainingStatus(course.compliance_status, course.expiry_date);
                    const label = trainingStatusLabel(status, course.expiry_date);

                    return (
                      <div
                        key={course.course_id}
                        className="rounded-lg border border-white/10 bg-[#0f1220] p-4 relative group"
                      >
                        <button
                          onClick={() => handleEditCourse(profile, course)}
                          className="absolute top-2 right-2 p-1.5 rounded-md border border-white/10 bg-white/5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-white/10 hover:border-magenta-500/40"
                          title="Edit training record"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-slate-400 hover:text-magenta-400" />
                        </button>
                        <div className="flex items-center justify-between gap-3 pr-8">
                          <h4 className="text-sm font-semibold text-white">{course.course_name}</h4>
                          <StatusBadge status={status}>{label}</StatusBadge>
                        </div>
                        <div className="mt-2 space-y-1">
                          {course.completed_at && (
                            <p className="text-xs text-slate-400">
                              Completed: {formatDate(course.completed_at)}
                            </p>
                          )}
                          {course.expiry_date && (
                            <p className="text-xs text-slate-400">
                              Expires: {formatDate(course.expiry_date)}
                            </p>
                          )}
                          {course.is_mandatory && (
                            <span className="inline-block px-1.5 py-0.5 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                              Mandatory
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Record/Edit Training Modal */}
      {recordModal !== null && (
        <RecordTrainingModal
          isOpen={true}
          onClose={() => setRecordModal(null)}
          onSuccess={() => {
            setRecordModal(null);
            // If navigated from task, go back to tasks
            if (profileIdParam && certificateTypeParam) {
              router.push('/dashboard/todays_tasks');
            } else {
              fetchMatrixData();
            }
          }}
          employeeId={recordModal.employeeId}
          employeeName={recordModal.employeeName}
          courseId={recordModal.courseId}
          courseName={recordModal.courseName}
          existingRecord={recordModal.existingRecord}
        />
      )}

      {/* Book Training Modal */}
      <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
        <DialogContent className="w-full max-w-2xl">
          <DialogHeader>
            <DialogTitle>Book Training Session</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveBooking} className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Student
                <select
                  value={bookingForm.userId}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, userId: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  required
                >
                  <option value="" disabled>Select team member…</option>
                  {allProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Home site
                <input
                  value={selectedBookingProfile?.site_name || "No home site recorded"}
                  readOnly
                  className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-slate-200"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Course / Qualification
                <input
                  type="text"
                  value={bookingForm.course}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, course: e.target.value }))}
                  placeholder="e.g., First Aid at Work"
                  className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Level (optional)
                <input
                  type="text"
                  value={bookingForm.level}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, level: e.target.value }))}
                  placeholder="e.g., Level 2"
                  className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Training provider
                <input
                  type="text"
                  value={bookingForm.provider}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, provider: e.target.value }))}
                  placeholder="e.g., Red Cross Training"
                  className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Scheduled date
                <input
                  type="date"
                  value={bookingForm.scheduledDate}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Notes (optional)
              <textarea
                value={bookingForm.notes}
                onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add agenda, prerequisites, or travel details"
                rows={3}
                className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </label>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={bookingSaveLoading}
                className="rounded-lg border border-cyan-500/70 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 disabled:opacity-60"
              >
                {bookingSaveLoading ? "Saving…" : "Book Training"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </OrgContentWrapper>
  );
}

export default function TrainingMatrixPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#0B0D13]">
        <div className="text-neutral-400">Loading training matrix...</div>
      </div>
    }>
      <TrainingMatrixPageContent />
    </Suspense>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "success" | "warning" | "danger";
}) {
  const toneStyles: Record<typeof tone, string> = {
    default: "border-white/10 bg-white/5 text-slate-200",
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    danger: "border-rose-500/20 bg-rose-500/10 text-rose-100",
  };

  return (
    <div className={`rounded-xl border p-4 ${toneStyles[tone]}`}>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
