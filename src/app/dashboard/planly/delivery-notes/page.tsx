"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useDeliveryNotes } from '@/hooks/planly/useDeliveryNotes';
import { useAppContext } from '@/context/AppContext';

export default function DeliveryNotesPage() {
  const { siteId } = useAppContext();
  const [deliveryDate, setDeliveryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { data, isLoading, error } = useDeliveryNotes(deliveryDate, siteId);

  const handlePrint = () => {
    window.print();
  };

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
        <div className="text-white/60">Loading delivery notes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400">Error loading delivery notes</div>
      </div>
    );
  }

  const notes = (data as { date: string; notes: any[] })?.notes || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Delivery Notes</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#14B8A6]" />
            <Input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="bg-white/[0.03] border-white/[0.06] text-white"
            />
          </div>
          <Button onClick={handlePrint} className="print:hidden">
            <Printer className="h-4 w-4 mr-2" />
            Print Delivery Notes
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-white/60">
            No delivery notes for {format(new Date(deliveryDate), 'd MMMM yyyy')}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 print:grid-cols-2">
          {notes.map((note, idx) => (
            <Card key={idx} className="p-4 print:border print:border-gray-300">
              <div className="text-lg font-bold mb-2">{note.company_name}</div>
              <div className="text-sm text-white/60 mb-4">Delivery Note</div>
              
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-white/60">Date:</span>
                <span className="font-medium text-white">{note.date}</span>
              </div>
              
              <div className="mb-4">
                <div className="font-medium text-white">{note.customer_name}</div>
                <div className="text-sm text-white/60">{note.address}</div>
                <div className="text-sm text-white/60">{note.postcode}</div>
                <div className="text-sm text-white/60">Contact: {note.contact}</div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-1 text-white">Product</th>
                    <th className="text-right py-1 text-white">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {note.products.map((product: any, pIdx: number) => (
                    <tr key={pIdx} className="border-b border-white/10">
                      <td className="py-1 text-white">{product.name}</td>
                      <td className="text-right py-1 text-white">{product.quantity || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-center text-xs text-white/40 mt-4">
                THANK YOU FOR YOUR BUSINESS!
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
