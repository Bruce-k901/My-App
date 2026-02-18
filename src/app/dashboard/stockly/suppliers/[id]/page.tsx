// @salsa - SALSA Compliance: Supplier detail page with Overview, Documents, Approval History tabs
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Building2, Phone, Mail, Calendar, Clock, Save, Plus, FileText, ShieldCheck, History } from '@/components/ui/icons';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import TimePicker from '@/components/ui/TimePicker';
import { toast } from 'sonner';
import SupplierApprovalPanel, { ApprovalStatusBadge, RiskRatingBadge } from '@/components/stockly/SupplierApprovalPanel';
import SupplierApprovalHistory from '@/components/stockly/SupplierApprovalHistory';
import SupplierDocumentUpload from '@/components/stockly/SupplierDocumentUpload';
import SupplierDocumentList from '@/components/stockly/SupplierDocumentList';
import type { Supplier, SupplierDocument, SupplierApprovalLog, SupplierApprovalStatus, RiskRating } from '@/lib/types/stockly';

// @salsa
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

type Tab = 'overview' | 'documents' | 'approval';

export default function SupplierDetailPage() {
  const { companyId } = useAppContext();
  const router = useRouter();
  const params = useParams();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [documents, setDocuments] = useState<SupplierDocument[]>([]);
  const [approvalLog, setApprovalLog] = useState<SupplierApprovalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Form state for Overview tab editing
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
    order_cutoff_time: '14:00',
    account_number: '',
  });

  // @salsa — Fetch supplier data
  const fetchSupplier = useCallback(async () => {
    if (!supplierId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/stockly/suppliers/${supplierId}`);
      const result = await res.json();

      if (!result.success || !result.data) {
        toast.error('Supplier not found');
        router.push('/dashboard/stockly/suppliers');
        return;
      }

      const s = result.data;
      setSupplier(s);
      setDocuments(s.documents || []);
      setApprovalLog(s.approval_log || []);

      // Populate form
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const deliveryDaysNumbers = s.delivery_days?.length > 0
        ? s.delivery_days.map((d: string) => dayNames.indexOf(d.toLowerCase())).filter((d: number) => d !== -1)
        : [];

      setFormData({
        name: s.name || '',
        code: s.code || '',
        contact_name: s.contact_name || '',
        email: s.email || '',
        phone: s.phone || '',
        address_line1: s.address?.line1 || '',
        address_line2: s.address?.line2 || '',
        address_city: s.address?.city || '',
        address_postcode: s.address?.postcode || '',
        ordering_method: s.ordering_method || '',
        whatsapp_number: s.ordering_config?.whatsapp_number || '',
        portal_url: s.ordering_config?.portal_url || '',
        rep_name: s.ordering_config?.rep_name || '',
        payment_terms_days: s.payment_terms_days || 30,
        minimum_order_value: s.minimum_order_value?.toString() || '',
        delivery_days: deliveryDaysNumbers,
        lead_time_days: s.lead_time_days || 1,
        order_cutoff_time: s.order_cutoff_time || '14:00',
        account_number: s.account_number || '',
      });
    } catch (err) {
      toast.error('Failed to load supplier');
    } finally {
      setLoading(false);
    }
  }, [supplierId, router]);

  useEffect(() => {
    fetchSupplier();
  }, [fetchSupplier]);

  function toggleDeliveryDay(day: number) {
    setFormData(prev => ({
      ...prev,
      delivery_days: prev.delivery_days.includes(day)
        ? prev.delivery_days.filter(d => d !== day)
        : [...prev.delivery_days, day].sort()
    }));
  }

  // @salsa — Save supplier details
  async function handleSave() {
    if (!formData.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    setSaving(true);
    try {
      const address = {
        line1: formData.address_line1 || undefined,
        line2: formData.address_line2 || undefined,
        city: formData.address_city || undefined,
        postcode: formData.address_postcode || undefined,
      };

      const ordering_config: Record<string, string> = {};
      if (formData.ordering_method === 'whatsapp' && formData.whatsapp_number) {
        ordering_config.whatsapp_number = formData.whatsapp_number;
      }
      if (formData.ordering_method === 'portal' && formData.portal_url) {
        ordering_config.portal_url = formData.portal_url;
      }
      if (formData.ordering_method === 'rep' && formData.rep_name) {
        ordering_config.rep_name = formData.rep_name;
      }

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const deliveryDaysText = formData.delivery_days.length > 0
        ? formData.delivery_days.map(day => dayNames[day])
        : null;

      const res = await fetch(`/api/stockly/suppliers/${supplierId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim() || null,
          contact_name: formData.contact_name.trim() || null,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          address: Object.values(address).some(v => v) ? address : null,
          ordering_method: formData.ordering_method || null,
          ordering_config: Object.keys(ordering_config).length > 0 ? ordering_config : null,
          payment_terms_days: formData.payment_terms_days || null,
          minimum_order_value: formData.minimum_order_value ? parseFloat(formData.minimum_order_value) : null,
          delivery_days: deliveryDaysText,
          lead_time_days: formData.lead_time_days || null,
          order_cutoff_time: formData.order_cutoff_time || '14:00',
          account_number: formData.account_number.trim() || null,
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast.success('Supplier updated');
      fetchSupplier();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-secondary">Loading supplier...</div>
      </div>
    );
  }

  if (!supplier) return null;

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: Building2 },
    { key: 'documents', label: `Documents (${documents.length})`, icon: FileText },
    { key: 'approval', label: 'Approval', icon: ShieldCheck },
  ];

  return (
    <div className="w-full bg-theme-surface-elevated min-h-screen">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link
              href="/dashboard/stockly/suppliers"
              className="p-2 rounded-lg bg-theme-surface hover:bg-theme-muted border border-theme text-theme-secondary hover:text-theme-primary transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-theme-primary flex items-center gap-2">
                {supplier.name}
                {supplier.code && <span className="text-sm font-normal text-theme-tertiary">({supplier.code})</span>}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <ApprovalStatusBadge status={supplier.approval_status as SupplierApprovalStatus} />
                <RiskRatingBadge rating={supplier.risk_rating as RiskRating} />
              </div>
            </div>
          </div>

          {activeTab === 'overview' && (
            <Button onClick={handleSave} disabled={saving} variant="secondary">
              <Save className="w-4 h-4 mr-1.5" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          )}
          {activeTab === 'documents' && (
            <Button onClick={() => setIsUploadOpen(true)} variant="secondary">
              <Plus className="w-4 h-4 mr-1.5" />
              Upload
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-theme-surface border border-theme rounded-xl p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-theme-button text-theme-primary shadow-sm'
                    : 'text-theme-tertiary hover:text-theme-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="bg-theme-surface border border-theme rounded-xl p-5">
              <h3 className="text-sm font-semibold text-theme-primary mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-theme-secondary mb-1">Supplier Name *</label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-theme-secondary mb-1">Supplier Code</label>
                  <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-theme-surface border border-theme rounded-xl p-5">
              <h3 className="text-sm font-semibold text-theme-primary mb-4">Contact Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-theme-secondary mb-1">Contact Name</label>
                  <Input value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-theme-secondary mb-1">Phone</label>
                  <Input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-theme-secondary mb-1">Email</label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>

              {/* Address */}
              <div className="mt-4 pt-4 border-t border-theme">
                <h4 className="text-xs font-medium text-theme-tertiary mb-3 uppercase tracking-wider">Address</h4>
                <div className="space-y-3">
                  <Input value={formData.address_line1} onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })} placeholder="Address Line 1" />
                  <Input value={formData.address_line2} onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })} placeholder="Address Line 2" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={formData.address_city} onChange={(e) => setFormData({ ...formData, address_city: e.target.value })} placeholder="City" />
                    <Input value={formData.address_postcode} onChange={(e) => setFormData({ ...formData, address_postcode: e.target.value })} placeholder="Postcode" />
                  </div>
                </div>
              </div>
            </div>

            {/* Ordering */}
            <div className="bg-theme-surface border border-theme rounded-xl p-5">
              <h3 className="text-sm font-semibold text-theme-primary mb-4">Ordering & Delivery</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-theme-secondary mb-1">Ordering Method</label>
                  <Select
                    value={formData.ordering_method}
                    onValueChange={(val) => setFormData({ ...formData, ordering_method: val })}
                    options={ORDERING_METHODS}
                    placeholder="Select method"
                  />
                </div>

                {formData.ordering_method === 'whatsapp' && (
                  <Input value={formData.whatsapp_number} onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })} placeholder="WhatsApp number" />
                )}
                {formData.ordering_method === 'portal' && (
                  <Input value={formData.portal_url} onChange={(e) => setFormData({ ...formData, portal_url: e.target.value })} placeholder="Portal URL" />
                )}
                {formData.ordering_method === 'rep' && (
                  <Input value={formData.rep_name} onChange={(e) => setFormData({ ...formData, rep_name: e.target.value })} placeholder="Representative name" />
                )}

                <div>
                  <label className="block text-sm text-theme-secondary mb-2">Delivery Days</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDeliveryDay(day.value)}
                        className={`p-2 rounded text-sm transition-colors ${
                          formData.delivery_days.includes(day.value)
                            ? 'bg-emerald-50 dark:bg-module-fg/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500'
                            : 'bg-white dark:bg-white/[0.06] text-theme-secondary border border-theme hover:border-module-fg/30'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment & Terms */}
            <div className="bg-theme-surface border border-theme rounded-xl p-5">
              <h3 className="text-sm font-semibold text-theme-primary mb-4">Payment & Terms</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-theme-secondary mb-1">Payment Terms (days)</label>
                  <Input type="number" value={formData.payment_terms_days} onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) || 30 })} min="0" />
                </div>
                <div>
                  <label className="block text-sm text-theme-secondary mb-1">Min Order Value</label>
                  <Input type="number" step="0.01" value={formData.minimum_order_value} onChange={(e) => setFormData({ ...formData, minimum_order_value: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm text-theme-secondary mb-1">Lead Time (days)</label>
                  <Input type="number" value={formData.lead_time_days} onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || 1 })} min="0" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-sm text-theme-secondary mb-1">Order Cutoff Time</label>
                  <TimePicker
                    id="order-cutoff-time"
                    name="order_cutoff_time"
                    value={formData.order_cutoff_time}
                    onChange={(value) => setFormData({ ...formData, order_cutoff_time: value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-theme-secondary mb-1">Account Number</label>
                  <Input value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} placeholder="Your account number with supplier" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-4">
            <SupplierDocumentList documents={documents} onRefresh={fetchSupplier} />
            <SupplierDocumentUpload
              isOpen={isUploadOpen}
              onClose={() => setIsUploadOpen(false)}
              supplierId={supplierId}
              companyId={companyId}
              onUploaded={fetchSupplier}
            />
          </div>
        )}

        {activeTab === 'approval' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SupplierApprovalPanel
              supplierId={supplierId}
              approvalStatus={(supplier.approval_status || 'pending') as SupplierApprovalStatus}
              riskRating={(supplier.risk_rating || 'medium') as RiskRating}
              nextReviewDate={supplier.next_review_date || null}
              approvedAt={supplier.approved_at || null}
              onUpdated={fetchSupplier}
            />
            <div className="bg-theme-surface border border-theme rounded-xl p-5">
              <h3 className="text-sm font-semibold text-theme-primary mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-theme-tertiary" />
                Approval History
              </h3>
              <SupplierApprovalHistory log={approvalLog} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
