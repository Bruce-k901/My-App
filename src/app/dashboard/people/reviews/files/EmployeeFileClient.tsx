'use client';

import { useState, useEffect } from 'react';
import { getEmployeeFile } from '@/app/actions/reviews';
import { EmployeeFile } from '@/components/reviews/EmployeeFile';
import { FileText } from '@/components/ui/icons';

export default function EmployeeFileClient({ profile, employees }: { profile: any; employees: any[] }) {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [fileData, setFileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const role = (profile.app_role || '').toLowerCase();
  const isAdminOrOwner = ['admin', 'owner'].includes(role);
  const isManager = ['manager', 'general_manager', 'area_manager', 'regional_manager'].includes(role);
  const isStaff = !isAdminOrOwner && !isManager;

  useEffect(() => {
    // Auto-select current user if staff (only one option) or if they're not an admin/owner/manager with multiple options
    if ((isStaff || !isAdminOrOwner && !isManager) && employees.length > 0) {
      const myProfile = employees.find((e: any) => e.id === profile.id);
      if (myProfile) {
        setSelectedEmployee(myProfile.id);
      } else if (employees.length === 1) {
        // If there's only one employee (staff case), select it
        setSelectedEmployee(employees[0].id);
      }
    }
  }, [employees, profile.id, isStaff, isAdminOrOwner, isManager]);

  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeFile();
    }
  }, [selectedEmployee]);

  const fetchEmployeeFile = async () => {
    if (!selectedEmployee) return;

    try {
      const fileData = await getEmployeeFile(selectedEmployee);
      setFileData(fileData);
    } catch (error) {
      console.error('Error fetching employee file:', error);
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Files</h1>
        <p className="text-gray-600 dark:text-white/60">View comprehensive review history and performance trends</p>
      </div>

      <div className={`grid ${isStaff ? 'lg:grid-cols-1' : 'lg:grid-cols-4'} gap-6`}>
        {/* Employee List - Hide for staff since they can only see themselves */}
        {!isStaff && (
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4 shadow-sm dark:shadow-none">
              <h2 className="text-gray-900 dark:text-white font-medium mb-4">Employees</h2>
              <div className="space-y-2">
                {employees.length === 0 ? (
                  <p className="text-gray-600 dark:text-white/60 text-sm">No employees found</p>
                ) : (
                  employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedEmployee === emp.id
                        ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30'
                        : 'bg-gray-50 dark:bg-white/[0.02] text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06]'
                    }`}
                  >
                    <p className="font-medium truncate">{emp.full_name}</p>
                    {emp.position_title && (
                      <p className="text-xs text-gray-600 dark:text-white/60 truncate">{emp.position_title}</p>
                    )}
                  </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Employee File Content */}
        <div className={isStaff ? 'lg:col-span-1' : 'lg:col-span-3'}>
          {!selectedEmployee ? (
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-12 text-center shadow-sm dark:shadow-none">
              <FileText className="w-12 h-12 text-gray-400 dark:text-white/50 mx-auto mb-4" />
              <p className="text-gray-900 dark:text-white font-medium">Select an employee</p>
              <p className="text-gray-600 dark:text-white/60 text-sm mt-1">Choose an employee to view their review file</p>
            </div>
          ) : fileData ? (
            <EmployeeFile fileData={fileData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

