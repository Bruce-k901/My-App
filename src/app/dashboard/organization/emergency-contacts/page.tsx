"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit, Trash2, Phone, Mail, User, AlertCircle, Wrench, Building2 } from '@/components/ui/icons';
import { toast } from 'sonner';

interface EmergencyContact {
  id: string;
  company_id: string;
  site_id?: string | null;
  contact_type: 'first_aider' | 'manager' | 'emergency_services' | 'utility' | 'other';
  name: string;
  phone_number: string;
  email?: string | null;
  role_title?: string | null;
  notes?: string | null;
  display_order: number;
  is_active: boolean;
  language: string;
  created_at: string;
  updated_at: string;
}

const CONTACT_TYPE_LABELS = {
  first_aider: 'First Aider',
  manager: 'Manager',
  emergency_services: 'Emergency Services',
  utility: 'Utility Emergency',
  other: 'Other'
};

const CONTACT_TYPE_ICONS = {
  first_aider: AlertCircle,
  manager: User,
  emergency_services: AlertCircle,
  utility: Wrench,
  other: Building2
};

export default function EmergencyContactsPage() {
  const { profile, companyId, company } = useAppContext();
  
  // Use selected company from context (for multi-company support)
  const effectiveCompanyId = company?.id || companyId || profile?.company_id;
  
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [formData, setFormData] = useState<Partial<EmergencyContact>>({
    contact_type: 'first_aider',
    name: '',
    phone_number: '',
    email: '',
    role_title: '',
    notes: '',
    display_order: 0,
    is_active: true,
    language: 'en'
  });

  const loadContacts = useCallback(async () => {
    if (!effectiveCompanyId) {
      console.warn('No companyId available for loading emergency contacts');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Supabase error loading emergency contacts:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      setContacts(data || []);
    } catch (err: any) {
      console.error('Error loading emergency contacts:', {
        error: err,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        companyId
      });
      
      const errorMessage = err?.message || err?.details || 'Failed to load emergency contacts';
      toast.error(errorMessage);
      
      // If table doesn't exist, show helpful message
      if (err?.code === '42P01' || err?.message?.includes('does not exist')) {
        console.error('The emergency_contacts table does not exist. Please run the migration: 20251113164000_create_emergency_contacts_table.sql');
      }
    } finally {
      setLoading(false);
    }
  }, [effectiveCompanyId]);

  useEffect(() => {
    if (effectiveCompanyId) {
      loadContacts();
    } else {
      setLoading(false);
      setContacts([]);
    }
  }, [effectiveCompanyId, loadContacts]);

  const handleSave = async () => {
    if (!companyId) return;
    if (!formData.name || !formData.phone_number) {
      toast.error('Name and phone number are required');
      return;
    }

    try {
      if (editingContact) {
        // Update existing
        const { error } = await supabase
          .from('emergency_contacts')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingContact.id);

        if (error) throw error;
        toast.success('Contact updated successfully');
      } else {
        // Create new
        const { error } = await supabase
          .from('emergency_contacts')
          .insert({
            ...formData,
            company_id: effectiveCompanyId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
        toast.success('Contact added successfully');
      }

      setIsModalOpen(false);
      setEditingContact(null);
      setFormData({
        contact_type: 'first_aider',
        name: '',
        phone_number: '',
        email: '',
        role_title: '',
        notes: '',
        display_order: 0,
        is_active: true,
        language: 'en'
      });
      loadContacts();
    } catch (err: any) {
      console.error('Error saving contact:', err);
      toast.error(err.message || 'Failed to save contact');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Contact deleted successfully');
      loadContacts();
    } catch (err: any) {
      console.error('Error deleting contact:', err);
      toast.error(err.message || 'Failed to delete contact');
    }
  };

  const handleEdit = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setFormData(contact);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingContact(null);
    setFormData({
      contact_type: 'first_aider',
      name: '',
      phone_number: '',
      email: '',
      role_title: '',
      notes: '',
      display_order: contacts.length,
      is_active: true,
      language: 'en'
    });
    setIsModalOpen(true);
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !searchQuery || 
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone_number.includes(searchQuery) ||
      contact.role_title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || contact.contact_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-theme-tertiary">Loading emergency contacts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Emergency Contacts</h1>
          <p className="text-theme-tertiary mt-1">Manage emergency contact information for display on notice boards</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-[0_0_12px_rgba(var(--module-fg),0.7)] rounded-lg transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-tertiary" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-theme-primary placeholder-white/40 focus:outline-none focus:border-module-fg/[0.50]"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-theme-primary focus:outline-none focus:border-module-fg/[0.50]"
        >
          <option value="all">All Types</option>
          {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Contacts List */}
      <div className="grid gap-4">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12 text-theme-tertiary">
            {searchQuery || filterType !== 'all' 
              ? 'No contacts match your search' 
              : 'No emergency contacts yet. Click "Add Contact" to get started.'}
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const Icon = CONTACT_TYPE_ICONS[contact.contact_type];
            return (
              <div
                key={contact.id}
                className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 bg-module-fg/[0.15] rounded-lg">
                      <Icon className="w-5 h-5 text-module-fg" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-theme-primary font-semibold">{contact.name}</h3>
                        <span className="text-xs px-2 py-0.5 bg-white/[0.1] text-theme-tertiary rounded">
                          {CONTACT_TYPE_LABELS[contact.contact_type]}
                        </span>
                        {contact.role_title && (
                          <span className="text-sm text-theme-tertiary">• {contact.role_title}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-theme-tertiary">
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          <a href={`tel:${contact.phone_number}`} className="hover:text-white transition-colors">
                            {contact.phone_number}
                          </a>
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            <a href={`mailto:${contact.email}`} className="hover:text-white transition-colors">
                              {contact.email}
                            </a>
                          </div>
                        )}
                      </div>
                      {contact.notes && (
                        <p className="text-sm text-theme-tertiary mt-2">{contact.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(contact)}
                      className="p-2 hover:bg-white/[0.1] rounded-lg transition-colors"
                      title="Edit contact"
                    >
                      <Edit className="w-4 h-4 text-theme-tertiary" />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete contact"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[rgb(var(--surface-elevated))] border border-white/[0.1] rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-theme-primary mb-4">
              {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Contact Type</label>
                <select
                  value={formData.contact_type}
                  onChange={(e) => setFormData({ ...formData, contact_type: e.target.value as any })}
                  className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-theme-primary focus:outline-none focus:border-module-fg/[0.50]"
                >
                  {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-theme-primary placeholder-white/40 focus:outline-none focus:border-module-fg/[0.50]"
                  placeholder="John Smith"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-theme-primary placeholder-white/40 focus:outline-none focus:border-module-fg/[0.50]"
                  placeholder="+44 123 456 7890"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-theme-primary placeholder-white/40 focus:outline-none focus:border-module-fg/[0.50]"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Role/Title</label>
                <input
                  type="text"
                  value={formData.role_title || ''}
                  onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                  className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-theme-primary placeholder-white/40 focus:outline-none focus:border-module-fg/[0.50]"
                  placeholder="e.g., First Aider, Site Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-theme-primary placeholder-white/40 focus:outline-none focus:border-module-fg/[0.50]"
                  placeholder="Additional information..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Display Order</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-theme-primary placeholder-white/40 focus:outline-none focus:border-module-fg/[0.50]"
                  min="0"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-white/[0.2] bg-white/[0.06]"
                />
                <label htmlFor="is_active" className="text-sm text-theme-secondary">Active</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-[0_0_12px_rgba(var(--module-fg),0.7)] rounded-lg transition-all duration-200"
              >
                {editingContact ? 'Update' : 'Add'} Contact
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingContact(null);
                  setFormData({
                    contact_type: 'first_aider',
                    name: '',
                    phone_number: '',
                    email: '',
                    role_title: '',
                    notes: '',
                    display_order: 0,
                    is_active: true,
                    language: 'en'
                  });
                }}
                className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-theme-primary rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

