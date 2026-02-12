'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, GripVertical, Trash2, Pencil, X, Loader2, FolderTree } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useCategories } from '@/hooks/planly/useCategories';
import { useAppContext } from '@/context/AppContext';
import { PlanlyCategory } from '@/types/planly';

export default function CategoriesPage() {
  const { siteId } = useAppContext();
  const {
    categories,
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    checkLinkedProducts,
  } = useCategories(siteId);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // Focus new category input when creating
  useEffect(() => {
    if (isCreating && newInputRef.current) {
      newInputRef.current.focus();
    }
  }, [isCreating]);

  const handleAddCategory = async () => {
    if (!newName.trim()) return;

    const result = await createCategory({
      site_id: siteId!,
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      display_order: categories.length,
    });

    if (!('error' in result)) {
      setNewName('');
      setNewDescription('');
      setIsCreating(false);
    }
  };

  const startEditing = (category: PlanlyCategory) => {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditingDescription(category.description || '');
  };

  const handleSave = async () => {
    if (editingId && editingName.trim()) {
      await updateCategory(editingId, {
        name: editingName.trim(),
        description: editingDescription.trim() || undefined,
      });
    }
    setEditingId(null);
    setEditingName('');
    setEditingDescription('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingName('');
      setEditingDescription('');
    }
  };

  const handleNewKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCategory();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewName('');
      setNewDescription('');
    }
  };

  const handleDeleteClick = async (id: string) => {
    const linkedCount = await checkLinkedProducts(id);
    if (linkedCount > 0) {
      setDeleteWarning(`This category has ${linkedCount} linked product${linkedCount === 1 ? '' : 's'}. They will be unassigned.`);
    } else {
      setDeleteWarning(null);
    }
    setDeleteId(id);
  };

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await deleteCategory(deleteId);
      setDeleteId(null);
      setDeleteWarning(null);
    }
  };

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-tertiary">Please select a site</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-theme-tertiary mr-2" />
        <span className="text-theme-tertiary">Loading categories...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500 dark:text-red-400">Error loading categories</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Product Categories</h1>
          <p className="text-theme-tertiary text-sm mt-1">
            Organize your products into categories for easier navigation
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* New Category Form */}
      {isCreating && (
        <Card className="border-module-fg border-2">
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-theme-secondary mb-1 block">
                  Category Name *
                </label>
                <Input
                  ref={newInputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={handleNewKeyDown}
                  placeholder="e.g., Breads, Pastries, Cakes"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-theme-secondary mb-1 block">
                  Description (optional)
                </label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  onKeyDown={handleNewKeyDown}
                  placeholder="Brief description of this category"
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setNewName('');
                    setNewDescription('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddCategory} disabled={!newName.trim()}>
                  Create Category
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {categories.length === 0 && !isCreating && (
        <div className="text-center py-12 bg-theme-button rounded-lg border border-dashed border-theme">
          <FolderTree className="h-12 w-12 mx-auto text-gray-300 dark:text-white/20 mb-4" />
          <p className="text-theme-tertiary mb-4">No categories created yet</p>
          <Button onClick={() => setIsCreating(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create First Category
          </Button>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-3">
        {categories.map((category, index) => (
          <Card key={category.id} className="p-0">
            <div className="flex items-center gap-3 p-4">
              <GripVertical className="h-5 w-5 text-theme-tertiary cursor-grab flex-shrink-0" />

              {editingId === category.id ? (
                <div className="flex-1 space-y-2">
                  <Input
                    ref={inputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Category name"
                    className="w-full"
                  />
                  <Input
                    value={editingDescription}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Description (optional)"
                    className="w-full"
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(null);
                        setEditingName('');
                        setEditingDescription('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={!editingName.trim()}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="font-medium text-theme-primary truncate">
                        {category.name}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-sm text-theme-tertiary mt-0.5 truncate">
                        {category.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEditing(category)}
                      className="p-2 rounded-lg text-theme-tertiary hover:text-theme-secondary hover:bg-theme-muted transition-colors"
                      title="Edit category"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(category.id)}
                      className="p-2 rounded-lg text-theme-tertiary hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setDeleteWarning(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete category?"
        description={deleteWarning || "This action cannot be undone."}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
