"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, ChevronDown, ChevronRight, Package } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { ensureSupplierExists } from '@/lib/utils/supplierPlaceholderFlow';
import { SupplierSearchInput } from '@/components/stockly/SupplierSearchInput';
import { useToast } from '@/components/ui/ToastProvider';

const PPE_CATEGORIES = [
  'Hand Protection',
  'Eye Protection',
  'Respiratory',
  'Body Protection',
  'Foot Protection'
];

export default function PPELibraryPage() {
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [ppeItems, setPPEItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<any | null>(null);
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const isFetchingRef = useRef(false);
  const loadPPEItems = async () => {
    if (isFetchingRef.current) return;
    if (!companyId) { setLoading(false); return; }
    let isCancelled = false;
    try {
      isFetchingRef.current = true;
      setLoading(true);
      const { data, error } = await supabase
        .from('ppe_library')
        .select('*')
        .eq('company_id', companyId)
        .order('item_name');
      if (error) throw error;
      if (!isCancelled) setPPEItems(data || []);
    } catch (error: any) {
      console.error('Error loading PPE:', error);
      showToast({ title: 'Error loading PPE', description: error.message, type: 'error' });
    } finally {
      if (!isCancelled) setLoading(false);
      isFetchingRef.current = false;
    }
    return () => { isCancelled = true; };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await loadPPEItems(); })();
    return () => { cancelled = true; };
  }, [companyId]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const saveRow = async (id: string) => {
    if (!rowDraft) return;
    try {
      setLoading(true);
      if (!companyId) { console.error('Error saving PPE: Missing company context'); return; }
      const trimmedName = (rowDraft.item_name ?? '').toString().trim();
      if (!trimmedName) { console.error('Validation error: Item name is required'); return; }

      const unitCostRaw = rowDraft.unit_cost;
      const unitCostVal = unitCostRaw === '' || unitCostRaw === null || unitCostRaw === undefined
        ? null
        : parseFloat(String(unitCostRaw));
      if (unitCostVal !== null && Number.isNaN(unitCostVal)) { console.error('Validation error: Unit cost must be a number'); return; }

      const reorderLevelRaw = rowDraft.reorder_level;
      const reorderLevelVal = reorderLevelRaw === '' || reorderLevelRaw === null || reorderLevelRaw === undefined
        ? null
        : parseInt(String(reorderLevelRaw), 10);
      if (reorderLevelVal !== null && Number.isNaN(reorderLevelVal)) { console.error('Validation error: Reorder level must be a number'); return; }

      const sizeOptionsVal = Array.isArray(rowDraft.size_options)
        ? rowDraft.size_options.map((s: any) => (s == null ? '' : String(s))).filter((s: string) => s.length > 0)
        : [];
      const linkedRisksVal = Array.isArray(rowDraft.linked_risks)
        ? rowDraft.linked_risks.map((s: any) => (s == null ? '' : String(s))).filter((s: string) => s.length > 0)
        : [];

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

      // Ensure supplier placeholder exists
      const supplierVal = rowDraft.supplier?.trim() || null;
      if (supplierVal && companyId) {
        await ensureSupplierExists(supplierVal, companyId, { sourceLibrary: 'ppe' });
      }

      const payload: any = {
        item_name: trimmedName,
        category: rowDraft.category ?? null,
        standard_compliance: rowDraft.standard_compliance ?? null,
        size_options: sizeOptionsVal,
        supplier: supplierVal,
        unit_cost: unitCostVal,
        reorder_level: reorderLevelVal,
        linked_risks: linkedRisksVal,
        cleaning_replacement_interval: rowDraft.cleaning_replacement_interval ?? null,
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
          .from('ppe_library')
          .insert(payload)
          .select('*')
          .single();
        if (error) {
          console.error('Supabase insert error (ppe_library)', { error, status, statusText, payload });
          throw error;
        }
        setPPEItems(prev => prev.map(p => p.id === id ? data : p));
        setNewRowIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
      } else {
        const { company_id: _omitCompanyId, ...updatePayload } = payload;
        const { error, status, statusText } = await supabase
          .from('ppe_library')
          .update(updatePayload)
          .eq('id', id)
          .eq('company_id', companyId);
        if (error) {
          console.error('Supabase update error (ppe_library)', { error, status, statusText, updatePayload, id });
          throw error;
        }
        setPPEItems(prev => prev.map(p => p.id === id ? { ...p, ...updatePayload } : p));
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
      }
      showToast({ title: 'Saved', type: 'success' });
    } catch (error: any) {
      const description = (error && (error.message || (error as any).error_description || (error as any).hint))
        || (typeof error === 'string' ? error : '')
        || (error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : 'Unknown error');
      console.error('Error saving PPE:', error);
      showToast({ title: 'Error saving PPE', description, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this PPE item?')) return;
    
    try {
      const { error } = await supabase
        .from('ppe_library')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      
      if (error) throw error;
      showToast({ title: 'PPE deleted', type: 'success' });
      loadPPEItems();
    } catch (error: any) {
      console.error('Error deleting PPE:', error);
      showToast({ title: 'Error deleting PPE', description: error.message, type: 'error' });
    }
  };

  const handleEdit = (item: any) => {
    setEditingRowId(item.id);
    setRowDraft({
      item_name: item.item_name || '',
      category: item.category || '',
      standard_compliance: item.standard_compliance || '',
      size_options: item.size_options || [],
      supplier: item.supplier || '',
      unit_cost: item.unit_cost ?? '',
      reorder_level: item.reorder_level ?? '',
      linked_risks: item.linked_risks || [],
      cleaning_replacement_interval: item.cleaning_replacement_interval || '',
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
      setPPEItems(prev => prev.filter(p => p.id !== id));
      setNewRowIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
    setEditingRowId(null);
    setRowDraft(null);
  };

  // CSV
  const CSV_HEADERS = [
    'item_name',
    'category',
    'standard_compliance',
    'size_options',
    'supplier',
    'unit_cost',
    'reorder_level',
    'linked_risks',
    'cleaning_replacement_interval',
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
    if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
    return str;
  };
  const toCSV = (rows: any[]): string => {
    const header = CSV_HEADERS.join(',');
    const body = rows.map(r => {
      const obj: any = {
        item_name: r.item_name ?? '',
        category: r.category ?? '',
        standard_compliance: r.standard_compliance ?? '',
        size_options: (r.size_options || []).join('; '),
        supplier: r.supplier ?? '',
        unit_cost: r.unit_cost ?? '',
        reorder_level: r.reorder_level ?? '',
        linked_risks: (r.linked_risks || []).join('; '),
        cleaning_replacement_interval: r.cleaning_replacement_interval ?? '',
        track_stock: r.track_stock ? 'true' : 'false',
        current_stock: r.current_stock ?? 0,
        par_level: r.par_level ?? '',
        reorder_point: r.reorder_point ?? '',
        reorder_qty: r.reorder_qty ?? '',
        sku: r.sku ?? '',
        notes: r.notes ?? ''
      };
      return CSV_HEADERS.map(h => escapeCSV(obj[h])).join(',');
    }).join('\n');
    return header + (body ? ('\n' + body) : '');
  };
  const handleDownloadCSV = () => {
    const csv = toCSV(ppeItems.length ? ppeItems : []);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ppe_library.csv'; a.click();
    URL.revokeObjectURL(url);
  };
  const parseCSV = (text: string) => {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const parseLine = (line: string): string[] => {
      const res: string[] = []; let cur = ''; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQ) {
          if (ch === '"') { if (line[i+1] === '"') { cur += '"'; i++; } else { inQ = false; } }
          else { cur += ch; }
        } else {
          if (ch === ',') { res.push(cur); cur = ''; }
          else if (ch === '"') { inQ = true; }
          else { cur += ch; }
        }
      }
      res.push(cur); return res;
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
    const file = e.target.files?.[0]; if (!file) return;
    try {
      setLoading(true);
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      if (!headers.length) throw new Error('CSV has no headers');
      const index: Record<string, number> = {}; headers.forEach((h, i) => index[h] = i);
      const prepared: any[] = [];
      for (const row of rows) {
        const name = row[index['item_name']] ?? '';
        if (!name.trim()) continue;
        const trackStockRaw = row[index['track_stock']];
        const trackStockVal = trackStockRaw && (trackStockRaw.trim().toLowerCase() === 'true' || trackStockRaw.trim() === '1');
        const currentStockRaw = row[index['current_stock']];
        const currentStockVal = currentStockRaw && currentStockRaw.trim() !== '' ? Number(currentStockRaw) : 0;
        const parLevelRaw = row[index['par_level']];
        const parLevelVal = parLevelRaw && parLevelRaw.trim() !== '' ? Number(parLevelRaw) : null;
        const reorderPointRaw = row[index['reorder_point']];
        const reorderPointVal = reorderPointRaw && reorderPointRaw.trim() !== '' ? Number(reorderPointRaw) : null;
        const reorderQtyRaw = row[index['reorder_qty']];
        const reorderQtyVal = reorderQtyRaw && reorderQtyRaw.trim() !== '' ? Number(reorderQtyRaw) : null;
        
        prepared.push({
          company_id: companyId,
          item_name: name.trim(),
          category: row[index['category']] ?? null,
          standard_compliance: row[index['standard_compliance']] ?? null,
          size_options: normaliseArrayCell(row[index['size_options']]) || null,
          supplier: row[index['supplier']] ?? null,
          unit_cost: row[index['unit_cost']]?.trim() ? Number(row[index['unit_cost']]) : null,
          reorder_level: row[index['reorder_level']]?.trim() ? Number(row[index['reorder_level']]) : null,
          linked_risks: normaliseArrayCell(row[index['linked_risks']]) || null,
          cleaning_replacement_interval: row[index['cleaning_replacement_interval']] ?? null,
          track_stock: trackStockVal,
          current_stock: currentStockVal,
          par_level: parLevelVal,
          reorder_point: reorderPointVal,
          reorder_qty: reorderQtyVal,
          sku: row[index['sku']]?.trim() || null,
          notes: row[index['notes']] ?? null,
        });
      }
      if (!prepared.length) { showToast({ title: 'No rows to import', type: 'warning' }); return; }
      const chunkSize = 500;
      for (let i = 0; i < prepared.length; i += chunkSize) {
        const { data, error } = await supabase.from('ppe_library').insert(prepared.slice(i, i+chunkSize)).select('*');
        if (error) throw error;
        setPPEItems(prev => [ ...(data || []), ...prev ]);
      }
      showToast({ title: 'Import complete', description: `Imported ${prepared.length} row(s)`, type: 'success' });
    } catch (err: any) {
      console.error('CSV import error:', err);
      showToast({ title: 'Import failed', description: err?.message || 'Unable to import CSV', type: 'error' });
    } finally {
      setLoading(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const uniqueSuppliers = useMemo(() => {
    const suppliers = new Set<string>();
    ppeItems.forEach((item: any) => {
      if (item.supplier && item.supplier.trim()) suppliers.add(item.supplier.trim());
    });
    return Array.from(suppliers).sort((a, b) => a.localeCompare(b));
  }, [ppeItems]);

  const filteredItems = ppeItems.filter((item: any) => {
    const matchesSearch = (item.item_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesSupplier = filterSupplier === 'all' || (item.supplier || '').trim() === filterSupplier;
    return matchesSearch && matchesCategory && matchesSupplier;
  });

  return (
    <div className="w-full min-h-screen">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-theme-primary mb-2 flex items-center gap-3">
              <Package className="w-8 h-8 text-module-fg" />
              PPE Library
            </h1>
            <p className="text-sm text-theme-secondary">Manage personal protective equipment</p>
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
                const empty = {
                  id: tempId,
                  item_name: '',
                  category: '',
                  standard_compliance: '',
                  size_options: [],
                  supplier: '',
                  unit_cost: null,
                  reorder_level: null,
                  linked_risks: [],
                  cleaning_replacement_interval: '',
                  notes: '',
                  track_stock: false,
                  current_stock: 0,
                  par_level: null,
                  reorder_point: null,
                  reorder_qty: null,
                  sku: ''
                };
                setPPEItems(prev => [empty, ...prev]);
                setExpandedRows(prev => new Set(prev).add(tempId));
                setEditingRowId(tempId);
                setRowDraft({ ...empty, unit_cost: '', reorder_level: '', current_stock: '', par_level: '', reorder_point: '', reorder_qty: '', id: undefined });
                setNewRowIds(prev => new Set(prev).add(tempId));
              }}
              aria-label="Add PPE"
 className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-emerald-600 dark:border-module-fg/30 text-module-fg bg-theme-surface ] hover:bg-theme-muted hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-module-glow transition"
            >
              <Plus size={18} />
              <span className="sr-only">Add PPE</span>
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
                placeholder="Search PPE items..."
 className="w-full bg-theme-surface ] border border-theme rounded-lg pl-10 pr-4 py-2.5 text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
 className="bg-theme-surface ] border border-theme rounded-lg px-4 py-2.5 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 min-w-[180px] appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {PPE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
 className="bg-theme-surface ] border border-theme rounded-lg px-4 py-2.5 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 min-w-[180px] appearance-none cursor-pointer"
            >
              <option value="all">All Suppliers</option>
              {uniqueSuppliers.map(sup => (
                <option key={sup} value={sup}>{sup}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-theme-secondary text-center py-8">Loading PPE...</div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-theme-surface border border-theme rounded-xl p-8 text-center">
            <p className="text-theme-secondary">No PPE items found.</p>
          </div>
        ) : (
          <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-theme-button border-b border-theme">
                <tr>
                  <th className="w-10 px-2" aria-label="Expand" />
                  <th className="text-left px-4 py-3 font-semibold text-gray-900 dark:text-module-fg text-[0.95rem]">Item Name</th>
                  <th className="text-left px-2 py-3 font-semibold text-gray-900 dark:text-module-fg text-[0.95rem]">Category</th>
                  <th className="text-left px-2 py-3 font-semibold text-gray-900 dark:text-module-fg text-[0.95rem]">Reorder Level</th>
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
 <select className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.category ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, category: e.target.value }))}>
                            <option value="">Select...</option>
                            {PPE_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                          </select>
                        ) : (
                          item.category || '-'
                        )}
                      </td>
                      <td className="px-2 py-3 text-theme-secondary text-sm whitespace-nowrap">
                        {editingRowId === item.id ? (
 <input type="number"className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.reorder_level ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, reorder_level: e.target.value }))} />
                        ) : (
                          item.reorder_level ?? '-'
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-t border-theme">
                        <td colSpan={4} className="px-4 py-4 bg-gray-50 dark:bg-white/[0.02]">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Standard/Compliance</div>
                              {editingRowId === item.id ? (
 <input className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.standard_compliance ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, standard_compliance: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.standard_compliance || '-'}</div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Size Options</div>
                              {editingRowId === item.id ? (
 <input className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"placeholder="Comma or semicolon separated"value={(rowDraft?.size_options || []).join(',')} onChange={(e) => setRowDraft((d: any) => ({ ...d, size_options: e.target.value.split(/[,;]/).map(s => s.trim()).filter(Boolean) }))} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{(item.size_options || []).join(', ') || '-'}</div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Supplier</div>
                              {editingRowId === item.id ? (
 <SupplierSearchInput value={rowDraft?.supplier ?? ''} onChange={(name) => setRowDraft((d: any) => ({ ...d, supplier: name }))} companyId={companyId} className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.supplier || '-'}</div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Unit Cost</div>
                              {editingRowId === item.id ? (
 <input type="number"step="0.01"className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.unit_cost ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, unit_cost: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.unit_cost ? `£${item.unit_cost}` : '-'}</div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary mb-1">Linked Risks</div>
                              {editingRowId === item.id ? (
 <input className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"placeholder="Comma or semicolon separated"value={(rowDraft?.linked_risks || []).join(',')} onChange={(e) => setRowDraft((d: any) => ({ ...d, linked_risks: e.target.value.split(/[,;]/).map(s => s.trim()).filter(Boolean) }))} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{(item.linked_risks || []).join(', ') || '-'}</div>
                              )}
                            </div>
                            <div className="bg-theme-surface border border-theme rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs text-theme-tertiary mb-1">Cleaning/Replacement Interval</div>
                              {editingRowId === item.id ? (
 <input className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.cleaning_replacement_interval ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, cleaning_replacement_interval: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary font-medium">{item.cleaning_replacement_interval || '-'}</div>
                              )}
                            </div>
                            
                            {/* Stockly Fields Section */}
                            <div className="bg-theme-surface border border-theme rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs font-semibold text-theme-secondary mb-2 uppercase">Stock Management</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="flex items-center gap-2">
                                  {editingRowId === item.id ? (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="checkbox" checked={rowDraft?.track_stock ?? false} onChange={(e) => setRowDraft((d: any) => ({ ...d, track_stock: e.target.checked }))} style={{ accentColor: '#10B981' }} className="w-4 h-4 rounded border-module-fg/30 bg-theme-surface text-emerald-500 focus:ring-emerald-500 focus:ring-2 checked:bg-emerald-500 checked:border-emerald-500" />
                                      <span className="text-xs text-theme-secondary">Track Stock</span>
                                    </label>
                                  ) : (
                                    <label className="flex items-center gap-2">
                                      <input type="checkbox" checked={item.track_stock ?? false} disabled className="w-4 h-4 rounded border-module-fg/30 bg-theme-surface" />
                                      <span className="text-xs text-theme-secondary">Track Stock</span>
                                    </label>
                                  )}
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
 <textarea className="w-full bg-theme-surface ] border border-theme rounded px-2 py-1 text-theme-primary min-h-[80px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"value={rowDraft?.notes ??''} onChange={(e) => setRowDraft((d: any) => ({ ...d, notes: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary whitespace-pre-wrap">{item.notes || '-'}</div>
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
 <button aria-label="Edit PPE"onClick={() => handleEdit(item)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-emerald-600 dark:border-module-fg/30 text-module-fg bg-theme-surface ] hover:bg-theme-muted hover:shadow-module-glow transition">
                                  <Edit size={16} />
                                  <span className="sr-only">Edit</span>
                                </button>
 <button aria-label="Delete PPE"onClick={() => handleDelete(item.id)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-600 dark:border-red-500/60 text-red-600 dark:text-red-400 bg-theme-surface ] hover:bg-red-50 dark:hover:bg-red-500/10 hover:shadow-module-glow transition">
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


