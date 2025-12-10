"use client";

import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { 
  Receipt, 
  Plus,
  Upload,
  Calendar,
  Loader2,
  RefreshCw,
  ChevronRight,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface DailySummary {
  id: string;
  summary_date: string;
  gross_revenue: number;
  net_revenue: number;
  total_cost: number;
  gross_profit: number;
  gp_percentage: number;
  total_covers: number;
  transaction_count: number;
}

interface SalesImport {
  id: string;
  import_type: string;
  pos_provider: string | null;
  filename: string | null;
  date_from: string | null;
  date_to: string | null;
  records_imported: number;
  revenue_total: number;
  status: string;
  created_at: string;
}

export default function SalesManagementPage() {
  const { companyId, siteId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [recentImports, setRecentImports] = useState<SalesImport[]>([]);
  const [totals, setTotals] = useState({
    revenue: 0,
    cost: 0,
    profit: 0,
    gp: 0,
    transactions: 0,
    covers: 0
  });
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Manual entry form
  const [manualEntry, setManualEntry] = useState({
    sale_date: new Date().toISOString().split('T')[0],
    gross_revenue: '',
    discounts: '0',
    net_revenue: '',
    vat_amount: '',
    covers: '1',
    payment_method: 'card'
  });

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId, siteId]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadDailySummaries(), loadRecentImports()]);
    setLoading(false);
  }

  async function loadDailySummaries() {
    if (!companyId) return;
    
    try {
      // Get last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let query = supabase
        .from('daily_sales_summary')
        .select('*')
        .eq('company_id', companyId)
        .gte('summary_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('summary_date', { ascending: false });
      
      if (siteId) {
        query = query.eq('site_id', siteId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error loading daily summaries:', error);
        // Table might not exist yet, set empty data
        setDailySummaries([]);
        setTotals({
          revenue: 0,
          cost: 0,
          profit: 0,
          gp: 0,
          transactions: 0,
          covers: 0
        });
        return;
      }
      
      setDailySummaries(data || []);
      
      // Calculate totals
      const revenue = data?.reduce((sum, d) => sum + (d.net_revenue || 0), 0) || 0;
      const cost = data?.reduce((sum, d) => sum + (d.total_cost || 0), 0) || 0;
      const profit = revenue - cost;
      const transactions = data?.reduce((sum, d) => sum + (d.transaction_count || 0), 0) || 0;
      const covers = data?.reduce((sum, d) => sum + (d.total_covers || 0), 0) || 0;
      
      setTotals({
        revenue,
        cost,
        profit,
        gp: revenue > 0 ? (profit / revenue) * 100 : 0,
        transactions,
        covers
      });
      
    } catch (error) {
      console.error('Error loading daily summaries:', error);
      toast.error('Failed to load sales data');
    }
  }

  async function loadRecentImports() {
    if (!companyId) return;
    
    try {
      let query = supabase
        .from('sales_imports')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (siteId) {
        query = query.eq('site_id', siteId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error loading imports:', error);
        // Table might not exist yet, set empty data
        setRecentImports([]);
        return;
      }
      
      setRecentImports(data || []);
    } catch (error) {
      console.error('Error loading imports:', error);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !companyId) return;
    
    setImporting(true);
    
    try {
      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from('sales_imports')
        .insert({
          company_id: companyId,
          site_id: siteId || null,
          import_type: 'csv',
          filename: file.name,
          status: 'processing'
        })
        .select()
        .single();
      
      if (importError) {
        console.error('Error creating import record:', importError);
        throw importError;
      }

      // Read and parse CSV
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      let recordsImported = 0;
      let revenueTotal = 0;
      let dateFrom: string | null = null;
      let dateTo: string | null = null;
      
      // Process each line (skip header)
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });
        
        // Map common CSV fields
        const saleDate = row['date'] || row['sale_date'] || row['transaction_date'];
        const revenue = parseFloat(row['revenue'] || row['net_revenue'] || row['total'] || row['amount'] || '0');
        const grossRevenue = parseFloat(row['gross_revenue'] || row['gross'] || String(revenue));
        const covers = parseInt(row['covers'] || row['guests'] || row['pax'] || '1');
        const transactionId = row['transaction_id'] || row['id'] || row['receipt_no'];
        
        if (!saleDate || isNaN(revenue)) continue;
        
        // Track date range
        if (!dateFrom || saleDate < dateFrom) dateFrom = saleDate;
        if (!dateTo || saleDate > dateTo) dateTo = saleDate;
        
        // Insert sale
        const { error: saleError } = await supabase
          .from('sales')
          .insert({
            company_id: companyId,
            site_id: siteId || null,
            pos_transaction_id: transactionId || null,
            pos_provider: 'csv',
            sale_date: saleDate,
            gross_revenue: grossRevenue,
            net_revenue: revenue,
            total_amount: revenue,
            covers: covers,
            status: 'completed',
            import_batch_id: importRecord.id
          });
        
        if (!saleError) {
          recordsImported++;
          revenueTotal += revenue;
        }
      }
      
      // Update import record
      await supabase
        .from('sales_imports')
        .update({
          status: 'completed',
          records_total: lines.length - 1,
          records_imported: recordsImported,
          records_failed: (lines.length - 1) - recordsImported,
          revenue_total: revenueTotal,
          date_from: dateFrom,
          date_to: dateTo,
          completed_at: new Date().toISOString()
        })
        .eq('id', importRecord.id);
      
      // Recalculate daily summaries for affected dates
      if (dateFrom && dateTo) {
        try {
          const start = new Date(dateFrom);
          const end = new Date(dateTo);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            // Try RPC function if it exists, otherwise skip
            await supabase.rpc('recalculate_daily_summary', {
              p_company_id: companyId,
              p_site_id: siteId || null,
              p_date: dateStr
            }).catch(() => {
              // RPC might not exist, that's okay
            });
          }
        } catch (error) {
          console.log('RPC function not available, skipping recalculation');
        }
      }
      
      setShowImportModal(false);
      await loadData();
      toast.success(`Successfully imported ${recordsImported} sales records totalling ${formatCurrency(revenueTotal)}`);
      
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast.error('Failed to import CSV. Please check the file format.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleManualEntry() {
    if (!companyId) return;
    
    setSaving(true);
    try {
      const grossRevenue = parseFloat(manualEntry.gross_revenue) || 0;
      const discounts = parseFloat(manualEntry.discounts) || 0;
      const netRevenue = parseFloat(manualEntry.net_revenue) || grossRevenue - discounts;
      const vatAmount = parseFloat(manualEntry.vat_amount) || netRevenue * 0.2;
      const covers = parseInt(manualEntry.covers) || 1;
      
      const { error } = await supabase
        .from('sales')
        .insert({
          company_id: companyId,
          site_id: siteId || null,
          pos_provider: 'manual',
          sale_date: manualEntry.sale_date,
          gross_revenue: grossRevenue,
          discounts: discounts,
          net_revenue: netRevenue,
          vat_amount: vatAmount,
          total_amount: netRevenue + vatAmount,
          covers: covers,
          payment_method: manualEntry.payment_method,
          status: 'completed'
        });
      
      if (error) throw error;
      
      // Recalculate daily summary
      try {
        await supabase.rpc('recalculate_daily_summary', {
          p_company_id: companyId,
          p_site_id: siteId || null,
          p_date: manualEntry.sale_date
        }).catch(() => {
          // RPC might not exist, that's okay
        });
      } catch (error) {
        console.log('RPC function not available');
      }
      
      setShowManualModal(false);
      setManualEntry({
        sale_date: new Date().toISOString().split('T')[0],
        gross_revenue: '',
        discounts: '0',
        net_revenue: '',
        vat_amount: '',
        covers: '1',
        payment_method: 'card'
      });
      await loadData();
      toast.success('Sales entry added successfully');
      
    } catch (error) {
      console.error('Error saving manual entry:', error);
      toast.error('Failed to save sales entry');
    } finally {
      setSaving(false);
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const getGpColor = (gp: number) => {
    if (gp >= 70) return 'text-green-400';
    if (gp >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#EC4899] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/stockly"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Sales Data</h1>
            <p className="text-white/60 text-sm mt-1">Import POS data or enter sales manually</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <Upload className="w-5 h-5" />
            Import CSV
          </button>
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#EC4899] hover:bg-[#EC4899]/90 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Sale
          </button>
        </div>
      </div>

      {/* 30-Day Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-white/60 text-xs">Revenue</span>
          </div>
          <p className="text-xl font-bold text-white">{formatCurrency(totals.revenue)}</p>
        </div>
        
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4 text-red-400" />
            <span className="text-white/60 text-xs">COGS</span>
          </div>
          <p className="text-xl font-bold text-white">{formatCurrency(totals.cost)}</p>
        </div>
        
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-white/60 text-xs">Gross Profit</span>
          </div>
          <p className="text-xl font-bold text-white">{formatCurrency(totals.profit)}</p>
        </div>
        
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#EC4899]" />
            <span className="text-white/60 text-xs">GP %</span>
          </div>
          <p className={`text-xl font-bold ${getGpColor(totals.gp)}`}>{totals.gp.toFixed(1)}%</p>
        </div>
        
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4 text-purple-400" />
            <span className="text-white/60 text-xs">Transactions</span>
          </div>
          <p className="text-xl font-bold text-white">{totals.transactions.toLocaleString()}</p>
        </div>
        
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-white/60 text-xs">Covers</span>
          </div>
          <p className="text-xl font-bold text-white">{totals.covers.toLocaleString()}</p>
        </div>
      </div>

      {/* Quick Link to GP Report */}
      <Link
        href="/dashboard/stockly/reports/gp"
        className="flex items-center justify-between p-4 bg-gradient-to-r from-[#EC4899]/10 to-purple-500/10 border border-[#EC4899]/30 rounded-xl hover:border-[#EC4899]/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#EC4899]/20 rounded-lg">
            <TrendingUp className="w-6 h-6 text-[#EC4899]" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Gross Profit Report</h3>
            <p className="text-white/60 text-sm">View detailed GP analysis, trends, and category breakdown</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/40" />
      </Link>

      {/* Daily Sales Table */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white">Daily Sales (Last 30 Days)</h2>
        </div>
        
        {dailySummaries.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No sales data yet</h3>
            <p className="text-white/60 mb-4">Import from your POS or add sales manually</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </button>
              <button
                onClick={() => setShowManualModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#EC4899] hover:bg-[#EC4899]/90 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Sale
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Date</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/60">Revenue</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/60">COGS</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/60">GP</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/60">GP %</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/60">Covers</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-white/60">Avg/Cover</th>
                </tr>
              </thead>
              <tbody>
                {dailySummaries.map((day) => (
                  <tr key={day.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white font-medium">
                      {formatDate(day.summary_date)}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {formatCurrency(day.net_revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-white/70">
                      {formatCurrency(day.total_cost)}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {formatCurrency(day.gross_profit)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${getGpColor(day.gp_percentage)}`}>
                        {day.gp_percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white/70">
                      {day.total_covers}
                    </td>
                    <td className="px-4 py-3 text-right text-white/70">
                      {day.total_covers > 0 ? formatCurrency(day.net_revenue / day.total_covers) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Imports */}
      {recentImports.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-lg font-semibold text-white">Recent Imports</h2>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {recentImports.map((imp) => (
              <div key={imp.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    imp.status === 'completed' ? 'bg-green-500/10' :
                    imp.status === 'failed' ? 'bg-red-500/10' : 'bg-yellow-500/10'
                  }`}>
                    {imp.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : imp.status === 'failed' ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{imp.filename || 'Manual Import'}</p>
                    <p className="text-white/60 text-sm">
                      {imp.records_imported} records • {formatCurrency(imp.revenue_total)}
                    </p>
                  </div>
                </div>
                <span className="text-white/40 text-sm">
                  {new Date(imp.created_at).toLocaleDateString('en-GB')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Import Sales Data</h2>
              <p className="text-white/60 text-sm mt-1">Upload a CSV file from your POS system</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-white/5 border border-dashed border-white/20 rounded-xl p-8 text-center">
                <FileSpreadsheet className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/80 mb-2">Drop your CSV file here or click to browse</p>
                <p className="text-white/40 text-sm mb-4">
                  Expected columns: date, revenue (or total), covers (optional)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#EC4899] hover:bg-[#EC4899]/90 text-white rounded-lg cursor-pointer transition-colors"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Select File
                    </>
                  )}
                </label>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-400">
                    <p className="font-medium">CSV Format</p>
                    <p className="text-blue-400/80">
                      Your CSV should include: date, revenue/total, and optionally covers/guests
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-white/10">
              <button
                onClick={() => setShowImportModal(false)}
                className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Add Sales Entry</h2>
              <p className="text-white/60 text-sm mt-1">Manually enter daily sales data</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Date</label>
                <input
                  type="date"
                  value={manualEntry.sale_date}
                  onChange={(e) => setManualEntry({ ...manualEntry, sale_date: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#EC4899]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Gross Revenue</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">£</span>
                    <input
                      type="number"
                      step="0.01"
                      value={manualEntry.gross_revenue}
                      onChange={(e) => setManualEntry({ ...manualEntry, gross_revenue: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#EC4899]"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Discounts</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">£</span>
                    <input
                      type="number"
                      step="0.01"
                      value={manualEntry.discounts}
                      onChange={(e) => setManualEntry({ ...manualEntry, discounts: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#EC4899]"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Covers</label>
                  <input
                    type="number"
                    value={manualEntry.covers}
                    onChange={(e) => setManualEntry({ ...manualEntry, covers: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#EC4899]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Payment</label>
                  <select
                    value={manualEntry.payment_method}
                    onChange={(e) => setManualEntry({ ...manualEntry, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#EC4899]"
                  >
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-white/10 flex gap-3">
              <button
                onClick={() => setShowManualModal(false)}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleManualEntry}
                disabled={saving || !manualEntry.gross_revenue}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#EC4899] hover:bg-[#EC4899]/90 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Sale
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
