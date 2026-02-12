'use client';

import React from 'react';
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

      {/* Two Column Layout */}
      <div className="flex-1 flex gap-2 min-h-0">
        {/* Left Column - Customer Info */}
        <div className="info-column w-[35%] flex flex-col text-[7pt] border-r border-gray-200 pr-2">
          {/* Date */}
          <div className="flex justify-between mb-1 pb-1 border-b border-gray-100">
            <span className="text-theme-tertiary">Date:</span>
            <span className="font-semibold">{formattedDate}</span>
          </div>

          {/* Customer Details */}
          <div className="customer-info flex-1">
            <div className="font-bold text-[8pt] mb-1">{note.customerName}</div>
            {note.address && <div className="text-theme-secondary leading-tight">{note.address}</div>}
            {note.postcode && <div className="text-theme-secondary font-medium mt-0.5">{note.postcode}</div>}
            {note.contact && (
              <div className="text-theme-tertiary mt-2 pt-1 border-t border-gray-100">
                <span className="text-theme-tertiary">Contact:</span><br />
                {note.contact}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="note-footer text-center text-[6pt] text-theme-tertiary mt-auto pt-1 border-t border-gray-200">
            THANK YOU!
          </div>
        </div>

        {/* Right Column - Products */}
        <div className="products-column w-[65%] flex flex-col min-h-0">
          <div className="products-table flex-1 overflow-hidden">
            <table className="w-full text-[7pt] border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-0.5 font-semibold">Product</th>
                  <th className="text-center py-0.5 font-semibold w-[10mm]">Qty</th>
                </tr>
              </thead>
              <tbody>
                {bakeGroups.map((group) => {
                  // Filter products based on showAllProducts setting
                  const productsToShow = showAllProducts
                    ? group.products
                    : group.products.filter(p => note.quantities[p.id]);

                  if (productsToShow.length === 0) return null;

                  return (
                    <React.Fragment key={group.id}>
                      {/* Category Header */}
                      <tr className="category-header">
                        <td colSpan={2} className="py-0.5 font-bold text-[6pt] bg-gray-100">
                          <span className="text-module-fg mr-1">●</span>
                          {group.name.toUpperCase()}
                        </td>
                      </tr>
                      {/* Products */}
                      {productsToShow.map((product, productIdx) => {
                        const quantity = note.quantities[product.id];
                        return (
                          <tr
                            key={product.id}
                            className={productIdx % 2 === 1 ? 'bg-theme-surface-elevated' : ''}
                          >
                            <td className="py-0.5 pr-1 truncate">
                              {product.name}
                            </td>
                            <td className="quantity-cell text-center border border-gray-300 py-0.5">
                              {quantity || ''}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
