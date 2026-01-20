import { Suspense } from 'react';
import { getTemplates } from '@/app/actions/reviews';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ScheduleForm } from '@/components/reviews/ScheduleForm';
import { notFound } from 'next/navigation';

// Mark as dynamic since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function ScheduleReviewPage() {
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

  const isManager = profile.app_role && ['admin', 'owner', 'manager'].includes(profile.app_role.toLowerCase());

  if (!isManager) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-12 text-center">
        <p className="text-white font-medium">Access Restricted</p>
        <p className="text-neutral-400 text-sm mt-1">You need manager permissions to schedule reviews</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<ScheduleSkeleton />}>
      <ScheduleContent profile={profile} />
    </Suspense>
  );
}

async function ScheduleContent({ profile }: { profile: any }) {
  const supabase = await createServerSupabaseClient();
  
  // Fetch templates
  const templates = await getTemplates();
  
  // Fetch employees - show all for admins/owners, direct reports for managers
  const isAdminOrOwner = profile.app_role && ['admin', 'owner'].includes(profile.app_role.toLowerCase());
  
  let employees: any[] = [];
  
  try {
    let employeesQuery = supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('company_id', profile.company_id)
      .order('full_name');
    
    // If not admin/owner, only show direct reports
    if (!isAdminOrOwner) {
      employeesQuery = employeesQuery.eq('reports_to', profile.id);
    }
    
    const { data, error: employeesError } = await employeesQuery;
    
    if (employeesError) {
      // Log detailed error information
      console.error('Error fetching employees:', {
        message: employeesError.message,
        code: employeesError.code,
        details: employeesError.details,
        hint: employeesError.hint,
        error: employeesError,
      });
      // Continue with empty array - don't break the page
      employees = [];
    } else {
      employees = data || [];
    }
  } catch (error) {
    // Catch any unexpected errors
    console.error('Unexpected error fetching employees:', error);
    employees = [];
  }

  return (
    <ScheduleForm 
      templates={templates} 
      employees={employees} 
    />
  );
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="h-8 w-48 bg-white/[0.05] rounded animate-pulse" />
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 space-y-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-5 w-32 bg-white/[0.05] rounded animate-pulse" />
            <div className="h-10 w-full bg-white/[0.05] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
