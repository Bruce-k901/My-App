'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
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
      
      // Fetch compliance matrix data
      let query = supabase
        .from('compliance_matrix_view')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('full_name', { ascending: true })
        .order('course_name', { ascending: true });

      // Apply filters based on role
      if (!isAdminOrOwner && !isManager) {
        // Staff can only see their own records
        query = query.eq('profile_id', profile.id);
      } else if (isManager && profile.site_id) {
        // Managers can see their site
        query = query.eq('home_site', profile.site_id);
      }

      const { data: matrixData, error } = await query;

      if (error) {
        console.error('Error fetching compliance matrix:', error);
        setViewError('Failed to load compliance data. Please try again.');
        setData([]);
      } else {
        console.log('Compliance matrix data loaded:', {
          totalEntries: matrixData?.length || 0,
          sampleEntry: matrixData?.[0],
          uniqueEmployees: new Set(matrixData?.map(e => e.profile_id) || []).size,
          uniqueCourses: new Set(matrixData?.map(e => e.course_id) || []).size,
        });
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

  // Get all unique employees from the data (regardless of filtering)
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

  // Get all unique courses from the data
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

  // Filter courses if "Mandatory only" is checked
  const courses = showMandatoryOnly
    ? allCourses.filter(course => course.is_mandatory)
    : allCourses;

  // Use all employees (not filtered by mandatory)
  const employees = allEmployees;

  const getStatus = (entry: ComplianceMatrixEntry | null, course: Course) => {
    if (!entry) {
      // If no entry exists, check if course is mandatory to determine status
      if (course.is_mandatory) {
        return { status: 'required', icon: AlertTriangle, color: 'text-amber-500 dark:text-amber-400', bgColor: 'bg-amber-500/10 dark:bg-amber-500/10' };
      }
      return { status: 'optional', icon: Clock, color: 'text-[rgb(var(--text-tertiary))]', bgColor: 'bg-[rgb(var(--surface))] dark:bg-neutral-800/30' };
    }

    // Use the compliance_status field which is already calculated by the database view
    // But also check the actual data to ensure accuracy
    const status = entry.compliance_status?.toLowerCase() || 'optional';
    
    // Fallback: if compliance_status is not set correctly, calculate from data
    if (!entry.compliance_status || entry.compliance_status === 'optional' || entry.compliance_status === 'required') {
      if (entry.completed_at) {
        const expiryDate = entry.expiry_date ? new Date(entry.expiry_date) : null;
        const now = new Date();
        
        if (expiryDate && expiryDate < now) {
          return { status: 'expired', icon: XCircle, color: 'text-red-500 dark:text-red-400', bgColor: 'bg-red-500/10 dark:bg-red-500/10' };
        }
        return { status: 'compliant', icon: CheckCircle, color: 'text-green-500 dark:text-green-400', bgColor: 'bg-green-500/10 dark:bg-green-500/10' };
      }
      
      // Check training_status as fallback
      if (entry.training_status === 'in_progress') {
        return { status: 'in_progress', icon: Clock, color: 'text-blue-500 dark:text-blue-400', bgColor: 'bg-blue-500/10 dark:bg-blue-500/10' };
      }
      
      // If mandatory and no completion, it's required
      if (entry.is_mandatory || course.is_mandatory) {
        return { status: 'required', icon: AlertTriangle, color: 'text-amber-500 dark:text-amber-400', bgColor: 'bg-amber-500/10 dark:bg-amber-500/10' };
      }
    }

    // Use the compliance_status from the view
    switch (status) {
      case 'compliant':
        return { status: 'compliant', icon: CheckCircle, color: 'text-green-500 dark:text-green-400', bgColor: 'bg-green-500/10 dark:bg-green-500/10' };
      case 'expired':
        return { status: 'expired', icon: XCircle, color: 'text-red-500 dark:text-red-400', bgColor: 'bg-red-500/10 dark:bg-red-500/10' };
      case 'in_progress':
        return { status: 'in_progress', icon: Clock, color: 'text-blue-500 dark:text-blue-400', bgColor: 'bg-blue-500/10 dark:bg-blue-500/10' };
      case 'required':
        return { status: 'required', icon: AlertTriangle, color: 'text-amber-500 dark:text-amber-400', bgColor: 'bg-amber-500/10 dark:bg-amber-500/10' };
      case 'optional':
      default:
        return { status: 'optional', icon: Clock, color: 'text-[rgb(var(--text-tertiary))]', bgColor: 'bg-[rgb(var(--surface))] dark:bg-neutral-800/30' };
    }
  };

  const getEntry = (employeeId: string, courseId: string): ComplianceMatrixEntry | null => {
    // Search in all data, not just filtered
    return data.find(e => e.profile_id === employeeId && e.course_id === courseId) || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[rgb(var(--text-tertiary))]">Loading compliance matrix...</div>
      </div>
    );
  }

  if (viewError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500 dark:text-red-400">{viewError}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))]">Compliance Matrix</h1>
          <p className="text-[rgb(var(--text-secondary))] mt-1">Track training compliance across your organization</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showMandatoryOnly}
              onChange={(e) => setShowMandatoryOnly(e.target.checked)}
              className="w-4 h-4 rounded border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[#EC4899] focus:ring-[#EC4899] focus:ring-2"
            />
            <span className="text-[rgb(var(--text-secondary))] text-sm">Mandatory only</span>
          </label>
          <Link
            href="/dashboard/people/training"
            className="flex items-center gap-2 px-4 py-2 bg-[rgb(var(--surface-elevated))] hover:bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-lg text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
        </div>
      </div>

      {/* Summary and Legend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Summary */}
        <div className="bg-[rgb(var(--surface-elevated))] border border-[rgb(var(--border))] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-3">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[rgb(var(--text-secondary))]">Employees:</span>
              <span className="text-[rgb(var(--text-primary))] font-medium">{employees.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[rgb(var(--text-secondary))]">Courses:</span>
              <span className="text-[rgb(var(--text-primary))] font-medium">{courses.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[rgb(var(--text-secondary))]">Total Combinations:</span>
              <span className="text-[rgb(var(--text-primary))] font-medium">{employees.length * courses.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[rgb(var(--text-secondary))]">Data Entries:</span>
              <span className="text-[rgb(var(--text-primary))] font-medium">{data.length}</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-[rgb(var(--surface-elevated))] border border-[rgb(var(--border))] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-3">Status Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
              <span className="text-xs text-[rgb(var(--text-secondary))]">Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
              <span className="text-xs text-[rgb(var(--text-secondary))]">Expired</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <span className="text-xs text-[rgb(var(--text-secondary))]">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span className="text-xs text-[rgb(var(--text-secondary))]">Required</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[rgb(var(--text-tertiary))]" />
              <span className="text-xs text-[rgb(var(--text-secondary))]">Not Assigned</span>
            </div>
          </div>
          <p className="text-xs text-[rgb(var(--text-tertiary))] mt-3">
            <span className="text-red-500 dark:text-red-400">*</span> indicates mandatory training
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 bg-[rgb(var(--surface-elevated))] border border-[rgb(var(--border))] rounded-lg">
          <p className="text-[rgb(var(--text-secondary))]">No compliance data found.</p>
          <p className="text-[rgb(var(--text-tertiary))] text-sm mt-2">Make sure training courses and employees exist in your system.</p>
        </div>
      ) : employees.length === 0 || courses.length === 0 ? (
        <div className="text-center py-12 bg-[rgb(var(--surface-elevated))] border border-[rgb(var(--border))] rounded-lg">
          <p className="text-[rgb(var(--text-secondary))]">
            {employees.length === 0 ? 'No employees found.' : 'No courses found.'}
          </p>
          {showMandatoryOnly && courses.length === 0 && (
            <p className="text-[rgb(var(--text-tertiary))] text-sm mt-2">Try unchecking "Mandatory only" to see all courses.</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto bg-[rgb(var(--surface-elevated))] border border-[rgb(var(--border))] rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
                <th className="text-left p-4 text-[rgb(var(--text-primary))] font-medium sticky left-0 bg-[rgb(var(--surface-elevated))] z-10 min-w-[200px] border-r border-[rgb(var(--border))]">
                  Employee
                </th>
                {courses.map(course => (
                  <th key={course.id} className="text-center p-4 text-[rgb(var(--text-primary))] font-medium min-w-[140px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-semibold">{course.code || course.name}</span>
                      {course.is_mandatory && (
                        <span className="text-xs text-red-500 dark:text-red-400 font-bold" title="Mandatory">*</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => (
                <tr key={employee.id} className="border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--surface))] transition-colors">
                  <td className="p-4 text-[rgb(var(--text-primary))] sticky left-0 bg-[rgb(var(--surface-elevated))] z-10 border-r border-[rgb(var(--border))]">
                    <div>
                      <div className="font-semibold text-sm">{employee.name}</div>
                      {employee.position && (
                        <div className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">{employee.position}</div>
                      )}
                      {employee.site && (
                        <div className="text-xs text-[rgb(var(--text-tertiary))] mt-0.5">{employee.site}</div>
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
                        className={`p-3 text-center ${statusInfo.bgColor} transition-all ${
                          !entry 
                            ? 'hover:bg-[rgb(var(--surface))] cursor-pointer border-2 border-dashed border-[rgb(var(--border))] hover:border-[rgb(var(--border-hover))]' 
                            : 'cursor-default'
                        }`}
                        onClick={() => {
                          if (!entry) {
                            setAssignmentModal({
                              isOpen: true,
                              profileId: employee.id,
                              profileName: employee.name,
                              courseId: course.id,
                              courseName: course.name,
                              siteId: null,
                              siteName: employee.site || null
                            });
                          }
                        }}
                        title={
                          entry 
                            ? `${statusInfo.status.charAt(0).toUpperCase() + statusInfo.status.slice(1)} - ${entry.compliance_status}` 
                            : 'Click to assign course'
                        }
                      >
                        <div className="flex flex-col items-center gap-1.5">
                          <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
                          {entry?.completed_at && (
                            <span className="text-[10px] text-[rgb(var(--text-tertiary))]">
                              {new Date(entry.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {entry?.expiry_date && (
                            <span className={`text-[10px] font-medium ${
                              entry.compliance_status === 'expired' 
                                ? 'text-red-500 dark:text-red-400' 
                                : entry.compliance_status === 'compliant'
                                ? 'text-green-500 dark:text-green-400'
                                : 'text-[rgb(var(--text-tertiary))]'
                            }`}>
                              {entry.compliance_status === 'expired' ? 'Expired' : 
                               `Exp: ${new Date(entry.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                            </span>
                          )}
                          {!entry && (
                            <span className="text-[10px] text-[rgb(var(--text-tertiary))] italic">Click to assign</span>
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
