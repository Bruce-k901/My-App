"use client";

import { useState } from 'react';
import { 
  Download, 
  Printer, 
  Eye,
  Loader2,
  Package
} from 'lucide-react';

interface OrderBookItem {
  productId: string;
  quantity: number;
}

interface Customer {
  id: string;
  businessName: string;
  deliveryTime: string;
  items: OrderBookItem[];
  totalItems: number;
  orderValue: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  totalQty: number;
  batchCount: number;
}

interface OrderBookData {
  date: string;
  customers: Customer[];
  products: Product[];
  grandTotal: {
    items: number;
    value: number;
  };
}

interface OrderBookGridProps {
  date: string;
  data?: OrderBookData;
  loading?: boolean;
}

export default function OrderBookGrid({ date, data, loading }: OrderBookGridProps) {
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  function getOrderItem(customer: Customer, productId: string): number | null {
    const item = customer.items.find(i => i.productId === productId);
    return item ? item.quantity : null;
  }

  function handleExportCSV() {
    if (!data) return;

    // Build CSV content
    const headers = ['Customer', 'Delivery Time', ...data.products.map(p => p.name), 'Total Items', 'Order Value'];
    const rows = data.customers.map(customer => {
      const values = [
        customer.businessName,
        customer.deliveryTime,
        ...data.products.map(p => {
          const qty = getOrderItem(customer, p.id);
          return qty !== null ? qty.toString() : '';
        }),
        customer.totalItems.toString(),
        customer.orderValue.toString()
      ];
      return values;
    });

    // Add totals row
    const totalsRow = [
      'TOTAL',
      '',
      ...data.products.map(p => {
        const batches = p.batchCount > 0 ? ` (${p.batchCount} batches)` : '';
        return `${p.totalQty}${batches}`;
      }),
      data.grandTotal.items.toString(),
      data.grandTotal.value.toString()
    ];
    rows.push(totalsRow);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-book-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#EC4899] animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || data.customers.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Order Book - {formatDate(date)}
        </h2>
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No orders scheduled for this date</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">
          Order Book - {formatDate(date)}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg transition-all duration-200 ease-in-out flex items-center gap-2 text-sm"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="sticky left-0 z-10 bg-[#0B0D13] px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider border-r border-white/[0.06]">
                Customer
              </th>
              {data.products.map((product) => (
                <th
                  key={product.id}
                  className="px-4 py-3 text-center text-xs font-medium text-white/60 uppercase tracking-wider min-w-[100px]"
                >
                  <div className="flex flex-col">
                    <span>{product.name}</span>
                    <span className="text-white/40 text-[10px] mt-1">{product.unit}</span>
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-white/60 uppercase tracking-wider">
                Total
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {data.customers.map((customer) => {
              const isExpanded = expandedCustomer === customer.id;
              
              return (
                <tr
                  key={customer.id}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="sticky left-0 z-10 bg-[#0B0D13] px-4 py-3 border-r border-white/[0.06]">
                    <button
                      onClick={() => setExpandedCustomer(isExpanded ? null : customer.id)}
                      className="text-left group"
                    >
                      <div className="text-white font-medium group-hover:text-[#EC4899] transition-colors">
                        {customer.businessName}
                      </div>
                      <div className="text-white/40 text-xs mt-1">
                        {customer.deliveryTime}
                      </div>
                    </button>
                  </td>
                  {data.products.map((product) => {
                    const quantity = getOrderItem(customer, product.id);
                    return (
                      <td
                        key={product.id}
                        className={`px-4 py-3 text-center ${
                          quantity !== null ? 'text-white font-medium' : 'text-white/20'
                        }`}
                      >
                        {quantity !== null ? quantity : '-'}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-white font-medium">
                    {customer.totalItems}
                  </td>
                  <td className="px-4 py-3 text-right text-white font-medium">
                    {formatCurrency(customer.orderValue)}
                  </td>
                </tr>
              );
            })}
            
            {/* Totals Row */}
            <tr className="bg-white/[0.05] border-t-2 border-white/[0.1] font-semibold">
              <td className="sticky left-0 z-10 bg-white/[0.05] px-4 py-3 text-white font-bold border-r border-white/[0.06]">
                TOTAL
              </td>
              {data.products.map((product) => (
                <td key={product.id} className="px-4 py-3 text-center text-white">
                  <div className="flex flex-col items-center">
                    <span>{product.totalQty}</span>
                    {product.batchCount > 0 && (
                      <span className="text-white/60 text-xs mt-1">
                        ({product.batchCount} {product.batchCount === 1 ? 'batch' : 'batches'})
                      </span>
                    )}
                  </div>
                </td>
              ))}
              <td className="px-4 py-3 text-center text-white font-bold">
                {data.grandTotal.items}
              </td>
              <td className="px-4 py-3 text-right text-white font-bold">
                {formatCurrency(data.grandTotal.value)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

