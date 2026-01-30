"use client";

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useBakeGroups } from '@/hooks/planly/useBakeGroups';
import { useAppContext } from '@/context/AppContext';
import { BakeGroup } from '@/types/planly';
import Link from 'next/link';

export default function BakeGroupsPage() {
  const { siteId } = useAppContext();
  const { data: bakeGroups, isLoading, error } = useBakeGroups(siteId);

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Please select a site</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Loading bake groups...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400">Error loading bake groups</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bake Groups</h1>
          <p className="text-white/50 text-sm mt-1">
            Group products by baking requirements (temperature, time, equipment)
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Bake Group
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(bakeGroups as BakeGroup[] || []).map((group) => (
          <Card key={group.id} className="p-4">
            <h3 className="font-semibold text-white mb-2">{group.name}</h3>
            {group.description && (
              <p className="text-sm text-white/60 mb-2">{group.description}</p>
            )}
            <div className="space-y-1 text-sm text-white/60">
              {group.target_temp_celsius && (
                <div>Temperature: {group.target_temp_celsius}°C</div>
              )}
              {group.target_time_mins && (
                <div>Time: {group.target_time_mins} mins</div>
              )}
              <div>Priority: {group.priority}</div>
            </div>
          </Card>
        ))}
      </div>

      {(!bakeGroups || (bakeGroups as BakeGroup[]).length === 0) && (
        <Card className="p-12 text-center">
          <div className="text-white/60">No bake groups yet</div>
        </Card>
      )}
    </div>
  );
}
