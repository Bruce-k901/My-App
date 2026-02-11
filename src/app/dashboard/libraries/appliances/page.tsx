"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, ChevronDown, ChevronRight } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';

export default function AppliancesLibraryPage() {
  const { companyId, profile } = useAppContext();

  const [loading, setLoading] = useState(true);
  const [appliances, setAppliances] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSite, setFilterSite] = useState<string>('all');
  const [filterHasLabel, setFilterHasLabel] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<any | null>(null);
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const isFetchingRef = useRef(false);
  
  const loadAppliances = async () => {
    if (isFetchingRef.current) return;
    if (!companyId) { setLoading(false); return; }
    let isCancelled = false;
    try {
      isFetchingRef.current = true;
      setLoading(true);
      const { data, error } = await supabase
        .from('pat_appliances')
        .select(`
          *,
          sites (
            id,
            name
          )
        `)
        .eq('company_id', companyId)
        .order('name');
      if (error) throw error;
      if (!isCancelled) setAppliances(data || []);
    } catch (error: any) {
      console.error('Error loading appliances:', error);
    } finally {
      if (!isCancelled) setLoading(false);
      isFetchingRef.current = false;
    }
    return () => { isCancelled = true; };
  };

  const loadSites = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name');
      if (error) throw error;
      setSites(data || []);
    } catch (error: any) {
      console.error('Error loading sites:', error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) {
        await Promise.all([loadAppliances(), loadSites()]);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const saveRow = async (id: string) => {
    if (!rowDraft) return;
    try {
      setLoading(true);
      if (!companyId) { console.error('Error saving appliance: Missing company context'); return; }
      const trimmedName = (rowDraft.name ?? '').toString().trim();
      if (!trimmedName) { console.error('Validation error: Appliance name is required'); return; }
      if (!rowDraft.site_id) { console.error('Validation error: Site is required'); return; }

      const purchaseDate = rowDraft.purchase_date && rowDraft.purchase_date.trim() !== '' 
        ? rowDraft.purchase_date 
        : null;

      const payload: any = {
        name: trimmedName,
        brand: rowDraft.brand && rowDraft.brand.trim() !== '' ? rowDraft.brand.trim() : null,
        site_id: rowDraft.site_id,
        purchase_date: purchaseDate,
        has_current_pat_label: rowDraft.has_current_pat_label ?? false,
        notes: rowDraft.notes && rowDraft.notes.trim() !== '' ? rowDraft.notes.trim() : null,
        company_id: companyId,
      };

      if (newRowIds.has(id)) {
        const { data, error, status, statusText } = await supabase
          .from('pat_appliances')
          .insert(payload)
          .select(`
            *,
            sites (
              id,
              name
            )
          `)
          .single();
        if (error) {
          console.error('Supabase insert error (pat_appliances)', { error, status, statusText, payload });
          throw error;
        }
        console.info('Appliance added');
        setAppliances(prev => prev.map((app: any) => app.id === id ? data : app));
        setNewRowIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
        setEditingRowId(null);
        setRowDraft(null);
        await loadAppliances();
      } else {
        const { company_id: _omitCompanyId, ...updatePayload } = payload;
        const { error, status, statusText } = await supabase
          .from('pat_appliances')
          .update(updatePayload)
          .eq('id', id)
          .eq('company_id', companyId);
        if (error) {
          console.error('Supabase update error (pat_appliances)', { error, status, statusText, updatePayload, id });
          throw error;
        }
        console.info('Appliance updated');
        await loadAppliances();
      }
    } catch (error: any) {
      console.error('Error saving appliance:', error);
    } finally {
      setLoading(false);
      setEditingRowId(null);
      setRowDraft(null);
      setExpandedRows(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this appliance?')) return;
    try {
      const { error } = await supabase
        .from('pat_appliances')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      console.info('Appliance deleted');
      loadAppliances();
    } catch (error: any) {
      console.error('Error deleting appliance:', error);
    }
  };

  const handleEdit = (item: any) => {
    setEditingRowId(item.id);
    setRowDraft({
      name: item.name || '',
      brand: item.brand || '',
      site_id: item.site_id || '',
      purchase_date: item.purchase_date || '',
      has_current_pat_label: item.has_current_pat_label ?? false,
      notes: item.notes || ''
    });
    setExpandedRows(prev => new Set(prev).add(item.id));
  };

  const cancelEdit = (id: string) => {
    if (newRowIds.has(id)) {
      setAppliances(prev => prev.filter((app: any) => app.id !== id));
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
    'name',
    'brand',
    'site_name',
    'purchase_date',
    'has_current_pat_label',
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
      const siteName = r.sites?.name || '';
      const obj: any = {
        name: r.name ?? '',
        brand: r.brand ?? '',
        site_name: siteName,
        purchase_date: r.purchase_date ?? '',
        has_current_pat_label: r.has_current_pat_label ? 'Yes' : 'No',
        notes: r.notes ?? ''
      };
      return CSV_HEADERS.map((h) => escapeCSV(obj[h])).join(',');
    }).join('\n');
    return header + (body ? ('\n' + body) : '');
  };

  const handleDownloadCSV = () => {
    const csv = toCSV(appliances.length ? appliances : []);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pat_appliances_library.csv';
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
      
      // Build site name to ID mapping
      const siteMap = new Map<string, string>();
      sites.forEach(site => {
        siteMap.set(site.name.toLowerCase(), site.id);
      });

      const prepared: any[] = [];
      for (const row of rows) {
        const name = row[headerIndex['name']] ?? '';
        if (!name.trim()) continue;
        
        const siteName = row[headerIndex['site_name']] ?? '';
        const siteId = siteMap.get(siteName.toLowerCase());
        if (!siteId) {
          console.warn(`Skipping row: Site "${siteName}" not found`);
          continue;
        }

        const purchaseDateRaw = row[headerIndex['purchase_date']];
        const purchaseDate = purchaseDateRaw && purchaseDateRaw.trim() !== '' ? purchaseDateRaw.trim() : null;
        
        const hasLabelRaw = row[headerIndex['has_current_pat_label']];
        const hasLabel = hasLabelRaw && (
          hasLabelRaw.toLowerCase() === 'yes' || 
          hasLabelRaw.toLowerCase() === 'true' || 
          hasLabelRaw === '1'
        );

        prepared.push({
          company_id: companyId,
          name: name.trim(),
          brand: row[headerIndex['brand']]?.trim() || null,
          site_id: siteId,
          purchase_date: purchaseDate,
          has_current_pat_label: hasLabel,
          notes: row[headerIndex['notes']]?.trim() || null,
        });
      }
      if (!prepared.length) { console.warn('CSV import: No rows to import'); return; }
      const chunkSize = 500;
      for (let i = 0; i < prepared.length; i += chunkSize) {
        const chunk = prepared.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('pat_appliances')
          .insert(chunk);
        if (error) throw error;
      }
      console.info(`Import complete: Imported ${prepared.length} row(s)`);
      await loadAppliances();
    } catch (err: any) {
      console.error('CSV import error:', err);
    } finally {
      setLoading(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };


  const filteredItems = appliances.filter((item: any) => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.brand || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSite = filterSite === 'all' || item.site_id === filterSite;
    const matchesLabel = filterHasLabel === 'all' || 
                        (filterHasLabel === 'yes' && item.has_current_pat_label) ||
                        (filterHasLabel === 'no' && !item.has_current_pat_label);
    return matchesSearch && matchesSite && matchesLabel;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
            <div>
              <h1 className="text-lg font-semibold text-white">Appliances Library</h1>
              <p className="text-sm text-neutral-400">Manage portable electrical appliances for PAT testing</p>
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
                name: '',
                brand: '',
                site_id: '',
                purchase_date: '',
                has_current_pat_label: false,
                notes: '',
                sites: null
              };
              setAppliances(prev => [empty, ...prev]);
              setExpandedRows(prev => new Set(prev).add(tempId));
              setEditingRowId(tempId);
              setRowDraft({ ...empty, id: undefined });
              setNewRowIds(prev => new Set(prev).add(tempId));
            }}
            aria-label="Add Appliance"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-[0_0_14px_rgba(233,0,126,0.55)] transition"
          >
            <Plus size={18} />
            <span className="sr-only">Add Appliance</span>
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
            placeholder="Search appliances..."
            className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400"
          />
        </div>
        <select
          value={filterSite}
          onChange={(e) => setFilterSite(e.target.value)}
          className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Sites</option>
          {sites.map(site => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>
        <select
          value={filterHasLabel}
          onChange={(e) => setFilterHasLabel(e.target.value)}
          className="bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Labels</option>
          <option value="yes">Has PAT Label</option>
          <option value="no">Missing PAT Label</option>
        </select>
      </div>

      {loading ? (
        <div className="text-neutral-400 text-center py-8">Loading appliances...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-neutral-700">
          <p className="text-neutral-400">No appliances found.</p>
        </div>
      ) : (
        <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-900">
              <tr>
                <th className="w-10 px-2" aria-label="Expand" />
                <th className="text-left px-4 py-3 font-semibold text-magenta-400 text-[0.95rem]">Appliance Name</th>
                <th className="text-left px-2 py-3 font-semibold text-magenta-400 text-[0.95rem]">Brand</th>
                <th className="text-left px-2 py-3 font-semibold text-magenta-400 text-[0.95rem]">Site</th>
                <th className="text-left px-2 py-3 font-semibold text-magenta-400 text-[0.95rem]">PAT Label</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: any) => {
                const expanded = expandedRows.has(item.id);
                const siteName = item.sites?.name || 'Unknown Site';
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
                          <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.name ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, name: e.target.value }))} />
                        ) : (
                          item.name
                        )}
                      </td>
                      <td className="px-2 py-3 text-neutral-400 text-sm">
                        {editingRowId === item.id ? (
                          <input className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.brand ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, brand: e.target.value }))} />
                        ) : (
                          item.brand || '-'
                        )}
                      </td>
                      <td className="px-2 py-3 text-neutral-400 text-sm">
                        {editingRowId === item.id ? (
                          <select className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.site_id ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, site_id: e.target.value }))}>
                            <option value="">Select site...</option>
                            {sites.map(site => (
                              <option key={site.id} value={site.id}>{site.name}</option>
                            ))}
                          </select>
                        ) : (
                          siteName
                        )}
                      </td>
                      <td className="px-2 py-3">
                        {editingRowId === item.id ? (
                          <select className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" value={rowDraft?.has_current_pat_label ? 'true' : 'false'} onChange={(e) => setRowDraft((d: any) => ({ ...d, has_current_pat_label: e.target.value === 'true' }))}>
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                          </select>
                        ) : (
                          item.has_current_pat_label ? (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Yes</span>
                          ) : (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">No</span>
                          )
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-t border-neutral-800/60">
                        <td colSpan={5} className="px-4 py-4 bg-neutral-900/40">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Purchase Date</div>
                              {editingRowId === item.id ? (
                                <input 
                                  type="date"
                                  className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white" 
                                  value={rowDraft?.purchase_date ?? ''} 
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, purchase_date: e.target.value }))} 
                                />
                              ) : (
                                <div className="text-sm text-white">{item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3 md:col-span-2">
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
                                <button aria-label="Edit Appliance" onClick={() => handleEdit(item)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-[0_0_14px_rgba(233,0,126,0.55)] transition">
                                  <Edit size={16} />
                                  <span className="sr-only">Edit</span>
                                </button>
                                <button aria-label="Delete Appliance" onClick={() => handleDelete(item.id)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-500/60 text-red-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-red-400 hover:shadow-[0_0_14px_rgba(239,68,68,0.55)] transition">
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

