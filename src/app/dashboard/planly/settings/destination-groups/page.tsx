'use client';

import { useState } from 'react';
import { Plus, MapPin, Clock, Truck, Edit2, Trash2, Home, X, Loader2, AlertCircle } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Label from '@/components/ui/Label';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { useDestinationGroups } from '@/hooks/planly/useDestinationGroups';
import { useAppContext } from '@/context/AppContext';
import { DestinationGroup } from '@/types/planly';
import { mutate } from 'swr';
import { cn } from '@/lib/utils';

interface DestinationGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: DestinationGroup | null;
  siteId: string;
}

function DestinationGroupModal({ isOpen, onClose, group, siteId }: DestinationGroupModalProps) {
  const isEdit = !!group;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(group?.name || '');
  const [description, setDescription] = useState(group?.description || '');
  const [bakeDeadline, setBakeDeadline] = useState(group?.bake_deadline || '');
  const [dispatchTime, setDispatchTime] = useState(group?.dispatch_time || '');
  const [isOnsite, setIsOnsite] = useState(group?.is_onsite || false);
  const [priority, setPriority] = useState(group?.priority?.toString() || '1');
  const [isActive, setIsActive] = useState(group?.is_active ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        bake_deadline: bakeDeadline || null,
        dispatch_time: dispatchTime || null,
        is_onsite: isOnsite,
        priority: parseInt(priority) || 1,
        is_active: isActive,
        site_id: siteId,
      };

      const url = isEdit
        ? `/api/planly/destination-groups/${group.id}`
        : '/api/planly/destination-groups';

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save destination group');
      }

      mutate(`/api/planly/destination-groups?siteId=${siteId}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-theme-surface rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme">
          <h2 className="text-lg font-semibold text-theme-primary">
            {isEdit ? 'Edit Destination Group' : 'Create Destination Group'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-theme-tertiary hover:text-theme-secondary/40 hover:bg-theme-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto">
            <div>
              <Label className="text-theme-secondary">Name *</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Morning Delivery Route"
                className="mt-1 bg-theme-button border-theme text-theme-primary"
                required
              />
            </div>

            <div>
              <Label className="text-theme-secondary">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                className="mt-1 bg-theme-button border-theme text-theme-primary"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-theme-secondary">Bake Deadline</Label>
                <Input
                  type="time"
                  value={bakeDeadline}
                  onChange={(e) => setBakeDeadline(e.target.value)}
                  className="mt-1 bg-theme-button border-theme text-theme-primary"
                />
                <p className="text-xs text-theme-tertiary mt-1">
                  Products must be baked by this time
                </p>
              </div>
              <div>
                <Label className="text-theme-secondary">Dispatch Time</Label>
                <Input
                  type="time"
                  value={dispatchTime}
                  onChange={(e) => setDispatchTime(e.target.value)}
                  className="mt-1 bg-theme-button border-theme text-theme-primary"
                />
                <p className="text-xs text-theme-tertiary mt-1">
                  When deliveries leave for this group
                </p>
              </div>
            </div>

            <div>
              <Label className="text-theme-secondary">Priority</Label>
              <Input
                type="number"
                min="1"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 w-24 bg-theme-button border-theme text-theme-primary"
              />
              <p className="text-xs text-theme-tertiary mt-1">
                Lower numbers = higher priority in scheduling
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-theme-hover transition-colors">
                <input
                  type="checkbox"
                  checked={isOnsite}
                  onChange={(e) => setIsOnsite(e.target.checked)}
                  className="w-5 h-5 rounded bg-theme-button border-theme text-module-fg focus:ring-module-fg/50"
                />
                <div>
                  <span className="font-medium text-theme-primary">On-site Destination</span>
                  <p className="text-sm text-theme-tertiary">For retail counters or internal use (no delivery)</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-theme-hover transition-colors">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded bg-theme-button border-theme text-module-fg focus:ring-module-fg/50"
                />
                <div>
                  <span className="font-medium text-theme-primary">Active</span>
                  <p className="text-sm text-theme-tertiary">Group is available for assignment</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-theme bg-gray-50 dark:bg-white/[0.02]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-theme-surface border-theme text-theme-secondary hover:bg-theme-surface-elevated dark:hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-module-fg hover:bg-module-fg/90 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEdit ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                isEdit ? 'Save Changes' : 'Create Group'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DestinationGroupsPage() {
  const { siteId } = useAppContext();
  const { data: destinationGroups, isLoading, error } = useDestinationGroups(siteId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DestinationGroup | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this destination group?')) return;

    setDeletingId(groupId);
    try {
      const res = await fetch(`/api/planly/destination-groups/${groupId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        mutate(`/api/planly/destination-groups?siteId=${siteId}`);
      }
    } catch (err) {
      console.error('Error deleting destination group:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const openCreateModal = () => {
    setEditingGroup(null);
    setIsModalOpen(true);
  };

  const openEditModal = (group: DestinationGroup) => {
    setEditingGroup(group);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingGroup(null);
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
        <div className="text-theme-tertiary">Loading destination groups...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500 dark:text-red-400">Error loading destination groups</div>
      </div>
    );
  }

  const groups = Array.isArray(destinationGroups) ? destinationGroups as DestinationGroup[] : [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Packing & Delivery</h1>
          <p className="text-theme-tertiary text-sm mt-1">
            Set up your delivery routes and dispatch times. The production plan uses this to group orders and split tray layouts by timing.
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-module-fg hover:bg-module-fg/90 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Destination
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <Card
            key={group.id}
            className={cn(
              "p-4 bg-theme-surface border-theme transition-all",
              deletingId === group.id && "opacity-50",
              !group.is_active && "opacity-60"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {group.is_onsite ? (
                  <Home className="h-5 w-5 text-module-fg" />
                ) : (
                  <Truck className="h-5 w-5 text-module-fg" />
                )}
                <h3 className="font-semibold text-theme-primary">{group.name}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(group)}
                  className="p-1.5 rounded text-theme-tertiary hover:text-theme-secondary hover:bg-theme-muted transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(group.id)}
                  disabled={deletingId === group.id}
                  className="p-1.5 rounded text-theme-tertiary hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {group.description && (
              <p className="text-sm text-theme-secondary mb-3">{group.description}</p>
            )}

            <div className="space-y-2 text-sm">
              {group.bake_deadline && (
                <div className="flex items-center gap-2 text-theme-secondary">
                  <Clock className="h-4 w-4 text-theme-tertiary" />
                  <span>Bake by: {group.bake_deadline}</span>
                </div>
              )}
              {group.dispatch_time && (
                <div className="flex items-center gap-2 text-theme-secondary">
                  <MapPin className="h-4 w-4 text-theme-tertiary" />
                  <span>Dispatch: {group.dispatch_time}</span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-theme flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded bg-theme-muted text-theme-secondary">
                Priority: {group.priority}
              </span>
              {group.is_onsite && (
                <span className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  On-site
                </span>
              )}
              {!group.is_active && (
                <span className="text-xs px-2 py-1 rounded bg-theme-muted text-theme-tertiary">
                  Inactive
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {groups.length === 0 && (
        <Card className="p-12 text-center bg-theme-surface border-theme">
          <MapPin className="h-12 w-12 mx-auto text-gray-300 dark:text-white/20 mb-4" />
          <div className="text-theme-tertiary mb-2">No destination groups yet</div>
          <p className="text-sm text-theme-tertiary mb-4">
            Create groups to organize deliveries by route or timing
          </p>
          <Button onClick={openCreateModal} className="bg-module-fg hover:bg-module-fg/90 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create First Group
          </Button>
        </Card>
      )}

      {isModalOpen && siteId && (
        <DestinationGroupModal
          isOpen={isModalOpen}
          onClose={closeModal}
          group={editingGroup}
          siteId={siteId}
        />
      )}
    </div>
  );
}
