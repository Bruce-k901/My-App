'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import {
  CheckCircle,
  AlertTriangle,
  Loader2,
  X,
  RefreshCw,
  Clock,
  ExternalLink,
} from '@/components/ui/icons';
import { toast } from 'sonner';

interface SitePosConfig {
  pos_provider: string | null;
  pos_location_id: string | null;
  pos_config: Record<string, unknown> | null;
}

interface SquareConnectionFlowProps {
  connection: {
    id: string;
    status: string;
    config: Record<string, unknown>;
    last_connected_at: string | null;
    last_error: string | null;
  } | null;
  siteHasLocation: boolean;
  sitePosConfig: SitePosConfig | null;
  onRefresh: () => void;
}

type FlowStep = 'disconnected' | 'connecting' | 'location_select' | 'connected' | 'error';

interface SquareLocation {
  id: string;
  name: string;
  address: string | null;
  status: string;
}

export function SquareConnectionFlow({ connection, siteHasLocation, sitePosConfig, onRefresh }: SquareConnectionFlowProps) {
  const { companyId, siteId, role } = useAppContext();
  const isAdmin = ['Admin', 'Owner', 'General Manager'].includes(role);

  const [locations, setLocations] = useState<SquareLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Determine the current step based on connection + site state
  const step: FlowStep = (() => {
    if (!connection) return 'disconnected';
    if (connection.status === 'error') return 'error';
    if (connection.status === 'pending') return 'location_select';
    // Company connected but this site has no location yet
    if (connection.status === 'connected' && !siteHasLocation) return 'location_select';
    if (connection.status === 'connected') return 'connected';
    return 'disconnected';
  })();

  // Check for OAuth callback query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const squareStatus = params.get('square');
    if (squareStatus === 'connected') {
      toast.success('Square account connected — now select a location');
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('square');
      window.history.replaceState({}, '', url.toString());
      onRefresh();
    } else if (squareStatus === 'error') {
      const reason = params.get('reason') || 'unknown';
      toast.error(`Square connection failed: ${reason.replace(/_/g, ' ')}`);
      const url = new URL(window.location.href);
      url.searchParams.delete('square');
      url.searchParams.delete('reason');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Auto-load locations when in location_select step
  useEffect(() => {
    if (step === 'location_select' && companyId) {
      loadLocations();
    }
  }, [step, companyId]);

  async function loadLocations() {
    setLoadingLocations(true);
    try {
      const res = await fetch(`/api/integrations/square/locations?companyId=${companyId}`);
      const data = await res.json();
      if (data.locations) {
        setLocations(data.locations);
        if (data.locations.length === 1) {
          setSelectedLocationId(data.locations[0].id);
        }
      } else {
        toast.error(data.error || 'Failed to load Square locations');
      }
    } catch {
      toast.error('Failed to load Square locations');
    } finally {
      setLoadingLocations(false);
    }
  }

  function handleConnect() {
    if (!companyId) return;
    const params = new URLSearchParams({ companyId, siteId: siteId || '' });
    window.location.href = `/api/integrations/square/authorize?${params.toString()}`;
  }

  async function handleSelectLocation() {
    if (!selectedLocationId || !companyId || !siteId) return;
    setSaving(true);
    try {
      const selectedLoc = locations.find((l) => l.id === selectedLocationId);
      const res = await fetch('/api/integrations/square/select-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          siteId,
          locationId: selectedLocationId,
          locationName: selectedLoc?.name || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Square location activated');
        onRefresh();
      } else {
        toast.error(data.error || 'Failed to save location');
      }
    } catch {
      toast.error('Failed to save location');
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    if (!companyId || !siteId) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/integrations/square/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, siteId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Synced ${data.result?.ordersProcessed ?? 0} orders from Square`,
        );
        onRefresh();
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!companyId) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/integrations/square/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, siteId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Square disconnected');
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

  const locationName = (sitePosConfig?.pos_config as Record<string, unknown>)?.location_name as string | undefined
    || connection?.config?.location_name as string | undefined;
  const merchantId = connection?.config?.merchant_id as string | undefined;
  const lastSync = connection?.last_connected_at;
  const lastError = connection?.last_error;

  if (!isAdmin) {
    return (
      <p className="text-xs text-theme-tertiary">
        Admin access required to manage POS integrations
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
                Square connection error
              </p>
              {lastError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                  {lastError}
                </p>
              )}
              {lastSync && (
                <p className="text-xs text-red-500/70 mt-1">
                  Last successful sync: {new Date(lastSync).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleConnect}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Reconnect
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1.5"
            >
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Retry Sync
            </button>
          </div>
        </div>
      )}

      {/* Disconnected — connect button */}
      {step === 'disconnected' && (
        <button
          onClick={handleConnect}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Connect with Square
        </button>
      )}

      {/* Location selection */}
      {step === 'location_select' && (
        <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-theme rounded-lg space-y-3">
          <p className="text-sm font-medium text-theme-primary">
            Select a Square location for this site
          </p>

          {loadingLocations ? (
            <div className="flex items-center gap-2 text-sm text-theme-secondary">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading locations...
            </div>
          ) : locations.length === 0 ? (
            <p className="text-sm text-theme-secondary">
              No locations found. Make sure your Square account has at least one active location.
            </p>
          ) : (
            <>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full px-3 py-2 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary"
              >
                <option value="">Choose a location...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                    {loc.address ? ` — ${loc.address}` : ''}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  onClick={handleSelectLocation}
                  disabled={!selectedLocationId || saving}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  {saving ? 'Activating...' : 'Activate'}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-3 py-1.5 border border-theme rounded-lg text-sm text-theme-secondary hover:bg-theme-surface-elevated"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Connected — status + actions */}
      {step === 'connected' && (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/5 border border-emerald-200 dark:border-emerald-800/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">
                {locationName || 'Square'}
              </span>
              {merchantId && (
                <span className="text-xs text-emerald-600/70 dark:text-emerald-400/50">
                  ({merchantId})
                </span>
              )}
            </div>
            {lastSync && (
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/50 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last sync: {new Date(lastSync).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-1.5"
            >
              {syncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {syncing ? 'Syncing...' : 'Sync Now'}
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
