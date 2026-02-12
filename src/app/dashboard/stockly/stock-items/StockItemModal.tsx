'use client';

import { useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Plus, Save, Loader2 } from '@/components/ui/icons';

// Section Header Component
const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-semibold uppercase tracking-wide text-theme-tertiary border-b border-gray-700 pb-2 mb-4">
    {children}
  </div>
);

const BASE_UNIT_OPTIONS = [
  { value: 'g', label: 'g (grams)' },
  { value: 'kg', label: 'kg (kilograms)' },
  { value: 'ml', label: 'ml (milliliters)' },
  { value: 'l', label: 'l (liters)' },
  { value: 'each', label: 'each (units)' },
];

const COSTING_METHODS = [
  { label: 'Weighted Average', value: 'weighted_average' },
  { label: 'FIFO (First In, First Out)', value: 'fifo' },
  { label: 'LIFO (Last In, First Out)', value: 'lifo' },
  { label: 'Fixed Price', value: 'fixed' },
];

const UK_ALLERGENS = [
  { key: 'celery', label: 'Celery' },
  { key: 'gluten', label: 'Gluten' },
  { key: 'crustaceans', label: 'Crustaceans' },
  { key: 'eggs', label: 'Eggs' },
  { key: 'fish', label: 'Fish' },
  { key: 'lupin', label: 'Lupin' },
  { key: 'milk', label: 'Milk' },
  { key: 'molluscs', label: 'Molluscs' },
  { key: 'mustard', label: 'Mustard' },
  { key: 'nuts', label: 'Nuts' },
  { key: 'peanuts', label: 'Peanuts' },
  { key: 'sesame', label: 'Sesame' },
  { key: 'soybeans', label: 'Soybeans' },
  { key: 'sulphites', label: 'Sulphites' },
];

// Form validation schema
const stockItemSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200, 'Name must be less than 200 characters'),
  category: z.string().min(1, 'Category is required'),
  sku: z.string().max(50, 'SKU must be less than 50 characters').optional().or(z.literal('')),
  description: z.string().optional(),
  purchasable: z.boolean(),
  is_prep_item: z.boolean(),
  track_stock: z.boolean(),
  base_unit: z.string().min(1, 'Base unit is required'),
  par_level: z.string().optional(),
  reorder_qty: z.string().optional(),
  yield_percent: z.number().min(1).max(100),
  yield_notes: z.string().optional(),
  pack_size: z.string().optional(),
  pack_cost: z.string().optional(),
  costing_method: z.enum(['weighted_average', 'fifo', 'lifo', 'fixed']),
  allergen_celery: z.boolean(),
  allergen_gluten: z.boolean(),
  allergen_crustaceans: z.boolean(),
  allergen_eggs: z.boolean(),
  allergen_fish: z.boolean(),
  allergen_lupin: z.boolean(),
  allergen_milk: z.boolean(),
  allergen_molluscs: z.boolean(),
  allergen_mustard: z.boolean(),
  allergen_nuts: z.boolean(),
  allergen_peanuts: z.boolean(),
  allergen_sesame: z.boolean(),
  allergen_soybeans: z.boolean(),
  allergen_sulphites: z.boolean(),
}).refine((data) => {
  if (data.purchasable && !data.is_prep_item) {
    if (!data.pack_size || parseFloat(data.pack_size || '0') <= 0) return false;
    if (!data.pack_cost || parseFloat(data.pack_cost || '0') < 0) return false;
  }
  return true;
}, {
  message: 'Pack size and pack cost are required when purchasable',
  path: ['pack_size'],
}).refine((data) => {
  if (!data.track_stock) return true;
  return data.base_unit && data.base_unit.length > 0;
}, {
  message: 'Base unit is required when tracking stock',
  path: ['base_unit'],
});

type StockItemFormData = z.infer<typeof stockItemSchema>;

interface StockItemModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  editingItem?: any;
  companyId: string;
  categories: Array<{ id: string; name: string }>;
  uoms: Array<{ id: string; abbreviation: string }>;
}

