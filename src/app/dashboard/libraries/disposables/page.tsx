"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, ChevronDown, ChevronRight } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
// toast removed per project policy

const DISPOSABLE_CATEGORIES = [
  'Napkins',
  'Stirrers',
  'Straws',
  'Picks',
  'Coasters',
  'Takeaway Packaging',
  'Gloves',
  'Aprons'
];

export default function DisposablesLibraryPage() {
  const { companyId } = useAppContext();
  // no toast

  const [loading, setLoading] = useState(true);
  const [disposables, setDisposables] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<any | null>(null);
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const isFetchingRef = useRef(false);
  const loadDisposables = async () => {
    if (isFetchingRef.current) return;
    if (!companyId) { setLoading(false); return; }
    let isCancelled = false;
    try {
      isFetchingRef.current = true;
      setLoading(true);
      const { data, error } = await supabase
        .from('disposables_library')
        .select('*')
        .eq('company_id', companyId)
        .order('item_name');
      if (error) throw error;
      if (!isCancelled) setDisposables(data || []);
    } catch (error: any) {
      console.error('Error loading disposables:', error);
    } finally {
      if (!isCancelled) setLoading(false);
      isFetchingRef.current = false;
    }
    return () => { isCancelled = true; };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadDisposables();
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const saveRow = async (id: string) => {
    if (!rowDraft) return;
    try {
      setLoading(true);
      if (!companyId) { console.error('Error saving disposable: Missing company context'); return; }
      const trimmedName = (rowDraft.item_name ?? '').toString().trim();
      if (!trimmedName) { console.error('Validation error: Item name is required'); return; }

      const packCostRaw = rowDraft.pack_cost;
      const packCostVal = packCostRaw === '' || packCostRaw === null || packCostRaw === undefined
        ? null
        : parseFloat(String(packCostRaw));
      if (packCostVal !== null && Number.isNaN(packCostVal)) { console.error('Validation error: Pack cost must be a number'); return; }

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

      const currentStockRaw = rowDraft.current_stock;
      const currentStockVal = currentStockRaw === '' || currentStockRaw === null || currentStockRaw === undefined
        ? 0
        : parseFloat(String(currentStockRaw));
      const parLevelRaw = rowDraft.par_level;
      const parLevelVal = parLevelRaw === '' || parLevelRaw === null || parLevelRaw === undefined
        ? null
        : parseFloat(String(parLevelRaw));
      const reorderPointRaw = rowDraft.reorder_point;
      const reorderPointVal = reorderPointRaw === '' || reorderPointRaw === null || reorderPointRaw === undefined
        ? null
        : parseFloat(String(reorderPointRaw));
      const reorderQtyRaw = rowDraft.reorder_qty;
      const reorderQtyVal = reorderQtyRaw === '' || reorderQtyRaw === null || reorderQtyRaw === undefined
        ? null
        : parseFloat(String(reorderQtyRaw));

      const payload: any = {
        item_name: trimmedName,
        category: rowDraft.category ?? null,
        material: rowDraft.material ?? null,
        eco_friendly: rowDraft.eco_friendly ?? false,
        color_finish: rowDraft.color_finish ?? null,
        dimensions: rowDraft.dimensions ?? null,
        supplier: rowDraft.supplier ?? null,
        pack_cost: packCostVal,
        pack_size: packSizeVal,
        reorder_level: reorderLevelVal,
        storage_location: rowDraft.storage_location ?? null,
        usage_context: rowDraft.usage_context ?? null,
        notes: rowDraft.notes ?? null,
        // Stockly fields
        track_stock: rowDraft.track_stock ?? false,
        current_stock: currentStockVal,
        par_level: parLevelVal,
        reorder_point: reorderPointVal,
        reorder_qty: reorderQtyVal,
        sku: rowDraft.sku?.trim() || null,
        company_id: companyId,
      };

      if (newRowIds.has(id)) {
        const { data, error, status, statusText } = await supabase
          .from('disposables_library')
          .insert(payload)
          .select('*')
          .single();
        if (error) {
          console.error('Supabase insert error (disposables_library)', { error, status, statusText, payload });
          throw error;
        }
        console.info('Disposable added');
        setDisposables(prev => prev.map((disp: any) => disp.id === id ? data : disp));
        setNewRowIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
        // ensure UI reflects DB state
        await loadDisposables();
      } else {
        const { company_id: _omitCompanyId, ...updatePayload } = payload;
        const { error, status, statusText } = await supabase
          .from('disposables_library')
          .update(updatePayload)
          .eq('id', id)
          .eq('company_id', companyId);
        if (error) {
          console.error('Supabase update error (disposables_library)', { error, status, statusText, updatePayload, id });
          throw error;
        }
        console.info('Disposable updated');
        setDisposables(prev => prev.map((disp: any) => disp.id === id ? { ...disp, ...updatePayload } : disp));
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
        // ensure UI reflects DB state
        await loadDisposables();
      }
    } catch (error: any) {
      const description = (error && (error.message || (error as any).error_description || (error as any).hint))
        || (typeof error === 'string' ? error : '')
        || (error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : 'Unknown error');
      console.error('Error saving disposable:', error);
      // toast removed; rely on console for now
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this disposable item?')) return;
    try {
      const { error } = await supabase
        .from('disposables_library')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      console.info('Disposable deleted');
      loadDisposables();
    } catch (error: any) {
      console.error('Error deleting disposable:', error);
    }
  };

  const handleEdit = (item: any) => {
    setEditingRowId(item.id);
    setRowDraft({
      item_name: item.item_name || '',
      category: item.category || '',
      material: item.material || '',
      eco_friendly: item.eco_friendly ?? false,
      color_finish: item.color_finish || '',
      dimensions: item.dimensions || '',
      supplier: item.supplier || '',
      pack_cost: item.pack_cost ?? item.unit_cost ?? '', // fallback to unit_cost for existing data
      pack_size: item.pack_size ?? '',
      reorder_level: item.reorder_level ?? '',
      storage_location: item.storage_location || '',
      usage_context: item.usage_context || '',
      notes: item.notes || '',
      // Stockly fields
      track_stock: item.track_stock ?? false,
      current_stock: item.current_stock ?? '',
      par_level: item.par_level ?? '',
      reorder_point: item.reorder_point ?? '',
      reorder_qty: item.reorder_qty ?? '',
      sku: item.sku || ''
    });
    setExpandedRows(prev => new Set(prev).add(item.id));
  };

  const cancelEdit = (id: string) => {
    if (newRowIds.has(id)) {
      setDisposables(prev => prev.filter((disp: any) => disp.id !== id));
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
    'eco_friendly',
    'color_finish',
    'dimensions',
    'supplier',
    'pack_cost',
    'pack_size',
    'reorder_level',
    'storage_location',
    'usage_context',
    'track_stock',
    'current_stock',
    'par_level',
    'reorder_point',
    'reorder_qty',
    'sku',
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
        eco_friendly: r.eco_friendly ? 'Yes' : 'No',
        color_finish: r.color_finish ?? '',
        dimensions: r.dimensions ?? '',
        supplier: r.supplier ?? '',
        pack_cost: r.pack_cost ?? r.unit_cost ?? '', // fallback for existing data
        pack_size: r.pack_size ?? '',
        reorder_level: r.reorder_level ?? '',
        storage_location: r.storage_location ?? '',
        usage_context: r.usage_context ?? '',
        track_stock: r.track_stock ? 'true' : 'false',
        current_stock: r.current_stock ?? 0,
        par_level: r.par_level ?? '',
        reorder_point: r.reorder_point ?? '',
        reorder_qty: r.reorder_qty ?? '',
        sku: r.sku ?? '',
        notes: r.notes ?? ''
      };
      return CSV_HEADERS.map((h) => escapeCSV(obj[h])).join(',');
    }).join('\n');
    return header + (body ? ('\n' + body) : '');
  };

  const handleDownloadCSV = () => {
    const csv = toCSV(disposables.length ? disposables : []);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'disposables_library.csv';
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
        // Support both pack_cost and unit_cost for backward compatibility
        const packCostRaw = row[headerIndex['pack_cost']] ?? row[headerIndex['unit_cost']];
        const packSizeRaw = row[headerIndex['pack_size']];
        const reorderLevelRaw = row[headerIndex['reorder_level']];
        const ecoFriendlyRaw = row[headerIndex['eco_friendly']];
        const trackStockRaw = row[headerIndex['track_stock']];
        const trackStockVal = trackStockRaw && (trackStockRaw.trim().toLowerCase() === 'true' || trackStockRaw.trim() === '1');
        const currentStockRaw = row[headerIndex['current_stock']];
        const currentStockVal = currentStockRaw && currentStockRaw.trim() !== '' ? Number(currentStockRaw) : 0;
        const parLevelRaw = row[headerIndex['par_level']];
        const parLevelVal = parLevelRaw && parLevelRaw.trim() !== '' ? Number(parLevelRaw) : null;
        const reorderPointRaw = row[headerIndex['reorder_point']];
        const reorderPointVal = reorderPointRaw && reorderPointRaw.trim() !== '' ? Number(reorderPointRaw) : null;
        const reorderQtyRaw = row[headerIndex['reorder_qty']];
        const reorderQtyVal = reorderQtyRaw && reorderQtyRaw.trim() !== '' ? Number(reorderQtyRaw) : null;
        
        prepared.push({
          company_id: companyId,
          item_name: name.trim(),
          category: row[headerIndex['category']] ?? null,
          material: row[headerIndex['material']] ?? null,
          eco_friendly: ecoFriendlyRaw && (ecoFriendlyRaw.toLowerCase() === 'yes' || ecoFriendlyRaw.toLowerCase() === 'true' || ecoFriendlyRaw === '1'),
          color_finish: row[headerIndex['color_finish']] ?? null,
          dimensions: row[headerIndex['dimensions']] ?? null,
          supplier: row[headerIndex['supplier']] ?? null,
          pack_cost: packCostRaw && packCostRaw.trim() !== '' ? Number(packCostRaw) : null,
          pack_size: packSizeRaw && packSizeRaw.trim() !== '' ? Number(packSizeRaw) : null,
          reorder_level: reorderLevelRaw && reorderLevelRaw.trim() !== '' ? Number(reorderLevelRaw) : null,
          storage_location: row[headerIndex['storage_location']] ?? null,
          usage_context: row[headerIndex['usage_context']] ?? null,
          track_stock: trackStockVal,
          current_stock: currentStockVal,
          par_level: parLevelVal,
          reorder_point: reorderPointVal,
          reorder_qty: reorderQtyVal,
          sku: row[headerIndex['sku']]?.trim() || null,
          notes: row[headerIndex['notes']] ?? null,
        });
      }
      if (!prepared.length) { console.warn('CSV import: No rows to import'); return; }
      const chunkSize = 500;
      for (let i = 0; i < prepared.length; i += chunkSize) {
        const chunk = prepared.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from('disposables_library')
          .insert(chunk)
          .select('*');
        if (error) throw error;
        setDisposables(prev => [ ...(data || []), ...prev ]);
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

  const filteredItems = disposables.filter((item: any) => {
    const matchesSearch = (item.item_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-module-fg rounded-full"></div>
            <div>
              <h1 className="text-lg font-semibold text-theme-primary">Disposables Library</h1>
              <p className="text-sm text-theme-tertiary">Manage disposable items and packaging</p>
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
                material: '',
                eco_friendly: false,
                color_finish: '',
                dimensions: '',
                supplier: '',
                pack_cost: null,
                pack_size: null,
                reorder_level: null,
                storage_location: '',
                usage_context: '',
                notes: '',
                track_stock: false,
                current_stock: 0,
                par_level: null,
                reorder_point: null,
                reorder_qty: null,
                sku: ''
              };
              setDisposables(prev => [empty, ...prev]);
              setExpandedRows(prev => new Set(prev).add(tempId));
              setEditingRowId(tempId);
              setRowDraft({ ...empty, pack_cost: '', pack_size: '', reorder_level: '', current_stock: '', par_level: '', reorder_point: '', reorder_qty: '', id: undefined });
              setNewRowIds(prev => new Set(prev).add(tempId));
            }}
            aria-label="Add Disposable"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-module-glow transition"
          >
            <Plus size={18} />
            <span className="sr-only">Add Disposable</span>
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
            placeholder="Search disposables..."
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-theme-primary placeholder-neutral-400"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-theme-primary"
        >
          <option value="all">All Categories</option>
          {DISPOSABLE_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-theme-tertiary text-center py-8">Loading disposables...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-theme">
          <p className="text-theme-tertiary">No disposables found.</p>
        </div>
      ) : (
        <div className="bg-neutral-800/50 rounded-xl border border-theme overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-900">
              <tr>
                <th className="w-10 px-2" aria-label="Expand" />
                <th className="text-left px-4 py-3 font-semibold text-magenta-400 text-[0.95rem]">Item Name</th>
                <th className="text-left px-2 py-3 font-semibold text-magenta-400 text-[0.95rem]">Category</th>
                <th className="text-left px-2 py-3 font-semibold text-magenta-400 text-[0.95rem]">Material</th>
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
                          <div className="flex items-center gap-2">
                            <span>{item.item_name}</span>
                            {item.supplier && (
                              <span className="text-theme-tertiary text-sm">• {item.supplier}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3 text-theme-tertiary text-sm whitespace-nowrap">
                        {editingRowId === item.id ? (
                          <select className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.category ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, category: e.target.value }))}>
                            <option value="">Select...</option>
                            {DISPOSABLE_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                          </select>
                        ) : (
                          item.category || '-'
                        )}
                      </td>
                      <td className="px-2 py-3 text-theme-tertiary text-sm whitespace-nowrap">
                        {editingRowId === item.id ? (
                          <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.material ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, material: e.target.value }))} />
                        ) : (
                          item.material || '-'
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-t border-neutral-800/60">
                        <td colSpan={4} className="px-4 py-4 bg-neutral-900/40">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Eco-Friendly</div>
                              {editingRowId === item.id ? (
                                <select className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.eco_friendly ? 'true' : 'false'} onChange={(e) => setRowDraft((d: any) => ({ ...d, eco_friendly: e.target.value === 'true' }))}>
                                  <option value="false">No</option>
                                  <option value="true">Yes</option>
                                </select>
                              ) : (
                                <div className="text-sm text-theme-primary">
                                  {item.eco_friendly ? (
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Yes</span>
                                  ) : (
                                    <span className="px-2 py-1 bg-neutral-700 text-theme-tertiary rounded-full text-xs">No</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Color/Finish</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.color_finish ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, color_finish: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.color_finish || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Dimensions</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.dimensions ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, dimensions: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.dimensions || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Supplier</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.supplier ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, supplier: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.supplier || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Pack Cost</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.pack_cost ?? ''} onChange={(e) => {
                                  const newPackCost = e.target.value;
                                  setRowDraft((d: any) => ({ ...d, pack_cost: newPackCost }));
                                }} />
                              ) : (
                                <div className="text-sm text-theme-primary">
                                  {(item.pack_cost ?? item.unit_cost) ? `£${item.pack_cost ?? item.unit_cost}` : '-'}
                                </div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Pack Size</div>
                              {editingRowId === item.id ? (
                                <input type="number" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.pack_size ?? ''} onChange={(e) => {
                                  const newPackSize = e.target.value;
                                  setRowDraft((d: any) => ({ ...d, pack_size: newPackSize }));
                                }} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.pack_size || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Unit Cost <span className="text-theme-tertiary">(calculated)</span></div>
                              {editingRowId === item.id ? (
                                <div className="text-sm text-theme-primary italic">
                                  {(() => {
                                    const packCost = parseFloat(rowDraft?.pack_cost || '0');
                                    const packSize = parseFloat(rowDraft?.pack_size || '0');
                                    if (packCost && packSize && packSize > 0) {
                                      return `£${(packCost / packSize).toFixed(4)}`;
                                    }
                                    return '-';
                                  })()}
                                </div>
                              ) : (
                                <div className="text-sm text-theme-primary">
                                  {(() => {
                                    const packCost = item.pack_cost ?? item.unit_cost;
                                    const packSize = item.pack_size;
                                    if (packCost && packSize && packSize > 0) {
                                      return `£${(packCost / packSize).toFixed(4)}`;
                                    }
                                    return '-';
                                  })()}
                                </div>
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
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Storage Location</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.storage_location ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, storage_location: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.storage_location || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Usage Context</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.usage_context ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, usage_context: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.usage_context || '-'}</div>
                              )}
                            </div>
                            
                            {/* Stockly Fields Section */}
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs font-semibold text-theme-tertiary mb-2 uppercase">Stock Management</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="flex items-center gap-2">
                                  {editingRowId === item.id ? (
                                    <input type="checkbox" checked={rowDraft?.track_stock ?? false} onChange={(e) => setRowDraft((d: any) => ({ ...d, track_stock: e.target.checked }))} className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-magenta-500 focus:ring-magenta-500" />
                                  ) : (
                                    <input type="checkbox" checked={item.track_stock ?? false} disabled className="w-4 h-4 rounded border-neutral-600 bg-neutral-800" />
                                  )}
                                  <label className="text-xs text-theme-tertiary">Track Stock</label>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">SKU</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.sku ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, sku: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.sku || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Current Stock</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.current_stock ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, current_stock: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.current_stock != null ? item.current_stock : '0'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Par Level</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.par_level ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, par_level: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.par_level != null ? item.par_level : '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Reorder Point</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.reorder_point ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, reorder_point: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.reorder_point != null ? item.reorder_point : '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Reorder Qty</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.reorder_qty ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, reorder_qty: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.reorder_qty != null ? item.reorder_qty : '-'}</div>
                              )}
                            </div>
                            {item.low_stock_alert && (
                              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                <div className="text-xs text-red-400 font-semibold">⚠️ Low Stock Alert</div>
                              </div>
                            )}
                            {item.stock_value != null && item.stock_value > 0 && (
                              <div className="bg-neutral-800/60 border border-theme rounded-lg p-3">
                                <div className="text-xs text-theme-tertiary">Stock Value</div>
                                <div className="text-sm text-theme-primary">£{item.stock_value.toFixed(2)}</div>
                              </div>
                            )}
                            
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
                                <button aria-label="Edit Disposable" onClick={() => handleEdit(item)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-module-glow transition">
                                  <Edit size={16} />
                                  <span className="sr-only">Edit</span>
                                </button>
                                <button aria-label="Delete Disposable" onClick={() => handleDelete(item.id)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-500/60 text-red-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-red-400 hover:shadow-module-glow transition">
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
