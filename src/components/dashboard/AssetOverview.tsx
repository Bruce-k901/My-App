"use client";

import React, { useState, useEffect } from "react";
import { Wrench, AlertTriangle, CheckCircle2, Clock, Package, CalendarCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import Link from "next/link";

interface AssetSummary {
  total: number;
  needingService: number;
  underWarranty: number;
  overdue: number;
  serviceBooked: number;
}

export default function AssetOverview() {
  const [assetSummary, setAssetSummary] = useState<AssetSummary>({
    total: 0,
    needingService: 0,
    underWarranty: 0,
    overdue: 0,
    serviceBooked: 0
  });
  const [loading, setLoading] = useState(true);
  const { companyId } = useAppContext();

  useEffect(() => {
    if (companyId) {
      loadAssetSummary();
    } else {
      // If no companyId, stop loading state immediately
      setLoading(false);
      setAssetSummary({
        total: 0,
        needingService: 0,
        underWarranty: 0,
        overdue: 0,
        serviceBooked: 0
      });
    }
  }, [companyId]); // Removed loadAssetSummary from deps to prevent infinite loop

  const loadAssetSummary = React.useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Get all assets for the company
      const { data: assets, error } = await supabase
        .from("assets")
        .select("id, next_service_date, warranty_end, ppm_status")
        .eq("company_id", companyId);

      if (error) throw error;

      const now = new Date();
      const summary: AssetSummary = {
        total: assets?.length || 0,
        needingService: 0,
        underWarranty: 0,
        overdue: 0,
        serviceBooked: 0
      };

      // If no assets, return immediately with zero summary
      if (!assets || assets.length === 0) {
        setAssetSummary(summary);
        setLoading(false);
        return;
      }

      assets.forEach(asset => {
        // Check if asset has service booked
        if (asset.ppm_status === 'service_booked') {
          summary.serviceBooked++;
        }

        // Check if asset needs service soon (within 30 days)
        if (asset.next_service_date) {
          const serviceDate = new Date(asset.next_service_date);
          const daysUntilService = Math.ceil((serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilService <= 30 && daysUntilService >= 0) {
            summary.needingService++;
          } else if (daysUntilService < 0) {
            summary.overdue++;
          }
        }

        // Check if asset is under warranty using warranty_end column
        if (asset.warranty_end) {
          const warrantyEndDate = new Date(asset.warranty_end);

          if (now <= warrantyEndDate) {
            summary.underWarranty++;
          }
        }
      });

      setAssetSummary(summary);
    } catch (error: any) {
      const errorMessage = error?.message || error?.code || 'Unknown error';
      const errorDetails = {
        message: error?.message || null,
        code: error?.code || null,
        details: error?.details || null,
        hint: error?.hint || null,
        name: error?.name || null
      };
      console.error("Error loading asset summary:", errorMessage, errorDetails);
      
      // Try to log full error if possible
      try {
        console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error("Error keys:", Object.keys(error || {}));
      }
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  if (loading) {
    return (
      <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-[rgb(var(--text-primary))] dark:text-white">Asset Overview</h2>
            <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))] dark:text-white/60 mt-1">Equipment and maintenance status</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400"></div>
          <span className="ml-3 text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))] dark:text-white/60">Loading asset data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[rgb(var(--text-primary))] dark:text-white">Asset Overview</h2>
          <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))] dark:text-white/60 mt-1">Equipment and maintenance status</p>
        </div>
        <Link 
          href="/dashboard/assets"
          className="text-sm text-pink-600 dark:text-pink-400 hover:text-pink-300 transition-colors"
        >
          View All Assets →
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Assets */}
        <div className="bg-[rgb(var(--surface))] dark:bg-[rgb(var(--surface))] dark:bg-white/[0.05] border border-[rgb(var(--border-hover))] dark:border-[rgb(var(--border-hover))] dark:border-white/[0.1] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))] dark:text-white/60">Total Assets</span>
          </div>
          <div className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{assetSummary.total}</div>
          <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-[rgb(var(--text-primary))] dark:text-white/40 mt-1">Registered equipment</div>
        </div>

        {/* Needing Service */}
        <div className={`bg-[rgb(var(--surface))] dark:bg-white/[0.05] border rounded-lg p-4 ${
          assetSummary.needingService > 0 
            ? 'border-yellow-500/40 bg-yellow-500/10' 
            : 'border-[rgb(var(--border-hover))] dark:border-white/[0.1]'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className={`w-4 h-4 ${
              assetSummary.needingService > 0 ? 'text-yellow-400' : 'text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))] dark:text-white/60'
            }`} />
            <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))] dark:text-white/60">Service Due</span>
          </div>
          <div className={`text-2xl font-bold ${
            assetSummary.needingService > 0 ? 'text-yellow-400' : 'text-[rgb(var(--text-primary))] dark:text-white'
          }`}>
            {assetSummary.needingService}
          </div>
          <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-[rgb(var(--text-primary))] dark:text-white/40 mt-1">Due within 30 days</div>
        </div>

        {/* Under Warranty */}
        <div className="bg-[rgb(var(--surface))] dark:bg-[rgb(var(--surface))] dark:bg-white/[0.05] border border-[rgb(var(--border-hover))] dark:border-[rgb(var(--border-hover))] dark:border-white/[0.1] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))] dark:text-white/60">Under Warranty</span>
          </div>
          <div className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{assetSummary.underWarranty}</div>
          <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-[rgb(var(--text-primary))] dark:text-white/40 mt-1">Warranty active</div>
        </div>

        {/* Service Booked */}
        <div className={`bg-[rgb(var(--surface))] dark:bg-white/[0.05] border rounded-lg p-4 ${
          assetSummary.serviceBooked > 0
            ? 'border-cyan-500/40 bg-cyan-500/10'
            : 'border-[rgb(var(--border-hover))] dark:border-white/[0.1]'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <CalendarCheck className={`w-4 h-4 ${
              assetSummary.serviceBooked > 0 ? 'text-cyan-400' : 'text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))] dark:text-white/60'
            }`} />
            <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))] dark:text-white/60">Service Booked</span>
          </div>
          <div className={`text-2xl font-bold ${
            assetSummary.serviceBooked > 0 ? 'text-cyan-400' : 'text-[rgb(var(--text-primary))] dark:text-white'
          }`}>
            {assetSummary.serviceBooked}
          </div>
          <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-[rgb(var(--text-primary))] dark:text-white/40 mt-1">Awaiting service</div>
        </div>

        {/* Overdue */}
        <div className={`bg-[rgb(var(--surface))] dark:bg-white/[0.05] border rounded-lg p-4 ${
          assetSummary.overdue > 0 
            ? 'border-red-500/40 bg-red-500/10' 
            : 'border-[rgb(var(--border-hover))] dark:border-white/[0.1]'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${
              assetSummary.overdue > 0 ? 'text-red-400' : 'text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))] dark:text-white/60'
            }`} />
            <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))] dark:text-white/60">Overdue</span>
          </div>
          <div className={`text-2xl font-bold ${
            assetSummary.overdue > 0 ? 'text-red-400' : 'text-[rgb(var(--text-primary))] dark:text-white'
          }`}>
            {assetSummary.overdue}
          </div>
          <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-[rgb(var(--text-primary))] dark:text-white/40 mt-1">Service overdue</div>
        </div>
      </div>

      {/* Empty State */}
      {assetSummary.total === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-[rgb(var(--surface))] dark:bg-white/[0.05] rounded-full flex items-center justify-center mb-4 mx-auto">
            <Package className="w-8 h-8 text-[rgb(var(--text-tertiary))] dark:text-[rgb(var(--text-primary))] dark:text-white/40" />
          </div>
          <h3 className="text-lg font-medium text-[rgb(var(--text-primary))] dark:text-white mb-2">No assets registered</h3>
          <p className="text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))] dark:text-white/60 text-sm mb-4">Add your first asset to get started with asset management.</p>
          <Link 
            href="/dashboard/assets"
            className="text-sm text-pink-600 dark:text-pink-400 hover:text-pink-300 inline-block"
          >
            Add Asset →
          </Link>
        </div>
      )}
    </div>
  );
}