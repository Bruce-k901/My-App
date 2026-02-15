'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { MobileHeader } from './MobileHeader';
import { WeatherWidget } from './WeatherWidget';
import { QuickAccess } from './QuickAccess';
import { PrioritySummaryCard } from './PrioritySummaryCard';
import { UpcomingTasksList } from './UpcomingTasksList';
import { ActivityFeed } from './ActivityFeed';
import { UserMenu } from './UserMenu';

export function MobileHomeScreen() {
  const { profile } = useAppContext();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Load notification preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('opsly_notifications_enabled');
    if (stored !== null) {
      setNotificationsEnabled(stored === 'true');
    }
  }, []);

  const handleNotificationsToggle = useCallback((enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem('opsly_notifications_enabled', String(enabled));
  }, []);

  const userName = profile?.full_name ||
    (profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : 'User');

  return (
    <div className="min-h-screen bg-[rgb(var(--surface-elevated))] text-theme-primary">
      {/* Header with avatar button */}
      <MobileHeader
        userName={userName}
        unreadNotifications={0}
        notificationsEnabled={notificationsEnabled}
        onNotificationsToggle={handleNotificationsToggle}
        onAvatarClick={() => setUserMenuOpen(true)}
      />

      {/* Content sections */}
      <div className="px-4 space-y-5 pb-24">
        <WeatherWidget />
        <QuickAccess />
        <PrioritySummaryCard />
        <UpcomingTasksList limit={5} />
        <ActivityFeed />
      </div>

      {/* User Menu Drawer */}
      <UserMenu isOpen={userMenuOpen} onClose={() => setUserMenuOpen(false)} />
    </div>
  );
}
