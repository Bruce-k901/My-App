'use client';

import { useState, useMemo } from 'react';
import { StockCountWithDetails, StockCountItem, LibraryType } from '@/lib/types/stockly';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { 
  Download, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Search,
  MapPin
} from '@/components/ui/icons';

interface VarianceReportProps {
  count: StockCountWithDetails;
  items: StockCountItem[];
  onUpdate: () => void;
}

type SortField = 'name' | 'variance_qty' | 'variance_pct' | 'variance_value';
type SortDirection = 'asc' | 'desc';
type VarianceFilter = 'all' | 'positive' | 'negative' | 'zero';

export default function VarianceReport({ count, items, onUpdate }: VarianceReportProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLibrary, setSelectedLibrary] = useState<LibraryType | 'all'>('all');
  const [selectedStorageArea, setSelectedStorageArea] = useState<string>('all');
  const [varianceFilter, setVarianceFilter] = useState<VarianceFilter>('all');
  const [sortField, setSortField] = useState<SortField>('variance_value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Get unique storage areas from counted items
  const storageAreasFound = useMemo(() => {
    const areasMap = new Map();
    items.forEach(item => {
      if (item.counted_storage_area) {
        areasMap.set(item.counted_storage_area.id, item.counted_storage_area);
      }
    });
    return Array.from(areasMap.values());
  }, [items]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter(item => {
      // Library filter
      const matchesLibrary = selectedLibrary === 'all' || item.library_type === selectedLibrary;
      
      // Storage area filter
      const matchesStorage = selectedStorageArea === 'all' || 
        item.counted_storage_area_id === selectedStorageArea;
      
      // Search filter
      const ingredientName = (item.ingredient as any)?.ingredient_name || 
                            (item.ingredient as any)?.name || 
                            '';
      const matchesSearch = !searchTerm || 
        ingredientName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Variance filter
      let matchesVariance = true;
      if (item.status === 'counted' && item.variance_quantity !== null) {
        switch (varianceFilter) {
          case 'positive':
            matchesVariance = item.variance_quantity > 0;
            break;
          case 'negative':
            matchesVariance = item.variance_quantity < 0;
            break;
          case 'zero':
            matchesVariance = item.variance_quantity === 0;
            break;
        }
      }
      
      return matchesLibrary && matchesStorage && matchesSearch && matchesVariance;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortField) {
        case 'name':
          aVal = (a.ingredient as any)?.ingredient_name || (a.ingredient as any)?.name || '';
          bVal = (b.ingredient as any)?.ingredient_name || (b.ingredient as any)?.name || '';
          break;
        case 'variance_qty':
          aVal = a.variance_quantity || 0;
          bVal = b.variance_quantity || 0;
          break;
        case 'variance_pct':
          aVal = a.variance_percentage || 0;
          bVal = b.variance_percentage || 0;
          break;
        case 'variance_value':
          aVal = a.variance_value || 0;
          bVal = b.variance_value || 0;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return filtered;
  }, [items, searchTerm, selectedLibrary, selectedStorageArea, varianceFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getLibraryName = (type: LibraryType): string => {
    switch (type) {
      case 'ingredients':
        return 'Ingredients';
      case 'packaging':
        return 'Packaging';
      case 'foh':
        return 'FOH Items';
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Item',
      'Library',
      'Assigned Area',
      'Found In',
      'Opening Stock',
      'Stock In',
      'Sales',
      'Waste',
      'Transfers',
      'Theoretical Closing',
      'Actual Count',
      'Variance Qty',
      'Variance %',
      'Variance £',
      'Unit',
    ];

    const rows = filteredAndSortedItems.map(item => {
      const ingredientName = (item.ingredient as any)?.ingredient_name || 
                            (item.ingredient as any)?.name || '';
      return [
        ingredientName,
        item.library_type ? getLibraryName(item.library_type) : '',
        item.storage_area?.name || '',
        item.counted_storage_area?.name || '',
        item.opening_stock || 0,
        item.stock_in || 0,
        item.sales || 0,
        item.waste || 0,
        (item.transfers_in || 0) - (item.transfers_out || 0),
        item.theoretical_closing || 0,
        item.counted_quantity || 0,
        item.variance_quantity || 0,
        item.variance_percentage?.toFixed(2) || 0,
        item.variance_value?.toFixed(2) || 0,
        item.unit_of_measurement || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') 
          ? `"${cell}"` 
          : cell
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${count.name.replace(/\s+/g, '_')}_Report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const countedItems = items.filter(i => i.status === 'counted');
  const itemsWithVariance = countedItems.filter(i => 
    i.variance_quantity !== null && i.variance_quantity !== 0
  );

  const libraryOptions = [
    { label: 'All Libraries', value: 'all' },
    ...(count.libraries_included || []).map(lib => ({
      label: getLibraryName(lib),
      value: lib,
    })),
  ];

  const storageAreaOptions = [
    { label: 'All Locations', value: 'all' },
    ...storageAreasFound.map(area => ({
      label: area.name,
      value: area.id,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Items</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{count.total_items}</p>
        </div>

        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Items Counted</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{count.items_counted}</p>
        </div>

        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Items with Variance</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {itemsWithVariance.length}
            <span className="text-sm text-gray-500 dark:text-gray-500 ml-2">
              ({countedItems.length > 0 
                ? Math.round((itemsWithVariance.length / countedItems.length) * 100)
                : 0}%)
            </span>
          </p>
        </div>

        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Variance Value</p>
          <p className={`text-2xl font-bold ${
            count.total_variance_value < 0 ? 'text-red-600 dark:text-red-400' : 
            count.total_variance_value > 0 ? 'text-emerald-600 dark:text-green-400' : 'text-gray-900 dark:text-white'
          }`}>
            {count.total_variance_value < 0 ? '-' : count.total_variance_value > 0 ? '+' : ''}
            £{Math.abs(count.total_variance_value).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search items..."
                className="pl-10 bg-white dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Library</label>
            <Select 
              value={selectedLibrary} 
              onValueChange={(v) => setSelectedLibrary(v as LibraryType | 'all')}
              options={libraryOptions}
              placeholder="Select library..."
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Found In</label>
            <Select 
              value={selectedStorageArea} 
              onValueChange={setSelectedStorageArea}
              options={storageAreaOptions}
              placeholder="Select location..."
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Show Variance</label>
            <Select 
              value={varianceFilter} 
              onValueChange={(v) => setVarianceFilter(v as VarianceFilter)}
              options={[
                { label: 'All Items', value: 'all' },
                { label: 'Negative Only', value: 'negative' },
                { label: 'Positive Only', value: 'positive' },
                { label: 'Zero Variance', value: 'zero' },
              ]}
              placeholder="Select filter..."
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Export</label>
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="w-full border-gray-300 dark:border-white/[0.06] text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-white/[0.05] border-b border-gray-200 dark:border-white/[0.06]">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort('name')}
                >
                  Item {getSortIcon('name')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-400">
                  Library
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-400">
                  Found In
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-400">
                  Expected
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-400">
                  Counted
                </th>
                <th 
                  className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort('variance_qty')}
                >
                  Var Qty {getSortIcon('variance_qty')}
                </th>
                <th 
                  className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort('variance_pct')}
                >
                  Var % {getSortIcon('variance_pct')}
                </th>
                <th 
                  className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                  onClick={() => handleSort('variance_value')}
                >
                  Var £ {getSortIcon('variance_value')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/[0.06]">
              {filteredAndSortedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No items found
                  </td>
                </tr>
              ) : (
                filteredAndSortedItems.map((item) => {
                  const hasLargeVariance = item.variance_percentage !== null && 
                    Math.abs(item.variance_percentage) > 10;
                  const ingredientName = (item.ingredient as any)?.ingredient_name || 
                                       (item.ingredient as any)?.name || 
                                       'Unknown';

                  return (
                    <tr 
                      key={item.id}
                      className={`hover:bg-gray-50 dark:hover:bg-white/[0.02] ${
                        hasLargeVariance ? 'bg-amber-50 dark:bg-amber-900/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {hasLargeVariance && (
                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                          )}
                          {ingredientName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {item.library_type ? getLibraryName(item.library_type) : 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          {item.counted_storage_area ? (
                            <>
                              <MapPin className="h-3 w-3" />
                              {item.counted_storage_area.name}
                            </>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-600">Not recorded</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                        {item.theoretical_closing?.toFixed(2) || '0.00'}
                        <span className="text-gray-500 dark:text-gray-600 ml-1">{item.unit_of_measurement}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                        {item.counted_quantity?.toFixed(2) || '-'}
                        <span className="text-gray-500 dark:text-gray-600 ml-1">{item.unit_of_measurement}</span>
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        item.variance_quantity === null ? 'text-gray-500 dark:text-gray-400' :
                        item.variance_quantity < 0 ? 'text-red-600 dark:text-red-400' :
                        item.variance_quantity > 0 ? 'text-emerald-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {item.variance_quantity !== null ? (
                          <>
                            {item.variance_quantity > 0 ? '+' : ''}
                            {item.variance_quantity.toFixed(2)}
                          </>
                        ) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        item.variance_percentage === null ? 'text-gray-500 dark:text-gray-400' :
                        item.variance_percentage < 0 ? 'text-red-600 dark:text-red-400' :
                        item.variance_percentage > 0 ? 'text-emerald-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {item.variance_percentage !== null ? (
                          <div className="flex items-center justify-end gap-1">
                            {item.variance_percentage < 0 ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : item.variance_percentage > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : null}
                            {item.variance_percentage > 0 ? '+' : ''}
                            {item.variance_percentage.toFixed(1)}%
                          </div>
                        ) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        item.variance_value === null ? 'text-gray-500 dark:text-gray-400' :
                        item.variance_value < 0 ? 'text-red-600 dark:text-red-400' :
                        item.variance_value > 0 ? 'text-emerald-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {item.variance_value !== null ? (
                          <>
                            {item.variance_value > 0 ? '+' : ''}
                            £{Math.abs(item.variance_value).toFixed(2)}
                          </>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
        Showing {filteredAndSortedItems.length} of {items.length} items
      </div>
    </div>
  );
}
