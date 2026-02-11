'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle } from '@/components/ui/icons';
import type { ComplianceMatrixEntry } from '@/types/teamly';
import { AssignCourseModal } from '@/components/training/AssignCourseModal';
import RecordTrainingModal, { type RecordTrainingModalProps } from '@/components/training/RecordTrainingModal';

interface Employee {
  id: string;
  name: string;
  position: string | null;
  site: string | null;
}

interface Course {
  id: string;
  name: string;
  code: string;
  is_mandatory: boolean;
}

export function ComplianceMatrixPageClient() {
  const { profile, selectedSiteId } = useAppContext();
  const [data, setData] = useState<ComplianceMatrixEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMandatoryOnly, setShowMandatoryOnly] = useState(true);
  const [viewError, setViewError] = useState<string | null>(null);
  const [assignmentModal, setAssignmentModal] = useState<{
    isOpen: boolean;
    profileId: string;
    profileName: string;
    courseId: string;
    courseName: string;
    siteId?: string | null;
    siteName?: string | null;
  } | null>(null);

  // RecordTrainingModal state
  const [recordModal, setRecordModal] = useState<{
    employeeId: string;
    employeeName: string;
    courseId: string;
    courseName: string;
    existingRecord?: RecordTrainingModalProps['existingRecord'];
  } | null>(null);

  useEffect(() => {
    if (profile?.company_id && profile?.id) {
      fetchData();
    }
  }, [profile?.company_id, profile?.id, profile?.app_role, selectedSiteId]);

  const fetchData = async () => {
    if (!profile?.company_id || !profile?.id) return;

    setLoading(true);

    try {
      const isAdminOrOwner = profile?.app_role && ['admin', 'owner'].includes((profile.app_role || '').toLowerCase());
      const isManager = profile?.app_role && ['manager', 'regional_manager', 'area_manager'].includes((profile.app_role || '').toLowerCase());

      let query = supabase
        .from('compliance_matrix_view')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('full_name', { ascending: true })
        .order('course_name', { ascending: true });

      if (!isAdminOrOwner && !isManager) {
        query = query.eq('profile_id', profile.id);
      } else if (selectedSiteId) {
        query = query.eq('home_site', selectedSiteId);
      } else if (isManager && profile.site_id) {
        query = query.eq('home_site', profile.site_id);
      }

      const { data: matrixData, error } = await query;

      if (error) {
        console.error('Error fetching compliance matrix:', error);
        setViewError('Failed to load compliance data. Please try again.');
        setData([]);
      } else {
        setData(matrixData || []);
        setViewError(null);
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
      setViewError('An unexpected error occurred. Please try again.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const allEmployees = Array.from(new Set(data.map(entry => entry.profile_id)))
    .map(id => {
      const entry = data.find(e => e.profile_id === id);
      if (!entry) return null;
      return {
        id: entry.profile_id,
        name: entry.full_name,
        position: entry.position_title,
        site: entry.site_name
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  const allCourses = Array.from(new Set(data.map(entry => entry.course_id)))
    .map(id => {
      const entry = data.find(e => e.course_id === id);
      if (!entry) return null;
      return {
        id: entry.course_id,
        name: entry.course_name,
        code: entry.course_code || entry.course_name,
        is_mandatory: entry.is_mandatory
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name));

  const courses = showMandatoryOnly
    ? allCourses.filter(course => course.is_mandatory)
    : allCourses;

  const employees = allEmployees;

  const getStatus = (entry: ComplianceMatrixEntry | null, course: Course) => {
    if (!entry) {
      if (course.is_mandatory) {
        return { status: 'required', icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-500/10' };
      }
      return { status: 'optional', icon: Clock, color: 'text-gray-400 dark:text-white/40', bgColor: 'bg-gray-50 dark:bg-white/[0.02]' };
    }

    const status = entry.compliance_status?.toLowerCase() || 'optional';

    switch (status) {
      case 'current':
      case 'compliant':
        return { status: 'compliant', icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-500/10' };
      case 'expiring_soon':
        return { status: 'expiring_soon', icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-500/10' };
      case 'expired':
        return { status: 'expired', icon: XCircle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-500/10' };
      case 'in_progress':
      case 'assigned':
      case 'invited':
        return { status: 'in_progress', icon: Clock, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-500/10' };
      case 'required':
        return { status: 'required', icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-500/10' };
      case 'optional':
      default:
        return { status: 'optional', icon: Clock, color: 'text-gray-400 dark:text-white/40', bgColor: 'bg-gray-50 dark:bg-white/[0.02]' };
    }
  };

  const getEntry = (employeeId: string, courseId: string): ComplianceMatrixEntry | null => {
    return data.find(e => e.profile_id === employeeId && e.course_id === courseId) || null;
  };

  const handleCellClick = async (entry: ComplianceMatrixEntry | null, employee: Employee, course: Course) => {
    if (!entry) {
      // No entry at all - open assignment modal
      setAssignmentModal({
        isOpen: true,
        profileId: employee.id,
        profileName: employee.name,
        courseId: course.id,
        courseName: course.name,
        siteId: null,
        siteName: employee.site || null
      });
      return;
    }

    const status = entry.compliance_status?.toLowerCase() || 'optional';
    const hasCompletion = ['compliant', 'current', 'expiring_soon', 'expired'].includes(status);

    if (hasCompletion) {
      // Has training data - look up existing record for edit mode
      const { data: records } = await supabase
        .from('training_records')
        .select('id, completed_at, expiry_date, score_percentage, certificate_number, trainer_name, notes')
        .eq('profile_id', employee.id)
        .eq('course_id', course.id)
        .order('completed_at', { ascending: false })
        .limit(1);

      if (records?.[0]) {
        setRecordModal({
          employeeId: employee.id,
          employeeName: employee.name,
          courseId: course.id,
          courseName: course.name,
          existingRecord: records[0],
        });
      } else {
        // No record found in training_records (shouldn't happen after migration)
        setRecordModal({
          employeeId: employee.id,
          employeeName: employee.name,
          courseId: course.id,
          courseName: course.name,
        });
      }
    } else {
      // No completion - open RecordTrainingModal to create new record
      setRecordModal({
        employeeId: employee.id,
        employeeName: employee.name,
        courseId: course.id,
        courseName: course.name,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-white/50">Loading compliance matrix...</div>
      </div>
    );
  }

  if (viewError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600 dark:text-red-400">{viewError}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compliance Matrix</h1>
          <p className="text-gray-600 dark:text-white/70 mt-1">Track training compliance across your organization</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showMandatoryOnly}
              onChange={(e) => setShowMandatoryOnly(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-white/20 bg-white dark:bg-white/[0.05] text-blue-600 dark:text-blue-500 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-gray-600 dark:text-white/70 text-sm">Mandatory only</span>
          </label>
          <Link
            href="/dashboard/people/training"
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/[0.05] hover:bg-gray-50 dark:hover:bg-white/[0.08] border border-gray-200 dark:border-white/[0.06] rounded-lg text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
        </div>
      </div>

      {/* Summary and Legend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-white/70">Employees:</span>
              <span className="text-gray-900 dark:text-white font-medium">{employees.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-white/70">Courses:</span>
              <span className="text-gray-900 dark:text-white font-medium">{courses.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-white/70">Total Combinations:</span>
              <span className="text-gray-900 dark:text-white font-medium">{employees.length * courses.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Status Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs text-gray-600 dark:text-white/70">Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-xs text-gray-600 dark:text-white/70">Expiring Soon</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-xs text-gray-600 dark:text-white/70">Expired</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-gray-600 dark:text-white/70">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs text-gray-600 dark:text-white/70">Required</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400 dark:text-white/40" />
              <span className="text-xs text-gray-600 dark:text-white/70">Not Assigned</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-white/50 mt-3">
            <span className="text-red-600 dark:text-red-400">*</span> indicates mandatory training. Click any cell to record or edit training.
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg">
          <p className="text-gray-600 dark:text-white/70">No compliance data found.</p>
          <p className="text-gray-500 dark:text-white/50 text-sm mt-2">Make sure training courses and employees exist in your system.</p>
        </div>
      ) : employees.length === 0 || courses.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg">
          <p className="text-gray-600 dark:text-white/70">
            {employees.length === 0 ? 'No employees found.' : 'No courses found.'}
          </p>
          {showMandatoryOnly && courses.length === 0 && (
            <p className="text-gray-500 dark:text-white/50 text-sm mt-2">Try unchecking &ldquo;Mandatory only&rdquo; to see all courses.</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03]">
                <th className="text-left p-4 text-gray-900 dark:text-white font-medium sticky left-0 bg-gray-50 dark:bg-[#0f1220] z-10 min-w-[200px] border-r border-gray-200 dark:border-white/[0.06]">
                  Employee
                </th>
                {courses.map(course => (
                  <th key={course.id} className="text-center px-1 pb-2 align-bottom" style={{ minWidth: '48px', height: '130px' }}>
                    <div className="flex flex-col items-center justify-end h-full gap-1">
                      <span
                        className="text-[11px] font-semibold text-gray-900 dark:text-white leading-tight"
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: '110px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        title={course.name}
                      >
                        {course.name}
                      </span>
                      {course.is_mandatory && (
                        <span className="text-[10px] text-red-600 dark:text-red-400 font-bold" title="Mandatory">*</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => (
                <tr key={employee.id} className="border-b border-gray-100 dark:border-white/[0.04] hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-[#0f1220] z-10 border-r border-gray-200 dark:border-white/[0.06]">
                    <div>
                      <div className="font-semibold text-sm">{employee.name}</div>
                      {employee.position && (
                        <div className="text-xs text-gray-500 dark:text-white/50 mt-0.5">{employee.position}</div>
                      )}
                      {employee.site && (
                        <div className="text-xs text-gray-400 dark:text-white/40 mt-0.5">{employee.site}</div>
                      )}
                    </div>
                  </td>
                  {courses.map(course => {
                    const entry = getEntry(employee.id, course.id);
                    const statusInfo = getStatus(entry, course);
                    const StatusIcon = statusInfo.icon;

                    return (
                      <td
                        key={course.id}
                        className={`p-1.5 text-center ${statusInfo.bgColor} transition-all cursor-pointer hover:ring-2 hover:ring-blue-400/50 dark:hover:ring-blue-500/30 hover:ring-inset`}
                        onClick={() => handleCellClick(entry, employee, course)}
                        title={`${course.name} - ${statusInfo.status.charAt(0).toUpperCase() + statusInfo.status.slice(1).replace('_', ' ')}`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                          {entry?.completed_at && (
                            <span className="text-[10px] text-gray-500 dark:text-white/50">
                              {new Date(entry.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {entry?.expiry_date && (
                            <span className={`text-[10px] font-medium ${
                              entry.compliance_status === 'expired'
                                ? 'text-red-600 dark:text-red-400'
                                : (entry.compliance_status === 'compliant' || entry.compliance_status === 'current')
                                ? 'text-green-600 dark:text-green-400'
                                : entry.compliance_status === 'expiring_soon'
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-gray-500 dark:text-white/50'
                            }`}>
                              {entry.compliance_status === 'expired' ? 'Expired' :
                               `Exp: ${new Date(entry.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Course Modal */}
      {assignmentModal && (
        <AssignCourseModal
          isOpen={assignmentModal.isOpen}
          onClose={() => setAssignmentModal(null)}
          profileId={assignmentModal.profileId}
          profileName={assignmentModal.profileName}
          courseId={assignmentModal.courseId}
          courseName={assignmentModal.courseName}
          siteId={assignmentModal.siteId}
          siteName={assignmentModal.siteName}
          onSuccess={() => {
            fetchData();
            setAssignmentModal(null);
          }}
        />
      )}

      {/* Record/Edit Training Modal */}
      {recordModal && (
        <RecordTrainingModal
          isOpen={true}
          onClose={() => setRecordModal(null)}
          onSuccess={() => {
            fetchData();
            setRecordModal(null);
          }}
          employeeId={recordModal.employeeId}
          employeeName={recordModal.employeeName}
          courseId={recordModal.courseId}
          courseName={recordModal.courseName}
          existingRecord={recordModal.existingRecord}
        />
      )}
    </div>
  );
}
