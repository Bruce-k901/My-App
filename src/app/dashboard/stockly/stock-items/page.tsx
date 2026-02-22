'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Package, AlertCircle, X, ArrowLeft, Upload, Download } from '@/components/ui/icons';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StockItemModal from './StockItemModal';

interface StockItem {
  id: string;
  company_id: string;
  category_id?: string;
  name: string;
  description?: string;
  sku?: string;
  base_unit_id: string;
  yield_percent?: number;
  yield_notes?: string;
  track_stock: boolean;
  par_level?: number;
  reorder_qty?: number;
  allergens?: string[];
  is_prep_item: boolean;
  is_purchasable: boolean;
  costing_method: 'weighted_avg' | 'fifo' | 'last_price';
  current_cost?: number;
  pack_size?: number;
  pack_cost?: number;
  is_active: boolean;
  category?: {
    id: string;
    name: string;
    category_type: string;
  };
  base_unit?: {
    id: string;
    name: string;
    abbreviation: string;
  };
}

interface StockCategory {
  id: string;
  company_id: string;
  parent_id?: string;
  name: string;
  category_type: 'food' | 'beverage' | 'alcohol' | 'chemical' | 'disposable' | 'equipment' | 'other';
  sort_order: number;
}

interface UOM {
  id: string;
  name: string;
  abbreviation: string;
  unit_type: 'weight' | 'volume' | 'count' | 'length';
  is_base: boolean;
}

const UK_ALLERGENS = [
  'celery', 'gluten', 'crustaceans', 'eggs', 'fish',
  'lupin', 'milk', 'molluscs', 'mustard', 'nuts',
  'peanuts', 'sesame', 'soybeans', 'sulphites'
];

const COSTING_METHODS = [
  { label: 'Weighted Average', value: 'weighted_average' },
  { label: 'FIFO (First In, First Out)', value: 'fifo' },
  { label: 'LIFO (Last In, First Out)', value: 'lifo' },
  { label: 'Fixed Price', value: 'fixed' },
];

const BASE_UNIT_OPTIONS = [
  { value: 'g', label: 'g (grams)' },
  { value: 'kg', label: 'kg (kilograms)' },
  { value: 'ml', label: 'ml (milliliters)' },
  { value: 'l', label: 'l (liters)' },
  { value: 'each', label: 'each (units)' },
];

// Section Header Component
const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-semibold uppercase tracking-wide text-theme-tertiary border-b border-theme pb-2 mb-4">
    {children}
  </div>
);

