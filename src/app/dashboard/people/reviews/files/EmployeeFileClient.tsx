'use client';

import { useState, useEffect } from 'react';
import { getEmployeeFile } from '@/app/actions/reviews';
import { EmployeeFile } from '@/components/reviews/EmployeeFile';
import { FileText } from 'lucide-react';

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
        <h1 className="text-2xl font-bold text-white">Employee Files</h1>
        <p className="text-neutral-400">View comprehensive review history and performance trends</p>
      </div>

      <div className={`grid ${isStaff ? 'lg:grid-cols-1' : 'lg:grid-cols-4'} gap-6`}>
        {/* Employee List - Hide for staff since they can only see themselves */}
        {!isStaff && (
          <div className="lg:col-span-1">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
              <h2 className="text-white font-medium mb-4">Employees</h2>
              <div className="space-y-2">
                {employees.length === 0 ? (
                  <p className="text-neutral-400 text-sm">No employees found</p>
                ) : (
                  employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedEmployee === emp.id
                        ? 'bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]/30'
                        : 'bg-white/[0.02] text-white hover:bg-white/[0.05] border border-white/[0.06]'
                    }`}
                  >
                    <p className="font-medium truncate">{emp.full_name}</p>
                    {emp.position_title && (
                      <p className="text-xs text-neutral-400 truncate">{emp.position_title}</p>
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
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-12 text-center">
              <FileText className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
              <p className="text-white font-medium">Select an employee</p>
              <p className="text-neutral-400 text-sm mt-1">Choose an employee to view their review file</p>
            </div>
          ) : fileData ? (
            <EmployeeFile fileData={fileData} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EC4899]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

