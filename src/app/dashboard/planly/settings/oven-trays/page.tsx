'use client';

import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useEquipmentTypes } from '@/hooks/planly/useEquipmentTypes';
import { useBakeGroups } from '@/hooks/planly/useBakeGroups';
import { useProducts } from '@/hooks/planly/useProducts';
import { EquipmentType, CapacityProfile, PlanlyBakeGroup, PlanlyProduct } from '@/types/planly';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import Textarea from '@/components/ui/Textarea';
import StyledSelect, { StyledOption } from '@/components/ui/StyledSelect';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Flame,
  LayoutGrid,
  GripVertical,
  Thermometer,
  Clock,
} from '@/components/ui/icons';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────

type TabType = 'trays' | 'bake-groups';

interface TrayFormData {
  name: string;
  default_capacity: number;
  description: string;
  capacity_profiles: CapacityProfile[];
}

const EMPTY_TRAY_FORM: TrayFormData = {
  name: '',
  default_capacity: 18,
  description: '',
  capacity_profiles: [],
};

// ─── Main Component ──────────────────────────────────────────

export default function OvenAndTraysPage() {
  const { profile, siteId } = useAppContext();
  const companyId = profile?.company_id;
  const [activeTab, setActiveTab] = useState<TabType>('trays');

  // ─── Tray Types State & Hooks ─────────────────────────────
  const {
    equipmentTypes: trayTypes,
    isLoading: traysLoading,
    createEquipmentType,
    updateEquipmentType,
    deleteEquipmentType,
    checkLinkedProducts: checkTrayLinkedProducts,
  } = useEquipmentTypes(siteId, { includeCompanyWide: true });

  const [trayDialogOpen, setTrayDialogOpen] = useState(false);
  const [trayDeleteOpen, setTrayDeleteOpen] = useState(false);
  const [editingTrayId, setEditingTrayId] = useState<string | null>(null);
  const [deletingTrayId, setDeletingTrayId] = useState<string | null>(null);
  const [trayForm, setTrayForm] = useState<TrayFormData>(EMPTY_TRAY_FORM);
  const [traySaving, setTraySaving] = useState(false);
  const [trayLinkedCount, setTrayLinkedCount] = useState(0);

  // ─── Bake Groups State & Hooks ────────────────────────────
  const {
    groups: bakeGroups,
    isLoading: bakeLoading,
    createGroup,
    updateGroup,
    deleteGroup,
    addProductToGroup,
    removeProductFromGroup,
  } = useBakeGroups(siteId);

  const { data: products } = useProducts(siteId, { archived: false });

  const [bakeDeleteOpen, setBakeDeleteOpen] = useState(false);
  const [deletingBakeId, setDeletingBakeId] = useState<string | null>(null);
  const [editingBakeId, setEditingBakeId] = useState<string | null>(null);
  const [editingBakeName, setEditingBakeName] = useState('');
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');

  // ─── Shared Loading/Error States ──────────────────────────
  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-white/60">Please select a site</div>
      </div>
    );
  }

  const isLoading = traysLoading || bakeLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-white/40 mr-2" />
        <span className="text-gray-500 dark:text-white/60">Loading...</span>
      </div>
    );
  }

  // ─── Tray Types Handlers ──────────────────────────────────

  const openCreateTray = () => {
    setEditingTrayId(null);
    setTrayForm(EMPTY_TRAY_FORM);
    setTrayDialogOpen(true);
  };

  const openEditTray = (item: EquipmentType) => {
    setEditingTrayId(item.id);
    setTrayForm({
      name: item.name,
      default_capacity: item.default_capacity,
      description: item.description || '',
      capacity_profiles: item.capacity_profiles?.length ? item.capacity_profiles : [],
    });
    setTrayDialogOpen(true);
  };

  const openDeleteTray = async (id: string) => {
    setDeletingTrayId(id);
    const count = await checkTrayLinkedProducts(id);
    setTrayLinkedCount(count);
    setTrayDeleteOpen(true);
  };

  const addProfile = () => {
    setTrayForm((prev) => ({
      ...prev,
      capacity_profiles: [...prev.capacity_profiles, { label: '', capacity: prev.default_capacity }],
    }));
  };

  const updateProfile = (index: number, field: keyof CapacityProfile, value: string | number) => {
    setTrayForm((prev) => {
      const updated = [...prev.capacity_profiles];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, capacity_profiles: updated };
    });
  };

  const removeProfile = (index: number) => {
    setTrayForm((prev) => ({
      ...prev,
      capacity_profiles: prev.capacity_profiles.filter((_, i) => i !== index),
    }));
  };

  const handleSaveTray = async () => {
    if (!trayForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!trayForm.default_capacity || trayForm.default_capacity < 1) {
      toast.error('Default capacity must be at least 1');
      return;
    }

    const validProfiles = trayForm.capacity_profiles.filter((p) => p.label.trim() && p.capacity > 0);

    setTraySaving(true);
    try {
      const payload = {
        name: trayForm.name.trim(),
        default_capacity: trayForm.default_capacity,
        description: trayForm.description.trim() || undefined,
        capacity_profiles: validProfiles.length > 0 ? validProfiles : undefined,
      };

      if (editingTrayId) {
        await updateEquipmentType(editingTrayId, payload);
        toast.success('Tray type updated');
      } else {
        await createEquipmentType({ ...payload, company_id: companyId! });
        toast.success('Tray type created');
      }
      setTrayDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setTraySaving(false);
    }
  };

  const handleDeleteTray = async () => {
    if (!deletingTrayId) return;
    try {
      await deleteEquipmentType(deletingTrayId);
      toast.success('Tray type deleted');
      setTrayDeleteOpen(false);
      setDeletingTrayId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  // ─── Bake Groups Handlers ─────────────────────────────────

  const getAvailableProducts = (): PlanlyProduct[] => {
    if (!products) return [];
    return (products as PlanlyProduct[]).filter((p) => !p.bake_group_id);
  };

  const getGroupProducts = (groupId: string): PlanlyProduct[] => {
    if (!products) return [];
    return (products as PlanlyProduct[]).filter((p) => p.bake_group_id === groupId);
  };

  const handleAddBakeGroup = async () => {
    const newGroupNumber = (bakeGroups?.length || 0) + 1;
    await createGroup({
      site_id: siteId!,
      name: `Bake Group ${newGroupNumber}`,
      priority: newGroupNumber,
    });
  };

  const startEditingBake = (group: PlanlyBakeGroup) => {
    setEditingBakeId(group.id);
    setEditingBakeName(group.name);
  };

  const handleSaveBakeName = async () => {
    if (editingBakeId && editingBakeName.trim()) {
      await updateGroup(editingBakeId, { name: editingBakeName.trim() });
    }
    setEditingBakeId(null);
    setEditingBakeName('');
  };

  const handleDeleteBakeGroup = async () => {
    if (deletingBakeId) {
      await deleteGroup(deletingBakeId);
      setBakeDeleteOpen(false);
      setDeletingBakeId(null);
    }
  };

  const handleAddProductToBake = async (groupId: string) => {
    if (selectedProductId) {
      await addProductToGroup(selectedProductId, groupId);
      setSelectedProductId('');
      setAddingToGroupId(null);
    }
  };

  const handleRemoveProductFromBake = async (productId: string) => {
    await removeProductFromGroup(productId);
  };

  // ─── Data ─────────────────────────────────────────────────

  const traysList = Array.isArray(trayTypes) ? trayTypes : [];
  const bakeGroupsList = Array.isArray(bakeGroups) ? (bakeGroups as PlanlyBakeGroup[]) : [];
  const availableProducts = getAvailableProducts();

  // Get all unique capacity profile labels from equipment types
  const availableCapacityProfiles = Array.from(
    new Set(
      traysList.flatMap((et) =>
        (et.capacity_profiles || []).map((p: CapacityProfile) => p.label)
      )
    )
  ).sort();

  const handleUpdateCapacityProfile = async (groupId: string, profile: string | null) => {
    await updateGroup(groupId, { capacity_profile: profile });
    toast.success('Capacity profile updated');
  };

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Oven & Trays</h1>
        <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
          Set up tray sizes and which products bake together. This generates your numbered tray layout.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('trays')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'trays'
              ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          Tray Sizes
        </button>
        <button
          onClick={() => setActiveTab('bake-groups')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'bake-groups'
              ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          <Flame className="h-4 w-4" />
          Bake Groups
        </button>
      </div>

      {/* Tab Content: Tray Sizes */}
      {activeTab === 'trays' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateTray}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tray Type
            </Button>
          </div>

          {traysList.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-lg border border-dashed border-gray-200 dark:border-white/10">
              <LayoutGrid className="h-12 w-12 mx-auto text-gray-300 dark:text-white/20 mb-4" />
              <p className="text-gray-400 dark:text-white/40 mb-4">No tray types created yet</p>
              <Button onClick={openCreateTray} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create First Tray Type
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">
                      Default Capacity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">
                      Product Capacities
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10 bg-white dark:bg-neutral-900">
                  {traysList.map((tray) => (
                    <tr key={tray.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">{tray.name}</div>
                        {tray.description && (
                          <div className="text-sm text-gray-500 dark:text-white/50">{tray.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-900 dark:text-white">{tray.default_capacity}</td>
                      <td className="px-4 py-4">
                        {tray.capacity_profiles && tray.capacity_profiles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tray.capacity_profiles.map((cp, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-full"
                              >
                                {cp.label}: {cp.capacity}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-white/40 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditTray(tray)}
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteTray(tray.id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Bake Groups */}
      {activeTab === 'bake-groups' && (
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <p className="text-sm text-gray-600 dark:text-white/60 max-w-xl">
              Products that bake at the same temperature and time. The tray plan groups these together so you can fill trays efficiently.
            </p>
            <Button onClick={handleAddBakeGroup}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bake Group
            </Button>
          </div>

          {bakeGroupsList.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-lg border border-dashed border-gray-200 dark:border-white/10">
              <Flame className="h-12 w-12 mx-auto text-gray-300 dark:text-white/20 mb-4" />
              <p className="text-gray-400 dark:text-white/40 mb-4">No bake groups created yet</p>
              <Button onClick={handleAddBakeGroup} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create First Bake Group
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {bakeGroupsList.map((group) => {
                const groupProducts = getGroupProducts(group.id);
                return (
                  <Card key={group.id} className="p-0">
                    <CardHeader className="pb-3 border-b border-gray-200 dark:border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-5 w-5 text-gray-400 dark:text-white/40 cursor-grab" />
                          {editingBakeId === group.id ? (
                            <Input
                              autoFocus
                              value={editingBakeName}
                              onChange={(e) => setEditingBakeName(e.target.value)}
                              onBlur={handleSaveBakeName}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveBakeName();
                                if (e.key === 'Escape') {
                                  setEditingBakeId(null);
                                  setEditingBakeName('');
                                }
                              }}
                              className="h-8 w-48"
                            />
                          ) : (
                            <button
                              onClick={() => startEditingBake(group)}
                              className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#14B8A6] transition-colors"
                            >
                              {group.name}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Capacity Profile Picker */}
                          {availableCapacityProfiles.length > 0 && (
                            <StyledSelect
                              value={group.capacity_profile || ''}
                              onChange={(e) =>
                                handleUpdateCapacityProfile(group.id, e.target.value || null)
                              }
                              className="h-8 w-36 text-xs"
                            >
                              <StyledOption value="">Default capacity</StyledOption>
                              {availableCapacityProfiles.map((label) => (
                                <StyledOption key={label} value={label}>
                                  {label}
                                </StyledOption>
                              ))}
                            </StyledSelect>
                          )}
                          <button
                            onClick={() => {
                              setDeletingBakeId(group.id);
                              setBakeDeleteOpen(true);
                            }}
                            className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-2 mb-4">
                        {groupProducts.length === 0 ? (
                          <p className="text-gray-400 dark:text-white/40 text-sm py-2">No products in this group</p>
                        ) : (
                          groupProducts.map((product) => (
                            <div
                              key={product.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10"
                            >
                              <span className="text-gray-900 dark:text-white">
                                {product.stockly_product?.ingredient_name || product.stockly_product?.name || 'Unknown Product'}
                              </span>
                              <button
                                onClick={() => handleRemoveProductFromBake(product.id)}
                                className="p-1.5 rounded text-gray-400 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                      {addingToGroupId === group.id ? (
                        <div className="flex items-center gap-2">
                          <StyledSelect
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            className="flex-1"
                          >
                            <StyledOption value="">Select a product...</StyledOption>
                            {availableProducts.map((product) => (
                              <StyledOption key={product.id} value={product.id}>
                                {product.stockly_product?.ingredient_name || product.stockly_product?.name || 'Unknown Product'}
                              </StyledOption>
                            ))}
                          </StyledSelect>
                          <Button onClick={() => handleAddProductToBake(group.id)} disabled={!selectedProductId} className="shrink-0">
                            Add
                          </Button>
                          <button
                            onClick={() => {
                              setAddingToGroupId(null);
                              setSelectedProductId('');
                            }}
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <Button variant="outline" onClick={() => setAddingToGroupId(group.id)} disabled={availableProducts.length === 0}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Product
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tray Type Dialog */}
      <Dialog open={trayDialogOpen} onOpenChange={setTrayDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTrayId ? 'Edit Tray Type' : 'Add Tray Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={trayForm.name}
                onChange={(e) => setTrayForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Full Oven Tray"
              />
            </div>
            <div>
              <Label>Default Capacity *</Label>
              <Input
                type="number"
                min={1}
                value={trayForm.default_capacity}
                onChange={(e) => setTrayForm((p) => ({ ...p, default_capacity: parseInt(e.target.value) || 1 }))}
              />
              <p className="text-xs text-gray-500 dark:text-white/50 mt-1">How many items fit on this tray by default</p>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={trayForm.description}
                onChange={(e) => setTrayForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional notes"
                rows={2}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Product-Specific Capacities</Label>
                <Button variant="outline" size="sm" onClick={addProfile}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              {trayForm.capacity_profiles.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-white/40">
                  No overrides — all products will use the default capacity
                </p>
              ) : (
                <div className="space-y-2">
                  {trayForm.capacity_profiles.map((profile, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={profile.label}
                        onChange={(e) => updateProfile(index, 'label', e.target.value)}
                        placeholder="e.g., Cookies"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={profile.capacity}
                        onChange={(e) => updateProfile(index, 'capacity', parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                      <button onClick={() => removeProfile(index)} className="p-2 text-red-500 hover:text-red-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrayDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTray} disabled={traySaving}>
              {traySaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingTrayId ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tray Confirmation */}
      <ConfirmDialog
        open={trayDeleteOpen}
        onClose={() => {
          setTrayDeleteOpen(false);
          setDeletingTrayId(null);
        }}
        onConfirm={handleDeleteTray}
        title="Delete tray type?"
        description={
          trayLinkedCount > 0
            ? `This tray type is linked to ${trayLinkedCount} product${trayLinkedCount > 1 ? 's' : ''}. They will be unassigned.`
            : 'This action cannot be undone.'
        }
        confirmText="Delete"
        variant="destructive"
      />

      {/* Delete Bake Group Confirmation */}
      <ConfirmDialog
        open={bakeDeleteOpen}
        onClose={() => {
          setBakeDeleteOpen(false);
          setDeletingBakeId(null);
        }}
        onConfirm={handleDeleteBakeGroup}
        title="Delete bake group?"
        description="Products in this group will be unassigned. This cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
