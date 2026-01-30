"use client";

import { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Download, 
  Printer,
  Package,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface TrayAssignment {
  tray_number: number;
  product_id: string;
  product_name: string;
  quantity: number;
  capacity: number;
  utilization: number;
  bake_duration?: number;
}

interface TrayPackingData {
  delivery_date: string;
  stream: string;
  total_trays: number;
  tray_assignments: TrayAssignment[];
}

interface TrayPackingViewProps {
  date: string;
  stream?: 'wholesale' | 'kiosk';
}

export default function TrayPackingView({ date, stream = 'wholesale' }: TrayPackingViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrayPackingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupedByProduct, setGroupedByProduct] = useState<Map<string, TrayAssignment[]>>(new Map());
  const [maxTrayNumber, setMaxTrayNumber] = useState(0);

  useEffect(() => {
    loadTrayPlan();
  }, [date, stream]);

  async function loadTrayPlan() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/stockly/production/trays?date=${date}&stream=${stream}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to load tray plan';
        
        // Handle specific error cases
        if (errorMessage.includes('No active supplier')) {
          setError('no_supplier');
          setData(null);
          return;
        }
        
        setError(errorMessage);
        setData(null);
        return;
      }

      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
        processTrayData(result.data);
        setError(null);
      } else {
        setData(null);
      }
    } catch (error) {
      console.error('Error loading tray plan:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function processTrayData(trayData: TrayPackingData) {
    // Group assignments by product
    const grouped = new Map<string, TrayAssignment[]>();
    let maxTray = 0;

    trayData.tray_assignments.forEach(assignment => {
      const productName = assignment.product_name;
      if (!grouped.has(productName)) {
        grouped.set(productName, []);
      }
      grouped.get(productName)!.push(assignment);
      maxTray = Math.max(maxTray, assignment.tray_number);
    });

    setGroupedByProduct(grouped);
    setMaxTrayNumber(maxTray);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  function getTrayAssignment(productName: string, trayNumber: number): TrayAssignment | null {
    const productAssignments = groupedByProduct.get(productName) || [];
    return productAssignments.find(a => a.tray_number === trayNumber) || null;
  }

  function getProductTotal(productName: string): number {
    const assignments = groupedByProduct.get(productName) || [];
    return assignments.reduce((sum, a) => sum + a.quantity, 0);
  }

  function getTrayUtilization(trayNumber: number): number {
    // Find the highest utilization for this tray number
    let maxUtil = 0;
    groupedByProduct.forEach(assignments => {
      const assignment = assignments.find(a => a.tray_number === trayNumber);
      if (assignment) {
        maxUtil = Math.max(maxUtil, assignment.utilization);
      }
    });
    return maxUtil;
  }

  function handleAutoPack() {
    // TODO: Implement auto-pack optimization
    loadTrayPlan();
  }

  function handlePrint() {
    window.print();
  }

  function handleExport() {
    if (!data) return;
    // TODO: Export to CSV
  }

  // Generate array of tray numbers
  const trayNumbers = Array.from({ length: maxTrayNumber }, (_, i) => i + 1);
  const products = Array.from(groupedByProduct.keys()).sort();

  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#EC4899] animate-spin" />
        </div>
      </div>
    );
  }

  if (error === 'no_supplier') {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Tray Packing - {stream.charAt(0).toUpperCase() + stream.slice(1)}
            </h2>
            <p className="text-white/50 text-sm mt-1">
              {formatDate(date)}
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-amber-400/60 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Supplier Setup Required</p>
          <p className="text-white/60 text-sm">
            No active supplier found for your company
          </p>
          <p className="text-white/40 text-sm mt-2">
            Please configure a supplier in Production Settings before using tray packing
          </p>
        </div>
      </div>
    );
  }

  if (!data || data.tray_assignments.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Tray Packing - {stream.charAt(0).toUpperCase() + stream.slice(1)}
            </h2>
            <p className="text-white/50 text-sm mt-1">
              {formatDate(date)}
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No tray assignments for this date</p>
          <p className="text-white/40 text-sm mt-2">
            Generate a production plan first to create tray assignments
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Tray Packing - {stream.charAt(0).toUpperCase() + stream.slice(1)}
          </h2>
          <p className="text-white/50 text-sm mt-1">
            {formatDate(date)} - {data.total_trays} trays
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoPack}
            className="px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Auto-Pack
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2 text-sm"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Tray Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="sticky left-0 z-10 bg-[#0B0D13] px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider border-r border-white/[0.06]">
                Product
              </th>
              {trayNumbers.map(trayNum => (
                <th
                  key={trayNum}
                  className="px-3 py-3 text-center text-xs font-medium text-white/60 uppercase tracking-wider min-w-[60px]"
                >
                  Tray {trayNum}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-white/60 uppercase tracking-wider border-l border-white/[0.06]">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {products.map((productName) => {
              const total = getProductTotal(productName);
              
              return (
                <tr key={productName} className="hover:bg-white/[0.02] transition-colors">
                  <td className="sticky left-0 z-10 bg-[#0B0D13] px-4 py-3 border-r border-white/[0.06]">
                    <div className="text-white font-medium">{productName}</div>
                  </td>
                  {trayNumbers.map(trayNum => {
                    const assignment = getTrayAssignment(productName, trayNum);
                    const utilization = assignment?.utilization || 0;
                    
                    return (
                      <td
                        key={trayNum}
                        className={`px-3 py-3 text-center text-sm border-r border-white/[0.03] ${
                          assignment 
                            ? utilization >= 90 
                              ? 'bg-green-500/10 text-green-400 font-medium' 
                              : utilization >= 70
                              ? 'text-white font-medium'
                              : 'text-white/60'
                            : 'text-white/10'
                        }`}
                      >
                        {assignment ? (
                          <div className="flex flex-col items-center">
                            <span>{assignment.quantity}</span>
                            {utilization >= 90 && (
                              <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-400" />
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-white font-bold border-l border-white/[0.06]">
                    {total}
                  </td>
                </tr>
              );
            })}
            
            {/* Totals Row */}
            <tr className="bg-white/[0.05] border-t-2 border-white/[0.1] font-semibold">
              <td className="sticky left-0 z-10 bg-white/[0.05] px-4 py-3 text-white font-bold border-r border-white/[0.06]">
                Utilization
              </td>
              {trayNumbers.map(trayNum => {
                const utilization = getTrayUtilization(trayNum);
                return (
                  <td
                    key={trayNum}
                    className={`px-3 py-3 text-center text-xs border-r border-white/[0.03] ${
                      utilization >= 90 
                        ? 'text-green-400' 
                        : utilization >= 70
                        ? 'text-amber-400'
                        : 'text-white/40'
                    }`}
                  >
                    {utilization > 0 ? `${Math.round(utilization)}%` : '-'}
                  </td>
                );
              })}
              <td className="px-4 py-3 border-l border-white/[0.06]"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-white/60 text-xs mb-1">Total Trays</p>
          <p className="text-white font-semibold">{data.total_trays}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-white/60 text-xs mb-1">Products</p>
          <p className="text-white font-semibold">{products.length}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-white/60 text-xs mb-1">Avg Utilization</p>
          <p className="text-white font-semibold">
            {data.tray_assignments.length > 0
              ? Math.round(
                  data.tray_assignments.reduce((sum, a) => sum + a.utilization, 0) /
                    data.tray_assignments.length
                )
              : 0}%
          </p>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-white/60 text-xs mb-1">Total Items</p>
          <p className="text-white font-semibold">
            {data.tray_assignments.reduce((sum, a) => sum + a.quantity, 0)}
          </p>
        </div>
      </div>
    </div>
  );
}

