'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, TrendingUp, ArrowRight, Loader2 } from '@/components/ui/icons';
import { Button } from '@/components/ui';

export default function WasteTrackingPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Waste Tracking</h1>
        <p className="text-white/60 text-sm sm:text-base">
          Track your unsold products and optimize your orders
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Log Waste */}
        <Link href="/customer/waste/log">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.05] transition-colors cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-[#D37E91]/10 rounded-lg">
                <Calendar className="w-6 h-6 text-[#D37E91]" />
              </div>
              <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-[#D37E91] transition-colors" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Log Today's Sales</h2>
            <p className="text-sm text-white/60">
              Record how many products you sold today to track waste and optimize future orders.
            </p>
          </div>
        </Link>

        {/* View Insights */}
        <Link href="/customer/waste/insights">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.05] transition-colors cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-blue-400 transition-colors" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">View Insights</h2>
            <p className="text-sm text-white/60">
              Analyze waste patterns, identify trends, and get suggestions to reduce waste.
            </p>
          </div>
        </Link>
      </div>

      {/* Quick Info */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
        <div className="space-y-3 text-sm text-white/60">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#D37E91]/20 text-[#D37E91] flex items-center justify-center text-xs font-semibold mt-0.5 flex-shrink-0">
              1
            </div>
            <div>
              <strong className="text-white">Log your sales daily</strong> - After each delivery, record how many products you actually sold.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#D37E91]/20 text-[#D37E91] flex items-center justify-center text-xs font-semibold mt-0.5 flex-shrink-0">
              2
            </div>
            <div>
              <strong className="text-white">Track waste patterns</strong> - See which days and products have the highest waste.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#D37E91]/20 text-[#D37E91] flex items-center justify-center text-xs font-semibold mt-0.5 flex-shrink-0">
              3
            </div>
            <div>
              <strong className="text-white">Optimize your orders</strong> - Use insights to adjust your standing orders and reduce waste.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

