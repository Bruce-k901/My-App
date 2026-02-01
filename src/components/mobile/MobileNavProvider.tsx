'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type TabId = 'home' | 'tasks' | 'messages' | 'schedule' | 'more';

interface MobileNavContextType {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  isMoreSheetOpen: boolean;
  openMoreSheet: () => void;
  closeMoreSheet: () => void;
  badges: {
    tasks: number;
    messages: number;
  };
  setBadges: (badges: { tasks?: number; messages?: number }) => void;
}

const MobileNavContext = createContext<MobileNavContextType | undefined>(undefined);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [badges, setBadgesState] = useState({ tasks: 0, messages: 0 });

  const openMoreSheet = useCallback(() => setIsMoreSheetOpen(true), []);
  const closeMoreSheet = useCallback(() => setIsMoreSheetOpen(false), []);

  const setBadges = useCallback((newBadges: { tasks?: number; messages?: number }) => {
    setBadgesState(prev => ({ ...prev, ...newBadges }));
  }, []);

  // When "more" tab is tapped, open sheet instead of navigating
  const handleSetActiveTab = useCallback((tab: TabId) => {
    if (tab === 'more') {
      openMoreSheet();
    } else {
      setActiveTab(tab);
      closeMoreSheet();
    }
  }, [openMoreSheet, closeMoreSheet]);

  return (
    <MobileNavContext.Provider
      value={{
        activeTab,
        setActiveTab: handleSetActiveTab,
        isMoreSheetOpen,
        openMoreSheet,
        closeMoreSheet,
        badges,
        setBadges,
      }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

// Default no-op context for components outside the provider
const defaultContext: MobileNavContextType = {
  activeTab: 'home',
  setActiveTab: () => {},
  isMoreSheetOpen: false,
  openMoreSheet: () => {},
  closeMoreSheet: () => {},
  badges: { tasks: 0, messages: 0 },
  setBadges: () => {},
};

export function useMobileNav() {
  const context = useContext(MobileNavContext);
  // Return default no-op context if used outside provider
  // This allows components like MessagingPanel to use the hook
  // even when rendered outside the dashboard layout
  return context ?? defaultContext;
}

// Strict version that throws if used outside provider (for components that require it)
export function useMobileNavStrict() {
  const context = useContext(MobileNavContext);
  if (!context) {
    throw new Error('useMobileNavStrict must be used within MobileNavProvider');
  }
  return context;
}
