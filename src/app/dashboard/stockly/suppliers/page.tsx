// @salsa - SALSA Compliance: Supplier list page (card click → detail page, approval badges, status filter)
'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Phone, Mail, Building2, Calendar, Clock, ArrowLeft, ChevronRight, Loader2, AlertTriangle, Check, Layers } from '@/components/ui/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApprovalStatusBadge, RiskRatingBadge } from '@/components/stockly/SupplierApprovalPanel';
import { mergeSuppliers } from '@/lib/utils/supplierMerge';
import type { Supplier, SupplierApprovalStatus, RiskRating } from '@/lib/types/stockly';

// @salsa
const ORDERING_METHODS = [
  { label: 'Phone', value: 'phone' },
  { label: 'Email', value: 'email' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Portal', value: 'portal' },
  { label: 'Rep', value: 'rep' },
];

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Approved', value: 'approved' },
  { label: 'Conditional', value: 'conditional' },
  { label: 'Pending', value: 'pending' },
  { label: 'Suspended', value: 'suspended' },
];

export default function SuppliersPage() {
  const { companyId } = useAppContext();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  // Merge state
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [canonicalId, setCanonicalId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

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

  // @salsa — Quick-add supplier then navigate to detail page
  async function handleAdd() {
    if (!companyId || !newName.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          company_id: companyId,
          name: newName.trim(),
          code: newCode.trim() || null,
          approval_status: 'pending',
          risk_rating: 'medium',
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Supplier created');
      setIsAddOpen(false);
      setNewName('');
      setNewCode('');
      router.push(`/dashboard/stockly/suppliers/${data.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create supplier');
    } finally {
      setSaving(false);
    }
  }

  function formatDeliveryDays(days: string[] | null | undefined): string {
    if (!days || days.length === 0) return '';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesFull = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days.map(d => {
      const index = dayNamesFull.indexOf(d.toLowerCase());
      return index !== -1 ? dayNames[index] : d;
    }).join(', ');
  }

  function getOrderingMethodLabel(method: string | null | undefined): string {
    if (!method) return '';
    return ORDERING_METHODS.find(m => m.value === method)?.label || method;
  }

  // @salsa — Filter by search + status
  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = !searchTerm ||
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      (supplier.approval_status || 'pending') === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function toggleMergeSelection(id: string) {
    setSelectedForMerge(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openMergeDialog() {
    if (selectedForMerge.size < 2) {
      toast.error('Select at least 2 suppliers to merge');
      return;
    }
    // Default canonical = first selected
    const firstSelected = Array.from(selectedForMerge)[0];
    setCanonicalId(firstSelected);
    setIsMergeOpen(true);
  }

  async function handleMerge() {
    if (!canonicalId || !companyId) return;
    const mergeIds = Array.from(selectedForMerge).filter(id => id !== canonicalId);
    if (mergeIds.length === 0) {
      toast.error('Select at least one supplier to merge into the canonical one');
      return;
    }

    setMerging(true);
    try {
      const result = await mergeSuppliers(canonicalId, mergeIds, companyId);
      if (result.success) {
        toast.success(`Merged successfully. ${result.updatedRecords} records updated.`);
        setIsMergeOpen(false);
        setMergeMode(false);
        setSelectedForMerge(new Set());
        setCanonicalId(null);
        fetchSuppliers();
      } else {
        toast.error(result.error || 'Merge failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Merge failed');
    } finally {
      setMerging(false);
    }
  }

  const selectedSuppliers = suppliers.filter(s => selectedForMerge.has(s.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-secondary">Loading suppliers...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link
              href="/dashboard/stockly"
              className="p-2 rounded-lg bg-theme-surface hover:bg-theme-muted border border-theme text-theme-secondary hover:text-theme-primary transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-theme-primary flex items-center gap-2 sm:gap-3">
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-module-fg flex-shrink-0" />
                Suppliers
              </h1>
              <p className="text-theme-secondary text-xs sm:text-sm mt-1">Manage your supplier contacts and ordering information</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/stockly/suppliers/approved-list"
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-theme-secondary hover:text-theme-primary border border-theme rounded-lg hover:bg-theme-surface transition-colors"
            >
              Approved List
            </Link>
            {mergeMode ? (
              <>
                <button
                  onClick={openMergeDialog}
                  disabled={selectedForMerge.size < 2}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Layers className="w-4 h-4" />
                  <span>Merge ({selectedForMerge.size})</span>
                </button>
                <button
                  onClick={() => { setMergeMode(false); setSelectedForMerge(new Set()); }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-theme text-theme-secondary hover:text-theme-primary rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setMergeMode(true)}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-theme-secondary hover:text-theme-primary border border-theme rounded-lg hover:bg-theme-surface transition-colors"
                >
                  <Layers className="w-4 h-4" />
                  Merge Suppliers
                </button>
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow rounded-lg transition-all duration-200 ease-in-out text-sm flex-shrink-0"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Add Supplier</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search + Filter */}
        <div className="bg-theme-surface border border-theme rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-tertiary" size={18} />
              <Input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* @salsa — Status filter pills */}
            <div className="flex gap-1 flex-wrap">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === filter.value
                      ? 'bg-module-fg/20 text-module-fg border border-module-fg/30'
                      : 'bg-theme-button text-theme-tertiary border border-theme hover:text-theme-secondary'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Suppliers List */}
        {filteredSuppliers.length === 0 ? (
          <div className="bg-theme-surface border border-theme rounded-xl p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-4" />
            <h3 className="text-theme-primary font-medium mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No suppliers found' : 'No suppliers yet'}
            </h3>
            <p className="text-theme-secondary text-sm mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first supplier'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => setIsAddOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow rounded-lg transition-all duration-200 ease-in-out"
              >
                <Plus className="w-4 h-4" />
                Add Supplier
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((supplier) => {
              const isSelected = selectedForMerge.has(supplier.id);
              const CardWrapper = mergeMode ? 'div' : Link;
              const cardProps = mergeMode
                ? {
                    onClick: () => toggleMergeSelection(supplier.id),
                    className: `bg-theme-surface border rounded-xl p-5 hover:bg-theme-hover transition-colors group cursor-pointer block ${
                      isSelected ? 'border-amber-500 ring-1 ring-amber-500/30' : 'border-theme'
                    }`,
                  }
                : {
                    href: `/dashboard/stockly/suppliers/${supplier.id}`,
                    className: 'bg-theme-surface border border-theme rounded-xl p-5 hover:bg-theme-hover hover:border-module-fg/30 dark:hover:border-module-fg/30 transition-colors group cursor-pointer block',
                  };

              return (
              <CardWrapper
                key={supplier.id}
                {...(cardProps as any)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {mergeMode && (
                      <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? 'bg-amber-500 border-amber-500' : 'border-theme'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-theme-primary mb-1 truncate">{supplier.name}</h3>
                      {supplier.code && (
                        <p className="text-xs text-theme-tertiary">Code: {supplier.code}</p>
                      )}
                    </div>
                  </div>
                  {!mergeMode && (
                    <ChevronRight className="w-5 h-5 text-theme-tertiary group-hover:text-module-fg transition-colors flex-shrink-0 mt-1" />
                  )}
                </div>

                {/* @salsa — Approval badges */}
                <div className="flex items-center gap-2 mb-3">
                  <ApprovalStatusBadge status={supplier.approval_status as SupplierApprovalStatus} />
                  <RiskRatingBadge rating={supplier.risk_rating as RiskRating} />
                </div>

                <div className="space-y-1.5 text-sm">
                  {supplier.contact_name && (
                    <div className="flex items-center gap-2 text-theme-secondary">
                      <span className="text-theme-tertiary">Contact:</span>
                      <span>{supplier.contact_name}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-theme-secondary">
                      <Phone size={14} className="text-theme-tertiary" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-theme-secondary">
                      <Mail size={14} className="text-theme-tertiary" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.delivery_days && supplier.delivery_days.length > 0 && (
                    <div className="flex items-center gap-2 text-theme-secondary">
                      <Calendar size={14} className="text-theme-tertiary" />
                      <span>{formatDeliveryDays(supplier.delivery_days)}</span>
                    </div>
                  )}
                  {supplier.next_review_date && (
                    <div className="flex items-center gap-2 text-theme-secondary">
                      <Clock size={14} className="text-theme-tertiary" />
                      <span className="text-xs">Review: {new Date(supplier.next_review_date).toLocaleDateString('en-GB')}</span>
                    </div>
                  )}
                </div>
              </CardWrapper>
              );
            })}
          </div>
        )}

        {/* Quick-Add Modal */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-theme-primary">
                Add Supplier
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-3">
              <div>
                <label className="block text-sm text-theme-secondary mb-1">Supplier Name *</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., ABC Foods Ltd"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-theme-secondary mb-1">Supplier Code</label>
                <Input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g., ABC001"
                />
              </div>
              <p className="text-xs text-theme-tertiary">
                You can add full details on the supplier page after creation.
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleAdd}
                  disabled={saving || !newName.trim()}
                  variant="secondary"
                  className="flex-1"
                >
                  {saving ? 'Creating...' : 'Create & View'}
                </Button>
                <Button onClick={() => setIsAddOpen(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Merge Confirmation Modal */}
        <Dialog open={isMergeOpen} onOpenChange={setIsMergeOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-theme-primary flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Merge Suppliers
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-3">
              <p className="text-sm text-theme-secondary">
                Select the canonical supplier to keep. All other selected suppliers will be merged into it and deactivated.
              </p>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selectedSuppliers.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCanonicalId(s.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      canonicalId === s.id
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-600/10'
                        : 'border-theme hover:bg-theme-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-theme-primary font-medium">{s.name}</span>
                        {s.code && <span className="text-theme-tertiary text-xs ml-2">({s.code})</span>}
                      </div>
                      {canonicalId === s.id && (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-600/20 px-2 py-0.5 rounded">
                          Keep
                        </span>
                      )}
                    </div>
                    {canonicalId !== s.id && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">Will be merged & deactivated</p>
                    )}
                  </button>
                ))}
              </div>

              <div className="bg-amber-50 dark:bg-amber-600/10 border border-amber-200 dark:border-amber-600/30 rounded-lg p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  All library items and orders referencing the merged suppliers will be updated to the canonical supplier. This cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleMerge}
                  disabled={merging || !canonicalId}
                  variant="secondary"
                  className="flex-1"
                >
                  {merging ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Merging...
                    </>
                  ) : (
                    'Confirm Merge'
                  )}
                </Button>
                <Button onClick={() => setIsMergeOpen(false)} variant="outline" className="flex-1">
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