export default function StockItemModal({
  open,
  onClose,
  onSave,
  editingItem,
  companyId,
  categories,
  uoms,
}: StockItemModalProps) {
  // Map UOMs to base unit abbreviations for the form
  const baseUnitMap = useMemo(() => {
    const map = new Map<string, string>();
    uoms.forEach(uom => {
      const abbr = uom.abbreviation.toLowerCase();
      map.set(abbr, uom.id);
      // Also map common variations
      if (abbr === 'g' || abbr === 'gram' || abbr === 'grams') map.set('g', uom.id);
      if (abbr === 'kg' || abbr === 'kilogram' || abbr === 'kilograms') map.set('kg', uom.id);
      if (abbr === 'ml' || abbr === 'milliliter' || abbr === 'milliliters') map.set('ml', uom.id);
      if (abbr === 'l' || abbr === 'liter' || abbr === 'liters' || abbr === 'litre' || abbr === 'litres') map.set('l', uom.id);
      if (abbr === 'each' || abbr === 'unit' || abbr === 'units' || abbr === 'ea') map.set('each', uom.id);
    });
    return map;
  }, [uoms]);

  // Category options - combine existing categories with defaults
  const categoryOptions = useMemo(() => {
    const existing = categories.map(cat => ({ label: cat.name, value: cat.id }));
    const defaults = [
      'Baking', 'Chocolate', 'Dairy', 'Dried Fruit', 'Flour', 'Meat', 
      'Nuts', 'Oil', 'Produce', 'Seafood', 'Spices', 'Sugar', 'Other'
    ].filter(def => !existing.some(e => e.label.toLowerCase() === def.toLowerCase()))
      .map(def => ({ label: def, value: def }));
    return [...existing, ...defaults];
  }, [categories]);

  const form = useForm<StockItemFormData>({
    resolver: zodResolver(stockItemSchema),
    defaultValues: {
      name: '',
      category: '',
      sku: '',
      description: '',
      purchasable: true,
      is_prep_item: false,
      track_stock: true,
      base_unit: 'g',
      par_level: '',
      reorder_qty: '',
      yield_percent: 100,
      yield_notes: '',
      pack_size: '',
      pack_cost: '',
      costing_method: 'weighted_average',
      allergen_celery: false,
      allergen_gluten: false,
      allergen_crustaceans: false,
      allergen_eggs: false,
      allergen_fish: false,
      allergen_lupin: false,
      allergen_milk: false,
      allergen_molluscs: false,
      allergen_mustard: false,
      allergen_nuts: false,
      allergen_peanuts: false,
      allergen_sesame: false,
      allergen_soybeans: false,
      allergen_sulphites: false,
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form;

  // Watch values for auto-calculation and smart logic
  const packSize = watch('pack_size');
  const packCost = watch('pack_cost');
  const baseUnit = watch('base_unit');
  const purchasable = watch('purchasable');
  const isPrepItem = watch('is_prep_item');

  // Auto-calculate unit cost
  const unitCost = useMemo(() => {
    if (!packSize || !packCost || parseFloat(packSize || '0') === 0) return '0.000000';
    const cost = parseFloat(packCost || '0') / parseFloat(packSize || '1');
    return cost.toFixed(6);
  }, [packSize, packCost]);

  const unitCostDisplay = useMemo(() => {
    if (unitCost === '0.000000') return '';
    return `£${unitCost}/${baseUnit}`;
  }, [unitCost, baseUnit]);

  // Smart logic: Made in-house vs Purchasable
  useEffect(() => {
    if (isPrepItem) {
      setValue('purchasable', false);
      setValue('pack_size', '1');
      setValue('pack_cost', '0');
    }
  }, [isPrepItem, setValue]);

  useEffect(() => {
    if (purchasable && !isPrepItem) {
      setValue('is_prep_item', false);
    }
  }, [purchasable, isPrepItem, setValue]);

  // Load editing item data
  useEffect(() => {
    if (editingItem && open) {
      const allergenMap: Record<string, boolean> = {};
      UK_ALLERGENS.forEach(a => {
        allergenMap[`allergen_${a.key}`] = editingItem.allergens?.includes(a.key) || false;
      });

      // Find base unit abbreviation from UOM
      const baseUnitAbbr = uoms.find(u => u.id === editingItem.base_unit_id)?.abbreviation.toLowerCase() || 'g';

      form.reset({
        name: editingItem.name || '',
        category: editingItem.category_id || '',
        sku: editingItem.sku || '',
        description: editingItem.description || '',
        purchasable: editingItem.is_purchasable ?? true,
        is_prep_item: editingItem.is_prep_item || false,
        track_stock: editingItem.track_stock ?? true,
        base_unit: baseUnitAbbr,
        par_level: editingItem.par_level?.toString() || '',
        reorder_qty: editingItem.reorder_qty?.toString() || '',
        yield_percent: editingItem.yield_percent || 100,
        yield_notes: editingItem.yield_notes || '',
        pack_size: editingItem.pack_size?.toString() || '',
        pack_cost: editingItem.pack_cost?.toString() || '',
        costing_method: (editingItem.costing_method === 'weighted_avg' ? 'weighted_average' : editingItem.costing_method) as any || 'weighted_average',
        ...allergenMap,
      });
    } else if (!editingItem && open) {
      form.reset();
    }
  }, [editingItem, open, form, uoms]);

  const onSubmit = async (data: StockItemFormData) => {
    try {
      // Convert allergens array
      const allergens = UK_ALLERGENS
        .filter(a => data[`allergen_${a.key}` as keyof StockItemFormData] as boolean)
        .map(a => a.key);

      // Find base unit ID from abbreviation
      const baseUnitId = baseUnitMap.get(data.base_unit.toLowerCase());
      if (!baseUnitId) {
        toast.error('Invalid base unit selected');
        return;
      }

      // Calculate current_cost
      let calculatedCost = null;
      if (data.pack_cost && data.pack_size) {
        const packCost = parseFloat(data.pack_cost);
        const packSize = parseFloat(data.pack_size);
        if (packCost > 0 && packSize > 0) {
          calculatedCost = packCost / packSize;
        }
      }

      // Find or create category
      let categoryId = data.category;
      if (!categories.find(c => c.id === categoryId)) {
        // Create new category
        const { data: newCat, error: catError } = await supabase
          .from('stock_categories')
          .insert({
            company_id: companyId,
            name: data.category,
            category_type: 'other',
          })
          .select()
          .single();
        
        if (catError) {
          toast.error('Failed to create category');
          return;
        }
        categoryId = newCat.id;
      }

      const itemData: any = {
        company_id: companyId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        sku: data.sku?.trim() || null,
        category_id: categoryId || null,
        base_unit_id: baseUnitId,
        track_stock: data.track_stock,
        par_level: data.par_level ? parseFloat(data.par_level) : null,
        reorder_qty: data.reorder_qty ? parseFloat(data.reorder_qty) : null,
        yield_percent: data.yield_percent || null,
        yield_notes: data.yield_notes?.trim() || null,
        allergens: allergens.length > 0 ? allergens : null,
        is_prep_item: data.is_prep_item,
        is_purchasable: data.purchasable,
        costing_method: data.costing_method === 'weighted_average' ? 'weighted_avg' : data.costing_method,
        pack_size: data.pack_size ? parseFloat(data.pack_size) : null,
        pack_cost: data.pack_cost ? parseFloat(data.pack_cost) : null,
        current_cost: calculatedCost || null,
        is_active: true,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('stock_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) {
          console.error('Error updating stock item:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            fullError: JSON.stringify(error, null, 2)
          });
          
          const errorMessage = error.message || error.details || error.hint || JSON.stringify(error) || 'Failed to update stock item';
          
          // Check if it's a schema cache error
          if (error.code === 'PGRST204') {
            const schemaErrorMsg = error.message || error.details || '';
            toast.error(
              `Schema cache error: ${schemaErrorMsg}. You must restart your Supabase instance to reload the schema cache. Run: supabase stop && supabase start`,
              { duration: 10000 }
            );
            return;
          }
          
          toast.error(errorMessage);
          return;
        }
        toast.success('Stock item updated successfully');
      } else {
        const { error } = await supabase
          .from('stock_items')
          .insert(itemData)
          .select()
          .single();

        if (error) {
          console.error('Error inserting stock item:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            fullError: JSON.stringify(error, null, 2)
          });
          
          const errorMessage = error.message || error.details || error.hint || JSON.stringify(error) || 'Failed to save stock item';
          
          // Check if it's a schema cache error
          if (error.code === 'PGRST204') {
            const schemaErrorMsg = error.message || error.details || '';
            toast.error(
              `Schema cache error: ${schemaErrorMsg}. You must restart your Supabase instance to reload the schema cache. Run: supabase stop && supabase start`,
              { duration: 10000 }
            );
            return;
          }
          
          toast.error(errorMessage);
          return;
        }
        toast.success('Stock item added successfully');
      }

      onClose();
      onSave();
    } catch (error: any) {
      console.error('Error saving stock item:', error);
      toast.error(error.message || 'Failed to save stock item');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="!max-w-none w-[1200px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-8"
        style={{ maxWidth: '1200px', width: '1200px' }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-theme-primary">
            {editingItem ? 'Edit Stock Item' : 'Add Stock Item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-8 mt-6">
            {/* LEFT COLUMN */}
            <div className="space-y-8">
              {/* BASIC INFORMATION */}
              <section>
                <SectionHeader>Basic Information</SectionHeader>
                <div className="space-y-4">
                  {/* Item Name */}
                  <div>
                    <label className="block text-sm font-medium text-theme-tertiary mb-1">
                      Item Name *
                    </label>
                    <Input
                      {...register('name')}
                      className="h-10 rounded-md bg-gray-800/50 border border-gray-700 text-sm text-theme-primary px-3 py-2 placeholder:text-theme-tertiary focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:border-module-fg/30"
                      placeholder="e.g., Chicken Breast"
                    />
                    {errors.name && (
                      <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Category + SKU Row */}
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-7">
                      <label className="block text-sm font-medium text-theme-tertiary mb-1">
                        Category *
                      </label>
                      <div className="[&_button]:hover:border-module-fg/30 [&_button]:hover:shadow-module-glow [&_button]:focus:border-emerald-500 [&_button]:focus:shadow-[0_0_14px_rgba(16,185,129,0.4)] [&_button[data-state=open]]:border-emerald-500 [&_button[data-state=open]]:shadow-[0_0_14px_rgba(16,185,129,0.4)]">
                        <Select
                          value={watch('category')}
                          onValueChange={(val) => setValue('category', val)}
                          options={categoryOptions}
                          placeholder="Select category"
                        />
                      </div>
                      {errors.category && (
                        <p className="text-xs text-red-400 mt-1">{errors.category.message}</p>
                      )}
                    </div>
                    <div className="col-span-5">
                      <label className="block text-sm font-medium text-theme-tertiary mb-1">
                        SKU
                      </label>
                      <Input
                        {...register('sku')}
                        className="h-10 rounded-md bg-gray-800/50 border border-gray-700 text-sm text-theme-primary px-3 py-2 placeholder:text-theme-tertiary focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:border-module-fg/30"
                        placeholder="SKU code"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-theme-tertiary mb-1">
                      Description
                    </label>
                    <textarea
                      {...register('description')}
                      rows={3}
                      className="w-full h-24 rounded-md bg-gray-800/50 border border-gray-700 text-sm text-theme-primary px-3 py-2 placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:border-module-fg/30 resize-none"
                      placeholder="Item description"
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('purchasable')}
                        defaultChecked
                        className="w-4 h-4 rounded bg-gray-800/50 border-gray-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-theme-tertiary">Purchasable from suppliers</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('is_prep_item')}
                        className="w-4 h-4 rounded bg-gray-800/50 border-gray-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-theme-tertiary">Made in-house (prep item)</span>
                    </label>
                  </div>
                </div>
              </section>

              {/* COSTING */}
              <section>
                <SectionHeader>Costing</SectionHeader>
                <div className="space-y-4">
                  {/* Pack Size + Pack Cost + Unit Cost Row */}
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-theme-tertiary mb-1">
                        Pack Size {purchasable && !isPrepItem && '*'}
                      </label>
                      <Input
                        {...register('pack_size')}
                        type="number"
                        step="0.001"
                        disabled={isPrepItem}
                        className={`h-10 rounded-md bg-gray-800/50 border border-gray-700 text-sm text-theme-primary px-3 py-2 placeholder:text-theme-tertiary focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                          isPrepItem 
                            ? 'bg-gray-800/30 cursor-not-allowed opacity-50' 
                            : 'hover:border-module-fg/30'
                        }`}
                        placeholder="e.g., 25"
                      />
                      {errors.pack_size && (
                        <p className="text-xs text-red-400 mt-1">{errors.pack_size.message}</p>
                      )}
                    </div>
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-theme-tertiary mb-1">
                        Pack Cost {purchasable && !isPrepItem && '*'}
                      </label>
                      <Input
                        {...register('pack_cost')}
                        type="number"
                        step="0.01"
                        disabled={isPrepItem}
                        className={`h-10 rounded-md bg-gray-800/50 border border-gray-700 text-sm text-theme-primary px-3 py-2 placeholder:text-theme-tertiary focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                          isPrepItem 
                            ? 'bg-gray-800/30 cursor-not-allowed opacity-50' 
                            : 'hover:border-module-fg/30'
                        }`}
                        placeholder="e.g., 50.00"
                      />
                      {errors.pack_cost && (
                        <p className="text-xs text-red-400 mt-1">{errors.pack_cost.message}</p>
                      )}
                    </div>
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-theme-tertiary mb-1">
                        Unit Cost (auto-calculated)
                      </label>
                      <Input
                        value={unitCostDisplay}
                        readOnly
                        disabled
                        className="h-10 rounded-md bg-gray-800/30 border border-gray-700 text-sm italic text-theme-tertiary px-3 py-2 cursor-not-allowed placeholder:text-theme-tertiary"
                        placeholder="Auto-calculated"
                      />
                    </div>
                  </div>

                  {/* Costing Method */}
                  <div>
                    <label className="block text-sm font-medium text-theme-tertiary mb-1">
                      Costing Method
                    </label>
                      <div className="[&_button]:hover:border-module-fg/30 [&_button]:hover:shadow-module-glow [&_button]:focus:border-emerald-500 [&_button]:focus:shadow-[0_0_14px_rgba(16,185,129,0.4)] [&_button[data-state=open]]:border-emerald-500 [&_button[data-state=open]]:shadow-[0_0_14px_rgba(16,185,129,0.4)]">
                        <Select
                          value={watch('costing_method')}
                          onValueChange={(val: any) => setValue('costing_method', val)}
                          options={COSTING_METHODS}
                          placeholder="Select method"
                        />
                      </div>
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-8">
              {/* INVENTORY & STOCK CONTROL */}
              <section>
                <SectionHeader>Inventory & Stock Control</SectionHeader>
                <div className="space-y-4">
                  {/* Track Stock */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('track_stock')}
                      defaultChecked
                      className="w-4 h-4 rounded bg-gray-800/50 border-gray-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-theme-tertiary">Track Stock</span>
                  </label>

                  {/* Base Unit + Par Level + Reorder Qty Row */}
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-theme-tertiary mb-1">
                        Base Unit *
                      </label>
                        <div className="[&_button]:hover:border-module-fg/30 [&_button]:hover:shadow-module-glow [&_button]:focus:border-emerald-500 [&_button]:focus:shadow-[0_0_14px_rgba(16,185,129,0.4)] [&_button[data-state=open]]:border-emerald-500 [&_button[data-state=open]]:shadow-[0_0_14px_rgba(16,185,129,0.4)]">
                          <Select
                            value={watch('base_unit')}
                            onValueChange={(val) => setValue('base_unit', val)}
                            options={BASE_UNIT_OPTIONS}
                            placeholder="Select unit"
                          />
                        </div>
                      {errors.base_unit && (
                        <p className="text-xs text-red-400 mt-1">{errors.base_unit.message}</p>
                      )}
                    </div>
                    {watch('track_stock') && (
                      <>
                        <div className="col-span-4">
                          <label className="block text-sm font-medium text-theme-tertiary mb-1">
                            Par Level
                          </label>
                          <Input
                            {...register('par_level')}
                            type="number"
                            step="0.001"
                            className="h-10 rounded-md bg-gray-800/50 border border-gray-700 text-sm text-theme-primary px-3 py-2 placeholder:text-theme-tertiary focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:border-module-fg/30"
                            placeholder="Min level"
                          />
                        </div>
                        <div className="col-span-4">
                          <label className="block text-sm font-medium text-theme-tertiary mb-1">
                            Reorder Qty
                          </label>
                          <Input
                            {...register('reorder_qty')}
                            type="number"
                            step="0.001"
                            className="h-10 rounded-md bg-gray-800/50 border border-gray-700 text-sm text-theme-primary px-3 py-2 placeholder:text-theme-tertiary focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:border-module-fg/30"
                            placeholder="Reorder amount"
                          />
                        </div>
                      </>
                    )}
                    {!watch('track_stock') && <div className="col-span-8"></div>}
                  </div>

                  {/* Yield % + Yield Notes Row */}
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-theme-tertiary mb-1">
                        Yield %
                      </label>
                      <Input
                        {...register('yield_percent', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="1"
                        max="100"
                        className="h-10 rounded-md bg-gray-800/50 border border-gray-700 text-sm text-theme-primary px-3 py-2 placeholder:text-theme-tertiary focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:border-module-fg/30"
                        placeholder="100"
                      />
                    </div>
                    <div className="col-span-8">
                      <label className="block text-sm font-medium text-theme-tertiary mb-1">
                        Yield Notes
                      </label>
                      <Input
                        {...register('yield_notes')}
                        className="h-10 rounded-md bg-gray-800/50 border border-gray-700 text-sm text-theme-primary px-3 py-2 placeholder:text-theme-tertiary focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:border-module-fg/30"
                        placeholder="Notes about yield calculation"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* ALLERGENS */}
              <section>
                <SectionHeader>Allergens (UK/EU Compliance)</SectionHeader>
                <div className="grid grid-cols-4 gap-y-3 gap-x-4">
                  {UK_ALLERGENS.map((allergen) => (
                    <label
                      key={allergen.key}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        {...register(`allergen_${allergen.key}` as any)}
                        className="w-4 h-4 rounded bg-gray-800/50 border-gray-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-theme-tertiary">{allergen.label}</span>
                    </label>
                  ))}
                </div>
              </section>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-gray-700">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[160px] h-11 bg-white/[0.03] backdrop-blur-md border border-emerald-500 text-module-fg font-medium hover:shadow-module-glow hover:border-emerald-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:border-emerald-500 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : editingItem ? (
                <>
                  <Save size={18} />
                  <span>Update Item</span>
                </>
              ) : (
                <>
                  <Plus size={18} />
                  <span>Add Item</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-w-[160px] h-11 border-gray-700 text-theme-tertiary hover:bg-gray-800/50 hover:border-gray-600 transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

