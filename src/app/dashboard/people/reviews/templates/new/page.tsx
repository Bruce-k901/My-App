import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@/components/ui/icons';
import { Button } from '@/components/ui';
import { CreateTemplateForm } from '@/components/reviews/CreateTemplateForm';
import { getCurrentProfile } from '@/app/actions/reviews';
import { redirect } from 'next/navigation';

// Mark as dynamic since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function NewTemplatePage() {
  // Check if user is staff - staff cannot create templates
  try {
    const profile = await getCurrentProfile();
    const isStaff = profile?.app_role && 
      ['staff', 'employee'].includes((profile.app_role || '').toLowerCase());
    
    if (isStaff) {
      redirect('/dashboard/people/reviews/templates');
    }
  } catch (error) {
    console.error('Error checking profile:', error);
    // Allow access if we can't check profile (better UX)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/people/reviews/templates">
          <Button variant="ghost" className="text-gray-500 dark:text-white/60 hover:text-gray-900 dark:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Template</h1>
          <p className="text-gray-500 dark:text-white/60 mt-1">Build a custom review template for your organization</p>
        </div>
      </div>

      <Suspense fallback={<CreateTemplateSkeleton />}>
        <CreateTemplateForm />
      </Suspense>
    </div>
  );
}

function CreateTemplateSkeleton() {
  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-6 space-y-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-5 w-32 bg-gray-100 dark:bg-white/[0.05] rounded animate-pulse" />
          <div className="h-10 w-full bg-gray-100 dark:bg-white/[0.05] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

