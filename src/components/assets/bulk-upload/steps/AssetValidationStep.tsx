'use client';

import { useState, useMemo } from 'react';
import { CheckCircle, AlertTriangle, XCircle, AlertCircle, Pencil, ChevronDown } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { ASSETLY_IMPORT_FIELDS } from '@/lib/bulk-import/assetly-config';
import type { ParsedRow, ColumnMapping } from '@/lib/bulk-import/types';

type FilterTab = 'all' | 'valid' | 'errors';

interface AssetValidationStepProps {
  rows: ParsedRow[];
  onRowsChange: (rows: ParsedRow[]) => void;
  onNext: () => void;
  onBack: () => void;
  sites: Array<{ id: string; name: string }>;
  columnMappings: ColumnMapping[];
}

export function AssetValidationStep({
  rows,
  onRowsChange,
  onNext,
  onBack,
  sites,
  columnMappings,
}: AssetValidationStepProps) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [bulkSiteId, setBulkSiteId] = useState<string>('');

  const counts = useMemo(() => {
    const valid = rows.filter((r) => r._status === 'valid').length;
    const warnings = rows.filter((r) => r._status === 'warning').length;
    const errors = rows.filter((r) => r._status === 'error').length;
    const included = rows.filter((r) => r._included).length;
    return { valid, warnings, errors, included, total: rows.length };
  }, [rows]);

  const filteredRows = useMemo(() => {
    switch (filter) {
      case 'valid':
        return rows.filter((r) => r._status === 'valid' || r._status === 'warning');
      case 'errors':
        return rows.filter((r) => r._status === 'error');
      default:
        return rows;
    }
  }, [rows, filter]);

  const visibleColumns = useMemo(() => {
    const mapped = columnMappings
      .filter((m) => m.targetField && !m.targetField.startsWith('_'))
      .map((m) => m.targetField!);

    const result: Array<{ key: string; label: string }> = [];
    for (const key of mapped) {
      const field = ASSETLY_IMPORT_FIELDS.find((f) => f.key === key);
      result.push({ key, label: field?.label || key });
    }
    return result;
  }, [columnMappings]);

  const resolveSite = (siteName: string | null) => {
    if (!siteName) return null;
    const lower = siteName.toLowerCase().trim();
    const match = sites.find(
      (s) =>
        s.name.toLowerCase().trim() === lower ||
        s.name.toLowerCase().includes(lower) ||
        lower.includes(s.name.toLowerCase())
    );
    return match ? { name: match.name, matched: true } : { name: siteName, matched: false };
  };

  const toggleRow = (rowIndex: number) => {
    const updated = rows.map((r) => {
      if (r._rowIndex !== rowIndex) return r;
      if (r._status === 'error') return r;
      return { ...r, _included: !r._included };
    });
    onRowsChange(updated);
  };

  const toggleAll = (include: boolean) => {
    const updated = rows.map((r) => ({
      ...r,
      _included: r._status === 'error' ? false : include,
    }));
    onRowsChange(updated);
  };

  const startEdit = (rowIndex: number, field: string, currentValue: string) => {
    setEditingCell({ row: rowIndex, field });
    setEditValue(currentValue || '');
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const updated = rows.map((r) => {
      if (r._rowIndex !== editingCell.row) return r;
      return { ...r, [editingCell.field]: editValue || null };
    });
    import('@/lib/bulk-import/parser').then(({ validateRows }) => {
      const revalidated = validateRows(updated, ASSETLY_IMPORT_FIELDS);
      onRowsChange(revalidated);
    });
    setEditingCell(null);
  };

  const handleBulkSiteChange = (siteId: string) => {
    setBulkSiteId(siteId);
    if (!siteId) return;

    const selectedSite = sites.find((s) => s.id === siteId);
    if (!selectedSite) return;

    const updated = rows.map((r) => ({ ...r, site_name: selectedSite.name }));
    import('@/lib/bulk-import/parser').then(({ validateRows }) => {
      const revalidated = validateRows(updated, ASSETLY_IMPORT_FIELDS);
      onRowsChange(revalidated);
    });
  };

  const getStatusIcon = (status: ParsedRow['_status']) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    }
  };

  const renderCell = (row: ParsedRow, col: { key: string; label: string }) => {
    const value = row[col.key];

    // Editable cell: name (the only required field)
    if (col.key === 'name') {
      if (editingCell?.row === row._rowIndex && editingCell?.field === col.key) {
        return (
          <td key={col.key} className="px-3 py-2 whitespace-nowrap">
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
              className="w-full px-1.5 py-0.5 text-xs bg-theme-surface border border-assetly-dark/50 dark:border-assetly/50 rounded focus:outline-none"
            />
          </td>
        );
      }
      return (
        <td key={col.key} className="px-3 py-2 whitespace-nowrap">
          <span
            onClick={() => startEdit(row._rowIndex, col.key, String(value || ''))}
            className="text-theme-primary cursor-text hover:bg-theme-muted/50 px-1 -mx-1 rounded"
          >
            {value || <span className="text-red-500 italic">missing</span>}
          </span>
        </td>
      );
    }

    // Site column with fuzzy match display
    if (col.key === 'site_name') {
      const siteInfo = resolveSite(value);
      return (
        <td key={col.key} className="px-3 py-2 whitespace-nowrap">
          {siteInfo ? (
            <span className={siteInfo.matched ? 'text-theme-secondary' : 'text-amber-500'}>
              {siteInfo.name}
              {!siteInfo.matched && ' (not found)'}
            </span>
          ) : (
            <span className="text-theme-tertiary">&mdash;</span>
          )}
        </td>
      );
    }

    // All other columns: plain read-only
    return (
      <td key={col.key} className="px-3 py-2 text-theme-secondary whitespace-nowrap">
        {value != null && value !== '' ? String(value) : <span className="text-theme-tertiary">&mdash;</span>}
      </td>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 rounded-lg bg-theme-surface border border-theme text-center">
          <p className="text-lg font-bold text-theme-primary">{counts.total}</p>
          <p className="text-[10px] text-theme-tertiary uppercase">Total</p>
        </div>
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
          <p className="text-lg font-bold text-emerald-500">{counts.valid}</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase">Valid</p>
        </div>
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
          <p className="text-lg font-bold text-amber-500">{counts.warnings}</p>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase">Warnings</p>
        </div>
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
          <p className="text-lg font-bold text-red-500">{counts.errors}</p>
          <p className="text-[10px] text-red-600 dark:text-red-400 uppercase">Errors</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-theme">
        {(['all', 'valid', 'errors'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              filter === tab
                ? 'border-assetly-dark dark:border-assetly text-assetly-dark dark:text-assetly'
                : 'border-transparent text-theme-tertiary hover:text-theme-secondary'
            }`}
          >
            {tab === 'all' ? `All (${counts.total})` :
             tab === 'valid' ? `Valid (${counts.valid + counts.warnings})` :
             `Errors (${counts.errors})`}
          </button>
        ))}
      </div>

      {/* Toolbar: site selector + edit mappings */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 flex-1 p-2.5 rounded-lg bg-theme-surface border border-theme">
          <label className="text-xs text-theme-secondary whitespace-nowrap font-medium">
            Assign site:
          </label>
          <div className="relative flex-1">
            <select
              value={bulkSiteId}
              onChange={(e) => handleBulkSiteChange(e.target.value)}
              className="w-full appearance-none text-xs px-2.5 py-1.5 pr-7 rounded-lg border border-theme bg-theme-surface text-theme-primary focus:outline-none focus:ring-2 focus:ring-assetly-dark/50 dark:focus:ring-assetly/50"
            >
              <option value="">Use CSV data (no override)</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-tertiary pointer-events-none" />
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-assetly-dark dark:text-assetly hover:bg-assetly-dark/10 dark:hover:bg-assetly/10 rounded-lg border border-theme transition-colors whitespace-nowrap"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit Mapping
        </button>
      </div>

      {/* Select all / none */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => toggleAll(true)} className="text-xs text-assetly-dark dark:text-assetly hover:underline">
            Select all
          </button>
          <span className="text-theme-tertiary">|</span>
          <button type="button" onClick={() => toggleAll(false)} className="text-xs text-theme-tertiary hover:text-theme-secondary">
            Clear selection
          </button>
        </div>
        <p className="text-xs text-theme-secondary">
          <span className="font-medium">{counts.included}</span> of {counts.total} rows selected for import
        </p>
      </div>

      {/* Data table */}
      <div className="max-h-[45vh] overflow-auto rounded-lg border border-theme">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-theme-surface-elevated border-b border-theme z-10">
            <tr>
              <th className="w-8 px-2 py-2 sticky left-0 bg-theme-surface-elevated z-20"></th>
              <th className="w-8 px-2 py-2 sticky left-8 bg-theme-surface-elevated z-20"></th>
              <th className="px-3 py-2 text-left text-theme-secondary font-medium sticky left-16 bg-theme-surface-elevated z-20">#</th>
              {visibleColumns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left text-theme-secondary font-medium whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-2 text-left text-theme-secondary font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme/50">
            {filteredRows.map((row) => (
              <tr
                key={row._rowIndex}
                className={`hover:bg-theme-hover/50 transition-colors ${
                  !row._included ? 'opacity-50' : ''
                }`}
              >
                <td className="px-2 py-2 sticky left-0 bg-theme-surface-elevated">
                  <input
                    type="checkbox"
                    checked={row._included}
                    onChange={() => toggleRow(row._rowIndex)}
                    disabled={row._status === 'error'}
                    className="rounded border-theme"
                  />
                </td>
                <td className="px-2 py-2 sticky left-8 bg-theme-surface-elevated">{getStatusIcon(row._status)}</td>
                <td className="px-3 py-2 text-theme-tertiary sticky left-16 bg-theme-surface-elevated">{row._rowIndex}</td>
                {visibleColumns.map((col) => renderCell(row, col))}
                <td className="px-3 py-2 whitespace-nowrap">
                  {row._errors.length > 0 && (
                    <span className="text-red-500">{row._errors[0].message}</span>
                  )}
                  {row._errors.length === 0 && row._warnings.length > 0 && (
                    <span className="text-amber-500">{row._warnings[0]}</span>
                  )}
                  {row._status === 'valid' && row._errors.length === 0 && row._warnings.length === 0 && (
                    <span className="text-emerald-500">Ready</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 4} className="px-4 py-8 text-center text-theme-tertiary">
                  No rows match this filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Unmatched sites warning */}
      {!bulkSiteId && (() => {
        const unmatchedSites = new Set<string>();
        for (const row of rows) {
          if (row.site_name) {
            const info = resolveSite(row.site_name);
            if (info && !info.matched) unmatchedSites.add(row.site_name);
          }
        }
        if (unmatchedSites.size === 0) return null;
        return (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                {unmatchedSites.size} site name{unmatchedSites.size > 1 ? 's' : ''} not found in your sites:
              </p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                {[...unmatchedSites].join(', ')}
              </p>
              <p className="text-xs text-theme-tertiary mt-1">
                These assets will be imported without a site. You can assign sites later.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-theme">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={counts.included === 0}
          className="bg-assetly-dark dark:bg-assetly text-white dark:text-[#1C1916] hover:opacity-90 disabled:opacity-40"
        >
          Import {counts.included} Asset{counts.included !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}
