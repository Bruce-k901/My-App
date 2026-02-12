'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Plus, Loader2, Calendar, FileText, Lock, CheckCircle, Package, ArrowLeft } from '@/components/ui/icons';
import StockCountCard from '@/components/stockly/stock-counts/StockCountCard';
import CreateCountModal from '@/components/stockly/stock-counts/CreateCountModal';
import { StockCount } from '@/lib/types/stockly';
import { useAppContext } from '@/context/AppContext';
import Link from 'next/link';

export default function StockCountsPage() {
  console.log('[StockCountsPage] Component rendering');
  
  const { companyId } = useAppContext();
  console.log('[StockCountsPage] companyId:', companyId);
  
  const [counts, setCounts] = useState<StockCount[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'finalized'>('all');

  const fetchStockCounts = useCallback(async () => {
    console.log('[StockCountsPage] fetchStockCounts called', { companyId, filter });
    
    try {
      if (!companyId) {
        console.log('[StockCountsPage] No companyId, returning early');
        return;
      }
      
      setLoading(true);
      console.log('[StockCountsPage] Building query...');
      
      let query = supabase
        .from('stock_counts')
        .select('*')
        .eq('company_id', companyId)
        .order('count_date', { ascending: false })
        .order('created_at', { ascending: false });
      
      console.log('[StockCountsPage] Base query built, applying filter:', filter);
      
      if (filter === 'active') {
        query = query.in('status', ['draft', 'active']);
      } else if (filter === 'finalized') {
        query = query.in('status', ['finalized', 'locked']);
      }
      
      console.log('[StockCountsPage] Executing query...');
      const { data, error } = await query;
      console.log('[StockCountsPage] Query result:', { dataCount: data?.length, error });

      if (error) {
        console.error('[StockCountsPage] Error fetching stock counts:', error);
      } else {
        console.log('[StockCountsPage] Setting counts:', data?.length || 0);
        setCounts(data || []);
      }
      
      setLoading(false);
      console.log('[StockCountsPage] fetchStockCounts completed');
    } catch (err) {
      console.error('[StockCountsPage] Exception in fetchStockCounts:', err);
      setLoading(false);
    }
  }, [companyId, filter]);

  useEffect(() => {
    console.log('[StockCountsPage] useEffect triggered', { companyId, hasFetchStockCounts: !!fetchStockCounts });
    
    // Only fetch if companyId is available
    if (!companyId) {
      console.log('[StockCountsPage] No companyId in useEffect, skipping fetch');
      setLoading(false); // Set loading to false if no companyId
      return;
    }
    
    try {
      console.log('[StockCountsPage] Calling fetchStockCounts from useEffect');
      fetchStockCounts();
    } catch (err) {
      console.error('[StockCountsPage] Exception in useEffect:', err);
      setLoading(false);
    }
     
  }, [companyId, filter]); // Only depend on companyId and filter, not fetchStockCounts

  const stats = useMemo(() => {
    const inProgress = counts.filter(c => 
      ['active', 'in_progress', 'draft'].includes(c.status)
    ).length;
    const pending = counts.filter(c => c.status === 'pending_review').length;
    
    // Find most recent completed count
    const completedCounts = counts.filter(c => 
      ['finalized', 'locked', 'completed', 'approved'].includes(c.status)
    ).sort((a, b) => {
      const dateA = a.completed_at || a.count_date || '';
      const dateB = b.completed_at || b.count_date || '';
      return dateB.localeCompare(dateA);
    });
    
    return { 
      inProgress, 
      pending, 
      lastCountDate: completedCounts.length > 0 
        ? completedCounts[0].count_date 
        : null 
    };
  }, [counts]);

  return (
    <div className="w-full bg-theme-surface-elevated min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/stockly"
 className="p-2 rounded-lg bg-theme-surface ] hover:bg-theme-muted text-theme-secondary hover:text-theme-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-theme-primary mb-2 flex items-center gap-3">
                <Package className="w-8 h-8 text-module-fg" />
                Stock Counts
              </h1>
              <p className="text-sm text-theme-secondary">
                Compare system inventory vs actual stock on shelves
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow transition-all duration-200 ease-in-out"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Count
          </Button>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-theme-surface border border-theme rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-secondary text-sm">In Progress</p>
              <p className="text-3xl font-bold text-theme-primary mt-1">{stats.inProgress}</p>
            </div>
            <FileText className="h-8 w-8 text-module-fg" />
          </div>
        </div>
        
        <div className="bg-theme-surface border border-theme rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-secondary text-sm">Pending Review</p>
              <p className="text-3xl font-bold text-theme-primary mt-1">{stats.pending}</p>
            </div>
            <Calendar className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        
        <div className="bg-theme-surface border border-theme rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-secondary text-sm">Last Count</p>
              <p className="text-xl font-bold text-theme-primary mt-1">
                {stats.lastCountDate
                  ? new Date(stats.lastCountDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                  : 'Never'}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-theme-secondary" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-module-fg hover:bg-module-fg/90 text-white' : 'border-theme text-theme-secondary hover:bg-theme-hover'}
        >
          All Statuses
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          onClick={() => setFilter('active')}
          className={filter === 'active' ? 'bg-module-fg hover:bg-module-fg/90 text-white' : 'border-theme text-theme-secondary hover:bg-theme-hover'}
        >
          Active
        </Button>
        <Button
          variant={filter === 'finalized' ? 'default' : 'outline'}
          onClick={() => setFilter('finalized')}
          className={filter === 'finalized' ? 'bg-module-fg hover:bg-module-fg/90 text-white' : 'border-theme text-theme-secondary hover:bg-theme-hover'}
        >
          Completed
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-module-fg" />
        </div>
      ) : counts.length === 0 ? (
        <div className="text-center py-12 bg-theme-surface border border-theme rounded-xl">
          <div className="max-w-md mx-auto">
            <FileText className="h-16 w-16 text-theme-disabled mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-theme-primary mb-2">
              No stock counts yet
            </h3>
            <p className="text-theme-secondary mb-6">
              Get started by creating your first stock count
            </p>
            <Button 
              onClick={() => setIsCreateModalOpen(true)} 
              className="bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow transition-all duration-200 ease-in-out"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Count
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {counts.map((count) => (
            <StockCountCard
              key={count.id}
              count={count}
              onUpdate={fetchStockCounts}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateCountModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchStockCounts}
      />
      </div>
    </div>
  );
}
