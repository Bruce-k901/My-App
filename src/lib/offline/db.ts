/**
 * Offline IndexedDB Layer
 * Handles cached reads, pending writes, and queued files for offline support
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import pako from 'pako';

// TypeScript interfaces
export interface CachedRead {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
  module: string;
  sizeBytes?: number;
  compressed?: boolean;
}

export interface PendingWrite {
  id: string;
  operation: string;
  endpoint: string;
  payload: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
  module: string;
}

export interface QueuedFile {
  writeId: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

// IndexedDB Schema
interface OfflineDB extends DBSchema {
  cachedReads: {
    key: string;
    value: CachedRead;
    indexes: { 'by_timestamp': number; 'by_module': string };
  };
  pendingWrites: {
    key: string;
    value: PendingWrite;
    indexes: { 'by_timestamp': number; 'by_status': string };
  };
  queuedFiles: {
    key: string;
    value: QueuedFile;
  };
}

// Database instance (singleton)
let dbInstance: IDBPDatabase<OfflineDB> | null = null;

/**
 * Get or create the offline database instance
 */
export async function getOfflineDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDB>('opsly-offline', 1, {
    upgrade(db) {
      // Create cachedReads store
      if (!db.objectStoreNames.contains('cachedReads')) {
        const cachedReads = db.createObjectStore('cachedReads', { keyPath: 'key' });
        cachedReads.createIndex('by_timestamp', 'timestamp');
        cachedReads.createIndex('by_module', 'module');
      }

      // Create pendingWrites store
      if (!db.objectStoreNames.contains('pendingWrites')) {
        const pendingWrites = db.createObjectStore('pendingWrites', { keyPath: 'id' });
        pendingWrites.createIndex('by_timestamp', 'timestamp');
        pendingWrites.createIndex('by_status', 'status');
      }

      // Create queuedFiles store
      if (!db.objectStoreNames.contains('queuedFiles')) {
        db.createObjectStore('queuedFiles', { keyPath: 'writeId' });
      }
    }
  });

  return dbInstance;
}

// ============================================================================
// Cached Reads Operations
// ============================================================================

/**
 * Cache data for offline reading
 */
export async function cacheRead(
  key: string,
  data: any,
  module: string,
  ttl: number = 24 * 60 * 60 * 1000 // Default 24 hours
): Promise<void> {
  const db = await getOfflineDB();
  const json = JSON.stringify(data);
  const sizeBytes = new Blob([json]).size;

  // Compress if data is large (>10KB)
  const shouldCompress = sizeBytes > 10 * 1024;
  const dataToStore = shouldCompress ? compressData(json) : data;

  await db.put('cachedReads', {
    key,
    data: dataToStore,
    timestamp: Date.now(),
    ttl,
    module,
    sizeBytes,
    compressed: shouldCompress
  });

  // Check quota after write
  await checkStorageQuota();
}

/**
 * Get cached data if still valid
 */
export async function getCachedRead(key: string): Promise<any | null> {
  const db = await getOfflineDB();
  const cached = await db.get('cachedReads', key);

  if (!cached) return null;

  // Check expiry
  if (Date.now() - cached.timestamp > cached.ttl) {
    await db.delete('cachedReads', key);
    return null;
  }

  // Decompress if needed
  if (cached.compressed) {
    return decompressData(cached.data);
  }

  return cached.data;
}

/**
 * Delete a cached read
 */
export async function deleteCachedRead(key: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete('cachedReads', key);
}

/**
 * Get all cached reads (for debugging/management)
 */
export async function getAllCachedReads(): Promise<CachedRead[]> {
  const db = await getOfflineDB();
  return await db.getAllFromIndex('cachedReads', 'by_timestamp');
}

/**
 * Clear all cached reads for a module
 */
export async function clearCachedReadsForModule(module: string): Promise<void> {
  const db = await getOfflineDB();
  const cached = await db.getAllFromIndex('cachedReads', 'by_module', module);

  for (const item of cached) {
    await db.delete('cachedReads', item.key);
  }
}

// ============================================================================
// Pending Writes Operations
// ============================================================================

/**
 * Queue a write operation for sync
 */
export async function queueWrite(
  operation: string,
  endpoint: string,
  payload: any,
  module: string
): Promise<string> {
  const db = await getOfflineDB();
  const id = crypto.randomUUID();

  await db.put('pendingWrites', {
    id,
    operation,
    endpoint,
    payload,
    timestamp: Date.now(),
    retries: 0,
    status: 'pending',
    module
  });

  // Trigger sync if Background Sync API is supported
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await registration.sync.register('sync-offline-writes');
      }
    } catch (error) {
      console.warn('[Offline] Background sync registration failed:', error);
    }
  }

  return id;
}

/**
 * Get a pending write by ID
 */
export async function getPendingWrite(id: string): Promise<PendingWrite | undefined> {
  const db = await getOfflineDB();
  return await db.get('pendingWrites', id);
}

/**
 * Get all pending writes
 */
export async function getAllPendingWrites(): Promise<PendingWrite[]> {
  const db = await getOfflineDB();
  return await db.getAllFromIndex('pendingWrites', 'by_status', 'pending');
}

/**
 * Get count of pending writes (for UI indicator)
 */
export async function getPendingWriteCount(): Promise<number> {
  const db = await getOfflineDB();
  const pending = await db.getAllFromIndex('pendingWrites', 'by_status', 'pending');
  const syncing = await db.getAllFromIndex('pendingWrites', 'by_status', 'syncing');
  return pending.length + syncing.length;
}

/**
 * Update a pending write status
 */
