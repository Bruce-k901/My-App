'use client';

import { useState, useEffect } from 'react';
import { Clock, MapPin, LogOut, LogIn } from '@/components/ui/icons';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import SiteSelector from '@/components/ui/SiteSelector';
import { toast } from 'sonner';

interface ShiftStatus {
  onShift: boolean;
  siteId: string | null;
  clockInTime: string | null;
  hoursOnShift: number | null;
  siteName?: string | null;
}

export default function ClockInOut() {
  const { profile, companyId } = useAppContext();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [sitesLoaded, setSitesLoaded] = useState(false);
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus>({
    onShift: false,
    siteId: null,
    clockInTime: null,
    hoursOnShift: null,
  });
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [shiftNotes, setShiftNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);

  // Auto-select home site (or site_id) when profile loads and user is not on shift
  // Try immediately, and also after sites are loaded (in case of timing issues)
  useEffect(() => {
    if (!shiftStatus.onShift && !selectedSiteId && profile) {
      // Prefer home_site, fallback to site_id
      const defaultSiteId = profile?.home_site || profile?.site_id;
      if (defaultSiteId) {
        // Try to set immediately - if sites aren't loaded yet, the dropdown will update when they are
        console.log('🕐 [ClockInOut] Attempting to auto-select site:', defaultSiteId, {
          home_site: profile?.home_site,
          site_id: profile?.site_id,
          sitesLoaded,
          onShift: shiftStatus.onShift,
          currentSelected: selectedSiteId
        });
        setSelectedSiteId(defaultSiteId);
      } else {
        console.warn('🕐 [ClockInOut] No home_site or site_id found in profile:', {
          profile_id: profile?.id,
          home_site: profile?.home_site,
          site_id: profile?.site_id,
          profile_keys: profile ? Object.keys(profile) : 'no profile'
        });
      }
    }
  }, [profile?.home_site, profile?.site_id, shiftStatus.onShift, selectedSiteId, profile?.id]);

  // Load shift status on mount and periodically
  useEffect(() => {
    loadShiftStatus();
    const interval = setInterval(loadShiftStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [profile?.id]);

  async function loadShiftStatus() {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/attendance/status');
      if (!response.ok) {
        throw new Error('Failed to load shift status');
      }

      const data = await response.json();
      
      if (data.onShift && data.shift) {
        // Get site name
        const { data: site } = await supabase
          .from('sites')
          .select('name')
          .eq('id', data.shift.site_id)
          .maybeSingle();

        const clockInTime = new Date(data.shift.clock_in_time);
        const hoursOnShift = (Date.now() - clockInTime.getTime()) / (1000 * 60 * 60);

        setShiftStatus({
          onShift: true,
          siteId: data.shift.site_id,
          clockInTime: data.shift.clock_in_time,
          hoursOnShift,
          siteName: site?.name || null,
        });
        setSelectedSiteId(data.shift.site_id);
      } else {
        setShiftStatus({
          onShift: false,
          siteId: null,
          clockInTime: null,
          hoursOnShift: null,
        });
        // Auto-select home site (or site_id) when not on shift
        // Only set if not already selected and sites are loaded
        if (sitesLoaded && !selectedSiteId) {
          const defaultSiteId = profile?.home_site || profile?.site_id;
          if (defaultSiteId) {
            console.log('🕐 [ClockInOut] Auto-selecting site in loadShiftStatus:', defaultSiteId);
            setSelectedSiteId(defaultSiteId);
          }
        }
      }
    } catch (error) {
      console.error('Error loading shift status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleClockIn() {
    if (!selectedSiteId) {
      toast.error('Please select a site first');
      return;
    }

    setClockingIn(true);
    try {
      const response = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: selectedSiteId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clock in');
      }

      // Get site name for confirmation
      const { data: site } = await supabase
        .from('sites')
        .select('name')
        .eq('id', selectedSiteId)
        .maybeSingle();

      toast.success('✅ Clocked in successfully', {
        description: `Started shift at ${site?.name || 'selected site'}`,
        duration: 5000,
      });
      await loadShiftStatus();
      
      // Refresh tasks
      window.dispatchEvent(new CustomEvent('refresh-tasks'));
    } catch (error: any) {
      console.error('Error clocking in:', error);
      toast.error(error.message || 'Failed to clock in');
    } finally {
      setClockingIn(false);
    }
  }

  async function handleClockOut() {
    setClockingOut(true);
    try {
      const response = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftNotes: shiftNotes || null }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clock out');
      }

      const hoursWorked = shiftStatus.hoursOnShift 
        ? formatHours(shiftStatus.hoursOnShift)
        : '';

      toast.success('✅ Clocked out successfully', {
        description: hoursWorked ? `Total time: ${hoursWorked}` : 'Shift ended',
        duration: 5000,
      });
      setShiftNotes('');
      setShowNotesInput(false);
      await loadShiftStatus();
      
      // Refresh tasks
      window.dispatchEvent(new CustomEvent('refresh-tasks'));
    } catch (error: any) {
      console.error('Error clocking out:', error);
      toast.error(error.message || 'Failed to clock out');
    } finally {
      setClockingOut(false);
    }
  }

  function formatHours(hours: number | null): string {
    if (hours === null) return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  }

  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl p-6">
        <div className="flex items-center gap-3 text-theme-tertiary">
          <Clock className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading shift status...</span>
        </div>
      </div>
    );
  }

  if (!profile || !companyId) {
    return null;
  }

  // On shift - show clock out UI
  if (shiftStatus.onShift) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div>
              <h3 className="text-theme-primary font-semibold">On Shift</h3>
              <p className="text-theme-tertiary text-sm">
                {shiftStatus.siteName || 'Unknown Site'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-theme-primary font-mono text-lg">
              {formatHours(shiftStatus.hoursOnShift)}
            </div>
            <p className="text-theme-tertiary text-xs">Time on shift</p>
          </div>
        </div>

        {showNotesInput ? (
          <div className="space-y-2">
            <textarea
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              placeholder="Add handover notes (optional)..."
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-theme-primary text-sm placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleClockOut}
                disabled={clockingOut}
                loading={clockingOut}
                variant="destructive"
                className="flex-1"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Clock Out
              </Button>
              <Button
                onClick={() => {
                  setShowNotesInput(false);
                  setShiftNotes('');
                }}
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={() => setShowNotesInput(true)}
              variant="outline"
              className="flex-1"
            >
              Clock Out
            </Button>
            <Button
              onClick={() => setShowNotesInput(true)}
              variant="ghost"
            >
              Add Notes
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Off shift - show clock in UI
  return (
    <div className="bg-white/[0.03] border border-white/[0.1] rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 bg-white/20 rounded-full" />
        <div>
          <h3 className="text-theme-primary font-semibold">Clock In</h3>
          <p className="text-theme-tertiary text-sm">
            Select a site to start your shift
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-theme-secondary mb-2">Site</label>
          <SiteSelector
            value={selectedSiteId}
            onChange={(siteId) => {
              console.log('🏢 [ClockInOut] Site selected:', siteId);
              setSelectedSiteId(siteId);
              if (siteId) setSitesLoaded(true); // Mark sites as loaded when user selects one
            }}
            placeholder="Select a site..."
            onSitesLoaded={() => {
              console.log('🏢 [ClockInOut] Sites loaded callback fired');
              setSitesLoaded(true);
            }}
          />
        </div>

        <Button
          onClick={handleClockIn}
          disabled={!selectedSiteId || clockingIn}
          loading={clockingIn}
          variant="primary"
          fullWidth
          title={!selectedSiteId ? `No site selected. Profile: home_site=${profile?.home_site}, site_id=${profile?.site_id}, sitesLoaded=${sitesLoaded}` : 'Clock in'}
        >
          <LogIn className="w-4 h-4 mr-2" />
          Clock In
        </Button>
      </div>
    </div>
  );
}

