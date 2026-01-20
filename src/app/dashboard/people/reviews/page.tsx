import { Suspense } from 'react';
import { getDashboardStats, getReviews, getMyUpcomingReviews, getOverdueReviews } from '@/app/actions/reviews';
import { ReviewsDashboard } from '@/components/reviews';

// Mark as dynamic since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function ReviewsOverviewPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <ReviewsDashboardContent />
      </Suspense>
    </div>
  );
}

async function ReviewsDashboardContent() {
  try {
    console.log('🔍 Loading reviews dashboard...');
    
    const statsPromise = getDashboardStats().catch(err => {
      console.error('❌ Error in getDashboardStats:', err);
      return {
        total_reviews_this_month: 0,
        completed_reviews_this_month: 0,
        overdue_reviews: 0,
        upcoming_reviews_7_days: 0,
        pending_follow_ups: 0,
      };
    });
    
    const reviewsPromise = getReviews().catch(err => {
      console.error('❌ Error in getReviews:', err);
      return [];
    });
    
    const myUpcomingPromise = getMyUpcomingReviews().catch(err => {
      console.error('❌ Error in getMyUpcomingReviews:', err);
      return [];
    });
    
    const overduePromise = getOverdueReviews().catch(err => {
      console.error('❌ Error in getOverdueReviews:', err);
      return [];
    });
    
    const [stats, reviews, myUpcoming, overdue] = await Promise.all([
      statsPromise,
      reviewsPromise,
      myUpcomingPromise,
      overduePromise,
    ]);
    
    console.log('✅ Reviews dashboard loaded:', { stats, reviewsCount: reviews.length, myUpcomingCount: myUpcoming.length, overdueCount: overdue.length });
    
    return (
      <ReviewsDashboard 
        stats={stats} 
        reviews={reviews} 
        myUpcoming={myUpcoming} 
        overdueReviews={overdue} 
      />
    );
  } catch (error) {
    console.error('❌ Fatal error loading reviews dashboard:', error);
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-12 text-center">
        <p className="text-white font-medium">Error loading reviews</p>
        <p className="text-neutral-400 text-sm mt-1">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <p className="text-neutral-500 text-xs mt-2">Check the server console for details</p>
        <pre className="text-xs text-neutral-500 mt-4 text-left bg-black/20 p-4 rounded overflow-auto">
          {error instanceof Error ? error.stack : String(error)}
        </pre>
      </div>
    );
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-white/[0.05] rounded animate-pulse" />
        <div className="h-10 w-32 bg-white/[0.05] rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-white/[0.05] rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="h-10 w-64 bg-white/[0.05] rounded animate-pulse" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-white/[0.05] rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
