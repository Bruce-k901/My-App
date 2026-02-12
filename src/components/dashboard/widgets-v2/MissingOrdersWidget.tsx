'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Zap, Calendar } from '@/components/ui/icons';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/Button';

interface MissingOrdersWidgetProps {
  siteId: string;
  companyId: string;
}

interface MissingOrder {
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  missing_dates: string[];
  standing_order_id: string;
}

interface MissingOrdersData {
  missing: MissingOrder[];
  checked_date_range: {
    start: string;
    end: string;
  };
}

export default function MissingOrdersWidget({ siteId, companyId }: MissingOrdersWidgetProps) {
  const [data, setData] = useState<MissingOrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!siteId || siteId === 'all') {
      setLoading(false);
      return;
    }

    const fetchMissingOrders = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/planly/standing-orders/missing?site_id=${siteId}&days_ahead=7`
        );

        if (!res.ok) {
          // API may fail if planly tables don't exist yet — degrade gracefully
          setLoading(false);
          return;
        }

        const result = await res.json();
        setData(result);
      } catch (error) {
        // Degrade gracefully (table/endpoint may not exist yet)
      } finally {
        setLoading(false);
      }
    };

    fetchMissingOrders();

    // Refresh every 5 minutes
    const interval = setInterval(fetchMissingOrders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [siteId]);

  const handleGenerateAll = async () => {
    if (!siteId || generating) return;

    try {
      setGenerating(true);
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 7);

      const response = await fetch('/api/planly/standing-orders/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: format(today, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          site_id: siteId,
          auto_confirm: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate orders');
      }

      const result = await response.json();

      // Refresh the missing orders list
      const res = await fetch(
        `/api/planly/standing-orders/missing?site_id=${siteId}&days_ahead=7`
      );
      if (res.ok) {
        const updatedData = await res.json();
        setData(updatedData);
      }
    } catch (error) {
      console.error('Error generating orders:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="text-sm text-theme-tertiary">
          Loading missing orders...
        </div>
      </div>
    );
  }

  if (!siteId || siteId === 'all') {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="text-sm text-theme-tertiary">
          Select a site to view missing orders
        </div>
      </div>
    );
  }

  const missingCount = data?.missing?.length || 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-theme-primary">
            Missing Orders
          </h3>
          <Link
            href="/dashboard/planly/order-book"
            className="text-[10px] text-teamly/70 hover:text-teamly transition-colors"
          >
            View all →
          </Link>
        </div>
        {missingCount > 0 && (
          <Button
            onClick={handleGenerateAll}
            disabled={generating}
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Zap className={`h-4 w-4 mr-1 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate All'}
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {missingCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-3">
              <svg
                className="h-6 w-6 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-theme-primary">
              All orders up to date
            </p>
            <p className="text-xs text-theme-tertiary mt-1">
              No missing orders for the next 7 days
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.missing.map((missing) => (
              <div
                key={missing.customer_id}
                className="p-3 rounded-lg border border-orange-200 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-900/10"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-theme-primary text-sm">
                      {missing.customer_name}
                    </h4>
                    {missing.customer_email && (
                      <p className="text-xs text-theme-tertiary mt-0.5">
                        {missing.customer_email}
                      </p>
                    )}
                  </div>
                  <div className="ml-2 px-2 py-1 rounded-full bg-orange-200 dark:bg-orange-500/30 text-orange-700 dark:text-orange-300 text-xs font-medium">
                    {missing.missing_dates.length} {missing.missing_dates.length === 1 ? 'date' : 'dates'}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {missing.missing_dates.map((date) => (
                    <div
                      key={date}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-500/30 text-xs"
                    >
                      <Calendar className="h-3 w-3 text-orange-500" />
                      <span className="text-theme-secondary">
                        {format(parseISO(date), 'EEE, MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {data?.checked_date_range && (
        <div className="mt-4 pt-3 border-t border-theme">
          <p className="text-xs text-theme-tertiary text-center">
            Checking {format(parseISO(data.checked_date_range.start), 'MMM d')} -{' '}
            {format(parseISO(data.checked_date_range.end), 'MMM d, yyyy')}
          </p>
        </div>
      )}
    </div>
  );
}
