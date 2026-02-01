'use client';

import { useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useProductionPlan } from '@/hooks/planly/useProductionPlan';
import { useAppContext } from '@/context/AppContext';

interface DailyWorksheetProps {
  siteId: string;
  initialDate?: Date;
}

export function DailyWorksheet({ siteId, initialDate = new Date() }: DailyWorksheetProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const { data: plan, isLoading, error } = useProductionPlan(siteId, selectedDate);

  const handlePreviousDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Loading production plan...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400">Error loading production plan</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handlePreviousDay}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous Day
          </Button>
          <h2 className="text-2xl font-bold text-white">
            {format(selectedDate, 'EEEE d MMMM yyyy')}
          </h2>
          <Button variant="outline" onClick={handleNextDay}>
            Next Day
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        <Button onClick={handlePrint} className="print:hidden">
          <Printer className="h-4 w-4 mr-2" />
          Print Daily Worksheet
        </Button>
      </div>

      {/* Order Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Orders to Pack
          <span className="text-sm font-normal text-white/50 ml-2">
            (Delivery: {format(selectedDate, 'd MMM')})
          </span>
        </h3>
        {plan?.orders_by_delivery?.[format(selectedDate, 'yyyy-MM-dd')]?.length > 0 ? (
          <div className="space-y-2">
            {plan.orders_by_delivery[format(selectedDate, 'yyyy-MM-dd')].map((order: any) => (
              <div key={order.id} className="border-b border-white/10 pb-2 last:border-0">
                <div className="font-medium text-white">{order.customer?.name}</div>
                <div className="text-sm text-white/60">
                  {order.lines?.length || 0} items • £{order.total_value?.toFixed(2) || '0.00'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-white/60">
            No orders scheduled for this day
          </div>
        )}
      </Card>

      {/* Production Tasks */}
      {plan?.tasks && plan.tasks.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Production Tasks</h3>
          <div className="space-y-4">
            {plan.tasks.map((task: any, idx: number) => (
              <div key={idx} className="border border-white/10 rounded-lg p-4">
                <div className="font-medium text-white">{task.stage}</div>
                <div className="text-sm text-white/60 mt-1">
                  {task.items?.length || 0} items
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tray Layouts */}
      {plan?.tray_layouts && plan.tray_layouts.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Tray Layouts</h3>
          <div className="space-y-4">
            {plan.tray_layouts.map((layout: any, idx: number) => (
              <div key={idx} className="border border-white/10 rounded-lg p-4">
                <div className="font-medium text-white">{layout.bake_group_name}</div>
                <div className="text-sm text-white/60 mt-1">
                  {layout.trays?.length || 0} trays
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
