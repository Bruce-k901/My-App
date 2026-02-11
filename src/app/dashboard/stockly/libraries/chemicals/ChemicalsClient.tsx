"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Upload, Download, Edit, Trash2, Save, X, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, FileText, Package } from '@/components/ui/icons';
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
  // COSHH upload state
  const [coshhUploadingFor, setCoshhUploadingFor] = useState<string | null>(null);
  const [coshhSelectedFiles, setCoshhSelectedFiles] = useState<{ [key: string]: File | null }>({});
  const [coshhConfirmModal, setCoshhConfirmModal] = useState<string | null>(null);
  const coshhFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
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
        .select('id, chemical_id, file_url, file_name, status, expiry_date')
        .eq('company_id', companyId)
        .eq('status', 'Active');

      const chemicalsWithCOSHH = (data || []).map(chem => {
        const coshhSheet = coshhSheets?.find(s => s.chemical_id === chem.id);
        return {
          ...chem,
          hasCOSHHSheet: !!coshhSheet && !!coshhSheet.file_url,
          coshhSheet: coshhSheet || null,
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
            .select('id, chemical_id, file_url, file_name, status, expiry_date')
            .eq('company_id', companyId)
            .eq('status', 'Active');
          const chemicalsWithCOSHH = (data || []).map(chem => {
            const coshhSheet = coshhSheets?.find(s => s.chemical_id === chem.id);
            return { 
              ...chem, 
              hasCOSHHSheet: !!coshhSheet && !!coshhSheet.file_url,
              coshhSheet: coshhSheet || null,
              coshhExpiryDate: coshhSheet?.expiry_date || null 
            };
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
      notes: item.notes || '',
      // Stockly fields
      track_stock: item.track_stock ?? false,
      current_stock: item.current_stock ?? '',
      par_level: item.par_level ?? '',
      reorder_point: item.reorder_point ?? '',
      reorder_qty: item.reorder_qty ?? '',
      sku: item.sku || ''
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
      const unitCostRaw = rowDraft.unit_cost;
      const unitCostVal = unitCostRaw === '' || unitCostRaw === null || unitCostRaw === undefined
        ? null
        : parseFloat(String(unitCostRaw));
      if (unitCostVal !== null && Number.isNaN(unitCostVal)) { console.error('Validation error: Unit cost must be a number'); return; }

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

      const hazardSymbolsVal = Array.isArray(rowDraft.hazard_symbols)
        ? rowDraft.hazard_symbols.map((s: any) => (s == null ? '' : String(s))).filter((s: string) => s.length > 0)
        : [];
      const requiredPPEVal = Array.isArray(rowDraft.required_ppe)
        ? rowDraft.required_ppe.map((s: any) => (s == null ? '' : String(s))).filter((s: string) => s.length > 0)
        : [];
      const linkedRisksVal = Array.isArray(rowDraft.linked_risks)
        ? rowDraft.linked_risks.map((s: any) => (s == null ? '' : String(s))).filter((s: string) => s.length > 0)
        : [];

      const payload: any = {
        product_name: rowDraft.product_name?.trim() || null,
        manufacturer: rowDraft.manufacturer?.trim() || null,
        use_case: rowDraft.use_case?.trim() || null,
        hazard_symbols: hazardSymbolsVal,
        dilution_ratio: rowDraft.dilution_ratio?.trim() || null,
        contact_time: rowDraft.contact_time?.trim() || null,
        required_ppe: requiredPPEVal,
        supplier: rowDraft.supplier?.trim() || null,
        unit_cost: unitCostVal,
        pack_size: rowDraft.pack_size?.trim() || null,
        storage_requirements: rowDraft.storage_requirements?.trim() || null,
        linked_risks: linkedRisksVal,
        notes: rowDraft.notes?.trim() || null,
        // Stockly fields
        track_stock: rowDraft.track_stock ?? false,
        current_stock: currentStockVal,
        par_level: parLevelVal,
        reorder_point: reorderPointVal,
        reorder_qty: reorderQtyVal,
        sku: rowDraft.sku?.trim() || null,
        company_id: companyId
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
        // The trigger will create a placeholder COSHH entry, reload to get it
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
        // Reload to get the COSHH sheet created by the trigger
        await loadChemicals();
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

  // COSHH upload handlers
  const handleCoshhFileSelect = (chemicalId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast({ 
        title: 'Invalid file type', 
        description: 'Please upload PDF, JPEG, PNG, or WebP files', 
        type: 'error' 
      });
      return;
    }
    
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast({ 
        title: 'File too large', 
        description: 'Maximum file size is 10MB', 
        type: 'error' 
      });
      return;
    }
    
    setCoshhSelectedFiles(prev => ({ ...prev, [chemicalId]: file }));
  };

  const handleCoshhUpload = async (chemical: any) => {
    const file = coshhSelectedFiles[chemical.id];
    if (!file || !companyId) {
      showToast({ 
        title: 'No file selected', 
        description: 'Please select a file to upload', 
        type: 'error' 
      });
      return;
    }

    try {
      setCoshhUploadingFor(chemical.id);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Sanitize filename
      const sanitizeFileName = (fileName: string) => {
        return fileName
          .trim()
          .replace(/\s+/g, '_')
          .replace(/[^\w.-]/g, '_')
          .toLowerCase();
      };
      
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const sanitizedProductName = sanitizeFileName(chemical.product_name);
      const fileName = `${companyId}/${sanitizedProductName}_${Date.now()}.${fileExt}`;
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('coshh-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream'
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('coshh-documents')
        .getPublicUrl(fileName);
      
      // Check if a COSHH sheet already exists for this chemical (with file)
      let existingSheet = chemical.coshhSheet;
      
      if (existingSheet && existingSheet.file_url) {
        // Update existing sheet that has a file
        const { error: updateError } = await supabase
          .from('coshh_data_sheets')
          .update({
            file_url: publicUrl,
            file_name: file.name,
            file_size_kb: Math.round(file.size / 1024),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSheet.id);
        
        if (updateError) throw updateError;
        existingSheet = { ...existingSheet, file_url: publicUrl, file_name: file.name };
      } else {
        // Check if trigger created a placeholder (no file_url)
        const { data: placeholderSheet } = await supabase
          .from('coshh_data_sheets')
          .select('id')
          .eq('chemical_id', chemical.id)
          .eq('company_id', companyId)
          .eq('status', 'Active')
          .is('file_url', null)
          .maybeSingle();
        
        if (placeholderSheet) {
          // Update the placeholder
          const { data: updatedSheet, error: updateError } = await supabase
            .from('coshh_data_sheets')
            .update({
              file_url: publicUrl,
              file_name: file.name,
              file_size_kb: Math.round(file.size / 1024),
              updated_at: new Date().toISOString()
            })
            .eq('id', placeholderSheet.id)
            .select()
            .single();
          
          if (updateError) throw updateError;
          existingSheet = updatedSheet;
        } else {
          // Create new COSHH sheet record
          const { data: newSheet, error: insertError } = await supabase
            .from('coshh_data_sheets')
            .insert({
              company_id: companyId,
              chemical_id: chemical.id,
              product_name: chemical.product_name,
              manufacturer: chemical.manufacturer,
              document_type: 'COSHH',
              file_name: file.name,
              file_url: publicUrl,
              file_size_kb: Math.round(file.size / 1024),
              status: 'Active',
              verification_status: 'Pending',
              uploaded_by: user.id
            })
            .select()
            .single();
          
          if (insertError) throw insertError;
          existingSheet = newSheet;
        }
      }
      
      // Update chemicals_library with the COSHH sheet URL
      const { error: updateChemicalError } = await supabase
        .from('chemicals_library')
        .update({ coshh_sheet_url: publicUrl })
        .eq('id', chemical.id);
      
      if (updateChemicalError) throw updateChemicalError;
      
      // Update local state immediately for instant UI feedback
      const updatedSheet = existingSheet ? {
        id: existingSheet.id,
        chemical_id: chemical.id,
        file_url: publicUrl,
        file_name: file.name,
        status: 'Active',
        expiry_date: null
      } : null;
      
      if (updatedSheet) {
        setChemicals((prev: any[]) => 
          prev.map((c: any) => 
            c.id === chemical.id 
              ? { 
                  ...c, 
                  hasCOSHHSheet: true,
                  coshhSheet: updatedSheet,
                  coshh_sheet_url: publicUrl
                }
              : c
          )
        );
      }
      
      showToast({ 
        title: 'COSHH sheet uploaded', 
        description: `Successfully uploaded COSHH data sheet for ${chemical.product_name}`, 
        type: 'success' 
      });
      
      // Reset form and close modal
      setCoshhSelectedFiles(prev => ({ ...prev, [chemical.id]: null }));
      setCoshhConfirmModal(null);
      
      // Reload data in background to ensure everything is in sync
      loadChemicals();
    } catch (error) {
      console.error('Error uploading COSHH sheet:', error);
      showToast({ 
        title: 'Upload failed', 
        description: (error as Error).message, 
        type: 'error' 
      });
    } finally {
      setCoshhUploadingFor(null);
    }
  };

  const handleCoshhDownload = (coshhSheet: any) => {
    if (coshhSheet?.file_url) {
      window.open(coshhSheet.file_url, '_blank');
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
        const unitCostVal = unitCostRaw && unitCostRaw.trim() !== '' ? Number(unitCostRaw) : null;
        const trackStockRaw = rowsRow[headerIndex['track_stock']];
        const trackStockVal = trackStockRaw && (trackStockRaw.trim().toLowerCase() === 'true' || trackStockRaw.trim() === '1');
        const currentStockRaw = rowsRow[headerIndex['current_stock']];
        const currentStockVal = currentStockRaw && currentStockRaw.trim() !== '' ? Number(currentStockRaw) : 0;
        const parLevelRaw = rowsRow[headerIndex['par_level']];
        const parLevelVal = parLevelRaw && parLevelRaw.trim() !== '' ? Number(parLevelRaw) : null;
        const reorderPointRaw = rowsRow[headerIndex['reorder_point']];
        const reorderPointVal = reorderPointRaw && reorderPointRaw.trim() !== '' ? Number(reorderPointRaw) : null;
        const reorderQtyRaw = rowsRow[headerIndex['reorder_qty']];
        const reorderQtyVal = reorderQtyRaw && reorderQtyRaw.trim() !== '' ? Number(reorderQtyRaw) : null;
        
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
          unit_cost: unitCostVal,
          pack_size: rowsRow[headerIndex['pack_size']] ?? null,
          storage_requirements: rowsRow[headerIndex['storage_requirements']] ?? null,
          linked_risks: normaliseArrayCell(rowsRow[headerIndex['linked_risks']]).length ? normaliseArrayCell(rowsRow[headerIndex['linked_risks']]) : null,
          first_aid_instructions: rowsRow[headerIndex['first_aid_instructions']] ?? null,
          environmental_info: rowsRow[headerIndex['environmental_info']] ?? null,
          track_stock: trackStockVal,
          current_stock: currentStockVal,
          par_level: parLevelVal,
          reorder_point: reorderPointVal,
          reorder_qty: reorderQtyVal,
          sku: rowsRow[headerIndex['sku']]?.trim() || null,
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
    <div className="w-full bg-gray-50 dark:bg-[#0B0D13] min-h-screen">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <Package className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              Chemicals Library
            </h1>
            <p className="text-sm text-gray-600 dark:text-white/60">Manage cleaning chemicals and COSHH data</p>
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
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-emerald-600 dark:border-emerald-500/60 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/10 hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-[0_0_14px_rgba(16,185,129,0.7)] transition"
            >
              <Plus size={18} />
              <span className="sr-only">Add Chemical</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-white/40" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chemicals..."
              className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-lg pl-10 pr-4 py-2.5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-gray-600 dark:text-white/60 text-center py-8">Loading chemicals...</div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-8 text-center">
            <p className="text-gray-600 dark:text-white/60">No chemicals found.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-white/[0.05] border-b border-gray-200 dark:border-white/[0.06]">
                <tr>
                  <th className="w-10 px-2" aria-label="Expand" />
                  <th className="text-left px-4 py-3 font-semibold text-gray-900 dark:text-emerald-400 text-[0.95rem]">Product Name</th>
                  <th className="text-left px-2 py-3 font-semibold text-gray-900 dark:text-emerald-400 text-[0.95rem]">Manufacturer</th>
                  <th className="text-left px-2 py-3 font-semibold text-gray-900 dark:text-emerald-400 text-[0.95rem]">Pack Size</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item: any) => {
                  const expanded = expandedRows.has(item.id);
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="border-b border-gray-100 dark:border-white/[0.05] hover:bg-gray-50 dark:hover:bg-white/[0.02] bg-white dark:bg-transparent">
                        <td className="px-2 py-3 align-top">
                          <button
                            aria-label={expanded ? 'Collapse' : 'Expand'}
                            onClick={() => toggleRow(item.id)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/[0.05] text-gray-600 dark:text-white/60"
                          >
                            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {editingRowId === item.id ? (
                            <input
                              className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
                              value={rowDraft?.product_name ?? ''}
                              onChange={(e) => setRowDraft((d: any) => ({ ...d, product_name: e.target.value }))}
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900 dark:text-white font-medium">{item.product_name}</span>
                              {item.supplier && (
                                <span className="text-gray-500 dark:text-white/40 text-sm">• {item.supplier}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-3 text-gray-700 dark:text-white/80 text-sm whitespace-nowrap">
                          {editingRowId === item.id ? (
                            <input
                              className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
                              value={rowDraft?.manufacturer ?? ''}
                              onChange={(e) => setRowDraft((d: any) => ({ ...d, manufacturer: e.target.value }))}
                            />
                          ) : (
                            item.manufacturer || '-'
                          )}
                        </td>
                        <td className="px-2 py-3 text-gray-700 dark:text-white/80 text-sm whitespace-nowrap">
                        {editingRowId === item.id ? (
                          <input
                            className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
                            value={rowDraft?.pack_size ?? ''}
                            onChange={(e) => setRowDraft((d: any) => ({ ...d, pack_size: e.target.value }))}
                          />
                        ) : (
                          item.pack_size || '-'
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-t border-gray-200 dark:border-white/[0.06]">
                        <td colSpan={4} className="px-4 py-4 bg-gray-50 dark:bg-white/[0.02]">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Use Case</div>
                              {editingRowId === item.id ? (
                                <input
                                  className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
                                  value={rowDraft?.use_case ?? ''}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, use_case: e.target.value }))}
                                />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.use_case || '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Hazards</div>
                              {editingRowId === item.id ? (
                                <input
                                  className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
                                  placeholder="Comma-separated"
                                  value={(rowDraft?.hazard_symbols || []).join(', ')}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, hazard_symbols: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                                />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium flex items-center gap-2">
                                  {item.hazard_symbols && item.hazard_symbols.length > 0 ? (
                                    <>
                                      <AlertTriangle size={14} className="text-red-600 dark:text-red-400" />
                                      <span>{item.hazard_symbols.join(', ')}</span>
                                    </>
                                  ) : (
                                    <span className="text-gray-500 dark:text-white/40">None</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3 md:col-span-2">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1 mb-2">COSHH Data Sheet</div>
                              {item.hasCOSHHSheet && item.coshhSheet?.file_url ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <CheckCircle size={16} className="text-green-700 dark:text-green-400" />
                                    <span className="text-green-700 dark:text-green-400">Uploaded</span>
                                    {item.coshhSheet.file_name && (
                                      <span className="text-gray-500 dark:text-white/40 text-xs">• {item.coshhSheet.file_name}</span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleCoshhDownload(item.coshhSheet)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 border border-emerald-200 dark:border-emerald-500/40 rounded text-sm text-emerald-600 dark:text-emerald-400 transition-colors"
                                  >
                                    <Download size={14} />
                                    View Sheet
                                  </button>
                                  <button
                                    onClick={() => coshhFileInputRefs.current[item.id]?.click()}
                                    disabled={coshhUploadingFor === item.id}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700/50 hover:bg-neutral-700/70 border border-neutral-600 rounded text-sm text-gray-900 dark:text-white font-medium transition-colors disabled:opacity-50"
                                  >
                                    <Upload size={14} />
                                    Replace Sheet
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
                                    <span className="text-red-600 dark:text-red-300">Missing</span>
                                  </div>
                                  {coshhSelectedFiles[item.id] ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-neutral-900/50 rounded border border-gray-200 dark:border-neutral-700">
                                        <div className="flex items-center gap-2">
                                          <FileText size={14} className="text-emerald-600 dark:text-emerald-400" />
                                          <span className="text-xs text-gray-900 dark:text-white">{coshhSelectedFiles[item.id]?.name}</span>
                                        </div>
                                        <button
                                          onClick={() => setCoshhSelectedFiles(prev => ({ ...prev, [item.id]: null }))}
                                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                      <button
                                        onClick={() => setCoshhConfirmModal(item.id)}
                                        disabled={coshhUploadingFor === item.id}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 border border-emerald-200 dark:border-emerald-500/40 rounded text-sm text-emerald-600 dark:text-emerald-400 transition-colors disabled:opacity-50"
                                      >
                                        <Upload size={14} />
                                        Confirm Upload
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => coshhFileInputRefs.current[item.id]?.click()}
                                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 border border-emerald-200 dark:border-emerald-500/40 rounded text-sm text-emerald-600 dark:text-emerald-400 transition-colors"
                                    >
                                      <Upload size={14} />
                                      Upload COSHH Sheet
                                    </button>
                                  )}
                                </div>
                              )}
                              <input
                                ref={(el) => {
                                  coshhFileInputRefs.current[item.id] = el;
                                }}
                                type="file"
                                accept="application/pdf,image/jpeg,image/png,image/webp"
                                onChange={(e) => handleCoshhFileSelect(item.id, e)}
                                className="hidden"
                              />
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Contact Time</div>
                              {editingRowId === item.id ? (
                                <input
                                  className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
                                  value={rowDraft?.contact_time ?? ''}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, contact_time: e.target.value }))}
                                />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.contact_time || '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Dilution</div>
                              {editingRowId === item.id ? (
                                <input
                                  className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
                                  value={rowDraft?.dilution_ratio ?? ''}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, dilution_ratio: e.target.value }))}
                                />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.dilution_ratio || '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Required PPE</div>
                              {editingRowId === item.id ? (
                                <input
                                  className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
                                  placeholder="Comma-separated"
                                  value={(rowDraft?.required_ppe || []).join(', ')}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, required_ppe: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                                />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{(item.required_ppe || []).join(', ') || '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Supplier</div>
                              {editingRowId === item.id ? (
                                <input
                                  className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
                                  value={rowDraft?.supplier ?? ''}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, supplier: e.target.value }))}
                                />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.supplier || '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Unit Cost</div>
                              {editingRowId === item.id ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
                                  value={rowDraft?.unit_cost ?? ''}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, unit_cost: e.target.value }))}
                                />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.unit_cost ? `£${item.unit_cost}` : '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Storage</div>
                              {editingRowId === item.id ? (
                                <input
                                  className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
                                  value={rowDraft?.storage_requirements ?? ''}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, storage_requirements: e.target.value }))}
                                />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.storage_requirements || '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Linked Risks</div>
                              {editingRowId === item.id ? (
                                <input
                                  className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
                                  placeholder="Comma-separated"
                                  value={(rowDraft?.linked_risks || []).join(', ')}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, linked_risks: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                                />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{(item.linked_risks || []).join(', ') || '-'}</div>
                              )}
                            </div>
                            
                            {/* Stockly Fields Section */}
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs font-semibold text-gray-700 dark:text-white/80 mb-2 uppercase">Stock Management</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="flex items-center gap-2">
                                  {editingRowId === item.id ? (
                                    <input type="checkbox" checked={rowDraft?.track_stock ?? false} onChange={(e) => setRowDraft((d: any) => ({ ...d, track_stock: e.target.checked }))} className="w-4 h-4 rounded border-emerald-500/50 bg-white dark:bg-neutral-900 text-emerald-500 focus:ring-emerald-500" />
                                  ) : (
                                    <input type="checkbox" checked={item.track_stock ?? false} disabled className="w-4 h-4 rounded border-emerald-500/50 bg-white dark:bg-neutral-900" />
                                  )}
                                  <label className="text-xs text-gray-500 dark:text-white/40 mb-1">Track Stock</label>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">SKU</div>
                              {editingRowId === item.id ? (
                                <input className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.sku ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, sku: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.sku || '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Current Stock</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.current_stock ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, current_stock: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.current_stock != null ? item.current_stock : '0'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Par Level</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.par_level ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, par_level: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.par_level != null ? item.par_level : '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Reorder Point</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.reorder_point ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, reorder_point: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.reorder_point != null ? item.reorder_point : '-'}</div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Reorder Qty</div>
                              {editingRowId === item.id ? (
                                <input type="number" step="0.01" className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500" value={rowDraft?.reorder_qty ?? ''} onChange={(e) => setRowDraft((d: any) => ({ ...d, reorder_qty: e.target.value }))} />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium">{item.reorder_qty != null ? item.reorder_qty : '-'}</div>
                              )}
                            </div>
                            {item.low_stock_alert && (
                              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3">
                                <div className="text-xs text-red-700 dark:text-red-400 font-semibold">⚠️ Low Stock Alert</div>
                              </div>
                            )}
                            {item.stock_value != null && item.stock_value > 0 && (
                              <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                                <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Stock Value</div>
                                <div className="text-sm text-gray-900 dark:text-white font-medium">£{item.stock_value.toFixed(2)}</div>
                              </div>
                            )}
                            
                            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3 md:col-span-2 lg:col-span-3">
                              <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Notes</div>
                              {editingRowId === item.id ? (
                                <textarea
                                  className="w-full bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded px-2 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 min-h-[80px]"
                                  value={rowDraft?.notes ?? ''}
                                  onChange={(e) => setRowDraft((d: any) => ({ ...d, notes: e.target.value }))}
                                />
                              ) : (
                                <div className="text-sm text-gray-900 dark:text-white font-medium whitespace-pre-wrap">{item.notes || '-'}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            {editingRowId === item.id ? (
                              <>
                                <button
                                  onClick={() => saveRowEdit(item.id)}
                                  className="px-3 py-2 rounded-lg border border-emerald-500/60 text-white bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-emerald-400 hover:shadow-[0_0_14px_rgba(16,185,129,0.7)] transition flex items-center gap-2"
                                >
                                  <Save size={16} className="text-emerald-400" />
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
                                }} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-white bg-white dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/10 transition flex items-center gap-2">
                                  <X size={16} />
                                  <span>Cancel</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  aria-label="Edit Chemical"
                                  onClick={() => handleEdit(item)}
                                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-emerald-600 dark:border-emerald-500/60 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-white/[0.05] hover:bg-gray-100 dark:hover:bg-white/10 hover:shadow-[0_0_14px_rgba(16,185,129,0.7)] transition"
                                >
                                  <Edit size={16} />
                                  <span className="sr-only">Edit</span>
                                </button>
                                <button
                                  aria-label="Delete Chemical"
                                  onClick={() => handleDelete(item.id)}
                                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-600 dark:border-red-500/60 text-red-600 dark:text-red-400 bg-white dark:bg-white/[0.05] hover:bg-red-50 dark:hover:bg-red-500/10 hover:shadow-[0_0_14px_rgba(239,68,68,0.55)] transition"
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
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingItem ? 'Edit Chemical' : 'Add Chemical'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                  resetForm();
                }}
                className="text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* form fields kept above */}
          </div>
        </div>
      )}

      {/* COSHH Upload Confirmation Modal */}
      {coshhConfirmModal && (() => {
        const chemical = chemicals.find((c: any) => c.id === coshhConfirmModal);
        const selectedFile = coshhSelectedFiles[coshhConfirmModal];
        if (!chemical || !selectedFile) return null;
        
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Confirm COSHH Upload</h2>
                <button
                  onClick={() => setCoshhConfirmModal(null)}
                  className="text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white"
                  disabled={coshhUploadingFor === coshhConfirmModal}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-white/40 mb-2">Chemical:</p>
                  <p className="text-gray-900 dark:text-white font-medium">{chemical.product_name}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-white/40 mb-2">File to upload:</p>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-neutral-800/50 rounded border border-gray-200 dark:border-neutral-700">
                    <FileText size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm text-gray-900 dark:text-white font-medium flex-1">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500 dark:text-white/40">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setCoshhConfirmModal(null)}
                    disabled={coshhUploadingFor === coshhConfirmModal}
                    className="flex-1 px-4 py-2 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCoshhUpload(chemical)}
                    disabled={coshhUploadingFor === coshhConfirmModal}
                    className="flex-1 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 border border-emerald-200 dark:border-emerald-500/40 rounded-lg text-emerald-600 dark:text-emerald-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {coshhUploadingFor === coshhConfirmModal ? (
                      <>Uploading...</>
                    ) : (
                      <>
                        <Upload size={16} />
                        Confirm & Upload
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      </div>
    </div>
  );
}
