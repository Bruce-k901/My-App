'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, Filter, Mail, UserCheck } from 'lucide-react';
import type { ComplianceMatrixEntry } from '@/types/teamly';
import { AssignCourseModal } from '@/components/training/AssignCourseModal';

// Prevent static generation - this page must be rendered dynamically
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export default function ComplianceMatrixPage() {
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
      const isManager = profile?.app_role && ['manager', 'general_manager', 'area_manager', 'regional_manager'].includes((profile.app_role || '').toLowerCase());
      
      // Determine which employee IDs to include based on authorization level:
      // - Admins/Owners: see all employees (no filter needed)
      // - Managers: see only their direct reports (reports_to = manager's id) + themselves
      // - Staff: see only themselves
      let employeeIdsToShow: string[] | null = null;
      
      if (!isAdminOrOwner) {
        if (isManager) {
          // Managers see their direct reports
          const { data: directReports, error: reportsError } = await supabase
            .from('profiles')
            .select('id')
            .eq('company_id', profile.company_id)
            .eq('reports_to', profile.id)
            .eq('status', 'active');
          
          if (reportsError) {
            console.error('Error fetching direct reports:', reportsError);
          }
          
          employeeIdsToShow = directReports?.map(emp => emp.id) || [];
          // Include the manager themselves in the list
          employeeIdsToShow.push(profile.id);
        } else {
          // Staff members see only themselves
          employeeIdsToShow = [profile.id];
        }
      }
      
      // Build query for compliance matrix view
      let query = supabase
        .from('compliance_matrix_view')
        .select('*')
        .eq('company_id', profile.company_id);
      
      // Apply employee filter if needed
      if (employeeIdsToShow && employeeIdsToShow.length > 0) {
        query = query.in('profile_id', employeeIdsToShow);
      }
      
      const { data: matrixData, error } = await query
        .order('full_name')
        .order('category')
        .order('course_name');
      
      if (error) {
        console.error('Error fetching compliance matrix:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        
        // Check if it's a 404/PGRST205 - view doesn't exist
        if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist') || error.message?.includes('Could not find the table') || error.message?.includes('404')) {
          setViewError('The compliance_matrix_view does not exist in the database. Please ensure the database migration 20250305000003_create_training_views.sql has been run in Supabase.');
          console.error('compliance_matrix_view does not exist. Please run the database migration: 20250305000003_create_training_views.sql');
        } else {
          setViewError(`Error loading compliance matrix: ${error.message || 'Unknown error'}`);
        }
        
        setData([]);
      } else {
        console.log('Compliance matrix data fetched:', {
          count: matrixData?.length || 0,
          employeeIds: employeeIdsToShow,
          isAdminOrOwner,
          isManager,
        });
        
        // Log unique courses to debug duplicates
        if (matrixData && matrixData.length > 0) {
          const uniqueCourses = new Map<string, any>();
          matrixData.forEach((d: any) => {
            if (!uniqueCourses.has(d.course_id)) {
              uniqueCourses.set(d.course_id, { id: d.course_id, name: d.course_name, code: d.course_code });
            }
          });
          console.log('Unique courses from data:', Array.from(uniqueCourses.values()));
        }
        
        setData(matrixData || []);
        setViewError(null); // Clear any previous errors
      }
    } catch (error: any) {
      console.error('Error in fetchData:', error);
      setViewError(`Error loading data: ${error?.message || 'Unknown error'}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Build unique lists
  const employees: Employee[] = Array.from(
    new Map(data.map(d => [d.profile_id, {
      id: d.profile_id,
      name: d.full_name,
      position: d.position_title,
      site: d.site_name,
    }])).values()
  );

  // Deduplicate courses by course_id, but also log if we see duplicates
  const courseMap = new Map<string, Course>();
  data.forEach(d => {
    if (!courseMap.has(d.course_id)) {
      courseMap.set(d.course_id, {
        id: d.course_id,
        name: d.course_name,
        code: d.course_code || '',
        is_mandatory: d.is_mandatory,
      });
    }
  });
  
  const allCourses: Course[] = Array.from(courseMap.values());
  
  // Debug: Log if we see duplicate course names
  const coursesByName = new Map<string, Course[]>();
  allCourses.forEach(c => {
    const key = c.name || c.code;
    if (!coursesByName.has(key)) {
      coursesByName.set(key, []);
    }
    coursesByName.get(key)!.push(c);
  });
  
  const duplicateNames = Array.from(coursesByName.entries()).filter(([_, courses]) => courses.length > 1);
  if (duplicateNames.length > 0) {
    console.warn('⚠️ Found courses with duplicate names but different IDs:', duplicateNames);
  }

  const courses = showMandatoryOnly ? allCourses.filter(c => c.is_mandatory) : allCourses;

  const getStatusIcon = (status: string, assignmentStatus?: string) => {
    // Show assignment status if present
    if (assignmentStatus === 'invited') {
      return <Mail className="w-5 h-5 text-amber-400" title="Invited" />;
    }
    if (assignmentStatus === 'confirmed') {
      return <UserCheck className="w-5 h-5 text-blue-400" title="Confirmed" />;
    }
    if (assignmentStatus === 'in_progress') {
      return <Clock className="w-5 h-5 text-blue-400" title="In Progress" />;
    }

    // Otherwise show compliance status
    switch (status) {
      case 'current':
        return <CheckCircle className="w-5 h-5 text-green-400" title="Current" />;
      case 'expired':
        return <AlertTriangle className="w-5 h-5 text-red-400" title="Expired" />;
      case 'expiring_soon':
        return <AlertTriangle className="w-5 h-5 text-amber-400" title="Expiring Soon" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-400" title="In Progress" />;
      case 'required':
        return <XCircle className="w-5 h-5 text-red-400" title="Required" />;
      case 'invited':
        return <Mail className="w-5 h-5 text-amber-400" title="Invited" />;
      case 'assigned':
        return <UserCheck className="w-5 h-5 text-blue-400" title="Assigned" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-white/[0.05]" title="Optional" />;
    }
  };

  const canAssignCourse = (status: string): boolean => {
    // Managers/admins can assign courses when status is not_trained, required, or optional
    const isManager = profile?.app_role && ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager'].includes((profile.app_role || '').toLowerCase());
    if (!isManager) return false;
    
    // Can assign if no training record exists or if it's required/optional
    return status === 'not_trained' || status === 'required' || status === 'optional';
  };

  const handleCellClick = (employee: Employee, course: Course, status: string, entry?: ComplianceMatrixEntry) => {
    const isManager = profile?.app_role && ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager'].includes((profile.app_role || '').toLowerCase());
    
    if (!isManager) {
      // Non-managers can still click to view record page
      return;
    }

    // If can assign, open assignment modal
    if (canAssignCourse(status)) {
      setAssignmentModal({
        isOpen: true,
        profileId: employee.id,
        profileName: employee.name,
        courseId: course.id,
        courseName: course.name,
        siteId: entry?.home_site || null,
        siteName: employee.site || null,
      });
    } else {
      // Otherwise navigate to record page
      window.location.href = `/dashboard/people/training/record?employee=${employee.id}&course=${course.id}`;
    }
  };

  const getStatusForCell = (employeeId: string, courseId: string): string => {
    const entry = data.find(d => d.profile_id === employeeId && d.course_id === courseId);
    return entry?.compliance_status || 'optional';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EC4899]" />
      </div>
    );
  }

  // Empty state handling - check raw data first, then extracted employees/courses
  // The view should return data (employee x course combinations) even without training records
  const hasNoData = data.length === 0 || employees.length === 0 || allCourses.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/people/training" className="p-2 hover:bg-white/[0.05] rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-neutral-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Training Compliance Matrix</h1>
            <p className="text-neutral-400">Track training completion across all employees and courses</p>
          </div>
        </div>
        
        {!hasNoData && (
          <button
            onClick={() => setShowMandatoryOnly(!showMandatoryOnly)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showMandatoryOnly 
                ? 'bg-transparent border border-[#EC4899] text-[#EC4899]' 
                : 'bg-white/[0.03] border border-white/[0.06] text-neutral-400 hover:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            {showMandatoryOnly ? 'Mandatory Only' : 'All Courses'}
          </button>
        )}
      </div>

      {/* Error State - View doesn't exist */}
      {viewError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-300 mb-1">Database Error</h3>
              <p className="text-sm text-red-200/80">{viewError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {hasNoData && !viewError && (() => {
        const isManager = profile?.app_role && ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager'].includes((profile.app_role || '').toLowerCase());
        const isAdminOrOwner = profile?.app_role && ['admin', 'owner'].includes((profile.app_role || '').toLowerCase());
        
        return (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Data Available</h2>
            <p className="text-neutral-400 mb-6 max-w-md mx-auto">
              {data.length === 0
                ? 'No data returned from the compliance matrix. This might be because there are no active training courses in your company, or no employees match your authorization level.'
                : employees.length === 0 && allCourses.length === 0
                ? 'You need both employees and training courses set up before you can view the compliance matrix. Please add employees and training courses first.'
                : employees.length === 0
                ? isAdminOrOwner
                  ? 'No employees found in your company. Please add employees before viewing the compliance matrix.'
                  : isManager
                  ? 'No team members found. Employees assigned to report to you will appear here.'
                  : 'No employee data found for your profile.'
                : allCourses.length === 0
                ? 'No training courses found. Please create training courses before viewing the compliance matrix.'
                : 'Unable to display compliance matrix data.'}
            </p>
            {isAdminOrOwner && (
              <div className="flex gap-3 justify-center">
                {employees.length === 0 && (
                  <Link 
                    href="/dashboard/people/directory"
                    className="px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] rounded-lg hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out"
                  >
                    Add Employees
                  </Link>
                )}
                {courses.length === 0 && (
                  <Link 
                    href="/dashboard/people/training"
                    className="px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] rounded-lg hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out"
                  >
                    Manage Courses
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {!hasNoData && (
        <>
          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-300 mb-1">How to Use the Compliance Matrix</h3>
                <p className="text-sm text-blue-200/80">
                  This matrix shows training compliance across all employees. Each cell represents an employee's status for a specific training course. 
                  Click any cell to record or update training completion. Required courses are marked with an asterisk (*).
                </p>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{employees.length}</div>
              <div className="text-sm text-neutral-400">Total Employees</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{courses.length}</div>
              <div className="text-sm text-neutral-400">{showMandatoryOnly ? 'Mandatory Courses' : 'Total Courses'}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">
                {data.filter(d => d.compliance_status === 'compliant').length}
              </div>
              <div className="text-sm text-neutral-400">Compliant Records</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">
                {data.filter(d => d.compliance_status === 'required' || d.compliance_status === 'expired').length}
              </div>
              <div className="text-sm text-neutral-400">Non-Compliant</div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-3">Status Legend</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-neutral-400">Compliant - Training completed and valid</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-neutral-400">Expired - Training certificate has expired</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-neutral-400">In Progress - Training currently being completed</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-neutral-400">Required - Mandatory training not yet completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-white/[0.05]" />
                <span className="text-neutral-400">Optional - Training available but not required</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" />
                <span className="text-neutral-400">Invited - Course assignment pending confirmation</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-400" />
                <span className="text-neutral-400">Assigned - Course confirmed, ready to start</span>
              </div>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-white/[0.05]">
                    <th className="sticky left-0 z-10 bg-white/[0.05] px-4 py-3 text-left text-sm font-medium text-neutral-400">
                      Employee
                    </th>
                    {courses.map((course) => (
                      <th key={course.id} className="px-3 py-3 text-center text-xs font-medium text-neutral-400 min-w-[100px]">
                        <div className="space-y-1">
                          <div title={course.name} className="font-semibold">{course.code}</div>
                          {course.is_mandatory && (
                            <span className="text-red-400 text-xs">* Required</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={courses.length + 1} className="px-4 py-8 text-center text-neutral-400">
                        No employees found
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-white/[0.02]">
                        <td className="sticky left-0 z-10 bg-white/[0.05] backdrop-blur-sm px-4 py-3">
                          <Link href={`/dashboard/people/${employee.id}`} className="hover:text-[#EC4899] transition-colors">
                            <p className="text-white font-medium text-sm">{employee.name}</p>
                            {employee.position && (
                              <p className="text-neutral-500 text-xs">{employee.position}</p>
                            )}
                            {employee.site && (
                              <p className="text-neutral-500 text-xs">{employee.site}</p>
                            )}
                          </Link>
                        </td>
                        {courses.map((course) => {
                          const entry = data.find(d => d.profile_id === employee.id && d.course_id === course.id);
                          const status = entry?.compliance_status || 'optional';
                          const assignmentStatus = entry?.assignment_status || null;
                          const isClickable = canAssignCourse(status);
                          
                          return (
                            <td 
                              key={course.id} 
                              className="px-3 py-3 text-center"
                            >
                              {isClickable ? (
                                <button
                                  onClick={() => handleCellClick(employee, course, status, entry)}
                                  className="inline-block hover:scale-110 transition-transform cursor-pointer"
                                  title={`Click to assign ${course.name} to ${employee.name}`}
                                >
                                  {getStatusIcon(status, assignmentStatus || undefined)}
                                </button>
                              ) : (
                                <Link 
                                  href={`/dashboard/people/training/record?employee=${employee.id}&course=${course.id}`}
                                  className="inline-block hover:scale-110 transition-transform"
                                  title={`${employee.name} - ${course.name}: ${status.replace('_', ' ')}`}
                                >
                                  {getStatusIcon(status, assignmentStatus || undefined)}
                                </Link>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Help Text */}
          <div className="text-sm text-neutral-500 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
            <p>
              <span className="text-red-400">*</span> Indicates required training. 
              {profile?.app_role && ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager'].includes((profile.app_role || '').toLowerCase()) && (
                <> Click empty cells to assign courses. Click other cells to view or update training records.</>
              )}
              {!['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager'].includes((profile?.app_role || '').toLowerCase()) && (
                <> Click any cell to view training details.</>
              )}
            </p>
          </div>
        </>
      )}

      {/* Assignment Modal */}
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

export default ComplianceMatrixPage;
