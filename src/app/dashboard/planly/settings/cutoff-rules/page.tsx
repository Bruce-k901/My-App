"use client";

import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/components/ui/ToastProvider';

export default function CutoffRulesPage() {
  const { siteId } = useAppContext();
  const { showToast } = useToast();
  const [bufferDays, setBufferDays] = useState(1);
  const [cutoffTime, setCutoffTime] = useState('14:00');
  const [loading, setLoading] = useState(false);

  // Load existing settings
  useState(() => {
    if (siteId) {
      fetch(`/api/planly/cutoff-settings?siteId=${siteId}`)
        .then(res => res.json())
        .then(data => {
          if (data.default_buffer_days) setBufferDays(data.default_buffer_days);
          if (data.default_cutoff_time) setCutoffTime(data.default_cutoff_time);
        })
        .catch(console.error);
    }
  });

  const handleSave = async () => {
    if (!siteId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/planly/cutoff-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          default_buffer_days: bufferDays,
          default_cutoff_time: cutoffTime,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      showToast({
        title: 'Settings saved',
        type: 'success',
      });
    } catch (error: any) {
      showToast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Please select a site</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Cutoff Rules</h1>
        <p className="text-white/50 text-sm mt-1">
          Configure default order cutoff settings for this site
        </p>
      </div>

      <Card className="p-6 max-w-2xl">
        <div className="space-y-6">
          <div>
            <Label htmlFor="bufferDays" className="text-white mb-2 block">
              Default Buffer Days
            </Label>
            <Input
              id="bufferDays"
              type="number"
              min="0"
              value={bufferDays}
              onChange={(e) => setBufferDays(parseInt(e.target.value) || 0)}
              className="bg-white/[0.03] border-white/[0.06] text-white"
            />
            <p className="text-sm text-white/60 mt-1">
              Additional days before the first production stage
            </p>
          </div>

          <div>
            <Label htmlFor="cutoffTime" className="text-white mb-2 block">
              Default Cutoff Time
            </Label>
            <Input
              id="cutoffTime"
              type="time"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              className="bg-white/[0.03] border-white/[0.06] text-white"
            />
            <p className="text-sm text-white/60 mt-1">
              Time of day when orders lock (24-hour format)
            </p>
          </div>

          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
