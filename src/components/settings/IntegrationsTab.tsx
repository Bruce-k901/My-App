'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Printer, Receipt, Plug, CheckCircle, AlertTriangle, Loader2, X, Save } from '@/components/ui/icons';
import { toast } from 'sonner';

type IntegrationType = 'label_printer' | 'pos_system' | 'xero' | 'quickbooks' | 'other';
type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

interface IntegrationConnection {
  id: string;
  company_id: string;
  integration_type: IntegrationType;
  integration_name: string;
  status: IntegrationStatus;
  config: Record<string, any>;
  last_connected_at: string | null;
  last_error: string | null;
}

interface IntegrationCard {
  type: IntegrationType;
  name: string;
  description: string;
  icon: React.ElementType;
  comingSoon: boolean;
  configFields?: { key: string; label: string; type: string; placeholder: string }[];
}

const INTEGRATION_CATALOG: IntegrationCard[] = [
  {
    type: 'label_printer',
    name: 'Label Printer',
    description: 'Connect a label printer for batch labels, allergen labels, and product stickers.',
    icon: Printer,
    comingSoon: false,
    configFields: [
      { key: 'printer_ip', label: 'Printer IP Address', type: 'text', placeholder: '192.168.1.100' },
      { key: 'printer_port', label: 'Port', type: 'text', placeholder: '9100' },
      { key: 'printer_model', label: 'Printer Model', type: 'text', placeholder: 'e.g., Zebra ZD420, Brother QL-820' },
      { key: 'label_width_mm', label: 'Label Width (mm)', type: 'number', placeholder: '62' },
    ],
  },
  {
    type: 'pos_system',
    name: 'POS System',
    description: 'Sync sales data from your point-of-sale system for stock deductions and GP analysis.',
    icon: Receipt,
    comingSoon: true,
  },
  {
    type: 'xero',
    name: 'Xero',
    description: 'Push purchase orders, invoices, and stock valuations to Xero for accounting.',
    icon: Plug,
    comingSoon: true,
  },
  {
    type: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync financial data with QuickBooks for bookkeeping and tax reporting.',
    icon: Plug,
    comingSoon: true,
  },
];

function StatusBadge({ status, comingSoon }: { status?: IntegrationStatus; comingSoon?: boolean }) {
  if (comingSoon) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
        Coming Soon
      </span>
    );
  }

  switch (status) {
    case 'connected':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle className="w-3 h-3" /> Connected
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle className="w-3 h-3" /> Error
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          <Loader2 className="w-3 h-3 animate-spin" /> Pending
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-400">
          Disconnected
        </span>
      );
  }
}

export function IntegrationsTab() {
  const { companyId, role } = useAppContext();
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [configuringType, setConfiguringType] = useState<IntegrationType | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isAdmin = role === 'Admin';

  useEffect(() => {
    if (!companyId) return;
    loadConnections();
  }, [companyId]);

  async function loadConnections() {
    try {
      const res = await fetch(`/api/settings/integrations?companyId=${companyId}`);
      const result = await res.json();
      setConnections(result.data || []);
    } catch {
      // Table may not exist yet
    } finally {
      setLoading(false);
    }
  }

  function getConnection(type: IntegrationType): IntegrationConnection | undefined {
    return connections.find(c => c.integration_type === type);
  }

  function openConfigure(card: IntegrationCard) {
    const existing = getConnection(card.type);
    const initial: Record<string, string> = {};
    card.configFields?.forEach(f => {
      initial[f.key] = existing?.config?.[f.key] || '';
    });
    setConfigForm(initial);
    setConfiguringType(card.type);
  }

  async function handleSaveConfig(card: IntegrationCard) {
    if (!companyId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          integration_type: card.type,
          integration_name: card.name,
          config: configForm,
          status: 'connected',
        }),
      });

      if (res.ok) {
        toast.success(`${card.name} configured successfully`);
        setConfiguringType(null);
        loadConnections();
      } else {
        const result = await res.json();
        toast.error(result.error || 'Failed to save configuration');
      }
    } catch {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect(card: IntegrationCard) {
    const existing = getConnection(card.type);
    if (!existing) return;

    try {
      const res = await fetch(`/api/settings/integrations?id=${existing.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success(`${card.name} disconnected`);
        loadConnections();
      } else {
        toast.error('Failed to disconnect');
      }
    } catch {
      toast.error('Failed to disconnect');
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-theme-tertiary mx-auto mb-2" />
        <p className="text-theme-secondary text-sm">Loading integrations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-theme-surface border border-theme rounded-xl p-6">
        <h2 className="text-xl font-semibold text-theme-primary mb-2 flex items-center gap-2">
          <Plug className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Integrations
        </h2>
        <p className="text-sm text-theme-secondary mb-6">
          Connect external services to extend your workflow. Configure printers, POS systems, and accounting packages.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INTEGRATION_CATALOG.map((card) => {
            const Icon = card.icon;
            const connection = getConnection(card.type);
            const isConfiguring = configuringType === card.type;

            return (
              <div
                key={card.type}
                className={`border rounded-xl p-5 transition-colors ${
                  card.comingSoon
                    ? 'border-theme bg-gray-50/50 dark:bg-white/[0.01] opacity-70'
                    : connection?.status === 'connected'
                    ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/5'
                    : 'border-theme bg-theme-surface hover:border-blue-300 dark:hover:border-blue-800'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      card.comingSoon
                        ? 'bg-gray-100 dark:bg-white/[0.06]'
                        : connection?.status === 'connected'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : 'bg-blue-100 dark:bg-blue-900/20'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        card.comingSoon
                          ? 'text-gray-400 dark:text-gray-500'
                          : connection?.status === 'connected'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-theme-primary">{card.name}</h3>
                      <StatusBadge status={connection?.status} comingSoon={card.comingSoon} />
                    </div>
                  </div>
                </div>

                <p className="text-sm text-theme-secondary mb-4">{card.description}</p>

                {/* Error display */}
                {connection?.status === 'error' && connection.last_error && (
                  <p className="text-xs text-red-600 dark:text-red-400 mb-3 p-2 bg-red-50 dark:bg-red-900/10 rounded">
                    {connection.last_error}
                  </p>
                )}

                {/* Configuration form */}
                {isConfiguring && card.configFields && (
                  <div className="space-y-3 mb-4 p-4 bg-gray-50 dark:bg-white/[0.02] border border-theme rounded-lg">
                    {card.configFields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs font-medium text-theme-secondary mb-1">
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          value={configForm[field.key] || ''}
                          onChange={(e) => setConfigForm({ ...configForm, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-1.5 bg-theme-bg-secondary border border-theme-border rounded-lg text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/30"
                        />
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleSaveConfig(card)}
                        disabled={saving}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {saving ? 'Saving...' : 'Save & Connect'}
                      </button>
                      <button
                        onClick={() => setConfiguringType(null)}
                        className="px-3 py-1.5 border border-theme rounded-lg text-sm text-theme-secondary hover:bg-theme-bg-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {!card.comingSoon && isAdmin && !isConfiguring && (
                  <div className="flex gap-2">
                    {connection?.status === 'connected' ? (
                      <>
                        <button
                          onClick={() => openConfigure(card)}
                          className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          Configure
                        </button>
                        <button
                          onClick={() => handleDisconnect(card)}
                          className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openConfigure(card)}
                        className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        Configure
                      </button>
                    )}
                  </div>
                )}

                {!isAdmin && !card.comingSoon && (
                  <p className="text-xs text-theme-tertiary">Admin access required to manage integrations</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
