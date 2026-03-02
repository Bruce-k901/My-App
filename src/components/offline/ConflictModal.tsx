/**
 * Conflict Modal
 * Shown for version conflicts requiring user decision
 * (Only shown for ~5% of conflicts)
 */

'use client';

import { useState } from 'react';
import { X, AlertTriangle } from '@/components/ui/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { deletePendingWrite, updatePendingWrite } from '@/lib/offline/db';
import { toast } from 'sonner';

export interface ConflictData {
  writeId: string;
  operation: string;
  itemName: string;
  yourValue: any;
  theirValue: any;
  yourTime: string;
  theirTime: string;
  updatedBy: string;
}

interface ConflictModalProps {
  isOpen: boolean;
  conflict: ConflictData | null;
  onClose: () => void;
  onResolved: () => void;
}

export function ConflictModal({ isOpen, conflict, onClose, onResolved }: ConflictModalProps) {
  const [showManual, setShowManual] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  if (!conflict) return null;

  async function resolve(choice: 'keep_theirs' | 'keep_mine' | 'manual', customValue?: any) {
    setIsResolving(true);

    try {
      if (choice === 'keep_theirs') {
        // Discard local changes, accept server version
        await deletePendingWrite(conflict.writeId);
        toast.success('Conflict resolved', {
          description: `Using ${conflict.updatedBy}'s value: ${conflict.theirValue}`
        });
      } else if (choice === 'keep_mine') {
        // Keep local changes, will retry sync
        toast.success('Conflict resolved', {
          description: 'Your value will be synced when connection is stable'
        });
      } else if (choice === 'manual') {
        // Update with manual value
        await updatePendingWrite(conflict.writeId, {
          payload: {
            ...conflict,
            value: customValue || manualValue
          }
        });
        toast.success('Conflict resolved', {
          description: `Using manual value: ${customValue || manualValue}`
        });
      }

      onResolved();
      onClose();
    } catch (error) {
      console.error('[Conflict Modal] Resolution error:', error);
      toast.error('Failed to resolve conflict');
    } finally {
      setIsResolving(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-theme-surface rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-theme-primary">
                    Sync Conflict
                  </h2>
                  <p className="text-sm text-theme-secondary">
                    {conflict.operation.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-theme-tertiary hover:text-theme-secondary dark:hover:text-neutral-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <p className="text-theme-secondary">
                The item <strong>"{conflict.itemName}"</strong> was updated by{' '}
                <strong>{conflict.updatedBy}</strong> while you were offline.
              </p>

              {/* Value Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase mb-2">
                    Your Value
                  </div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {conflict.yourValue}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Counted at {new Date(conflict.yourTime).toLocaleTimeString()}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-xs font-medium text-module-fg uppercase mb-2">
                    {conflict.updatedBy}'s Value
                  </div>
                  <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                    {conflict.theirValue}
                  </div>
                  <div className="text-xs text-module-fg mt-2">
                    Counted at {new Date(conflict.theirTime).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Manual Entry */}
              {showManual && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-theme"
                >
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Enter Manual Value
                  </label>
                  <input
                    type="number"
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-theme-surface text-theme-primary"
                    placeholder="Enter value..."
                    autoFocus
                  />
                </motion.div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200 dark:border-neutral-800">
              {showManual ? (
                <>
                  <button
                    onClick={() => setShowManual(false)}
                    className="px-4 py-2 text-sm font-medium text-theme-secondary hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    disabled={isResolving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => resolve('manual')}
                    disabled={!manualValue || isResolving}
                    className="px-4 py-2 text-sm font-medium bg-module-fg hover:bg-module-fg/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResolving ? 'Resolving...' : 'Use Manual Value'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => resolve('keep_theirs')}
                    disabled={isResolving}
                    className="px-4 py-2 text-sm font-medium text-theme-secondary hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    Use {conflict.updatedBy}'s ({conflict.theirValue})
                  </button>
                  <button
                    onClick={() => resolve('keep_mine')}
                    disabled={isResolving}
                    className="px-4 py-2 text-sm font-medium bg-module-fg hover:bg-module-fg/90 text-white rounded-lg transition-colors"
                  >
                    Use Mine ({conflict.yourValue})
                  </button>
                  <button
                    onClick={() => setShowManual(true)}
                    disabled={isResolving}
                    className="px-4 py-2 text-sm font-medium bg-module-fg hover:bg-module-fg/90 text-white rounded-lg transition-colors"
                  >
                    Enter Manual Count
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
