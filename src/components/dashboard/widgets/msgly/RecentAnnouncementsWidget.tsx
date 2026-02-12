'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { Megaphone, Clock } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  author_name: string;
}

export default function RecentAnnouncementsWidget({ companyId, siteId }: WidgetProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.msgly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchAnnouncements() {
      try {
        // Try notifications table first (announcements are often stored there)
        let query = supabase
          .from('notifications')
          .select(`
            id,
            title,
            message,
            created_at,
            created_by:profiles!notifications_created_by_fkey(full_name, first_name, last_name)
          `)
          .eq('company_id', companyId)
          .eq('type', 'announcement')
          .order('created_at', { ascending: false })
          .limit(3);

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01') {
            console.debug('notifications table not available');
            setLoading(false);
            return;
          }
          // Try alternative query without the join
          const { data: altData, error: altError } = await supabase
            .from('notifications')
            .select('id, title, message, created_at')
            .eq('company_id', companyId)
            .eq('type', 'announcement')
            .order('created_at', { ascending: false })
            .limit(3);

          if (altError) throw altError;

          setAnnouncements(
            (altData || []).map((ann: any) => ({
              id: ann.id,
              title: ann.title || 'Announcement',
              message: ann.message || '',
              created_at: ann.created_at,
              author_name: 'Admin',
            }))
          );
          setLoading(false);
          return;
        }

        const formattedAnnouncements: Announcement[] = (data || []).map((ann: any) => {
          const author = ann.created_by || {};
          const authorName =
            author.full_name ||
            (author.first_name && author.last_name
              ? `${author.first_name} ${author.last_name}`
              : 'Admin');

          return {
            id: ann.id,
            title: ann.title || 'Announcement',
            message: ann.message || '',
            created_at: ann.created_at,
            author_name: authorName,
          };
        });

        setAnnouncements(formattedAnnouncements);
      } catch (err) {
        console.error('Error fetching announcements:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnnouncements();
  }, [companyId, siteId]);

  if (loading) {
    return <WidgetLoading />;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <WidgetCard
      title="Recent Announcements"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <Megaphone className={cn('w-4 h-4', colors.text)} />
        </div>
      }
      viewAllHref="/dashboard/messaging/announcements"
    >
      {announcements.length === 0 ? (
        <WidgetEmptyState
          icon={<Megaphone className="w-8 h-8" />}
          message="No announcements yet"
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <Link
              key={announcement.id}
              href={`/dashboard/messaging/announcements/${announcement.id}`}
              className="block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white line-clamp-1">
                {announcement.title}
              </p>
              {announcement.message && (
                <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary line-clamp-2 mt-1">
                  {announcement.message}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary mt-2">
                <span>{announcement.author_name}</span>
                <span>•</span>
                <Clock className="w-3 h-3" />
                <span>{formatDate(announcement.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
