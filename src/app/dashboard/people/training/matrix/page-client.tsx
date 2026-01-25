'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, Filter, Mail, UserCheck } from 'lucide-react';
import type { ComplianceMatrixEntry } from '@/types/teamly';
import { AssignCourseModal } from '@/components/training/AssignCourseModal';

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
  const { profile } = useAppContext();
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

  useEffect(() => {
    if (profile?.company_id && profile?.id) {
      fetchData();
    }
  }, [profile?.company_id, profile?.id, profile?.app_role]);

  const fetchData = async () => {
    if (!profile?.company_id || !profile?.id) return;
    
    setLoading(true);
    
    try {
      // Determine authorization level
      const isAdminOrOwner = profile?.app_role && ['admin', 'owner'].includes((profile.app_role || '').toLowerCase());
      const isManager = profile?.app_role && ['manager', 'regional_manager', 'area_manager'].includes((profile.app_role || '').toLowerCase());
      
      let query = supabase
        .from('compliance_matrix_view')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('profile_name', { ascending: true })
        .order('course_name', { ascending: true });

      // Apply filters based on role
      if (!isAdminOrOwner && !isManager) {
        // Staff can only see their own records
        query = query.eq('profile_id', profile.id);
      } else if (isManager && profile.site_id) {
        // Managers can see their site
        query = query.eq('site_id', profile.site_id);
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

  const filteredData = showMandatoryOnly
    ? data.filter(entry => entry.is_mandatory)
    : data;

  const employees = Array.from(new Set(filteredData.map(entry => entry.profile_id)))
    .map(id => {
      const entry = filteredData.find(e => e.profile_id === id);
      return {
        id: entry!.profile_id,
        name: entry!.profile_name,
        position: entry!.position,
        site: entry!.site_name
      };
    });

  const courses = Array.from(new Set(filteredData.map(entry => entry.course_id)))
    .map(id => {
      const entry = filteredData.find(e => e.course_id === id);
      return {
        id: entry!.course_id,
        name: entry!.course_name,
        code: entry!.course_code,
        is_mandatory: entry!.is_mandatory
      };
    });

  const getStatus = (entry: ComplianceMatrixEntry) => {
    if (entry.completed_at) {
      if (entry.is_expired) {
        return { status: 'expired', icon: XCircle, color: 'text-red-500' };
      }
      return { status: 'completed', icon: CheckCircle, color: 'text-green-500' };
    }
    if (entry.deadline && new Date(entry.deadline) < new Date()) {
      return { status: 'overdue', icon: AlertTriangle, color: 'text-orange-500' };
    }
    if (entry.deadline) {
      return { status: 'pending', icon: Clock, color: 'text-yellow-500' };
    }
    return { status: 'not_assigned', icon: Clock, color: 'text-gray-500' };
  };

  const getEntry = (employeeId: string, courseId: string): ComplianceMatrixEntry | null => {
    return filteredData.find(e => e.profile_id === employeeId && e.course_id === courseId) || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Loading compliance matrix...</div>
      </div>
    );
  }

  if (viewError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500">{viewError}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Compliance Matrix</h1>
          <p className="text-white/60 mt-1">Track training compliance across your organization</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showMandatoryOnly}
              onChange={(e) => setShowMandatoryOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-white/80 text-sm">Mandatory only</span>
          </label>
          <Link
            href="/dashboard/people/training"
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/60">No compliance data found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-white/80 font-medium sticky left-0 bg-gray-900 z-10">
                  Employee
                </th>
                {courses.map(course => (
                  <th key={course.id} className="text-center p-3 text-white/80 font-medium min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs">{course.code}</span>
                      {course.is_mandatory && (
                        <span className="text-xs text-red-400">*</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => (
                <tr key={employee.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3 text-white sticky left-0 bg-gray-900 z-10">
                    <div>
                      <div className="font-medium">{employee.name}</div>
                      {employee.position && (
                        <div className="text-xs text-white/60">{employee.position}</div>
                      )}
                      {employee.site && (
                        <div className="text-xs text-white/40">{employee.site}</div>
                      )}
                    </div>
                  </td>
                  {courses.map(course => {
                    const entry = getEntry(employee.id, course.id);
                    const statusInfo = entry ? getStatus(entry) : { status: 'not_assigned', icon: Clock, color: 'text-gray-500' };
                    const StatusIcon = statusInfo.icon;

                    return (
                      <td key={course.id} className="p-3 text-center">
                        {entry ? (
                          <div className="flex flex-col items-center gap-1">
                            <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                            {entry.completed_at && (
                              <span className="text-xs text-white/60">
                                {new Date(entry.completed_at).toLocaleDateString()}
                              </span>
                            )}
                            {entry.deadline && !entry.completed_at && (
                              <span className="text-xs text-orange-400">
                                Due: {new Date(entry.deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => setAssignmentModal({
                              isOpen: true,
                              profileId: employee.id,
                              profileName: employee.name,
                              courseId: course.id,
                              courseName: course.name,
                              siteId: null,
                              siteName: employee.site || null
                            })}
                            className="text-white/40 hover:text-white/60 transition-colors"
                            title="Assign course"
                          >
                            <UserCheck className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
    </div>
  );
}
