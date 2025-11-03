"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, AlertTriangle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

export default function ChemicalsClient() {
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [chemicals, setChemicals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<any | null>(null);
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    product_name: '',
    manufacturer: '',
    use_case: '',
    hazard_symbols: [],
    dilution_ratio: '',
    contact_time: '',
    required_ppe: [],
    supplier: '',
    unit_cost: '',
    pack_size: '',
    storage_requirements: '',
    linked_risks: [],
    notes: ''
  });

  const isFetchingRef = useRef(false);

  const loadChemicals = async () => {
    if (isFetchingRef.current) return; // prevent overlaps in StrictMode
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);

      const { data, error } = await supabase
        .from('chemicals_library')
        .select('*')
        .eq('company_id', companyId)
        .order('product_name');

      if (error) throw error;

      const { data: coshhSheets } = await supabase
        .from('coshh_data_sheets')
        .select('chemical_id, status, expiry_date')
        .eq('company_id', companyId)
        .eq('status', 'Active');

      const chemicalsWithCOSHH = (data || []).map(chem => {
        const coshhSheet = coshhSheets?.find(s => s.chemical_id === chem.id);
        return {
          ...chem,
          hasCOSHHSheet: !!coshhSheet,
          coshhExpiryDate: coshhSheet?.expiry_date || null
        };
      });

      setChemicals(chemicalsWithCOSHH);
    } catch (error) {
      console.error('Error loading chemicals:', error);
      showToast({ title: 'Error loading chemicals', description: (error as any)?.message, type: 'error' });
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    let isCancelled = false;
    
    loadChemicals();
    return () => {
      isCancelled = true;
    };
  }, [companyId]);

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        company_id: companyId,
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null
      };

      if (editingItem) {
        const { error } = await supabase
          .from('chemicals_library')
          .update(payload)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        showToast({ title: 'Chemical updated', type: 'success' });
      } else {
        const { error } = await supabase
          .from('chemicals_library')
          .insert(payload);
        
        if (error) throw error;
        showToast({ title: 'Chemical added', type: 'success' });
      }

      setShowModal(false);
      setEditingItem(null);
      resetForm();
      // Reload list after save
      // trigger by companyId change; do an immediate refresh here too
      // without recreating the effect
      (async () => {
        try {
          isFetchingRef.current = true;
          setLoading(true);
          const { data } = await supabase
            .from('chemicals_library')
            .select('*')
            .eq('company_id', companyId)
            .order('product_name');
          const { data: coshhSheets } = await supabase
            .from('coshh_data_sheets')
            .select('chemical_id, status, expiry_date')
            .eq('company_id', companyId)
            .eq('status', 'Active');
          const chemicalsWithCOSHH = (data || []).map(chem => {
            const coshhSheet = coshhSheets?.find(s => s.chemical_id === chem.id);
            return { ...chem, hasCOSHHSheet: !!coshhSheet, coshhExpiryDate: coshhSheet?.expiry_date || null };
          });
          setChemicals(chemicalsWithCOSHH);
        } finally {
          setLoading(false);
          isFetchingRef.current = false;
        }
      })();
    } catch (error) {
      console.error('Error saving chemical:', error);
      showToast({ title: 'Error saving chemical', description: error.message, type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this chemical?')) return;
    
    try {
      const { error } = await supabase
        .from('chemicals_library')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      showToast({ title: 'Chemical deleted', type: 'success' });
      loadChemicals();
    } catch (error) {
      console.error('Error deleting chemical:', error);
      showToast({ title: 'Error deleting chemical', description: (error as any)?.message, type: 'error' });
    }
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      manufacturer: '',
      use_case: '',
      hazard_symbols: [],
      dilution_ratio: '',
      contact_time: '',
      required_ppe: [],
      supplier: '',
      unit_cost: '',
      pack_size: '',
      storage_requirements: '',
      linked_risks: [],
      notes: ''
    });
  };

  const handleEdit = (item: any) => {
    // Activate inline edit mode for this row
    setEditingRowId(item.id);
    setRowDraft({
      product_name: item.product_name || '',
      manufacturer: item.manufacturer || '',
      use_case: item.use_case || '',
      hazard_symbols: item.hazard_symbols || [],
      dilution_ratio: item.dilution_ratio || '',
      contact_time: item.contact_time || '',
      required_ppe: item.required_ppe || [],
      supplier: item.supplier || '',
      unit_cost: item.unit_cost ?? '',
      pack_size: item.pack_size || '',
      storage_requirements: item.storage_requirements || '',
      linked_risks: item.linked_risks || [],
      notes: item.notes || ''
    });
    // Ensure row is expanded while editing
    setExpandedRows(prev => new Set(prev).add(item.id));
  };

  const cancelRowEdit = () => {
    setEditingRowId(null);
    setRowDraft(null);
  };

  const saveRowEdit = async (id: string) => {
    if (!rowDraft) return;
    try {
      setLoading(true);
      const payload: any = {
        ...rowDraft,
        company_id: companyId,
        unit_cost: rowDraft.unit_cost === '' ? null : parseFloat(rowDraft.unit_cost)
      };
      if (newRowIds.has(id)) {
        // Insert new
        const { data, error } = await supabase
          .from('chemicals_library')
          .insert(payload)
          .select('*')
          .single();
        if (error) throw error;
        showToast({ title: 'Chemical added', type: 'success' });
        // Replace temp row with inserted row, include derived fields
        setChemicals(prev => prev.map((c: any) => c.id === id ? { ...data, hasCOSHHSheet: false, coshhExpiryDate: null } : c));
        setNewRowIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        // Also collapse row after save
        setExpandedRows(prev => {
          const next = new Set(prev);
          next.delete(id);
          next.add(data.id); // track by new id if needed later
          return next;
        });
        setEditingRowId(null);
        setRowDraft(null);
      } else {
        // Update existing
        const { error } = await supabase
          .from('chemicals_library')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
        showToast({ title: 'Chemical updated', type: 'success' });
        // Update local state without full refetch
        setChemicals(prev => prev.map((c: any) => c.id === id ? { ...c, ...payload } : c));
        setEditingRowId(null);
        setRowDraft(null);
      }
    } catch (error) {
      console.error('Error updating chemical:', error);
      showToast({ title: 'Error updating chemical', description: (error as any)?.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = chemicals.filter((item: any) => 
    (item.product_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // CSV helpers
  const CSV_HEADERS = [
    'product_name',
    'manufacturer',
    'use_case',
    'hazard_symbols',
    'dilution_ratio',
    'contact_time',
    'required_ppe',
    'coshh_sheet_url',
    'supplier',
    'unit_cost',
    'pack_size',
    'storage_requirements',
    'linked_risks',
    'first_aid_instructions',
    'environmental_info',
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
        product_name: r.product_name ?? '',
        manufacturer: r.manufacturer ?? '',
        use_case: r.use_case ?? '',
        hazard_symbols: (r.hazard_symbols || []).join('; '),
        dilution_ratio: r.dilution_ratio ?? '',
        contact_time: r.contact_time ?? '',
        required_ppe: (r.required_ppe || []).join('; '),
        coshh_sheet_url: r.coshh_sheet_url ?? '',
        supplier: r.supplier ?? '',
        unit_cost: r.unit_cost ?? '',
        pack_size: r.pack_size ?? '',
        storage_requirements: r.storage_requirements ?? '',
        linked_risks: (r.linked_risks || []).join('; '),
        first_aid_instructions: r.first_aid_instructions ?? '',
        environmental_info: r.environmental_info ?? '',
        notes: r.notes ?? ''
      };
      return CSV_HEADERS.map((h) => escapeCSV(obj[h])).join(',');
    }).join('\n');
    return header + (body ? ('\n' + body) : '');
  };

  const handleDownloadCSV = () => {
    // If no data yet, provide a template with just headers
    const csv = toCSV(chemicals.length ? chemicals : []);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chemicals_library.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    // Simple CSV parser with quote handling
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
    // Accept both comma and semicolon separators
    if (!cell) return [];
    return cell.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  };

  const handleUploadClick = () => {
    csvInputRef.current?.click();
  };

  const handleUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      if (!headers.length) throw new Error('CSV has no headers');
      // Map each row to an object using known headers; unknown headers are ignored
      const headerIndex: Record<string, number> = {};
      headers.forEach((h, i) => { headerIndex[h] = i; });

      const toCell = (h: string): string => {
        const idx = headerIndex[h];
        return idx !== undefined ? (rowsRow[idx] ?? '').trim() : '';
      };

      const prepared: any[] = [];
      for (const rowsRow of rows) {
        const productName = rowsRow[headerIndex['product_name']] ?? '';
        if (!productName || !productName.trim()) continue; // skip empty rows
        const unitCostRaw = rowsRow[headerIndex['unit_cost']];
        prepared.push({
          company_id: companyId,
          product_name: productName.trim(),
          manufacturer: rowsRow[headerIndex['manufacturer']] ?? null,
          use_case: rowsRow[headerIndex['use_case']] ?? null,
          hazard_symbols: normaliseArrayCell(rowsRow[headerIndex['hazard_symbols']]).length ? normaliseArrayCell(rowsRow[headerIndex['hazard_symbols']]) : null,
          dilution_ratio: rowsRow[headerIndex['dilution_ratio']] ?? null,
          contact_time: rowsRow[headerIndex['contact_time']] ?? null,
          required_ppe: normaliseArrayCell(rowsRow[headerIndex['required_ppe']]).length ? normaliseArrayCell(rowsRow[headerIndex['required_ppe']]) : null,
          coshh_sheet_url: rowsRow[headerIndex['coshh_sheet_url']] ?? null,
          supplier: rowsRow[headerIndex['supplier']] ?? null,
          unit_cost: unitCostRaw && unitCostRaw.trim() !== '' ? Number(unitCostRaw) : null,
          pack_size: rowsRow[headerIndex['pack_size']] ?? null,
          storage_requirements: rowsRow[headerIndex['storage_requirements']] ?? null,
          linked_risks: normaliseArrayCell(rowsRow[headerIndex['linked_risks']]).length ? normaliseArrayCell(rowsRow[headerIndex['linked_risks']]) : null,
          first_aid_instructions: rowsRow[headerIndex['first_aid_instructions']] ?? null,
          environmental_info: rowsRow[headerIndex['environmental_info']] ?? null,
          notes: rowsRow[headerIndex['notes']] ?? null,
        });
      }

      if (!prepared.length) {
        showToast({ title: 'No rows to import', type: 'warning' });
        return;
      }

      // Insert in chunks of 500 to be safe
      const chunkSize = 500;
      for (let i = 0; i < prepared.length; i += chunkSize) {
        const chunk = prepared.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from('chemicals_library')
          .insert(chunk)
          .select('*');
        if (error) throw error;
        // Merge into local state with derived fields defaults
        const withDerived = (data || []).map((d: any) => ({ ...d, hasCOSHHSheet: false, coshhExpiryDate: null }));
        setChemicals(prev => [...withDerived, ...prev]);
      }

      showToast({ title: 'Import complete', description: `Imported ${prepared.length} row(s)`, type: 'success' });
    } catch (error) {
      console.error('CSV import error:', error);
      showToast({ title: 'Import failed', description: (error as any)?.message ?? 'Unable to import CSV', type: 'error' });
    } finally {
      setLoading(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-red-500 rounded-full"></div>
            <div>
              <h1 className="text-lg font-semibold text-white">Chemicals Library</h1>
              <p className="text-sm text-neutral-400">Manage cleaning chemicals and COSHH data</p>
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
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleUploadChange}
            className="hidden"
          />
          <button
            onClick={() => {
              // Create a temporary row at the top in edit mode
              const tempId = `temp-${Date.now()}`;
              const empty: any = {
                id: tempId,
                product_name: '',
                manufacturer: '',
                use_case: '',
                hazard_symbols: [],
                dilution_ratio: '',
                contact_time: '',
                required_ppe: [],
                supplier: '',
                unit_cost: null,
                pack_size: '',
                storage_requirements: '',
                linked_risks: [],
                notes: '',
                hasCOSHHSheet: false,
                coshhExpiryDate: null,
              };
              setChemicals(prev => [empty, ...prev]);
              setExpandedRows(prev => new Set(prev).add(tempId));
              setEditingRowId(tempId);
              setRowDraft({
                product_name: '',
                manufacturer: '',
                use_case: '',
                hazard_symbols: [],
                dilution_ratio: '',
                contact_time: '',
                required_ppe: [],
                supplier: '',
                unit_cost: '',
                pack_size: '',
                storage_requirements: '',
                linked_risks: [],
                notes: ''
              });
              setNewRowIds(prev => new Set(prev).add(tempId));
            }}
            aria-label="Add Chemical"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-[0_0_14px_rgba(233,0,126,0.55)] transition"
          >
            <Plus size={18} />
            <span className="sr-only">Add Chemical</span>
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search chemicals..."
          className="w-full bg-neutral-800 border border-neutral-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-400"
        />
      </div>

      {loading ? (
        <div className="text-neutral-400 text-center py-8">Loading chemicals...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-neutral-800/50 rounded-xl p-8 text-center border border-neutral-700">
          <p className="text-neutral-400">No chemicals found.</p>
        </div>
      ) : (
        <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-900">
              <tr>
                <th className="w-10 px-2" aria-label="Expand" />
                <th className="text-left px-4 py-3 font-semibold text-magenta-400 text-[0.95rem]">Product Name</th>
                <th className="text-left px-2 py-3 font-semibold text-magenta-400 text-[0.95rem]">Manufacturer</th>
                <th className="text-left px-2 py-3 font-semibold text-magenta-400 text-[0.95rem]">Pack Size</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: any) => {
                const expanded = expandedRows.has(item.id);
                return (
                  <React.Fragment key={item.id}>
                    <tr className="border-t border-neutral-700 hover:bg-neutral-800/50">
                      <td className="px-2 py-3 align-top">
                        <button
                          aria-label={expanded ? 'Collapse' : 'Expand'}
                          onClick={() => toggleRow(item.id)}
                          className="p-1 rounded hover:bg-neutral-800 text-neutral-300"
                        >
                          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-white">
                        {editingRowId === item.id ? (
                          <input
                            className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white"
                            value={rowDraft?.product_name ?? ''}
                            onChange={(e) => setRowDraft((d: any) => ({ ...d, product_name: e.target.value }))}
                          />
                        ) : (
                          item.product_name
                        )}
                      </td>
                      <td className="px-2 py-3 text-neutral-400 text-sm whitespace-nowrap">
                        {editingRowId === item.id ? (
                          <input
                            className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white"
                            value={rowDraft?.manufacturer ?? ''}
                            onChange={(e) => setRowDraft((d: any) => ({ ...d, manufacturer: e.target.value }))}
                          />
                        ) : (
                          item.manufacturer || '-'
                        )}
                      </td>
                      <td className="px-2 py-3 text-neutral-400 text-sm whitespace-nowrap">
                        {editingRowId === item.id ? (
                          <input
                            className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white"
                            value={rowDraft?.pack_size ?? ''}
                            onChange={(e) => setRowDraft((d: any) => ({ ...d, pack_size: e.target.value }))}
                          />
                        ) : (
                          item.pack_size || '-'
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-t border-neutral-800/60">
                        <td colSpan={4} className="px-4 py-4 bg-neutral-900/40">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Use Case</div>
                              {editingRowId === item.id ? (
                                <input
                                  className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white"
                                  value={rowDraft?.use_case ?? ''}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, use_case: e.target.value }))}
                                />
                              ) : (
                                <div className="text-sm text-white">{item.use_case || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Hazards</div>
                              {editingRowId === item.id ? (
                                <input
                                  className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white"
                                  placeholder="Comma-separated"
                                  value={(rowDraft?.hazard_symbols || []).join(', ')}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, hazard_symbols: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                                />
                              ) : (
                                <div className="text-sm text-white flex items-center gap-2">
                                  {item.hazard_symbols && item.hazard_symbols.length > 0 ? (
                                    <>
                                      <AlertTriangle size={14} className="text-red-400" />
                                      <span>{item.hazard_symbols.join(', ')}</span>
                                    </>
                                  ) : (
                                    <span className="text-neutral-400">None</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">COSHH Sheet</div>
                              <div className="text-sm text-white flex items-center gap-2">
                                {item.hasCOSHHSheet ? (
                                  <>
                                    <CheckCircle size={16} className="text-green-400" />
                                    <span>Uploaded</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle size={16} className="text-red-400" />
                                    <span className="text-red-300">Missing</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Contact Time</div>
                              {editingRowId === item.id ? (
                                <input
                                  className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white"
                                  value={rowDraft?.contact_time ?? ''}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, contact_time: e.target.value }))}
                                />
                              ) : (
                                <div className="text-sm text-white">{item.contact_time || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Dilution</div>
                              {editingRowId === item.id ? (
                                <input
                                  className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white"
                                  value={rowDraft?.dilution_ratio ?? ''}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, dilution_ratio: e.target.value }))}
                                />
                              ) : (
                                <div className="text-sm text-white">{item.dilution_ratio || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Required PPE</div>
                              {editingRowId === item.id ? (
                                <input
                                  className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white"
                                  placeholder="Comma-separated"
                                  value={(rowDraft?.required_ppe || []).join(', ')}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, required_ppe: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                                />
                              ) : (
                                <div className="text-sm text-white">{(item.required_ppe || []).join(', ') || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Supplier</div>
                              {editingRowId === item.id ? (
                                <input
                                  className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white"
                                  value={rowDraft?.supplier ?? ''}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, supplier: e.target.value }))}
                                />
                              ) : (
                                <div className="text-sm text-white">{item.supplier || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Unit Cost</div>
                              {editingRowId === item.id ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white"
                                  value={rowDraft?.unit_cost ?? ''}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, unit_cost: e.target.value }))}
                                />
                              ) : (
                                <div className="text-sm text-white">{item.unit_cost ? `£${item.unit_cost}` : '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Storage</div>
                              {editingRowId === item.id ? (
                                <input
                                  className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white"
                                  value={rowDraft?.storage_requirements ?? ''}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, storage_requirements: e.target.value }))}
                                />
                              ) : (
                                <div className="text-sm text-white">{item.storage_requirements || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3">
                              <div className="text-xs text-neutral-400">Linked Risks</div>
                              {editingRowId === item.id ? (
                                <input
                                  className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white"
                                  placeholder="Comma-separated"
                                  value={(rowDraft?.linked_risks || []).join(', ')}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, linked_risks: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                                />
                              ) : (
                                <div className="text-sm text-white">{(item.linked_risks || []).join(', ') || '-'}</div>
                              )}
                            </div>
                            <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs text-neutral-400">Notes</div>
                              {editingRowId === item.id ? (
                                <textarea
                                  className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white min-h-[80px]"
                                  value={rowDraft?.notes ?? ''}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, notes: e.target.value }))}
                                />
                              ) : (
                                <div className="text-sm text-white whitespace-pre-wrap">{item.notes || '-'}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            {editingRowId === item.id ? (
                              <>
                                <button
                                  onClick={() => saveRowEdit(item.id)}
                                  className="px-3 py-2 rounded-lg border border-magenta-500/60 text-white bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-[0_0_14px_rgba(233,0,126,0.55)] transition flex items-center gap-2"
                                >
                                  <Save size={16} className="text-magenta-400" />
                                  <span>Save</span>
                                </button>
                                <button onClick={() => {
                                  if (newRowIds.has(item.id)) {
                                    // remove temp row on cancel
                                    setChemicals(prev => prev.filter((c: any) => c.id !== item.id));
                                    setNewRowIds(prev => {
                                      const next = new Set(prev);
                                      next.delete(item.id);
                                      return next;
                                    });
                                    setExpandedRows(prev => {
                                      const next = new Set(prev);
                                      next.delete(item.id);
                                      return next;
                                    });
                                    cancelRowEdit();
                                  } else {
                                    cancelRowEdit();
                                  }
                                }} className="px-3 py-2 rounded-lg border border-neutral-600 text-white bg-white/5 backdrop-blur-sm hover:bg-white/10 transition flex items-center gap-2">
                                  <X size={16} className="text-neutral-300" />
                                  <span>Cancel</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  aria-label="Edit Chemical"
                                  onClick={() => handleEdit(item)}
                                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-[0_0_14px_rgba(233,0,126,0.55)] transition"
                                >
                                  <Edit size={16} />
                                  <span className="sr-only">Edit</span>
                                </button>
                                <button
                                  aria-label="Delete Chemical"
                                  onClick={() => handleDelete(item.id)}
                                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-500/60 text-red-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-red-400 hover:shadow-[0_0_14px_rgba(239,68,68,0.55)] transition"
                                >
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-xl border border-neutral-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                {editingItem ? 'Edit Chemical' : 'Add Chemical'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                  resetForm();
                }}
                className="text-neutral-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* form fields kept above */}
          </div>
        </div>
      )}
    </div>
  );
}
