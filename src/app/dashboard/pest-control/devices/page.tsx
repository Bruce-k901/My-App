'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import EntityPageLayout from '@/components/layouts/EntityPageLayout';
import DeviceFormModal from '@/components/pest-control/DeviceFormModal';
import {
  Bug,
  Check,
  AlertTriangle,
  Edit,
  Download,
  Filter,
} from '@/components/ui/icons';

// ── Types ──────────────────────────────────────────────────────────────────

type PestDevice = {
  id: string;
  company_id: string;
  site_id: string | null;
  device_number: string;
  device_type: string;
  device_name: string | null;
  location_area: string;
  location_description: string | null;
  floor_level: string | null;
  manufacturer: string | null;
  model: string | null;
  bait_type: string | null;
  installation_date: string | null;
  status: string;
  notes: string | null;
  last_service_date: string | null;
  activity_count_ytd: number | null;
  created_at: string;
};

// ── Constants ──────────────────────────────────────────────────────────────

const DEVICE_TYPE_LABELS: Record<string, string> = {
  mouse_trap: 'Mouse Trap',
  rat_trap: 'Rat Trap',
  bait_station: 'Bait Station',
  insectocutor: 'Insectocutor',
  fly_screen: 'Fly Screen',
  bird_deterrent: 'Bird Deterrent',
  pheromone_trap: 'Pheromone Trap',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400',
  removed: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  needs_replacement: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  removed: 'Removed',
  needs_replacement: 'Needs Replacement',
};

const ALL_DEVICE_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'mouse_trap', label: 'Mouse Trap' },
  { value: 'rat_trap', label: 'Rat Trap' },
  { value: 'bait_station', label: 'Bait Station' },
  { value: 'insectocutor', label: 'Insectocutor' },
  { value: 'fly_screen', label: 'Fly Screen' },
  { value: 'bird_deterrent', label: 'Bird Deterrent' },
  { value: 'pheromone_trap', label: 'Pheromone Trap' },
];

const ALL_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'removed', label: 'Removed' },
  { value: 'needs_replacement', label: 'Needs Replacement' },
];

// ── Page Component ─────────────────────────────────────────────────────────

