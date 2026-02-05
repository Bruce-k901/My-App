'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, Plus, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Label from '@/components/ui/Label';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Switch from '@/components/ui/Switch';
import { useDestinationGroups } from '@/hooks/planly/useDestinationGroups';
import { usePortalUsers, usePortalUserMutations } from '@/hooks/planly/usePortalUsers';
import { usePortalInvite } from '@/hooks/planly/usePortalInvite';
import { PortalUserRow } from './PortalUserRow';
import { cn } from '@/lib/utils';
import type { PlanlyCustomer, ShipState, PaymentTerms } from '@/types/planly';

type FulfillmentType = 'delivery' | 'collection';

interface CustomerFormProps {
  siteId: string;
  customer?: PlanlyCustomer;
}

export function CustomerForm({ siteId, customer }: CustomerFormProps) {
  const router = useRouter();
  const { data: destinationGroups } = useDestinationGroups(siteId);
  const isEdit = !!customer;

  // Portal users management (only for edit mode)
  const { data: portalUsers } = usePortalUsers(customer?.id);
  const { addUser, updateUser, deleteUser, isLoading: isPortalLoading, error: portalError } = usePortalUserMutations(customer?.id || '');
  const { sendInvite } = usePortalInvite(customer?.id || '');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Details
  const [name, setName] = useState(customer?.name || '');
  const [contactName, setContactName] = useState(customer?.contact_name || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [postcode, setPostcode] = useState(customer?.postcode || '');

  // Delivery
  const [defaultFulfillment, setDefaultFulfillment] = useState<FulfillmentType>(
    (customer as any)?.default_fulfillment || 'delivery'
  );
  const [destinationGroupId, setDestinationGroupId] = useState(customer?.destination_group_id || '');
  const [defaultShipState, setDefaultShipState] = useState<ShipState>(customer?.default_ship_state || 'baked');
  const [deliveryInstructions, setDeliveryInstructions] = useState(customer?.delivery_instructions || '');
  const [needsDelivery, setNeedsDelivery] = useState(customer?.needs_delivery ?? true);

  // Finance
  const [minimumOrderValue, setMinimumOrderValue] = useState(customer?.minimum_order_value?.toString() || '');
  const [belowMinimumCharge, setBelowMinimumCharge] = useState(customer?.below_minimum_delivery_charge?.toString() || '');
  const [financeContactName, setFinanceContactName] = useState(customer?.finance_contact_name || '');
  const [financeContactEmail, setFinanceContactEmail] = useState(customer?.finance_contact_email || '');
  const [financeContactPhone, setFinanceContactPhone] = useState(customer?.finance_contact_phone || '');
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState<PaymentTerms>(customer?.default_payment_terms || 'net_30');

  // Settings
  const [isAdHoc, setIsAdHoc] = useState(customer?.is_ad_hoc || false);
  const [frozenOnly, setFrozenOnly] = useState(customer?.frozen_only || false);
  const [isActive, setIsActive] = useState(customer?.is_active ?? true);

  // Portal
  const [portalEnabled, setPortalEnabled] = useState(customer?.portal_enabled || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Customer name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        contact_name: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        postcode: postcode.trim() || null,
        // Note: default_fulfillment UI retained for future use when column is added
        destination_group_id: destinationGroupId || null,
        default_ship_state: defaultShipState,
        delivery_instructions: deliveryInstructions.trim() || null,
        needs_delivery: needsDelivery,
        minimum_order_value: minimumOrderValue ? parseFloat(minimumOrderValue) : null,
        below_minimum_delivery_charge: belowMinimumCharge ? parseFloat(belowMinimumCharge) : null,
        finance_contact_name: financeContactName.trim() || null,
        finance_contact_email: financeContactEmail.trim() || null,
        finance_contact_phone: financeContactPhone.trim() || null,
        default_payment_terms: defaultPaymentTerms,
        is_ad_hoc: isAdHoc,
        frozen_only: frozenOnly,
        is_active: isActive,
        portal_enabled: portalEnabled,
        site_id: siteId,
      };

      const url = isEdit
        ? `/api/planly/customers/${customer.id}`
        : '/api/planly/customers';

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save customer');
      }

      router.push('/dashboard/planly/customers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card className="p-6 bg-white dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 dark:text-white/80">Customer Name *</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., ABC Bakery"
                className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-white/80">Contact Name</Label>
              <Input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Primary contact"
                className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-white/80">Phone</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-white/80">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-white/80">Address</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Delivery address"
                className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
                rows={3}
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-white/80">Postcode</Label>
              <Input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="e.g., SW1A 1AA"
                className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </Card>

        {/* Delivery Settings */}
        <Card className="p-6 bg-white dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delivery Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Requires Delivery</span>
                <p className="text-sm text-gray-500 dark:text-white/60">Customer will appear on delivery schedule</p>
              </div>
              <Switch
                checked={needsDelivery}
                onChange={setNeedsDelivery}
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-white/80">Default Fulfillment</Label>
              <div className="mt-2 flex rounded-lg overflow-hidden border border-gray-200 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setDefaultFulfillment('delivery')}
                  className={cn(
                    'flex-1 px-4 py-2.5 text-sm font-medium transition-colors',
                    defaultFulfillment === 'delivery'
                      ? 'bg-[#14B8A6] text-white'
                      : 'bg-gray-50 dark:bg-white/[0.03] text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
                  )}
                >
                  Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setDefaultFulfillment('collection')}
                  className={cn(
                    'flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-l border-gray-200 dark:border-white/[0.06]',
                    defaultFulfillment === 'collection'
                      ? 'bg-[#14B8A6] text-white'
                      : 'bg-gray-50 dark:bg-white/[0.03] text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
                  )}
                >
                  Collection
                </button>
              </div>
            </div>

            <div>
              <Label className="text-gray-700 dark:text-white/80">Destination Group</Label>
              <select
                value={destinationGroupId}
                onChange={(e) => setDestinationGroupId(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/50"
              >
                <option value="" className="bg-white dark:bg-neutral-900">No group</option>
                {(destinationGroups || []).map((group: any) => (
                  <option key={group.id} value={group.id} className="bg-white dark:bg-neutral-900">
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-gray-700 dark:text-white/80">Default Ship State</Label>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="shipState"
                    checked={defaultShipState === 'baked'}
                    onChange={() => setDefaultShipState('baked')}
                    className="w-4 h-4 text-[#14B8A6] bg-gray-50 dark:bg-white/[0.03] border-gray-300 dark:border-white/[0.06]"
                  />
                  <span className="text-gray-900 dark:text-white">Baked (Fresh)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="shipState"
                    checked={defaultShipState === 'frozen'}
                    onChange={() => setDefaultShipState('frozen')}
                    className="w-4 h-4 text-[#14B8A6] bg-gray-50 dark:bg-white/[0.03] border-gray-300 dark:border-white/[0.06]"
                  />
                  <span className="text-gray-900 dark:text-white">Frozen</span>
                </label>
              </div>
            </div>

            <div>
              <Label className="text-gray-700 dark:text-white/80">Delivery Instructions</Label>
              <Textarea
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                placeholder="Special delivery instructions (e.g., use back entrance, call on arrival)..."
                className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Finance Settings */}
        <Card className="p-6 bg-white dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Finance Settings</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 dark:text-white/80">Payment Terms</Label>
              <select
                value={defaultPaymentTerms}
                onChange={(e) => setDefaultPaymentTerms(e.target.value as PaymentTerms)}
                className="mt-1 w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/50"
              >
                <option value="prepaid" className="bg-white dark:bg-neutral-900">Prepaid</option>
                <option value="net_7" className="bg-white dark:bg-neutral-900">Net 7</option>
                <option value="net_14" className="bg-white dark:bg-neutral-900">Net 14</option>
                <option value="net_30" className="bg-white dark:bg-neutral-900">Net 30</option>
                <option value="net_60" className="bg-white dark:bg-neutral-900">Net 60</option>
              </select>
            </div>

            <div>
              <Label className="text-gray-700 dark:text-white/80">Minimum Order Value (GBP)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={minimumOrderValue}
                onChange={(e) => setMinimumOrderValue(e.target.value)}
                placeholder="0.00"
                className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-white/80">Below Minimum Charge (GBP)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={belowMinimumCharge}
                onChange={(e) => setBelowMinimumCharge(e.target.value)}
                placeholder="0.00"
                className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
              />
            </div>

            <h3 className="text-sm font-medium text-gray-900 dark:text-white pt-2">Finance Contact</h3>
            <div>
              <Label className="text-gray-700 dark:text-white/80">Name</Label>
              <Input
                type="text"
                value={financeContactName}
                onChange={(e) => setFinanceContactName(e.target.value)}
                placeholder="Accounts contact name"
                className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label className="text-gray-700 dark:text-white/80">Email</Label>
              <Input
                type="email"
                value={financeContactEmail}
                onChange={(e) => setFinanceContactEmail(e.target.value)}
                placeholder="accounts@example.com"
                className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label className="text-gray-700 dark:text-white/80">Phone</Label>
              <Input
                type="tel"
                value={financeContactPhone}
                onChange={(e) => setFinanceContactPhone(e.target.value)}
                placeholder="Phone number"
                className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </Card>

        {/* Options */}
        <Card className="p-6 bg-white dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Options</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Ad-hoc Customer</span>
                <p className="text-sm text-gray-500 dark:text-white/60">One-time or occasional orders only</p>
              </div>
              <Switch
                checked={isAdHoc}
                onChange={setIsAdHoc}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Frozen Only</span>
                <p className="text-sm text-gray-500 dark:text-white/60">Customer can only receive frozen products</p>
              </div>
              <Switch
                checked={frozenOnly}
                onChange={setFrozenOnly}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Active</span>
                <p className="text-sm text-gray-500 dark:text-white/60">Customer can receive orders</p>
              </div>
              <Switch
                checked={isActive}
                onChange={setIsActive}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Portal Access</span>
                <p className="text-sm text-gray-500 dark:text-white/60">Allow customer to log in and place orders via portal</p>
              </div>
              <Switch
                checked={portalEnabled}
                onChange={setPortalEnabled}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Portal Users (only in edit mode with portal enabled) */}
      {isEdit && portalEnabled && (
        <Card className="p-6 bg-white dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-[#14B8A6]" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Portal Users</h2>
            </div>
            <span className="text-sm text-gray-500 dark:text-white/60">
              {portalUsers.length} user{portalUsers.length !== 1 ? 's' : ''}
            </span>
          </div>

          {portalError && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{portalError}</span>
            </div>
          )}

          {/* Existing portal users */}
          <div className="space-y-3 mb-4">
            {portalUsers.map((user) => (
              <PortalUserRow
                key={user.id}
                user={{
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  phone: user.phone,
                  is_primary: user.is_primary,
                  invite_sent_at: user.invite_sent_at,
                  invite_expires_at: user.invite_expires_at,
                  auth_user_id: user.auth_user_id,
                }}
                onUpdate={(updates) => updateUser(user.id, updates)}
                onRemove={() => deleteUser(user.id)}
                onSendInvite={() => sendInvite(user.id)}
              />
            ))}
          </div>

          {/* Add new user form */}
          {isAddingUser ? (
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Add Portal User</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-gray-700 dark:text-white/80 text-sm">Name</Label>
                  <Input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="User name"
                    className="mt-1 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 dark:text-white/80 text-sm">Email</Label>
                  <Input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="mt-1 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingUser(false);
                    setNewUserName('');
                    setNewUserEmail('');
                  }}
                  className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!newUserName.trim() || !newUserEmail.trim() || isPortalLoading}
                  onClick={async () => {
                    const result = await addUser({
                      name: newUserName.trim(),
                      email: newUserEmail.trim(),
                      is_primary: portalUsers.length === 0, // First user is primary
                    });
                    if (result) {
                      setNewUserName('');
                      setNewUserEmail('');
                      setIsAddingUser(false);
                    }
                  }}
                  className="bg-[#14B8A6] hover:bg-[#0D9488] text-white"
                >
                  {isPortalLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add User'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddingUser(true)}
              className="w-full bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 border-dashed text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/10"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Portal User
            </Button>
          )}

          {portalUsers.length === 0 && !isAddingUser && (
            <p className="mt-3 text-sm text-gray-500 dark:text-white/50 text-center">
              No portal users yet. Add a user to allow them to log in and place orders.
            </p>
          )}
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/[0.06]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-[#14B8A6] hover:bg-[#14B8A6]/90 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEdit ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            isEdit ? 'Save Changes' : 'Create Customer'
          )}
        </Button>
      </div>
    </form>
  );
}
