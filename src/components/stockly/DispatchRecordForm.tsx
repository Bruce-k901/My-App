// @salsa - SALSA Compliance: Quick form to record batch dispatch to a customer
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Loader2, Truck } from '@/components/ui/icons';

interface DispatchRecordFormProps {
  stockBatchId: string;
  stockBatchCode: string;
  unit?: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function DispatchRecordForm({ stockBatchId, stockBatchCode, unit, onClose, onSaved }: DispatchRecordFormProps) {
  const { companyId, siteId, userId } = useAppContext();
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('');
  const [deliveryNoteRef, setDeliveryNoteRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // @salsa — Customer suggestions
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [showCustomers, setShowCustomers] = useState(false);

  useEffect(() => {
    if (!customerName || customerName.length < 2 || !companyId) {
      setCustomers([]);
      return;
    }

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('planly_customers')
        .select('id, name')
        .eq('company_id', companyId)
        .ilike('name', `%${customerName}%`)
        .limit(8);

      setCustomers(data || []);
      setShowCustomers(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [customerName, companyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !quantity || !customerName) return;

    setSubmitting(true);

    const res = await fetch('/api/stockly/dispatch-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: companyId,
        site_id: siteId && siteId !== 'all' ? siteId : null,
        stock_batch_id: stockBatchId,
        customer_id: customerId,
        customer_name: customerName,
        dispatch_date: dispatchDate,
        quantity: parseFloat(quantity),
        unit: unit || null,
        delivery_note_reference: deliveryNoteRef || null,
        created_by: userId,
      }),
    });

    if (res.ok) {
      onSaved?.();
      onClose();
    }
    setSubmitting(false);
  }

  return (
    <div className="bg-theme-surface-elevated rounded-lg p-4 border border-theme space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Truck className="w-4 h-4 text-stockly-dark dark:text-stockly" />
        <h3 className="text-sm font-medium text-theme-primary">Record Dispatch — {stockBatchCode}</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Customer */}
        <div className="relative">
          <label className="block text-xs font-medium text-theme-secondary mb-1">Customer</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => { setCustomerName(e.target.value); setCustomerId(null); }}
            onFocus={() => customers.length > 0 && setShowCustomers(true)}
            required
            placeholder="Search customer..."
            className="w-full px-3 py-1.5 rounded border border-theme bg-theme-surface text-theme-primary text-sm"
          />
          {showCustomers && customers.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-theme-surface border border-theme rounded shadow-lg max-h-40 overflow-y-auto">
              {customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setCustomerName(c.name); setCustomerId(c.id); setShowCustomers(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-theme-surface-elevated text-sm text-theme-primary"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">Dispatch Date</label>
            <input
              type="date"
              value={dispatchDate}
              onChange={(e) => setDispatchDate(e.target.value)}
              required
              className="w-full px-3 py-1.5 rounded border border-theme bg-theme-surface text-theme-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">Quantity</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="flex-1 px-3 py-1.5 rounded border border-theme bg-theme-surface text-theme-primary text-sm"
              />
              {unit && <span className="text-xs text-theme-tertiary">{unit}</span>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">Delivery Note Ref</label>
            <input
              type="text"
              value={deliveryNoteRef}
              onChange={(e) => setDeliveryNoteRef(e.target.value)}
              placeholder="DN-001"
              className="w-full px-3 py-1.5 rounded border border-theme bg-theme-surface text-theme-primary text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={submitting || !customerName || !quantity}>
            {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Record Dispatch
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
