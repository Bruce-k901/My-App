'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { X, Calendar, User, FileText } from '@/components/ui/icons';

type Asset = Database['public']['Tables']['assets']['Row'];

interface AssetLogsDrawerProps {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
}

interface LogEntry {
  id: string;
  type: 'ppm' | 'reactive' | 'warranty';
  date: string;
  contractor: string;
  description: string;
  notes?: string;
}

export default function AssetLogsDrawer({ asset, open, onClose }: AssetLogsDrawerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !asset) return;

    const fetchLogs = async () => {
      setLoading(true);
      try {
        // For now, we'll create mock data since the logs tables might not exist yet
        // In a real implementation, you'd query the appropriate tables
        const mockLogs: LogEntry[] = [
          {
            id: '1',
            type: 'ppm',
            date: '2024-01-15',
            contractor: 'Maintenance Pro Ltd',
            description: 'Scheduled PPM service',
            notes: 'All systems checked and functioning normally'
          },
          {
            id: '2',
            type: 'reactive',
            date: '2024-01-10',
            contractor: 'Emergency Repairs Co',
            description: 'Temperature sensor replacement',
            notes: 'Sensor was reading incorrectly, replaced with new unit'
          },
          {
            id: '3',
            type: 'warranty',
            date: '2024-01-05',
            contractor: 'Manufacturer Service',
            description: 'Warranty claim - compressor issue',
            notes: 'Compressor replaced under warranty'
          }
        ];

        setLogs(mockLogs);
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [open, asset]);

  if (!open || !asset) return null;

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'ppm':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-400';
      case 'reactive':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-400';
      case 'warranty':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-400';
      default:
 return'bg-gray-100 dark:bg-neutral-900/30 text-gray-600 dark:text-theme-tertiary border-neutral-400';
    }
  };

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case 'ppm':
        return <Calendar size={16} />;
      case 'reactive':
        return <FileText size={16} />;
      case 'warranty':
        return <User size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/30 dark:bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="w-96 bg-theme-surface border-l border-theme flex flex-col shadow-xl dark:shadow-none">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <div>
            <h2 className="text-lg font-semibold text-theme-primary">Asset Logs</h2>
 <p className="text-sm text-gray-500 dark:text-theme-tertiary">{asset.name}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="p-2"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
 <p className="text-gray-500 dark:text-theme-tertiary">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
 <p className="text-gray-500 dark:text-theme-tertiary">No logs found for this asset.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-lg border border-theme bg-theme-button/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded border ${getLogTypeColor(log.type)}`}>
                        {getLogTypeIcon(log.type)}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLogTypeColor(log.type)}`}>
                        {log.type.toUpperCase()}
                      </span>
                    </div>
 <span className="text-xs text-gray-400 dark:text-theme-tertiary">
                      {new Date(log.date).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-medium text-theme-primary mb-1">
                    {log.description}
                  </h3>

 <p className="text-sm text-gray-500 dark:text-theme-tertiary mb-2">
                    <User size={14} className="inline mr-1" />
                    {log.contractor}
                  </p>

                  {log.notes && (
                    <p className="text-sm text-gray-600 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-700/30 p-2 rounded">
                      {log.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-theme">
          <Button
            variant="outline"
            className="w-full"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

