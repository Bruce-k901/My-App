"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { MoreVertical, Eye, Edit, Package, DollarSign, Pause, Play, Archive, Mail } from '@/components/ui/icons';
import { formatCustomerAddress } from '@/lib/stockly/customerHelpers';
import Link from 'next/link';

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

interface CustomerTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onView: (customer: Customer) => void;
  onPause: (customer: Customer) => void;
  onActivate: (customer: Customer) => void;
  onArchive: (customer: Customer) => void;
  onResendInvite: (customer: Customer) => void;
  loading?: boolean;
}

export default function CustomerTable({
  customers,
  onEdit,
  onView,
  onPause,
  onActivate,
  onArchive,
  onResendInvite,
  loading = false,
}: CustomerTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-md text-xs font-medium border";
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

  const getPortalStatus = (customer: Customer) => {
    if (customer.auth_user_id) {
      return (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-sm text-module-fg">Active</span>
        </div>
      );
    } else if (customer.portal_invite_sent_at) {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-sm text-amber-400">Invited</span>
          </div>
          <button
            onClick={() => onResendInvite(customer)}
            className="text-xs text-module-fg hover:text-emerald-300 underline"
          >
            Resend
          </button>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-theme-surface-elevated0"></span>
          <span className="text-sm text-theme-tertiary">Not invited</span>
        </div>
      );
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

  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
        <div className="text-theme-tertiary">Loading customers...</div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
        <div className="text-theme-primary font-medium mb-2">No customers found</div>
        <div className="text-theme-tertiary text-sm">
          {customers.length === 0
            ? 'Add your first wholesale customer to start taking orders'
            : 'Try adjusting your filters'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white/[0.05] border-b border-white/[0.06]">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-module-fg">Customer</th>
              <th className="text-left px-4 py-3 font-semibold text-module-fg">Portal Access</th>
              <th className="text-left px-4 py-3 font-semibold text-module-fg">Orders (30d)</th>
              <th className="text-left px-4 py-3 font-semibold text-module-fg">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-module-fg">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="hover:bg-white/[0.02] transition-colors"
              >
                {/* Customer Info */}
                <td className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-module-fg/10 border border-module-fg/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-module-fg font-semibold text-sm">
                        {customer.business_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-theme-primary">{customer.business_name}</div>
                      {customer.contact_name && (
                        <div className="text-sm text-theme-tertiary mt-0.5">
                          {customer.contact_name}
                          {customer.email && (
                            <>
                              <span className="mx-1">•</span>
                              <span className="text-theme-tertiary">{customer.email}</span>
                            </>
                          )}
                        </div>
                      )}
                      {customer.postcode && (
                        <div className="text-xs text-theme-tertiary mt-1">
                          {customer.postcode}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Portal Access */}
                <td className="px-4 py-4">
                  {getPortalStatus(customer)}
                </td>

                {/* Orders */}
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="text-theme-primary font-medium">
                      {customer.orders_last_30_days || 0}
                    </div>
                    {customer.last_order_date && (
                      <div className="text-xs text-theme-tertiary">
                        Last: {formatDate(customer.last_order_date)}
                      </div>
                    )}
                    {customer.has_standing_order && (
                      <div className="flex items-center gap-1 text-xs text-module-fg mt-1">
                        <span>🔄</span>
                        <span>Standing Order</span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-4">
                  <span className={getStatusBadge(customer.status)}>
                    {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === customer.id ? null : customer.id)}
                        className="p-2 rounded-md hover:bg-white/[0.08] transition-colors"
                        aria-label="Actions"
                      >
                        <MoreVertical className="w-4 h-4 text-theme-tertiary" />
                      </button>

                      {openMenuId === customer.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 mt-1 w-48 bg-[#14161c] border border-white/[0.1] rounded-lg shadow-lg z-20 py-1">
                            <button
                              onClick={() => {
                                onView(customer);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-theme-primary hover:bg-white/[0.08] flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                            <button
                              onClick={() => {
                                onEdit(customer);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-theme-primary hover:bg-white/[0.08] flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <Link
                              href={`/dashboard/stockly/orders?customer=${customer.id}`}
                              className="w-full text-left px-4 py-2 text-sm text-theme-primary hover:bg-white/[0.08] flex items-center gap-2"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <Package className="w-4 h-4" />
                              View Orders
                            </Link>
                            <Link
                              href={`/dashboard/stockly/production/customers/${customer.id}/pricing`}
                              className="w-full text-left px-4 py-2 text-sm text-theme-primary hover:bg-white/[0.08] flex items-center gap-2"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <DollarSign className="w-4 h-4" />
                              Custom Pricing
                            </Link>
                            <div className="border-t border-white/[0.06] my-1" />
                            {!customer.auth_user_id && customer.portal_invite_sent_at && (
                              <button
                                onClick={() => {
                                  onResendInvite(customer);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-theme-primary hover:bg-white/[0.08] flex items-center gap-2"
                              >
                                <Mail className="w-4 h-4" />
                                Resend Invite
                              </button>
                            )}
                            {customer.status === 'active' || customer.status === 'paused' ? (
                              <>
                                {customer.status === 'active' ? (
                                  <button
                                    onClick={() => {
                                      onPause(customer);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-amber-400 hover:bg-white/[0.08] flex items-center gap-2"
                                  >
                                    <Pause className="w-4 h-4" />
                                    Pause Customer
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      onActivate(customer);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-module-fg hover:bg-white/[0.08] flex items-center gap-2"
                                  >
                                    <Play className="w-4 h-4" />
                                    Activate Customer
                                  </button>
                                )}
                                <div className="border-t border-white/[0.06] my-1" />
                                <button
                                  onClick={() => {
                                    onArchive(customer);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/[0.08] flex items-center gap-2"
                                >
                                  <Archive className="w-4 h-4" />
                                  Archive
                                </button>
                              </>
                            ) : customer.status === 'archived' ? (
                              <button
                                onClick={() => {
                                  onActivate(customer);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-module-fg hover:bg-white/[0.08] flex items-center gap-2"
                              >
                                <Play className="w-4 h-4" />
                                Unarchive
                              </button>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

