'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, ArrowRightLeft, Loader2, Package } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

interface MappingRow {
  id: string;
  supplier_code: string | null;
  pack_size: number | null;
  current_price: number | null;
  is_discontinued: boolean;
  product_name: string | null;
  stock_item: {
    id: string;
    name: string;
    category_id: string | null;
    is_active: boolean;
    category: { id: string; name: string } | null;
  } | null;
  supplier: { id: string; name: string } | null;
  pack_unit: { abbreviation: string } | null;
}

interface FilterOption {
  label: string;
  value: string;
}

export default function ProductMappingTable() {
  const { companyId } = useAppContext();
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetSupplierId, setTargetSupplierId] = useState('');
  const [moving, setMoving] = useState(false);

  // Fetch all product variants with joins
  async function fetchData() {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          id, supplier_code, pack_size, current_price, is_discontinued, product_name,
          stock_item:stock_items!stock_item_id(id, name, category_id, is_active, category:stock_categories(id, name)),
          supplier:suppliers!supplier_id(id, name),
          pack_unit:uom!pack_unit_id(abbreviation)
        `)
        .eq('is_discontinued', false)
        .order('product_name');

      if (error) throw error;

      // Filter by company via stock_item.company_id isn't possible in the query
      // but stock_items are company-scoped via RLS, so results are already filtered
      setRows((data as unknown as MappingRow[]) || []);
    } catch (err: any) {
      console.error('Error fetching product variants:', err);
      toast.error('Failed to load product variants');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (companyId) fetchData();
  }, [companyId]);

  // Build filter options from data
  const categoryOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();
    rows.forEach(r => {
      const cat = r.stock_item?.category;
      if (cat) map.set(cat.id, cat.name);
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const supplierOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();
    rows.forEach(r => {
      if (r.supplier) map.set(r.supplier.id, r.supplier.name);
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  // Filter rows
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const name = r.stock_item?.name || r.product_name || '';
      const code = r.supplier_code || '';
      const matchesSearch = !searchTerm ||
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = !categoryFilter ||
        r.stock_item?.category_id === categoryFilter;

      const matchesSupplier = !supplierFilter ||
        r.supplier?.id === supplierFilter;

      return matchesSearch && matchesCategory && matchesSupplier;
    });
  }, [rows, searchTerm, categoryFilter, supplierFilter]);

  // Selection helpers
  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filteredRows.length && filteredRows.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredRows.map(r => r.id)));
    }
  }

  // Bulk move
  async function handleMove() {
    if (!targetSupplierId || selected.size === 0) return;

    // Don't allow moving to the same supplier if all selected are already there
    const ids = Array.from(selected);

    setMoving(true);
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ supplier_id: targetSupplierId, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;

      const targetName = supplierOptions.find(s => s.value === targetSupplierId)?.label || 'supplier';
      toast.success(`Moved ${ids.length} item(s) to ${targetName}`);
      setSelected(new Set());
      setTargetSupplierId('');
      fetchData();
    } catch (err: any) {
      console.error('Error moving variants:', err);
      toast.error(err.message || 'Failed to move items');
    } finally {
      setMoving(false);
    }
  }

  const allFilteredSelected = filteredRows.length > 0 && selected.size === filteredRows.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-theme-tertiary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-theme-surface border border-theme rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-tertiary" size={18} />
            <Input
              type="text"
              placeholder="Search stock items or supplier codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full sm:w-48">
            <SearchableSelect
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              options={[{ label: 'All Categories', value: '' }, ...categoryOptions]}
              placeholder="Category"
            />
          </div>
          <div className="w-full sm:w-48">
            <SearchableSelect
              value={supplierFilter}
              onValueChange={setSupplierFilter}
              options={[{ label: 'All Suppliers', value: '' }, ...supplierOptions]}
              placeholder="Supplier"
            />
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-theme-surface border border-module-fg/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-sm text-theme-primary font-medium whitespace-nowrap">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <ArrowRightLeft className="w-4 h-4 text-module-fg flex-shrink-0" />
            <span className="text-sm text-theme-secondary whitespace-nowrap">Move to:</span>
            <div className="flex-1 min-w-0 sm:max-w-[240px]">
              <SearchableSelect
                value={targetSupplierId}
                onValueChange={setTargetSupplierId}
                options={supplierOptions}
                placeholder="Select supplier..."
              />
            </div>
            <Button
              onClick={handleMove}
              disabled={moving || !targetSupplierId}
              variant="secondary"
              className="flex-shrink-0"
            >
              {moving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Moving...
                </>
              ) : (
                'Apply'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {filteredRows.length === 0 ? (
        <div className="bg-theme-surface border border-theme rounded-xl p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-theme-primary font-medium mb-2">No product variants found</h3>
          <p className="text-theme-secondary text-sm">
            {searchTerm || categoryFilter || supplierFilter
              ? 'Try adjusting your search or filters'
              : 'No active product variants exist yet'}
          </p>
        </div>
      ) : (
        <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme">
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-theme accent-module-fg"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-theme-secondary font-medium">Stock Item</th>
                  <th className="px-4 py-3 text-left text-theme-secondary font-medium">Supplier</th>
                  <th className="px-4 py-3 text-left text-theme-secondary font-medium hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-left text-theme-secondary font-medium hidden lg:table-cell">Supplier Code</th>
                  <th className="px-4 py-3 text-right text-theme-secondary font-medium hidden sm:table-cell">Pack Size</th>
                  <th className="px-4 py-3 text-right text-theme-secondary font-medium">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {filteredRows.map(row => {
                  const isSelected = selected.has(row.id);
                  return (
                    <tr
                      key={row.id}
                      onClick={() => toggleSelect(row.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-module-fg/5' : 'hover:bg-theme-hover'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(row.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-theme accent-module-fg"
                        />
                      </td>
                      <td className="px-4 py-3 text-theme-primary font-medium">
                        {row.stock_item?.name || row.product_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-theme-secondary">
                        {row.supplier?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-theme-tertiary hidden md:table-cell">
                        {row.stock_item?.category?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-theme-tertiary hidden lg:table-cell font-mono text-xs">
                        {row.supplier_code || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-theme-secondary hidden sm:table-cell">
                        {row.pack_size != null
                          ? `${row.pack_size}${row.pack_unit?.abbreviation ? ` ${row.pack_unit.abbreviation}` : ''}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-theme-primary font-medium tabular-nums">
                        {row.current_price != null
                          ? `£${Number(row.current_price).toFixed(2)}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-theme text-xs text-theme-tertiary">
            {filteredRows.length} of {rows.length} product variant{rows.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
