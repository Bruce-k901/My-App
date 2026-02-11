'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { GraduationCap, CheckCircle, XCircle, Clock, AlertTriangle, Download, Plus, Mail, UserCheck } from '@/components/ui/icons';
import { AssignCourseModal } from './AssignCourseModal';
import RecordTrainingModal from './RecordTrainingModal';
import Link from 'next/link';

interface EmployeeTrainingTabProps {
  employeeId: string;
  companyId: string;
  employeeName?: string;
}

interface TrainingCourse {
  id: string;
  name: string;
  code: string;
  is_mandatory: boolean;
}

interface CourseAssignment {
  id: string;
  course_id: string;
  status: 'invited' | 'confirmed' | 'in_progress' | 'completed' | 'expired';
  deadline_date: string | null;
  course: TrainingCourse;
}

interface TrainingRecord {
  id: string;
  course_id: string;
  status: string;
  completed_at: string | null;
  score_percentage: number | null;
  certificate_number: string | null;
  expiry_date: string | null;
  course: TrainingCourse;
}

export function EmployeeTrainingTab({ employeeId, companyId, employeeName }: EmployeeTrainingTabProps) {
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [assignmentModal, setAssignmentModal] = useState<{
    isOpen: boolean;
    courseId: string;
    courseName: string;
  } | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);

  useEffect(() => {
    if (employeeId && companyId) {
      loadData();
    }
  }, [employeeId, companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all active courses
      const { data: coursesData } = await supabase
        .from('training_courses')
        .select('id, name, code, is_mandatory')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (coursesData) {
        setCourses(coursesData);
      }

      // Load course assignments
      const { data: assignmentsData } = await supabase
        .from('course_assignments')
        .select(`
          id,
          course_id,
          status,
          deadline_date,
          course:training_courses(id, name, code, is_mandatory)
        `)
        .eq('profile_id', employeeId)
        .in('status', ['invited', 'confirmed', 'in_progress']);

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
          course:training_courses(id, name, code, is_mandatory)
        `)
        .eq('profile_id', employeeId)
        .order('completed_at', { ascending: false });

      if (recordsData) {
        setTrainingRecords(recordsData.map((r: any) => ({
          ...r,
          course: r.course,
        })));
      }
    } catch (error) {
      console.error('Error loading training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAssignmentStatus = (courseId: string) => {
    return assignments.find(a => a.course_id === courseId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'invited':
        return <Mail className="w-4 h-4 text-amber-400" />;
      case 'confirmed':
        return <UserCheck className="w-4 h-4 text-blue-400" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'expired':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
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

  const handleAssignSelected = async () => {
    if (selectedCourses.length === 0) return;

    // Open modal for first course, then chain others
    const firstCourse = courses.find(c => c.id === selectedCourses[0]);
    if (firstCourse) {
      setAssignmentModal({
        isOpen: true,
        courseId: firstCourse.id,
        courseName: firstCourse.name,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D37E91]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
        <GraduationCap className="w-5 h-5 text-blue-500 dark:text-blue-400" />
        Training & Certifications
      </h3>

      {/* Section 1: Assign Courses */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-medium text-white">Assign Courses</h4>
          {selectedCourses.length > 0 && (
            <button
              onClick={handleAssignSelected}
              className="px-3 py-1.5 text-sm bg-[#D37E91] hover:bg-[#D37E91]/80 text-white rounded-lg transition-colors"
            >
              Assign Selected ({selectedCourses.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {courses.map((course) => {
            const assignment = getAssignmentStatus(course.id);
            const isSelected = selectedCourses.includes(course.id);

            return (
              <div
                key={course.id}
                className={`p-3 rounded-lg border ${
                  assignment
                    ? 'bg-blue-500/10 border-blue-500/50'
                    : isSelected
                    ? 'bg-[#D37E91]/10 border-[#D37E91]/50'
                    : 'bg-neutral-700/50 border-neutral-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium text-white text-sm truncate">{course.name}</h5>
                      {course.is_mandatory && (
                        <span className="text-xs text-red-400">*</span>
                      )}
                    </div>
                    {course.code && (
                      <p className="text-xs text-gray-500 dark:text-white/60">{course.code}</p>
                    )}
                  </div>
                  {!assignment && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCourses([...selectedCourses, course.id]);
                        } else {
                          setSelectedCourses(selectedCourses.filter(id => id !== course.id));
                        }
                      }}
                      className="w-4 h-4 text-[#D37E91] bg-neutral-700 border-neutral-600 rounded focus:ring-[#D37E91]"
                    />
                  )}
                </div>
                {assignment && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-white/60">
                    {getStatusIcon(assignment.status)}
                    <span className="capitalize">{assignment.status.replace('_', ' ')}</span>
                    {assignment.deadline_date && (
                      <span className="ml-auto">
                        Due: {new Date(assignment.deadline_date).toLocaleDateString('en-GB')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Training History */}
      <div className="space-y-4">
        <h4 className="text-base font-medium text-white">Training History</h4>

        {trainingRecords.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-white/60">No training records found.</p>
        ) : (
          <div className="space-y-3">
            {trainingRecords.map((record) => {
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
                      : record.status === 'completed'
                      ? 'bg-green-500/10 border-green-500/50'
                      : 'bg-neutral-700/50 border-neutral-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h5 className="font-medium text-white mb-1">
                        {record.course?.name || 'Unknown Course'}
                      </h5>
                      <div className="space-y-1 text-sm text-gray-500 dark:text-white/60">
                        <div className="flex items-center gap-4">
                          <span className="capitalize">{record.status.replace('_', ' ')}</span>
                          {record.score_percentage !== null && (
                            <span>Score: {record.score_percentage}%</span>
                          )}
                        </div>
                        {record.completed_at && (
                          <p>Completed: {new Date(record.completed_at).toLocaleDateString('en-GB')}</p>
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
                    {record.status === 'completed' && record.certificate_number && (
                      <Link
                        href={`/api/certificates/${record.id}`}
                        target="_blank"
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#D37E91] hover:bg-[#D37E91]/80 text-white rounded-lg transition-colors"
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
        )}
      </div>

      {/* Section 3: Record Training */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-medium text-gray-900 dark:text-white">Record Training</h4>
          <button
            onClick={() => setShowRecordModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Record Training
          </button>
        </div>
      </div>

      {/* Record Training Modal */}
      <RecordTrainingModal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        onSuccess={loadData}
        employeeId={employeeId}
        employeeName={employeeName}
      />

      {/* Assignment Modal */}
      {assignmentModal && (
        <AssignCourseModal
          isOpen={assignmentModal.isOpen}
          onClose={() => {
            setAssignmentModal(null);
            setSelectedCourses([]);
            loadData();
          }}
          profileId={employeeId}
          profileName={employeeName || "Employee"}
          courseId={assignmentModal.courseId}
          courseName={assignmentModal.courseName}
          onSuccess={() => {
            setAssignmentModal(null);
            setSelectedCourses([]);
            loadData();
          }}
        />
      )}
    </div>
  );
}
