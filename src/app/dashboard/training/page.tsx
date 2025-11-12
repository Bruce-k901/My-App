"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, GraduationCap, AlertTriangle, ChevronDown, ChevronRight, Upload, CalendarPlus } from "lucide-react";
import { toast } from "sonner";

import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert } from "@/types/supabase";
import { useSearchParams } from "next/navigation";

type ProfileRow = Tables<"profiles">;
type TrainingRecordRow = Tables<"training_records">;

interface SiteOption {
  id: string;
  name: string;
}

type TrainingStatus = "current" | "due_soon" | "expired" | "missing" | "not_trained";

interface CertificationSummary {
  label: string;
  status: TrainingStatus;
  statusLabel: string;
  detail?: string;
  lastSession?: string;
}

const STATUS_STYLES: Record<TrainingStatus, string> = {
  current: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  due_soon: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  expired: "bg-red-500/10 text-red-400 border border-red-500/20",
  missing: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  not_trained: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
};

const TRAINING_OPTIONS: Array<{
  value: TrainingRecordRow["training_type"] | "other";
  label: string;
  description: string;
  requiresLevel?: boolean;
  suggestedLevel?: number;
  profileUpdate: (args: {
    level?: number | null;
    expiryDate?: string | null;
  }) => Record<string, any> | null;
}> = [
  {
    value: "level2_hygiene",
    label: "Food Safety (Level 2/3/4)",
    description: "Updates food safety level and expiry date",
    requiresLevel: true,
    suggestedLevel: 2,
    profileUpdate: ({ level, expiryDate }) => {
      if (!level && !expiryDate) return null;
      return {
        food_safety_level: level ?? null,
        food_safety_expiry_date: expiryDate ?? null,
      };
    },
  },
  {
    value: "fire_safety",
    label: "Fire Marshal",
    description: "Marks user as trained and tracks expiry",
    profileUpdate: ({ expiryDate }) => ({
      fire_marshal_trained: true,
      fire_marshal_expiry_date: expiryDate ?? null,
    }),
  },
  {
    value: "first_aid",
    label: "First Aid",
    description: "Marks user as first aid trained and tracks expiry",
    profileUpdate: ({ expiryDate }) => ({
      first_aid_trained: true,
      first_aid_expiry_date: expiryDate ?? null,
    }),
  },
  {
    value: "allergen",
    label: "COSHH / Allergen Awareness",
    description: "Tracks COSHH or allergen refresher training",
    profileUpdate: ({ expiryDate }) => ({
      cossh_trained: true,
      cossh_expiry_date: expiryDate ?? null,
    }),
  },
  {
    value: "other",
    label: "Health & Safety Induction",
    description: "Updates Health & Safety level and expiry",
    requiresLevel: true,
    profileUpdate: ({ level, expiryDate }) => ({
      h_and_s_level: level ?? null,
      h_and_s_expiry_date: expiryDate ?? null,
    }),
  },
];

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
  const diff = date.getTime() - today.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
};

function StatusBadge({ status, children }: { status: TrainingStatus; children: React.ReactNode }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      {children}
    </span>
  );
}

