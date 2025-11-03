"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, ChevronDown, ChevronRight, UtensilsCrossed } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
// toast removed per project policy

const SERVING_EQUIPMENT_CATEGORIES = [
  'Platters',
  'Bowls',
  'Baskets',
  'Trays',
  'Stands',
  'Boards',
  'Dishes',
  'Holders',
  'Pots & Pans',
  'Knives',
  'Utensils',
  'Tools',
  'Mixers',
  'Blenders',
  'Measuring',
  'Thermometers',
  'Scrapers',
  'Strainers',
  'Other'
];

const SHAPE_OPTIONS = ['Round', 'Oval', 'Square', 'Rectangular', 'Irregular'];
const COLOR_CODING_OPTIONS = ['Red', 'Blue', 'Green', 'Yellow', 'Brown', 'White', 'N/A'];

export default function ServingEquipmentLibraryPage() {
  const { companyId } = useAppContext();
  // no toast

  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<any | null>(null);
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const isFetchingRef = useRef(false);
  const loadEquipment = async () => {
    if (isFetchingRef.current) return;
    if (!companyId) { setLoading(false); return; }
    let isCancelled = false;
    try {
      isFetchingRef.current = true;
      setLoading(true);
      const { data, error } = await supabase
        .from('serving_equipment_library')
        .select('*')
        .eq('company_id', companyId)
        .order('item_name');
      if (error) throw error;
      if (!isCancelled) setEquipment(data || []);
    } catch (error: any) {
      console.error('Error loading serving equipment:', error);
    } finally {
      if (!isCancelled) setLoading(false);
      isFetchingRef.current = false;
    }
    return () => { isCancelled = true; };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadEquipment();
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const saveRow = async (id: string) => {
    if (!rowDraft) return;
    try {
      setLoading(true);
      if (!companyId) { console.error('Error saving serving equipment: Missing company context'); return; }
      const trimmedName = (rowDraft.item_name ?? '').toString().trim();
      if (!trimmedName) { console.error('Validation error: Item name is required'); return; }

      const unitCostRaw = rowDraft.unit_cost;
      const unitCostVal = unitCostRaw === '' || unitCostRaw === null || unitCostRaw === undefined
        ? null
        : parseFloat(String(unitCostRaw));
      if (unitCostVal !== null && Number.isNaN(unitCostVal)) { console.error('Validation error: Unit cost must be a number'); return; }

      const payload: any = {
        item_name: trimmedName,
        category: rowDraft.category ?? null,
        material: rowDraft.material ?? null,
        size_dimensions: rowDraft.size_dimensions ?? null,
        shape: rowDraft.shape ?? null,
        use_case: rowDraft.use_case ?? null,
        color_finish: rowDraft.color_finish ?? null,
        dishwasher_safe: rowDraft.dishwasher_safe ?? true,
        oven_safe: rowDraft.oven_safe ?? false,
        supplier: rowDraft.supplier ?? null,
        brand: rowDraft.brand ?? null,
        color_coding: rowDraft.color_coding ?? null,
        unit_cost: unitCostVal,
        storage_location: rowDraft.storage_location ?? null,
        notes: rowDraft.notes ?? null,
        company_id: companyId,
      };

      if (newRowIds.has(id)) {
        const { data, error, status, statusText } = await supabase
          .from('serving_equipment_library')
          .insert(payload)
          .select('*')
          .single();
        if (error) {
          console.error('Supabase insert error (serving_equipment_library)', { error, status, statusText, payload });
          throw error;
        }
        console.info('Serving equipment added');
        setEquipment(prev => prev.map((eq: any) => eq.id === id ? data : eq));
        setNewRowIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
        await loadEquipment();
      } else {
        const { company_id: _omitCompanyId, ...updatePayload } = payload;
        const { error, status, statusText } = await supabase
          .from('serving_equipment_library')
          .update(updatePayload)
          .eq('id', id)
          .eq('company_id', companyId);
        if (error) {
          console.error('Supabase update error (serving_equipment_library)', { error, status, statusText, updatePayload, id });
          throw error;
        }
        console.info('Serving equipment updated');
        setEquipment(prev => prev.map((eq: any) => eq.id === id ? { ...eq, ...updatePayload } : eq));
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
        await loadEquipment();
      }
    } catch (error: any) {
      const description = (error && (error.message || (error as any).error_description || (error as any).hint))
        || (typeof error === 'string' ? error : '')
        || (error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : 'Unknown error');
      console.error('Error saving serving equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this serving equipment item?')) return;
    try {
      const { error } = await supabase
        .from('serving_equipment_library')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      console.info('Serving equipment deleted');
      loadEquipment();
    } catch (error: any) {
      console.error('Error deleting serving equipment:', error);
    }
  };

  const handleEdit = (item: any) => {
    setEditingRowId(item.id);
    setRowDraft({
      item_name: item.item_name || '',
      category: item.category || '',
      material: item.material || '',
      size_dimensions: item.size_dimensions || '',
      shape: item.shape || '',
      use_case: item.use_case || '',
      color_finish: item.color_finish || '',
      dishwasher_safe: item.dishwasher_safe ?? true,
      oven_safe: item.oven_safe ?? false,
      supplier: item.supplier || '',
      brand: item.brand || '',
      color_coding: item.color_coding || '',
      unit_cost: item.unit_cost ?? '',
      storage_location: item.storage_location || '',
      notes: item.notes || ''
    });
    setExpandedRows(prev => new Set(prev).add(item.id));
  };

  const cancelEdit = (id: string) => {
    if (newRowIds.has(id)) {
      setEquipment(prev => prev.filter((eq: any) => eq.id !== id));
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
    'material',
    'size_dimensions',
    'shape',
    'use_case',
    'color_finish',
    'dishwasher_safe',
    'oven_safe',
    'supplier',
    'brand',
    'color_coding',
    'unit_cost',
    'storage_location',
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
        material: r.material ?? '',
        size_dimensions: r.size_dimensions ?? '',
        shape: r.shape ?? '',
        use_case: r.use_case ?? '',
        color_finish: r.color_finish ?? '',
        dishwasher_safe: r.dishwasher_safe ? 'Yes' : 'No',
        oven_safe: r.oven_safe ? 'Yes' : 'No',
        supplier: r.supplier ?? '',
        brand: r.brand ?? '',
        color_coding: r.color_coding ?? '',
        unit_cost: r.unit_cost ?? '',
        storage_location: r.storage_location ?? '',
        notes: r.notes ?? ''
      };
      return CSV_HEADERS.map((h) => escapeCSV(obj[h])).join(',');
    }).join('\n');
    return header + (body ? ('\n' + body) : '');
  };

  const handleDownloadCSV = () => {
    const csv = toCSV(equipment.length ? equipment : []);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'serving_equipment_library.csv';
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
        const dishwasherRaw = row[headerIndex['dishwasher_safe']];
        const ovenRaw = row[headerIndex['oven_safe']];
        prepared.push({
          company_id: companyId,
          item_name: name.trim(),
          category: row[headerIndex['category']] ?? null,
          material: row[headerIndex['material']] ?? null,
          size_dimensions: row[headerIndex['size_dimensions']] ?? null,
          shape: row[headerIndex['shape']] ?? null,
          use_case: row[headerIndex['use_case']] ?? null,
          color_finish: row[headerIndex['color_finish']] ?? null,
          dishwasher_safe: dishwasherRaw && (dishwasherRaw.toLowerCase() === 'yes' || dishwasherRaw.toLowerCase() === 'true' || dishwasherRaw === '1'),
          oven_safe: ovenRaw && (ovenRaw.toLowerCase() === 'yes' || ovenRaw.toLowerCase() === 'true' || ovenRaw === '1'),
          supplier: row[headerIndex['supplier']] ?? null,
          brand: row[headerIndex['brand']] ?? null,
          color_coding: row[headerIndex['color_coding']] ?? null,
          unit_cost: unitCostRaw && unitCostRaw.trim() !== '' ? Number(unitCostRaw) : null,
          storage_location: row[headerIndex['storage_location']] ?? null,
          notes: row[headerIndex['notes']] ?? null,
        });
      }
      if (!prepared.length) { console.warn('CSV import: No rows to import'); return; }
      const chunkSize = 500;
      for (let i = 0; i < prepared.length; i += chunkSize) {
        const chunk = prepared.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from('serving_equipment_library')
          .insert(chunk)
          .select('*');
        if (error) throw error;
        setEquipment(prev => [ ...(data || []), ...prev ]);
      }
      console.info(`Import complete: Imported ${prepared.length} row(s)`);
    } catch (err: any) {
      console.error('CSV import error:', err);
    } finally {
      setLoading(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const filteredItems = equipment.filter((item: any) => {
    const matchesSearch = (item.item_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-pink-500 rounded-full"></div>
            <div>
              <h1 className="text-lg font-semibold text-white">Serving Equipment</h1>
              <p className="text-sm text-neutral-400">Utensils, plates, trays, and bar tools</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleUploadClick} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white flex items-center gap-2">
            <Upload size={16} />
            Upload CSV
          </button>
          <button onClick={handleDownloadCSV} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white flex items-center gap-2">
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
                material: '',
                size_dimensions: '',
                shape: '',
                use_case: '',
                color_finish: '',
                dishwasher_safe: true,
                oven_safe: false,
                supplier: '',
                brand: '',
                color_coding: '',
                unit_cost: null,
                storage_location: '',
                notes: ''
              };
              setEquipment(prev => [empty, ...prev]);
              setExpandedRows(prev => new Set(prev).add(tempId));
              setEditingRowId(tempId);
              setRowDraft({ ...empty, unit_cost: '', id: undefined });
              setNewRowIds(prev => new Set(prev).add(tempId));
            }}
            aria-label="Add Serving Equipment"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-[0_0_14px_rgba(233,0,126,0.55)] transition"
          >
            <Plus size={18} />
            <span className="sr-only">Add Serving Equipment</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search serving equipment..."
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Categories</option>
          {SERVING_EQUIPMENT_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-neutral-400 text-center py-8">Loading serving equipment...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-neutral-700">
          <p className="text-neutral-400">No serving equipment found.</p>
        </div>
      ) : (
        <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden">
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
                    <tr className="border-t border-neutral-700 hover:bg-neutral-800/50">
                      <td className="px-2 py-3 align-top">
                        <button aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => toggleRow(item.id)} className="p-1 rounded hover:bg-neutral-800 text-neutral-300">
                          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-white">
                        {editingRowId === item.id ? (
                          <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.item_name ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, item_name: e.target.value }))} />
                        ) : (
                          item.item_name
                        )}
                      </td>
                      <td className="px-2 py-3 text-neutral-400 text-sm whitespace-nowrap">
                        {editingRowId === item.id ? (
                          <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.supplier ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, supplier: e.target.value }))} />
                        ) : (
                          item.supplier || '-'
                        )}
                      </td>
                      <td className="px-2 py-3 text-neutral-400 text-sm whitespace-nowrap">
                        {editingRowId === item.id ? (
                          <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.unit_cost ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, unit_cost: e.target.value }))} />
                        ) : (
                          item.unit_cost ? `£${Number(item.unit_cost).toFixed(2)}` : '-'
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-t border-neutral-800/60">
                        <td colSpan={4} className="px-4 py-4 bg-neutral-900/40">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Category</div>
                              {editingRowId === item.id ? (
                                <select className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.category ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, category: e.target.value }))}>
                                  <option value="">Select...</option>
                                  {SERVING_EQUIPMENT_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                                </select>
                              ) : (
                                <div className="text-sm text-white">{item.category || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Material</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.material ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, material: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.material || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Size/Dimensions</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.size_dimensions ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, size_dimensions: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.size_dimensions || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Shape</div>
                              {editingRowId === item.id ? (
                                <select className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.shape ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, shape: e.target.value }))}>
                                  <option value="">Select...</option>
                                  {SHAPE_OPTIONS.map(shape => (<option key={shape} value={shape}>{shape}</option>))}
                                </select>
                              ) : (
                                <div className="text-sm text-white">{item.shape || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Use Case</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.use_case ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, use_case: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.use_case || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Color/Finish</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.color_finish ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, color_finish: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.color_finish || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Dishwasher Safe</div>
                              {editingRowId === item.id ? (
                                <select className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.dishwasher_safe ? 'true' : 'false'} onChange={(e) => setRowDraft((d: any) => ({ ...d, dishwasher_safe: e.target.value === 'true' }))}>
                                  <option value="true">Yes</option>
                                  <option value="false">No</option>
                                </select>
                              ) : (
                                <div className="text-sm text-white">
                                  {item.dishwasher_safe ? (
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Yes</span>
                                  ) : (
                                    <span className="px-2 py-1 bg-neutral-700 text-neutral-400 rounded-full text-xs">No</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Oven Safe</div>
                              {editingRowId === item.id ? (
                                <select className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.oven_safe ? 'true' : 'false'} onChange={(e) => setRowDraft((d: any) => ({ ...d, oven_safe: e.target.value === 'true' }))}>
                                  <option value="false">No</option>
                                  <option value="true">Yes</option>
                                </select>
                              ) : (
                                <div className="text-sm text-white">
                                  {item.oven_safe ? (
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Yes</span>
                                  ) : (
                                    <span className="px-2 py-1 bg-neutral-700 text-neutral-400 rounded-full text-xs">No</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Supplier</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.supplier ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, supplier: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.supplier || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Brand</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.brand ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, brand: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.brand || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Color Coding</div>
                              {editingRowId === item.id ? (
                                <select className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.color_coding ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, color_coding: e.target.value }))}>
                                  <option value="">Select...</option>
                                  {COLOR_CODING_OPTIONS.map(color => (<option key={color} value={color}>{color}</option>))}
                                </select>
                              ) : (
                                <div className="text-sm text-white">
                                  {item.color_coding ? (
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      item.color_coding === 'Red' ? 'bg-red-500/20 text-red-400' :
                                      item.color_coding === 'Blue' ? 'bg-blue-500/20 text-blue-400' :
                                      item.color_coding === 'Green' ? 'bg-green-500/20 text-green-400' :
                                      item.color_coding === 'Yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                                      item.color_coding === 'Brown' ? 'bg-amber-700/20 text-amber-400' :
                                      item.color_coding === 'White' ? 'bg-white/20 text-white' :
                                      'bg-neutral-700 text-neutral-400'
                                    }`}>{item.color_coding}</span>
                                  ) : '-'}
                                </div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Unit Cost</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.unit_cost ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, unit_cost: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.unit_cost ? `£${Number(item.unit_cost).toFixed(2)}` : '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Storage Location</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.storage_location ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, storage_location: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.storage_location || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs text-neutral-400">Notes</div>
                              {editingRowId === item.id ? (
                                <textarea className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white min-h-[80px]" value={rowDraft?.notes ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, notes: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white whitespace-pre-wrap">{item.notes || '-'}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            {editingRowId === item.id ? (
                              <>
                                <button onClick={() => saveRow(item.id)} className="px-3 py-2 rounded-lg border border-magenta-500/60 text-white bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-[0_0_14px_rgba(233,0,126,0.55)] transition flex items-center gap-2">
                                  <Save size={16} className="text-magenta-400" />
                                  <span>Save</span>
                                </button>
                                <button onClick={() => cancelEdit(item.id)} className="px-3 py-2 rounded-lg border border-neutral-600 text-white bg-white/5 backdrop-blur-sm hover:bg-white/10 transition flex items-center gap-2">
                                  <X size={16} className="text-neutral-300" />
                                  <span>Cancel</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button aria-label="Edit Serving Equipment" onClick={() => handleEdit(item)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-[0_0_14px_rgba(233,0,126,0.55)] transition">
                                  <Edit size={16} />
                                  <span className="sr-only">Edit</span>
                                </button>
                                <button aria-label="Delete Serving Equipment" onClick={() => handleDelete(item.id)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-500/60 text-red-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-red-400 hover:shadow-[0_0_14px_rgba(239,68,68,0.55)] transition">
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
    </div>
  );
}
