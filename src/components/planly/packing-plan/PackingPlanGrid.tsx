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
            <tr className="bg-theme-muted">
              <th className="border border-theme px-3 py-2 text-left font-medium text-theme-secondary sticky left-0 bg-theme-muted z-10 w-[200px] min-w-[200px] max-w-[200px] align-bottom">
                <span className="vertical-text">Customer</span>
              </th>
              {products.map((product) => (
                <th
                  key={product.id}
                  className="border border-theme px-1 py-2 text-center font-medium text-theme-secondary w-[80px] min-w-[80px] align-bottom"
                >
                  <span className="vertical-text" title={product.name}>
                    {product.name}
                  </span>
                </th>
              ))}
              <th className="border border-theme px-2 py-2 text-center font-bold text-theme-secondary w-[80px] min-w-[80px] align-bottom bg-theme-muted-strong">
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
                    'hover:bg-theme-hover',
                    rowIndex % 2 === 0
                      ? 'bg-theme-surface'
                      : 'bg-theme-surface'
                  )}
                >
                  <td className="border border-theme px-3 py-2 font-medium text-theme-primary sticky left-0 bg-inherit z-10 w-[200px] min-w-[200px] max-w-[200px] truncate">
                    {customer.name}
                  </td>
                  {products.map((product) => {
                    const key = `${customer.id}-${product.id}`;
                    const quantity = quantityMap.get(key);
                    return (
                      <td
                        key={product.id}
                        className="border border-theme px-2 py-2 text-center text-theme-primary"
                      >
                        {quantity || ''}
                      </td>
                    );
                  })}
                  <td className="border border-theme px-2 py-2 text-center font-bold text-theme-primary bg-theme-muted">
                    {customerTotal || ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-theme-muted-strong font-bold">
              <td className="border border-theme px-3 py-2 font-bold text-theme-primary sticky left-0 bg-theme-muted-strong z-10 w-[200px] min-w-[200px] max-w-[200px]">
                Total
              </td>
              {products.map((product) => {
                const productTotal = rowTotals.get(product.id) || 0;
                return (
                  <td
                    key={product.id}
                    className="border border-theme px-2 py-2 text-center text-theme-primary"
                  >
                    {productTotal || ''}
                  </td>
                );
              })}
              <td className="border border-theme px-2 py-2 text-center font-bold text-theme-primary bg-theme-muted-strong">
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
          <tr className="bg-theme-muted">
            <th className="border border-theme px-3 py-2 text-left font-medium text-theme-secondary sticky left-0 bg-theme-muted z-10 w-[200px] min-w-[200px] max-w-[200px] align-bottom">
              <span className="vertical-text">Product</span>
            </th>
            {customers.map((customer) => (
              <th
                key={customer.id}
                className="border border-theme px-1 py-2 text-center font-medium text-theme-secondary w-[80px] min-w-[80px] align-bottom"
              >
                <span className="vertical-text" title={customer.name}>
                  {customer.name}
                </span>
              </th>
            ))}
            <th className="border border-theme px-2 py-2 text-center font-bold text-theme-secondary w-[80px] min-w-[80px] align-bottom bg-theme-muted-strong">
              <span className="vertical-text">Total</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {groupedProducts?.map((group) => {
            const showGroupHeader = groupedProducts.length > 1;
            return (
              <Fragment key={group.id}>
                {/* Group Header Row - only show if multiple groups */}
                {showGroupHeader && (
                  <tr className="group-header bg-theme-muted">
                    <td
                      colSpan={customers.length + 2}
                      className="border border-theme px-3 py-2 font-semibold text-theme-primary uppercase tracking-wide text-xs"
                    >
                      {group.icon || '📦'} {group.name}
                    </td>
                  </tr>
                )}

                {/* Product Rows */}
                {group.products.map((product, productIndex) => {
                  const productTotal = rowTotals.get(product.id) || 0;
                  return (
                    <tr
                      key={product.id}
                      className={cn(
                        'hover:bg-theme-hover',
                        productIndex % 2 === 0
                          ? 'bg-theme-surface'
                          : 'bg-theme-surface'
                      )}
                    >
                      <td className="border border-theme px-3 py-2 font-medium text-theme-primary sticky left-0 bg-inherit z-10 w-[200px] min-w-[200px] max-w-[200px] truncate">
                        {product.name}
                      </td>
                      {customers.map((customer) => {
                        const key = `${customer.id}-${product.id}`;
                        const quantity = quantityMap.get(key);
                        return (
                          <td
                            key={customer.id}
                            className="border border-theme px-2 py-2 text-center text-theme-primary"
                          >
                            {quantity || ''}
                          </td>
                        );
                      })}
                      <td className="border border-theme px-2 py-2 text-center font-bold text-theme-primary bg-theme-muted">
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
          <tr className="bg-theme-muted-strong font-bold">
            <td className="border border-theme px-3 py-2 font-bold text-theme-primary sticky left-0 bg-theme-muted-strong z-10 w-[200px] min-w-[200px] max-w-[200px]">
              Total
            </td>
            {customers.map((customer) => {
              const customerTotal = columnTotals.get(customer.id) || 0;
              return (
                <td
                  key={customer.id}
                  className="border border-theme px-2 py-2 text-center text-theme-primary"
                >
                  {customerTotal || ''}
                </td>
              );
            })}
            <td className="border border-theme px-2 py-2 text-center font-bold text-theme-primary bg-theme-muted-strong">
              {grandTotal}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
