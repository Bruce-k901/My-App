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
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

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

      // Get all counted items
      const { data: countedItems, error: itemsError } = await supabase
        .from('stock_count_items')
        .select('*')
        .eq('stock_count_id', count.id)
        .eq('status', 'counted');

      if (itemsError) throw itemsError;

      if (!countedItems || countedItems.length === 0) {
        throw new Error('No counted items to finalize');
      }

      // Update stock levels based on library type
      for (const item of countedItems) {
        if (!item.counted_quantity) continue;

        let updateError = null;

        // Update based on library_type
        switch (item.library_type) {
          case 'ingredients':
            const { error: ingError } = await supabase
              .from('ingredients_library')
              .update({ 
                current_stock_level: item.counted_quantity 
              })
              .eq('id', item.ingredient_id);
            if (ingError) {
              console.error('Error updating ingredient:', ingError);
              updateError = ingError;
            }
            break;

          case 'packaging':
            const { error: packError } = await supabase
              .from('packaging_library')
              .update({ 
                current_stock_level: item.counted_quantity 
              })
              .eq('id', item.ingredient_id);
            if (packError) {
              console.error('Error updating packaging:', packError);
              updateError = packError;
            }
            break;

          case 'foh':
            const { error: fohError } = await supabase
              .from('disposables_library')
              .update({ 
                current_stock_level: item.counted_quantity 
              })
              .eq('id', item.ingredient_id);
            if (fohError) {
              console.error('Error updating FOH item:', fohError);
              updateError = fohError;
            }
            break;

          default:
            console.warn('Unknown library type:', item.library_type);
        }

        if (updateError) {
          throw new Error(`Failed to update stock levels for ${item.library_type}`);
        }
      }

      // Update stock count status
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
          <div className="bg-emerald-50 dark:bg-emerald-600/10 border border-emerald-200 dark:border-emerald-600/30 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">What will happen:</h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                <span>All ingredient stock levels will be updated to match counted quantities</span>
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
              disabled={finalizing}
              className="bg-emerald-600 hover:bg-emerald-700 min-w-[180px] text-white"
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
