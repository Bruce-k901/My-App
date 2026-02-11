/**
 * Sync Status Dashboard
 * Shows pending writes, failed writes, and sync controls
 */

'use client';

import { useState, useEffect } from 'react';
import {
  CloudOff,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Clock,
  WifiOff
} from '@/components/ui/icons';
import {
  getAllPendingWrites,
  getFailedWrites,
  retryWrite,
  deletePendingWrite,
  getStorageStats,
  clearAllOfflineData
} from '@/lib/offline/db';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { PendingWrite } from '@/lib/offline/db';
import { toast } from 'sonner';

export default function SyncStatusPage() {
  const { isOnline, triggerManualSync } = useOnlineStatus();
  const [pendingWrites, setPendingWrites] = useState<PendingWrite[]>([]);
  const [failedWrites, setFailedWrites] = useState<PendingWrite[]>([]);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadData();

    // Refresh every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [pending, failed, stats] = await Promise.all([
        getAllPendingWrites(),
        getFailedWrites(),
        getStorageStats()
      ]);

      setPendingWrites(pending);
      setFailedWrites(failed);
      setStorageStats(stats);
    } catch (error) {
      console.error('[Sync Status] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSync() {
    setSyncing(true);
    try {
      await triggerManualSync();
      toast.success('Sync triggered');
      await loadData();
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function handleRetry(writeId: string) {
    try {
      await retryWrite(writeId);
      toast.success('Queued for retry');
      await loadData();
    } catch (error) {
      toast.error('Failed to queue retry');
    }
  }

  async function handleDelete(writeId: string) {
    if (!confirm('Are you sure you want to discard this change? This cannot be undone.')) {
      return;
    }

    try {
      await deletePendingWrite(writeId);
      toast.success('Change discarded');
      await loadData();
    } catch (error) {
      toast.error('Failed to discard change');
    }
  }

  async function handleClearAll() {
    if (!confirm('Clear ALL offline data? This will remove all pending and failed changes. This cannot be undone.')) {
      return;
    }

    try {
      await clearAllOfflineData();
      toast.success('All offline data cleared');
      await loadData();
    } catch (error) {
      toast.error('Failed to clear data');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Offline Sync Status
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Manage your offline changes and sync status
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-full text-sm font-medium">
              <WifiOff className="w-4 h-4" />
              Offline
            </div>
          )}

          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Storage Stats */}
      {storageStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase mb-1">
              Cached Reads
            </div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {storageStats.cachedReadsCount}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <div className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase mb-1">
              Pending Writes
            </div>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {storageStats.pendingWritesCount}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
            <div className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase mb-1">
              Queued Files
            </div>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {storageStats.queuedFilesCount}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase mb-1">
              Storage Used
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {(storageStats.usage / 1024 / 1024).toFixed(1)} MB
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              of {(storageStats.quota / 1024 / 1024).toFixed(0)} MB ({storageStats.usagePercent.toFixed(1)}%)
            </div>
          </div>
        </div>
      )}

      {/* Pending Writes */}
      {pendingWrites.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Pending Changes ({pendingWrites.length})
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              These changes will sync automatically when you're online
            </p>
          </div>

          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {pendingWrites.map((write) => (
              <div key={write.id} className="px-6 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-white">
                      {write.operation.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                      {new Date(write.timestamp).toLocaleString()}
                    </div>
                    {write.retries > 0 && (
                      <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        Retried {write.retries} time{write.retries > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(write.id)}
                    className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Discard change"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed Writes */}
      {failedWrites.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-red-200 dark:border-red-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Failed Syncs ({failedWrites.length})
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              These changes failed to sync after {5} attempts
            </p>
          </div>

          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {failedWrites.map((write) => (
              <div key={write.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-neutral-900 dark:text-white">
                      {write.operation.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                      {new Date(write.timestamp).toLocaleString()}
                    </div>
                    {write.error && (
                      <div className="text-sm text-red-600 dark:text-red-400 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        {write.error}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleRetry(write.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                    <button
                      onClick={() => handleDelete(write.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {pendingWrites.length === 0 && failedWrites.length === 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            All Synced Up!
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400">
            No pending or failed changes. All your data is up to date.
          </p>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
          Danger Zone
        </h3>
        <p className="text-sm text-red-700 dark:text-red-300 mb-4">
          Clear all offline data including pending writes, failed writes, and cached reads.
          This cannot be undone.
        </p>
        <button
          onClick={handleClearAll}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          Clear All Offline Data
        </button>
      </div>
    </div>
  );
}
