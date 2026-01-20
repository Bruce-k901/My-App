"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, ChevronDown, ChevronRight, Heart, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

const FIRST_AID_CATEGORIES = [
  'Plasters',
  'Dressings',
  'Bandages',
  'Equipment',
  'Antiseptics',
  'Burns Care',
  'Eye Care',
  'Other'
];

export default function FirstAidLibraryPage() {
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [firstAidItems, setFirstAidItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<any | null>(null);
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const isFetchingRef = useRef(false);
  const loadFirstAidItems = async () => {
    if (isFetchingRef.current) return;
    if (!companyId) { setLoading(false); return; }
    let isCancelled = false;
    try {
      isFetchingRef.current = true;
      setLoading(true);
      // Load both company-specific and global items (company_id IS NULL)
      const { data, error } = await supabase
        .from('first_aid_supplies_library')
        .select('*')
        .or(`company_id.eq.${companyId},company_id.is.null`)
        .order('item_name');
      if (error) throw error;
      if (!isCancelled) setFirstAidItems(data || []);
    } catch (error: any) {
      console.error('Error loading first aid supplies:', error);
      showToast({ title: 'Error loading first aid supplies', description: error.message, type: 'error' });
    } finally {
      if (!isCancelled) setLoading(false);
      isFetchingRef.current = false;
    }
    return () => { isCancelled = true; };
  };

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await loadFirstAidItems(); })();
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
      if (!companyId) { console.error('Error saving first aid supply: Missing company context'); return; }
      const trimmedName = (rowDraft.item_name ?? '').toString().trim();
      if (!trimmedName) { console.error('Validation error: Item name is required'); return; }

      const unitCostRaw = rowDraft.unit_cost;
      const unitCostVal = unitCostRaw === '' || unitCostRaw === null || unitCostRaw === undefined
        ? null
        : parseFloat(String(unitCostRaw));
      if (unitCostVal !== null && Number.isNaN(unitCostVal)) { console.error('Validation error: Unit cost must be a number'); return; }

      const expiryPeriodRaw = rowDraft.expiry_period_months;
      const expiryPeriodVal = expiryPeriodRaw === '' || expiryPeriodRaw === null || expiryPeriodRaw === undefined
        ? null
        : parseInt(String(expiryPeriodRaw), 10);
      if (expiryPeriodVal !== null && Number.isNaN(expiryPeriodVal)) { console.error('Validation error: Expiry period must be a number'); return; }

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
        sub_category: rowDraft.sub_category ?? null,
        standard_compliance: rowDraft.standard_compliance ?? null,
        expiry_period_months: expiryPeriodVal,
        supplier: rowDraft.supplier ?? null,
        unit_cost: unitCostVal,
        pack_size: rowDraft.pack_size ?? null,
        storage_requirements: rowDraft.storage_requirements ?? null,
        typical_usage: rowDraft.typical_usage ?? null,
        notes: rowDraft.notes ?? null,
        // Stockly fields
        track_stock: rowDraft.track_stock ?? false,
        current_stock: currentStockVal,
        par_level: parLevelVal,
        reorder_point: reorderPointVal,
        reorder_qty: reorderQtyVal,
        sku: rowDraft.sku?.trim() || null,
        company_id: companyId, // Always set company_id for new items
      };

      if (newRowIds.has(id)) {
        const { data, error, status, statusText } = await supabase
          .from('first_aid_supplies_library')
          .insert(payload)
          .select('*')
          .single();
        if (error) {
          console.error('Supabase insert error (first_aid_supplies_library)', { error, status, statusText, payload });
          throw error;
        }
        setFirstAidItems(prev => prev.map(p => p.id === id ? data : p));
        setNewRowIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
      } else {
        // For updates, only allow updating company-specific items
        const existingItem = firstAidItems.find(item => item.id === id);
        if (existingItem?.company_id === null) {
          showToast({ title: 'Cannot edit', description: 'Global items cannot be edited. Create a company-specific copy to customize.', type: 'warning' });
          return;
        }
        const { company_id: _omitCompanyId, ...updatePayload } = payload;
        const { error, status, statusText } = await supabase
          .from('first_aid_supplies_library')
          .update(updatePayload)
          .eq('id', id)
          .eq('company_id', companyId);
        if (error) {
          console.error('Supabase update error (first_aid_supplies_library)', { error, status, statusText, updatePayload, id });
          throw error;
        }
        setFirstAidItems(prev => prev.map(p => p.id === id ? { ...p, ...updatePayload } : p));
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
      }
      showToast({ title: 'Saved', type: 'success' });
    } catch (error: any) {
      const description = (error && (error.message || (error as any).error_description || (error as any).hint))
        || (typeof error === 'string' ? error : '')
        || (error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : 'Unknown error');
      console.error('Error saving first aid supply:', error);
      showToast({ title: 'Error saving first aid supply', description, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this first aid supply item?')) return;
    
    try {
      const existingItem = firstAidItems.find(item => item.id === id);
      if (existingItem?.company_id === null) {
        showToast({ title: 'Cannot delete', description: 'Global items cannot be deleted.', type: 'warning' });
        return;
      }
      const { error } = await supabase
        .from('first_aid_supplies_library')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      
      if (error) throw error;
      showToast({ title: 'First aid supply deleted', type: 'success' });
      loadFirstAidItems();
    } catch (error: any) {
      console.error('Error deleting first aid supply:', error);
      showToast({ title: 'Error deleting first aid supply', description: error.message, type: 'error' });
    }
  };

  const handleEdit = (item: any) => {
    if (item.company_id === null) {
      showToast({ title: 'Cannot edit', description: 'Global items cannot be edited. Create a company-specific copy to customize.', type: 'warning' });
      return;
    }
    setEditingRowId(item.id);
    setRowDraft({
      item_name: item.item_name || '',
      category: item.category || '',
      sub_category: item.sub_category || '',
      standard_compliance: item.standard_compliance || '',
      expiry_period_months: item.expiry_period_months ?? '',
      supplier: item.supplier || '',
      unit_cost: item.unit_cost ?? '',
      pack_size: item.pack_size || '',
      storage_requirements: item.storage_requirements || '',
      typical_usage: item.typical_usage || '',
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
      setFirstAidItems(prev => prev.filter(p => p.id !== id));
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
    'sub_category',
    'standard_compliance',
    'expiry_period_months',
    'supplier',
    'unit_cost',
    'pack_size',
    'storage_requirements',
    'typical_usage',
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
        sub_category: r.sub_category ?? '',
        standard_compliance: r.standard_compliance ?? '',
        expiry_period_months: r.expiry_period_months ?? '',
        supplier: r.supplier ?? '',
        unit_cost: r.unit_cost ?? '',
        pack_size: r.pack_size ?? '',
        storage_requirements: r.storage_requirements ?? '',
        typical_usage: r.typical_usage ?? '',
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
    const csv = toCSV(firstAidItems.filter(item => item.company_id === companyId)); // Only export company-specific items
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'first_aid_supplies_library.csv'; a.click();
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
          sub_category: row[index['sub_category']] ?? null,
          standard_compliance: row[index['standard_compliance']] ?? null,
          expiry_period_months: row[index['expiry_period_months']]?.trim() ? Number(row[index['expiry_period_months']]) : null,
          supplier: row[index['supplier']] ?? null,
          unit_cost: row[index['unit_cost']]?.trim() ? Number(row[index['unit_cost']]) : null,
          pack_size: row[index['pack_size']] ?? null,
          storage_requirements: row[index['storage_requirements']] ?? null,
          typical_usage: row[index['typical_usage']] ?? null,
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
        const { data, error } = await supabase.from('first_aid_supplies_library').insert(prepared.slice(i, i+chunkSize)).select('*');
        if (error) throw error;
        setFirstAidItems(prev => [ ...(data || []), ...prev ]);
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

  const filteredItems = firstAidItems.filter((item: any) => {
    const matchesSearch = (item.item_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full bg-gray-50 dark:bg-[#0B0D13] min-h-screen">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <Package className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              First Aid Supplies Library
            </h1>
            <p className="text-sm text-gray-600 dark:text-white/60">Manage first aid supplies and equipment</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleUploadClick} className="px-4 py-2 bg-white dark:bg-white/[0.05] border border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:shadow-[0_0_12px_rgba(16,185,129,0.7)] rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2">
              <Upload size={16} />
              Upload CSV
            </button>
            <button onClick={handleDownloadCSV} className="px-4 py-2 bg-white dark:bg-white/[0.05] border border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:shadow-[0_0_12px_rgba(16,185,129,0.7)] rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2">
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
                  sub_category: '',
                  standard_compliance: '',
                  expiry_period_months: null,
                  supplier: '',
                  unit_cost: null,
                  pack_size: '',
                  storage_requirements: '',
                  typical_usage: '',
                  notes: '',
                  track_stock: false,
                  current_stock: 0,
                  par_level: null,
                  reorder_point: null,
                  reorder_qty: null,
                  sku: ''
                };
                setFirstAidItems(prev => [empty, ...prev]);
                setExpandedRows(prev => new Set(prev).add(tempId));
                setEditingRowId(tempId);
                setRowDraft({ ...empty, unit_cost: '', expiry_period_months: '', current_stock: '', par_level: '', reorder_point: '', reorder_qty: '', id: undefined });
                setNewRowIds(prev => new Set(prev).add(tempId));
              }}
              aria-label="Add First Aid Supply"
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-emerald-600 dark:border-emerald-500/60 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/10 hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-[0_0_14px_rgba(16,185,129,0.7)] transition"
            >
              <Plus size={18} />
              <span className="sr-only">Add First Aid Supply</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-white/40" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search first aid supplies..."
                className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-lg pl-10 pr-4 py-2.5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 min-w-[180px] appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {FIRST_AID_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-600 dark:text-white/60 text-center py-8">Loading first aid supplies...</div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-8 text-center">
            <p className="text-gray-600 dark:text-white/60">No first aid supplies found.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-white/[0.05] border-b border-gray-200 dark:border-white/[0.06]">
                <tr>
                  <th className="w-10 px-2" aria-label="Expand" />
                  <th className="text-left px-4 py-3 font-semibold text-gray-900 dark:text-emerald-400 text-[0.95rem]">Item Name</th>
                  <th className="text-left px-2 py-3 font-semibold text-gray-900 dark:text-emerald-400 text-[0.95rem]">Category</th>
                  <th className="text-left px-2 py-3 font-semibold text-gray-900 dark:text-emerald-400 text-[0.95rem]">Pack Size</th>
                  <th className="text-left px-2 py-3 font-semibold text-gray-900 dark:text-emerald-400 text-[0.95rem]">Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item: any) => {
                  const expanded = expandedRows.has(item.id);
                  const isGlobal = item.company_id === null;
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="border-b border-gray-100 dark:border-white/[0.05] hover:bg-gray-50 dark:hover:bg-white/[0.02] bg-white dark:bg-transparent">
                        <td className="px-2 py-3 align-top">
                          <button aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => toggleRow(item.id)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/[0.05] text-gray-600 dark:text-white/60">
                            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {editingRowId === item.id ? (
                            <input className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.item_name ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, item_name: e.target.value }))} />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900 dark:text-white font-medium">{item.item_name}</span>
                              {item.supplier && (
                                <span className="text-gray-500 dark:text-white/40 text-sm">• {item.supplier}</span>
                              )}
                              {isGlobal && <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">Global</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-3 text-gray-700 dark:text-white/80 text-sm whitespace-nowrap">
                          {editingRowId === item.id ? (
                            <select className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.category ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, category: e.target.value }))}>
                              <option value="">Select...</option>
                              {FIRST_AID_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                            </select>
                          ) : (
                            item.category || '-'
                          )}
                        </td>
                        <td className="px-2 py-3 text-gray-700 dark:text-white/80 text-sm whitespace-nowrap">
                          {editingRowId === item.id ? (
                            <input className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.pack_size ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, pack_size: e.target.value }))} />
                          ) : (
                            item.pack_size || '-'
                          )}
                        </td>
                        <td className="px-2 py-3 text-gray-700 dark:text-white/80 text-sm whitespace-nowrap">
                          {isGlobal ? 'Global' : 'Company'}
                        </td>
                      </tr>
                    {expanded && (
                      <tr className="border-t border-gray-200 dark:border-white/[0.06]">
                        <td colSpan={5} className="px-4 py-4 bg-gray-50 dark:bg-white/[0.02]">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Sub Category</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.sub_category ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, sub_category: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.sub_category || '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Standard/Compliance</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.standard_compliance ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, standard_compliance: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.standard_compliance || '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Expiry Period (Months)</div>
                              {editingRowId === item.id ? (
                                <input type="number" className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.expiry_period_months ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, expiry_period_months: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.expiry_period_months ? `${item.expiry_period_months} months` : '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Supplier</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.supplier ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, supplier: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.supplier || '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Unit Cost</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.unit_cost ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, unit_cost: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.unit_cost ? `£${item.unit_cost}` : '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Storage Requirements</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.storage_requirements ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, storage_requirements: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.storage_requirements || '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Typical Usage</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.typical_usage ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, typical_usage: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.typical_usage || '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Notes</div>
                              {editingRowId === item.id ? (
                                <textarea className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white min-h-[80px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.notes ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, notes: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{item.notes || '-'}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            {editingRowId === item.id ? (
                              <>
                                <button onClick={() => saveRow(item.id)} className="px-3 py-2 rounded-lg border border-emerald-600 dark:border-emerald-500/60 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-white/[0.05] hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:shadow-[0_0_14px_rgba(16,185,129,0.7)] transition flex items-center gap-2">
                                  <Save size={16} />
                                  <span>Save</span>
                                </button>
                                <button onClick={() => cancelEdit(item.id)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-white bg-white dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/10 transition flex items-center gap-2">
                                  <X size={16} />
                                  <span>Cancel</span>
                                </button>
                              </>
                            ) : (
                              <>
                                {!isGlobal && (
                                  <>
                                    <button aria-label="Edit First Aid Supply" onClick={() => handleEdit(item)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-emerald-600 dark:border-emerald-500/60 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/10 hover:shadow-[0_0_14px_rgba(16,185,129,0.7)] transition">
                                      <Edit size={16} />
                                      <span className="sr-only">Edit</span>
                                    </button>
                                    <button aria-label="Delete First Aid Supply" onClick={() => handleDelete(item.id)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-600 dark:border-red-500/60 text-red-600 dark:text-red-400 bg-white dark:bg-white/[0.05] hover:bg-red-50 dark:hover:bg-red-500/10 hover:shadow-[0_0_14px_rgba(239,68,68,0.55)] transition">
                                      <Trash2 size={16} />
                                      <span className="sr-only">Delete</span>
                                    </button>
                                  </>
                                )}
                                {isGlobal && (
                                  <span className="text-xs text-gray-500 dark:text-white/50">Global items are read-only</span>
                                )}
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

