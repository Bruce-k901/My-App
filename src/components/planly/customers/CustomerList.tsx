'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
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
        <div className="text-gray-500 dark:text-white/60">Loading customers...</div>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-sm text-gray-500 dark:text-white/60">
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
                : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5'
            )}
          >
            <Archive className="w-4 h-4 mr-2" />
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>

          {/* Bulk Upload */}
          <Button
            variant="outline"
            onClick={() => setIsBulkUploadOpen(true)}
            className="border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
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
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40" />
        <Input
          type="text"
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40"
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
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-12 text-center">
          <div className="text-gray-500 dark:text-white/60">
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
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const isArchived = !!customer.archived_at;

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
          delivery_instructions: formData.delivery_instructions || null,
          is_ad_hoc: formData.is_ad_hoc,
          frozen_only: formData.frozen_only,
        }),
      });

      if (response.ok) {
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

  return (
    <>
      <div
        className={cn(
          'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg transition-all',
          isArchived && 'opacity-60 bg-gray-50 dark:bg-white/[0.02]',
          isExpanded && 'ring-2 ring-[#14B8A6]'
        )}
      >
        {/* Collapsed Row */}
        <div
          className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            {/* Customer Info Grid */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
              <div>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  {customer.name}
                  {isArchived && (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50">
                      Archived
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500 dark:text-white/60">
                  {customer.contact_name || '—'}
                </p>
              </div>

              <div className="hidden sm:block">
                <p className="text-sm text-gray-700 dark:text-white/80">{customer.address || '—'}</p>
                <p className="text-sm text-gray-500 dark:text-white/60">{customer.postcode || '—'}</p>
              </div>

              <div className="hidden lg:block">
                <p className="text-sm text-gray-700 dark:text-white/80">{customer.email || '—'}</p>
                <p className="text-sm text-gray-500 dark:text-white/60">{customer.phone || '—'}</p>
              </div>

              <div className="hidden lg:block">
                {customer.destination_group && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20">
                    <Package className="w-3 h-3" />
                    {customer.destination_group.name}
                  </span>
                )}
              </div>
            </div>

            {/* Chevron */}
            <div className="ml-4 flex-shrink-0">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400 dark:text-white/40" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 dark:text-white/40" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] p-4">
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
                    <p className="text-xs font-medium text-gray-500 dark:text-white/50 uppercase tracking-wide mb-1">
                      Delivery Notes
                    </p>
                    <p className="text-sm text-gray-700 dark:text-white/80">
                      {customer.delivery_instructions || 'No delivery notes'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-white/50 uppercase tracking-wide mb-1">
                      Default Ship State
                    </p>
                    <span className="inline-block text-xs px-2 py-1 rounded bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/80 capitalize">
                      {customer.default_ship_state || 'baked'}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-white/50 uppercase tracking-wide mb-1">
                      Settings
                    </p>
                    <div className="flex gap-2">
                      {customer.is_ad_hoc && (
                        <span className="text-xs px-2 py-1 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                          Ad-hoc
                        </span>
                      )}
                      {customer.frozen_only && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                          Frozen Only
                        </span>
                      )}
                      {!customer.is_ad_hoc && !customer.frozen_only && (
                        <span className="text-sm text-gray-400 dark:text-white/40">None</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/10">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                      className="border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive();
                      }}
                      disabled={isArchiving}
                      className="border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Customer Name */}
        <div>
          <Label htmlFor="name" className="text-gray-700 dark:text-white/80">
            Customer Name *
          </Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            className="mt-1 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
            required
          />
        </div>

        {/* Contact Name */}
        <div>
          <Label htmlFor="contact_name" className="text-gray-700 dark:text-white/80">
            Contact Name
          </Label>
          <Input
            id="contact_name"
            value={data.contact_name || ''}
            onChange={(e) => onChange({ ...data, contact_name: e.target.value })}
            className="mt-1 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
          />
        </div>

        {/* Address */}
        <div>
          <Label htmlFor="address" className="text-gray-700 dark:text-white/80">
            Address *
          </Label>
          <Input
            id="address"
            value={data.address || ''}
            onChange={(e) => onChange({ ...data, address: e.target.value })}
            className="mt-1 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
            required
          />
        </div>

        {/* Postcode */}
        <div>
          <Label htmlFor="postcode" className="text-gray-700 dark:text-white/80">
            Postcode *
          </Label>
          <Input
            id="postcode"
            value={data.postcode || ''}
            onChange={(e) => onChange({ ...data, postcode: e.target.value })}
            className="mt-1 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
            required
          />
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email" className="text-gray-700 dark:text-white/80">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={data.email || ''}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
            className="mt-1 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
          />
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone" className="text-gray-700 dark:text-white/80">
            Phone
          </Label>
          <Input
            id="phone"
            value={data.phone || ''}
            onChange={(e) => onChange({ ...data, phone: e.target.value })}
            className="mt-1 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
          />
        </div>

        {/* Destination Group */}
        <div>
          <Label htmlFor="destination_group" className="text-gray-700 dark:text-white/80">
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

        {/* Default Ship State */}
        <div>
          <Label htmlFor="ship_state" className="text-gray-700 dark:text-white/80">
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

      {/* Delivery Notes */}
      <div>
        <Label htmlFor="delivery_notes" className="text-gray-700 dark:text-white/80">
          Delivery Notes
        </Label>
        <Textarea
          id="delivery_notes"
          value={data.delivery_instructions || ''}
          onChange={(e) => onChange({ ...data, delivery_instructions: e.target.value })}
          placeholder="Keys provided, code is 1234..."
          rows={3}
          className="mt-1 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40"
        />
      </div>

      {/* Checkboxes */}
      <div className="flex gap-6">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_ad_hoc"
            checked={data.is_ad_hoc}
            onCheckedChange={(checked) => onChange({ ...data, is_ad_hoc: checked as boolean })}
          />
          <Label htmlFor="is_ad_hoc" className="text-sm text-gray-700 dark:text-white/80">
            Ad-hoc customer
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="frozen_only"
            checked={data.frozen_only}
            onCheckedChange={(checked) => onChange({ ...data, frozen_only: checked as boolean })}
          />
          <Label htmlFor="frozen_only" className="text-sm text-gray-700 dark:text-white/80">
            Frozen only
          </Label>
        </div>
      </div>

      {/* Save/Cancel */}
      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-white/10">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          className="border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5"
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