export default function TrainingMatrixPage() {
  const { loading: authLoading, companyId, siteId, profile: currentUserProfile } = useAppContext();
  const searchParams = useSearchParams();
  const siteParam = useMemo(() => searchParams?.get("site"), [searchParams]);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecordRow[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | "all" | "home">("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [recordsEnabled, setRecordsEnabled] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [bookingSaveLoading, setBookingSaveLoading] = useState(false);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [expandedProfiles, setExpandedProfiles] = useState<Record<string, boolean>>({});

  const [formState, setFormState] = useState({
    userId: "",
    trainingType: TRAINING_OPTIONS[0].value as (TrainingRecordRow["training_type"] | "other"),
    level: "",
    provider: "",
    completedDate: new Date().toISOString().slice(0, 10),
    expiryDate: "",
    certificateUrl: "",
  });

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
      const normalized = siteParam === "home" || siteParam === "all" ? siteParam : siteParam;
      setSelectedSite((prev) => (prev === normalized ? prev : (normalized as typeof prev)));
    } else if (siteId) {
      setSelectedSite((prev) => (prev === "home" ? prev : "home"));
    }
  }, [siteParam, siteId]);

  useEffect(() => {
    if (!companyId) return;

    const fetchSites = async () => {
      const { data, error: sitesError } = await supabase
        .from("sites")
        .select("id,name")
        .eq("company_id", companyId)
        .order("name");

      if (sitesError) {
        console.error("Failed to load sites", sitesError);
        return;
      }

      setSites(data || []);
    };

    fetchSites();
  }, [companyId]);

  const fetchMatrixData = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    setError(null);

    try {
      const baseColumns = [
        "id",
        "full_name",
        "email",
        "app_role",
        "position_title",
        "home_site",
        "site_id",
        "food_safety_level",
        "food_safety_expiry_date",
        "h_and_s_level",
        "h_and_s_expiry_date",
        "fire_marshal_trained",
        "fire_marshal_expiry_date",
        "first_aid_trained",
        "first_aid_expiry_date",
        "cossh_trained",
        "cossh_expiry_date",
      ].join(",");

      let query = supabase
        .from("profiles")
        .select(baseColumns)
        .eq("company_id", companyId)
        .order("full_name", { ascending: true });

      if (selectedSite === "home" && siteId) {
        query = query.or(`site_id.eq.${siteId},home_site.eq.${siteId}`);
      } else if (selectedSite && selectedSite !== "all") {
        query = query.or(`site_id.eq.${selectedSite},home_site.eq.${selectedSite}`);
      }

      const { data: profileData, error: profileError } = await query;

      if (profileError) {
        throw profileError;
      }

      setProfiles(profileData || []);

      const userIds = (profileData || []).map((profile) => profile.id).filter(Boolean);

      if (userIds.length === 0) {
        setTrainingRecords([]);
        return;
      }

      const { data: records, error: recordsError } = await supabase
        .from("training_records")
        .select("id,user_id,training_type,completed_date,expiry_date,provider,certificate_url")
        .in("user_id", userIds)
        .order("completed_date", { ascending: false });

      if (recordsError) {
        const missingTable = recordsError.code === "42P01" || recordsError.message?.includes("training_records");
        if (missingTable) {
          console.warn("training_records table not available. Skipping record fetch.");
          setRecordsEnabled(false);
          setTrainingRecords([]);
        } else {
          throw recordsError;
        }
      } else {
        setRecordsEnabled(true);
        setTrainingRecords(records || []);
      }
    } catch (err: any) {
      console.error("Failed to load training matrix", err);
      setError(err?.message || "Failed to load training matrix");
      setProfiles([]);
      setTrainingRecords([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedSite, siteId]);

  useEffect(() => {
    fetchMatrixData();
  }, [fetchMatrixData]);

  const recordsByUser = useMemo(() => {
    const map = new Map<string, TrainingRecordRow[]>();
    trainingRecords.forEach((record) => {
      if (!record.user_id) return;
      const list = map.get(record.user_id) || [];
      list.push(record);
      map.set(record.user_id, list);
    });

    map.forEach((list, userId) => {
      list.sort((a, b) => {
        const aDate = a.completed_date || "";
        const bDate = b.completed_date || "";
        return bDate.localeCompare(aDate);
      });
      map.set(userId, list);
    });

    return map;
  }, [trainingRecords]);

  const matrixRows = useMemo(() => {
    const statusPriority: Record<TrainingStatus, number> = {
      current: 1,
      due_soon: 2,
      missing: 3,
      not_trained: 4,
      expired: 5,
    };

    const computeStatus = (options: {
      trained?: boolean | null;
      hasRecord?: boolean;
      expiryDate?: string | null;
      detail?: string;
      fallback?: string;
      trainingType?: TrainingRecordRow["training_type"] | "other";
      userId: string;
    }): CertificationSummary => {
      const { trained, hasRecord, expiryDate, detail, fallback, trainingType, userId } = options;
      const days = daysUntil(expiryDate || null);
      const lastSession = recordsByUser.get(userId)?.find((record) => {
        if (!trainingType) return true;
        if (trainingType === "other") {
          return record.training_type === "other";
        }
        return record.training_type === trainingType;
      });

      let status: TrainingStatus = "missing";
      let statusLabel = fallback || "Not recorded";

      if (trained === false) {
        status = "not_trained";
        statusLabel = "Not trained";
      } else if (trained === true || hasRecord || expiryDate) {
        if (days === null) {
          status = hasRecord ? "missing" : "not_trained";
          statusLabel = hasRecord ? "Expiry not recorded" : statusLabel;
        } else if (days < 0) {
          status = "expired";
          statusLabel = `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
        } else if (days <= 60) {
          status = "due_soon";
          statusLabel = `Due in ${days} day${days === 1 ? "" : "s"}`;
        } else {
          status = "current";
          statusLabel = `Valid until ${formatDate(expiryDate || null)}`;
        }
      }

      return {
        label: detail || statusLabel,
        status,
        statusLabel,
        lastSession: lastSession?.completed_date ? formatDate(lastSession.completed_date) : undefined,
      };
    };

    return profiles.map((profile) => {
      const certificationSummaries: Record<string, CertificationSummary> = {
        foodSafety: computeStatus({
          hasRecord: !!profile.food_safety_level,
          expiryDate: profile.food_safety_expiry_date,
          detail: profile.food_safety_level
            ? `Level ${profile.food_safety_level}`
            : "Level not recorded",
          fallback: "Level not recorded",
          trainingType: "level2_hygiene",
          userId: profile.id,
        }),
        healthSafety: computeStatus({
          hasRecord: !!profile.h_and_s_level,
          expiryDate: profile.h_and_s_expiry_date,
          detail: profile.h_and_s_level
            ? `Level ${profile.h_and_s_level}`
            : "Level not recorded",
          fallback: "Not recorded",
          trainingType: "other",
          userId: profile.id,
        }),
        fireMarshal: computeStatus({
          trained: profile.fire_marshal_trained,
          expiryDate: profile.fire_marshal_expiry_date,
          fallback: "Not trained",
          trainingType: "fire_safety",
          userId: profile.id,
        }),
        firstAid: computeStatus({
          trained: profile.first_aid_trained,
          expiryDate: profile.first_aid_expiry_date,
          fallback: "Not trained",
          trainingType: "first_aid",
          userId: profile.id,
        }),
        cossh: computeStatus({
          trained: profile.cossh_trained,
          expiryDate: profile.cossh_expiry_date,
          fallback: "Not recorded",
          trainingType: "allergen",
          userId: profile.id,
        }),
      };

      const userRecords = recordsByUser.get(profile.id) || [];
      const lastRecord = userRecords[0];

      const defaultCounts: Record<TrainingStatus, number> = {
        current: 0,
        due_soon: 0,
        missing: 0,
        not_trained: 0,
        expired: 0,
      };

      return {
        profile,
        certificationSummaries,
        lastRecord,
        overallStatus: (Object.values(certificationSummaries).reduce((worst, current) =>
          statusPriority[current.status] > statusPriority[worst.status] ? current : worst,
        certificationSummaries.foodSafety)),
        statusCounts: Object.values(certificationSummaries).reduce(
          (acc, summary) => {
            acc[summary.status] = acc[summary.status] + 1;
            return acc;
          },
          defaultCounts
        ),
      };
    });
  }, [profiles, recordsByUser]);

  const summaryStats = useMemo(() => {
    const totals = {
      staff: profiles.length,
      current: 0,
      dueSoon: 0,
      expired: 0,
      missing: 0,
      notTrained: 0,
    };

    matrixRows.forEach((row) => {
      Object.values(row.certificationSummaries).forEach((summary) => {
        switch (summary.status) {
          case "current":
            totals.current += 1;
            break;
          case "due_soon":
            totals.dueSoon += 1;
            break;
          case "expired":
            totals.expired += 1;
            break;
          case "missing":
            totals.missing += 1;
            break;
          case "not_trained":
            totals.notTrained += 1;
            break;
          default:
            break;
        }
      });
    });

    return totals;
  }, [matrixRows, profiles.length]);

  const selectedBookingProfile = useMemo(
    () => profiles.find((profile) => profile.id === bookingForm.userId),
    [bookingForm.userId, profiles]
  );

  const handleOpenRecordModal = () => {
    if (profiles.length === 0) {
      toast.error("No team members available to record training");
      return;
    }
    setFormState((prev) => ({
      ...prev,
      userId: profiles[0]?.id || "",
      completedDate: new Date().toISOString().slice(0, 10),
    }));
    setIsModalOpen(true);
  };

  const handleOpenBookingModal = () => {
    if (profiles.length === 0) {
      toast.error("No team members available to book training");
      return;
    }

    setBookingForm({
      userId: profiles[0]?.id || "",
      course: "",
      level: "",
      provider: "",
      scheduledDate: "",
      notes: "",
    });
    setIsBookingModalOpen(true);
  };

  const toggleProfileExpansion = (profileId: string) => {
    setExpandedProfiles((prev) => ({ ...prev, [profileId]: !(prev[profileId] ?? false) }));
  };

  const handleSaveRecord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.userId) {
      toast.error("Select a team member to record training");
      return;
    }

    const trainingOption = TRAINING_OPTIONS.find((option) => option.value === formState.trainingType);

    if (!trainingOption) {
      toast.error("Select a valid training type");
      return;
    }

    const levelValue = formState.level ? Number(formState.level) : trainingOption.suggestedLevel ?? null;
    if (trainingOption.requiresLevel && (levelValue === null || Number.isNaN(levelValue))) {
      toast.error("Enter a valid training level");
      return;
    }

    setSaveLoading(true);

    try {
      const insertPayload: TablesInsert<"training_records"> = {
        user_id: formState.userId,
        training_type:
          trainingOption.value === "other"
            ? ("other" as TrainingRecordRow["training_type"])
            : trainingOption.value,
        completed_date: formState.completedDate || null,
        expiry_date: formState.expiryDate || null,
        provider: formState.provider || null,
        certificate_url: formState.certificateUrl || null,
      };

      const { error: insertError } = await supabase
        .from("training_records")
        .insert(insertPayload);

      if (insertError) {
        throw insertError;
      }

      const profileUpdates = trainingOption.profileUpdate({
        level: trainingOption.requiresLevel ? levelValue : null,
        expiryDate: formState.expiryDate || null,
      });

      if (profileUpdates && Object.keys(profileUpdates).length > 0) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update(profileUpdates)
          .eq("id", formState.userId);

        if (updateError) {
          throw updateError;
        }
      }

      toast.success("Training record saved and profile updated");
      setIsModalOpen(false);
      setFormState({
        userId: "",
        trainingType: TRAINING_OPTIONS[0].value,
        level: "",
        provider: "",
        completedDate: new Date().toISOString().slice(0, 10),
        expiryDate: "",
        certificateUrl: "",
      });

      fetchMatrixData();
    } catch (err: any) {
      console.error("Failed to save training record", err);
      toast.error(err?.message || "Failed to save training record");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!companyId) {
      toast.error("Missing company context");
      return;
    }

    if (!bookingForm.userId) {
      toast.error("Select a team member to book training");
      return;
    }

    const courseName = bookingForm.course.trim();
    if (!courseName) {
      toast.error("Enter the course or qualification being booked");
      return;
    }

    const targetProfile = selectedBookingProfile;
    const resolvedSiteId = targetProfile?.home_site || targetProfile?.site_id || null;

    setBookingSaveLoading(true);

    try {
      const { error: bookingError } = await supabase.from("training_bookings").insert({
        company_id: companyId,
        user_id: bookingForm.userId,
        site_id: resolvedSiteId,
        course: courseName,
        level: bookingForm.level ? bookingForm.level.trim() : null,
        provider: bookingForm.provider ? bookingForm.provider.trim() : null,
        scheduled_date: bookingForm.scheduledDate || null,
        notes: bookingForm.notes ? bookingForm.notes.trim() : null,
        created_by: currentUserProfile?.id ?? null,
      });

      if (bookingError) {
        throw bookingError;
      }

      toast.success("Training booking captured");
      setIsBookingModalOpen(false);
      setBookingForm({
        userId: "",
        course: "",
        level: "",
        provider: "",
        scheduledDate: "",
        notes: "",
      });

      // Optionally refresh the matrix in case bookings influence downstream workflows
      fetchMatrixData();
    } catch (err: any) {
      console.error("Failed to save training booking", err);
      toast.error(err?.message || "Failed to save training booking");
    } finally {
      setBookingSaveLoading(false);
    }
  };

  const handleCertificateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!companyId) {
      toast.error("Missing company context");
      event.target.value = "";
      return;
    }

    setUploadingCertificate(true);

    try {
      const fileExt = file.name.split(".").pop();
      const random = Math.random().toString(36).slice(2, 8);
      const filePath = `${companyId}/training-certificates/${Date.now()}-${random}.${fileExt}`;

      const uploadToBucket = async (bucket: string) =>
        supabase.storage.from(bucket).upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/pdf",
        });

      let bucketName = "training-certificates";
      let { error: uploadError } = await uploadToBucket(bucketName);

      if (uploadError) {
        if (uploadError.message?.includes("does not exist") || uploadError.message?.includes("Bucket not found")) {
          bucketName = "global_docs";
          const fallback = await uploadToBucket(bucketName);
          uploadError = fallback.error;
        }
      }

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      setFormState((prev) => ({ ...prev, certificateUrl: publicUrl }));
      toast.success("Certificate uploaded");
    } catch (err: any) {
      console.error("Certificate upload failed", err);
      toast.error(err?.message || "Failed to upload certificate");
    } finally {
      setUploadingCertificate(false);
      event.target.value = "";
    }
  };

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
        className="inline-flex items-center gap-2 rounded-lg border border-magenta-500 px-3 py-2 text-sm font-medium text-magenta-400 transition hover:bg-magenta-500/10 hover:shadow-[0_0_14px_rgba(236,72,153,0.35)]"
      >
        <GraduationCap className="h-4 w-4" />
        Record Training Session
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
      <label htmlFor="site-filter" className="text-slate-400">
        Filter by site
      </label>
      <select
        id="site-filter"
        className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-magenta-500"
        value={selectedSite}
        onChange={(event) => setSelectedSite(event.target.value as typeof selectedSite)}
      >
        <option value="all">All sites</option>
        {siteId && <option value="home">Home site only</option>}
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
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
      ) : profiles.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-slate-300">
          No team members found for this filter.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {matrixRows.map(({ profile, certificationSummaries, lastRecord, overallStatus, statusCounts }) => {
            const isExpanded = expandedProfiles[profile.id] ?? false;
            const countsSummary = (Object.entries(statusCounts) as Array<[TrainingStatus, number]>).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);

            return (
              <article key={profile.id} className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-magenta-500/40">
              <header className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{profile.full_name || profile.email || "Unnamed user"}</h3>
                  <p className="text-sm text-slate-400">
                    {profile.app_role || "Team Member"}
                    {profile.position_title ? ` • ${profile.position_title}` : ""}
                  </p>
                </div>
                <div className="text-xs text-slate-400">
                  {profile.home_site && (
                    <p>Home site: {resolveSiteName(profile.home_site, sites)}</p>
                  )}
                  {lastRecord?.completed_date && (
                    <p>Last training logged: {formatDate(lastRecord.completed_date)}</p>
                  )}
                </div>
              </header>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <StatusBadge status={overallStatus.status}>{overallStatus.statusLabel}</StatusBadge>
                  {countsSummary
                    .filter(([status]) => status !== overallStatus.status)
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
                  <TrainingStatusCard
                    title="Food Safety"
                    status={certificationSummaries.foodSafety}
                  />
                  <TrainingStatusCard
                    title="Health & Safety"
                    status={certificationSummaries.healthSafety}
                  />
                  <TrainingStatusCard
                    title="Fire Marshal"
                    status={certificationSummaries.fireMarshal}
                  />
                  <TrainingStatusCard
                    title="First Aid"
                    status={certificationSummaries.firstAid}
                  />
                  <TrainingStatusCard
                    title="COSHH / Allergen"
                    status={certificationSummaries.cossh}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!recordsEnabled && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
          The training records table has not been created yet. Run the training migrations to enable historic record keeping.
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-full max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Training Session</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveRecord} className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Team member
                <select
                  value={formState.userId}
                  onChange={(event) => setFormState((prev) => ({ ...prev, userId: event.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-magenta-500"
                  required
                >
                  <option value="" disabled>
                    Select team member…
                  </option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email || "Unnamed"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Training type
                <select
                  value={formState.trainingType}
                  onChange={(event) => {
                    const value = event.target.value as typeof formState.trainingType;
                    const option = TRAINING_OPTIONS.find((opt) => opt.value === value);
                    setFormState((prev) => ({
                      ...prev,
                      trainingType: value,
                      level: option?.requiresLevel ? String(option.suggestedLevel ?? "") : "",
                    }));
                  }}
                  className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-magenta-500"
                  required
                >
                  {TRAINING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-400">
                  {TRAINING_OPTIONS.find((opt) => opt.value === formState.trainingType)?.description}
                </span>
              </label>
            </div>

            {TRAINING_OPTIONS.find((option) => option.value === formState.trainingType)?.requiresLevel && (
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Training level / grade
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={formState.level}
                  onChange={(event) => setFormState((prev) => ({ ...prev, level: event.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-magenta-500"
                  required
                />
              </label>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Completed on
                <input
                  type="date"
                  value={formState.completedDate}
                  onChange={(event) => setFormState((prev) => ({ ...prev, completedDate: event.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-magenta-500"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Expiry date
                <input
                  type="date"
                  value={formState.expiryDate}
                  onChange={(event) => setFormState((prev) => ({ ...prev, expiryDate: event.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-magenta-500"
                  required
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Training provider (optional)
              <input
                type="text"
                value={formState.provider}
                onChange={(event) => setFormState((prev) => ({ ...prev, provider: event.target.value }))}
                className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-magenta-500"
                placeholder="e.g., ServeSafe Academy"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Certificate file
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-magenta-500/40 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  {uploadingCertificate ? "Uploading…" : "Upload certificate"}
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.gif,image/*"
                    className="hidden"
                    onChange={handleCertificateUpload}
                    disabled={uploadingCertificate}
                  />
                </label>
                {formState.certificateUrl && (
                  <a
                    href={formState.certificateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-magenta-300 underline"
                  >
                    View uploaded certificate
                  </a>
                )}
              </div>
              <span className="text-xs text-slate-400">Accepted formats: PDF or image files up to 10MB.</span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
                disabled={saveLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-magenta-500 px-4 py-2 text-sm font-medium text-magenta-400 transition hover:bg-magenta-500/10 hover:shadow-[0_0_14px_rgba(236,72,153,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saveLoading}
              >
                {saveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save record
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
                  onChange={(event) =>
                    setBookingForm((prev) => ({
                      ...prev,
                      userId: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  required
                >
                  <option value="" disabled>
                    Select team member…
                  </option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email || "Unnamed"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Home site
                <input
                  value={
                    selectedBookingProfile?.home_site
                      ? resolveSiteName(selectedBookingProfile.home_site, sites)
                      : "No home site recorded"
                  }
                  readOnly
                  className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-slate-200"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Course / Qualification
                <input
                  type="text"
                  value={bookingForm.course}
                  onChange={(event) =>
                    setBookingForm((prev) => ({ ...prev, course: event.target.value }))
                  }
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
                  onChange={(event) =>
                    setBookingForm((prev) => ({ ...prev, level: event.target.value }))
                  }
                  placeholder="e.g., Level 2"
                  className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Training provider
                <input
                  type="text"
                  value={bookingForm.provider}
                  onChange={(event) =>
                    setBookingForm((prev) => ({ ...prev, provider: event.target.value }))
                  }
                  placeholder="e.g., Red Cross Training"
                  className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Scheduled date
                <input
                  type="date"
                  value={bookingForm.scheduledDate}
                  onChange={(event) =>
                    setBookingForm((prev) => ({ ...prev, scheduledDate: event.target.value }))
                  }
                  className="rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Notes (optional)
              <textarea
                value={bookingForm.notes}
                onChange={(event) =>
                  setBookingForm((prev) => ({ ...prev, notes: event.target.value }))
                }
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

function resolveSiteName(siteId: string | null, sites: SiteOption[]) {
  if (!siteId) return "";
  return sites.find((site) => site.id === siteId)?.name || "";
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
  } as const;

  return (
    <div className={`rounded-xl border p-4 ${toneStyles[tone]}`}>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function TrainingStatusCard({
  title,
  status,
}: {
  title: string;
  status: CertificationSummary;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0f1220] p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <StatusBadge status={status.status}>{status.statusLabel}</StatusBadge>
      </div>
      <p className="mt-2 text-sm text-slate-300">{status.label}</p>
      {status.lastSession && (
        <p className="mt-1 text-xs text-slate-500">Last recorded: {status.lastSession}</p>
      )}
    </div>
  );
}

