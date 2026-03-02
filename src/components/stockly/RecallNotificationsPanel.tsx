// @salsa - SALSA Compliance: Track customer notifications for a recall
'use client';

import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import {
  Plus,
  Loader2,
  CheckCircle,
  Clock,
  Phone,
} from '@/components/ui/icons';
import type { RecallNotification } from '@/lib/types/stockly';

interface RecallNotificationsPanelProps {
  recallId: string;
  notifications: RecallNotification[];
  onUpdated: () => void;
}

const METHOD_LABELS: Record<string, string> = {
  phone: 'Phone',
  email: 'Email',
  in_person: 'In Person',
  letter: 'Letter',
  other: 'Other',
};

export default function RecallNotificationsPanel({ recallId, notifications, onUpdated }: RecallNotificationsPanelProps) {
  const { companyId, userId } = useAppContext();
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [method, setMethod] = useState<string>('phone');
  const [responseNotes, setResponseNotes] = useState('');

  // @salsa — Add notification record
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch(`/api/stockly/recalls/${recallId}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: companyId,
        customer_name: customerName,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        notification_method: method,
        notified_by: userId,
        response_notes: responseNotes || null,
      }),
    });

    if (res.ok) {
      setCustomerName('');
      setContactEmail('');
      setContactPhone('');
      setMethod('phone');
      setResponseNotes('');
      setAdding(false);
      onUpdated();
    }
    setSubmitting(false);
  }

  const notifiedCount = notifications.filter(n => n.notified_at).length;
  const respondedCount = notifications.filter(n => n.response_received).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-theme-primary flex items-center gap-2">
          <Phone className="w-4 h-4 text-stockly-dark dark:text-stockly" />
          Customer Notifications ({notifiedCount}/{notifications.length} notified, {respondedCount} responded)
        </h3>
        <Button variant="outline" size="sm" onClick={() => setAdding(!adding)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Notification
        </Button>
      </div>

      {/* Add notification form */}
      {adding && (
        <form onSubmit={handleSubmit} className="bg-theme-surface-elevated rounded-lg p-4 space-y-3 border border-theme">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded border border-theme bg-theme-surface text-theme-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-theme bg-theme-surface text-theme-primary text-sm"
              >
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="in_person">In Person</option>
                <option value="letter">Letter</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-theme bg-theme-surface text-theme-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-theme bg-theme-surface text-theme-primary text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-secondary mb-1">Notes</label>
            <input
              type="text"
              value={responseNotes}
              onChange={(e) => setResponseNotes(e.target.value)}
              placeholder="Response or notes..."
              className="w-full px-3 py-1.5 rounded border border-theme bg-theme-surface text-theme-primary text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting || !customerName}>
              {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Record Notification
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <p className="text-sm text-theme-tertiary py-4 text-center">No notifications recorded yet</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className="flex items-center justify-between p-3 bg-theme-surface-elevated rounded-lg border border-theme">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-theme-primary">{n.customer_name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-theme-surface text-theme-tertiary">
                    {METHOD_LABELS[n.notification_method || ''] || n.notification_method || 'Unknown'}
                  </span>
                  {n.response_received ? (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Responded
                    </span>
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Awaiting
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-theme-tertiary">
                  {n.contact_email && <span>{n.contact_email}</span>}
                  {n.contact_phone && <span>{n.contact_phone}</span>}
                  {n.notified_at && <span>Notified: {new Date(n.notified_at).toLocaleDateString('en-GB')}</span>}
                </div>
                {n.response_notes && <p className="text-xs text-theme-secondary mt-1">{n.response_notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
