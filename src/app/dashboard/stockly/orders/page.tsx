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
  ArrowLeft,
  Trash2,
  AlertTriangle
} from '@/components/ui/icons';

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

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
 return'bg-gray-50 dark:bg-theme-surface-elevated0/20 text-theme-secondary border border-gray-200 dark:border-gray-500/30';
      case 'pending_approval':
        return 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30';
      case 'approved':
        return 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30';
      case 'sent':
        return 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30';
      case 'acknowledged':
        return 'bg-indigo-50 dark:bg-module-fg/20 text-module-fg border border-indigo-200 dark:border-module-fg/30';
      case 'partial_received':
        return 'bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30';
      case 'received':
        return 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30';
      case 'cancelled':
        return 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30';
      default:
 return'bg-gray-50 dark:bg-theme-surface-elevated0/20 text-theme-secondary border border-gray-200 dark:border-gray-500/30';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleDeleteClick = (order: PurchaseOrder) => {
    setOrderToDelete(order);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    setDeleting(true);
    try {
      // First delete the order lines
      const { error: linesError } = await supabase
        .from('purchase_order_lines')
        .delete()
        .eq('purchase_order_id', orderToDelete.id);

      if (linesError) {
        console.error('Error deleting order lines:', linesError);
        alert('Failed to delete order lines');
        return;
      }

      // Then delete the order itself
      const { error: orderError } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', orderToDelete.id);

      if (orderError) {
        console.error('Error deleting order:', orderError);
        alert('Failed to delete order');
        return;
      }

      // Update local state
      setOrders(orders.filter(o => o.id !== orderToDelete.id));
      setDeleteModalOpen(false);
      setOrderToDelete(null);
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-module-fg animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full bg-theme-surface-elevated min-h-screen">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/stockly"
 className="p-2 rounded-lg bg-theme-surface ] hover:bg-theme-muted border border-theme text-theme-secondary hover:text-theme-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-theme-primary mb-2 flex items-center gap-3">
                <FileText className="w-8 h-8 text-module-fg" />
                Purchase Orders
              </h1>
              <p className="text-theme-secondary text-sm mt-1">
                Manage your supplier orders
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/stockly/orders/new"
            className="flex items-center gap-2 px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow rounded-lg transition-all duration-200 ease-in-out"
          >
            <Plus className="w-5 h-5" />
            New Order
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-theme-surface border border-theme rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <label htmlFor="order-search" className="sr-only">Search orders</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-tertiary" />
              <input
                id="order-search"
                name="order_search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by order number or supplier..."
 className="w-full pl-10 pr-4 py-2 bg-theme-surface ] border border-theme rounded-lg text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
              />
            </div>
            <div className="sm:w-48">
              <label htmlFor="status-filter" className="sr-only">Filter by status</label>
              <select
                id="status-filter"
                name="status_filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
 className="w-full px-4 py-2 bg-theme-surface ] border border-theme rounded-lg text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500"
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
          <div className="bg-theme-surface border border-theme rounded-xl p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-4" />
            <h3 className="text-theme-primary font-medium mb-2">No purchase orders found</h3>
            <p className="text-theme-secondary text-sm mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Create your first purchase order to get started'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link
                href="/dashboard/stockly/orders/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow rounded-lg transition-all duration-200 ease-in-out"
              >
                <Plus className="w-4 h-4" />
                Create Order
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-theme-button border-b border-theme">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">
                      Order Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">
                      Order Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">
                      Expected Delivery
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-theme-secondary/60 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-theme-surface-elevated dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-theme-primary font-medium">{order.order_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-theme-primary">{order.supplier.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-theme-secondary">{formatDate(order.order_date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-theme-secondary">
                          {order.expected_delivery ? formatDate(order.expected_delivery) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-theme-primary font-medium">
                          £{order.total?.toFixed(2) || '0.00'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/stockly/orders/${order.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-module-fg hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(order)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && orderToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-[#1a1d24] border border-theme rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-theme-primary">
                  Delete Purchase Order
                </h3>
              </div>
              <p className="text-theme-secondary mb-6">
                Are you sure you want to delete order <span className="font-medium text-theme-primary">{orderToDelete.order_number}</span>?
                This will also delete all order lines. This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setOrderToDelete(null);
                  }}
                  disabled={deleting}
                  className="px-4 py-2 text-theme-secondary hover:text-theme-primary hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

