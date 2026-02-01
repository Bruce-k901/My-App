'use client';

import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Package, Calendar, User, PoundSterling } from 'lucide-react';

interface OrderSummaryProps {
  customerName: string;
  deliveryDate: Date;
  lineCount: number;
  subtotal: number;
}

export function OrderSummary({
  customerName,
  deliveryDate,
  lineCount,
  subtotal,
}: OrderSummaryProps) {
  return (
    <Card className="p-4 bg-gradient-to-r from-[#14B8A6]/10 to-[#14B8A6]/5 border-[#14B8A6]/20">
      <div className="flex items-center justify-between">
        {/* Summary Items */}
        <div className="flex items-center gap-6">
          {/* Customer */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[#14B8A6]" />
            <span className="text-gray-500 dark:text-white/60 text-sm">
              {customerName || 'No customer selected'}
            </span>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#14B8A6]" />
            <span className="text-gray-500 dark:text-white/60 text-sm">
              {format(deliveryDate, 'EEE d MMM')}
            </span>
          </div>

          {/* Items */}
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[#14B8A6]" />
            <span className="text-gray-500 dark:text-white/60 text-sm">
              {lineCount} {lineCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center gap-2">
          <PoundSterling className="h-5 w-5 text-[#14B8A6]" />
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {subtotal.toFixed(2)}
          </span>
        </div>
      </div>
    </Card>
  );
}
