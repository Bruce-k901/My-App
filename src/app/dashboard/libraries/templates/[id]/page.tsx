"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Upload, Download, Save, X, Trash2 } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

// Template definitions matching the templates page
const TEMPLATE_CONFIGS: Record<string, any> = {
  'ingredients': {
    name: 'Ingredients Library',
    tableName: 'ingredients_library',
    csvHeaders: ['ingredient_name', 'category', 'allergens', 'unit', 'unit_cost', 'supplier', 'pack_size', 'notes'],
    fields: [
      { key: 'ingredient_name', label: 'Ingredient Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'allergens', label: 'Allergens', type: 'array', placeholder: 'Comma or semicolon separated' },
      { key: 'unit', label: 'Unit', type: 'text' },
      { key: 'unit_cost', label: 'Unit Cost', type: 'number' },
      { key: 'supplier', label: 'Supplier', type: 'text' },
      { key: 'pack_size', label: 'Pack Size', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  'ppe': {
    name: 'PPE Library',
    tableName: 'ppe_library',
    csvHeaders: ['item_name', 'category', 'standard_compliance', 'size_options', 'supplier', 'unit_cost', 'reorder_level', 'linked_risks', 'cleaning_replacement_interval', 'notes'],
    fields: [
      { key: 'item_name', label: 'Item Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'standard_compliance', label: 'Standard Compliance', type: 'text' },
      { key: 'size_options', label: 'Size Options', type: 'array', placeholder: 'Comma or semicolon separated' },
      { key: 'supplier', label: 'Supplier', type: 'text' },
      { key: 'unit_cost', label: 'Unit Cost', type: 'number' },
      { key: 'reorder_level', label: 'Reorder Level', type: 'number' },
      { key: 'linked_risks', label: 'Linked Risks', type: 'array', placeholder: 'Comma or semicolon separated' },
      { key: 'cleaning_replacement_interval', label: 'Cleaning/Replacement Interval', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  'chemicals': {
    name: 'Chemicals Library',
    tableName: 'chemicals_library',
    csvHeaders: ['product_name', 'manufacturer', 'use_case', 'hazard_symbols', 'dilution_ratio', 'contact_time', 'required_ppe', 'coshh_sheet_url', 'supplier', 'unit_cost', 'pack_size', 'storage_requirements', 'linked_risks', 'first_aid_instructions', 'environmental_info', 'notes'],
    fields: [
      { key: 'product_name', label: 'Product Name', type: 'text', required: true },
      { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
      { key: 'use_case', label: 'Use Case', type: 'text' },
      { key: 'hazard_symbols', label: 'Hazard Symbols', type: 'array', placeholder: 'Comma or semicolon separated' },
      { key: 'dilution_ratio', label: 'Dilution Ratio', type: 'text' },
      { key: 'contact_time', label: 'Contact Time', type: 'text' },
      { key: 'required_ppe', label: 'Required PPE', type: 'array', placeholder: 'Comma or semicolon separated' },
      { key: 'coshh_sheet_url', label: 'COSHH Sheet URL', type: 'url' },
      { key: 'supplier', label: 'Supplier', type: 'text' },
      { key: 'unit_cost', label: 'Unit Cost', type: 'number' },
      { key: 'pack_size', label: 'Pack Size', type: 'text' },
      { key: 'storage_requirements', label: 'Storage Requirements', type: 'textarea' },
      { key: 'linked_risks', label: 'Linked Risks', type: 'array', placeholder: 'Comma or semicolon separated' },
      { key: 'first_aid_instructions', label: 'First Aid Instructions', type: 'textarea' },
      { key: 'environmental_info', label: 'Environmental Info', type: 'textarea' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  'drinks': {
    name: 'Drinks Library',
    tableName: 'drinks_library',
    csvHeaders: ['item_name', 'category', 'sub_category', 'abv', 'allergens', 'unit', 'unit_cost', 'supplier', 'pack_size', 'storage_type', 'shelf_life', 'notes'],
    fields: [
      { key: 'item_name', label: 'Item Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'sub_category', label: 'Sub Category', type: 'text' },
      { key: 'abv', label: 'ABV', type: 'number' },
      { key: 'allergens', label: 'Allergens', type: 'array', placeholder: 'Comma or semicolon separated' },
      { key: 'unit', label: 'Unit', type: 'text' },
      { key: 'unit_cost', label: 'Unit Cost', type: 'number' },
      { key: 'supplier', label: 'Supplier', type: 'text' },
      { key: 'pack_size', label: 'Pack Size', type: 'text' },
      { key: 'storage_type', label: 'Storage Type', type: 'text' },
      { key: 'shelf_life', label: 'Shelf Life', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  'disposables': {
    name: 'Disposables Library',
    tableName: 'disposables_library',
    csvHeaders: ['item_name', 'category', 'material', 'eco_friendly', 'color_finish', 'dimensions', 'supplier', 'pack_cost', 'pack_size', 'reorder_level', 'storage_location', 'usage_context', 'notes'],
    fields: [
      { key: 'item_name', label: 'Item Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'eco_friendly', label: 'Eco Friendly', type: 'checkbox' },
      { key: 'color_finish', label: 'Color/Finish', type: 'text' },
      { key: 'dimensions', label: 'Dimensions', type: 'text' },
      { key: 'supplier', label: 'Supplier', type: 'text' },
      { key: 'pack_cost', label: 'Pack Cost', type: 'number' },
      { key: 'pack_size', label: 'Pack Size', type: 'text' },
      { key: 'reorder_level', label: 'Reorder Level', type: 'number' },
      { key: 'storage_location', label: 'Storage Location', type: 'text' },
      { key: 'usage_context', label: 'Usage Context', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  'glassware': {
    name: 'Glassware Library',
    tableName: 'glassware_library',
    csvHeaders: ['item_name', 'category', 'capacity_ml', 'material', 'shape_style', 'recommended_for', 'supplier', 'unit_cost', 'pack_size', 'dishwasher_safe', 'breakage_rate', 'storage_location', 'reorder_level', 'notes'],
    fields: [
      { key: 'item_name', label: 'Item Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'capacity_ml', label: 'Capacity (ml)', type: 'number' },
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'shape_style', label: 'Shape/Style', type: 'text' },
      { key: 'recommended_for', label: 'Recommended For', type: 'text' },
      { key: 'supplier', label: 'Supplier', type: 'text' },
      { key: 'unit_cost', label: 'Unit Cost', type: 'number' },
      { key: 'pack_size', label: 'Pack Size', type: 'text' },
      { key: 'dishwasher_safe', label: 'Dishwasher Safe', type: 'checkbox' },
      { key: 'breakage_rate', label: 'Breakage Rate', type: 'text' },
      { key: 'storage_location', label: 'Storage Location', type: 'text' },
      { key: 'reorder_level', label: 'Reorder Level', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  'packaging': {
    name: 'Packaging Library',
    tableName: 'packaging_library',
    csvHeaders: ['item_name', 'category', 'material', 'capacity_size', 'eco_friendly', 'compostable', 'recyclable', 'hot_food_suitable', 'microwave_safe', 'leak_proof', 'color_finish', 'supplier', 'pack_cost', 'pack_size', 'dimensions', 'usage_context', 'reorder_level', 'notes'],
    fields: [
      { key: 'item_name', label: 'Item Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'capacity_size', label: 'Capacity/Size', type: 'text' },
      { key: 'eco_friendly', label: 'Eco Friendly', type: 'checkbox' },
      { key: 'compostable', label: 'Compostable', type: 'checkbox' },
      { key: 'recyclable', label: 'Recyclable', type: 'checkbox' },
      { key: 'hot_food_suitable', label: 'Hot Food Suitable', type: 'checkbox' },
      { key: 'microwave_safe', label: 'Microwave Safe', type: 'checkbox' },
      { key: 'leak_proof', label: 'Leak Proof', type: 'checkbox' },
      { key: 'color_finish', label: 'Color/Finish', type: 'text' },
      { key: 'supplier', label: 'Supplier', type: 'text' },
      { key: 'pack_cost', label: 'Pack Cost', type: 'number' },
      { key: 'pack_size', label: 'Pack Size', type: 'text' },
      { key: 'dimensions', label: 'Dimensions', type: 'text' },
      { key: 'usage_context', label: 'Usage Context', type: 'text' },
      { key: 'reorder_level', label: 'Reorder Level', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  'serving-equipment': {
    name: 'Serving Equipment Library',
    tableName: 'equipment_library',
    csvHeaders: ['item_name', 'category', 'material', 'size_dimensions', 'shape', 'use_case', 'color_finish', 'dishwasher_safe', 'oven_safe', 'supplier', 'brand', 'color_coding', 'unit_cost', 'storage_location', 'notes'],
    fields: [
      { key: 'item_name', label: 'Item Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'size_dimensions', label: 'Size/Dimensions', type: 'text' },
      { key: 'shape', label: 'Shape', type: 'text' },
      { key: 'use_case', label: 'Use Case', type: 'text' },
      { key: 'color_finish', label: 'Color/Finish', type: 'text' },
      { key: 'dishwasher_safe', label: 'Dishwasher Safe', type: 'checkbox' },
      { key: 'oven_safe', label: 'Oven Safe', type: 'checkbox' },
      { key: 'supplier', label: 'Supplier', type: 'text' },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'color_coding', label: 'Color Coding', type: 'text' },
      { key: 'unit_cost', label: 'Unit Cost', type: 'number' },
      { key: 'storage_location', label: 'Storage Location', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  'appliances': {
    name: 'Appliances Library',
    tableName: 'pat_appliances',
    csvHeaders: ['name', 'brand', 'site_name', 'purchase_date', 'has_current_pat_label', 'notes'],
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'site_name', label: 'Site Name', type: 'text' },
      { key: 'purchase_date', label: 'Purchase Date', type: 'date' },
      { key: 'has_current_pat_label', label: 'Has Current PAT Label', type: 'checkbox' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  'first-aid': {
    name: 'First Aid Supplies Library',
    tableName: 'first_aid_supplies_library',
    csvHeaders: ['item_name', 'category', 'sub_category', 'standard_compliance', 'expiry_period_months', 'supplier', 'unit_cost', 'pack_size', 'storage_requirements', 'typical_usage', 'notes'],
    fields: [
      { key: 'item_name', label: 'Item Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'sub_category', label: 'Sub Category', type: 'text' },
      { key: 'standard_compliance', label: 'Standard Compliance', type: 'text' },
      { key: 'expiry_period_months', label: 'Expiry Period (Months)', type: 'number' },
      { key: 'supplier', label: 'Supplier', type: 'text' },
      { key: 'unit_cost', label: 'Unit Cost', type: 'number' },
      { key: 'pack_size', label: 'Pack Size', type: 'text' },
      { key: 'storage_requirements', label: 'Storage Requirements', type: 'textarea' },
      { key: 'typical_usage', label: 'Typical Usage', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  }
};

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  const templateId = params.id as string;
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [template, setTemplate] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (templateId && TEMPLATE_CONFIGS[templateId]) {
      setTemplate(TEMPLATE_CONFIGS[templateId]);
      // Initialize empty form data
      const initialData: any = {};
      TEMPLATE_CONFIGS[templateId].fields.forEach((field: any) => {
        if (field.type === 'array') {
          initialData[field.key] = [];
        } else if (field.type === 'checkbox') {
          initialData[field.key] = false;
        } else {
          initialData[field.key] = '';
        }
      });
      setFormData(initialData);
    }
  }, [templateId]);

  const handleAddItem = () => {
    setShowAddForm(true);
    setEditingIndex(null);
    const initialData: any = {};
    template.fields.forEach((field: any) => {
      if (field.type === 'array') {
        initialData[field.key] = [];
      } else if (field.type === 'checkbox') {
        initialData[field.key] = false;
      } else {
        initialData[field.key] = '';
      }
    });
    setFormData(initialData);
  };

  const handleEditItem = (index: number) => {
    setEditingIndex(index);
    setShowAddForm(true);
    setFormData({ ...items[index] });
  };

  const handleDeleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSaveItem = () => {
    if (!template) return;

    // Validate required fields
    const requiredFields = template.fields.filter((f: any) => f.required);
    for (const field of requiredFields) {
      if (!formData[field.key] || formData[field.key].toString().trim() === '') {
        showToast({
          title: 'Validation Error',
          description: `${field.label} is required`,
          type: 'error'
        });
        return;
      }
    }

    // Process array fields
    const processedData: any = { ...formData };
    template.fields.forEach((field: any) => {
      if (field.type === 'array' && typeof processedData[field.key] === 'string') {
        processedData[field.key] = processedData[field.key]
          .split(/[,;]/)
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
      if (field.type === 'number' && processedData[field.key]) {
        processedData[field.key] = Number(processedData[field.key]);
      }
    });

    if (editingIndex !== null) {
      // Update existing item
      const newItems = [...items];
      newItems[editingIndex] = processedData;
      setItems(newItems);
    } else {
      // Add new item
      setItems([...items, processedData]);
    }

    setShowAddForm(false);
    setEditingIndex(null);
    const initialData: any = {};
    template.fields.forEach((field: any) => {
      if (field.type === 'array') {
        initialData[field.key] = [];
      } else if (field.type === 'checkbox') {
        initialData[field.key] = false;
      } else {
        initialData[field.key] = '';
      }
    });
    setFormData(initialData);
  };

  const handleSaveToLibrary = async () => {
    if (!companyId || !template || items.length === 0) {
      showToast({
        title: 'Error',
        description: 'Please add at least one item before saving',
        type: 'error'
      });
      return;
    }

    setSaving(true);
    try {
      // Prepare items for database
      const itemsToInsert = items.map(item => {
        const dbItem: any = { company_id: companyId };
        template.fields.forEach((field: any) => {
          const value = item[field.key];
          if (value !== undefined && value !== null && value !== '') {
            if (field.type === 'array' && Array.isArray(value)) {
              dbItem[field.key] = value;
            } else if (field.type === 'checkbox') {
              dbItem[field.key] = Boolean(value);
            } else if (field.type === 'number') {
              dbItem[field.key] = value ? Number(value) : null;
            } else {
              dbItem[field.key] = value;
            }
          }
        });
        return dbItem;
      });

      // Insert in chunks
      const chunkSize = 500;
      for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
        const chunk = itemsToInsert.slice(i, i + chunkSize);
        const { error } = await supabase
          .from(template.tableName)
          .insert(chunk);
        
        if (error) throw error;
      }

      showToast({
        title: 'Success',
        description: `${items.length} items saved to ${template.name}`,
        type: 'success'
      });

      // Navigate to the library page
      const libraryPath = `/dashboard/libraries/${templateId === 'serving-equipment' ? 'serving-equipment' : templateId === 'first-aid' ? 'first-aid' : templateId}`;
      router.push(libraryPath);
    } catch (error: any) {
      console.error('Error saving items:', error);
      showToast({
        title: 'Error saving items',
        description: error.message || 'Failed to save items',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!template || items.length === 0) {
      showToast({
        title: 'No items',
        description: 'Add items before downloading',
        type: 'error'
      });
      return;
    }

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (/[",\n]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const header = template.csvHeaders.map((h: string) => escapeCSV(h)).join(',');
    const body = items.map((item: any) => {
      return template.csvHeaders.map((header: string) => {
        const value = item[header];
        if (Array.isArray(value)) {
          return escapeCSV(value.join('; '));
        } else if (typeof value === 'boolean') {
          return escapeCSV(value ? 'Yes' : 'No');
        }
        return escapeCSV(value || '');
      }).join(',');
    }).join('\n');

    const csv = header + '\n' + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.tableName}_filled.csv`;
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

  const handleUploadCSV = async (file: File) => {
    if (!companyId || !template) return;

    setUploading(true);
    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      
      if (!headers.length) {
        throw new Error('CSV has no headers');
      }

      const headerIndex: Record<string, number> = {};
      headers.forEach((h, i) => { headerIndex[h.toLowerCase()] = i; });

      const newItems: any[] = [];
      for (const row of rows) {
        const item: any = {};
        template.csvHeaders.forEach((header: string) => {
          const colIndex = headerIndex[header.toLowerCase()];
          if (colIndex === undefined) return;

          const value = row[colIndex]?.trim() || '';
          const field = template.fields.find((f: any) => f.key === header);

          if (!field) return;

          if (field.type === 'array') {
            item[header] = normaliseArrayCell(value);
          } else if (field.type === 'checkbox') {
            item[header] = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true' || value === '1';
          } else if (field.type === 'number') {
            item[header] = value && value.trim() !== '' ? Number(value) : null;
          } else {
            item[header] = value || '';
          }
        });
        newItems.push(item);
      }

      setItems([...items, ...newItems]);
      showToast({
        title: 'CSV imported',
        description: `${newItems.length} items added from CSV`,
        type: 'success'
      });
    } catch (error: any) {
      console.error('Error uploading CSV:', error);
      showToast({
        title: 'Error importing CSV',
        description: error.message || 'Failed to import CSV',
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  if (!template) {
    return (
      <div className="p-8">
        <div className="text-theme-tertiary">Loading template...</div>
      </div>
    );
  }

  return (
    <div className="bg-[rgb(var(--surface-elevated))] text-theme-primary border border-neutral-800 rounded-xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/libraries/templates')}
          className="flex items-center gap-2 text-theme-tertiary hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Templates</span>
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary mb-2">{template.name} Template</h1>
        <p className="text-theme-tertiary text-sm sm:text-base">Add items one by one or upload a CSV file. Save when ready to add to your library.</p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={handleAddItem}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/40 rounded-lg text-blue-400 hover:bg-module-fg/10 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Item</span>
        </button>
        <button
          onClick={() => csvInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/40 rounded-lg text-green-400 hover:bg-module-fg/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="h-4 w-4" />
          <span>{uploading ? 'Uploading...' : 'Upload CSV'}</span>
        </button>
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadCSV(file);
          }}
          className="hidden"
        />
        {items.length > 0 && (
          <>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/40 rounded-lg text-purple-400 hover:bg-module-fg/10 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={handleSaveToLibrary}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-magenta-500/20 border border-magenta-500/40 rounded-lg text-magenta-400 hover:bg-magenta-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : `Save ${items.length} Item${items.length !== 1 ? 's' : ''} to Library`}</span>
            </button>
          </>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-6 p-6 bg-neutral-900/50 border border-neutral-800 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-theme-primary">
              {editingIndex !== null ? 'Edit Item' : 'Add New Item'}
            </h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingIndex(null);
              }}
              className="p-1 hover:bg-white/10 rounded"
            >
              <X className="h-5 w-5 text-theme-tertiary" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {template.fields.map((field: any) => (
              <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="block text-sm font-medium text-theme-secondary mb-1">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-theme rounded-lg text-theme-primary placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-magenta-500/40"
                    rows={3}
                    placeholder={field.placeholder}
                  />
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData[field.key] || false}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.checked })}
                      className="w-4 h-4 rounded border-theme bg-neutral-800 text-magenta-500 focus:ring-2 focus:ring-magenta-500/40"
                    />
                    <span className="text-sm text-theme-tertiary">Yes</span>
                  </label>
                ) : field.type === 'array' ? (
                  <input
                    type="text"
                    value={Array.isArray(formData[field.key]) ? formData[field.key].join(', ') : formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-theme rounded-lg text-theme-primary placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-magenta-500/40"
                    placeholder={field.placeholder || 'Comma or semicolon separated'}
                  />
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-theme rounded-lg text-theme-primary placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-magenta-500/40"
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingIndex(null);
              }}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-theme-primary hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveItem}
              className="px-4 py-2 bg-magenta-500/20 border border-magenta-500/40 rounded-lg text-magenta-400 hover:bg-magenta-500/30 transition-colors"
            >
              {editingIndex !== null ? 'Update' : 'Add'} Item
            </button>
          </div>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="text-center py-12 bg-neutral-900/30 rounded-lg border border-neutral-800">
          <p className="text-theme-tertiary mb-4">No items added yet</p>
          <button
            onClick={handleAddItem}
            className="px-4 py-2 bg-blue-500/20 border border-blue-500/40 rounded-lg text-blue-400 hover:bg-module-fg/10 transition-colors"
          >
            Add Your First Item
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const primaryField = template.fields.find((f: any) => f.required) || template.fields[0];
            const primaryValue = item[primaryField.key] || 'Untitled';
            return (
              <div key={index} className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-theme-primary font-semibold mb-2">{primaryValue}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                      {template.fields.slice(0, 6).map((field: any) => {
                        const value = item[field.key];
                        if (!value || (Array.isArray(value) && value.length === 0)) return null;
                        return (
                          <div key={field.key}>
                            <span className="text-theme-tertiary">{field.label}:</span>{' '}
                            <span className="text-white/90">
                              {Array.isArray(value) ? value.join(', ') : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEditItem(index)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Save className="h-4 w-4 text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(index)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