export default function PestControlDevicesPage() {
  const { companyId, siteId } = useAppContext();

  const [devices, setDevices] = useState<PestDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNotFound, setTableNotFound] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<PestDevice | undefined>(undefined);

  // ── Fetch devices ──────────────────────────────────────────────────────

  useEffect(() => {
    if (companyId) fetchDevices();
  }, [companyId, siteId]);

  async function fetchDevices() {
    try {
      setLoading(true);
      setTableNotFound(false);

      let query = supabase
        .from('pest_control_devices')
        .select('*')
        .eq('company_id', companyId)
        .order('device_number', { ascending: true });

      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }

      const { data, error } = await query;

      if (error) {
        if ((error as any).code === '42P01') {
          setTableNotFound(true);
          setDevices([]);
          return;
        }
        throw error;
      }

      setDevices(data || []);
    } catch (err: any) {
      console.error('Error fetching devices:', err);
      toast.error('Failed to load devices');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }

  // ── Filtering ──────────────────────────────────────────────────────────

  const filteredDevices = useMemo(() => {
    let result = devices;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          (d.device_number || '').toLowerCase().includes(q) ||
          (d.device_name || '').toLowerCase().includes(q) ||
          (d.location_area || '').toLowerCase().includes(q)
      );
    }

    // Type filter
    if (filterType) {
      result = result.filter((d) => d.device_type === filterType);
    }

    // Status filter
    if (filterStatus) {
      result = result.filter((d) => d.status === filterStatus);
    }

    return result;
  }, [devices, searchQuery, filterType, filterStatus]);

  // ── Summary stats ──────────────────────────────────────────────────────

  const totalDevices = devices.length;
  const activeDevices = devices.filter((d) => d.status === 'active').length;
  const needsAttention = devices.filter((d) => d.status === 'needs_replacement').length;

  // ── Modal handlers ─────────────────────────────────────────────────────

  function handleAdd() {
    setEditingDevice(undefined);
    setModalOpen(true);
  }

  function handleEdit(device: PestDevice) {
    setEditingDevice(device);
    setModalOpen(true);
  }

  function handleSaved() {
    setModalOpen(false);
    setEditingDevice(undefined);
    fetchDevices();
  }

  // ── CSV Export ──────────────────────────────────────────────────────────

  function handleExportCSV() {
    try {
      const fields = [
        'device_number',
        'device_type',
        'device_name',
        'location_area',
        'location_description',
        'floor_level',
        'manufacturer',
        'model',
        'bait_type',
        'installation_date',
        'status',
        'last_service_date',
        'activity_count_ytd',
        'notes',
      ];

      const header = fields.join(',');
      const rows = filteredDevices.map((d) =>
        fields
          .map((f) => {
            const val = (d as any)[f];
            if (val === null || val === undefined) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(',')
      );

      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pest-devices-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${filteredDevices.length} devices to CSV`);
    } catch (err) {
      console.error('CSV export error:', err);
      toast.error('Failed to export CSV');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const selectClass =
    'h-9 sm:h-10 px-2 sm:px-3 rounded-md border border-gray-300 dark:border-theme bg-white dark:bg-transparent text-xs sm:text-sm text-theme-primary appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <>
      <EntityPageLayout
        title="Device Register"
        onSearch={setSearchQuery}
        searchPlaceholder="Search devices..."
        onAdd={handleAdd}
        onDownload={handleExportCSV}
        customActions={
          <div className="flex items-center gap-2">
            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={selectClass}
            >
              {ALL_DEVICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={selectClass}
            >
              {ALL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-theme bg-theme-surface p-4">
            <p className="text-xs text-theme-tertiary mb-1">Total Devices</p>
            <p className="text-2xl font-bold text-theme-primary">{totalDevices}</p>
          </div>
          <div className="rounded-xl border border-theme bg-theme-surface p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <p className="text-xs text-theme-tertiary">Active</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeDevices}</p>
          </div>
          <div className="rounded-xl border border-theme bg-theme-surface p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-xs text-theme-tertiary">Needs Attention</p>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{needsAttention}</p>
          </div>
        </div>

        {/* Table not found state */}
        {tableNotFound && (
          <div className="rounded-xl border border-theme bg-theme-surface p-8 text-center">
            <Bug className="h-10 w-10 text-theme-tertiary mx-auto mb-3" />
            <p className="text-theme-secondary text-sm">
              Pest control devices table is not set up yet. Please run the database migration.
            </p>
          </div>
        )}

        {/* Loading state */}
        {loading && !tableNotFound && (
          <div className="text-theme-tertiary text-sm py-8 text-center">Loading devices...</div>
        )}

        {/* Empty state */}
        {!loading && !tableNotFound && devices.length === 0 && (
          <div className="rounded-xl border border-theme bg-theme-surface p-8 text-center">
            <Bug className="h-10 w-10 text-theme-tertiary mx-auto mb-3" />
            <p className="text-theme-secondary text-sm mb-3">No devices registered yet.</p>
            <button
              onClick={handleAdd}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-checkly-dark dark:bg-checkly text-white dark:text-checkly-dark"
            >
              Add First Device
            </button>
          </div>
        )}

        {/* No search results */}
        {!loading && !tableNotFound && devices.length > 0 && filteredDevices.length === 0 && (
          <div className="rounded-xl border border-theme bg-theme-surface p-8 text-center">
            <p className="text-theme-tertiary text-sm">No devices match your filters.</p>
          </div>
        )}

        {/* Devices Table */}
        {!loading && !tableNotFound && filteredDevices.length > 0 && (
          <div className="rounded-xl border border-theme overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme bg-theme-surface">
                    <th className="text-left px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">
                      Device #
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">
                      Location
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">
                      Floor
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">
                      Last Service
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">
                      Activity YTD
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-theme-tertiary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {filteredDevices.map((device) => (
                    <tr
                      key={device.id}
                      onClick={() => handleEdit(device)}
                      className="hover:bg-theme-hover cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-theme-primary">
                        {device.device_number}
                      </td>
                      <td className="px-4 py-3 text-theme-secondary">
                        {DEVICE_TYPE_LABELS[device.device_type] || device.device_type}
                      </td>
                      <td className="px-4 py-3 text-theme-secondary">
                        {device.device_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-theme-secondary">
                        {device.location_area}
                      </td>
                      <td className="px-4 py-3 text-theme-secondary capitalize">
                        {device.floor_level || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_COLORS[device.status] || STATUS_COLORS.inactive
                          }`}
                        >
                          {STATUS_LABELS[device.status] || device.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-theme-secondary">
                        {device.last_service_date
                          ? new Date(device.last_service_date).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-theme-secondary text-center">
                        {device.activity_count_ytd ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(device);
                          }}
                          className="p-1.5 rounded-md hover:bg-theme-hover text-theme-tertiary hover:text-theme-primary transition-colors"
                          aria-label="Edit device"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </EntityPageLayout>

      {/* Device Form Modal */}
      <DeviceFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingDevice(undefined);
        }}
        onSaved={handleSaved}
        device={editingDevice}
      />
    </>
  );
}
