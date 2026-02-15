'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Plus,
  Search,
  Upload,
  Archive,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Package,
  Mail,
  Lock,
  KeyRound,
  Loader2,
  Truck,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import Textarea from '@/components/ui/Textarea';
import Checkbox from '@/components/ui/Checkbox';
import { useCustomers } from '@/hooks/planly/useCustomers';
import { useDestinationGroups } from '@/hooks/planly/useDestinationGroups';
import { PlanlyCustomer } from '@/types/planly';
import { BulkUploadModal } from './BulkUploadModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import StyledSelect, { StyledOption } from '@/components/ui/StyledSelect';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CustomerListProps {
  siteId: string;
}

export function CustomerList({ siteId }: CustomerListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const { data: customers, isLoading, error, mutate } = useCustomers(siteId, {
    isActive: true,
    showArchived,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-tertiary">Loading customers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500 dark:text-red-400">Error loading customers</div>
      </div>
    );
  }

  const filteredCustomers = (customers as PlanlyCustomer[] || []).filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Customers</h1>
          <p className="text-sm text-theme-tertiary">
            Manage your customer list and delivery information
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Show Archived Toggle */}
          <Button
            variant={showArchived ? 'default' : 'outline'}
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              showArchived
                ? 'bg-[#14B8A6] hover:bg-[#0D9488] text-white'
                : 'border-theme text-theme-secondary hover:bg-theme-hover'
            )}
          >
            <Archive className="w-4 h-4 mr-2" />
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>

          {/* Bulk Upload */}
          <Button
            variant="outline"
            onClick={() => setIsBulkUploadOpen(true)}
            className="border-theme text-theme-secondary hover:bg-theme-hover"
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>

          {/* Add Customer */}
          <Link href="/dashboard/planly/customers/new">
            <Button className="bg-[#14B8A6] hover:bg-[#0D9488] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-theme-tertiary" />
        <Input
          type="text"
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-theme-surface border-theme text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-tertiary"
        />
      </div>

      {/* Customer List */}
      <div className="space-y-2">
        {filteredCustomers.map((customer) => (
          <CustomerRow
            key={customer.id}
            customer={customer}
            siteId={siteId}
            isExpanded={expandedId === customer.id}
            onToggle={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
            onRefresh={() => mutate()}
          />
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="bg-theme-surface border border-theme rounded-lg p-12 text-center">
          <div className="text-theme-tertiary">
            {searchQuery ? 'No customers match your search' : 'No customers yet'}
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={() => mutate()}
        siteId={siteId}
      />
    </div>
  );
}

// ============================================================================
// CustomerRow Component
// ============================================================================

interface CustomerRowProps {
  customer: PlanlyCustomer;
  siteId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}

function CustomerRow({ customer, siteId, isExpanded, onToggle, onRefresh }: CustomerRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(customer);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Sync formData when customer prop changes (e.g., after save/refresh)
  useEffect(() => {
    setFormData(customer);
  }, [customer]);

  const isArchived = !!(customer as any).archived_at;
  const hasPortalAccess = !!(customer as any).portal_enabled;
  const hasBeenInvited = !!(customer as any).portal_invited_at;

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/planly/customers/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          contact_name: formData.contact_name || null,
          address: formData.address || null,
          postcode: formData.postcode || null,
          email: formData.email || null,
          phone: formData.phone || null,
          destination_group_id: formData.destination_group_id || null,
          default_ship_state: formData.default_ship_state,
          notes: (formData as any).notes || null,
          minimum_order_value: formData.minimum_order_value || null,
          below_minimum_delivery_charge: formData.below_minimum_delivery_charge || null,
          is_ad_hoc: formData.is_ad_hoc,
          frozen_only: formData.frozen_only,
          needs_delivery: formData.needs_delivery ?? true,
          portal_enabled: (formData as any).portal_enabled || false,
        }),
      });

      if (response.ok) {
        const updatedCustomer = await response.json();
        setFormData(updatedCustomer); // Update local state immediately
        setIsEditing(false);
        onRefresh();
      } else {
        console.error('Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
    } finally {
      setIsSaving(false);
    }
  }, [customer.id, formData, onRefresh]);

  const handleCancel = useCallback(() => {
    setFormData(customer);
    setIsEditing(false);
  }, [customer]);

  const handleArchive = useCallback(async () => {
    setIsArchiving(true);
    try {
      const response = await fetch(`/api/planly/customers/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archived_at: isArchived ? null : new Date().toISOString(),
        }),
      });

      if (response.ok) {
        onRefresh();
      } else {
        console.error('Failed to archive customer');
      }
    } catch (error) {
      console.error('Error archiving customer:', error);
    } finally {
      setIsArchiving(false);
    }
  }, [customer.id, isArchived, onRefresh]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/planly/customers/${customer.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowDeleteDialog(false);
        onRefresh();
      } else {
        const data = await response.json();
        console.error('Failed to delete customer:', data.error);
        alert(data.error || 'Failed to delete customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [customer.id, onRefresh]);

  const handleSendPortalInvite = useCallback(async () => {
    setIsSendingInvite(true);
    try {
      const response = await fetch(`/api/planly/customers/${customer.id}/portal-invite`, {
        method: 'POST',
      });

      if (response.ok) {
        setShowInviteDialog(false);
        onRefresh();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to send portal invite');
      }
    } catch (error) {
      console.error('Error sending portal invite:', error);
      alert('Failed to send portal invite');
    } finally {
      setIsSendingInvite(false);
    }
  }, [customer.id, onRefresh]);

  const handleDisablePortal = useCallback(async () => {
    try {
      const response = await fetch(`/api/planly/customers/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portal_enabled: false }),
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error disabling portal:', error);
    }
  }, [customer.id, onRefresh]);

  return (
    <>
      <div
        className={cn(
          'bg-theme-surface border border-theme rounded-lg transition-all',
          isArchived && 'opacity-60 bg-gray-50 dark:bg-white/[0.02]',
          isExpanded && 'ring-2 ring-[#14B8A6]'
        )}
      >
        {/* Collapsed Row */}
        <div
          className="p-4 cursor-pointer hover:bg-theme-surface-elevated dark:hover:bg-white/[0.02] transition-colors"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            {/* Customer Info Grid */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-4">
              <div>
                <p className="font-medium text-theme-primary flex items-center gap-2 flex-wrap">
                  {customer.name}
                  {isArchived && (
                    <span className="text-xs px-2 py-0.5 rounded bg-theme-muted text-theme-tertiary">
                      Archived
                    </span>
                  )}
                  {hasPortalAccess && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20 flex items-center gap-1">
                      <KeyRound className="w-3 h-3" />
                      Portal
                    </span>
                  )}
                </p>
                <p className="text-sm text-theme-tertiary">
                  {customer.contact_name || '—'}
                </p>
              </div>

              <div className="hidden sm:block">
                <p className="text-sm text-theme-secondary">{customer.address || '—'}</p>
                <p className="text-sm text-theme-tertiary">{customer.postcode || '—'}</p>
              </div>

              <div className="hidden lg:block">
                <p className="text-sm text-theme-secondary">{customer.email || '—'}</p>
                <p className="text-sm text-theme-tertiary">{customer.phone || '—'}</p>
              </div>

              <div className="hidden lg:block">
                {customer.destination_group && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20">
                    <Package className="w-3 h-3" />
                    {customer.destination_group.name}
                  </span>
                )}
                <div className="flex gap-1 flex-wrap mt-1">
                  {customer.is_ad_hoc && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Ad-hoc
                    </span>
                  )}
                  {customer.frozen_only && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      Frozen
                    </span>
                  )}
                  {(customer.needs_delivery ?? true) && (
                    <Link
                      href="/dashboard/planly/delivery-schedule"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs px-2 py-0.5 rounded bg-teal-50 dark:bg-module-fg/10 text-module-fg border border-teal-200 dark:border-module-fg/30 flex items-center gap-1 hover:bg-teal-100 dark:hover:bg-module-fg/10 transition-colors"
                    >
                      <Truck className="w-3 h-3" />
                      Delivery
                    </Link>
                  )}
                  {!(customer.needs_delivery ?? true) && (
                    <span className="text-xs px-2 py-0.5 rounded bg-theme-muted text-theme-tertiary">
                      Collection
                    </span>
                  )}
                </div>
              </div>

              <div className="hidden lg:block text-right">
                {customer.minimum_order_value && customer.minimum_order_value > 0 && (
                  <p className="text-sm font-medium text-theme-secondary">
                    Min: £{customer.minimum_order_value.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {/* Chevron */}
            <div className="ml-4 flex-shrink-0">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-theme-tertiary" />
              ) : (
                <ChevronDown className="w-5 h-5 text-theme-tertiary" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-theme bg-gray-50/50 dark:bg-white/[0.02] p-4">
            {isEditing ? (
              <EditCustomerForm
                data={formData}
                siteId={siteId}
                onChange={setFormData}
                onSave={handleSave}
                onCancel={handleCancel}
                isSaving={isSaving}
              />
            ) : (
              <div className="space-y-4">
                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-medium text-theme-tertiary uppercase tracking-wide mb-1">
                      Delivery Notes
                    </p>
                    <p className="text-sm text-theme-secondary">
                      {(customer as any).notes || 'No delivery notes'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-theme-tertiary uppercase tracking-wide mb-1">
                      Default Ship State
                    </p>
                    <span className="inline-block text-xs px-2 py-1 rounded bg-theme-muted text-theme-secondary capitalize">
                      {customer.default_ship_state || 'baked'}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-theme-tertiary uppercase tracking-wide mb-1">
                      Order Settings
                    </p>
                    <div className="space-y-1">
                      {customer.minimum_order_value && customer.minimum_order_value > 0 ? (
                        <p className="text-sm text-theme-secondary">
                          Min order: £{customer.minimum_order_value.toFixed(2)}
                        </p>
                      ) : (
                        <p className="text-sm text-theme-tertiary">No minimum order</p>
                      )}
                      {customer.below_minimum_delivery_charge && customer.below_minimum_delivery_charge > 0 && (
                        <p className="text-sm text-theme-secondary">
                          Below min fee: £{customer.below_minimum_delivery_charge.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delivery Status Section */}
                <div className="border-t border-theme pt-4">
                  <p className="text-xs font-medium text-theme-tertiary uppercase tracking-wide mb-2">
                    Delivery Status
                  </p>
                  <div className="flex items-center gap-4">
                    {(customer.needs_delivery ?? true) ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded bg-teal-50 dark:bg-module-fg/10 text-module-fg border border-teal-200 dark:border-module-fg/30 flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          Requires Delivery
                        </span>
                        <Link
                          href="/dashboard/planly/delivery-schedule"
                          className="text-sm text-[#14B8A6] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Schedule →
                        </Link>
                      </div>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-theme-muted text-theme-tertiary">
                        Collection Only
                      </span>
                    )}
                  </div>
                </div>

                {/* Portal Status Section */}
                <div className="border-t border-theme pt-4">
                  <p className="text-xs font-medium text-theme-tertiary uppercase tracking-wide mb-2">
                    Customer Portal Access
                  </p>
                  <div className="flex items-center gap-4">
                    {hasPortalAccess ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20 flex items-center gap-1">
                          <KeyRound className="w-3 h-3" />
                          Portal Enabled
                        </span>
                        {(customer as any).portal_last_login && (
                          <span className="text-xs text-theme-tertiary">
                            Last login: {new Date((customer as any).portal_last_login).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ) : hasBeenInvited ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                          Invited {new Date((customer as any).portal_invited_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-theme-tertiary">
                          Waiting for customer to activate
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-theme-tertiary">
                        Not invited to portal
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-theme">
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                      className="border-theme text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>

                    {/* Portal Invite Button */}
                    {!hasPortalAccess && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowInviteDialog(true);
                        }}
                        disabled={!customer.email}
                        className="border-theme text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/5"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {hasBeenInvited ? 'Resend Invite' : 'Invite to Portal'}
                      </Button>
                    )}

                    {/* Disable Portal (if enabled) */}
                    {hasPortalAccess && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDisablePortal();
                        }}
                        className="border-theme text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/5"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Disable Portal
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive();
                      }}
                      disabled={isArchiving}
                      className="border-theme text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      {isArchived ? 'Unarchive' : 'Archive'}
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                    className="border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Portal Invite Dialog */}
      <ConfirmDialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        onConfirm={handleSendPortalInvite}
        title="Invite to Customer Portal"
        description={
          <>
            Send an email invitation to <strong>{customer.email}</strong> to access the customer portal.
            <br /><br />
            They will be able to:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>View their order history</li>
              <li>Place new orders</li>
              <li>Track deliveries</li>
              <li>Manage their account</li>
            </ul>
          </>
        }
        confirmText={isSendingInvite ? 'Sending...' : hasBeenInvited ? 'Resend Invitation' : 'Send Invitation'}
        variant="default"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Customer"
        description={
          <>
            Are you sure you want to delete <strong>{customer.name}</strong>?
            This will also delete all their orders and cannot be undone.
            <br />
            <br />
            <strong>Tip:</strong> Consider archiving instead to preserve order history.
          </>
        }
        confirmText={isDeleting ? 'Deleting...' : 'Delete Permanently'}
        variant="destructive"
      />
    </>
  );
}

// ============================================================================
// EditCustomerForm Component
// ============================================================================

interface EditCustomerFormProps {
  data: PlanlyCustomer;
  siteId: string;
  onChange: (data: PlanlyCustomer) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

function EditCustomerForm({
  data,
  siteId,
  onChange,
  onSave,
  onCancel,
  isSaving,
}: EditCustomerFormProps) {
  const { data: destinationGroups } = useDestinationGroups(siteId);

  return (
    <div className="space-y-4">
      {/* Row 1: Basic Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-theme-secondary">
            Customer Name *
          </Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            className="mt-1 bg-theme-surface border-theme text-theme-primary"
            required
          />
        </div>

        <div>
          <Label htmlFor="contact_name" className="text-theme-secondary">
            Contact Name
          </Label>
          <Input
            id="contact_name"
            value={data.contact_name || ''}
            onChange={(e) => onChange({ ...data, contact_name: e.target.value })}
            className="mt-1 bg-theme-surface border-theme text-theme-primary"
          />
        </div>
      </div>

      {/* Row 2: Address */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="address" className="text-theme-secondary">
            Address *
          </Label>
          <Input
            id="address"
            value={data.address || ''}
            onChange={(e) => onChange({ ...data, address: e.target.value })}
            className="mt-1 bg-theme-surface border-theme text-theme-primary"
            required
          />
        </div>

        <div>
          <Label htmlFor="postcode" className="text-theme-secondary">
            Postcode *
          </Label>
          <Input
            id="postcode"
            value={data.postcode || ''}
            onChange={(e) => onChange({ ...data, postcode: e.target.value })}
            className="mt-1 bg-theme-surface border-theme text-theme-primary"
            required
          />
        </div>
      </div>

      {/* Row 3: Contact Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email" className="text-theme-secondary">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={data.email || ''}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
            className="mt-1 bg-theme-surface border-theme text-theme-primary"
          />
        </div>

        <div>
          <Label htmlFor="phone" className="text-theme-secondary">
            Phone
          </Label>
          <Input
            id="phone"
            value={data.phone || ''}
            onChange={(e) => onChange({ ...data, phone: e.target.value })}
            className="mt-1 bg-theme-surface border-theme text-theme-primary"
          />
        </div>
      </div>

      {/* Row 4: Destination & Ship State */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="destination_group" className="text-theme-secondary">
            Destination Group
          </Label>
          <StyledSelect
            value={data.destination_group_id || ''}
            onChange={(e) =>
              onChange({ ...data, destination_group_id: e.target.value || undefined })
            }
            className="mt-1"
          >
            <StyledOption value="">None</StyledOption>
            {(destinationGroups || []).map((g: { id: string; name: string }) => (
              <StyledOption key={g.id} value={g.id}>
                {g.name}
              </StyledOption>
            ))}
          </StyledSelect>
        </div>

        <div>
          <Label htmlFor="ship_state" className="text-theme-secondary">
            Default Ship State
          </Label>
          <StyledSelect
            value={data.default_ship_state}
            onChange={(e) =>
              onChange({ ...data, default_ship_state: e.target.value as 'baked' | 'frozen' })
            }
            className="mt-1"
          >
            <StyledOption value="baked">Baked</StyledOption>
            <StyledOption value="frozen">Frozen</StyledOption>
          </StyledSelect>
        </div>
      </div>

      {/* Row 5: Order Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="minimum_order" className="text-theme-secondary">
            Minimum Order Value (£)
          </Label>
          <Input
            id="minimum_order"
            type="number"
            step="0.01"
            min="0"
            value={data.minimum_order_value || ''}
            onChange={(e) =>
              onChange({
                ...data,
                minimum_order_value: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            placeholder="0.00"
            className="mt-1 bg-theme-surface border-theme text-theme-primary"
          />
        </div>

        <div>
          <Label htmlFor="below_min_charge" className="text-theme-secondary">
            Below Minimum Delivery Charge (£)
          </Label>
          <Input
            id="below_min_charge"
            type="number"
            step="0.01"
            min="0"
            value={data.below_minimum_delivery_charge || ''}
            onChange={(e) =>
              onChange({
                ...data,
                below_minimum_delivery_charge: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            placeholder="0.00"
            className="mt-1 bg-theme-surface border-theme text-theme-primary"
          />
          <p className="text-xs text-theme-tertiary mt-1">
            Charge applied when order is below minimum
          </p>
        </div>
      </div>

      {/* Delivery Notes */}
      <div>
        <Label htmlFor="notes" className="text-theme-secondary">
          Delivery Notes
        </Label>
        <Textarea
          id="notes"
          value={(data as any).notes || ''}
          onChange={(e) => onChange({ ...data, notes: e.target.value } as any)}
          placeholder="Keys provided, code is 1234..."
          rows={3}
          className="mt-1 bg-theme-surface border-theme text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-tertiary"
        />
      </div>

      {/* Checkboxes */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_ad_hoc"
            checked={data.is_ad_hoc}
            onCheckedChange={(checked) => onChange({ ...data, is_ad_hoc: checked as boolean })}
          />
          <Label htmlFor="is_ad_hoc" className="text-sm text-theme-secondary">
            Ad-hoc customer (not on regular delivery schedule)
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="frozen_only"
            checked={data.frozen_only}
            onCheckedChange={(checked) => onChange({ ...data, frozen_only: checked as boolean })}
          />
          <Label htmlFor="frozen_only" className="text-sm text-theme-secondary">
            Frozen only (this customer only receives frozen products)
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="needs_delivery"
            checked={data.needs_delivery ?? true}
            onCheckedChange={(checked) => onChange({ ...data, needs_delivery: checked as boolean })}
          />
          <Label htmlFor="needs_delivery" className="text-sm text-theme-secondary">
            Requires delivery (appears on delivery schedule)
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="portal_enabled"
            checked={(data as any).portal_enabled || false}
            onCheckedChange={(checked) =>
              onChange({ ...data, portal_enabled: checked as boolean } as any)
            }
          />
          <Label htmlFor="portal_enabled" className="text-sm text-theme-secondary">
            Enable customer portal access
          </Label>
        </div>
      </div>

      {/* Save/Cancel */}
      <div className="flex justify-end gap-2 pt-4 border-t border-theme">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          className="border-theme text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/5"
        >
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={isSaving || !data.name.trim()}
          className="bg-[#14B8A6] hover:bg-[#0D9488] text-white"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
