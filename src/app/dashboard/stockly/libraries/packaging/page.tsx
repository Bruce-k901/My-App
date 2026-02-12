"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, ChevronDown, ChevronRight, Package } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
// toast removed per project policy

const PACKAGING_CATEGORIES = [
  'Food Containers',
  'Drink Cups',
  'Bags',
  'Cutlery',
  'Boxes',
  'Lids',
  'Napkins',
  'Straws'
];

export default function PackagingLibraryPage() {
  const { companyId } = useAppContext();
  // no toast

  const [loading, setLoading] = useState(true);
  const [packaging, setPackaging] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<any | null>(null);
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const isFetchingRef = useRef(false);
  const loadPackaging = async () => {
    if (isFetchingRef.current) return;
    if (!companyId) { setLoading(false); return; }
    let isCancelled = false;
    try {
      isFetchingRef.current = true;
      setLoading(true);
      const { data, error } = await supabase
        .from('packaging_library')
        .select('*')
        .eq('company_id', companyId)
        .order('item_name');
      if (error) throw error;
      if (!isCancelled) setPackaging(data || []);
    } catch (error: any) {
      console.error('Error loading packaging:', error);
    } finally {
      if (!isCancelled) setLoading(false);
      isFetchingRef.current = false;
    }
    return () => { isCancelled = true; };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadPackaging();
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const saveRow = async (id: string) => {
    if (!rowDraft) return;
    try {
      setLoading(true);
      if (!companyId) { console.error('Error saving packaging: Missing company context'); return; }
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
        capacity_size: rowDraft.capacity_size ?? null,
        eco_friendly: rowDraft.eco_friendly ?? false,
        compostable: rowDraft.compostable ?? false,
        recyclable: rowDraft.recyclable ?? true,
        hot_food_suitable: rowDraft.hot_food_suitable ?? false,
        microwave_safe: rowDraft.microwave_safe ?? false,
        leak_proof: rowDraft.leak_proof ?? false,
        color_finish: rowDraft.color_finish ?? null,
        supplier: rowDraft.supplier ?? null,
        pack_cost: packCostVal,
        pack_size: packSizeVal ?? 1,
        dimensions: rowDraft.dimensions ?? null,
        usage_context: rowDraft.usage_context ?? null,
        reorder_level: reorderLevelVal,
        notes: rowDraft.notes ?? null,
        // Stockly fields (may not exist in DB yet, but adding for consistency)
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
          .from('packaging_library')
          .insert(payload)
          .select('*')
          .single();
        if (error) {
          console.error('Supabase insert error (packaging_library)', { error, status, statusText, payload });
          throw error;
        }
        console.info('Packaging added');
        setPackaging(prev => prev.map((pkg: any) => pkg.id === id ? data : pkg));
        setNewRowIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
        // ensure UI reflects DB state
        await loadPackaging();
      } else {
        const { company_id: _omitCompanyId, ...updatePayload } = payload;
        const { error, status, statusText } = await supabase
          .from('packaging_library')
          .update(updatePayload)
          .eq('id', id)
          .eq('company_id', companyId);
        if (error) {
          console.error('Supabase update error (packaging_library)', { error, status, statusText, updatePayload, id });
          throw error;
        }
        console.info('Packaging updated');
        setPackaging(prev => prev.map((pkg: any) => pkg.id === id ? { ...pkg, ...updatePayload } : pkg));
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
        // ensure UI reflects DB state
        await loadPackaging();
      }
    } catch (error: any) {
      const description = (error && (error.message || (error as any).error_description || (error as any).hint))
        || (typeof error === 'string' ? error : '')
        || (error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : 'Unknown error');
      console.error('Error saving packaging:', error);
      // toast removed; rely on console for now
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this packaging item?')) return;
    try {
      const { error } = await supabase
        .from('packaging_library')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      console.info('Packaging deleted');
      loadPackaging();
    } catch (error: any) {
      console.error('Error deleting packaging:', error);
    }
  };

  const handleEdit = (item: any) => {
    setEditingRowId(item.id);
    setRowDraft({
      item_name: item.item_name || '',
      category: item.category || '',
      material: item.material || '',
      capacity_size: item.capacity_size || '',
      eco_friendly: item.eco_friendly ?? false,
      compostable: item.compostable ?? false,
      recyclable: item.recyclable ?? true,
      hot_food_suitable: item.hot_food_suitable ?? false,
      microwave_safe: item.microwave_safe ?? false,
      leak_proof: item.leak_proof ?? false,
      color_finish: item.color_finish || '',
      supplier: item.supplier || '',
      pack_cost: item.pack_cost ?? item.unit_cost ?? '', // fallback to unit_cost for existing data
      pack_size: item.pack_size ?? 1,
      dimensions: item.dimensions || '',
      usage_context: item.usage_context || '',
      reorder_level: item.reorder_level ?? '',
      notes: item.notes || '',
      // Stockly fields (may not exist in DB yet, but adding for consistency)
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
      setPackaging(prev => prev.filter((pkg: any) => pkg.id !== id));
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
    'capacity_size',
    'eco_friendly',
    'compostable',
    'recyclable',
    'hot_food_suitable',
    'microwave_safe',
    'leak_proof',
    'color_finish',
    'supplier',
    'pack_cost',
    'pack_size',
    'track_stock',
    'current_stock',
    'par_level',
    'reorder_point',
    'reorder_qty',
    'sku',
    'dimensions',
    'usage_context',
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
        material: r.material ?? '',
        capacity_size: r.capacity_size ?? '',
        eco_friendly: r.eco_friendly ? 'Yes' : 'No',
        compostable: r.compostable ? 'Yes' : 'No',
        recyclable: r.recyclable ? 'Yes' : 'No',
        hot_food_suitable: r.hot_food_suitable ? 'Yes' : 'No',
        microwave_safe: r.microwave_safe ? 'Yes' : 'No',
        leak_proof: r.leak_proof ? 'Yes' : 'No',
        color_finish: r.color_finish ?? '',
        supplier: r.supplier ?? '',
        pack_cost: r.pack_cost ?? r.unit_cost ?? '', // fallback for existing data
        pack_size: r.pack_size ?? '',
        track_stock: r.track_stock ? 'true' : 'false',
        current_stock: r.current_stock ?? 0,
        par_level: r.par_level ?? '',
        reorder_point: r.reorder_point ?? '',
        reorder_qty: r.reorder_qty ?? '',
        sku: r.sku ?? '',
        dimensions: r.dimensions ?? '',
        usage_context: r.usage_context ?? '',
        reorder_level: r.reorder_level ?? '',
        notes: r.notes ?? ''
      };
      return CSV_HEADERS.map((h) => escapeCSV(obj[h])).join(',');
    }).join('\n');
    return header + (body ? ('\n' + body) : '');
  };

  const handleDownloadCSV = () => {
    const csv = toCSV(packaging.length ? packaging : []);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'packaging_library.csv';
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
        const compostableRaw = row[headerIndex['compostable']];
        const recyclableRaw = row[headerIndex['recyclable']];
        const hotFoodRaw = row[headerIndex['hot_food_suitable']];
        const microwaveRaw = row[headerIndex['microwave_safe']];
        const leakProofRaw = row[headerIndex['leak_proof']];
        prepared.push({
          company_id: companyId,
          item_name: name.trim(),
          category: row[headerIndex['category']] ?? null,
          material: row[headerIndex['material']] ?? null,
          capacity_size: row[headerIndex['capacity_size']] ?? null,
          eco_friendly: ecoFriendlyRaw && (ecoFriendlyRaw.toLowerCase() === 'yes' || ecoFriendlyRaw.toLowerCase() === 'true' || ecoFriendlyRaw === '1'),
          compostable: compostableRaw && (compostableRaw.toLowerCase() === 'yes' || compostableRaw.toLowerCase() === 'true' || compostableRaw === '1'),
          recyclable: recyclableRaw && (recyclableRaw.toLowerCase() !== 'no' && recyclableRaw.toLowerCase() !== 'false' && recyclableRaw !== '0'),
          hot_food_suitable: hotFoodRaw && (hotFoodRaw.toLowerCase() === 'yes' || hotFoodRaw.toLowerCase() === 'true' || hotFoodRaw === '1'),
          microwave_safe: microwaveRaw && (microwaveRaw.toLowerCase() === 'yes' || microwaveRaw.toLowerCase() === 'true' || microwaveRaw === '1'),
          leak_proof: leakProofRaw && (leakProofRaw.toLowerCase() === 'yes' || leakProofRaw.toLowerCase() === 'true' || leakProofRaw === '1'),
          color_finish: row[headerIndex['color_finish']] ?? null,
          supplier: row[headerIndex['supplier']] ?? null,
          pack_cost: packCostRaw && packCostRaw.trim() !== '' ? Number(packCostRaw) : null,
          pack_size: packSizeRaw && packSizeRaw.trim() !== '' ? Number(packSizeRaw) : 1,
          dimensions: row[headerIndex['dimensions']] ?? null,
          usage_context: row[headerIndex['usage_context']] ?? null,
          reorder_level: reorderLevelRaw && reorderLevelRaw.trim() !== '' ? Number(reorderLevelRaw) : null,
          track_stock: row[headerIndex['track_stock']] && (row[headerIndex['track_stock']].trim().toLowerCase() === 'true' || row[headerIndex['track_stock']].trim() === '1'),
          current_stock: row[headerIndex['current_stock']] && row[headerIndex['current_stock']].trim() !== '' ? Number(row[headerIndex['current_stock']]) : 0,
          par_level: row[headerIndex['par_level']] && row[headerIndex['par_level']].trim() !== '' ? Number(row[headerIndex['par_level']]) : null,
          reorder_point: row[headerIndex['reorder_point']] && row[headerIndex['reorder_point']].trim() !== '' ? Number(row[headerIndex['reorder_point']]) : null,
          reorder_qty: row[headerIndex['reorder_qty']] && row[headerIndex['reorder_qty']].trim() !== '' ? Number(row[headerIndex['reorder_qty']]) : null,
          sku: row[headerIndex['sku']]?.trim() || null,
          notes: row[headerIndex['notes']] ?? null,
        });
      }
      if (!prepared.length) { console.warn('CSV import: No rows to import'); return; }
      const chunkSize = 500;
      for (let i = 0; i < prepared.length; i += chunkSize) {
        const chunk = prepared.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from('packaging_library')
          .insert(chunk)
          .select('*');
        if (error) throw error;
        setPackaging(prev => [ ...(data || []), ...prev ]);
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

  const filteredItems = packaging.filter((item: any) => {
    const matchesSearch = (item.item_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full bg-theme-surface-elevated min-h-screen">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-theme-primary mb-2 flex items-center gap-3">
              <Package className="w-8 h-8 text-module-fg" />
              Packaging Library
            </h1>
            <p className="text-sm text-theme-secondary">Manage packaging materials, sizes, and suppliers</p>
          </div>
          <div className="flex items-center gap-2">
 <button onClick={handleUploadClick} className="px-4 py-2 bg-theme-surface ] border border-module-fg text-module-fg hover:bg-module-fg/10 hover:shadow-module-glow rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2">
              <Upload size={16} />
              Upload CSV
            </button>
 <button onClick={handleDownloadCSV} className="px-4 py-2 bg-theme-surface ] border border-module-fg text-module-fg hover:bg-module-fg/10 hover:shadow-module-glow rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2">
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
                  capacity_size: '',
                  eco_friendly: false,
                  compostable: false,
                  recyclable: true,
                  hot_food_suitable: false,
                  microwave_safe: false,
                  leak_proof: false,
                  color_finish: '',
                  supplier: '',
                  pack_cost: null,
                  pack_size: 1,
                  dimensions: '',
                  usage_context: '',
                  reorder_level: null,
                  notes: '',
                  track_stock: false,
                  current_stock: 0,
                  par_level: null,
                  reorder_point: null,
                  reorder_qty: null,
                  sku: ''
                };
                setPackaging(prev => [empty, ...prev]);
                setExpandedRows(prev => new Set(prev).add(tempId));
                setEditingRowId(tempId);
                setRowDraft({ ...empty, pack_cost: '', pack_size: '', reorder_level: '', current_stock: '', par_level: '', reorder_point: '', reorder_qty: '', id: undefined });
                setNewRowIds(prev => new Set(prev).add(tempId));
              }}
              aria-label="Add Packaging"
 className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-emerald-600 dark:border-module-fg/30 text-module-fg bg-theme-surface ] hover:bg-theme-muted hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-module-glow transition"
            >
              <Plus size={18} />
              <span className="sr-only">Add Packaging</span>
            </button>
          </div>
        </div>

        <div className="bg-theme-surface border border-theme rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-tertiary" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search packaging..."
 className="w-full bg-theme-surface ] border border-theme rounded-lg pl-10 pr-4 py-2.5 text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
 className="bg-theme-surface ] border border-theme rounded-lg px-4 py-2.5 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 min-w-[180px] appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {PACKAGING_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-theme-secondary text-center py-8">Loading packaging...</div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-theme-surface border border-theme rounded-xl p-8 text-center">
            <p className="text-theme-secondary">No packaging found.</p>
          </div>
        ) : (
          <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-theme-button border-b border-theme">
                <tr>
                  <th className="w-10 px-2" aria-label="Expand" />
                  <th className="text-left px-4 py-3 font-semibold text-gray-900 dark:text-module-fg text-[0.95rem]">Name</th>
                  <th className="text-left px-2 py-3 font-semibold text-gray-900 dark:text-module-fg text-[0.95rem]">Supplier</th>
                  <th className="text-left px-2 py-3 font-semibold text-gray-900 dark:text-module-fg text-[0.95rem]">Cost</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item: any) => {
                  const expanded = expandedRows.has(item.id);
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="border-b border-theme hover:bg-gray-50 dark:hover:bg-white/[0.02] bg-white dark:bg-transparent">
                        <td className="px-2 py-3 align-top">
                          <button aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => toggleRow(item.id)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/[0.05] text-theme-secondary">
                            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {editingRowId === item.id ? (
 <input className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.item_name ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, item_name: e.target.value }))} />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-theme-primary font-medium">{item.item_name}</span>
                              {item.supplier && (
                                <span className="text-theme-tertiary text-sm">• {item.supplier}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-3 text-theme-secondary text-sm whitespace-nowrap">
                          {editingRowId === item.id ? (
 <input className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.supplier ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, supplier: e.target.value }))} />
                          ) : (
                            item.supplier || '-'
                          )}
                        </td>
                        <td className="px-2 py-3 text-theme-secondary text-sm whitespace-nowrap">
                        {editingRowId === item.id ? (
                          <div className="text-sm text-theme-primary italic">
                            {(() => {
                              const packCost = parseFloat(rowDraft?.pack_cost || '0');
                              const packSize = parseFloat(rowDraft?.pack_size || '1');
                              if (packCost && packSize && packSize > 0) {
                                return `£${(packCost / packSize).toFixed(4)}`;
                              }
                              return '-';
                            })()}
                          </div>
                        ) : (
                          <div className="text-theme-primary">
                            {(() => {
                              const packCost = item.pack_cost ?? item.unit_cost;
                              const packSize = item.pack_size ?? 1;
                              if (packCost && packSize && packSize > 0) {
                                return `£${(packCost / packSize).toFixed(4)}`;
                              }
                              return '-';
                            })()}
                          </div>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-t border-theme">
                        <td colSpan={4} className="px-4 py-4 bg-gray-50 dark:bg-white/[0.02]">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Category</div>
                              {editingRowId === item.id ? (
 <select className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.category ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, category: e.target.value }))}>
                                  <option value="">Select...</option>
                                  {PACKAGING_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                                </select>
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.category || '-'}</div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Material</div>
                              {editingRowId === item.id ? (
 <input className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.material ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, material: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.material || '-'}</div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Capacity/Size</div>
                              {editingRowId === item.id ? (
 <input className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.capacity_size ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, capacity_size: e.target.value }))} placeholder="e.g., 8oz, 2oz, Small"/>
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.capacity_size || '-'}</div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Pack Cost</div>
                              {editingRowId === item.id ? (
 <input type="number"step="0.01"className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.pack_cost ??''} onChange={(e) => {
                                  const newPackCost = e.target.value;
                                  setRowDraft((d: any) => ({ ...d, pack_cost: newPackCost }));
                                }} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">
                                  {(item.pack_cost ?? item.unit_cost) ? `£${item.pack_cost ?? item.unit_cost}` : '-'}
                                </div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Pack Size</div>
                              {editingRowId === item.id ? (
 <input type="number"className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.pack_size ??''} onChange={(e) => {
                                  const newPackSize = e.target.value;
                                  setRowDraft((d: any) => ({ ...d, pack_size: newPackSize }));
                                }} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.pack_size || '-'}</div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Unit Cost <span className="text-theme-tertiary">(calculated)</span></div>
                              {editingRowId === item.id ? (
                                <div className="text-sm text-theme-primary font-medium italic">
                                  {(() => {
                                    const packCost = parseFloat(rowDraft?.pack_cost || '0');
                                    const packSize = parseFloat(rowDraft?.pack_size || '1');
                                    if (packCost && packSize && packSize > 0) {
                                      return `£${(packCost / packSize).toFixed(4)}`;
                                    }
                                    return '-';
                                  })()}
                                </div>
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">
                                  {(() => {
                                    const packCost = item.pack_cost ?? item.unit_cost;
                                    const packSize = item.pack_size ?? 1;
                                    if (packCost && packSize && packSize > 0) {
                                      return `£${(packCost / packSize).toFixed(4)}`;
                                    }
                                    return '-';
                                  })()}
                                </div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Eco-Friendly</div>
                              {editingRowId === item.id ? (
 <select className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.eco_friendly ?'true':'false'} onChange={(e) => setRowDraft((d: any) => ({ ...d, eco_friendly: e.target.value ==='true'}))}>
                                  <option value="false">No</option>
                                  <option value="true">Yes</option>
                                </select>
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">
                                  {item.eco_friendly ? (
                                    <span className="px-2 py-1 bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30 rounded-full text-xs">Yes</span>
                                  ) : (
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-theme-secondary rounded-full text-xs">No</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Compostable</div>
                              {editingRowId === item.id ? (
 <select className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.compostable ?'true':'false'} onChange={(e) => setRowDraft((d: any) => ({ ...d, compostable: e.target.value ==='true'}))}>
                                  <option value="false">No</option>
                                  <option value="true">Yes</option>
                                </select>
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">
                                  {item.compostable ? (
                                    <span className="px-2 py-1 bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30 rounded-full text-xs">Yes</span>
                                  ) : (
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-theme-secondary rounded-full text-xs">No</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Hot Food Suitable</div>
                              {editingRowId === item.id ? (
 <select className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.hot_food_suitable ?'true':'false'} onChange={(e) => setRowDraft((d: any) => ({ ...d, hot_food_suitable: e.target.value ==='true'}))}>
                                  <option value="false">No</option>
                                  <option value="true">Yes</option>
                                </select>
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">
                                  {item.hot_food_suitable ? (
                                    <span className="px-2 py-1 bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30 rounded-full text-xs">Yes</span>
                                  ) : (
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-theme-secondary rounded-full text-xs">No</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Microwave Safe</div>
                              {editingRowId === item.id ? (
 <select className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.microwave_safe ?'true':'false'} onChange={(e) => setRowDraft((d: any) => ({ ...d, microwave_safe: e.target.value ==='true'}))}>
                                  <option value="false">No</option>
                                  <option value="true">Yes</option>
                                </select>
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">
                                  {item.microwave_safe ? (
                                    <span className="px-2 py-1 bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30 rounded-full text-xs">Yes</span>
                                  ) : (
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-theme-secondary rounded-full text-xs">No</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Leak Proof</div>
                              {editingRowId === item.id ? (
 <select className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.leak_proof ?'true':'false'} onChange={(e) => setRowDraft((d: any) => ({ ...d, leak_proof: e.target.value ==='true'}))}>
                                  <option value="false">No</option>
                                  <option value="true">Yes</option>
                                </select>
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">
                                  {item.leak_proof ? (
                                    <span className="px-2 py-1 bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30 rounded-full text-xs">Yes</span>
                                  ) : (
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-theme-secondary rounded-full text-xs">No</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Color/Finish</div>
                              {editingRowId === item.id ? (
 <input className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.color_finish ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, color_finish: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.color_finish || '-'}</div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Dimensions</div>
                              {editingRowId === item.id ? (
 <input className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.dimensions ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, dimensions: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.dimensions || '-'}</div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Reorder Level</div>
                              {editingRowId === item.id ? (
 <input type="number"className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.reorder_level ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, reorder_level: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.reorder_level || '-'}</div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Usage Context</div>
                              {editingRowId === item.id ? (
 <input className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.usage_context ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, usage_context: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.usage_context || '-'}</div>
                              )}
                            </div>
                            
                            {/* Stockly Fields Section */}
                            <div className="bg-theme-surface border border-theme rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs font-semibold text-theme-secondary mb-2 uppercase">Stock Management</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="flex items-center gap-2">
                                  {editingRowId === item.id ? (
                                    <input type="checkbox" checked={rowDraft?.track_stock ?? false} onChange={(e) => setRowDraft((d: any) => ({ ...d, track_stock: e.target.checked }))} className="w-4 h-4 rounded border-module-fg/30 bg-theme-surface text-emerald-500 focus:ring-emerald-500" />
                                  ) : (
                                    <input type="checkbox" checked={item.track_stock ?? false} disabled className="w-4 h-4 rounded border-module-fg/30 bg-theme-surface" />
                                  )}
                                  <label className="text-xs text-theme-tertiary mb-1">Track Stock</label>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">SKU</div>
                              {editingRowId === item.id ? (
 <input className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.sku ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, sku: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.sku || '-'}</div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Current Stock</div>
                              {editingRowId === item.id ? (
 <input type="number"step="0.01"className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.current_stock ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, current_stock: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.current_stock != null ? item.current_stock : '0'}</div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Par Level</div>
                              {editingRowId === item.id ? (
 <input type="number"step="0.01"className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.par_level ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, par_level: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.par_level != null ? item.par_level : '-'}</div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Reorder Point</div>
                              {editingRowId === item.id ? (
 <input type="number"step="0.01"className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.reorder_point ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, reorder_point: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.reorder_point != null ? item.reorder_point : '-'}</div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Reorder Qty</div>
                              {editingRowId === item.id ? (
 <input type="number"step="0.01"className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.reorder_qty ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, reorder_qty: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.reorder_qty != null ? item.reorder_qty : '-'}</div>
                              )}
                            </div>
                            {item.low_stock_alert && (
                              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3">
                                <div className="text-xs text-red-700 dark:text-red-400 font-semibold">⚠️ Low Stock Alert</div>
                              </div>
                            )}
                            {item.stock_value != null && item.stock_value > 0 && (
                              <div className="bg-theme-surface border border-theme rounded-lg p-3">
                                <div className="text-xs text-theme-tertiary mb-1">Stock Value</div>
                                <div className="text-sm text-theme-primary font-medium">£{item.stock_value.toFixed(2)}</div>
                              </div>
                            )}
                            
                            <div className="bg-theme-surface border border-theme rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs text-theme-tertiary mb-1">Notes</div>
                              {editingRowId === item.id ? (
 <textarea className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 min-h-[80px]"value={rowDraft?.notes ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, notes: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium whitespace-pre-wrap">{item.notes || '-'}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            {editingRowId === item.id ? (
                              <>
 <button onClick={() => saveRow(item.id)} className="px-3 py-2 rounded-lg border border-emerald-600 dark:border-module-fg/30 text-module-fg bg-theme-surface ] hover:bg-module-fg/10 hover:shadow-module-glow transition flex items-center gap-2">
                                  <Save size={16} />
                                  <span>Save</span>
                                </button>
 <button onClick={() => cancelEdit(item.id)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 text-theme-secondary bg-theme-surface ] hover:bg-theme-muted transition flex items-center gap-2">
                                  <X size={16} />
                                  <span>Cancel</span>
                                </button>
                              </>
                            ) : (
                              <>
 <button aria-label="Edit Packaging"onClick={() => handleEdit(item)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-emerald-600 dark:border-module-fg/30 text-module-fg bg-theme-surface ] hover:bg-theme-muted hover:shadow-module-glow transition">
                                  <Edit size={16} />
                                  <span className="sr-only">Edit</span>
                                </button>
 <button aria-label="Delete Packaging"onClick={() => handleDelete(item.id)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-600 dark:border-red-500/60 text-red-600 dark:text-red-400 bg-theme-surface ] hover:bg-red-50 dark:hover:bg-red-500/10 hover:shadow-module-glow transition">
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
    </div>
  );
}
