"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
// toast removed per project policy

const DRINK_CATEGORIES = [
  'Spirit',
  'Liqueur',
  'Mixer',
  'Garnish',
  'Bitters',
  'Syrup',
  'Fresh Produce'
];

export default function DrinksLibraryPage() {
  const { companyId } = useAppContext();
  // no toast

  const [loading, setLoading] = useState(true);
  const [drinks, setDrinks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<any | null>(null);
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const isFetchingRef = useRef(false);
  const loadDrinks = async () => {
    if (isFetchingRef.current) return;
    if (!companyId) { setLoading(false); return; }
    let isCancelled = false;
    try {
      isFetchingRef.current = true;
      setLoading(true);
      const { data, error } = await supabase
        .from('drinks_library')
        .select('*')
        .eq('company_id', companyId)
        .order('item_name');
      if (error) throw error;
      if (!isCancelled) setDrinks(data || []);
    } catch (error: any) {
      console.error('Error loading drinks:', error);
    } finally {
      if (!isCancelled) setLoading(false);
      isFetchingRef.current = false;
    }
    return () => { isCancelled = true; };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadDrinks();
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const saveRow = async (id: string) => {
    if (!rowDraft) return;
    try {
      setLoading(true);
      if (!companyId) { console.error('Error saving drink: Missing company context'); return; }
      const trimmedName = (rowDraft.item_name ?? '').toString().trim();
      if (!trimmedName) { console.error('Validation error: Item name is required'); return; }

      const abvRaw = rowDraft.abv;
      const abvVal = abvRaw === '' || abvRaw === null || abvRaw === undefined
        ? null
        : parseFloat(String(abvRaw));
      if (abvVal !== null && Number.isNaN(abvVal)) { console.error('Validation error: ABV must be a number'); return; }

      const unitCostRaw = rowDraft.unit_cost;
      const unitCostVal = unitCostRaw === '' || unitCostRaw === null || unitCostRaw === undefined
        ? null
        : parseFloat(String(unitCostRaw));
      if (unitCostVal !== null && Number.isNaN(unitCostVal)) { console.error('Validation error: Unit cost must be a number'); return; }

      const allergensVal = Array.isArray(rowDraft.allergens)
        ? rowDraft.allergens.map((s: any) => (s == null ? '' : String(s))).filter((s: string) => s.length > 0)
        : [];

      const payload: any = {
        item_name: trimmedName,
        category: rowDraft.category ?? null,
        sub_category: rowDraft.sub_category ?? null,
        abv: abvVal,
        allergens: allergensVal,
        unit: rowDraft.unit ?? null,
        unit_cost: unitCostVal,
        supplier: rowDraft.supplier ?? null,
        pack_size: rowDraft.pack_size ?? null,
        storage_type: rowDraft.storage_type ?? null,
        shelf_life: rowDraft.shelf_life ?? null,
        notes: rowDraft.notes ?? null,
        company_id: companyId,
      };

      if (newRowIds.has(id)) {
        const { data, error, status, statusText } = await supabase
          .from('drinks_library')
          .insert(payload)
          .select('*')
          .single();
        if (error) {
          console.error('Supabase insert error (drinks_library)', { error, status, statusText, payload });
          throw error;
        }
        console.info('Drink added');
        setDrinks(prev => prev.map((drink: any) => drink.id === id ? data : drink));
        setNewRowIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
        // ensure UI reflects DB state
        await loadDrinks();
      } else {
        const { company_id: _omitCompanyId, ...updatePayload } = payload;
        const { error, status, statusText } = await supabase
          .from('drinks_library')
          .update(updatePayload)
          .eq('id', id)
          .eq('company_id', companyId);
        if (error) {
          console.error('Supabase update error (drinks_library)', { error, status, statusText, updatePayload, id });
          throw error;
        }
        console.info('Drink updated');
        setDrinks(prev => prev.map((drink: any) => drink.id === id ? { ...drink, ...updatePayload } : drink));
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
        // ensure UI reflects DB state
        await loadDrinks();
      }
    } catch (error: any) {
      const description = (error && (error.message || (error as any).error_description || (error as any).hint))
        || (typeof error === 'string' ? error : '')
        || (error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : 'Unknown error');
      console.error('Error saving drink:', error);
      // toast removed; rely on console for now
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this drink item?')) return;
    try {
      const { error } = await supabase
        .from('drinks_library')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      console.info('Drink deleted');
      loadDrinks();
    } catch (error: any) {
      console.error('Error deleting drink:', error);
    }
  };

  const handleEdit = (item: any) => {
    setEditingRowId(item.id);
    setRowDraft({
      item_name: item.item_name || '',
      category: item.category || '',
      sub_category: item.sub_category || '',
      abv: item.abv ?? '',
      allergens: item.allergens || [],
      unit: item.unit || '',
      unit_cost: item.unit_cost ?? '',
      supplier: item.supplier || '',
      pack_size: item.pack_size || '',
      storage_type: item.storage_type || '',
      shelf_life: item.shelf_life || '',
      notes: item.notes || ''
    });
    setExpandedRows(prev => new Set(prev).add(item.id));
  };

  const cancelEdit = (id: string) => {
    if (newRowIds.has(id)) {
      setDrinks(prev => prev.filter((drink: any) => drink.id !== id));
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
    'sub_category',
    'abv',
    'allergens',
    'unit',
    'unit_cost',
    'supplier',
    'pack_size',
    'storage_type',
    'shelf_life',
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
        sub_category: r.sub_category ?? '',
        abv: r.abv ?? '',
        allergens: (r.allergens || []).join('; '),
        unit: r.unit ?? '',
        unit_cost: r.unit_cost ?? '',
        supplier: r.supplier ?? '',
        pack_size: r.pack_size ?? '',
        storage_type: r.storage_type ?? '',
        shelf_life: r.shelf_life ?? '',
        notes: r.notes ?? ''
      };
      return CSV_HEADERS.map((h) => escapeCSV(obj[h])).join(',');
    }).join('\n');
    return header + (body ? ('\n' + body) : '');
  };

  const handleDownloadCSV = () => {
    const csv = toCSV(drinks.length ? drinks : []);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drinks_library.csv';
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

  const normaliseArrayCell = (cell: string): string[] => {
    if (!cell) return [];
    return cell.split(/[,;]/).map(s => s.trim()).filter(Boolean);
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
        const abvRaw = row[headerIndex['abv']];
        const unitCostRaw = row[headerIndex['unit_cost']];
        const allergensRaw = row[headerIndex['allergens']];
        prepared.push({
          company_id: companyId,
          item_name: name.trim(),
          category: row[headerIndex['category']] ?? null,
          sub_category: row[headerIndex['sub_category']] ?? null,
          abv: abvRaw && abvRaw.trim() !== '' ? Number(abvRaw) : null,
          allergens: normaliseArrayCell(allergensRaw),
          unit: row[headerIndex['unit']] ?? null,
          unit_cost: unitCostRaw && unitCostRaw.trim() !== '' ? Number(unitCostRaw) : null,
          supplier: row[headerIndex['supplier']] ?? null,
          pack_size: row[headerIndex['pack_size']] ?? null,
          storage_type: row[headerIndex['storage_type']] ?? null,
          shelf_life: row[headerIndex['shelf_life']] ?? null,
          notes: row[headerIndex['notes']] ?? null,
        });
      }
      if (!prepared.length) { console.warn('CSV import: No rows to import'); return; }
      const chunkSize = 500;
      for (let i = 0; i < prepared.length; i += chunkSize) {
        const chunk = prepared.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from('drinks_library')
          .insert(chunk)
          .select('*');
        if (error) throw error;
        setDrinks(prev => [ ...(data || []), ...prev ]);
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

  const filteredItems = drinks.filter((item: any) => {
    const matchesSearch = (item.item_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
            <div>
              <h1 className="text-lg font-semibold text-white">Drinks Library</h1>
              <p className="text-sm text-neutral-400">Manage spirits, mixers, and garnishes</p>
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
                sub_category: '',
                abv: null,
                allergens: [],
                unit: '',
                unit_cost: null,
                supplier: '',
                pack_size: '',
                storage_type: '',
                shelf_life: '',
                notes: ''
              };
              setDrinks(prev => [empty, ...prev]);
              setExpandedRows(prev => new Set(prev).add(tempId));
              setEditingRowId(tempId);
              setRowDraft({ ...empty, abv: '', unit_cost: '', id: undefined });
              setNewRowIds(prev => new Set(prev).add(tempId));
            }}
            aria-label="Add Drink"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-[0_0_14px_rgba(233,0,126,0.55)] transition"
          >
            <Plus size={18} />
            <span className="sr-only">Add Drink</span>
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
            placeholder="Search drinks..."
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Categories</option>
          {DRINK_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-neutral-400 text-center py-8">Loading drinks...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-neutral-700">
          <p className="text-neutral-400">No drinks found.</p>
        </div>
      ) : (
        <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-900">
              <tr>
                <th className="w-10 px-2" aria-label="Expand" />
                <th className="text-left px-4 py-3 font-semibold text-magenta-400 text-[0.95rem]">Item Name</th>
                <th className="text-left px-2 py-3 font-semibold text-magenta-400 text-[0.95rem]">Category</th>
                <th className="text-left px-2 py-3 font-semibold text-magenta-400 text-[0.95rem]">ABV</th>
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
                          <select className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.category ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, category: e.target.value }))}>
                            <option value="">Select...</option>
                            {DRINK_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                          </select>
                        ) : (
                          item.category || '-'
                        )}
                      </td>
                      <td className="px-2 py-3 text-neutral-400 text-sm whitespace-nowrap">
                        {editingRowId === item.id ? (
                          <input type="number" step="0.1" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.abv ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, abv: e.target.value }))} placeholder="%" />
                        ) : (
                          item.abv ? `${item.abv}%` : '-'
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-t border-neutral-800/60">
                        <td colSpan={4} className="px-4 py-4 bg-neutral-900/40">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Sub Category</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.sub_category ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, sub_category: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.sub_category || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Unit</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.unit ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, unit: e.target.value }))} placeholder="e.g., L, ml, bottle" />
                              ) : (
                                <div className="text-sm text-white">{item.unit || '-'}</div>
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
                              <div className="text-xs text-neutral-400">Unit Cost</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.unit_cost ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, unit_cost: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.unit_cost ? `£${item.unit_cost}` : '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Pack Size</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.pack_size ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, pack_size: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.pack_size || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Storage Type</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.storage_type ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, storage_type: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.storage_type || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Shelf Life</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.shelf_life ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, shelf_life: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-white">{item.shelf_life || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Allergens</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" placeholder="Comma or semicolon separated" value={(rowDraft?.allergens || []).join(', ')} onChange={(e) => setRowDraft((d: any) => ({ ...d, allergens: e.target.value.split(/[,;]/).map(s => s.trim()).filter(Boolean) }))} />
                              ) : (
                                <div className="text-sm text-white">{(item.allergens || []).join(', ') || '-'}</div>
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
                                <button aria-label="Edit Drink" onClick={() => handleEdit(item)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-[0_0_14px_rgba(233,0,126,0.55)] transition">
                                  <Edit size={16} />
                                  <span className="sr-only">Edit</span>
                                </button>
                                <button aria-label="Delete Drink" onClick={() => handleDelete(item.id)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-500/60 text-red-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-red-400 hover:shadow-[0_0_14px_rgba(239,68,68,0.55)] transition">
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
