"use client";

import { useState, useEffect } from 'react';
import { Save, Loader2 } from '@/components/ui/icons';
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
  const [initialLoading, setInitialLoading] = useState(true);

  // Load existing settings
  useEffect(() => {
    if (siteId) {
      setInitialLoading(true);
      fetch(`/api/planly/cutoff-settings?siteId=${siteId}`)
        .then(res => res.json())
        .then(data => {
          if (data.default_buffer_days !== undefined) setBufferDays(data.default_buffer_days);
          if (data.default_cutoff_time) {
            // Handle time format - remove seconds if present
            const time = data.default_cutoff_time.substring(0, 5);
            setCutoffTime(time);
          }
        })
        .catch(console.error)
        .finally(() => setInitialLoading(false));
    } else {
      setInitialLoading(false);
    }
  }, [siteId]);

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
        <div className="text-theme-tertiary">Please select a site</div>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-module-fg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-theme-primary">Cutoff Rules</h1>
        <p className="text-theme-tertiary text-sm mt-1">
          Configure default order cutoff settings for this site
        </p>
      </div>

      <Card className="p-6 max-w-2xl bg-theme-surface border-theme">
        <div className="space-y-6">
          <div>
            <Label htmlFor="bufferDays" className="text-theme-secondary mb-2 block">
              Default Buffer Days
            </Label>
            <Input
              id="bufferDays"
              type="number"
              min="0"
              value={bufferDays}
              onChange={(e) => setBufferDays(parseInt(e.target.value) || 0)}
              className="w-32 bg-theme-button border-theme text-theme-primary"
            />
            <p className="text-sm text-theme-tertiary mt-1">
              Additional days before the first production stage
            </p>
          </div>

          <div>
            <Label htmlFor="cutoffTime" className="text-theme-secondary mb-2 block">
              Default Cutoff Time
            </Label>
            <Input
              id="cutoffTime"
              type="time"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              className="w-40 bg-theme-button border-theme text-theme-primary"
            />
            <p className="text-sm text-theme-tertiary mt-1">
              Time of day when orders lock (24-hour format)
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-module-fg hover:bg-module-fg/90 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
