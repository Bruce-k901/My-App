'use client';

import { Fragment } from 'react';
import { cn } from '@/lib/utils';

interface BakeGroup {
  id: string;
  name: string;
  icon?: string;
  priority?: number;
}

interface Product {
  id: string;
  name: string;
  bake_group_id?: string;
  sort_order?: number;
}

interface Customer {
  id: string;
  name: string;
}

interface GroupedProducts extends BakeGroup {
  products: Product[];
}

interface TransposedRow {
  label: string;
  customerId: string;
  cells: (number | null)[];
}

interface PackingPlanGridProps {
  groupedProducts: GroupedProducts[] | null;
  customers: Customer[];
  products: Product[];
  quantityMap: Map<string, number>;
  transposed: boolean;
}

export function PackingPlanGrid({
  groupedProducts,
  customers,
  products,
  quantityMap,
  transposed,
}: PackingPlanGridProps) {
  if (transposed) {
    // Transposed: Customers as rows, Products as columns
    const transposedRows: TransposedRow[] = customers.map((customer) => ({
      label: customer.name,
      customerId: customer.id,
      cells: products.map((product) => {
        const key = `${customer.id}-${product.id}`;
        return quantityMap.get(key) || null;
      }),
    }));

    return (
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-zinc-800">
              <th className="border border-gray-200 dark:border-zinc-700 px-3 py-2 text-left font-medium text-gray-700 dark:text-zinc-300 sticky left-0 bg-gray-100 dark:bg-zinc-800 z-10 min-w-[140px]">
                Customer
              </th>
              {products.map((product) => (
                <th
                  key={product.id}
                  className="border border-gray-200 dark:border-zinc-700 px-2 py-2 text-center font-medium text-gray-700 dark:text-zinc-300 min-w-[70px] max-w-[100px]"
                >
                  <span className="block truncate" title={product.name}>
                    {product.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transposedRows.map((row, rowIndex) => (
              <tr
                key={row.customerId}
                className={cn(
                  'hover:bg-gray-50 dark:hover:bg-zinc-800/50',
                  rowIndex % 2 === 0
                    ? 'bg-white dark:bg-zinc-900'
                    : 'bg-gray-50/50 dark:bg-zinc-900/50'
                )}
              >
                <td className="border border-gray-200 dark:border-zinc-700 px-3 py-2 font-medium text-gray-900 dark:text-white sticky left-0 bg-inherit z-10">
                  {row.label}
                </td>
                {row.cells.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border border-gray-200 dark:border-zinc-700 px-2 py-2 text-center text-gray-900 dark:text-zinc-100"
                  >
                    {cell || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Default: Products as rows (grouped), Customers as columns
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100 dark:bg-zinc-800">
            <th className="border border-gray-200 dark:border-zinc-700 px-3 py-2 text-left font-medium text-gray-700 dark:text-zinc-300 sticky left-0 bg-gray-100 dark:bg-zinc-800 z-10 min-w-[160px]">
              Product
            </th>
            {customers.map((customer) => (
              <th
                key={customer.id}
                className="border border-gray-200 dark:border-zinc-700 px-2 py-2 text-center font-medium text-gray-700 dark:text-zinc-300 min-w-[70px] max-w-[100px]"
              >
                <span className="block truncate" title={customer.name}>
                  {customer.name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupedProducts?.map((group) => {
            return (
              <Fragment key={group.id}>
                {/* Group Header Row */}
                <tr className="bg-gray-200/70 dark:bg-zinc-700/50">
                  <td
                    colSpan={customers.length + 1}
                    className="border border-gray-300 dark:border-zinc-600 px-3 py-2 font-semibold text-gray-800 dark:text-white uppercase tracking-wide text-xs"
                  >
                    {group.icon || '📦'} {group.name}
                  </td>
                </tr>

                {/* Product Rows */}
                {group.products.map((product, productIndex) => (
                  <tr
                    key={product.id}
                    className={cn(
                      'hover:bg-gray-50 dark:hover:bg-zinc-800/50',
                      productIndex % 2 === 0
                        ? 'bg-white dark:bg-zinc-900'
                        : 'bg-gray-50/50 dark:bg-zinc-900/50'
                    )}
                  >
                    <td className="border border-gray-200 dark:border-zinc-700 px-3 py-2 font-medium text-gray-900 dark:text-white sticky left-0 bg-inherit z-10">
                      {product.name}
                    </td>
                    {customers.map((customer) => {
                      const key = `${customer.id}-${product.id}`;
                      const quantity = quantityMap.get(key);
                      return (
                        <td
                          key={customer.id}
                          className="border border-gray-200 dark:border-zinc-700 px-2 py-2 text-center text-gray-900 dark:text-zinc-100"
                        >
                          {quantity || ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
