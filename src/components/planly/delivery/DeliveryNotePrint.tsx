'use client';

import { forwardRef } from 'react';

interface DeliveryNoteData {
  companyName: string;
  date: string;
  customerName: string;
  address: string;
  postcode: string;
  contact: string;
  products: { name: string; quantity: number }[];
}

interface DeliveryNotePrintProps {
  notes: DeliveryNoteData[];
}

export const DeliveryNotePrint = forwardRef<HTMLDivElement, DeliveryNotePrintProps>(
  ({ notes }, ref) => {
    // Group into sets of 4 for A4 printing
    const pages = [];
    for (let i = 0; i < notes.length; i += 4) {
      pages.push(notes.slice(i, i + 4));
    }

    return (
      <div ref={ref} className="print:block hidden">
        {pages.map((pageNotes, pageIndex) => (
          <div 
            key={pageIndex} 
            className="grid grid-cols-2 grid-rows-2 gap-0"
            style={{ pageBreakAfter: 'always' }}
          >
            {pageNotes.map((note, noteIndex) => (
              <div 
                key={noteIndex}
                className="border border-gray-300 p-4 flex flex-col delivery-note-print"
              >
                {/* Company Header */}
                <div className="text-lg font-bold mb-1">{note.companyName}</div>
                <div className="text-sm text-theme-secondary mb-4">Delivery Note</div>

                {/* Date & Customer */}
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-theme-secondary">Date:</span>
                  <span className="font-medium">{note.date}</span>
                </div>
                <div className="mb-4">
                  <div className="font-medium">{note.customerName}</div>
                  <div className="text-sm">{note.address}</div>
                  <div className="text-sm">{note.postcode}</div>
                  <div className="text-sm">Contact: {note.contact}</div>
                </div>

                {/* Products Table */}
                <table className="w-full text-sm flex-1">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Product</th>
                      <th className="text-right py-1">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {note.products.map((product, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="py-1">{product.name}</td>
                        <td className="text-right py-1">{product.quantity || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer */}
                <div className="text-center text-xs text-theme-tertiary mt-4">
                  THANK YOU FOR YOUR BUSINESS!
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
);

DeliveryNotePrint.displayName = 'DeliveryNotePrint';
