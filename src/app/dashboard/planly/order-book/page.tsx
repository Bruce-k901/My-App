"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { OrderBook } from '@/components/planly/orders/OrderBook';
import { useAppContext } from '@/context/AppContext';
import { Input } from '@/components/ui/Input';

export default function OrderBookPage() {
  const { siteId } = useAppContext();
  const [deliveryDate, setDeliveryDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Please select a site</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Order Book</h1>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#14B8A6]" />
          <Input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="bg-white/[0.03] border-white/[0.06] text-white"
          />
        </div>
      </div>

      <OrderBook deliveryDate={deliveryDate} siteId={siteId} />
    </div>
  );
}
