'use client';

import { Fragment, useMemo } from 'react';
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
  // Calculate totals
  const { rowTotals, columnTotals, grandTotal } = useMemo(() => {
    const rowTotals = new Map<string, number>();
    const columnTotals = new Map<string, number>();
    let grandTotal = 0;

    // Calculate row totals (per product) and column totals (per customer)
    products.forEach((product) => {
      let productTotal = 0;
      customers.forEach((customer) => {
        const key = `${customer.id}-${product.id}`;
        const qty = quantityMap.get(key) || 0;
        productTotal += qty;
        columnTotals.set(customer.id, (columnTotals.get(customer.id) || 0) + qty);
      });
      rowTotals.set(product.id, productTotal);
      grandTotal += productTotal;
    });

    return { rowTotals, columnTotals, grandTotal };
  }, [products, customers, quantityMap]);

  if (transposed) {
    // Transposed: Customers as rows, Products as columns
    return (
      <div className="overflow-x-auto print:overflow-visible">
        <table className="border-collapse text-sm" style={{ tableLayout: 'auto' }}>
          <thead>
            <tr className="bg-gray-100 dark:bg-zinc-800">
              <th className="border border-gray-200 dark:border-zinc-700 px-3 py-2 text-left font-medium text-gray-700 dark:text-zinc-300 sticky left-0 bg-gray-100 dark:bg-zinc-800 z-10 w-[200px] min-w-[200px] max-w-[200px] align-bottom">
                <span className="vertical-text">Customer</span>
              </th>
              {products.map((product) => (
                <th
                  key={product.id}
                  className="border border-gray-200 dark:border-zinc-700 px-1 py-2 text-center font-medium text-gray-700 dark:text-zinc-300 w-[80px] min-w-[80px] align-bottom"
                >
                  <span className="vertical-text" title={product.name}>
                    {product.name}
                  </span>
                </th>
              ))}
              <th className="border border-gray-200 dark:border-zinc-700 px-2 py-2 text-center font-bold text-gray-700 dark:text-zinc-300 w-[80px] min-w-[80px] align-bottom bg-gray-200 dark:bg-zinc-700">
                <span className="vertical-text">Total</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, rowIndex) => {
              const customerTotal = columnTotals.get(customer.id) || 0;
              return (
                <tr
                  key={customer.id}
                  className={cn(
                    'hover:bg-gray-50 dark:hover:bg-zinc-800/50',
                    rowIndex % 2 === 0
                      ? 'bg-white dark:bg-zinc-900'
                      : 'bg-gray-50/50 dark:bg-zinc-900/50'
                  )}
                >
                  <td className="border border-gray-200 dark:border-zinc-700 px-3 py-2 font-medium text-gray-900 dark:text-white sticky left-0 bg-inherit z-10 w-[200px] min-w-[200px] max-w-[200px] truncate">
                    {customer.name}
                  </td>
                  {products.map((product) => {
                    const key = `${customer.id}-${product.id}`;
                    const quantity = quantityMap.get(key);
                    return (
                      <td
                        key={product.id}
                        className="border border-gray-200 dark:border-zinc-700 px-2 py-2 text-center text-gray-900 dark:text-zinc-100"
                      >
                        {quantity || ''}
                      </td>
                    );
                  })}
                  <td className="border border-gray-200 dark:border-zinc-700 px-2 py-2 text-center font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-zinc-800">
                    {customerTotal || ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 dark:bg-zinc-700 font-bold">
              <td className="border border-gray-300 dark:border-zinc-600 px-3 py-2 font-bold text-gray-900 dark:text-white sticky left-0 bg-gray-200 dark:bg-zinc-700 z-10 w-[200px] min-w-[200px] max-w-[200px]">
                Total
              </td>
              {products.map((product) => {
                const productTotal = rowTotals.get(product.id) || 0;
                return (
                  <td
                    key={product.id}
                    className="border border-gray-300 dark:border-zinc-600 px-2 py-2 text-center text-gray-900 dark:text-white"
                  >
                    {productTotal || ''}
                  </td>
                );
              })}
              <td className="border border-gray-300 dark:border-zinc-600 px-2 py-2 text-center font-bold text-gray-900 dark:text-white bg-gray-300 dark:bg-zinc-600">
                {grandTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  // Default: Products as rows (grouped), Customers as columns
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="border-collapse text-sm" style={{ tableLayout: 'auto' }}>
        <thead>
          <tr className="bg-gray-100 dark:bg-zinc-800">
            <th className="border border-gray-200 dark:border-zinc-700 px-3 py-2 text-left font-medium text-gray-700 dark:text-zinc-300 sticky left-0 bg-gray-100 dark:bg-zinc-800 z-10 w-[200px] min-w-[200px] max-w-[200px] align-bottom">
              <span className="vertical-text">Product</span>
            </th>
            {customers.map((customer) => (
              <th
                key={customer.id}
                className="border border-gray-200 dark:border-zinc-700 px-1 py-2 text-center font-medium text-gray-700 dark:text-zinc-300 w-[80px] min-w-[80px] align-bottom"
              >
                <span className="vertical-text" title={customer.name}>
                  {customer.name}
                </span>
              </th>
            ))}
            <th className="border border-gray-200 dark:border-zinc-700 px-2 py-2 text-center font-bold text-gray-700 dark:text-zinc-300 w-[80px] min-w-[80px] align-bottom bg-gray-200 dark:bg-zinc-700">
              <span className="vertical-text">Total</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {groupedProducts?.map((group) => {
            return (
              <Fragment key={group.id}>
                {/* Group Header Row */}
                <tr className="group-header bg-gray-200/70 dark:bg-zinc-700/50">
                  <td
                    colSpan={customers.length + 2}
                    className="border border-gray-300 dark:border-zinc-600 px-3 py-2 font-semibold text-gray-800 dark:text-white uppercase tracking-wide text-xs"
                  >
                    {group.icon || '📦'} {group.name}
                  </td>
                </tr>

                {/* Product Rows */}
                {group.products.map((product, productIndex) => {
                  const productTotal = rowTotals.get(product.id) || 0;
                  return (
                    <tr
                      key={product.id}
                      className={cn(
                        'hover:bg-gray-50 dark:hover:bg-zinc-800/50',
                        productIndex % 2 === 0
                          ? 'bg-white dark:bg-zinc-900'
                          : 'bg-gray-50/50 dark:bg-zinc-900/50'
                      )}
                    >
                      <td className="border border-gray-200 dark:border-zinc-700 px-3 py-2 font-medium text-gray-900 dark:text-white sticky left-0 bg-inherit z-10 w-[200px] min-w-[200px] max-w-[200px] truncate">
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
                      <td className="border border-gray-200 dark:border-zinc-700 px-2 py-2 text-center font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-zinc-800">
                        {productTotal || ''}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-200 dark:bg-zinc-700 font-bold">
            <td className="border border-gray-300 dark:border-zinc-600 px-3 py-2 font-bold text-gray-900 dark:text-white sticky left-0 bg-gray-200 dark:bg-zinc-700 z-10 w-[200px] min-w-[200px] max-w-[200px]">
              Total
            </td>
            {customers.map((customer) => {
              const customerTotal = columnTotals.get(customer.id) || 0;
              return (
                <td
                  key={customer.id}
                  className="border border-gray-300 dark:border-zinc-600 px-2 py-2 text-center text-gray-900 dark:text-white"
                >
                  {customerTotal || ''}
                </td>
              );
            })}
            <td className="border border-gray-300 dark:border-zinc-600 px-2 py-2 text-center font-bold text-gray-900 dark:text-white bg-gray-300 dark:bg-zinc-600">
              {grandTotal}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
