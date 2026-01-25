"use client";

import { useState } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useDeliverySchedule } from '@/hooks/planly/useDeliverySchedule';
import { useAppContext } from '@/context/AppContext';
import { DropsReportEntry } from '@/types/planly';

export default function DeliverySchedulePage() {
  const { siteId } = useAppContext();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');
  
  const { data, isLoading, error } = useDeliverySchedule(startDate, endDate, siteId);

  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Please select a site</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Loading delivery schedule...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400">Error loading delivery schedule</div>
      </div>
    );
  }

  const entries = (data as { entries: DropsReportEntry[] })?.entries || [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Delivery Schedule</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous Week
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#14B8A6]" />
            <span className="text-white font-medium">
              {format(weekStart, 'd MMM')} - {format(weekEnd, 'd MMM yyyy')}
            </span>
          </div>
          <Button variant="outline" onClick={handleNextWeek}>
            Next Week
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      <Card className="p-6 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-white font-semibold">Customer</th>
              <th className="text-left py-3 px-4 text-white font-semibold">Contact</th>
              <th className="text-left py-3 px-4 text-white font-semibold">Address</th>
              <th className="text-left py-3 px-4 text-white font-semibold">Postcode</th>
              {days.map((day) => (
                <th key={day} className="text-center py-3 px-2 text-white font-semibold text-sm">
                  {day.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={idx} className="border-b border-white/10 hover:bg-white/5">
                <td className="py-3 px-4 text-white">{entry.customer_name}</td>
                <td className="py-3 px-4 text-white/60">{entry.contact_name}</td>
                <td className="py-3 px-4 text-white/60">{entry.address}</td>
                <td className="py-3 px-4 text-white/60">{entry.postcode}</td>
                {days.map((day) => {
                  const dayKey = format(addDays(weekStart, days.indexOf(day)), 'yyyy-MM-dd');
                  const hasDelivery = entry.deliveries[dayKey] || false;
                  return (
                    <td key={day} className="py-3 px-2 text-center">
                      {hasDelivery && (
                        <div className="w-6 h-6 mx-auto rounded-full bg-[#14B8A6]"></div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {entries.length === 0 && (
          <div className="text-center py-12 text-white/60">
            No deliveries scheduled for this week
          </div>
        )}
      </Card>
    </div>
  );
}
