"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Calendar, 
  Filter, 
  Eye, 
  Edit2, 
  FileText,
  Loader2,
  Package,
  ArrowLeft
} from 'lucide-react';

interface PurchaseOrder {
  id: string;
  order_number: string;
  order_date: string;
  expected_delivery: string | null;
  status: string;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  supplier: {
    id: string;
    name: string;
  };
}

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending Approval', value: 'pending_approval' },
  { label: 'Approved', value: 'approved' },
  { label: 'Sent', value: 'sent' },
  { label: 'Acknowledged', value: 'acknowledged' },
  { label: 'Partially Received', value: 'partial_received' },
  { label: 'Received', value: 'received' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { companyId } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (companyId) {
      loadOrders();
    }
  }, [companyId, statusFilter]);

  async function loadOrders() {
    if (!companyId) return;
    setLoading(true);
    
    try {
      // Load orders and suppliers separately since suppliers are in stockly schema
      let query = supabase
        .from('purchase_orders')
        .select(`
          id,
          order_number,
          order_date,
          expected_delivery,
          status,
          subtotal,
          tax,
          total,
          supplier_id
        `)
        .eq('company_id', companyId)
        .order('order_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading orders:', error);
        return;
      }

      // Load suppliers separately
      const supplierIds = [...new Set((data || []).map((o: any) => o.supplier_id).filter(Boolean))];
      const suppliersMap = new Map<string, { id: string; name: string }>();
      
      if (supplierIds.length > 0) {
        const { data: suppliersData } = await supabase
          .from('suppliers')
          .select('id, name')
          .in('id', supplierIds);
        
        if (suppliersData) {
          suppliersData.forEach(s => {
            suppliersMap.set(s.id, { id: s.id, name: s.name });
          });
        }
      }

      // Transform the data to match our interface
      const transformedOrders = (data || []).map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        order_date: order.order_date,
        expected_delivery: order.expected_delivery,
        status: order.status,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        supplier: suppliersMap.get(order.supplier_id) || { id: order.supplier_id || '', name: 'Unknown Supplier' }
      }));

      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500/20 text-gray-400';
      case 'pending_approval':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'approved':
        return 'bg-blue-500/20 text-blue-400';
      case 'sent':
        return 'bg-purple-500/20 text-purple-400';
      case 'acknowledged':
        return 'bg-indigo-500/20 text-indigo-400';
      case 'partial_received':
        return 'bg-orange-500/20 text-orange-400';
      case 'received':
        return 'bg-green-500/20 text-green-400';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#EC4899] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/stockly"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Purchase Orders</h1>
            <p className="text-white/60 text-sm mt-1">
              Manage your supplier orders
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/stockly/orders/new"
          className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg transition-all duration-200 ease-in-out"
        >
          <Plus className="w-5 h-5" />
          New Order
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order number or supplier..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#EC4899]"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#EC4899]"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
          <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">No purchase orders found</h3>
          <p className="text-white/60 text-sm mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your filters'
              : 'Create your first purchase order to get started'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <Link
              href="/dashboard/stockly/orders/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg transition-all duration-200 ease-in-out"
            >
              <Plus className="w-4 h-4" />
              Create Order
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/[0.02] border-b border-white/[0.06]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Order Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Order Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Expected Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-white font-medium">{order.order_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-white">{order.supplier.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-white/80">{formatDate(order.order_date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-white/80">
                        {order.expected_delivery ? formatDate(order.expected_delivery) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-white font-medium">
                        £{order.total?.toFixed(2) || '0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/dashboard/stockly/orders/${order.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-[#EC4899] hover:text-[#EC4899]/80 hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

