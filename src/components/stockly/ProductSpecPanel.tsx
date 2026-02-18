// @salsa - SALSA Compliance: Product specification view/edit panel
'use client';

import { useState, useEffect } from 'react';
import { Save, History, FileText, Thermometer, Clock, AlertTriangle } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import { UK_ALLERGENS, allergenKeyToLabel } from '@/lib/stockly/allergens';
import type { ProductSpecification, ProductSpecificationHistory } from '@/lib/types/stockly';

// @salsa
const STORAGE_CONDITIONS = [
  { label: 'Ambient', value: 'ambient' },
  { label: 'Chilled (0-5°C)', value: 'chilled' },
  { label: 'Frozen (-18°C)', value: 'frozen' },
  { label: 'Dry Storage', value: 'dry' },
  { label: 'Cool & Dry', value: 'cool_dry' },
];

const SHELF_LIFE_UNITS = [
  { label: 'Days', value: 'days' },
  { label: 'Weeks', value: 'weeks' },
  { label: 'Months', value: 'months' },
];

interface ProductSpecPanelProps {
  stockItemId: string;
  companyId: string;
  stockItemName?: string;
}

export default function ProductSpecPanel({ stockItemId, companyId, stockItemName }: ProductSpecPanelProps) {
  const [spec, setSpec] = useState<ProductSpecification | null>(null);
  const [history, setHistory] = useState<ProductSpecificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Form state
  const [allergens, setAllergens] = useState<string[]>([]);
  const [mayContain, setMayContain] = useState<string[]>([]);
  const [storageTempMin, setStorageTempMin] = useState('');
  const [storageTempMax, setStorageTempMax] = useState('');
  const [storageConditions, setStorageConditions] = useState('');
  const [shelfLifeDays, setShelfLifeDays] = useState('');
  const [shelfLifeUnit, setShelfLifeUnit] = useState('days');
  const [handlingInstructions, setHandlingInstructions] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [nextReviewDate, setNextReviewDate] = useState('');

  useEffect(() => {
    fetchSpec();
  }, [stockItemId]);

  async function fetchSpec() {
    try {
      setLoading(true);
      const res = await fetch(`/api/stockly/specifications?stock_item_id=${stockItemId}`);
      const result = await res.json();

      if (result.success && result.data && result.data.length > 0) {
        const s = result.data[0];
        setSpec(s);
        setAllergens(s.allergens || []);
        setMayContain(s.may_contain_allergens || []);
        setStorageTempMin(s.storage_temp_min?.toString() || '');
        setStorageTempMax(s.storage_temp_max?.toString() || '');
        setStorageConditions(s.storage_conditions || '');
        setShelfLifeDays(s.shelf_life_days?.toString() || '');
        setShelfLifeUnit(s.shelf_life_unit || 'days');
        setHandlingInstructions(s.handling_instructions || '');
        setCountryOfOrigin(s.country_of_origin || '');
        setNextReviewDate(s.next_review_date || '');

        // Fetch history if spec exists
        const histRes = await fetch(`/api/stockly/specifications/${s.id}`);
        const histResult = await histRes.json();
        if (histResult.success) {
          setHistory(histResult.data.history || []);
        }
      }
    } catch (err) {
      // Table may not exist yet
    } finally {
      setLoading(false);
    }
  }

  function toggleAllergen(key: string) {
    setAllergens(prev => prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]);
  }

  function toggleMayContain(key: string) {
    setMayContain(prev => prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]);
  }

  // @salsa — Save specification (create or update)
  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        stock_item_id: stockItemId,
        allergens: allergens.length > 0 ? allergens : null,
        may_contain_allergens: mayContain.length > 0 ? mayContain : null,
        storage_temp_min: storageTempMin ? parseFloat(storageTempMin) : null,
        storage_temp_max: storageTempMax ? parseFloat(storageTempMax) : null,
        storage_conditions: storageConditions || null,
        shelf_life_days: shelfLifeDays ? parseInt(shelfLifeDays) : null,
        shelf_life_unit: shelfLifeUnit,
        handling_instructions: handlingInstructions || null,
        country_of_origin: countryOfOrigin || null,
        next_review_date: nextReviewDate || null,
      };

      if (spec) {
        // Update existing
        const res = await fetch(`/api/stockly/specifications/${spec.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error);
        toast.success(`Specification updated (v${result.data.version_number})`);
      } else {
        // Create new
        const res = await fetch('/api/stockly/specifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error);
        toast.success('Specification created');
      }

      fetchSpec();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save specification');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-theme-tertiary text-sm py-4">Loading specification...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Version badge */}
      {spec && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-module-fg/15 text-module-fg">
              v{spec.version_number}
            </span>
            {spec.last_reviewed_at && (
              <span className="text-xs text-theme-tertiary">
                Last reviewed: {new Date(spec.last_reviewed_at).toLocaleDateString('en-GB')}
              </span>
            )}
          </div>
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-xs text-theme-tertiary hover:text-theme-secondary"
            >
              <History className="w-3.5 h-3.5" />
              {history.length} version{history.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Version History (collapsible) */}
      {showHistory && history.length > 0 && (
        <div className="bg-theme-button border border-theme rounded-lg p-3 space-y-2">
          <h4 className="text-xs font-medium text-theme-tertiary uppercase tracking-wider">Version History</h4>
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between text-xs py-1 border-b border-theme last:border-0">
              <span className="text-theme-secondary">v{h.version_number}</span>
              <span className="text-theme-tertiary">{h.change_notes || 'Updated'}</span>
              <span className="text-theme-tertiary">
                {new Date(h.archived_at).toLocaleDateString('en-GB')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Allergens — Contains */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-theme-tertiary mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Contains (Allergens)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-3">
          {UK_ALLERGENS.map((a) => (
            <label key={a.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allergens.includes(a.key)}
                onChange={() => toggleAllergen(a.key)}
                className="w-4 h-4 rounded bg-gray-800/50 border-gray-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-theme-tertiary">{a.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* May Contain */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-theme-tertiary mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          May Contain (Cross-contamination)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-3">
          {UK_ALLERGENS.map((a) => (
            <label key={a.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mayContain.includes(a.key)}
                onChange={() => toggleMayContain(a.key)}
                className="w-4 h-4 rounded bg-gray-800/50 border-gray-700 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm text-theme-tertiary">{a.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Storage & Shelf Life */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-theme-tertiary mb-3 flex items-center gap-1.5">
          <Thermometer className="w-3.5 h-3.5" />
          Storage & Shelf Life
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-theme-tertiary mb-1">Storage Conditions</label>
            <Select
              value={storageConditions}
              onValueChange={setStorageConditions}
              options={STORAGE_CONDITIONS}
              placeholder="Select..."
            />
          </div>
          <div>
            <label className="block text-xs text-theme-tertiary mb-1">Temp Min (°C)</label>
            <Input type="number" step="0.1" value={storageTempMin} onChange={(e) => setStorageTempMin(e.target.value)} placeholder="e.g., 0" />
          </div>
          <div>
            <label className="block text-xs text-theme-tertiary mb-1">Temp Max (°C)</label>
            <Input type="number" step="0.1" value={storageTempMax} onChange={(e) => setStorageTempMax(e.target.value)} placeholder="e.g., 5" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-xs text-theme-tertiary mb-1">Shelf Life</label>
            <Input type="number" value={shelfLifeDays} onChange={(e) => setShelfLifeDays(e.target.value)} placeholder="e.g., 14" />
          </div>
          <div>
            <label className="block text-xs text-theme-tertiary mb-1">Unit</label>
            <Select value={shelfLifeUnit} onValueChange={setShelfLifeUnit} options={SHELF_LIFE_UNITS} />
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-theme-tertiary mb-1">Country of Origin</label>
          <Input value={countryOfOrigin} onChange={(e) => setCountryOfOrigin(e.target.value)} placeholder="e.g., United Kingdom" />
        </div>
        <div>
          <label className="block text-xs text-theme-tertiary mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Next Review Date
          </label>
          <Input type="date" value={nextReviewDate} onChange={(e) => setNextReviewDate(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-theme-tertiary mb-1">Handling Instructions</label>
        <textarea
          value={handlingInstructions}
          onChange={(e) => setHandlingInstructions(e.target.value)}
          placeholder="Special handling, temperature requirements, etc."
          rows={2}
          className="w-full px-3 py-2 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-1 focus:ring-module-fg/50 resize-none"
        />
      </div>

      {/* Save */}
      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving} variant="secondary" className="w-full sm:w-auto">
          <Save className="w-4 h-4 mr-1.5" />
          {saving ? 'Saving...' : spec ? 'Update Specification' : 'Create Specification'}
        </Button>
      </div>
    </div>
  );
}
