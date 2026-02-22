"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, ChevronDown, ChevronRight } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
// toast removed per project policy

const GLASSWARE_CATEGORIES = [
  'Beer',
  'Wine',
  'Cocktails',
  'Hot Beverages',
  'Soft Drinks',
  'Spirits',
  'Specialist'
];

const BREAKAGE_RATES = ['Low', 'Medium', 'High'];

export default function GlasswareLibraryPage() {
  const { companyId } = useAppContext();
  // no toast

  const [loading, setLoading] = useState(true);
  const [glassware, setGlassware] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<any | null>(null);
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const isFetchingRef = useRef(false);
  const loadGlassware = async () => {
    if (isFetchingRef.current) return;
    if (!companyId) { setLoading(false); return; }
    let isCancelled = false;
    try {
      isFetchingRef.current = true;
      setLoading(true);
      const { data, error } = await supabase
        .from('glassware_library')
        .select('*')
        .eq('company_id', companyId)
        .order('item_name');
      if (error) throw error;
      if (!isCancelled) setGlassware(data || []);
    } catch (error: any) {
      console.error('Error loading glassware:', error);
    } finally {
      if (!isCancelled) setLoading(false);
      isFetchingRef.current = false;
    }
    return () => { isCancelled = true; };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadGlassware();
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const saveRow = async (id: string) => {
    if (!rowDraft) return;
    try {
      setLoading(true);
      if (!companyId) { console.error('Error saving glassware: Missing company context'); return; }
      const trimmedName = (rowDraft.item_name ?? '').toString().trim();
      if (!trimmedName) { console.error('Validation error: Item name is required'); return; }

      const unitCostRaw = rowDraft.unit_cost;
      const unitCostVal = unitCostRaw === '' || unitCostRaw === null || unitCostRaw === undefined
        ? null
        : parseFloat(String(unitCostRaw));
      if (unitCostVal !== null && Number.isNaN(unitCostVal)) { console.error('Validation error: Unit cost must be a number'); return; }

      const capacityMlRaw = rowDraft.capacity_ml;
      const capacityMlVal = capacityMlRaw === '' || capacityMlRaw === null || capacityMlRaw === undefined
        ? null
        : parseInt(String(capacityMlRaw), 10);
      if (capacityMlVal !== null && Number.isNaN(capacityMlVal)) { console.error('Validation error: Capacity must be a number'); return; }

      const packSizeRaw = rowDraft.pack_size;
      const packSizeVal = packSizeRaw === '' || packSizeRaw === null || packSizeRaw === undefined
        ? null
        : parseInt(String(packSizeRaw), 10);
      if (packSizeVal !== null && Number.isNaN(packSizeVal)) { console.error('Validation error: Pack size must be a number'); return; }

      const reorderLevelRaw = rowDraft.reorder_level;
      const reorderLevelVal = reorderLevelRaw === '' || reorderLevelRaw === null || reorderLevelRaw === undefined
        ? null
        : parseInt(String(reorderLevelRaw), 10);
      if (reorderLevelVal !== null && Number.isNaN(reorderLevelVal)) { console.error('Validation error: Reorder level must be a number'); return; }

      const payload: any = {
        item_name: trimmedName,
        category: rowDraft.category ?? null,
        capacity_ml: capacityMlVal,
        material: rowDraft.material ?? null,
        shape_style: rowDraft.shape_style ?? null,
        recommended_for: rowDraft.recommended_for ?? null,
        supplier: rowDraft.supplier ?? null,
        unit_cost: unitCostVal,
        pack_size: packSizeVal,
        dishwasher_safe: rowDraft.dishwasher_safe ?? true,
        breakage_rate: rowDraft.breakage_rate ?? null,
        storage_location: rowDraft.storage_location ?? null,
        reorder_level: reorderLevelVal,
        notes: rowDraft.notes ?? null,
        company_id: companyId,
      };

      if (newRowIds.has(id)) {
        const { data, error, status, statusText } = await supabase
          .from('glassware_library')
          .insert(payload)
          .select('*')
          .single();
        if (error) {
          console.error('Supabase insert error (glassware_library)', { error, status, statusText, payload });
          throw error;
        }
        console.info('Glassware added');
        setGlassware(prev => prev.map((glass: any) => glass.id === id ? data : glass));
        setNewRowIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
        // ensure UI reflects DB state
        await loadGlassware();
      } else {
        const { company_id: _omitCompanyId, ...updatePayload } = payload;
        const { error, status, statusText } = await supabase
          .from('glassware_library')
          .update(updatePayload)
          .eq('id', id)
          .eq('company_id', companyId);
        if (error) {
          console.error('Supabase update error (glassware_library)', { error, status, statusText, updatePayload, id });
          throw error;
        }
        console.info('Glassware updated');
        setGlassware(prev => prev.map((glass: any) => glass.id === id ? { ...glass, ...updatePayload } : glass));
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
        // ensure UI reflects DB state
        await loadGlassware();
      }
    } catch (error: any) {
      const description = (error && (error.message || (error as any).error_description || (error as any).hint))
        || (typeof error === 'string' ? error : '')
        || (error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : 'Unknown error');
      console.error('Error saving glassware:', error);
      // toast removed; rely on console for now
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this glassware item?')) return;
    try {
      const { error } = await supabase
        .from('glassware_library')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      console.info('Glassware deleted');
      loadGlassware();
    } catch (error: any) {
      console.error('Error deleting glassware:', error);
    }
  };

  const handleEdit = (item: any) => {
    setEditingRowId(item.id);
    setRowDraft({
      item_name: item.item_name || '',
      category: item.category || '',
      capacity_ml: item.capacity_ml ?? '',
      material: item.material || '',
      shape_style: item.shape_style || '',
      recommended_for: item.recommended_for || '',
      supplier: item.supplier || '',
      unit_cost: item.unit_cost ?? '',
      pack_size: item.pack_size ?? '',
      dishwasher_safe: item.dishwasher_safe ?? true,
      breakage_rate: item.breakage_rate || '',
      storage_location: item.storage_location || '',
      reorder_level: item.reorder_level ?? '',
      notes: item.notes || ''
    });
    setExpandedRows(prev => new Set(prev).add(item.id));
  };

  const cancelEdit = (id: string) => {
    if (newRowIds.has(id)) {
      setGlassware(prev => prev.filter((glass: any) => glass.id !== id));
      setNewRowIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
    setEditingRowId(null);
    setRowDraft(null);
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // CSV helpers
  const CSV_HEADERS = [
    'item_name',
    'category',
    'capacity_ml',
    'material',
    'shape_style',
    'recommended_for',
    'supplier',
    'unit_cost',
    'pack_size',
    'dishwasher_safe',
    'breakage_rate',
    'storage_location',
    'reorder_level',
    'notes'
  ];

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const toCSV = (rows: any[]): string => {
    const header = CSV_HEADERS.join(',');
    const body = rows.map((r) => {
      const obj: any = {
        item_name: r.item_name ?? '',
        category: r.category ?? '',
        capacity_ml: r.capacity_ml ?? '',
        material: r.material ?? '',
        shape_style: r.shape_style ?? '',
        recommended_for: r.recommended_for ?? '',
        supplier: r.supplier ?? '',
        unit_cost: r.unit_cost ?? '',
        pack_size: r.pack_size ?? '',
        dishwasher_safe: r.dishwasher_safe ? 'Yes' : 'No',
        breakage_rate: r.breakage_rate ?? '',
        storage_location: r.storage_location ?? '',
        reorder_level: r.reorder_level ?? '',
        notes: r.notes ?? ''
      };
      return CSV_HEADERS.map((h) => escapeCSV(obj[h])).join(',');
    }).join('\n');
    return header + (body ? ('\n' + body) : '');
  };

  const handleDownloadCSV = () => {
    const csv = toCSV(glassware.length ? glassware : []);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'glassware_library.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
          if (ch === '"') {
            if (line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = false; }
          } else { current += ch; }
        } else {
          if (ch === ',') { result.push(current); current = ''; }
          else if (ch === '"') { inQuotes = true; }
          else { current += ch; }
        }
      }
      result.push(current);
      return result;
    };
    const headers = parseLine(lines[0] || '').map(h => h.trim());
    const rows = lines.slice(1).filter(l => l.trim().length > 0).map(parseLine);
    return { headers, rows };
  };

  const handleUploadClick = () => csvInputRef.current?.click();

  const handleUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      if (!headers.length) throw new Error('CSV has no headers');
      const headerIndex: Record<string, number> = {};
      headers.forEach((h, i) => { headerIndex[h] = i; });
      const prepared: any[] = [];
      for (const row of rows) {
        const name = row[headerIndex['item_name']] ?? '';
        if (!name.trim()) continue;
        const unitCostRaw = row[headerIndex['unit_cost']];
        const capacityMlRaw = row[headerIndex['capacity_ml']];
        const packSizeRaw = row[headerIndex['pack_size']];
        const reorderLevelRaw = row[headerIndex['reorder_level']];
        const dishwasherSafeRaw = row[headerIndex['dishwasher_safe']];
        prepared.push({
          company_id: companyId,
          item_name: name.trim(),
          category: row[headerIndex['category']] ?? null,
          capacity_ml: capacityMlRaw && capacityMlRaw.trim() !== '' ? Number(capacityMlRaw) : null,
          material: row[headerIndex['material']] ?? null,
          shape_style: row[headerIndex['shape_style']] ?? null,
          recommended_for: row[headerIndex['recommended_for']] ?? null,
          supplier: row[headerIndex['supplier']] ?? null,
          unit_cost: unitCostRaw && unitCostRaw.trim() !== '' ? Number(unitCostRaw) : null,
          pack_size: packSizeRaw && packSizeRaw.trim() !== '' ? Number(packSizeRaw) : null,
          dishwasher_safe: dishwasherSafeRaw && (dishwasherSafeRaw.toLowerCase() === 'yes' || dishwasherSafeRaw.toLowerCase() === 'true' || dishwasherSafeRaw === '1'),
          breakage_rate: row[headerIndex['breakage_rate']] ?? null,
          storage_location: row[headerIndex['storage_location']] ?? null,
          reorder_level: reorderLevelRaw && reorderLevelRaw.trim() !== '' ? Number(reorderLevelRaw) : null,
          notes: row[headerIndex['notes']] ?? null,
        });
      }
      if (!prepared.length) { console.warn('CSV import: No rows to import'); return; }
      const chunkSize = 500;
      for (let i = 0; i < prepared.length; i += chunkSize) {
        const chunk = prepared.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from('glassware_library')
          .insert(chunk)
          .select('*');
        if (error) throw error;
        setGlassware(prev => [ ...(data || []), ...prev ]);
      }
      console.info(`Import complete: Imported ${prepared.length} row(s)`);
    } catch (err: any) {
      console.error('CSV import error:', err);
      // toast removed
    } finally {
      setLoading(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const filteredItems = glassware.filter((item: any) => {
    const matchesSearch = (item.item_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-cyan-500 rounded-full"></div>
            <div>
              <h1 className="text-lg font-semibold text-theme-primary">Glassware Library</h1>
              <p className="text-sm text-theme-tertiary">Manage glassware items, capacity, and materials</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleUploadClick} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-theme-primary flex items-center gap-2">
            <Upload size={16} />
            Upload CSV
          </button>
          <button onClick={handleDownloadCSV} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-theme-primary flex items-center gap-2">
            <Download size={16} />
            Download CSV
          </button>
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={handleUploadChange} className="hidden" />
          <button
            onClick={() => {
              const tempId = `temp-${Date.now()}`;
              const empty: any = {
                id: tempId,
                item_name: '',
                category: '',
                capacity_ml: null,
                material: '',
                shape_style: '',
                recommended_for: '',
                supplier: '',
                unit_cost: null,
                pack_size: null,
                dishwasher_safe: true,
                breakage_rate: null,
                storage_location: '',
                reorder_level: null,
                notes: ''
              };
              setGlassware(prev => [empty, ...prev]);
              setExpandedRows(prev => new Set(prev).add(tempId));
              setEditingRowId(tempId);
              setRowDraft({ ...empty, capacity_ml: '', unit_cost: '', pack_size: '', reorder_level: '', id: undefined });
              setNewRowIds(prev => new Set(prev).add(tempId));
            }}
            aria-label="Add Glassware"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-module-glow transition"
          >
            <Plus size={18} />
            <span className="sr-only">Add Glassware</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-tertiary" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search glassware..."
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-theme-primary placeholder-neutral-400"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-theme-primary"
        >
          <option value="all">All Categories</option>
          {GLASSWARE_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-theme-tertiary text-center py-8">Loading glassware...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-theme">
          <p className="text-theme-tertiary">No glassware found.</p>
        </div>
      ) : (
        <div className="bg-neutral-800/50 rounded-xl border border-theme overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-900">
              <tr>
                <th className="w-10 px-2" aria-label="Expand" />
                <th className="text-left px-4 py-3 font-semibold text-magenta-400 text-[0.95rem]">Name</th>
                <th className="text-left px-2 py-3 font-semibold text-magenta-400 text-[0.95rem]">Supplier</th>
                <th className="text-left px-2 py-3 font-semibold text-magenta-400 text-[0.95rem]">Cost</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: any) => {
                const expanded = expandedRows.has(item.id);
                return (
                  <React.Fragment key={item.id}>
                    <tr className="border-t border-theme hover:bg-neutral-800/50">
                      <td className="px-2 py-3 align-top">
                        <button aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => toggleRow(item.id)} className="p-1 rounded hover:bg-neutral-800 text-theme-tertiary">
                          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-theme-primary">
                        {editingRowId === item.id ? (
                          <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.item_name ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, item_name: e.target.value }))} />
                        ) : (
                          item.item_name
                        )}
                      </td>
                      <td className="px-2 py-3 text-theme-tertiary text-sm whitespace-nowrap">
                        {editingRowId === item.id ? (
                          <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.supplier ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, supplier: e.target.value }))} />
                        ) : (
                          item.supplier || '-'
                        )}
                      </td>
                      <td className="px-2 py-3 text-theme-tertiary text-sm whitespace-nowrap">
                        {editingRowId === item.id ? (
                          <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.unit_cost ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, unit_cost: e.target.value }))} />
                        ) : (
                          item.unit_cost ? `£${item.unit_cost}` : '-'
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-t border-neutral-800/60">
                        <td colSpan={4} className="px-4 py-4 bg-neutral-900/40">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Category</div>
                              {editingRowId === item.id ? (
                                <select className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.category ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, category: e.target.value }))}>
                                  <option value="">Select...</option>
                                  {GLASSWARE_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                                </select>
                              ) : (
                                <div className="text-sm text-theme-primary">{item.category || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Capacity (ml)</div>
                              {editingRowId === item.id ? (
                                <input type="number" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.capacity_ml ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, capacity_ml: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.capacity_ml ? `${item.capacity_ml}ml` : '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Material</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.material ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, material: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.material || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Shape/Style</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.shape_style ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, shape_style: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.shape_style || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Recommended For</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.recommended_for ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, recommended_for: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.recommended_for || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Pack Size</div>
                              {editingRowId === item.id ? (
                                <input type="number" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.pack_size ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, pack_size: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.pack_size || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Dishwasher Safe</div>
                              {editingRowId === item.id ? (
                                <select className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.dishwasher_safe ? 'true' : 'false'} onChange={(e) => setRowDraft((d: any) => ({ ...d, dishwasher_safe: e.target.value === 'true' }))}>
                                  <option value="true">Yes</option>
                                  <option value="false">No</option>
                                </select>
                              ) : (
                                <div className="text-sm text-theme-primary">
                                  {item.dishwasher_safe ? (
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Yes</span>
                                  ) : (
                                    <span className="px-2 py-1 bg-neutral-700 text-theme-tertiary rounded-full text-xs">No</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Breakage Rate</div>
                              {editingRowId === item.id ? (
                                <select className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.breakage_rate ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, breakage_rate: e.target.value }))}>
                                  <option value="">Select...</option>
                                  {BREAKAGE_RATES.map(rate => (<option key={rate} value={rate}>{rate}</option>))}
                                </select>
                              ) : (
                                <div className="text-sm text-theme-primary">{item.breakage_rate || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Storage Location</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.storage_location ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, storage_location: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.storage_location || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Reorder Level</div>
                              {editingRowId === item.id ? (
                                <input type="number" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.reorder_level ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, reorder_level: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.reorder_level || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs text-theme-tertiary">Notes</div>
                              {editingRowId === item.id ? (
                                <textarea className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary min-h-[80px]" value={rowDraft?.notes ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, notes: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary whitespace-pre-wrap">{item.notes || '-'}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            {editingRowId === item.id ? (
                              <>
                                <button onClick={() => saveRow(item.id)} className="px-3 py-2 rounded-lg border border-magenta-500/60 text-theme-primary bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-module-glow transition flex items-center gap-2">
                                  <Save size={16} className="text-magenta-400" />
                                  <span>Save</span>
                                </button>
                                <button onClick={() => cancelEdit(item.id)} className="px-3 py-2 rounded-lg border border-neutral-600 text-theme-primary bg-white/5 backdrop-blur-sm hover:bg-white/10 transition flex items-center gap-2">
                                  <X size={16} className="text-theme-tertiary" />
                                  <span>Cancel</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button aria-label="Edit Glassware" onClick={() => handleEdit(item)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-module-glow transition">
                                  <Edit size={16} />
                                  <span className="sr-only">Edit</span>
                                </button>
                                <button aria-label="Delete Glassware" onClick={() => handleDelete(item.id)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-500/60 text-red-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-red-400 hover:shadow-module-glow transition">
                                  <Trash2 size={16} />
                                  <span className="sr-only">Delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Inline add/edit pattern applied; modal removed */}
    </div>
  );
}
