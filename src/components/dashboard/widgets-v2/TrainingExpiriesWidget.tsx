'use client';

import { useState, useEffect } from 'react';
import { WidgetCard, CountBadge } from '../WidgetCard';
import { useWidgetSize } from '../WidgetSizeContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Mail } from '@/components/ui/icons';
import { AssignCourseModal } from '@/components/training/AssignCourseModal';

// Cache table availability to avoid repeated 400s when table doesn't exist
let tableAvailable: boolean | null = null;

interface TrainingExpiriesWidgetProps {
  siteId: string;
  companyId: string;
}

interface ExpiringTraining {
  id: string;
  profileId: string;
  courseId: string;
  staffName: string;
  trainingName: string;
  daysUntil: number;
}

/**
 * TrainingExpiriesWidget - Shows staff with training expiring in 30 days
 */
export default function TrainingExpiriesWidget({ siteId, companyId }: TrainingExpiriesWidgetProps) {
  const [items, setItems] = useState<ExpiringTraining[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState<{
    profileId: string;
    profileName: string;
    courseId: string;
    courseName: string;
  } | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    // Table previously failed — skip the query entirely
    if (tableAvailable === false) {
      setLoading(false);
      return;
    }

    async function fetchExpiringTraining() {
      try {
        // Use the get_expiring_training RPC which handles joins server-side

        const { data, error } = await supabase.rpc('get_expiring_training', {
          p_company_id: companyId,
          p_days_ahead: 30,
        });

        if (error) {
          console.warn('[TrainingExpiries] RPC failed:', error.code, error.message, error.details, error.hint);
          tableAvailable = false;
          setLoading(false);
          return;
        }

        const allItems: ExpiringTraining[] = (data || []).map((record: any) => ({
          id: record.record_id,
          profileId: record.profile_id || '',
          courseId: record.course_id || '',
          staffName: record.employee_name || 'Unknown',
          trainingName: record.course_name || 'Training',
          daysUntil: record.days_until_expiry,
        }));

        setTotalCount(allItems.length);
        setItems(allItems);
      } catch (err) {
        console.warn('[TrainingExpiries] Unexpected error:', err);
        tableAvailable = false;
      } finally {
        setLoading(false);
      }
    }

    fetchExpiringTraining();
  }, [companyId, siteId]);

  const { maxItems } = useWidgetSize();

  if (loading) {
    return (
      <WidgetCard title="Training Expiries" module="teamly" viewAllHref="/dashboard/people/training">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-black/5 dark:bg-white/5 rounded w-24" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-3/4" />
        </div>
      </WidgetCard>
    );
  }

  if (totalCount === 0) {
    return (
      <WidgetCard title="Training Expiries" module="teamly" viewAllHref="/dashboard/people/training">
        <div className="text-center py-4">
          <div className="text-[rgb(var(--text-disabled))] text-xs">No training expiring soon</div>
        </div>
      </WidgetCard>
    );
  }

  const statusColor = (daysUntil: number) =>
    daysUntil <= 7 ? 'text-teamly' : 'text-checkly-dark dark:text-checkly';

  return (
    <WidgetCard title="Training Expiries" module="teamly" viewAllHref="/dashboard/people/training">
      <CountBadge count={totalCount} label="expiring within 30 days" status="warning" />
      <div className="mt-2">
        {items.slice(0, maxItems).map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center py-0.5 hover:bg-white/5 rounded -mx-1 px-1 transition-colors group"
          >
            <Link
              href="/dashboard/people/training"
              className="flex-1 min-w-0 flex justify-between items-center"
            >
              <span className="text-[11.5px] text-[rgb(var(--text-secondary))] truncate pr-2">
                {item.staffName} — {item.trainingName}
              </span>
              <span className={`text-[10.5px] flex-shrink-0 ${statusColor(item.daysUntil)}`}>
                {item.daysUntil} days
              </span>
            </Link>
            {item.profileId && item.courseId && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAssignModal({
                    profileId: item.profileId,
                    profileName: item.staffName,
                    courseId: item.courseId,
                    courseName: item.trainingName,
                  });
                }}
                className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-amber-500/20 transition-all"
                title="Assign course"
              >
                <Mail className="w-3 h-3 text-amber-400" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Assign Course Modal */}
      {assignModal !== null && (
        <AssignCourseModal
          isOpen={true}
          onClose={() => setAssignModal(null)}
          profileId={assignModal.profileId}
          profileName={assignModal.profileName}
          courseId={assignModal.courseId}
          courseName={assignModal.courseName}
          onSuccess={() => setAssignModal(null)}
        />
      )}
    </WidgetCard>
  );
}
