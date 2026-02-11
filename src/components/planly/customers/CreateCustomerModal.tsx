'use client';

import { useState } from 'react';
import { X, Loader2, AlertCircle, Building2, Truck, Wallet, Settings } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import Label from '@/components/ui/Label';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Switch from '@/components/ui/Switch';
import { useDestinationGroups } from '@/hooks/planly/useDestinationGroups';
import { useCreateCustomer } from '@/hooks/planly/useCreateCustomer';
import { cn } from '@/lib/utils';
import type { ShipState, PaymentTerms } from '@/types/planly';

interface CreateCustomerModalProps {
  siteId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customer: { id: string; name: string }) => void;
}

type TabId = 'details' | 'delivery' | 'finance' | 'settings';
type FulfillmentType = 'delivery' | 'collection';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'details', label: 'Details', icon: Building2 },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function CreateCustomerModal({ siteId, isOpen, onClose, onSuccess }: CreateCustomerModalProps) {
  const { data: destinationGroups } = useDestinationGroups(siteId);
  const { createCustomer, isLoading, error: createError } = useCreateCustomer();

  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [error, setError] = useState<string | null>(null);

  // Details tab
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');

  // Delivery tab
  const [defaultFulfillment, setDefaultFulfillment] = useState<FulfillmentType>('delivery');
  const [destinationGroupId, setDestinationGroupId] = useState('');
  const [defaultShipState, setDefaultShipState] = useState<ShipState>('baked');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [needsDelivery, setNeedsDelivery] = useState(true);

  // Finance tab
  const [minimumOrderValue, setMinimumOrderValue] = useState('');
  const [belowMinimumCharge, setBelowMinimumCharge] = useState('');
  const [financeContactName, setFinanceContactName] = useState('');
  const [financeContactEmail, setFinanceContactEmail] = useState('');
  const [financeContactPhone, setFinanceContactPhone] = useState('');
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState<PaymentTerms>('net_30');

  // Settings tab
  const [isAdHoc, setIsAdHoc] = useState(false);
  const [frozenOnly, setFrozenOnly] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Portal tab
  const [portalEnabled, setPortalEnabled] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Customer name is required');
      setActiveTab('details');
      return;
    }

    setError(null);

    const customer = await createCustomer({
      name: name.trim(),
      contact_name: contactName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      postcode: postcode.trim() || undefined,
      // Note: default_fulfillment UI retained for future use when column is added
      destination_group_id: destinationGroupId || undefined,
      default_ship_state: defaultShipState,
      delivery_instructions: deliveryInstructions.trim() || undefined,
      needs_delivery: needsDelivery,
      minimum_order_value: minimumOrderValue ? parseFloat(minimumOrderValue) : undefined,
      below_minimum_delivery_charge: belowMinimumCharge ? parseFloat(belowMinimumCharge) : undefined,
      finance_contact_name: financeContactName.trim() || undefined,
      finance_contact_email: financeContactEmail.trim() || undefined,
      finance_contact_phone: financeContactPhone.trim() || undefined,
      default_payment_terms: defaultPaymentTerms,
      is_ad_hoc: isAdHoc,
      frozen_only: frozenOnly,
      is_active: isActive,
      portal_enabled: portalEnabled,
      site_id: siteId,
    });

    if (customer) {
      onSuccess?.({ id: customer.id, name: customer.name });
      handleClose();
    }
  };

  const handleClose = () => {
    // Reset form
    setName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setPostcode('');
    setDefaultFulfillment('delivery');
    setDestinationGroupId('');
    setDefaultShipState('baked');
    setDeliveryInstructions('');
    setNeedsDelivery(true);
    setMinimumOrderValue('');
    setBelowMinimumCharge('');
    setFinanceContactName('');
    setFinanceContactEmail('');
    setFinanceContactPhone('');
    setDefaultPaymentTerms('net_30');
    setIsAdHoc(false);
    setFrozenOnly(false);
    setIsActive(true);
    setPortalEnabled(false);
    setActiveTab('details');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const displayError = error || createError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-neutral-900 rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create Customer
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-white/10 px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.id
                    ? 'border-[#14B8A6] text-[#14B8A6]'
                    : 'border-transparent text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Error Display */}
        {displayError && (
          <div className="mx-6 mt-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm">{displayError}</span>
          </div>
        )}

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[calc(90vh-220px)] overflow-y-auto">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
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
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-700 dark:text-white/80">Address</Label>
                    <Textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Delivery address"
                      className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
                      rows={4}
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
              </div>
            )}

            {/* Delivery Tab */}
            {activeTab === 'delivery' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
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
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-700 dark:text-white/80">Delivery Instructions</Label>
                    <Textarea
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      placeholder="Special delivery instructions (e.g., use back entrance, call on arrival)..."
                      className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
                      rows={6}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Finance Tab */}
            {activeTab === 'finance' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
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
                </div>

                {/* Right Column - Finance Contact */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Finance Contact</h3>
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
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
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
                </div>

                {/* Right Column */}
                <div className="space-y-4">
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
                      <p className="text-sm text-gray-500 dark:text-white/60">Allow customer to log in and place orders</p>
                    </div>
                    <Switch
                      checked={portalEnabled}
                      onChange={setPortalEnabled}
                    />
                  </div>

                  {portalEnabled && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        After creating the customer, you can invite portal users from the customer details page.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
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
                  Creating...
                </>
              ) : (
                'Create Customer'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