export default function StockItemsPage() {
  const { companyId } = useAppContext();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [saving, setSaving] = useState(false);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    category_id: '',
    base_unit_id: '',
    track_stock: true,
    par_level: '',
    reorder_qty: '',
    yield_percent: 100,
    yield_notes: '',
    is_prep_item: false,
    is_purchasable: true,
    costing_method: 'weighted_avg' as 'weighted_avg' | 'fifo' | 'last_price',
    current_cost: '',
    pack_size: '',
    pack_cost: '',
    allergens: [] as string[],
  });

  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId]);

  async function fetchData() {
    try {
      setLoading(true);
      if (!companyId) return;

      // Fetch stock items (views don't support foreign key relationships, so fetch separately)
      const { data: items, error: itemsError } = await supabase
        .from('stock_items')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (itemsError) {
        // Check if error is empty object
        const errorKeys = itemsError && typeof itemsError === 'object' ? Object.keys(itemsError) : [];
        const isEmptyObject = errorKeys.length === 0;
        
        // Extract meaningful error details
        const errorDetails: any = {
          query: 'stock_items',
          companyId: companyId,
          isEmptyObject: isEmptyObject,
        };
        
        if (isEmptyObject) {
          errorDetails.note = 'Error object is empty - likely RLS policy issue or network problem';
          errorDetails.message = 'Empty error object - check RLS policies and network connection';
          errorDetails.code = 'EMPTY_ERROR';
          errorDetails.suggestion = 'Check browser network tab and Supabase RLS policies for stock_items table';
        } else {
          // Extract standard Supabase error fields
          errorDetails.message = itemsError?.message || itemsError?.error?.message || 'No message';
          errorDetails.code = itemsError?.code || itemsError?.error?.code || itemsError?.statusCode || 'NO_CODE';
          errorDetails.details = itemsError?.details || itemsError?.error?.details || 'No details';
          errorDetails.hint = itemsError?.hint || itemsError?.error?.hint || 'No hint';
          
          // Try to get all properties
          try {
            const allProps = Object.getOwnPropertyNames(itemsError);
            errorDetails.allProperties = allProps;
            errorDetails.fullError = JSON.stringify(itemsError, allProps);
          } catch (e) {
            errorDetails.fullError = 'Could not serialize error';
          }
          
          // Try to stringify the error
          try {
            errorDetails.errorString = String(itemsError);
          } catch (e) {
            errorDetails.errorString = 'Could not convert to string';
          }
        }
        
        console.error('Error fetching stock items:', errorDetails);
        
        // Show user-friendly error message
        const userMessage = isEmptyObject 
          ? 'Failed to load stock items. Check console for details.'
          : (itemsError?.message || errorDetails.message || 'Failed to load stock items');
        toast.error(userMessage);
        
        // Don't throw empty errors - they won't serialize properly
        if (!isEmptyObject) {
          throw itemsError;
        } else {
          // For empty errors, set empty state and return
          setItems([]);
          setCategories([]);
          return;
        }
      }

      // Fetch categories
      let categoriesData: any[] = [];
      const { data: cats, error: catsError } = await supabase
        .from('stock_categories')
        .select('*')
        .eq('company_id', companyId)
        .order('sort_order');

      if (catsError) {
        // Check if error is empty object
        const errorKeys = catsError && typeof catsError === 'object' ? Object.keys(catsError) : [];
        const isEmptyObject = errorKeys.length === 0;
        
        // Extract meaningful error details
        const errorDetails: any = {
          query: 'stock_categories',
          companyId: companyId,
          isEmptyObject: isEmptyObject,
        };
        
        if (isEmptyObject) {
          errorDetails.note = 'Error object is empty - likely RLS policy issue or network problem';
          errorDetails.message = 'Empty error object - check RLS policies and network connection';
          errorDetails.code = 'EMPTY_ERROR';
          errorDetails.suggestion = 'Check browser network tab and Supabase RLS policies for stock_categories table';
        } else {
          // Extract standard Supabase error fields
          errorDetails.message = catsError?.message || catsError?.error?.message || 'No message';
          errorDetails.code = catsError?.code || catsError?.error?.code || catsError?.statusCode || 'NO_CODE';
          errorDetails.details = catsError?.details || catsError?.error?.details || 'No details';
          errorDetails.hint = catsError?.hint || catsError?.error?.hint || 'No hint';
          
          // Try to get all properties
          try {
            const allProps = Object.getOwnPropertyNames(catsError);
            errorDetails.allProperties = allProps;
            errorDetails.fullError = JSON.stringify(catsError, allProps);
          } catch (e) {
            errorDetails.fullError = 'Could not serialize error';
          }
          
          // Try to stringify the error
          try {
            errorDetails.errorString = String(catsError);
          } catch (e) {
            errorDetails.errorString = 'Could not convert to string';
          }
        }
        
        console.error('Error fetching categories:', errorDetails);
        
        // Show user-friendly error message
        const userMessage = isEmptyObject 
          ? 'Failed to load categories. Check console for details.'
          : (catsError?.message || errorDetails.message || 'Failed to load categories');
        toast.error(userMessage);
        
        // Don't throw empty errors - they won't serialize properly
        if (!isEmptyObject) {
          throw catsError;
        } else {
          // For empty errors, set empty state and continue
          categoriesData = [];
        }
      }

      // Check if categories exist, if not seed them
      if (!cats || cats.length === 0) {
        const { error: seedError, data: seedData } = await supabase.rpc('seed_stock_categories_for_company', {
          p_company_id: companyId
        });
        if (seedError) {
          // Extract all possible error properties
          const errorDetails: any = {
            query: 'seed_stock_categories_for_company',
            companyId: companyId,
            rawError: seedError,
          };
          
          // Try to extract standard Supabase error fields
          if (seedError && typeof seedError === 'object') {
            errorDetails.message = seedError?.message || seedError?.error?.message || 'No message';
            errorDetails.code = seedError?.code || seedError?.error?.code || seedError?.statusCode || 'NO_CODE';
            errorDetails.details = seedError?.details || seedError?.error?.details || 'No details';
            errorDetails.hint = seedError?.hint || seedError?.error?.hint || 'No hint';
            
            // Try to get all properties
            try {
              const allProps = Object.getOwnPropertyNames(seedError);
              errorDetails.allProperties = allProps;
              errorDetails.fullError = JSON.stringify(seedError, allProps);
            } catch (e) {
              errorDetails.fullError = 'Could not serialize error';
            }
            
            // Try to stringify the error
            try {
              errorDetails.errorString = String(seedError);
            } catch (e) {
              errorDetails.errorString = 'Could not convert to string';
            }
            
            // Check if error is empty object
            if (Object.keys(seedError).length === 0) {
              errorDetails.isEmptyObject = true;
              errorDetails.note = 'Error object is empty - this might indicate an RLS policy issue or function permission problem';
            }
          } else {
            errorDetails.message = String(seedError) || 'Unknown error type';
            errorDetails.errorType = typeof seedError;
          }
          
          console.error('Error seeding categories:', errorDetails);
          
          // Show user-friendly error message
          const userMessage = errorDetails.message !== 'No message' 
            ? `Failed to seed categories: ${errorDetails.message}`
            : 'Failed to seed default categories. Check console for details.';
          toast.error(userMessage);
        } else {
          // Refetch categories after seeding
          const { data: newCats, error: refetchError } = await supabase
            .from('stock_categories')
            .select('*')
            .eq('company_id', companyId)
            .order('sort_order');
          
          if (refetchError) {
            const errorDetails: any = {
              query: 'stock_categories (refetch)',
              message: refetchError?.message || 'No message',
              code: refetchError?.code || 'NO_CODE',
              details: refetchError?.details || 'No details',
              hint: refetchError?.hint || 'No hint',
            };
            
            try {
              errorDetails.fullError = JSON.stringify(refetchError, Object.getOwnPropertyNames(refetchError));
            } catch (e) {
              errorDetails.fullError = 'Could not serialize error';
            }
            
            console.error('Error refetching categories:', errorDetails);
            throw refetchError;
          }
          categoriesData = newCats || [];
          setCategories(categoriesData);
        }
      } else {
        categoriesData = cats;
        setCategories(cats);
      }

      // Fetch UOMs
      const { data: uomsData, error: uomsError } = await supabase
        .from('uom')
        .select('*')
        .order('unit_type', { ascending: true })
        .order('sort_order', { ascending: true });

      if (uomsError) {
        const errorDetails: any = {
          query: 'uom',
          message: uomsError?.message || 'No message',
          code: uomsError?.code || 'NO_CODE',
          details: uomsError?.details || 'No details',
          hint: uomsError?.hint || 'No hint',
        };
        
        try {
          errorDetails.fullError = JSON.stringify(uomsError, Object.getOwnPropertyNames(uomsError));
        } catch (e) {
          errorDetails.fullError = 'Could not serialize error';
        }
        
        console.error('Error fetching UOMs:', errorDetails);
        throw uomsError;
      }
      setUoms(uomsData || []);

      // Enrich stock items with category and base_unit data
      const enrichedItems = (items || []).map(item => ({
        ...item,
        category: categoriesData.find(cat => cat.id === item.category_id) || null,
        base_unit: (uomsData || []).find(uom => uom.id === item.base_unit_id) || null
      }));

      setStockItems(enrichedItems);
    } catch (error: any) {
      // Check if error is empty object
      const errorKeys = error && typeof error === 'object' ? Object.keys(error) : [];
      const isEmptyObject = errorKeys.length === 0;
      
      // Extract meaningful error information
      const errorDetails: any = {
        function: 'fetchData',
        companyId: companyId,
        isEmptyObject: isEmptyObject,
      };
      
      if (isEmptyObject) {
        errorDetails.note = 'Error object is empty - likely RLS policy issue, network problem, or serialization issue';
        errorDetails.message = 'Empty error object - check RLS policies, network connection, and browser console';
        errorDetails.code = 'EMPTY_ERROR';
        errorDetails.suggestion = 'Check browser network tab, Supabase RLS policies, and ensure user is authenticated';
        
        // Try to get error type and constructor
        try {
          errorDetails.errorType = typeof error;
          errorDetails.errorConstructor = error?.constructor?.name || 'Unknown';
          errorDetails.errorString = String(error);
        } catch (e) {
          errorDetails.errorType = 'Could not determine';
        }
      } else {
        // Extract standard Supabase error fields
        errorDetails.message = error?.message || error?.error?.message || 'Unknown error';
        errorDetails.code = error?.code || error?.error?.code || error?.statusCode || 'NO_CODE';
        errorDetails.details = error?.details || error?.error?.details || 'No details';
        errorDetails.hint = error?.error?.hint || 'No hint';
        
        // Try to get all properties
        try {
          const allProps = Object.getOwnPropertyNames(error);
          errorDetails.allProperties = allProps;
          errorDetails.fullError = JSON.stringify(error, allProps);
        } catch (e) {
          errorDetails.fullError = 'Could not serialize error';
        }
        
        // Try to stringify the error
        try {
          errorDetails.errorString = String(error);
        } catch (e) {
          errorDetails.errorString = 'Could not convert to string';
        }
      }
      
      console.error('Error fetching data:', errorDetails);
      
      // Show user-friendly error message
      const userMessage = isEmptyObject 
        ? 'Failed to load stock items. Check console for details.'
        : (error?.message || errorDetails.message || 'Failed to load stock items');
      toast.error(userMessage);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      sku: '',
      category_id: '',
      base_unit_id: '',
      track_stock: true,
      par_level: '',
      reorder_qty: '',
      yield_percent: 100,
      yield_notes: '',
      is_prep_item: false,
      is_purchasable: true,
      costing_method: 'weighted_avg',
      current_cost: '',
      pack_size: '',
      pack_cost: '',
      allergens: [],
    });
    setIsModalOpen(true);
  }

  function openEditModal(item: StockItem) {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      sku: item.sku || '',
      category_id: item.category_id || '',
      base_unit_id: item.base_unit_id || '',
      track_stock: item.track_stock ?? true,
      par_level: item.par_level?.toString() || '',
      reorder_qty: item.reorder_qty?.toString() || '',
      yield_percent: item.yield_percent || 100,
      yield_notes: item.yield_notes || '',
      is_prep_item: item.is_prep_item || false,
      is_purchasable: item.is_purchasable ?? true,
      costing_method: item.costing_method || 'weighted_avg',
      current_cost: item.current_cost?.toString() || '',
      pack_size: item.pack_size?.toString() || '',
      pack_cost: item.pack_cost?.toString() || '',
      allergens: item.allergens || [],
    });
    setIsModalOpen(true);
  }

  function toggleAllergen(allergen: string) {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen].sort()
    }));
  }

  async function handleSave() {
    if (!companyId) {
      toast.error('Company ID not available');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Item name is required');
      return;
    }

    if (!formData.base_unit_id) {
      toast.error('Base unit is required');
      return;
    }

    try {
      setSaving(true);

      // Calculate current_cost from pack_cost / pack_size if both are provided
      let calculatedCost = null;
      if (formData.pack_cost && formData.pack_size) {
        const packCost = parseFloat(formData.pack_cost);
        const packSize = parseFloat(formData.pack_size);
        if (packCost > 0 && packSize > 0) {
          calculatedCost = packCost / packSize;
        }
      }

      const itemData: any = {
        company_id: companyId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        sku: formData.sku.trim() || null,
        category_id: formData.category_id || null,
        base_unit_id: formData.base_unit_id,
        track_stock: formData.track_stock,
        par_level: formData.par_level ? parseFloat(formData.par_level) : null,
        reorder_qty: formData.reorder_qty ? parseFloat(formData.reorder_qty) : null,
        yield_percent: formData.yield_percent || null,
        yield_notes: formData.yield_notes.trim() || null,
        allergens: formData.allergens.length > 0 ? formData.allergens : null,
        is_prep_item: formData.is_prep_item,
        is_purchasable: formData.is_purchasable,
        costing_method: formData.costing_method,
        pack_size: formData.pack_size ? parseFloat(formData.pack_size) : null,
        pack_cost: formData.pack_cost ? parseFloat(formData.pack_cost) : null,
        current_cost: calculatedCost || (formData.current_cost ? parseFloat(formData.current_cost) : null),
        is_active: true,
      };

      if (editingItem) {
        const { data, error } = await supabase
          .from('stock_items')
          .update(itemData)
          .eq('id', editingItem.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating stock item:', error);
          const errorMessage = error?.message || error?.error?.message || 
            (error?.code === 'PGRST204' ? 'Database schema cache issue. Please refresh the page.' : 'Failed to update stock item');
          toast.error(errorMessage);
          return;
        }
        toast.success('Stock item updated successfully');
      } else {
        const { data, error } = await supabase
          .from('stock_items')
          .insert(itemData)
          .select()
          .single();

        if (error) {
          console.error('Error inserting stock item:', error);
          const errorMessage = error?.message || error?.error?.message || 
            (error?.code === 'PGRST204' ? 'Database schema cache issue. Please refresh the page.' : 'Failed to save stock item');
          toast.error(errorMessage);
          return;
        }
        toast.success('Stock item added successfully');
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (error: any) {
      console.error('Error saving stock item (catch):', error);
      // Check if error is empty object
      const errorKeys = error && typeof error === 'object' ? Object.keys(error) : [];
      const isEmptyObject = errorKeys.length === 0;
      
      if (isEmptyObject) {
        toast.error('An unknown error occurred. Please check the console for details and try again.');
      } else {
        const errorMessage = error?.message || error?.error?.message || 'Failed to save stock item';
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: StockItem) {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('stock_items')
        .update({ is_active: false })
        .eq('id', item.id);

      if (error) throw error;
      toast.success('Stock item deleted successfully');
      await fetchData();
    } catch (error: any) {
      console.error('Error deleting stock item:', error);
      toast.error('Failed to delete stock item');
    }
  }

  function formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return `£${value.toFixed(2)}`;
  }

  const filteredItems = stockItems.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // CSV helpers
  const CSV_HEADERS = [
    'name',
    'description',
    'sku',
    'category',
    'base_unit',
    'yield_percent',
    'yield_notes',
    'track_stock',
    'par_level',
    'reorder_qty',
    'is_prep_item',
    'is_purchasable',
    'costing_method',
    'current_cost'
  ];

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const toCSV = (rows: StockItem[]): string => {
    const header = CSV_HEADERS.join(',');
    const body = rows.map((r) => {
      const obj: any = {
        name: r.name ?? '',
        description: r.description ?? '',
        sku: r.sku ?? '',
        category: r.category?.name ?? '',
        base_unit: r.base_unit?.abbreviation ?? '',
        yield_percent: r.yield_percent ?? '',
        yield_notes: r.yield_notes ?? '',
        track_stock: r.track_stock ? 'true' : 'false',
        par_level: r.par_level ?? '',
        reorder_qty: r.reorder_qty ?? '',
        allergens: (r.allergens || []).join('; '),
        is_prep_item: r.is_prep_item ? 'true' : 'false',
        is_purchasable: r.is_purchasable ? 'true' : 'false',
        costing_method: r.costing_method ?? '',
        current_cost: r.current_cost ?? ''
      };
      return CSV_HEADERS.map((h) => escapeCSV(obj[h])).join(',');
    }).join('\n');
    return header + (body ? ('\n' + body) : '');
  };

  const handleDownloadCSV = () => {
    const csv = toCSV(filteredItems.length ? filteredItems : stockItems);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock_items.csv';
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
      
      // Check for required columns
      const requiredColumns = ['name', 'base_unit'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}. Please use the stock_items.csv template.`);
      }
      
      const headerIndex: Record<string, number> = {};
      headers.forEach((h, i) => { headerIndex[h] = i; });
      
      // Build category name to ID mapping
      const categoryMap = new Map<string, string>();
      categories.forEach(cat => {
        categoryMap.set(cat.name.toLowerCase(), cat.id);
      });

      // Build UOM abbreviation to ID mapping
      const uomMap = new Map<string, string>();
      uoms.forEach(uom => {
        uomMap.set(uom.abbreviation.toLowerCase(), uom.id);
      });

      const prepared: any[] = [];
      for (const row of rows) {
        const name = row[headerIndex['name']] ?? '';
        if (!name.trim()) continue;

        const categoryName = row[headerIndex['category']] ?? '';
        const categoryId = categoryName ? categoryMap.get(categoryName.toLowerCase()) : null;

        const baseUnitAbbr = row[headerIndex['base_unit']] ?? '';
        const baseUnitId = baseUnitAbbr ? uomMap.get(baseUnitAbbr.toLowerCase()) : null;
        
        if (!baseUnitId) {
          console.warn(`Skipping row: Base unit "${baseUnitAbbr}" not found`);
          continue;
        }

        const trackStockRaw = row[headerIndex['track_stock']] ?? '';
        const trackStock = trackStockRaw && (
          trackStockRaw.toLowerCase() === 'true' || 
          trackStockRaw.toLowerCase() === 'yes' || 
          trackStockRaw === '1'
        );

        const isPrepItemRaw = row[headerIndex['is_prep_item']] ?? '';
        const isPrepItem = isPrepItemRaw && (
          isPrepItemRaw.toLowerCase() === 'true' || 
          isPrepItemRaw.toLowerCase() === 'yes' || 
          isPrepItemRaw === '1'
        );

        const isPurchasableRaw = row[headerIndex['is_purchasable']] ?? '';
        const isPurchasable = isPurchasableRaw && (
          isPurchasableRaw.toLowerCase() === 'true' || 
          isPurchasableRaw.toLowerCase() === 'yes' || 
          isPurchasableRaw === '1'
        ) !== false; // Default to true if not specified

        const yieldPercentRaw = row[headerIndex['yield_percent']];
        const yieldPercent = yieldPercentRaw && yieldPercentRaw.trim() !== '' ? Number(yieldPercentRaw) : 100;

        const parLevelRaw = row[headerIndex['par_level']];
        const reorderQtyRaw = row[headerIndex['reorder_qty']];
        const currentCostRaw = row[headerIndex['current_cost']];
        const allergensRaw = row[headerIndex['allergens']];
        const costingMethodRaw = row[headerIndex['costing_method']] ?? 'weighted_avg';

        const itemData: any = {
          company_id: companyId,
          name: name.trim(),
          description: row[headerIndex['description']]?.trim() || null,
          sku: row[headerIndex['sku']]?.trim() || null,
          category_id: categoryId || null,
          base_unit_id: baseUnitId,
          yield_percent: yieldPercent,
          yield_notes: row[headerIndex['yield_notes']]?.trim() || null,
          track_stock: trackStock,
          par_level: parLevelRaw && parLevelRaw.trim() !== '' ? Number(parLevelRaw) : null,
          reorder_qty: reorderQtyRaw && reorderQtyRaw.trim() !== '' ? Number(reorderQtyRaw) : null,
          allergens: normaliseArrayCell(allergensRaw).length > 0 ? normaliseArrayCell(allergensRaw) : null,
          is_prep_item: isPrepItem,
          is_purchasable: isPurchasable,
          costing_method: costingMethodRaw,
          current_cost: currentCostRaw && currentCostRaw.trim() !== '' ? Number(currentCostRaw) : null,
          is_active: true,
        };

        prepared.push(itemData);
      }
      if (!prepared.length) { 
        toast.error('No valid rows to import. Check that base_unit values match existing units.');
        return;
      }

      // Check for existing items to avoid unique constraint violations
      const existingNames = new Set(stockItems.map(item => item.name.toLowerCase()));
      const duplicates = prepared.filter(item => existingNames.has(item.name.toLowerCase()));
      const newItems = prepared.filter(item => !existingNames.has(item.name.toLowerCase()));

      if (duplicates.length > 0) {
        const duplicateNames = duplicates.map(d => d.name).join(', ');
        const shouldContinue = confirm(
          `${duplicates.length} item(s) already exist and will be skipped:\n${duplicateNames}\n\nContinue importing ${newItems.length} new item(s)?`
        );
        if (!shouldContinue) {
          setLoading(false);
          if (csvInputRef.current) csvInputRef.current.value = '';
          return;
        }
      }

      if (newItems.length === 0) {
        toast.error('All items already exist. No new items to import.');
        setLoading(false);
        if (csvInputRef.current) csvInputRef.current.value = '';
        return;
      }

      const chunkSize = 500;
      let imported = 0;
      for (let i = 0; i < newItems.length; i += chunkSize) {
        const chunk = newItems.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from('stock_items')
          .insert(chunk)
          .select('*');
        if (error) {
          console.error('CSV import error details:', error);
          throw new Error(error.message || `Failed to import: ${JSON.stringify(error)}`);
        }
        imported += chunk.length;
      }
      toast.success(`Import complete: Imported ${imported} new item(s)${duplicates.length > 0 ? `, skipped ${duplicates.length} duplicate(s)` : ''}`);
      await fetchData();
    } catch (err: any) {
      console.error('CSV import error:', err);
      let errorMessage = err?.message || err?.error?.message || 'Failed to import CSV';
      
      // Provide helpful error message for schema cache issues
      if (err?.code === 'PGRST204' || errorMessage.includes('schema cache')) {
        errorMessage = 'Database schema cache issue. The column may not exist or PostgREST schema cache needs refreshing. Please contact support or try again later.';
      }
      
      toast.error(errorMessage);
      
      // Log more details for debugging
      if (err?.details) console.error('Error details:', err.details);
      if (err?.hint) console.error('Error hint:', err.hint);
      if (err?.code) console.error('Error code:', err.code);
    } finally {
      setLoading(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const itemsBelowPar = filteredItems.filter(item => 
    item.track_stock && 
    item.par_level !== null && 
    item.par_level !== undefined
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-secondary">Loading stock items...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/stockly"
 className="p-2 rounded-lg bg-theme-surface ] hover:bg-theme-muted border border-theme text-theme-secondary hover:text-theme-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-theme-primary mb-2 flex items-center gap-3">
                <Package className="w-8 h-8 text-module-fg" />
                Stock Items
              </h1>
              <p className="text-theme-secondary text-sm mt-1">Master list of all ingredients and products</p>
            </div>
          </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow rounded-lg transition-all duration-200 ease-in-out"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleUploadClick}
            className="flex items-center gap-2 px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow rounded-lg transition-all duration-200 ease-in-out"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleUploadChange}
            className="hidden"
          />
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow rounded-lg transition-all duration-200 ease-in-out"
          >
            <Plus className="w-5 h-5" />
            Add Stock Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-theme-surface border border-theme rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-tertiary" size={18} />
            <Input
              type="text"
              placeholder="Search by name, SKU, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              options={[
                { label: 'All Categories', value: 'all' },
                ...categories.map(cat => ({ label: cat.name, value: cat.id }))
              ]}
              placeholder="Filter by category"
            />
          </div>
        </div>
      </div>

      {/* Stock Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-theme-surface border border-theme rounded-xl p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-theme-primary font-medium mb-2">
            {searchTerm || categoryFilter !== 'all' ? 'No items found' : 'No stock items yet'}
          </h3>
          <p className="text-theme-secondary text-sm mb-4">
            {searchTerm || categoryFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first stock item'}
          </p>
          {!searchTerm && categoryFilter === 'all' && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow rounded-lg transition-all duration-200 ease-in-out"
            >
              <Plus className="w-4 h-4" />
              Add Stock Item
            </button>
          )}
        </div>
      ) : (
        <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-theme-button border-b border-theme">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">Unit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">Par Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">Allergens</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-theme-surface-elevated dark:hover:bg-white/[0.02] transition-colors ${
                        item.track_stock && item.par_level && item.par_level > 0
                          ? 'bg-red-50 dark:bg-red-500/5' 
                          : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-theme-primary font-medium">{item.name}</div>
                            {item.sku && (
                              <div className="text-xs text-theme-tertiary">SKU: {item.sku}</div>
                            )}
                          </div>
                          {item.is_prep_item && (
                            <span className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-500/40">
                              Prep
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-theme-secondary text-sm">
                        {item.category?.name || '—'}
                      </td>
                      <td className="px-4 py-4 text-theme-secondary text-sm">
                        {item.base_unit?.abbreviation || '—'}
                      </td>
                      <td className="px-4 py-4 text-theme-secondary text-sm">
                        {formatCurrency(item.current_cost)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-theme-secondary text-sm">
                            {item.par_level !== null && item.par_level !== undefined
                              ? item.par_level
                              : '—'}
                          </span>
                          {item.track_stock && item.par_level && item.par_level > 0 && (
                            <AlertCircle className="text-red-600 dark:text-red-400" size={14} />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {item.allergens && item.allergens.length > 0 ? (
                            item.allergens.slice(0, 3).map((allergen) => (
                              <span
                                key={allergen}
                                className="px-2 py-0.5 text-xs bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-500/40"
                              >
                                {allergen}
                              </span>
                            ))
                          ) : (
                            <span className="text-theme-tertiary text-xs">—</span>
                          )}
                          {item.allergens && item.allergens.length > 3 && (
                            <span className="px-2 py-0.5 text-xs bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-500/40">
                              +{item.allergens.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 text-theme-tertiary hover:text-module-fg dark:hover:text-module-fg transition-colors"
                            aria-label="Edit item"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-2 text-theme-tertiary hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            aria-label="Delete item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        <StockItemModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={fetchData}
          editingItem={editingItem}
          companyId={companyId || ''}
          categories={categories}
          uoms={uoms}
        />
      </div>
    </div>
  );
}
