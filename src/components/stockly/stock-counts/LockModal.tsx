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
import { Loader2, Lock, AlertTriangle } from '@/components/ui/icons';

interface LockModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: StockCountWithDetails;
  onSuccess: () => void;
}

export default function LockModal({
  isOpen,
  onClose,
  count,
  onSuccess,
}: LockModalProps) {
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLock = async () => {
    setLocking(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update stock count status to locked
      const { error: countError } = await supabase
        .from('stock_counts')
        .update({
          status: 'locked',
          locked_at: new Date().toISOString(),
          locked_by: user.id,
        })
        .eq('id', count.id);

      if (countError) throw countError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error locking count:', err);
      setError(err.message || 'Failed to lock count');
    } finally {
      setLocking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-[#0B0D13] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Lock Stock Count?
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Make this count a permanent record
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="bg-blue-50 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-600/30 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">What happens when locked:</h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>Count becomes a permanent historical record</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>No further edits or changes can be made</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>Count cannot be reopened or deleted</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>Reports and exports remain available</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-600/10 border border-amber-200 dark:border-amber-600/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-1">Warning</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  This action cannot be undone. Make sure you have reviewed the variance 
                  report and are satisfied with the stock adjustments before locking.
                </p>
              </div>
            </div>
          </div>

          {/* Count Summary */}
          <div className="bg-gray-50 dark:bg-white/[0.03] rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Count:</span>
              <span className="text-gray-900 dark:text-white font-medium">{count.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Date:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {new Date(count.count_date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Items counted:</span>
              <span className="text-gray-900 dark:text-white font-medium">{count.items_counted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Finalized:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {count.finalized_at 
                  ? new Date(count.finalized_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'N/A'
                }
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
              disabled={locking}
              className="border-gray-300 dark:border-white/[0.06] text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLock}
              disabled={locking}
              className="bg-blue-600 hover:bg-blue-700 min-w-[140px] text-white"
            >
              {locking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Locking...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Lock Count
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
