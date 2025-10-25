"use client";

import React, { useState, useEffect } from "react";
import { Wrench, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

interface AssetSummary {
  total: number;
  needingService: number;
  underWarranty: number;
  overdue: number;
}

export default function AssetOverview() {
  const [assetSummary, setAssetSummary] = useState<AssetSummary>({
    total: 0,
    needingService: 0,
    underWarranty: 0,
    overdue: 0
  });
  const [loading, setLoading] = useState(true);
  const { companyId } = useAppContext();

  useEffect(() => {
    if (companyId) {
      loadAssetSummary();
    }
  }, [companyId]);

  const loadAssetSummary = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      // Get all assets for the company
      const { data: assets, error } = await supabase
        .from("assets")
        .select("id, next_service_date, warranty_end")
        .eq("company_id", companyId);

      if (error) throw error;

      const now = new Date();
      const summary: AssetSummary = {
        total: assets?.length || 0,
        needingService: 0,
        underWarranty: 0,
        overdue: 0
      };

      assets?.forEach(asset => {
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
    } catch (error) {
      console.error("Error loading asset summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wrench className="h-5 w-5 text-magenta-400" />
          <h2 className="text-lg font-semibold text-white">Asset Overview</h2>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-white/10 rounded w-full"></div>
          <div className="h-4 bg-white/10 rounded w-3/4"></div>
          <div className="h-4 bg-white/10 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Wrench className="h-5 w-5 text-magenta-400" />
        <h2 className="text-lg font-semibold text-white">Asset Overview</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-lg mb-2 mx-auto">
            <Wrench className="h-6 w-6 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{assetSummary.total}</div>
          <div className="text-xs text-gray-400">Total Assets</div>
        </div>

        {/* Needing Service */}
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-yellow-500/20 rounded-lg mb-2 mx-auto">
            <Clock className="h-6 w-6 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">{assetSummary.needingService}</div>
          <div className="text-xs text-gray-400">Service Due</div>
        </div>

        {/* Under Warranty */}
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-lg mb-2 mx-auto">
            <CheckCircle className="h-6 w-6 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">{assetSummary.underWarranty}</div>
          <div className="text-xs text-gray-400">Under Warranty</div>
        </div>

        {/* Overdue */}
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-red-500/20 rounded-lg mb-2 mx-auto">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-white">{assetSummary.overdue}</div>
          <div className="text-xs text-gray-400">Overdue</div>
        </div>
      </div>

      {assetSummary.total === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Wrench className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No assets registered</h3>
          <p className="text-gray-400 text-sm">Add your first asset to get started with asset management.</p>
        </div>
      )}
    </div>
  );
}