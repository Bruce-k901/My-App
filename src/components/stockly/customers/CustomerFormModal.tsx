"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

interface Customer {
  id?: string;
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
}

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  customer?: Customer | null;
}

export default function CustomerFormModal({
  open,
  onClose,
  onSaved,
  customer,
}: CustomerFormModalProps) {
  // This log should fire every time the component renders
  console.log('[CustomerFormModal] RENDER - open:', open, 'customer:', customer?.id || 'new');
  
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Customer>({
    business_name: '',
    trading_name: '',
    contact_name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postcode: '',
    country: 'UK',
    delivery_notes: '',
    payment_terms_days: 30,
    credit_limit: null,
    minimum_order_value: null,
    internal_notes: '',
  });

  const isEdit = !!customer?.id;

  // Track when modal opens/closes
  useEffect(() => {
    console.log('[CustomerFormModal] useEffect - open changed to:', open);
  }, [open]);

  // Initialize form data when customer changes
  useEffect(() => {
    if (customer) {
      setFormData({
        business_name: customer.business_name || '',
        trading_name: customer.trading_name || '',
        contact_name: customer.contact_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address_line1: customer.address_line1 || '',
        address_line2: customer.address_line2 || '',
        city: customer.city || '',
        postcode: customer.postcode || '',
        country: customer.country || 'UK',
        delivery_notes: customer.delivery_notes || '',
        payment_terms_days: customer.payment_terms_days || 30,
        credit_limit: customer.credit_limit || null,
        minimum_order_value: customer.minimum_order_value || null,
        internal_notes: customer.internal_notes || '',
      });
    } else {
      // Reset form for new customer
      setFormData({
        business_name: '',
        trading_name: '',
        contact_name: '',
        email: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        postcode: '',
        country: 'UK',
        delivery_notes: '',
        payment_terms_days: 30,
        credit_limit: null,
        minimum_order_value: null,
        internal_notes: '',
      });
    }
  }, [customer, open]);

  const handleChange = (field: keyof Customer, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.business_name || !formData.email || !formData.address_line1 || !formData.city || !formData.postcode) {
        showToast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          type: 'error',
        });
        setLoading(false);
        return;
      }

      const url = isEdit
        ? `/api/stockly/customers/${customer.id}`
        : '/api/stockly/customers';

      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save customer');
      }

      showToast({
        title: isEdit ? 'Customer updated' : 'Customer created',
        description: isEdit
          ? 'Customer information has been updated'
          : 'Customer has been created and invitation email sent',
        type: 'success',
      });

      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      showToast({
        title: 'Error',
        description: error.message || 'Failed to save customer',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  console.log('[CustomerFormModal] Component render - open:', open, 'isEdit:', isEdit);
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      console.log('[CustomerFormModal] onOpenChange called with:', isOpen);
      if (!isOpen) {
        onClose();
      }
    }}>
      <DialogContent
        className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#0B0D13', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-semibold text-white">
              {isEdit ? 'Edit Customer' : 'Add New Customer'}
            </DialogTitle>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Two-column layout for desktop */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Section 1: Business Details */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-emerald-400 border-b border-white/[0.06] pb-2">
                  Business Details
                </h3>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Business Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => handleChange('business_name', e.target.value)}
                    placeholder="e.g., High Grade Coffee"
                    required
                    className="focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                  />
                  <p className="text-xs text-white/50 mt-1.5">The name of the cafe/restaurant</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Trading Name</label>
                    <Input
                      type="text"
                      value={formData.trading_name || ''}
                      onChange={(e) => handleChange('trading_name', e.target.value)}
                      placeholder="Same as business name if different"
                      className="focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Contact Name</label>
                    <Input
                      type="text"
                      value={formData.contact_name || ''}
                      onChange={(e) => handleChange('contact_name', e.target.value)}
                      placeholder="e.g., John Smith"
                      className="focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="orders@cafe.com"
                      required
                      className="focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                    />
                    <p className="text-xs text-white/50 mt-1.5">Used for portal login and order confirmations</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Phone</label>
                    <Input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+44 20 1234 5678"
                      className="focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Delivery Address */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-emerald-400 border-b border-white/[0.06] pb-2">
                  Delivery Address
                </h3>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Street Address <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.address_line1}
                    onChange={(e) => handleChange('address_line1', e.target.value)}
                    placeholder="123 High Street"
                    required
                    className="focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Address Line 2</label>
                  <Input
                    type="text"
                    value={formData.address_line2 || ''}
                    onChange={(e) => handleChange('address_line2', e.target.value)}
                    placeholder="Unit 4B"
                    className="focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      City <span className="text-red-400">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="London"
                      required
                      className="focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Postcode <span className="text-red-400">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.postcode}
                      onChange={(e) => handleChange('postcode', e.target.value)}
                      placeholder="SW1A 1AA"
                      required
                      className="focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                    />
                    <p className="text-xs text-white/50 mt-1.5">We'll calculate delivery distance</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">

              {/* Section 3: Payment Terms */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-emerald-400 border-b border-white/[0.06] pb-2">
                  Payment Terms
                </h3>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Payment Terms</label>
                  <select
                    value={formData.payment_terms_days || 30}
                    onChange={(e) => handleChange('payment_terms_days', parseInt(e.target.value))}
                    className="w-full h-10 rounded-lg bg-white/[0.06] border border-white/[0.12] text-white text-sm px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 hover:bg-white/[0.08] hover:border-white/20 transition-colors"
                  >
                    <option value="0">Prepaid (pay before delivery)</option>
                    <option value="7">Net 7 (7 days after invoice)</option>
                    <option value="14">Net 14</option>
                    <option value="30">Net 30</option>
                    <option value="60">Net 60</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Credit Limit</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.credit_limit || ''}
                      onChange={(e) => handleChange('credit_limit', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0.00"
                      className="focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                    />
                    <p className="text-xs text-white/50 mt-1.5">Maximum outstanding balance allowed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Minimum Order Value</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.minimum_order_value || ''}
                      onChange={(e) => handleChange('minimum_order_value', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0.00"
                      className="focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Delivery Notes */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-emerald-400 border-b border-white/[0.06] pb-2">
                  Delivery Notes
                </h3>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Delivery Notes</label>
                  <textarea
                    value={formData.delivery_notes || ''}
                    onChange={(e) => handleChange('delivery_notes', e.target.value)}
                    placeholder="e.g., Use back entrance, call on arrival"
                    rows={4}
                    className="w-full rounded-lg bg-white/[0.06] border border-white/[0.12] text-white text-sm px-3 py-2 placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 hover:bg-white/[0.08] hover:border-white/20 transition-colors resize-none"
                  />
                  <p className="text-xs text-white/50 mt-1.5">These notes will be printed on delivery notes</p>
                </div>
              </div>

              {/* Section 5: Internal Notes */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-emerald-400 border-b border-white/[0.06] pb-2">
                  Internal Notes
                </h3>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Notes</label>
                  <textarea
                    value={formData.internal_notes || ''}
                    onChange={(e) => handleChange('internal_notes', e.target.value)}
                    placeholder="Any internal notes about this customer..."
                    rows={4}
                    className="w-full rounded-lg bg-white/[0.06] border border-white/[0.12] text-white text-sm px-3 py-2 placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 hover:bg-white/[0.08] hover:border-white/20 transition-colors resize-none"
                  />
                  <p className="text-xs text-white/50 mt-1.5">Only visible to you, not the customer</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/[0.06]">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              className="flex-1 bg-transparent text-emerald-400 border border-emerald-500 hover:shadow-[0_0_12px_rgba(16,185,129,0.7)]"
            >
              {isEdit ? 'Save Changes' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

