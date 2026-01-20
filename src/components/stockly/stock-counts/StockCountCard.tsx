'use client';

import { useState } from 'react';
import { StockCount } from '@/lib/types/stockly';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, 
  FileText, 
  Lock, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface StockCountCardProps {
  count: StockCount;
  onUpdate: () => void;
}

export default function StockCountCard({ count, onUpdate }: StockCountCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const getStatusBadge = () => {
    switch (count.status) {
      case 'draft':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-600/20 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600/40 text-sm">
            <FileText className="h-3 w-3 mr-1" />
            Draft
          </span>
        );
      case 'active':
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-600/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-600/40 text-sm">
            <AlertCircle className="h-3 w-3 mr-1" />
            In Progress
          </span>
        );
      case 'pending_review':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-600/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-600/40 text-sm">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-50 dark:bg-red-600/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-600/40 text-sm">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-600/40 text-sm">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </span>
        );
      case 'finalized':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-600/40 text-sm">
            <CheckCircle className="h-3 w-3 mr-1" />
            Finalized
          </span>
        );
      case 'locked':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-600/40 text-sm">
            <Lock className="h-3 w-3 mr-1" />
            Locked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-600/20 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600/40 text-sm">
            {count.status}
          </span>
        );
    }
  };

  const getProgressPercentage = () => {
    if (count.total_items === 0) return 0;
    return Math.round((count.items_counted / count.total_items) * 100);
  };

  const handleClick = () => {
    router.push(`/dashboard/stockly/stock-counts/${count.id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (!confirm(`Are you sure you want to delete "${count.name}"? This action cannot be undone.`)) {
      return;
    }

    if (count.status === 'locked') {
      toast.error('Cannot delete a locked count');
      return;
    }

    setDeleting(true);
    
    try {
      // Delete items first (should cascade, but being explicit)
      const { error: itemsError } = await supabase
        .from('stock_count_items')
        .delete()
        .eq('stock_count_id', count.id);

      if (itemsError) throw itemsError;

      // Delete the count
      const { error: countError } = await supabase
        .from('stock_counts')
        .delete()
        .eq('id', count.id);

      if (countError) throw countError;

      toast.success('Stock count deleted successfully');
      onUpdate();
    } catch (error: any) {
      console.error('Error deleting stock count:', error);
      toast.error(error.message || 'Failed to delete stock count');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6 hover:border-emerald-600 dark:hover:border-emerald-500/50 transition-all duration-200 cursor-pointer"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Left side - main info */}
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {count.name}
              </h3>
              {getStatusBadge()}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-white/60">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-500 dark:text-white/40" />
              {new Date(count.count_date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </div>
            
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-2 text-gray-500 dark:text-white/40" />
              {count.total_items > 0 
                ? `${count.items_counted || 0}/${count.total_items} items`
                : 'No items'}
            </div>
            
            {count.variance_count > 0 && count.status !== 'draft' && (
              <div className="flex items-center text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 mr-2" />
                {count.variance_count} variances
              </div>
            )}
            
            {count.status !== 'draft' && (
              <div className={`flex items-center font-medium ${
                !count.total_variance_value || isNaN(count.total_variance_value)
                  ? 'text-gray-600 dark:text-gray-400'
                  : count.total_variance_value < 0 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {!count.total_variance_value || isNaN(count.total_variance_value)
                  ? '£0.00'
                  : `${count.total_variance_value < 0 ? '-' : '+'}£${Math.abs(count.total_variance_value || 0).toFixed(2)}`}
              </div>
            )}
          </div>
          
          {/* Progress bar for active counts */}
          {count.status === 'active' && count.total_items > 0 && (
            <div className="mt-4">
              <div className="flex justify-between items-center text-sm text-gray-600 dark:text-white/60 mb-2">
                <span>Progress</span>
                <span>{getProgressPercentage()}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-emerald-600 dark:bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Right side - action buttons */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {count.status !== 'locked' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-gray-600 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-600/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleClick}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-600/10"
          >
            View Details
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

