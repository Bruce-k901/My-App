"use client";

import { FileText } from 'lucide-react';

export default function DeliveryNotesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Delivery Notes</h1>
        <p className="text-white/50 text-sm mt-1">
          Generate and manage delivery notes for customers
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
        <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <h3 className="text-white font-medium mb-2">Delivery Notes</h3>
        <p className="text-white/60 text-sm">
          Delivery notes functionality coming soon. Generate printable delivery notes for each customer order.
        </p>
      </div>
    </div>
  );
}
