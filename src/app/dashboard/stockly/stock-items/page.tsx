'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Package, AlertCircle, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  { label: 'Weighted Average', value: 'weighted_avg' },
  { label: 'FIFO', value: 'fifo' },
  { label: 'Last Price', value: 'last_price' },
];

export default function StockItemsPage() {
  const { companyId } = useAppContext();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'inventory' | 'allergens'>('basic');
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [saving, setSaving] = useState(false);

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
    setActiveTab('basic');
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
      allergens: [],
    });
    setIsModalOpen(true);
  }

  function openEditModal(item: StockItem) {
    setEditingItem(item);
    setActiveTab('basic');
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
        is_prep_item: formData.is_prep_item,
        is_purchasable: formData.is_purchasable,
        costing_method: formData.costing_method,
        current_cost: formData.current_cost ? parseFloat(formData.current_cost) : null,
        allergens: formData.allergens.length > 0 ? formData.allergens : null,
        is_active: true,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('stock_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Stock item updated successfully');
      } else {
        const { error } = await supabase
          .from('stock_items')
          .insert(itemData)
          .select()
          .single();

        if (error) throw error;
        toast.success('Stock item added successfully');
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (error: any) {
      console.error('Error saving stock item:', error);
      toast.error(error.message || 'Failed to save stock item');
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

  const itemsBelowPar = filteredItems.filter(item => 
    item.track_stock && 
    item.par_level !== null && 
    item.par_level !== undefined
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-white">Loading stock items...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/stockly"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Stock Items</h1>
              <p className="text-slate-400 text-sm">Master list of all ingredients and products</p>
            </div>
          </div>
          <Button
            onClick={openAddModal}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Add Stock Item
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
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

        {/* Stock Items List */}
        {filteredItems.length === 0 ? (
          <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-12 text-center">
            <Package className="mx-auto text-slate-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchTerm || categoryFilter !== 'all' ? 'No items found' : 'No stock items yet'}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchTerm || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first stock item'}
            </p>
            {!searchTerm && categoryFilter === 'all' && (
              <Button onClick={openAddModal} variant="secondary">
                <Plus size={18} className="mr-2" />
                Add Stock Item
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white/[0.03] border border-neutral-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/[0.05] border-b border-neutral-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Unit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Par Level</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Allergens</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        item.track_stock && item.par_level && item.par_level > 0
                          ? 'bg-red-500/5' 
                          : ''
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-white font-medium">{item.name}</div>
                            {item.sku && (
                              <div className="text-xs text-slate-400">SKU: {item.sku}</div>
                            )}
                          </div>
                          {item.is_prep_item && (
                            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded">
                              Prep
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-300 text-sm">
                        {item.category?.name || '—'}
                      </td>
                      <td className="px-4 py-4 text-slate-300 text-sm">
                        {item.base_unit?.abbreviation || '—'}
                      </td>
                      <td className="px-4 py-4 text-slate-300 text-sm">
                        {formatCurrency(item.current_cost)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300 text-sm">
                            {item.par_level !== null && item.par_level !== undefined
                              ? item.par_level
                              : '—'}
                          </span>
                          {item.track_stock && item.par_level && item.par_level > 0 && (
                            <AlertCircle className="text-red-400" size={14} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {item.allergens && item.allergens.length > 0 ? (
                            item.allergens.slice(0, 3).map((allergen) => (
                              <span
                                key={allergen}
                                className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-300 rounded"
                              >
                                {allergen}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                          {item.allergens && item.allergens.length > 3 && (
                            <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-300 rounded">
                              +{item.allergens.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 text-slate-400 hover:text-[#EC4899] transition-colors"
                            aria-label="Edit item"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
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
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">
                {editingItem ? 'Edit Stock Item' : 'Add Stock Item'}
              </DialogTitle>
            </DialogHeader>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-neutral-800 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'basic'
                    ? 'text-[#EC4899] border-b-2 border-[#EC4899]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Basic
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'inventory'
                    ? 'text-[#EC4899] border-b-2 border-[#EC4899]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Inventory
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('allergens')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'allergens'
                    ? 'text-[#EC4899] border-b-2 border-[#EC4899]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Allergens
              </button>
            </div>

            <div className="space-y-4 mt-4">
              {/* Basic Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Item Name *</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Chicken Breast"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">SKU</label>
                      <Input
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="Stock keeping unit"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Item description"
                      className="w-full h-20 rounded-lg bg-white/[0.06] border border-white/[0.12] text-white text-sm px-3 py-2 placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Category</label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(val) => setFormData({ ...formData, category_id: val })}
                        options={categories.map(cat => ({ label: cat.name, value: cat.id }))}
                        placeholder="Select category"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Base Unit *</label>
                      <Select
                        value={formData.base_unit_id}
                        onValueChange={(val) => setFormData({ ...formData, base_unit_id: val })}
                        options={uoms.map(uom => ({ 
                          label: `${uom.name} (${uom.abbreviation})`, 
                          value: uom.id 
                        }))}
                        placeholder="Select unit"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_prep_item}
                        onChange={(e) => setFormData({ ...formData, is_prep_item: e.target.checked })}
                        className="w-4 h-4 rounded bg-white/[0.06] border-white/[0.12] text-[#EC4899] focus:ring-[#EC4899]"
                      />
                      <span className="text-sm text-slate-300">Made in-house (prep item)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_purchasable}
                        onChange={(e) => setFormData({ ...formData, is_purchasable: e.target.checked })}
                        className="w-4 h-4 rounded bg-white/[0.06] border-white/[0.12] text-[#EC4899] focus:ring-[#EC4899]"
                      />
                      <span className="text-sm text-slate-300">Purchasable from suppliers</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Inventory Tab */}
              {activeTab === 'inventory' && (
                <div className="space-y-4 border-t border-neutral-800 pt-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Inventory Settings</h3>
                  
                  <label className="flex items-center gap-2 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={formData.track_stock}
                      onChange={(e) => setFormData({ ...formData, track_stock: e.target.checked })}
                      className="w-4 h-4 rounded bg-white/[0.06] border-white/[0.12] text-[#EC4899] focus:ring-[#EC4899]"
                    />
                    <span className="text-sm text-slate-300">Track stock levels</span>
                  </label>

                  {formData.track_stock && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Par Level</label>
                        <Input
                          type="number"
                          step="0.001"
                          value={formData.par_level}
                          onChange={(e) => setFormData({ ...formData, par_level: e.target.value })}
                          placeholder="Minimum stock level"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Reorder Quantity</label>
                        <Input
                          type="number"
                          step="0.001"
                          value={formData.reorder_qty}
                          onChange={(e) => setFormData({ ...formData, reorder_qty: e.target.value })}
                          placeholder="Order this much when reordering"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Yield %</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.yield_percent}
                        onChange={(e) => setFormData({ ...formData, yield_percent: parseFloat(e.target.value) || 100 })}
                        placeholder="100"
                      />
                      <p className="text-xs text-slate-400 mt-1">e.g., 85 for meat after trimming</p>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Costing Method</label>
                      <Select
                        value={formData.costing_method}
                        onValueChange={(val: any) => setFormData({ ...formData, costing_method: val })}
                        options={COSTING_METHODS}
                        placeholder="Select method"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Yield Notes</label>
                    <Input
                      value={formData.yield_notes}
                      onChange={(e) => setFormData({ ...formData, yield_notes: e.target.value })}
                      placeholder="Notes about yield calculation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Current Cost (per base unit)</label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={formData.current_cost}
                      onChange={(e) => setFormData({ ...formData, current_cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}

              {/* Allergens Tab */}
              {activeTab === 'allergens' && (
                <div className="space-y-4 border-t border-neutral-800 pt-4">
                  <h3 className="text-sm font-semibold text-white mb-3">UK Allergens</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {UK_ALLERGENS.map((allergen) => (
                      <label
                        key={allergen}
                        className="flex items-center gap-2 p-2 rounded bg-white/[0.06] border border-neutral-800 hover:border-neutral-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.allergens.includes(allergen)}
                          onChange={() => toggleAllergen(allergen)}
                          className="w-4 h-4 rounded bg-white/[0.06] border-white/[0.12] text-[#EC4899] focus:ring-[#EC4899]"
                        />
                        <span className="text-sm text-slate-300 capitalize">{allergen}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-neutral-800">
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.name.trim() || !formData.base_unit_id}
                  variant="secondary"
                  className="flex-1"
                >
                  {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
                </Button>
                <Button
                  onClick={() => setIsModalOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
