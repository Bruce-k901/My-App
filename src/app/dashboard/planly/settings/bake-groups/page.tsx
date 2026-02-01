'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, GripVertical, Trash2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import StyledSelect, { StyledOption } from '@/components/ui/StyledSelect';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useBakeGroups } from '@/hooks/planly/useBakeGroups';
import { useProducts } from '@/hooks/planly/useProducts';
import { useAppContext } from '@/context/AppContext';
import { PlanlyBakeGroup, PlanlyProduct } from '@/types/planly';

export default function BakeGroupsPage() {
  const { siteId } = useAppContext();
  const {
    groups,
    isLoading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    addProductToGroup,
    removeProductFromGroup,
  } = useBakeGroups(siteId);

  const { data: products } = useProducts(siteId, { archived: false });

  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingGroupId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingGroupId]);

  // Get products not in any group (available to add)
  const getAvailableProducts = (): PlanlyProduct[] => {
    if (!products) return [];
    return (products as PlanlyProduct[]).filter((p) => !p.bake_group_id);
  };

  // Get products in a specific group
  const getGroupProducts = (groupId: string): PlanlyProduct[] => {
    if (!products) return [];
    return (products as PlanlyProduct[]).filter((p) => p.bake_group_id === groupId);
  };

  const handleAddGroup = async () => {
    const newGroupNumber = (groups?.length || 0) + 1;
    await createGroup({
      site_id: siteId!,
      name: `Group ${newGroupNumber}`,
      priority: newGroupNumber,
    });
  };

  const startEditingName = (group: PlanlyBakeGroup) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
  };

  const handleSaveName = async () => {
    if (editingGroupId && editingName.trim()) {
      await updateGroup(editingGroupId, { name: editingName.trim() });
    }
    setEditingGroupId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setEditingGroupId(null);
      setEditingName('');
    }
  };

  const handleDeleteGroup = async () => {
    if (deleteGroupId) {
      await deleteGroup(deleteGroupId);
      setDeleteGroupId(null);
    }
  };

  const handleAddProduct = async (groupId: string) => {
    if (selectedProductId) {
      await addProductToGroup(selectedProductId, groupId);
      setSelectedProductId('');
      setAddingToGroupId(null);
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    await removeProductFromGroup(productId);
  };

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-white/60">Please select a site</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-white/40 mr-2" />
        <span className="text-gray-500 dark:text-white/60">Loading bake groups...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500 dark:text-red-400">Error loading bake groups</div>
      </div>
    );
  }

  const groupsList = Array.isArray(groups) ? groups as PlanlyBakeGroup[] : [];
  const availableProducts = getAvailableProducts();

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bake Groups</h1>
          <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
            Group products that bake together (same temp &amp; timing)
          </p>
        </div>
        <Button onClick={handleAddGroup}>
          <Plus className="h-4 w-4 mr-2" />
          Add Group
        </Button>
      </div>

      {/* Empty State */}
      {groupsList.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-lg border border-dashed border-gray-200 dark:border-white/10">
          <p className="text-gray-400 dark:text-white/40 mb-4">No bake groups created yet</p>
          <Button onClick={handleAddGroup} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create First Group
          </Button>
        </div>
      )}

      {/* Groups */}
      <div className="space-y-4">
        {groupsList.map((group) => {
          const groupProducts = getGroupProducts(group.id);

          return (
            <Card key={group.id} className="p-0">
              <CardHeader className="pb-3 border-b border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-5 w-5 text-gray-400 dark:text-white/40 cursor-grab" />
                    {editingGroupId === group.id ? (
                      <Input
                        ref={inputRef}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={handleSaveName}
                        onKeyDown={handleKeyDown}
                        className="h-8 w-48"
                      />
                    ) : (
                      <button
                        onClick={() => startEditingName(group)}
                        className="text-lg font-semibold text-gray-900 dark:text-white hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
                      >
                        {group.name}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setDeleteGroupId(group.id)}
                    className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {/* Products in this group */}
                <div className="space-y-2 mb-4">
                  {groupProducts.length === 0 ? (
                    <p className="text-gray-400 dark:text-white/40 text-sm py-2">
                      No products in this group
                    </p>
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
                          onClick={() => handleRemoveProduct(product.id)}
                          className="p-1.5 rounded text-gray-400 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Product */}
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
                    <Button
                      onClick={() => handleAddProduct(group.id)}
                      disabled={!selectedProductId}
                      className="shrink-0"
                    >
                      Add
                    </Button>
                    <button
                      onClick={() => {
                        setAddingToGroupId(null);
                        setSelectedProductId('');
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setAddingToGroupId(group.id)}
                    disabled={availableProducts.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteGroupId}
        onClose={() => setDeleteGroupId(null)}
        onConfirm={handleDeleteGroup}
        title="Delete bake group?"
        description="Products in this group will be unassigned. This cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
