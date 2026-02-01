import { notFound } from 'next/navigation';
import { getReview } from '@/app/actions/reviews';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ReviewPortal } from '@/components/reviews/ReviewPortal';

export const dynamic = 'force-dynamic';

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
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

  const review = await getReview(id);
  
  if (!review) {
    return (
      <div className="p-8 text-white">
        <h1>Review not found</h1>
        <p>ID: {id}</p>
      </div>
    );
  }

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('📋 Review Page - Review Data:', {
      id: review.id,
      employee_id: review.employee_id,
      manager_id: review.manager_id,
      profile_id: profile.id,
      employee_name: review.employee?.full_name,
      template_name: review.template?.name,
      status: review.status,
      responses_count: review.responses?.length || 0,
      sections_count: review.template?.sections?.length || 0,
    });
  }

  const isEmployee = review.employee_id === profile.id;
  const isManager = review.manager_id === profile.id;

  // Check if user has access
  if (!isEmployee && !isManager) {
    return (
      <div className="p-8 text-white">
        <h1>Access Denied</h1>
        <p>You don't have permission to view this review.</p>
        <p className="text-sm text-gray-500 dark:text-white/60 mt-2">
          Review ID: {id}<br />
          Your Profile ID: {profile.id}<br />
          Employee ID: {review.employee_id}<br />
          Manager ID: {review.manager_id}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <ReviewPortal 
        review={review} 
        currentUserId={profile.id}
        isEmployee={isEmployee}
        isManager={isManager}
      />
    </div>
  );
}
