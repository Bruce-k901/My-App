"use client";

import { DollarSign } from 'lucide-react';

export default function MonthlySalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Monthly Sales by Site</h1>
        <p className="text-white/50 text-sm mt-1">
          Sales summaries by customer site for invoicing purposes
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
        <DollarSign className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <h3 className="text-white font-medium mb-2">Monthly Sales by Site</h3>
        <p className="text-white/60 text-sm">
          Monthly sales reporting coming soon. View sales totals by customer site for invoicing and reporting.
        </p>
      </div>
    </div>
  );
}
