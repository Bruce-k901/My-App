'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Mail, Building2, Calendar, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Supplier {
  id: string;
  company_id: string;
  name: string;
  code?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    postcode?: string;
  };
  ordering_method?: 'phone' | 'email' | 'whatsapp' | 'portal' | 'rep';
  ordering_config?: {
    whatsapp_number?: string;
    portal_url?: string;
    rep_name?: string;
  };
  payment_terms_days?: number;
  minimum_order_value?: number;
  delivery_days?: number[];
  lead_time_days?: number;
  account_number?: string;
  is_active: boolean;
  is_approved: boolean;
}

const ORDERING_METHODS = [
  { label: 'Phone', value: 'phone' },
  { label: 'Email', value: 'email' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Portal', value: 'portal' },
  { label: 'Rep', value: 'rep' },
];

const DAYS_OF_WEEK = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

export default function SuppliersPage() {
  const { companyId } = useAppContext();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contact_name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    address_city: '',
    address_postcode: '',
    ordering_method: '',
    whatsapp_number: '',
    portal_url: '',
    rep_name: '',
    payment_terms_days: 30,
    minimum_order_value: '',
    delivery_days: [] as number[],
    lead_time_days: 1,
    account_number: '',
  });

  useEffect(() => {
    if (companyId) {
      fetchSuppliers();
    }
  }, [companyId]);

  async function fetchSuppliers() {
    try {
      setLoading(true);
      if (!companyId) return;

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingSupplier(null);
    setFormData({
      name: '',
      code: '',
      contact_name: '',
      email: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      address_city: '',
      address_postcode: '',
      ordering_method: '',
      whatsapp_number: '',
      portal_url: '',
      rep_name: '',
      payment_terms_days: 30,
      minimum_order_value: '',
      delivery_days: [],
      lead_time_days: 1,
      account_number: '',
    });
    setIsModalOpen(true);
  }

  function openEditModal(supplier: Supplier) {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      code: supplier.code || '',
      contact_name: supplier.contact_name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address_line1: supplier.address?.line1 || '',
      address_line2: supplier.address?.line2 || '',
      address_city: supplier.address?.city || '',
      address_postcode: supplier.address?.postcode || '',
      ordering_method: supplier.ordering_method || '',
      whatsapp_number: supplier.ordering_config?.whatsapp_number || '',
      portal_url: supplier.ordering_config?.portal_url || '',
      rep_name: supplier.ordering_config?.rep_name || '',
      payment_terms_days: supplier.payment_terms_days || 30,
      minimum_order_value: supplier.minimum_order_value?.toString() || '',
      delivery_days: supplier.delivery_days || [],
      lead_time_days: supplier.lead_time_days || 1,
      account_number: supplier.account_number || '',
    });
    setIsModalOpen(true);
  }

  function toggleDeliveryDay(day: number) {
    setFormData(prev => ({
      ...prev,
      delivery_days: prev.delivery_days.includes(day)
        ? prev.delivery_days.filter(d => d !== day)
        : [...prev.delivery_days, day].sort()
    }));
  }

  async function handleSave() {
    if (!companyId) {
      toast.error('Company ID not available');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    try {
      setSaving(true);

      const address = {
        line1: formData.address_line1 || undefined,
        line2: formData.address_line2 || undefined,
        city: formData.address_city || undefined,
        postcode: formData.address_postcode || undefined,
      };

      const ordering_config: any = {};
      if (formData.ordering_method === 'whatsapp' && formData.whatsapp_number) {
        ordering_config.whatsapp_number = formData.whatsapp_number;
      }
      if (formData.ordering_method === 'portal' && formData.portal_url) {
        ordering_config.portal_url = formData.portal_url;
      }
      if (formData.ordering_method === 'rep' && formData.rep_name) {
        ordering_config.rep_name = formData.rep_name;
      }

      const supplierData: any = {
        company_id: companyId,
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        contact_name: formData.contact_name.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: Object.keys(address).length > 0 ? address : null,
        ordering_method: formData.ordering_method || null,
        ordering_config: Object.keys(ordering_config).length > 0 ? ordering_config : null,
        payment_terms_days: formData.payment_terms_days || null,
        minimum_order_value: formData.minimum_order_value ? parseFloat(formData.minimum_order_value) : null,
        delivery_days: formData.delivery_days.length > 0 ? formData.delivery_days : null,
        lead_time_days: formData.lead_time_days || null,
        account_number: formData.account_number.trim() || null,
      };

      if (editingSupplier) {
        // Update existing supplier
        const { error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', editingSupplier.id);

        if (error) throw error;
        toast.success('Supplier updated successfully');
      } else {
        // Insert new supplier
        const { error } = await supabase
          .from('suppliers')
          .insert(supplierData)
          .select()
          .single();

        if (error) throw error;
        toast.success('Supplier added successfully');
      }

      setIsModalOpen(false);
      await fetchSuppliers();
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      toast.error(error.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(supplier: Supplier) {
    if (!confirm(`Are you sure you want to delete ${supplier.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: false })
        .eq('id', supplier.id);

      if (error) throw error;
      toast.success('Supplier deleted successfully');
      await fetchSuppliers();
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      toast.error('Failed to delete supplier');
    }
  }

  function formatDeliveryDays(days: number[] | null | undefined): string {
    if (!days || days.length === 0) return '—';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(d => dayNames[d]).join(', ');
  }

  function getOrderingMethodLabel(method: string | null | undefined): string {
    if (!method) return '—';
    return ORDERING_METHODS.find(m => m.value === method)?.label || method;
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-white">Loading suppliers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1220] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/stockly"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Suppliers</h1>
              <p className="text-slate-400 text-sm">Manage your supplier contacts and ordering information</p>
            </div>
          </div>
          <Button
            onClick={openAddModal}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Add Supplier
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              type="text"
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Suppliers List */}
        {filteredSuppliers.length === 0 ? (
          <div className="bg-white/[0.03] border border-neutral-800 rounded-xl p-12 text-center">
            <Building2 className="mx-auto text-slate-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchTerm ? 'No suppliers found' : 'No suppliers yet'}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Get started by adding your first supplier'}
            </p>
            {!searchTerm && (
              <Button onClick={openAddModal} variant="secondary">
                <Plus size={18} className="mr-2" />
                Add Supplier
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="bg-white/[0.03] border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{supplier.name}</h3>
                    {supplier.code && (
                      <p className="text-xs text-slate-400 mb-2">Code: {supplier.code}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(supplier)}
                      className="p-2 text-slate-400 hover:text-[#EC4899] transition-colors"
                      aria-label="Edit supplier"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(supplier)}
                      className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                      aria-label="Delete supplier"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {supplier.contact_name && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-slate-500">Contact:</span>
                      <span>{supplier.contact_name}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone size={14} className="text-slate-500" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Mail size={14} className="text-slate-500" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.ordering_method && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-slate-500">Ordering:</span>
                      <span>{getOrderingMethodLabel(supplier.ordering_method)}</span>
                    </div>
                  )}
                  {supplier.delivery_days && supplier.delivery_days.length > 0 && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Calendar size={14} className="text-slate-500" />
                      <span>{formatDeliveryDays(supplier.delivery_days)}</span>
                    </div>
                  )}
                  {supplier.payment_terms_days && (
                    <div className="text-slate-400 text-xs">
                      Payment terms: {supplier.payment_terms_days} days
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Supplier Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., ABC Foods Ltd"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Supplier Code</label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., ABC001"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Contact Name</label>
                  <Input
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Phone</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+44 20 1234 5678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@supplier.com"
                />
              </div>

              {/* Address */}
              <div className="border-t border-neutral-800 pt-4">
                <h3 className="text-sm font-semibold text-white mb-3">Address</h3>
                <div className="space-y-3">
                  <Input
                    value={formData.address_line1}
                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                    placeholder="Address Line 1"
                  />
                  <Input
                    value={formData.address_line2}
                    onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                    placeholder="Address Line 2"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={formData.address_city}
                      onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                      placeholder="City"
                    />
                    <Input
                      value={formData.address_postcode}
                      onChange={(e) => setFormData({ ...formData, address_postcode: e.target.value })}
                      placeholder="Postcode"
                    />
                  </div>
                </div>
              </div>

              {/* Ordering Method */}
              <div className="border-t border-neutral-800 pt-4">
                <h3 className="text-sm font-semibold text-white mb-3">Ordering</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Ordering Method</label>
                    <Select
                      value={formData.ordering_method}
                      onValueChange={(val) => setFormData({ ...formData, ordering_method: val })}
                      options={ORDERING_METHODS}
                      placeholder="Select method"
                    />
                  </div>

                  {formData.ordering_method === 'whatsapp' && (
                    <Input
                      value={formData.whatsapp_number}
                      onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                      placeholder="WhatsApp number (e.g., +447123456789)"
                    />
                  )}

                  {formData.ordering_method === 'portal' && (
                    <Input
                      value={formData.portal_url}
                      onChange={(e) => setFormData({ ...formData, portal_url: e.target.value })}
                      placeholder="Portal URL"
                    />
                  )}

                  {formData.ordering_method === 'rep' && (
                    <Input
                      value={formData.rep_name}
                      onChange={(e) => setFormData({ ...formData, rep_name: e.target.value })}
                      placeholder="Representative name"
                    />
                  )}
                </div>
              </div>

              {/* Delivery Days */}
              <div className="border-t border-neutral-800 pt-4">
                <label className="block text-sm text-slate-300 mb-2">Delivery Days</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDeliveryDay(day.value)}
                      className={`p-2 rounded text-sm transition-colors ${
                        formData.delivery_days.includes(day.value)
                          ? 'bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]'
                          : 'bg-white/[0.06] text-slate-300 border border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment & Terms */}
              <div className="border-t border-neutral-800 pt-4">
                <h3 className="text-sm font-semibold text-white mb-3">Payment & Terms</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Payment Terms (days)</label>
                    <Input
                      type="number"
                      value={formData.payment_terms_days}
                      onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) || 30 })}
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Min Order Value</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.minimum_order_value}
                      onChange={(e) => setFormData({ ...formData, minimum_order_value: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Lead Time (days)</label>
                    <Input
                      type="number"
                      value={formData.lead_time_days}
                      onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || 1 })}
                      min="0"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm text-slate-300 mb-1">Account Number</label>
                  <Input
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="Your account number with supplier"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-neutral-800">
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.name.trim()}
                  variant="secondary"
                  className="flex-1"
                >
                  {saving ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Add Supplier'}
                </Button>
                <Button
                  onClick={() => setIsModalOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

