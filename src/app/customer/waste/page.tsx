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
        <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary mb-2">Waste Tracking</h1>
        <p className="text-theme-tertiary text-sm sm:text-base">
          Track your unsold products and optimize your orders
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Log Waste */}
        <Link href="/customer/waste/log">
          <div className="bg-theme-button border border-theme rounded-xl p-6 hover:bg-theme-hover transition-colors cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-module-fg/10 rounded-lg">
                <Calendar className="w-6 h-6 text-module-fg" />
              </div>
              <ArrowRight className="w-5 h-5 text-theme-tertiary group-hover:text-module-fg transition-colors" />
            </div>
            <h2 className="text-lg font-semibold text-theme-primary mb-2">Log Today's Sales</h2>
            <p className="text-sm text-theme-tertiary">
              Record how many products you sold today to track waste and optimize future orders.
            </p>
          </div>
        </Link>

        {/* View Insights */}
        <Link href="/customer/waste/insights">
          <div className="bg-theme-button border border-theme rounded-xl p-6 hover:bg-theme-hover transition-colors cursor-pointer group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <ArrowRight className="w-5 h-5 text-theme-tertiary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </div>
            <h2 className="text-lg font-semibold text-theme-primary mb-2">View Insights</h2>
            <p className="text-sm text-theme-tertiary">
              Analyze waste patterns, identify trends, and get suggestions to reduce waste.
            </p>
          </div>
        </Link>
      </div>

      {/* Quick Info */}
      <div className="bg-theme-button border border-theme rounded-xl p-6">
        <h3 className="text-lg font-semibold text-theme-primary mb-4">How It Works</h3>
        <div className="space-y-3 text-sm text-theme-tertiary">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-module-fg/20 text-module-fg flex items-center justify-center text-xs font-semibold mt-0.5 flex-shrink-0">
              1
            </div>
            <div>
              <strong className="text-theme-primary">Log your sales daily</strong> - After each delivery, record how many products you actually sold.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-module-fg/20 text-module-fg flex items-center justify-center text-xs font-semibold mt-0.5 flex-shrink-0">
              2
            </div>
            <div>
              <strong className="text-theme-primary">Track waste patterns</strong> - See which days and products have the highest waste.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-module-fg/20 text-module-fg flex items-center justify-center text-xs font-semibold mt-0.5 flex-shrink-0">
              3
            </div>
            <div>
              <strong className="text-theme-primary">Optimize your orders</strong> - Use insights to adjust your standing orders and reduce waste.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

