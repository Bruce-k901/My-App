"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus, Upload } from '@/components/ui/icons';
import CustomerTable from '@/components/stockly/customers/CustomerTable';
import CustomerFilters from '@/components/stockly/customers/CustomerFilters';
import CustomerFormModal from '@/components/stockly/customers/CustomerFormModal';
import { useToast } from '@/components/ui/ToastProvider';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface Customer {
  id: string;
  business_name: string;
  trading_name?: string | null;
  contact_name?: string | null;
  email: string;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postcode?: string | null;
  status: 'pending' | 'active' | 'paused' | 'archived';
  portal_access_enabled: boolean;
  portal_invite_sent_at?: string | null;
  auth_user_id?: string | null;
  orders_last_30_days: number;
  last_order_date?: string | null;
  has_standing_order: boolean;
}

export default function CustomersPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [supplierMessage, setSupplierMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Fetch customers
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (sortBy) params.append('sortBy', sortBy);

      const response = await fetch(`/api/stockly/customers?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customers');
      }

      // Transform the data to match our Customer interface
      const transformedCustomers = (data.data || []).map((customer: any) => ({
        ...customer,
        orders_last_30_days: customer.orders_last_30_days || 0,
        has_standing_order: customer.has_standing_order || false,
      }));

      console.log('[CustomersPage] Fetched customers:', transformedCustomers.length);
      setCustomers(transformedCustomers);
      setSupplierMessage(null); // Clear any previous messages
    } catch (error: any) {
      console.error('[CustomersPage] Error fetching customers:', error);
      showToast({
        title: 'Error',
        description: error.message || 'Failed to load customers',
        type: 'error',
      });
      // Set empty array on error so page still renders
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery, statusFilter, sortBy]);

  // Debug: Track modal state changes
  useEffect(() => {
    console.log('[CustomersPage] isModalOpen changed to:', isModalOpen);
  }, [isModalOpen]);

  // Handle edit query parameter
  useEffect(() => {
    if (customers.length === 0) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    if (editId) {
      const customerToEdit = customers.find((c) => c.id === editId);
      if (customerToEdit) {
        handleEditCustomer(customerToEdit);
        // Clean up URL
        window.history.replaceState({}, '', '/dashboard/stockly/production/customers');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers]);

  // Calculate stats
  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.status === 'active').length,
    pendingInvites: customers.filter(
      (c) => c.status === 'pending' && !c.auth_user_id
    ).length,
  };

  const handleAddCustomer = () => {
    console.log('[CustomersPage] Add customer button clicked');
    setEditingCustomer(null);
    setIsModalOpen(true);
    console.log('[CustomersPage] Modal state set to open:', true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    router.push(`/dashboard/stockly/production/customers/${customer.id}`);
  };

  const handlePauseCustomer = (customer: Customer) => {
    setConfirmDialog({
      open: true,
      title: 'Pause Customer',
      description: `Are you sure you want to pause ${customer.business_name}? This is a cosmetic label only - they will maintain full portal access.`,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/stockly/customers/${customer.id}/pause`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to pause customer');
          }

          showToast({
            title: 'Customer paused',
            type: 'success',
          });

          setConfirmDialog({ ...confirmDialog, open: false });
          fetchCustomers();
        } catch (error: any) {
          showToast({
            title: 'Error',
            description: error.message || 'Failed to pause customer',
            type: 'error',
          });
        }
      },
    });
  };

  const handleActivateCustomer = async (customer: Customer) => {
    try {
      // If archived, use unarchive endpoint, otherwise just update status
      const endpoint = customer.status === 'archived'
        ? `/api/stockly/customers/${customer.id}/unarchive`
        : `/api/stockly/customers/${customer.id}`;
      
      const body = customer.status === 'archived'
        ? {}
        : { status: 'active' };

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate customer');
      }

      showToast({
        title: customer.status === 'archived' ? 'Customer unarchived' : 'Customer activated',
        type: 'success',
      });

      fetchCustomers();
    } catch (error: any) {
      showToast({
        title: 'Error',
        description: error.message || 'Failed to activate customer',
        type: 'error',
      });
    }
  };

  const handleArchiveCustomer = (customer: Customer) => {
    setConfirmDialog({
      open: true,
      title: 'Archive Customer',
      description: `Are you sure you want to archive ${customer.business_name}? They will no longer be able to place orders, but all historical data will be preserved.`,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/stockly/customers/${customer.id}/archive`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to archive customer');
          }

          showToast({
            title: 'Customer archived',
            type: 'success',
          });

          setConfirmDialog({ ...confirmDialog, open: false });
          fetchCustomers();
        } catch (error: any) {
          showToast({
            title: 'Error',
            description: error.message || 'Failed to archive customer',
            type: 'error',
          });
        }
      },
    });
  };

  const handleResendInvite = async (customer: Customer) => {
    try {
      const response = await fetch(`/api/stockly/customers/${customer.id}/send-invite`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      showToast({
        title: 'Invitation sent',
        description: 'Portal invitation email has been sent',
        type: 'success',
      });

      fetchCustomers();
    } catch (error: any) {
      showToast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        type: 'error',
      });
    }
  };

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading customers...</p>
        </div>
      </div>
    );
  }

  // Show helpful message if no supplier record exists or no customers
  if (!loading && customers.length === 0) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Wholesale Customers</h1>
            <p className="text-white/50 text-sm mt-1">
              Manage cafes and restaurants ordering from you
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                showToast({
                  title: 'Coming soon',
                  description: 'CSV import functionality will be available soon',
                  type: 'info',
                });
              }}
              className="bg-transparent text-emerald-400 border-emerald-500 hover:shadow-[0_0_12px_rgba(16,185,129,0.7)]"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button
              onClick={handleAddCustomer}
              className="bg-transparent text-emerald-400 border border-emerald-500 hover:shadow-[0_0_12px_rgba(16,185,129,0.7)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Filters - Show even when empty */}
        {!supplierMessage && (
          <CustomerFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            stats={stats}
          />
        )}

        {/* Empty State */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {supplierMessage ? 'Supplier Setup Required' : 'No customers yet'}
            </h3>
            <p className="text-white/60 text-sm mb-6">
              {supplierMessage 
                ? supplierMessage + ' Once your supplier profile is set up, you can start adding customers.'
                : "Add your first wholesale customer to start taking orders. When you add a customer, they'll automatically receive a portal invitation email."}
            </p>
            {!supplierMessage && (
              <Button
                onClick={handleAddCustomer}
                className="bg-transparent text-emerald-400 border border-emerald-500 hover:shadow-[0_0_12px_rgba(16,185,129,0.7)]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Customer
              </Button>
            )}
          </div>
        </div>

        {/* Add/Edit Modal - Must be included in empty state too! */}
        {console.log('[CustomersPage] Empty state render - isModalOpen:', isModalOpen, 'editingCustomer:', editingCustomer?.id || 'null')}
        <CustomerFormModal
          key={`modal-${isModalOpen ? 'open' : 'closed'}-${editingCustomer?.id || 'new'}`}
          open={isModalOpen}
          onClose={() => {
            console.log('[CustomersPage] Closing modal');
            setIsModalOpen(false);
            setEditingCustomer(null);
          }}
          onSaved={() => {
            fetchCustomers();
            setIsModalOpen(false);
            setEditingCustomer(null);
          }}
          customer={editingCustomer}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Wholesale Customers</h1>
          <p className="text-white/50 text-sm mt-1">
            Manage cafes and restaurants ordering from you
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              // TODO: Implement CSV import
              showToast({
                title: 'Coming soon',
                description: 'CSV import functionality will be available soon',
                type: 'info',
              });
            }}
            className="bg-transparent text-emerald-400 border-emerald-500 hover:shadow-[0_0_12px_rgba(16,185,129,0.7)]"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button
            onClick={handleAddCustomer}
            className="bg-transparent text-emerald-400 border border-emerald-500 hover:shadow-[0_0_12px_rgba(16,185,129,0.7)]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <CustomerFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        stats={stats}
      />

      {/* Customer Table */}
      <CustomerTable
        customers={customers}
        onEdit={handleEditCustomer}
        onView={handleViewCustomer}
        onPause={handlePauseCustomer}
        onActivate={handleActivateCustomer}
        onArchive={handleArchiveCustomer}
        onResendInvite={handleResendInvite}
        loading={loading}
      />

      {/* Add/Edit Modal - Always render, control via open prop */}
      {console.log('[CustomersPage] Render - isModalOpen:', isModalOpen, 'editingCustomer:', editingCustomer?.id || 'null')}
      <CustomerFormModal
        key={`modal-${isModalOpen ? 'open' : 'closed'}-${editingCustomer?.id || 'new'}`}
        open={isModalOpen}
        onClose={() => {
          console.log('[CustomersPage] Closing modal');
          setIsModalOpen(false);
          setEditingCustomer(null);
        }}
        onSaved={() => {
          fetchCustomers();
          setIsModalOpen(false);
          setEditingCustomer(null);
        }}
        customer={editingCustomer}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant="default"
      />
    </div>
  );
}
