'use client';

import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { BakeGroupWithProducts, DeliveryNoteData } from '@/hooks/planly/useDeliveryNotes';

interface DeliveryNoteProps {
  note: DeliveryNoteData;
  bakeGroups: BakeGroupWithProducts[];
  companyName: string;
  companyLogo: string | null;
  date: string;
  showAllProducts?: boolean;
}

type ProductRow =
  | { type: 'category'; name: string; key: string }
  | { type: 'product'; name: string; quantity: number | undefined; key: string };

const ITEMS_PER_COLUMN = 10;

function ProductColumn({ rows }: { rows: ProductRow[] }) {
  return (
    <table className="w-full text-[6.5pt] border-collapse table-fixed">
      <thead>
        <tr className="border-b border-gray-300">
          <th className="text-left py-0.5 font-semibold">Product</th>
          <th className="text-center py-0.5 font-semibold w-[10mm]">Qty</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) =>
          row.type === 'category' ? (
            <tr key={row.key} className="category-header">
              <td colSpan={2} className="py-0.5 font-bold text-[6pt] bg-gray-100">
                <span className="text-module-fg mr-1">●</span>
                {row.name}
              </td>
            </tr>
          ) : (
            <tr key={row.key} className={idx % 2 === 1 ? 'bg-theme-surface-elevated' : ''}>
              <td className="py-0.5 pr-1 break-words">{row.name}</td>
              <td className="quantity-cell text-center border border-gray-300 py-0.5">
                {row.quantity || ''}
              </td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}

export function DeliveryNote({
  note,
  bakeGroups,
  companyName,
  companyLogo,
  date,
  showAllProducts = true,
}: DeliveryNoteProps) {
  // Format date as DD-MMM-YY
  const formattedDate = (() => {
    try {
      return format(parseISO(date), 'dd-MMM-yy');
    } catch {
      return date;
    }
  })();

  // Flatten all products into a single list of rows (categories + products)
  const allRows = useMemo(() => {
    const rows: ProductRow[] = [];
    for (const group of bakeGroups) {
      const productsToShow = showAllProducts
        ? group.products
        : group.products.filter(p => note.quantities[p.id]);
      if (productsToShow.length === 0) continue;
      rows.push({ type: 'category', name: group.name.toUpperCase(), key: `cat-${group.id}` });
      for (const product of productsToShow) {
        rows.push({
          type: 'product',
          name: product.name,
          quantity: note.quantities[product.id],
          key: `prod-${product.id}`,
        });
      }
    }
    return rows;
  }, [bakeGroups, note.quantities, showAllProducts]);

  const col1Rows = allRows.slice(0, ITEMS_PER_COLUMN);
  const col2Rows = allRows.slice(ITEMS_PER_COLUMN);

  return (
    <div className="delivery-note bg-white text-theme-primary flex flex-col h-full">
      {/* Header - spans full width */}
      <div className="delivery-note-header flex justify-between items-center border-b border-gray-300 pb-1 mb-1">
        <div className="flex items-center gap-2">
          {companyLogo && (
            <img
              src={companyLogo}
              alt={companyName}
              className="company-logo max-h-[10mm] max-w-[20mm] object-contain"
            />
          )}
          <div className="font-bold text-xs">{companyName}</div>
        </div>
        <div className="text-xs text-theme-tertiary font-medium">DELIVERY NOTE</div>
      </div>

      {/* Three Column Layout */}
      <div className="flex-1 flex gap-1 min-h-0">
        {/* Column 1 - Customer Info */}
        <div className="info-column w-[22%] flex flex-col text-[7pt] border-r border-gray-200 pr-1">
          {/* Date */}
          <div className="mb-1 pb-1 border-b border-gray-100">
            <div className="text-theme-tertiary text-[6pt]">Date</div>
            <div className="font-semibold">{formattedDate}</div>
          </div>

          {/* Customer Details */}
          <div className="customer-info flex-1">
            <div className="font-bold text-[7pt] mb-0.5 leading-tight">{note.customerName}</div>
            {note.address && <div className="text-theme-secondary text-[6pt] leading-tight">{note.address}</div>}
            {note.postcode && <div className="text-theme-secondary text-[6pt] font-medium mt-0.5">{note.postcode}</div>}
            {note.contact && (
              <div className="text-theme-tertiary text-[6pt] mt-1 pt-1 border-t border-gray-100 leading-tight">
                {note.contact}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="note-footer text-center text-[5pt] text-theme-tertiary mt-auto pt-1 border-t border-gray-200">
            THANK YOU!
          </div>
        </div>

        {/* Column 2 - Products (first 10) */}
        <div className="products-column w-[39%] flex flex-col min-h-0 border-r border-gray-200 pr-1">
          <div className="products-table flex-1 overflow-hidden">
            <ProductColumn rows={col1Rows} />
          </div>
        </div>

        {/* Column 3 - Products (next 10) */}
        <div className="products-column w-[39%] flex flex-col min-h-0">
          <div className="products-table flex-1 overflow-hidden">
            {col2Rows.length > 0 ? (
              <ProductColumn rows={col2Rows} />
            ) : (
              <div className="text-[6pt] text-theme-tertiary italic pt-1">No more items</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
