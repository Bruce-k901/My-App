'use client';

import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import {
  CheckCircle,
  AlertTriangle,
  Loader2,
  X,
  RefreshCw,
  Clock,
  Printer,
  Eye,
  EyeOff,
  Save,
} from '@/components/ui/icons';
import { toast } from 'sonner';

interface LablitConnectionFlowProps {
  connection: {
    id: string;
    status: string;
    config: Record<string, unknown>;
    last_connected_at: string | null;
    last_error: string | null;
  } | null;
  onRefresh: () => void;
}

type FlowStep = 'disconnected' | 'connecting' | 'connected' | 'error';

export function LablitConnectionFlow({ connection, onRefresh }: LablitConnectionFlowProps) {
  const { companyId, role } = useAppContext();
  const isAdmin = ['Admin', 'Owner', 'General Manager'].includes(role);

  const [apiKey, setApiKey] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const step: FlowStep = (() => {
    if (!connection) return 'disconnected';
    if (connection.status === 'error') return 'error';
    if (connection.status === 'connected' || connection.status === 'pending') return 'connected';
    return 'disconnected';
  })();

  const storedDeviceId = connection?.config?.device_id as string | undefined;
  const storedDeviceName = connection?.config?.device_name as string | undefined;
  const lastSync = connection?.last_connected_at;
  const lastError = connection?.last_error;
  const isPending = connection?.status === 'pending';

  async function handleConnect() {
    if (!companyId || !apiKey || !deviceId) {
      toast.error('API key and device ID are required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/integrations/lablit/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          apiKey,
          deviceId: deviceId.trim(),
          deviceName: deviceName.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Labl.it connected');
        setApiKey('');
        setDeviceId('');
        setDeviceName('');
        setShowForm(false);
        onRefresh();

        // Auto-test the connection
        handleTestConnection();
      } else {
        toast.error(data.error || 'Failed to connect');
      }
    } catch {
      toast.error('Failed to connect');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!companyId) return;
    setTesting(true);
    try {
      const res = await fetch('/api/integrations/lablit/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.placeholder) {
          toast.info(data.message || 'Connection saved - API integration pending');
        } else {
          toast.success('Connection test passed');
        }
      } else {
        toast.error(data.error || 'Connection test failed');
      }
    } catch {
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect() {
    if (!companyId) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/integrations/lablit/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Labl.it disconnected');
        onRefresh();
      } else {
        toast.error(data.error || 'Failed to disconnect');
      }
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  }

  if (!isAdmin) {
    return (
      <p className="text-xs text-theme-tertiary">
        Admin access required to manage Labl.it integration
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Error banner */}
      {step === 'error' && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Labl.it connection error
              </p>
              {lastError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                  {lastError}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowForm(true)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Reconnect
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1.5"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Disconnected — show connect form or button */}
      {step === 'disconnected' && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Connect Labl.it
        </button>
      )}

      {/* Connection form */}
      {(showForm && (step === 'disconnected' || step === 'error')) && (
        <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-theme rounded-lg space-y-3">
          <p className="text-sm font-medium text-theme-primary">
            Connect your Labl.it printer
          </p>
          <p className="text-xs text-theme-secondary">
            Enter your Labl.it API key and device ID. Contact Labl.it support if you don&apos;t have these yet.
          </p>

          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Labl.it API key"
                className="w-full px-3 py-1.5 pr-10 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/30"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-tertiary hover:text-theme-secondary"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">
              Device ID
            </label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="e.g., f985a1cf-317c-49a8-847a-f002bde20e6b"
              className="w-full px-3 py-1.5 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/30 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">
              Device Name <span className="text-theme-tertiary">(optional)</span>
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g., Kitchen Printer 1"
              className="w-full px-3 py-1.5 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/30"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleConnect}
              disabled={saving || !apiKey || !deviceId}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Connecting...' : 'Save & Connect'}
            </button>
            <button
              onClick={() => { setShowForm(false); setApiKey(''); setDeviceId(''); setDeviceName(''); }}
              className="px-3 py-1.5 border border-theme rounded-lg text-sm text-theme-secondary hover:bg-theme-surface-elevated"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Connected — status + actions */}
      {step === 'connected' && (
        <div className="space-y-3">
          <div className={`p-3 rounded-lg border ${
            isPending
              ? 'bg-amber-50/50 dark:bg-amber-900/5 border-amber-200 dark:border-amber-800/30'
              : 'bg-emerald-50/50 dark:bg-emerald-900/5 border-emerald-200 dark:border-emerald-800/30'
          }`}>
            <div className={`flex items-center gap-2 text-sm ${
              isPending
                ? 'text-amber-800 dark:text-amber-300'
                : 'text-emerald-800 dark:text-emerald-300'
            }`}>
              {isPending ? (
                <Clock className="w-4 h-4" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span className="font-medium">
                {storedDeviceName || 'Labl.it Printer'}
              </span>
            </div>
            {storedDeviceId && (
              <p className={`text-xs mt-1 ${
                isPending
                  ? 'text-amber-600/70 dark:text-amber-400/50'
                  : 'text-emerald-600/70 dark:text-emerald-400/50'
              }`}>
                Device: <span className="font-mono">{storedDeviceId}</span>
              </p>
            )}
            {lastSync && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${
                isPending
                  ? 'text-amber-600/70 dark:text-amber-400/50'
                  : 'text-emerald-600/70 dark:text-emerald-400/50'
              }`}>
                <Clock className="w-3 h-3" />
                Connected: {new Date(lastSync).toLocaleString()}
              </p>
            )}
            {isPending && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 p-2 bg-amber-100/50 dark:bg-amber-900/10 rounded">
                API integration pending - label push will activate once Labl.it confirms API access.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-1.5"
            >
              {testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1"
            >
              {disconnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
