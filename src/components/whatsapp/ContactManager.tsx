'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import {
  Loader2, Plus, Search, CheckCircle, X, Phone, User,
  Clock, AlertTriangle, MessageCircle,
} from '@/components/ui/icons';
import { toast } from 'sonner';

// ============================================================================
// WhatsApp Contact Manager
// View, create, and manage WhatsApp contacts with opt-in status.
// ============================================================================

interface Contact {
  id: string;
  phone_number: string;
  wa_display_name: string | null;
  contact_type: string;
  opted_in: boolean;
  opted_in_at: string | null;
  service_window_expires: string | null;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  created_at: string;
}

export default function ContactManager() {
  const { companyId } = useAppContext();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newContact, setNewContact] = useState({
    phone_number: '',
    display_name: '',
    contact_type: 'other',
    opted_in: false,
  });

  useEffect(() => {
    loadContacts();
  }, [companyId]);

  async function loadContacts() {
    try {
      const res = await fetch('/api/whatsapp/contacts');
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch {
      // Table may not exist yet
    } finally {
      setLoading(false);
    }
  }

  async function handleAddContact() {
    if (!newContact.phone_number) return;
    setSaving(true);

    try {
      const res = await fetch('/api/whatsapp/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Contact added');
        setShowAddForm(false);
        setNewContact({ phone_number: '', display_name: '', contact_type: 'other', opted_in: false });
        loadContacts();
      } else {
        toast.error(data.error || 'Failed to add contact');
      }
    } catch {
      toast.error('Failed to add contact');
    } finally {
      setSaving(false);
    }
  }

  async function toggleOptIn(contact: Contact) {
    try {
      const res = await fetch('/api/whatsapp/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: contact.phone_number,
          display_name: contact.wa_display_name,
          contact_type: contact.contact_type,
          opted_in: !contact.opted_in,
        }),
      });

      if (res.ok) {
        toast.success(contact.opted_in ? 'Opt-in removed' : 'Contact opted in');
        loadContacts();
      } else {
        toast.error('Failed to update opt-in status');
      }
    } catch {
      toast.error('Failed to update contact');
    }
  }

  const filtered = contacts.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.phone_number.includes(q) ||
      (c.wa_display_name || '').toLowerCase().includes(q) ||
      c.contact_type.toLowerCase().includes(q)
    );
  });

  const optedInCount = contacts.filter(c => c.opted_in).length;
  const activeWindowCount = contacts.filter(c =>
    c.service_window_expires && new Date(c.service_window_expires) > new Date(),
  ).length;

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-theme-tertiary mx-auto mb-2" />
        <p className="text-theme-secondary text-sm">Loading contacts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-theme-surface border border-theme rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-theme-primary">{contacts.length}</p>
          <p className="text-xs text-theme-secondary">Total Contacts</p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{optedInCount}</p>
          <p className="text-xs text-theme-secondary">Opted In</p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{activeWindowCount}</p>
          <p className="text-xs text-theme-secondary">Active Windows</p>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone number..."
            className="w-full pl-10 pr-4 py-2 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Add Contact Form */}
      {showAddForm && (
        <div className="bg-theme-surface border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-semibold text-theme-primary">New Contact</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Phone Number *</label>
              <input
                type="tel"
                value={newContact.phone_number}
                onChange={(e) => setNewContact({ ...newContact, phone_number: e.target.value })}
                placeholder="+44 7700 900000"
                className="w-full px-3 py-2 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Display Name</label>
              <input
                type="text"
                value={newContact.display_name}
                onChange={(e) => setNewContact({ ...newContact, display_name: e.target.value })}
                placeholder="John Smith"
                className="w-full px-3 py-2 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1">Type</label>
              <select
                value={newContact.contact_type}
                onChange={(e) => setNewContact({ ...newContact, contact_type: e.target.value })}
                className="w-full px-3 py-2 bg-theme-button border border-theme rounded-lg text-sm text-theme-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="supplier">Supplier</option>
                <option value="contractor">Contractor</option>
                <option value="guest">Guest</option>
                <option value="staff">Staff</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="opted_in"
              checked={newContact.opted_in}
              onChange={(e) => setNewContact({ ...newContact, opted_in: e.target.checked })}
              className="w-4 h-4 rounded border-theme text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="opted_in" className="text-sm text-theme-secondary">
              Contact has given opt-in consent to receive WhatsApp messages
            </label>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleAddContact}
              disabled={saving || !newContact.phone_number}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              {saving ? 'Saving...' : 'Save Contact'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm font-medium text-theme-secondary hover:text-theme-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Contact List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-theme rounded-xl">
          <Phone className="w-8 h-8 text-theme-tertiary mx-auto mb-2" />
          <p className="text-sm text-theme-secondary">
            {search ? 'No contacts match your search' : 'No WhatsApp contacts yet'}
          </p>
        </div>
      ) : (
        <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-theme">
                <th className="text-left px-4 py-3 text-xs font-medium text-theme-secondary uppercase tracking-wider">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-theme-secondary uppercase tracking-wider hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-theme-secondary uppercase tracking-wider hidden md:table-cell">Service Window</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-theme-secondary uppercase tracking-wider">Opt-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {filtered.map(contact => {
                const hasActiveWindow = contact.service_window_expires &&
                  new Date(contact.service_window_expires) > new Date();
                const windowExpiry = contact.service_window_expires
                  ? new Date(contact.service_window_expires)
                  : null;

                return (
                  <tr key={contact.id} className="hover:bg-theme-hover transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-theme-primary truncate">
                            {contact.wa_display_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-theme-tertiary">{contact.phone_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-theme-muted text-theme-secondary capitalize">
                        {contact.contact_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {hasActiveWindow ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <Clock className="w-3 h-3" />
                          Expires {windowExpiry!.toLocaleString('en-GB', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      ) : (
                        <span className="text-xs text-theme-tertiary">Closed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleOptIn(contact)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          contact.opted_in
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                            : 'bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.1]'
                        }`}
                      >
                        {contact.opted_in ? (
                          <>
                            <CheckCircle className="w-3 h-3" /> Opted In
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" /> Not Opted In
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
