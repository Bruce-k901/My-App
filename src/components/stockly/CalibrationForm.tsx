// @salsa - SALSA Compliance: Calibration record create form
'use client';

import { useState } from 'react';

interface CalibrationFormProps {
  onSubmit: (data: {
    calibration_date: string;
    next_calibration_due: string;
    calibrated_by: string;
    method: string;
    readings: Record<string, number> | null;
    result: 'pass' | 'fail' | 'adjusted';
    certificate_reference: string;
    notes: string;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const METHODS = [
  { value: 'ice_bath_boiling_water', label: 'Ice Bath & Boiling Water' },
  { value: 'external_lab', label: 'External Lab' },
  { value: 'manufacturer', label: 'Manufacturer' },
];

export default function CalibrationForm({ onSubmit, onCancel, loading }: CalibrationFormProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultNextDue = new Date();
  defaultNextDue.setFullYear(defaultNextDue.getFullYear() + 1);
  const nextDueStr = defaultNextDue.toISOString().split('T')[0];

  const [calibrationDate, setCalibrationDate] = useState(todayStr);
  const [nextCalibrationDue, setNextCalibrationDue] = useState(nextDueStr);
  const [calibratedBy, setCalibratedBy] = useState('');
  const [method, setMethod] = useState('ice_bath_boiling_water');
  const [iceBathReading, setIceBathReading] = useState('');
  const [boilingWaterReading, setBoilingWaterReading] = useState('');
  const [result, setResult] = useState<'pass' | 'fail' | 'adjusted'>('pass');
  const [certificateReference, setCertificateReference] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calibratedBy.trim()) return;

    let readings: Record<string, number> | null = null;
    if (method === 'ice_bath_boiling_water' && (iceBathReading || boilingWaterReading)) {
      readings = {};
      if (iceBathReading) readings.ice_bath = parseFloat(iceBathReading);
      if (boilingWaterReading) readings.boiling_water = parseFloat(boilingWaterReading);
      if (iceBathReading && boilingWaterReading) {
        readings.variance = Math.max(
          Math.abs(parseFloat(iceBathReading)),
          Math.abs(100 - parseFloat(boilingWaterReading))
        );
      }
    }

    await onSubmit({
      calibration_date: calibrationDate,
      next_calibration_due: nextCalibrationDue,
      calibrated_by: calibratedBy.trim(),
      method,
      readings,
      result,
      certificate_reference: certificateReference.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Calibration Date *</label>
          <input
            type="date"
            value={calibrationDate}
            onChange={e => setCalibrationDate(e.target.value)}
            className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Next Calibration Due</label>
          <input
            type="date"
            value={nextCalibrationDue}
            onChange={e => setNextCalibrationDue(e.target.value)}
            className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Calibrated By *</label>
          <input
            type="text"
            value={calibratedBy}
            onChange={e => setCalibratedBy(e.target.value)}
            className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
            placeholder="Person or company name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Method</label>
          <select
            value={method}
            onChange={e => setMethod(e.target.value)}
            className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
          >
            {METHODS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* @salsa — Ice bath / boiling water readings for probe calibration */}
      {method === 'ice_bath_boiling_water' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Ice Bath Reading (°C)</label>
            <input
              type="number"
              step="0.1"
              value={iceBathReading}
              onChange={e => setIceBathReading(e.target.value)}
              className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
              placeholder="e.g., 0.2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Boiling Water Reading (°C)</label>
            <input
              type="number"
              step="0.1"
              value={boilingWaterReading}
              onChange={e => setBoilingWaterReading(e.target.value)}
              className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
              placeholder="e.g., 99.8"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Result</label>
          <select
            value={result}
            onChange={e => setResult(e.target.value as 'pass' | 'fail' | 'adjusted')}
            className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
          >
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
            <option value="adjusted">Adjusted</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-secondary mb-1">Certificate Reference</label>
          <input
            type="text"
            value={certificateReference}
            onChange={e => setCertificateReference(e.target.value)}
            className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
            placeholder="Certificate number"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-secondary mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-stockly-dark/30 dark:focus:ring-stockly/30"
          placeholder="Any additional notes..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-theme-secondary hover:text-theme-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !calibratedBy.trim()}
          className="px-4 py-2 bg-stockly-dark dark:bg-stockly text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Calibration'}
        </button>
      </div>
    </form>
  );
}