export async function updatePendingWrite(
  id: string,
  updates: Partial<PendingWrite>
): Promise<void> {
  const db = await getOfflineDB();
  const existing = await db.get('pendingWrites', id);

  if (existing) {
    await db.put('pendingWrites', { ...existing, ...updates });
  }
}

/**
 * Delete a pending write (after successful sync)
 */
export async function deletePendingWrite(id: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete('pendingWrites', id);
}

/**
 * Get all failed writes
 */
export async function getFailedWrites(): Promise<PendingWrite[]> {
  const db = await getOfflineDB();
  return await db.getAllFromIndex('pendingWrites', 'by_status', 'failed');
}

/**
 * Retry a failed write
 */
export async function retryWrite(id: string): Promise<void> {
  await updatePendingWrite(id, {
    status: 'pending',
    error: undefined
  });

  // Trigger sync
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await registration.sync.register('sync-offline-writes');
    }
  }
}

// ============================================================================
// Queued Files Operations
// ============================================================================

/**
 * Queue a file for upload
 */
export async function queueFile(
  writeId: string,
  blob: Blob,
  filename: string,
  mimeType: string
): Promise<void> {
  const db = await getOfflineDB();

  await db.put('queuedFiles', {
    writeId,
    blob,
    filename,
    mimeType,
    sizeBytes: blob.size
  });

  await checkStorageQuota();
}

/**
 * Get a queued file
 */
export async function getQueuedFile(writeId: string): Promise<QueuedFile | undefined> {
  const db = await getOfflineDB();
  return await db.get('queuedFiles', writeId);
}

/**
 * Delete a queued file
 */
export async function deleteQueuedFile(writeId: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete('queuedFiles', writeId);
}

// ============================================================================
// Storage Quota Management
// ============================================================================

/**
 * Check storage quota and evict old data if needed (iOS Safari hardening)
 */
async function checkStorageQuota(): Promise<void> {
  if (typeof navigator === 'undefined' || !('storage' in navigator) || !('estimate' in navigator.storage)) {
    return;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 50 * 1024 * 1024; // Default 50MB for iOS
    const usagePercent = (usage / quota) * 100;

    console.log(`[Storage] ${(usage / 1024 / 1024).toFixed(1)}MB / ${(quota / 1024 / 1024).toFixed(1)}MB (${usagePercent.toFixed(1)}%)`);

    // iOS Safari hardening - evict at 50% (not 75%)
    const isLowQuota = quota < 75 * 1024 * 1024; // Less than 75MB = likely iOS Safari
    const threshold = isLowQuota ? 50 : 75;

    if (usagePercent > threshold) {
      console.warn(`[Storage] Quota threshold exceeded (${usagePercent.toFixed(1)}%), evicting old cache...`);
      await evictOldCache(isLowQuota ? 0.4 : 0.6);
    }
  } catch (error) {
    console.error('[Storage] Failed to check quota:', error);
  }
}

/**
 * Evict old cached data to free up storage (LRU strategy)
 */
async function evictOldCache(targetPercent: number): Promise<void> {
  const db = await getOfflineDB();
  const allCached = await db.getAllFromIndex('cachedReads', 'by_timestamp');

  const estimate = await navigator.storage.estimate();
  const targetUsage = (estimate.quota || 50 * 1024 * 1024) * targetPercent;
  let currentUsage = estimate.usage || 0;

  // Sort by timestamp (oldest first)
  allCached.sort((a, b) => a.timestamp - b.timestamp);

  for (const cached of allCached) {
    if (currentUsage <= targetUsage) break;

    // Don't evict critical data (attendance, profile, pending writes)
    if (
      cached.key.startsWith('attendance:') ||
      cached.key.startsWith('profile:') ||
      cached.key.startsWith('pending:')
    ) {
      continue;
    }

    await db.delete('cachedReads', cached.key);
    currentUsage -= cached.sizeBytes || 0;
  }

  console.log(`[Storage] Evicted old cache, new usage: ${(currentUsage / 1024 / 1024).toFixed(1)}MB`);
}

// ============================================================================
// Compression Utilities (for large payloads)
// ============================================================================

/**
 * Compress data using pako
 */
function compressData(jsonString: string): Uint8Array {
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonString);
  return pako.deflate(data);
}

/**
 * Decompress data using pako
 */
function decompressData(compressed: Uint8Array): any {
  const decompressed = pako.inflate(compressed);
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decompressed);
  return JSON.parse(jsonString);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear all offline data (for testing/reset)
 */
export async function clearAllOfflineData(): Promise<void> {
  const db = await getOfflineDB();
  await db.clear('cachedReads');
  await db.clear('pendingWrites');
  await db.clear('queuedFiles');
  console.log('[Offline] All offline data cleared');
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  usage: number;
  quota: number;
  usagePercent: number;
  cachedReadsCount: number;
  pendingWritesCount: number;
  queuedFilesCount: number;
}> {
  const db = await getOfflineDB();
  const estimate = await navigator.storage?.estimate();

  const cachedReads = await db.getAllFromIndex('cachedReads', 'by_timestamp');
  const pendingWrites = await db.getAllFromIndex('pendingWrites', 'by_timestamp');
  const queuedFiles = await db.getAll('queuedFiles');

  const usage = estimate?.usage || 0;
  const quota = estimate?.quota || 0;

  return {
    usage,
    quota,
    usagePercent: quota > 0 ? (usage / quota) * 100 : 0,
    cachedReadsCount: cachedReads.length,
    pendingWritesCount: pendingWrites.length,
    queuedFilesCount: queuedFiles.length
  };
}
