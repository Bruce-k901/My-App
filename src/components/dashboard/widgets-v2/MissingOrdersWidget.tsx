'use client';

import React, { useEffect, useState } from 'react';
import { WidgetCard, CountBadge, MiniItem } from '../WidgetCard';
import { useWidgetSize } from '../WidgetSizeContext';
import { Send } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';

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
  const [remindingCustomer, setRemindingCustomer] = useState<string | null>(null);
  const [reminderResult, setReminderResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

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

    const interval = setInterval(fetchMissingOrders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [companyId, siteId]);

  const { maxItems } = useWidgetSize();

  const handleRemindOne = async (customer: MissingOrder) => {
    if (!siteId || !customer.customer_email || remindingCustomer) return;

    try {
      setRemindingCustomer(customer.customer_id);
      setReminderResult(null);

      const response = await fetch('/api/planly/standing-orders/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: siteId,
          customers: [{
            customer_id: customer.customer_id,
            customer_name: customer.customer_name,
            customer_email: customer.customer_email,
            missing_dates: customer.missing_dates,
          }],
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setReminderResult({ message: `Sent to ${customer.customer_name}`, type: 'success' });
      } else {
        setReminderResult({ message: result.error || 'Failed', type: 'error' });
      }
    } catch (error) {
      setReminderResult({ message: 'Failed to send', type: 'error' });
    } finally {
      setRemindingCustomer(null);
      setTimeout(() => setReminderResult(null), 3000);
    }
  };

  if (loading) {
    return (
      <WidgetCard title="Missing Orders" module="planly" viewAllHref="/dashboard/planly/order-book">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-black/5 dark:bg-white/5 rounded w-24" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-3/4" />
        </div>
      </WidgetCard>
    );
  }

  const missingCount = data?.missing?.length || 0;

  if (missingCount === 0) {
    return (
      <WidgetCard title="Missing Orders" module="planly" viewAllHref="/dashboard/planly/order-book">
        <CountBadge count={0} label="all orders up to date" status="good" />
        {data?.checked_date_range && (
          <div className="mt-1">
            <span className="text-[10.5px] text-[rgb(var(--text-disabled))]">
              Next 7 days checked
            </span>
          </div>
        )}
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Missing Orders" module="planly" viewAllHref="/dashboard/planly/order-book">
      <CountBadge count={missingCount} label="customers missing orders" status="urgent" />

      {/* Reminder result banner */}
      {reminderResult && (
        <div
          className={`mt-1 px-2 py-1 rounded text-[10.5px] font-medium ${
            reminderResult.type === 'success'
              ? 'bg-planly/10 text-planly-dark dark:text-planly'
              : 'bg-teamly/10 text-teamly'
          }`}
        >
          {reminderResult.message}
        </div>
      )}

      <div className="mt-2">
        {data?.missing.slice(0, maxItems).map((missing) => {
          const dateCount = missing.missing_dates.length;
          const nextDate = missing.missing_dates[0];
          const sub = nextDate
            ? `${format(parseISO(nextDate), 'EEE')} +${dateCount > 1 ? `${dateCount - 1} more` : ''}`
            : `${dateCount} date${dateCount !== 1 ? 's' : ''}`;
          const displaySub = dateCount > 1
            ? `${format(parseISO(nextDate), 'EEE')} +${dateCount - 1} more`
            : format(parseISO(nextDate), 'EEE, MMM d');

          return (
            <div key={missing.customer_id} className="flex items-center justify-between py-0.5">
              <div className="flex-1 min-w-0">
                <MiniItem
                  text={missing.customer_name}
                  sub={displaySub}
                  status="urgent"
                  href="/dashboard/planly/order-book"
                />
              </div>
              {missing.customer_email && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemindOne(missing);
                  }}
                  disabled={remindingCustomer === missing.customer_id}
                  className="ml-1 p-1 rounded text-teamly/60 hover:text-teamly hover:bg-teamly/10 transition-colors disabled:opacity-50 flex-shrink-0"
                  title={`Remind ${missing.customer_name}`}
                >
                  <Send className={`h-3 w-3 ${remindingCustomer === missing.customer_id ? 'animate-pulse' : ''}`} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}
