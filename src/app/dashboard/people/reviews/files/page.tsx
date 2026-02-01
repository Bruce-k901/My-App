import { Suspense } from 'react';
import { getEmployeesForReviews } from '@/app/actions/reviews';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { EmployeeFile } from '@/components/reviews/EmployeeFile';
import { notFound } from 'next/navigation';
import EmployeeFileClient from './EmployeeFileClient';

// Mark as dynamic since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function EmployeeFilesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    notFound();
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  // Determine user's role and filter employees accordingly
  const role = (profile.app_role || '').toLowerCase();
  const isAdminOrOwner = ['admin', 'owner'].includes(role);
  const isManager = ['manager', 'general_manager', 'area_manager', 'regional_manager'].includes(role);
  const isStaff = !isAdminOrOwner && !isManager;

  let employees: any[] = [];

  if (isStaff) {
    // Staff can only see themselves
    employees = [profile];
  } else if (isManager) {
    // Managers see their direct reports + themselves
    // Get direct reports
    const { data: directReports, error: reportsError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, position_title')
      .eq('company_id', profile.company_id)
      .eq('reports_to', profile.id)
      .eq('status', 'active')
      .order('full_name');
    
    if (reportsError) {
      console.error('Error fetching direct reports:', reportsError);
      employees = [profile]; // Fallback to just themselves if error
    } else {
      // Include the manager themselves
      employees = [
        { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url, position_title: profile.position_title },
        ...(directReports || [])
      ];
    }
  } else {
    // Admins/Owners see all employees
    employees = await getEmployeesForReviews(undefined);
  }

  return (
    <Suspense fallback={<FilesSkeleton />}>
      <EmployeeFileClient profile={profile} employees={employees} />
    </Suspense>
  );
}

function FilesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-gray-100 dark:bg-white/[0.05] rounded animate-pulse" />
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 h-96 bg-gray-100 dark:bg-white/[0.05] rounded-lg animate-pulse" />
        <div className="lg:col-span-3 h-96 bg-gray-100 dark:bg-white/[0.05] rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

