"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, ChevronDown, ChevronRight, Wrench } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';

const EQUIPMENT_CATEGORIES = [
  'Large Equipment',
  'Small Equipment',
  'Pots & Pans',
  'Utensils'
];

const COLOUR_CODE_OPTIONS = ['Red', 'Blue', 'Green', 'Yellow', 'Brown', 'White', 'N/A'];

export default function EquipmentLibraryPage() {
  const { companyId } = useAppContext();

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
        .from('equipment_library')
        .select('*')
        .eq('company_id', companyId)
        .order('equipment_name');
      if (error) {
        if (error.code === '42P01') {
          console.warn('equipment_library table does not exist yet');
          if (!isCancelled) setEquipment([]);
          return;
        }
        throw error;
      }
      if (!isCancelled) setEquipment(data || []);
    } catch (error: any) {
      console.error('Error loading equipment:', error);
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
      if (!companyId) { console.error('Error saving equipment: Missing company context'); return; }
      const trimmedName = (rowDraft.equipment_name ?? '').toString().trim();
      if (!trimmedName) { console.error('Validation error: Equipment name is required'); return; }

      const payload: any = {
        equipment_name: trimmedName,
        category: rowDraft.category ?? null,
        sub_category: rowDraft.sub_category ?? null,
        colour_code: rowDraft.colour_code ?? null,
        location: rowDraft.location ?? null,
        manufacturer: rowDraft.manufacturer ?? null,
        model_serial: rowDraft.model_serial ?? null,
        purchase_date: rowDraft.purchase_date || null,
        maintenance_schedule: rowDraft.maintenance_schedule ?? null,
        notes: rowDraft.notes ?? null,
        company_id: companyId,
      };

      if (newRowIds.has(id)) {
        const { data, error, status, statusText } = await supabase
          .from('equipment_library')
          .insert(payload)
          .select('*')
          .single();
        if (error) {
          console.error('Supabase insert error (equipment_library)', { error, status, statusText, payload });
          throw error;
        }
        console.info('Equipment added');
        setEquipment(prev => prev.map((eq: any) => eq.id === id ? data : eq));
        setNewRowIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
        await loadEquipment();
      } else {
        const { company_id: _omitCompanyId, ...updatePayload } = payload;
        const { error, status, statusText } = await supabase
          .from('equipment_library')
          .update(updatePayload)
          .eq('id', id)
          .eq('company_id', companyId);
        if (error) {
          console.error('Supabase update error (equipment_library)', { error, status, statusText, updatePayload, id });
          throw error;
        }
        console.info('Equipment updated');
        setEquipment(prev => prev.map((eq: any) => eq.id === id ? { ...eq, ...updatePayload } : eq));
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
        await loadEquipment();
      }
    } catch (error: any) {
      console.error('Error saving equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this equipment item?')) return;
    try {
      const { error } = await supabase
        .from('equipment_library')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      console.info('Equipment deleted');
      loadEquipment();
    } catch (error: any) {
      console.error('Error deleting equipment:', error);
    }
  };

  const handleEdit = (item: any) => {
    setEditingRowId(item.id);
    setRowDraft({
      equipment_name: item.equipment_name || '',
      category: item.category || '',
      sub_category: item.sub_category || '',
      colour_code: item.colour_code || '',
      location: item.location || '',
      manufacturer: item.manufacturer || '',
      model_serial: item.model_serial || '',
      purchase_date: item.purchase_date || '',
      maintenance_schedule: item.maintenance_schedule || '',
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
    'equipment_name', 'category', 'sub_category', 'colour_code',
    'location', 'manufacturer', 'model_serial', 'purchase_date',
    'maintenance_schedule', 'notes'
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
        equipment_name: r.equipment_name ?? '',
        category: r.category ?? '',
        sub_category: r.sub_category ?? '',
        colour_code: r.colour_code ?? '',
        location: r.location ?? '',
        manufacturer: r.manufacturer ?? '',
        model_serial: r.model_serial ?? '',
        purchase_date: r.purchase_date ?? '',
        maintenance_schedule: r.maintenance_schedule ?? '',
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
    a.download = 'equipment_library.csv';
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
        const name = row[headerIndex['equipment_name']] ?? '';
        if (!name.trim()) continue;
        prepared.push({
          company_id: companyId,
          equipment_name: name.trim(),
          category: row[headerIndex['category']] ?? null,
          sub_category: row[headerIndex['sub_category']] ?? null,
          colour_code: row[headerIndex['colour_code']] ?? null,
          location: row[headerIndex['location']] ?? null,
          manufacturer: row[headerIndex['manufacturer']] ?? null,
          model_serial: row[headerIndex['model_serial']] ?? null,
          purchase_date: row[headerIndex['purchase_date']] || null,
          maintenance_schedule: row[headerIndex['maintenance_schedule']] ?? null,
          notes: row[headerIndex['notes']] ?? null,
        });
      }
      if (!prepared.length) { console.warn('CSV import: No rows to import'); return; }
      const chunkSize = 500;
      for (let i = 0; i < prepared.length; i += chunkSize) {
        const chunk = prepared.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from('equipment_library')
          .insert(chunk)
          .select('*');
        if (error) throw error;
        setEquipment(prev => [...(data || []), ...prev]);
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
    const matchesSearch = (item.equipment_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.manufacturer || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.model_serial || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const colourBadge = (code: string) => {
    const cls =
      code === 'Red' ? 'bg-red-500/20 text-red-400' :
      code === 'Blue' ? 'bg-blue-500/20 text-blue-400' :
      code === 'Green' ? 'bg-green-500/20 text-green-400' :
      code === 'Yellow' ? 'bg-yellow-500/20 text-yellow-400' :
      code === 'Brown' ? 'bg-amber-700/20 text-amber-400' :
      code === 'White' ? 'bg-neutral-200 dark:bg-white/20 text-theme-primary' :
      'bg-neutral-200 dark:bg-neutral-700 text-theme-tertiary';
    return <span className={`px-2 py-1 rounded-full text-xs ${cls}`}>{code}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-checkly-dark dark:bg-checkly rounded-full"></div>
            <div>
              <h1 className="text-lg font-semibold text-theme-primary">Equipment Library</h1>
              <p className="text-sm text-theme-tertiary">Manage kitchen equipment, utensils, and colour-coded items</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleUploadClick} className="px-4 py-2 bg-[rgb(var(--surface))] dark:bg-neutral-800 hover:bg-[rgb(var(--surface-elevated))] dark:hover:bg-neutral-700 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg text-theme-primary flex items-center gap-2">
            <Upload size={16} />
            Upload CSV
          </button>
          <button onClick={handleDownloadCSV} className="px-4 py-2 bg-[rgb(var(--surface))] dark:bg-neutral-800 hover:bg-[rgb(var(--surface-elevated))] dark:hover:bg-neutral-700 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg text-theme-primary flex items-center gap-2">
            <Download size={16} />
            Download CSV
          </button>
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={handleUploadChange} className="hidden" />
          <button
            onClick={() => {
              const tempId = `temp-${Date.now()}`;
              const empty: any = {
                id: tempId,
                equipment_name: '',
                category: '',
                sub_category: '',
                colour_code: '',
                location: '',
                manufacturer: '',
                model_serial: '',
                purchase_date: '',
                maintenance_schedule: '',
                notes: ''
              };
              setEquipment(prev => [empty, ...prev]);
              setExpandedRows(prev => new Set(prev).add(tempId));
              setEditingRowId(tempId);
              setRowDraft({ ...empty, id: undefined });
              setNewRowIds(prev => new Set(prev).add(tempId));
            }}
            aria-label="Add Equipment"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-checkly-dark/60 dark:border-checkly/60 text-checkly-dark dark:text-checkly bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-checkly-dark dark:hover:border-checkly hover:shadow-module-glow transition"
          >
            <Plus size={18} />
            <span className="sr-only">Add Equipment</span>
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
            placeholder="Search equipment..."
            className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-800 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-theme-primary placeholder:text-[rgb(var(--text-tertiary))]"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-[rgb(var(--surface))] dark:bg-neutral-800 border border-[rgb(var(--border))] dark:border-neutral-600 rounded-lg px-4 py-2 text-theme-primary"
        >
          <option value="all">All Categories</option>
          {EQUIPMENT_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-theme-tertiary text-center py-8">Loading equipment...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-[rgb(var(--surface-elevated))] dark:bg-neutral-800/50 rounded-xl p-8 text-center border border-theme">
          <p className="text-theme-tertiary">No equipment found.</p>
        </div>
      ) : (
        <div className="bg-[rgb(var(--surface-elevated))] dark:bg-neutral-800/50 rounded-xl border border-theme overflow-hidden">
          <table className="w-full">
            <thead className="bg-[rgb(var(--surface))] dark:bg-neutral-900">
              <tr>
                <th className="w-10 px-2" aria-label="Expand" />
                <th className="text-left px-4 py-3 font-semibold text-checkly-dark dark:text-checkly text-[0.95rem]">Name</th>
                <th className="text-left px-2 py-3 font-semibold text-checkly-dark dark:text-checkly text-[0.95rem]">Category</th>
                <th className="text-left px-2 py-3 font-semibold text-checkly-dark dark:text-checkly text-[0.95rem]">Colour Code</th>
                <th className="text-left px-2 py-3 font-semibold text-checkly-dark dark:text-checkly text-[0.95rem]">Location</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: any) => {
                const expanded = expandedRows.has(item.id);
                return (
                  <React.Fragment key={item.id}>
                    <tr className="border-t border-theme hover:bg-[rgb(var(--surface))] dark:hover:bg-neutral-800/50">
                      <td className="px-2 py-3 align-top">
                        <button aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => toggleRow(item.id)} className="p-1 rounded hover:bg-[rgb(var(--surface))] dark:hover:bg-neutral-800 text-theme-tertiary">
                          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-theme-primary">
                        {editingRowId === item.id ? (
                          <input className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-800 border border-[rgb(var(--border))] dark:border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.equipment_name ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, equipment_name: e.target.value }))} />
                        ) : (
                          item.equipment_name
                        )}
                      </td>
                      <td className="px-2 py-3 text-theme-tertiary text-sm whitespace-nowrap">
                        {editingRowId === item.id ? (
                          <select className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-800 border border-[rgb(var(--border))] dark:border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.category ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, category: e.target.value }))}>
                            <option value="">Select...</option>
                            {EQUIPMENT_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                          </select>
                        ) : (
                          item.category || '-'
                        )}
                      </td>
                      <td className="px-2 py-3 text-sm">
                        {editingRowId === item.id ? (
                          <select className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-800 border border-[rgb(var(--border))] dark:border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.colour_code ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, colour_code: e.target.value }))}>
                            <option value="">Select...</option>
                            {COLOUR_CODE_OPTIONS.map(c => (<option key={c} value={c}>{c}</option>))}
                          </select>
                        ) : (
                          item.colour_code ? colourBadge(item.colour_code) : '-'
                        )}
                      </td>
                      <td className="px-2 py-3 text-theme-tertiary text-sm whitespace-nowrap">
                        {editingRowId === item.id ? (
                          <input className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-800 border border-[rgb(var(--border))] dark:border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.location ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, location: e.target.value }))} />
                        ) : (
                          item.location || '-'
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-t border-[rgb(var(--border))] dark:border-neutral-800/60">
                        <td colSpan={5} className="px-4 py-4 bg-[rgb(var(--surface))] dark:bg-neutral-900/40">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-[rgb(var(--surface))] dark:bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Sub Category</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-800 border border-[rgb(var(--border))] dark:border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.sub_category ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, sub_category: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.sub_category || '-'}</div>
                              )}
                            </div>
                            <div className="bg-[rgb(var(--surface))] dark:bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Manufacturer</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-800 border border-[rgb(var(--border))] dark:border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.manufacturer ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, manufacturer: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.manufacturer || '-'}</div>
                              )}
                            </div>
                            <div className="bg-[rgb(var(--surface))] dark:bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Model / Serial</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-800 border border-[rgb(var(--border))] dark:border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.model_serial ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, model_serial: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.model_serial || '-'}</div>
                              )}
                            </div>
                            <div className="bg-[rgb(var(--surface))] dark:bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Purchase Date</div>
                              {editingRowId === item.id ? (
                                <input type="date" className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-800 border border-[rgb(var(--border))] dark:border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.purchase_date ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, purchase_date: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.purchase_date || '-'}</div>
                              )}
                            </div>
                            <div className="bg-[rgb(var(--surface))] dark:bg-neutral-800/60 border border-theme rounded-lg p-3">
                              <div className="text-xs text-theme-tertiary">Maintenance Schedule</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-800 border border-[rgb(var(--border))] dark:border-neutral-600 rounded px-2 py-1 text-theme-primary" value={rowDraft?.maintenance_schedule ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, maintenance_schedule: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary">{item.maintenance_schedule || '-'}</div>
                              )}
                            </div>
                            <div className="bg-[rgb(var(--surface))] dark:bg-neutral-800/60 border border-theme rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs text-theme-tertiary">Notes</div>
                              {editingRowId === item.id ? (
                                <textarea className="w-full bg-[rgb(var(--surface))] dark:bg-neutral-800 border border-[rgb(var(--border))] dark:border-neutral-600 rounded px-2 py-1 text-theme-primary min-h-[80px]" value={rowDraft?.notes ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, notes: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-theme-primary whitespace-pre-wrap">{item.notes || '-'}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            {editingRowId === item.id ? (
                              <>
                                <button onClick={() => saveRow(item.id)} className="px-3 py-2 rounded-lg border border-checkly-dark/60 dark:border-checkly/60 text-theme-primary bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-checkly-dark dark:hover:border-checkly hover:shadow-module-glow transition flex items-center gap-2">
                                  <Save size={16} className="text-checkly-dark dark:text-checkly" />
                                  <span>Save</span>
                                </button>
                                <button onClick={() => cancelEdit(item.id)} className="px-3 py-2 rounded-lg border border-[rgb(var(--border))] dark:border-neutral-600 text-theme-primary bg-white/5 backdrop-blur-sm hover:bg-white/10 transition flex items-center gap-2">
                                  <X size={16} className="text-theme-tertiary" />
                                  <span>Cancel</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button aria-label="Edit Equipment" onClick={() => handleEdit(item)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-checkly-dark/60 dark:border-checkly/60 text-checkly-dark dark:text-checkly bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-checkly-dark dark:hover:border-checkly hover:shadow-module-glow transition">
                                  <Edit size={16} />
                                  <span className="sr-only">Edit</span>
                                </button>
                                <button aria-label="Delete Equipment" onClick={() => handleDelete(item.id)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-500/60 text-red-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-red-400 hover:shadow-module-glow transition">
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
