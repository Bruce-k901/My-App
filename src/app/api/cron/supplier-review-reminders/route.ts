// @salsa - SALSA Compliance: Daily supplier review reminder cron
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/cron/supplier-review-reminders
 * Runs daily via Vercel cron. Checks suppliers with approaching
 * next_review_date and creates reminder notifications.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let notificationsCreated = 0;

    // @salsa — Check for suppliers with review due within 14 days
    const reviewThreshold = new Date(today);
    reviewThreshold.setDate(reviewThreshold.getDate() + 14);
    const reviewThresholdStr = reviewThreshold.toISOString().split('T')[0];

    const { data: upcomingReviews, error: reviewError } = await supabase
      .from('suppliers')
      .select('id, company_id, name, approval_status, next_review_date')
      .eq('is_active', true)
      .gte('next_review_date', todayStr)
      .lte('next_review_date', reviewThresholdStr);

    if (!reviewError && upcomingReviews && upcomingReviews.length > 0) {
      for (const supplier of upcomingReviews) {
        const daysLeft = Math.ceil(
          (new Date(supplier.next_review_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        await supabase.from('notifications').insert({
          company_id: supplier.company_id,
          type: 'alert',
          title: `Supplier review due: ${supplier.name}`,
          message: `${supplier.name} supplier review is due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (${supplier.next_review_date}). Current status: ${supplier.approval_status || 'pending'}.`,
          severity: daysLeft <= 3 ? 'warning' : 'info',
          priority: daysLeft <= 3 ? 'high' : 'medium',
          status: 'active',
          metadata: {
            salsa: true,
            supplier_id: supplier.id,
            supplier_name: supplier.name,
            review_date: supplier.next_review_date,
            days_until_review: daysLeft,
          },
        });
        notificationsCreated++;
      }
    }

    // @salsa — Check for overdue reviews
    const { data: overdueReviews, error: overdueError } = await supabase
      .from('suppliers')
      .select('id, company_id, name, approval_status, next_review_date')
      .eq('is_active', true)
      .lt('next_review_date', todayStr);

    if (!overdueError && overdueReviews && overdueReviews.length > 0) {
      for (const supplier of overdueReviews) {
        const daysOverdue = Math.ceil(
          (today.getTime() - new Date(supplier.next_review_date!).getTime()) / (1000 * 60 * 60 * 24)
        );

        await supabase.from('notifications').insert({
          company_id: supplier.company_id,
          type: 'alert',
          title: `OVERDUE: Supplier review — ${supplier.name}`,
          message: `${supplier.name} supplier review was due ${supplier.next_review_date} (${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue). Review immediately to maintain SALSA compliance.`,
          severity: 'critical',
          priority: 'urgent',
          status: 'active',
          metadata: {
            salsa: true,
            supplier_id: supplier.id,
            supplier_name: supplier.name,
            review_date: supplier.next_review_date,
            days_overdue: daysOverdue,
          },
        });
        notificationsCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        upcoming_reviews: upcomingReviews?.length || 0,
        overdue_reviews: overdueReviews?.length || 0,
        notifications_created: notificationsCreated,
        checked_at: today.toISOString(),
      },
    });
  } catch (err) {
    console.error('[supplier-review-reminders] Error:', err);
    return NextResponse.json(
      { error: 'Failed to process supplier review reminders' },
      { status: 500 }
    );
  }
}
