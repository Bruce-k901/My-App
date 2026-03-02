// @salsa - SALSA Compliance: Calibration records panel for asset detail pages
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { AssetCalibration } from '@/lib/types/stockly';
import CalibrationForm from './CalibrationForm';
import { Plus, CheckCircle } from '@/components/ui/icons';

interface CalibrationPanelProps {
  assetId: string;
  assetName?: string;
}

export default function CalibrationPanel({ assetId, assetName }: CalibrationPanelProps) {
  const { companyId } = useAppContext();
  const [calibrations, setCalibrations] = useState<AssetCalibration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // @salsa — Fetch calibration history for this asset
  useEffect(() => {
    if (!assetId) return;
    const fetchCalibrations = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('asset_calibrations')
        .select('*')
        .eq('asset_id', assetId)
        .order('calibration_date', { ascending: false });

      if (!error) setCalibrations(data || []);
      setLoading(false);
    };
    fetchCalibrations();
  }, [assetId]);

  // @salsa — Determine calibration status badge
  const getCalibrationStatus = () => {
    if (calibrations.length === 0) return { label: 'Never Calibrated', classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
    const latest = calibrations[0];
    if (!latest.next_calibration_due) return { label: 'Current', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
    const today = new Date().toISOString().split('T')[0];
    const in14Days = new Date();
    in14Days.setDate(in14Days.getDate() + 14);
    const in14DaysStr = in14Days.toISOString().split('T')[0];
    if (latest.next_calibration_due < today) return { label: 'Overdue', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    if (latest.next_calibration_due <= in14DaysStr) return { label: 'Due Soon', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    return { label: 'Current', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
  };

  const handleSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/stockly/calibrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          asset_id: assetId,
          ...data,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setCalibrations(prev => [result.data, ...prev]);
        setShowForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const status = getCalibrationStatus();

  return (
    <div className="space-y-3">
      {/* Header with status badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.classes}`}>
            {status.label}
          </span>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stockly-dark dark:text-stockly bg-stockly-dark/10 dark:bg-stockly/10 rounded-lg hover:bg-stockly-dark/20 dark:hover:bg-stockly/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Calibration
          </button>
        )}
      </div>

      {/* Add calibration form */}
      {showForm && (
        <div className="border border-theme rounded-lg p-4 bg-theme-surface">
          <CalibrationForm
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            loading={submitting}
          />
        </div>
      )}

      {/* Calibration history */}
      {loading ? (
        <p className="text-sm text-theme-tertiary">Loading calibrations...</p>
      ) : calibrations.length === 0 ? (
        <p className="text-sm text-theme-tertiary">No calibration records yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-theme text-left">
                <th className="pb-2 font-medium text-theme-secondary">Date</th>
                <th className="pb-2 font-medium text-theme-secondary">Calibrated By</th>
                <th className="pb-2 font-medium text-theme-secondary">Method</th>
                <th className="pb-2 font-medium text-theme-secondary">Result</th>
                <th className="pb-2 font-medium text-theme-secondary">Next Due</th>
                <th className="pb-2 font-medium text-theme-secondary">Certificate</th>
              </tr>
            </thead>
            <tbody>
              {calibrations.map(cal => (
                <tr key={cal.id} className="border-b border-theme/50">
                  <td className="py-2 text-theme-primary">{new Date(cal.calibration_date).toLocaleDateString()}</td>
                  <td className="py-2 text-theme-primary">{cal.calibrated_by}</td>
                  <td className="py-2 text-theme-tertiary">{cal.method?.replace(/_/g, ' ') || '—'}</td>
                  <td className="py-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      cal.result === 'pass' ? 'text-green-600 dark:text-green-400' :
                      cal.result === 'fail' ? 'text-red-600 dark:text-red-400' :
                      'text-amber-600 dark:text-amber-400'
                    }`}>
                      {cal.result === 'pass' && <CheckCircle className="w-3.5 h-3.5" />}
                      {cal.result.charAt(0).toUpperCase() + cal.result.slice(1)}
                    </span>
                  </td>
                  <td className="py-2 text-theme-tertiary">{cal.next_calibration_due ? new Date(cal.next_calibration_due).toLocaleDateString() : '—'}</td>
                  <td className="py-2 text-theme-tertiary">{cal.certificate_reference || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
