"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Edit, Mail, Archive, Package, DollarSign, Play } from '@/components/ui/icons';
import { useToast } from '@/components/ui/ToastProvider';
import { formatCustomerAddress } from '@/lib/stockly/customerHelpers';
import Link from 'next/link';

interface CustomerDetail {
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
  country?: string | null;
  delivery_notes?: string | null;
  payment_terms_days?: number | null;
  credit_limit?: number | null;
  minimum_order_value?: number | null;
  internal_notes?: string | null;
  status: 'pending' | 'active' | 'paused' | 'archived';
  portal_access_enabled: boolean;
  portal_invite_sent_at?: string | null;
  auth_user_id?: string | null;
  total_orders: number;
  orders_last_30_days: number;
  total_order_value: number;
  avg_order_value: number;
  last_order_date?: string | null;
  has_standing_order: boolean;
  has_custom_pricing: boolean;
  custom_pricing_count: number;
  recent_orders: Array<{
    id: string;
    order_number: string;
    delivery_date: string;
    total: number;
    status: string;
  }>;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const customerId = params.id as string;

  useEffect(() => {
    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stockly/customers/${customerId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customer');
      }

      setCustomer(data.data);
    } catch (error: any) {
      console.error('Error fetching customer:', error);
      showToast({
        title: 'Error',
        description: error.message || 'Failed to load customer',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvite = async () => {
    if (!customer) return;

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

      fetchCustomer();
    } catch (error: any) {
      showToast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        type: 'error',
      });
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const formatRelativeTime = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return formatDate(dateString);
    } catch {
      return '—';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-md text-sm font-medium border";
    switch (status) {
      case 'active':
        return `${baseClasses} bg-module-fg/10 text-emerald-500 border-module-fg/30`;
      case 'paused':
        return `${baseClasses} bg-amber-500/10 text-amber-500 border-amber-500/20`;
      case 'pending':
        return `${baseClasses} bg-blue-500/10 text-blue-500 border-blue-500/20`;
      case 'archived':
        return `${baseClasses} bg-theme-surface-elevated0/10 text-theme-tertiary border-gray-500/20`;
      default:
        return `${baseClasses} bg-white/10 text-theme-tertiary border-white/20`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-theme-tertiary">Loading customer details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-theme-tertiary">Customer not found</p>
            <Button
              onClick={() => router.push('/dashboard/stockly/production/customers')}
              className="mt-4 bg-transparent text-module-fg border border-emerald-500 hover:shadow-module-glow"
            >
              Back to Customers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/stockly/production/customers')}
              className="text-theme-tertiary hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Customers
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">{customer.business_name}</h1>
              <span className={getStatusBadge(customer.status)}>
                {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                router.push(`/dashboard/stockly/production/customers?edit=${customer.id}`);
              }}
              className="bg-transparent text-module-fg border-emerald-500 hover:shadow-module-glow"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Details
            </Button>
            {!customer.auth_user_id && customer.portal_invite_sent_at && (
              <Button
                variant="secondary"
                onClick={handleResendInvite}
                className="bg-transparent text-module-fg border-emerald-500 hover:shadow-module-glow"
              >
                <Mail className="w-4 h-4 mr-2" />
                Resend Invite
              </Button>
            )}
            {customer.status !== 'archived' ? (
              <Button
                variant="destructive"
                onClick={async () => {
                  if (confirm(`Are you sure you want to archive ${customer.business_name}? They will no longer be able to place orders, but all historical data will be preserved.`)) {
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

                      fetchCustomer();
                    } catch (error: any) {
                      showToast({
                        title: 'Error',
                        description: error.message || 'Failed to archive customer',
                        type: 'error',
                      });
                    }
                  }
                }}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/stockly/customers/${customer.id}/unarchive`, {
                      method: 'PATCH',
                    });

                    const data = await response.json();

                    if (!response.ok) {
                      throw new Error(data.error || 'Failed to unarchive customer');
                    }

                    showToast({
                      title: 'Customer unarchived',
                      type: 'success',
                    });

                    fetchCustomer();
                  } catch (error: any) {
                    showToast({
                      title: 'Error',
                      description: error.message || 'Failed to unarchive customer',
                      type: 'error',
                    });
                  }
                }}
                className="bg-transparent text-module-fg border-emerald-500 hover:shadow-module-glow"
              >
                <Play className="w-4 h-4 mr-2" />
                Unarchive
              </Button>
            )}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Business Information */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-module-fg mb-4">Business Information</h2>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-theme-tertiary mb-1">Business Name</div>
                  <div className="text-theme-primary">{customer.business_name}</div>
                </div>
                {customer.trading_name && (
                  <div>
                    <div className="text-xs text-theme-tertiary mb-1">Trading Name</div>
                    <div className="text-theme-primary">{customer.trading_name}</div>
                  </div>
                )}
                {customer.contact_name && (
                  <div>
                    <div className="text-xs text-theme-tertiary mb-1">Contact Name</div>
                    <div className="text-theme-primary">{customer.contact_name}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-theme-tertiary mb-1">Email</div>
                  <div className="text-theme-primary">{customer.email}</div>
                </div>
                {customer.phone && (
                  <div>
                    <div className="text-xs text-theme-tertiary mb-1">Phone</div>
                    <div className="text-theme-primary">{customer.phone}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-module-fg mb-4">Delivery Address</h2>
              <div className="space-y-3">
                <div className="text-theme-primary whitespace-pre-line">
                  {formatCustomerAddress(customer)}
                </div>
                {customer.delivery_notes && (
                  <div className="pt-3 border-t border-white/[0.06]">
                    <div className="text-xs text-theme-tertiary mb-1">Delivery Notes:</div>
                    <div className="text-theme-primary text-sm">{customer.delivery_notes}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Terms */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-module-fg mb-4">Payment Terms</h2>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-theme-tertiary mb-1">Payment Terms</div>
                  <div className="text-theme-primary">
                    {customer.payment_terms_days === 0
                      ? 'Prepaid'
                      : `Net ${customer.payment_terms_days} days`}
                  </div>
                </div>
                {customer.credit_limit && (
                  <div>
                    <div className="text-xs text-theme-tertiary mb-1">Credit Limit</div>
                    <div className="text-theme-primary">{formatCurrency(customer.credit_limit)}</div>
                  </div>
                )}
                {customer.minimum_order_value && (
                  <div>
                    <div className="text-xs text-theme-tertiary mb-1">Minimum Order Value</div>
                    <div className="text-theme-primary">{formatCurrency(customer.minimum_order_value)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Internal Notes */}
            {customer.internal_notes && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
                <h2 className="text-lg font-semibold text-module-fg mb-4">Internal Notes</h2>
                <div className="text-theme-primary text-sm whitespace-pre-line">{customer.internal_notes}</div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Portal Access */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-module-fg mb-4">Portal Access</h2>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-theme-tertiary mb-1">Portal Access</div>
                  <div>
                    {customer.portal_access_enabled ? (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-module-fg/10 text-emerald-500 border border-module-fg/30">
                        Enabled
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-theme-surface-elevated0/10 text-theme-tertiary border border-gray-500/20">
                        Disabled
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-theme-tertiary mb-1">Account Status</div>
                  <div>
                    {customer.auth_user_id ? (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-module-fg/10 text-emerald-500 border border-module-fg/30">
                        Activated
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        Pending Setup
                      </span>
                    )}
                  </div>
                </div>
                {!customer.auth_user_id && customer.portal_invite_sent_at && (
                  <div>
                    <div className="text-xs text-theme-tertiary mb-1">Invitation Sent</div>
                    <div className="text-theme-primary text-sm mb-2">
                      {formatRelativeTime(customer.portal_invite_sent_at)}
                    </div>
                    <Button
                      size="sm"
                      onClick={handleResendInvite}
                      className="bg-transparent text-module-fg border border-emerald-500 hover:shadow-module-glow text-xs"
                    >
                      Resend Invitation
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Order Statistics */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-module-fg mb-4">Order Statistics</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-theme-tertiary mb-1">Total Orders</div>
                  <div className="text-2xl font-bold text-module-fg">{customer.total_orders}</div>
                </div>
                <div>
                  <div className="text-xs text-theme-tertiary mb-1">Last 30 Days</div>
                  <div className="text-2xl font-bold text-module-fg">{customer.orders_last_30_days}</div>
                </div>
                <div>
                  <div className="text-xs text-theme-tertiary mb-1">Total Value</div>
                  <div className="text-xl font-bold text-theme-primary">{formatCurrency(customer.total_order_value)}</div>
                </div>
                <div>
                  <div className="text-xs text-theme-tertiary mb-1">Average Order</div>
                  <div className="text-xl font-bold text-theme-primary">{formatCurrency(customer.avg_order_value)}</div>
                </div>
              </div>
              <div className="space-y-2 pt-4 border-t border-white/[0.06]">
                <div>
                  <div className="text-xs text-theme-tertiary mb-1">Last Order</div>
                  <div className="text-theme-primary">
                    {customer.last_order_date ? formatDate(customer.last_order_date) : 'No orders yet'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-theme-tertiary mb-1">Standing Order</div>
                  <div>
                    {customer.has_standing_order ? (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-module-fg/10 text-emerald-500 border border-module-fg/30">
                        Yes
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-white/10 text-theme-tertiary border border-white/20">
                        No
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    // TODO: Navigate to orders page filtered by customer
                    router.push(`/dashboard/stockly/orders?customer=${customer.id}`);
                  }}
                  className="bg-transparent text-module-fg border-emerald-500 hover:shadow-module-glow"
                >
                  <Package className="w-4 h-4 mr-2" />
                  View All Orders
                </Button>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-module-fg">Recent Orders</h2>
                <Link
                  href={`/dashboard/stockly/orders?customer=${customer.id}`}
                  className="text-sm text-module-fg hover:text-module-fg"
                >
                  View All
                </Link>
              </div>
              {customer.recent_orders && customer.recent_orders.length > 0 ? (
                <div className="space-y-2">
                  {customer.recent_orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-0"
                    >
                      <div>
                        <div className="text-theme-primary font-medium">{order.order_number}</div>
                        <div className="text-xs text-theme-tertiary">{formatDate(order.delivery_date)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-theme-primary font-medium">{formatCurrency(order.total)}</div>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          order.status === 'delivered' ? 'bg-module-fg/10 text-emerald-500' :
                          order.status === 'confirmed' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-theme-tertiary">No orders yet</div>
              )}
            </div>

            {/* Custom Pricing */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-module-fg">Custom Pricing</h2>
                <Link
                  href={`/dashboard/stockly/production/customers/${customer.id}/pricing`}
                  className="text-sm text-module-fg hover:text-module-fg"
                >
                  Manage →
                </Link>
              </div>
              {customer.has_custom_pricing ? (
                <div>
                  <div className="text-xs text-theme-tertiary mb-1">Custom prices set</div>
                  <div className="text-theme-primary font-medium">{customer.custom_pricing_count} products</div>
                </div>
              ) : (
                <div className="text-center py-4 text-theme-tertiary">Using standard pricing</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

