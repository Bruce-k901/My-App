'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  GraduationCap,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  Award,
  Plus,
} from '@/components/ui/icons';
import type { ComplianceMatrixEntry, TrainingCourse } from '@/types/teamly';

const statusConfig = {
  compliant: { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10', label: 'Compliant' },
  expired: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10', label: 'Expired' },
  in_progress: { icon: Clock, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', label: 'In Progress' },
  required: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', label: 'Required' },
  optional: { icon: Clock, color: 'text-gray-500 dark:text-white/50', bg: 'bg-gray-50 dark:bg-white/[0.03]', label: 'Not Assigned' },
} as const;

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { profile } = useAppContext();
  const [course, setCourse] = useState<TrainingCourse | null>(null);
  const [entries, setEntries] = useState<ComplianceMatrixEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.company_id && courseId) {
      fetchData();
    }
  }, [profile?.company_id, courseId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch course details
      const { data: courseData } = await supabase
        .from('training_courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseData) setCourse(courseData);

      // Fetch compliance data for this course
      const { data: matrixData, error: matrixError } = await supabase
        .from('compliance_matrix_view')
        .select('*')
        .eq('company_id', profile?.company_id)
        .eq('course_id', courseId)
        .order('full_name');

      if (matrixError) {
        // If the view doesn't exist, show a meaningful message
        if (matrixError.code === '42P01') {
          setError('Compliance matrix view not yet available. Please run database migrations.');
        } else {
          console.warn('Error fetching compliance data:', matrixError);
        }
        setEntries([]);
      } else {
        setEntries(matrixData || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: entries.length,
    compliant: entries.filter(e => e.compliance_status === 'compliant').length,
    expired: entries.filter(e => e.compliance_status === 'expired').length,
    inProgress: entries.filter(e => e.compliance_status === 'in_progress').length,
    required: entries.filter(e => e.compliance_status === 'required').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/people/training"
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-white/60" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {course?.name || 'Course Details'}
            </h1>
            {course?.is_mandatory && (
              <span className="px-2.5 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 text-xs rounded-full font-medium">
                Mandatory
              </span>
            )}
          </div>
          <p className="text-gray-600 dark:text-white/70 text-sm mt-1">
            {course?.category && <span>{course.category}</span>}
            {course?.code && <span> &middot; {course.code}</span>}
            {course?.provider && <span> &middot; {course.provider}</span>}
          </p>
        </div>
        <Link
          href={`/dashboard/people/training/record?course=${courseId}`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg shadow-sm transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Record Training
        </Link>
      </div>

      {/* Course Info */}
      {course?.description && (
        <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
          <p className="text-gray-700 dark:text-white/80 text-sm">{course.description}</p>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500 dark:text-white/50">
            {course.duration_minutes && (
              <span>Duration: {course.duration_minutes} mins</span>
            )}
            {course.certification_validity_months && (
              <span>Valid for: {course.certification_validity_months} months</span>
            )}
            {course.pass_mark_percentage > 0 && (
              <span>Pass mark: {course.pass_mark_percentage}%</span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Total Staff" value={stats.total} color="text-gray-900 dark:text-white" />
        <StatCard icon={CheckCircle} label="Compliant" value={stats.compliant} color="text-green-600 dark:text-green-400" />
        <StatCard icon={XCircle} label="Expired" value={stats.expired} color="text-red-600 dark:text-red-400" />
        <StatCard icon={Clock} label="In Progress" value={stats.inProgress} color="text-blue-600 dark:text-blue-400" />
        <StatCard icon={AlertTriangle} label="Required" value={stats.required} color="text-amber-600 dark:text-amber-400" />
      </div>

      {/* Compliance Rate */}
      {stats.total > 0 && (
        <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-white/80">Compliance Rate</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {Math.round((stats.compliant / stats.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2.5">
            <div
              className="bg-green-500 dark:bg-green-400 h-2.5 rounded-full transition-all"
              style={{ width: `${Math.round((stats.compliant / stats.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Employee List */}
      <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-white/[0.06]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Employees ({entries.length})
          </h2>
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center">
            <GraduationCap className="w-10 h-10 text-gray-400 dark:text-white/40 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-white/70 text-sm">No employee records found for this course</p>
            <p className="text-gray-500 dark:text-white/50 text-xs mt-1">
              Assign this course to employees via the{' '}
              <Link href="/dashboard/people/training/matrix" className="text-blue-600 dark:text-blue-400 hover:underline">
                compliance matrix
              </Link>
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            {entries.map((entry) => {
              const config = statusConfig[entry.compliance_status] || statusConfig.optional;
              const StatusIcon = config.icon;

              return (
                <div
                  key={entry.profile_id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg}`}>
                      <StatusIcon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-white/50">
                        {entry.position_title || entry.app_role || 'Employee'}
                        {entry.site_name && ` \u00b7 ${entry.site_name}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {entry.completed_at && (
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-500 dark:text-white/50">Completed</p>
                        <p className="text-xs font-medium text-gray-700 dark:text-white/80">
                          {new Date(entry.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    )}
                    {entry.expiry_date && (
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-500 dark:text-white/50">Expires</p>
                        <p className={`text-xs font-medium ${
                          entry.compliance_status === 'expired' ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-white/80'
                        }`}>
                          {new Date(entry.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
      <div className="flex items-center gap-2 text-gray-500 dark:text-white/50 text-xs mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
