"use client";

import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Printer } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useDeliverySchedule } from '@/hooks/planly/useDeliverySchedule';
import { useAppContext } from '@/context/AppContext';
import Link from 'next/link';
import '@/styles/delivery-schedule-print.css';

interface DeliveryScheduleEntry {
  customer_id: string;
  customer_name: string;
  contact_name: string;
  address: string;
  postcode: string;
  is_frozen_only: boolean;
  deliveries: { [day: string]: boolean };
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function DeliverySchedulePage() {
  const { siteId } = useAppContext();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');

  const { data, isLoading, error } = useDeliverySchedule(startDate, endDate, siteId);

  const entries = (data as { entries: DeliveryScheduleEntry[] })?.entries || [];

  // Calculate daily totals - must be before any early returns
  const dailyTotals = useMemo(() => {
    const totals: { [key: string]: number } = {};
    DAYS.forEach((_, idx) => {
      const dayKey = format(addDays(weekStart, idx), 'yyyy-MM-dd');
      totals[dayKey] = entries.reduce((count, entry) => {
        return count + (entry.deliveries[dayKey] ? 1 : 0);
      }, 0);
    });
    return totals;
  }, [entries, weekStart]);

  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-tertiary">Please select a site</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-tertiary">Loading delivery schedule...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600 dark:text-red-400">Error loading delivery schedule</div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-theme-primary">Delivery Schedule</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous Week
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-module-fg" />
            <span className="text-theme-primary font-medium">
              {format(weekStart, 'd MMM')} - {format(weekEnd, 'd MMM yyyy')}
            </span>
          </div>
          <Button variant="outline" onClick={handleNextWeek}>
            Next Week
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
          <Button onClick={handlePrint} className="bg-module-fg hover:bg-module-fg/90 text-white">
            <Printer className="h-4 w-4 mr-2" />
            Print Schedule
          </Button>
        </div>
      </div>

      {/* Print header - only visible when printing */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold text-theme-primary">Delivery Schedule</h1>
        <p className="text-sm text-theme-secondary">
          {format(weekStart, 'd MMM')} - {format(weekEnd, 'd MMM yyyy')}
        </p>
      </div>

      <Card className="p-6 overflow-x-auto print:p-0 print:shadow-none print:border-none">
        <table className="w-full print:text-xs">
          <thead>
            <tr className="border-b border-theme print:border-gray-300">
              <th className="text-left py-3 px-4 text-theme-primary font-semibold print:text-theme-primary print:py-2 print:px-2">Customer</th>
              <th className="text-left py-3 px-4 text-theme-primary font-semibold print:text-theme-primary print:py-2 print:px-2">Contact</th>
              <th className="text-left py-3 px-4 text-theme-primary font-semibold print:text-theme-primary print:py-2 print:px-2">Address</th>
              <th className="text-left py-3 px-4 text-theme-primary font-semibold print:text-theme-primary print:py-2 print:px-2">Postcode</th>
              {DAYS.map((day) => (
                <th key={day} className="text-center py-3 px-2 text-theme-primary font-semibold text-sm print:text-theme-primary print:py-2">
                  {day.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={entry.customer_id || idx} className="border-b border-theme hover:bg-theme-hover print:border-gray-200 print:hover:bg-transparent">
                <td className="py-3 px-4 print:py-2 print:px-2">
                  <Link
                    href={`/dashboard/planly/customers/${entry.customer_id}`}
                    className="text-theme-primary hover:text-module-fg hover:underline print:text-theme-primary print:no-underline"
                  >
                    {entry.customer_name}
                  </Link>
                </td>
                <td className="py-3 px-4 text-theme-tertiary print:text-theme-secondary print:py-2 print:px-2">{entry.contact_name}</td>
                <td className="py-3 px-4 text-theme-tertiary print:text-theme-secondary print:py-2 print:px-2">{entry.address}</td>
                <td className="py-3 px-4 text-theme-tertiary print:text-theme-secondary print:py-2 print:px-2">{entry.postcode}</td>
                {DAYS.map((day) => {
                  const dayKey = format(addDays(weekStart, DAYS.indexOf(day)), 'yyyy-MM-dd');
                  const hasDelivery = entry.deliveries[dayKey] || false;
                  return (
                    <td key={day} className="py-3 px-2 text-center print:py-2">
                      {hasDelivery && (
                        <span className="text-module-fg print:text-theme-primary">●</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {entries.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-300 dark:border-white/20 bg-theme-button print:border-gray-400 print:bg-gray-100">
                <td colSpan={4} className="py-3 px-4 text-theme-primary font-semibold print:text-theme-primary print:py-2 print:px-2">
                  Drop count:
                </td>
                {DAYS.map((day) => {
                  const dayKey = format(addDays(weekStart, DAYS.indexOf(day)), 'yyyy-MM-dd');
                  return (
                    <td key={day} className="py-3 px-2 text-center text-theme-primary font-semibold print:text-theme-primary print:py-2">
                      {dailyTotals[dayKey] || 0}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>

        {entries.length === 0 && (
          <div className="text-center py-12 text-theme-tertiary print:text-theme-secondary">
            No deliveries scheduled for this week
          </div>
        )}
      </Card>
    </div>
  );
}
