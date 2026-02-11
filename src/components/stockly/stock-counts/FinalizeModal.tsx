'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { StockCountWithDetails } from '@/lib/types/stockly';
import { Loader2, CheckCircle, AlertTriangle } from '@/components/ui/icons';

interface FinalizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: StockCountWithDetails;
  onSuccess: () => void;
}

export default function FinalizeModal({
  isOpen,
  onClose,
  count,
  onSuccess,
}: FinalizeModalProps) {
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinalize = async () => {
    setFinalizing(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if count is approved
      if (count.status !== 'approved') {
        throw new Error('Stock count must be approved before finalization. Please wait for approval or mark it ready for approval first.');
      }

      // Call the database function to process the approved count
      // This function handles stock level updates and movement records
      const { error: processError } = await supabase.rpc(
        'process_approved_stock_count',
        { p_count_id: count.id }
      );

      if (processError) {
        throw new Error(`Failed to process approved count: ${processError.message}`);
      }

      // Update stock count status to finalized
      const { error: countError } = await supabase
        .from('stock_counts')
        .update({
          status: 'finalized',
          finalized_at: new Date().toISOString(),
          finalized_by: user.id,
        })
        .eq('id', count.id);

      if (countError) throw countError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error finalizing count:', err);
      setError(err.message || 'Failed to finalize count');
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-[#0B0D13] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Finalize Stock Count?
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            This will adjust your inventory levels
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Approval status check */}
          {count.status !== 'approved' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-700 dark:text-red-400 mb-1">Approval Required</h4>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    This stock count must be approved before it can be finalized. 
                    {count.status === 'ready_for_approval' 
                      ? ' The approver has been notified and will review it shortly.'
                      : count.status === 'completed'
                      ? ' Please mark it ready for approval first.'
                      : ' Please wait for approval.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {count.status === 'approved' && (
            <div className="bg-emerald-50 dark:bg-emerald-600/10 border border-emerald-200 dark:border-emerald-600/30 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">What will happen:</h4>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                  <span>All stock levels will be updated to match counted quantities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                  <span>Variance records will be saved for reporting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                  <span>Stock adjustment transactions will be created</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                  <span>Count status will change to "Finalized"</span>
                </li>
              </ul>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-600/10 border border-amber-200 dark:border-amber-600/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-1">Important</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  After finalization, you can still lock the count to make it permanent. 
                  Review the variance report carefully before proceeding.
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 dark:bg-white/[0.03] rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Items to adjust:</span>
              <span className="text-gray-900 dark:text-white font-medium">{count.items_counted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Items with variance:</span>
              <span className="text-gray-900 dark:text-white font-medium">{count.variance_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total variance value:</span>
              <span className={`font-medium ${
                count.total_variance_value < 0 ? 'text-red-600 dark:text-red-400' : 
                count.total_variance_value > 0 ? 'text-emerald-600 dark:text-green-400' : 'text-gray-900 dark:text-white'
              }`}>
                {count.total_variance_value < 0 ? '-' : count.total_variance_value > 0 ? '+' : ''}
                £{Math.abs(count.total_variance_value).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={finalizing}
              className="border-gray-300 dark:border-white/[0.06] text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={finalizing || count.status !== 'approved'}
              className="bg-emerald-600 hover:bg-emerald-700 min-w-[180px] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {finalizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Finalize & Adjust Stock
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
