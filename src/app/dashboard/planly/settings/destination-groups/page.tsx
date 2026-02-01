'use client';

import { useState } from 'react';
import { Plus, MapPin, Clock, Truck, Edit2, Trash2, Home, X, Loader2, AlertCircle } from 'lucide-react';
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
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Destination Group' : 'Create Destination Group'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
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
              <Label className="text-gray-700 dark:text-white/80">Name *</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Morning Delivery Route"
                className="mt-1 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-white/80">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                className="mt-1 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 dark:text-white/80">Bake Deadline</Label>
                <Input
                  type="time"
                  value={bakeDeadline}
                  onChange={(e) => setBakeDeadline(e.target.value)}
                  className="mt-1 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-white/40 mt-1">
                  Products must be baked by this time
                </p>
              </div>
              <div>
                <Label className="text-gray-700 dark:text-white/80">Dispatch Time</Label>
                <Input
                  type="time"
                  value={dispatchTime}
                  onChange={(e) => setDispatchTime(e.target.value)}
                  className="mt-1 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-white/40 mt-1">
                  When deliveries leave for this group
                </p>
              </div>
            </div>

            <div>
              <Label className="text-gray-700 dark:text-white/80">Priority</Label>
              <Input
                type="number"
                min="1"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 w-24 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-white/40 mt-1">
                Lower numbers = higher priority in scheduling
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <input
                  type="checkbox"
                  checked={isOnsite}
                  onChange={(e) => setIsOnsite(e.target.checked)}
                  className="w-5 h-5 rounded bg-gray-50 dark:bg-white/5 border-gray-300 dark:border-white/10 text-[#14B8A6] focus:ring-[#14B8A6]/50"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">On-site Destination</span>
                  <p className="text-sm text-gray-500 dark:text-white/60">For retail counters or internal use (no delivery)</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded bg-gray-50 dark:bg-white/5 border-gray-300 dark:border-white/10 text-[#14B8A6] focus:ring-[#14B8A6]/50"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Active</span>
                  <p className="text-sm text-gray-500 dark:text-white/60">Group is available for assignment</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#14B8A6] hover:bg-[#0D9488] text-white"
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
        <div className="text-gray-500 dark:text-white/60">Please select a site</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-white/60">Loading destination groups...</div>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Destination Groups</h1>
          <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
            Define delivery routes and on-site destinations with bake deadlines and dispatch times
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-[#14B8A6] hover:bg-[#0D9488] text-white">
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <Card
            key={group.id}
            className={cn(
              "p-4 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 transition-all",
              deletingId === group.id && "opacity-50",
              !group.is_active && "opacity-60"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {group.is_onsite ? (
                  <Home className="h-5 w-5 text-[#14B8A6]" />
                ) : (
                  <Truck className="h-5 w-5 text-[#14B8A6]" />
                )}
                <h3 className="font-semibold text-gray-900 dark:text-white">{group.name}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(group)}
                  className="p-1.5 rounded text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(group.id)}
                  disabled={deletingId === group.id}
                  className="p-1.5 rounded text-gray-400 dark:text-white/40 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {group.description && (
              <p className="text-sm text-gray-600 dark:text-white/60 mb-3">{group.description}</p>
            )}

            <div className="space-y-2 text-sm">
              {group.bake_deadline && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-white/60">
                  <Clock className="h-4 w-4 text-gray-400 dark:text-white/40" />
                  <span>Bake by: {group.bake_deadline}</span>
                </div>
              )}
              {group.dispatch_time && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-white/60">
                  <MapPin className="h-4 w-4 text-gray-400 dark:text-white/40" />
                  <span>Dispatch: {group.dispatch_time}</span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10 flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60">
                Priority: {group.priority}
              </span>
              {group.is_onsite && (
                <span className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  On-site
                </span>
              )}
              {!group.is_active && (
                <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/40">
                  Inactive
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {groups.length === 0 && (
        <Card className="p-12 text-center bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
          <MapPin className="h-12 w-12 mx-auto text-gray-300 dark:text-white/20 mb-4" />
          <div className="text-gray-500 dark:text-white/60 mb-2">No destination groups yet</div>
          <p className="text-sm text-gray-400 dark:text-white/40 mb-4">
            Create groups to organize deliveries by route or timing
          </p>
          <Button onClick={openCreateModal} className="bg-[#14B8A6] hover:bg-[#0D9488] text-white">
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
