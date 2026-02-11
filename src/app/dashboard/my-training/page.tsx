'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  GraduationCap,
  CheckCircle,
  Clock,
  Mail,
  UserCheck,
  AlertTriangle,
  Download,
  ArrowRight,
  BookOpen,
} from '@/components/ui/icons';

interface CourseAssignment {
  id: string;
  course_id: string;
  status: 'invited' | 'confirmed' | 'in_progress' | 'completed' | 'expired';
  deadline_date: string | null;
  assigned_at: string;
  course: {
    id: string;
    name: string;
    code: string;
    content_path: string | null;
  };
}

interface TrainingRecord {
  id: string;
  course_id: string;
  status: string;
  completed_at: string | null;
  score_percentage: number | null;
  certificate_number: string | null;
  expiry_date: string | null;
  course: {
    id: string;
    name: string;
    code: string;
  };
}

interface CourseProgress {
  assignment_id: string;
  course_id: string;
  module_id: string;
  status: string;
  quiz_score: number | null;
}

export default function MyTrainingPage() {
  const { profile } = useAppContext();
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [progress, setProgress] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile?.id]);

  const loadData = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      // Load assignments
      const { data: assignmentsData } = await supabase
        .from('course_assignments')
        .select(`
          id,
          course_id,
          status,
          deadline_date,
          assigned_at,
          course:training_courses(id, name, code, content_path)
        `)
        .eq('profile_id', profile.id)
        .order('assigned_at', { ascending: false });

      if (assignmentsData) {
        setAssignments(assignmentsData.map((a: any) => ({
          ...a,
          course: a.course,
        })));
      }

      // Load training records
      const { data: recordsData } = await supabase
        .from('training_records')
        .select(`
          id,
          course_id,
          status,
          completed_at,
          score_percentage,
          certificate_number,
          expiry_date,
          course:training_courses(id, name, code)
        `)
        .eq('profile_id', profile.id)
        .order('completed_at', { ascending: false });

      if (recordsData) {
        setTrainingRecords(recordsData.map((r: any) => ({
          ...r,
          course: r.course,
        })));
      }

      // Load progress for in-progress courses
      const inProgressAssignments = assignmentsData?.filter(
        (a: any) => a.status === 'in_progress' || a.status === 'confirmed'
      ) || [];

      if (inProgressAssignments.length > 0) {
        const assignmentIds = inProgressAssignments.map((a: any) => a.id);
        const { data: progressData } = await supabase
          .from('course_progress')
          .select('assignment_id, course_id, module_id, status, quiz_score')
          .in('assignment_id', assignmentIds);

        if (progressData) {
          setProgress(progressData);
        }
      }
    } catch (error) {
      console.error('Error loading training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'invited':
        return <Mail className="w-5 h-5 text-amber-400" />;
      case 'confirmed':
        return <UserCheck className="w-5 h-5 text-blue-400" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-400" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'expired':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <BookOpen className="w-5 h-5 text-neutral-400" />;
    }
  };

  const getProgressForAssignment = (assignmentId: string, courseId: string) => {
    const assignmentProgress = progress.filter(
      (p) => p.assignment_id === assignmentId && p.course_id === courseId
    );
    const completed = assignmentProgress.filter((p) => p.status === 'completed').length;
    const total = assignmentProgress.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expiry = new Date(date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow && expiry > new Date();
  };

  const getCourseUrl = (contentPath: string | null, courseId: string) => {
    if (contentPath === 'uk-l2-food-hygiene') {
      return '/training/courses/l2-food-hygiene/start';
    }
    // Add other course mappings as needed
    return `/dashboard/courses`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D37E91]" />
      </div>
    );
  }

  const pendingInvitations = assignments.filter((a) => a.status === 'invited');
  const inProgressCourses = assignments.filter(
    (a) => a.status === 'confirmed' || a.status === 'in_progress'
  );
  const completedRecords = trainingRecords.filter((r) => r.status === 'completed');
  const expiringSoon = trainingRecords.filter((r) => isExpiringSoon(r.expiry_date));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">My Training</h1>
        <p className="text-neutral-400">View your course assignments, progress, and completed training</p>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-400" />
            Pending Invitations
          </h2>
          <div className="space-y-3">
            {pendingInvitations.map((assignment) => (
              <div
                key={assignment.id}
                className="p-4 bg-amber-500/10 border border-amber-500/50 rounded-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(assignment.status)}
                      <h3 className="font-medium text-white">{assignment.course?.name || 'Unknown Course'}</h3>
                    </div>
                    {assignment.deadline_date && (
                      <p className="text-sm text-neutral-400">
                        Deadline: {new Date(assignment.deadline_date).toLocaleDateString('en-GB')}
                      </p>
                    )}
                    <p className="text-sm text-amber-200 mt-2">
                      You've been invited to complete this course. Please confirm your enrollment to begin.
                    </p>
                  </div>
                  <Link
                    href={`/training/confirm/${assignment.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-[#D37E91] hover:bg-[#D37E91]/80 text-white rounded-lg transition-colors"
                  >
                    Confirm & Start
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In Progress Courses */}
      {inProgressCourses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            In Progress
          </h2>
          <div className="space-y-3">
            {inProgressCourses.map((assignment) => {
              const progressPercent = getProgressForAssignment(assignment.id, assignment.course_id);
              const courseUrl = getCourseUrl(assignment.course?.content_path || null, assignment.course_id);

              return (
                <div
                  key={assignment.id}
                  className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(assignment.status)}
                        <h3 className="font-medium text-white">{assignment.course?.name || 'Unknown Course'}</h3>
                      </div>
                      {assignment.deadline_date && (
                        <p className="text-sm text-neutral-400">
                          Deadline: {new Date(assignment.deadline_date).toLocaleDateString('en-GB')}
                        </p>
                      )}
                    </div>
                    <Link
                      href={courseUrl}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-400">Progress</span>
                      <span className="text-white font-medium">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-neutral-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Courses */}
      {completedRecords.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Completed Courses
          </h2>
          <div className="space-y-3">
            {completedRecords.map((record) => {
              const expired = isExpired(record.expiry_date);
              const expiringSoon = isExpiringSoon(record.expiry_date);

              return (
                <div
                  key={record.id}
                  className={`p-4 rounded-lg border ${
                    expired
                      ? 'bg-red-500/10 border-red-500/50'
                      : expiringSoon
                      ? 'bg-amber-500/10 border-amber-500/50'
                      : 'bg-green-500/10 border-green-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon('completed')}
                        <h3 className="font-medium text-white">{record.course?.name || 'Unknown Course'}</h3>
                      </div>
                      <div className="space-y-1 text-sm text-neutral-400">
                        {record.completed_at && (
                          <p>Completed: {new Date(record.completed_at).toLocaleDateString('en-GB')}</p>
                        )}
                        {record.score_percentage !== null && (
                          <p>Score: {record.score_percentage}%</p>
                        )}
                        {record.expiry_date && (
                          <p className={expired ? 'text-red-400' : expiringSoon ? 'text-amber-400' : ''}>
                            {expired ? 'Expired: ' : expiringSoon ? 'Expiring: ' : 'Expires: '}
                            {new Date(record.expiry_date).toLocaleDateString('en-GB')}
                          </p>
                        )}
                        {record.certificate_number && (
                          <p className="text-xs text-neutral-500">Cert: {record.certificate_number}</p>
                        )}
                      </div>
                    </div>
                    {record.certificate_number && (
                      <Link
                        href={`/api/certificates/${record.id}`}
                        target="_blank"
                        className="flex items-center gap-2 px-4 py-2 bg-[#D37E91] hover:bg-[#D37E91]/80 text-white rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Certificate
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expiring Soon */}
      {expiringSoon.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Expiring Soon
          </h2>
          <div className="space-y-3">
            {expiringSoon.map((record) => (
              <div
                key={record.id}
                className="p-4 bg-amber-500/10 border border-amber-500/50 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h3 className="font-medium text-white">{record.course?.name || 'Unknown Course'}</h3>
                </div>
                {record.expiry_date && (
                  <p className="text-sm text-amber-200">
                    Expires: {new Date(record.expiry_date).toLocaleDateString('en-GB')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {pendingInvitations.length === 0 &&
        inProgressCourses.length === 0 &&
        completedRecords.length === 0 && (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Training Assigned</h3>
            <p className="text-neutral-400">
              You don't have any training assignments yet. Your manager will assign courses when needed.
            </p>
          </div>
        )}
    </div>
  );
}
